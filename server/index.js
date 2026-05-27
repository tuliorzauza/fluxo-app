require('dotenv').config();
console.log('[ENV CHECK] SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('[ENV CHECK] SUPABASE_SERVICE_KEY (primeiros 20):', process.env.SUPABASE_SERVICE_KEY?.slice(0, 20));
console.log('[ENV CHECK] ANTHROPIC_API_KEY (primeiros 20):', process.env.ANTHROPIC_API_KEY?.slice(0, 20));
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const { buildFloraPrompt, parseFloraResponse } = require('./services/flora');
const { preservarEstadosTarefas, limitarHistorico, extrairTemasRelevantes } = require('./services/userContext');
const { selecionarProximaPergunta } = require('./data/floraQuestions');
const { MEMORIA_INICIAL, mesclarMemoria, atualizarGamificacao } = require('./services/userMemory');
const { autenticarUsuario } = require('./middleware/auth');
const { supabase } = require('./services/supabase');
const {
  carregarDadosUsuario,
  salvarPlano,
  salvarMemoria,
  salvarHistorico,
  salvarPerfil,
  salvarTarefasConcluidas,
} = require('./services/dadosUsuario');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Validação de datas ────────────────────────────────────────────────────────
const DIAS_ALIAS = [
  ['domingo', 'dom'],
  ['segunda', 'seg', 'segunda-feira'],
  ['terça', 'ter', 'terca', 'terça-feira', 'terca-feira'],
  ['quarta', 'qua', 'quarta-feira'],
  ['quinta', 'qui', 'quinta-feira'],
  ['sexta', 'sex', 'sexta-feira'],
  ['sábado', 'sab', 'sabado', 'sáb'],
];

// BUG-023: Railway roda em UTC — agoraBrasilia() garante datas corretas para usuários BRT (UTC-3).
// Sem isso, após 21h BRT o servidor já está no dia seguinte → datas com offset de +1 dia.
function agoraBrasilia() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}
function toYMDBrasilia(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function proximoFuturo(diaSemanaIdx) {
  const hoje = agoraBrasilia();
  hoje.setHours(0, 0, 0, 0);
  const hojeDay = hoje.getDay();
  let diff = diaSemanaIdx - hojeDay;
  if (diff < 0) diff += 7;
  const d = new Date(hoje);
  d.setDate(hoje.getDate() + diff);
  return toYMDBrasilia(d);
}

function ajustarData(dataStr) {
  if (!dataStr) return dataStr;
  const lower = dataStr.toLowerCase().trim();

  // Aliases textuais de dias da semana (ex: "segunda", "terça") → próxima ocorrência futura
  for (let i = 0; i < DIAS_ALIAS.length; i++) {
    if (DIAS_ALIAS[i].some(a => lower.includes(a))) return proximoFuturo(i);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(dataStr)) {
    // BUG-026: não avançar datas passadas automaticamente.
    // Compromissos pontuais expirados devem ficar no histórico — não ressuscitar no Painel do Dia.
    // Flora já gera datas corretas via REGRA DE DATAS no prompt.
    return dataStr;
  }

  // Formato DD/MM ou DD/MM/YYYY — ainda converte para YYYY-MM-DD mas sem avançar
  const m = dataStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (m) {
    const ano = m[3] ? parseInt(m[3]) : agoraBrasilia().getFullYear();
    const data = new Date(ano, parseInt(m[2]) - 1, parseInt(m[1]), 12);
    return toYMDBrasilia(data);
  }

  return dataStr;
}

function ajustarDatasFuturas(plano) {
  if (!plano) return plano;
  const novo = { ...plano };
  if (novo.compromissos) {
    novo.compromissos = novo.compromissos.map(c => ({
      ...c,
      data: c.recorrencia ? c.data : ajustarData(c.data),
    }));
  }
  if (novo.tarefas) {
    novo.tarefas = novo.tarefas.map(t => ({
      ...t,
      prazo: t.prazo && !t.recorrencia ? ajustarData(t.prazo) : t.prazo,
    }));
  }
  return novo;
}

// ── Detecta compromissos passados sem confirmação (últimos 7 dias) ────────────
function detectarCompromissosPendentes(planoAtual) {
  if (!planoAtual?.compromissos) return [];
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const semanaAtras = new Date(hoje); semanaAtras.setDate(hoje.getDate() - 7);

  return planoAtual.compromissos.filter(c => {
    if (!c.data || c.recorrencia || c.confirmado) return false;
    if (c.categoria !== 'compromisso') return false;
    const data = new Date(c.data + 'T12:00:00');
    return data >= semanaAtras && data < hoje;
  }).slice(0, 3); // máx 3 para não sobrecarregar o prompt
}

// ── Parser JSON seguro — sanitiza controles antes de parsear ─────────────────
function extrairJsonSeguro(rawText) {
  const inicio = rawText.indexOf('{');
  const fim    = rawText.lastIndexOf('}');
  if (inicio === -1 || fim === -1 || fim < inicio) throw new Error('JSON não encontrado na resposta');
  // eslint-disable-next-line no-control-regex
  const jsonStr = rawText.slice(inicio, fim + 1).replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  return JSON.parse(jsonStr);
}

// ── Função auxiliar de processamento (compartilhada entre endpoints) ──────────
async function processarMensagem({ input, historicoMensagens, dataHoraAtual, perfil, planoAtual, memoria }) {
  const totalInteracoes = perfil?.contadorInteracoes || 0;
  const perguntasFeitas = perfil?.perguntasProfundasFeitas || [];
  const temas = extrairTemasRelevantes(perfil);
  const perguntaProfunda = selecionarProximaPergunta(perguntasFeitas, totalInteracoes, temas);
  const compromissosPendentes = detectarCompromissosPendentes(planoAtual);

  // Limita contexto a 24 entradas (12 pares usuário/assistant)
  const historicoLimitado = (historicoMensagens || []).slice(-24);

  const mensagemAtual = `Data e hora atual: ${dataHoraAtual}\n\nMensagem: "${input}"`;
  const messages = [
    ...historicoLimitado,
    { role: 'user', content: mensagemAtual },
  ];

  const systemPrompt = buildFloraPrompt(perfil, perguntaProfunda, memoria || MEMORIA_INICIAL, compromissosPendentes, planoAtual);

  return { messages, systemPrompt, perguntaProfunda };
}

// ── Sanitização: remove tarefas que são notas internas da Flora ──────────────
const PADROES_NOTA_INTERNA = [
  /checar\s+recuper/i,
  /verificar\s+(se\s+)?(recup|dedo|lesão|saúde)/i,
  /acompanhar\s+recuper/i,
  /reativar\s+(luta|academia|treino)/i,
  /retomar\s+quando/i,
  /aguardar\s+recuper/i,
  /pausad[ao]\s+(temporariamente|por)/i,
  /luta\s+e\s+academia\s+pausad/i,
  /academia\s+pausad/i,
  /monitorar\s+(saúde|recuper)/i,
];

function sanitizarTarefas(tarefas) {
  if (!Array.isArray(tarefas)) return tarefas;
  return tarefas.filter(t => {
    if (t.tipo === 'flora') return false;
    const titulo = t.titulo || '';
    return !PADROES_NOTA_INTERNA.some(p => p.test(titulo));
  });
}

// ── Pós-processamento da resposta da Flora ────────────────────────────────────
function posProcessar({ rawText, planoAtual, messages, memoria }) {
  let { mensagem, modo, plano, perguntaFeita, quickReplies, memoriaUpdate, eventoGamificacao } = parseFloraResponse(rawText);

  // BUG-026: ajustarDatasFuturas removida do fluxo de chat para não ressuscitar eventos expirados.
  // Flora gera datas corretas via REGRA DE DATAS. ajustarData() ainda converte aliases textuais.
  // ajustarDatasFuturas pode ser chamada pontualmente em migrações de dados se necessário.

  if (plano?.tarefas) {
    plano.tarefas = sanitizarTarefas(plano.tarefas);
  }

  if (plano?.tarefas && planoAtual?.tarefas) {
    plano.tarefas = preservarEstadosTarefas(planoAtual.tarefas, plano.tarefas);
  }

  // Mescla atualização de memória
  let memoriaAtualizada = memoria || { ...MEMORIA_INICIAL };
  if (memoriaUpdate) {
    memoriaAtualizada = mesclarMemoria(memoriaAtualizada, memoriaUpdate);
  }

  // Atualiza gamificação
  if (eventoGamificacao) {
    memoriaAtualizada = atualizarGamificacao(memoriaAtualizada, eventoGamificacao);
  }
  // Sempre registra atividade diária
  memoriaAtualizada = atualizarGamificacao(memoriaAtualizada, 'dia_ativo');

  const historicoAtualizado = limitarHistorico([
    ...messages,
    { role: 'assistant', content: rawText },
  ], 24);

  return { mensagem, modo, plano, quickReplies, perguntaFeita, memoriaAtualizada, historicoAtualizado };
}

const corsOptions = {
  origin: function (origin, callback) {
    const origensPermitidas = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://fluxo-app-zeta.vercel.app',
      /\.vercel\.app$/,
    ];
    if (!origin) return callback(null, true);
    const permitido = origensPermitidas.some(permitida => {
      if (typeof permitida === 'string') return permitida === origin;
      if (permitida instanceof RegExp) return permitida.test(origin);
      return false;
    });
    if (permitido) {
      callback(null, true);
    } else {
      console.log('CORS bloqueado para origem:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Rota streaming SSE — conversa com a Flora ─────────────────────────────────
// Auth inline (não como middleware separado) para garantir ordem correta com SSE
app.post('/api/processar/stream', async (req, res) => {
  console.log('[SERVER] Authorization header recebido:', req.headers.authorization?.slice(0, 30));
  // ── Validar token ANTES de qualquer header SSE ──────────────────────────────
  const authHeader = req.headers.authorization;
  console.log('[SSE] Authorization header presente:', !!authHeader,
    authHeader ? `| primeiros 20: ${authHeader.slice(0, 27)}...` : '');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação necessário', codigo: 'NO_TOKEN' });
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('[SSE] Token (primeiros 20 chars):', token.slice(0, 20) + '...');

  let userId;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('[SSE] getUser resultado:', error ? `ERRO: ${error.message}` : `OK — userId: ${user?.id}`);
    console.log('[SERVER] supabase.auth.getUser resultado:');
    console.log('[SERVER] user:', user?.id);
    console.log('[SERVER] error:', error?.message, error?.status);
    if (error || !user) {
      return res.status(401).json({ erro: 'Token inválido ou expirado', codigo: 'INVALID_TOKEN' });
    }
    userId = user.id;
  } catch (err) {
    console.error('[SSE] Exceção na validação do token:', err.message);
    return res.status(401).json({ erro: 'Erro na autenticação', codigo: 'AUTH_ERROR' });
  }
  // ── Fim da validação ────────────────────────────────────────────────────────

  const { input, historicoMensagens, dataHoraAtual, perfil, planoAtual, memoria } = req.body;

  if (!input || input.trim().length === 0) {
    return res.status(400).json({ erro: 'Input vazio' });
  }

  // Cabeçalhos SSE — só depois da auth estar confirmada
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { messages, systemPrompt, perguntaProfunda } = await processarMensagem({
      input, historicoMensagens, dataHoraAtual, perfil, planoAtual, memoria,
    });

    let fullText = '';

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: systemPrompt,
      messages,
      stream: true,
    });

    // Envia chunks progressivamente
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const chunk = event.delta.text;
        fullText += chunk;
        sendEvent({ type: 'chunk', text: chunk });
      }
    }

    // Pós-processa e envia resultado final
    const {
      mensagem, modo, plano, quickReplies, perguntaFeita,
      memoriaAtualizada, historicoAtualizado,
    } = posProcessar({ rawText: fullText, planoAtual, messages, memoria });

    sendEvent({
      type: 'done',
      mensagem, modo, plano,
      quickReplies: quickReplies || null,
      _historico: historicoAtualizado,
      perguntaInjetada: perguntaFeita || null,
      memoriaAtualizada,
    });

    res.end();

    // Persiste no Supabase em background — não bloqueia a resposta
    console.log('[SAVE] userId ao salvar:', userId);
    console.log('[SAVE] plano existe:', !!plano);
    console.log('[SAVE] memoria existe:', !!memoriaAtualizada);
    if (userId) {
      Promise.all([
        plano ? salvarPlano(userId, plano).then(() =>
          console.log('[SAVE] Plano salvo para:', userId)
        ) : Promise.resolve(),
        memoriaAtualizada ? salvarMemoria(userId, memoriaAtualizada).then(() =>
          console.log('[SAVE] Memória salva para:', userId)
        ) : Promise.resolve(),
        historicoAtualizado ? salvarHistorico(userId, [], historicoAtualizado).then(() =>
          console.log('[SAVE] Histórico salvo para:', userId)
        ) : Promise.resolve(),
      ]).catch(err =>
        console.error('[SAVE] Erro crítico ao salvar:', err.message)
      );
    }

  } catch (error) {
    console.error('Erro no stream:', error);
    sendEvent({
      type: 'error',
      erro: error.message || 'Erro interno',
      errorType: error.error?.type || error.type || null,
    });
    res.end();
  }
});

// ── Rota clássica (fallback) — conversa com a Flora ──────────────────────────
app.post('/api/processar', autenticarUsuario, async (req, res) => {
  try {
    const { input, historicoMensagens, dataHoraAtual, perfil, planoAtual, memoria } = req.body;

    if (!input || input.trim().length === 0) {
      return res.status(400).json({ erro: 'Input vazio' });
    }

    const { messages, systemPrompt, perguntaProfunda } = await processarMensagem({
      input, historicoMensagens, dataHoraAtual, perfil, planoAtual, memoria,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0].text;
    const {
      mensagem, modo, plano, quickReplies, perguntaFeita,
      memoriaAtualizada, historicoAtualizado,
    } = posProcessar({ rawText, planoAtual, messages, memoria });

    res.json({
      mensagem, modo, plano,
      quickReplies: quickReplies || null,
      _historico: historicoAtualizado,
      perguntaInjetada: perguntaFeita || null,
      memoriaAtualizada,
    });

    // Persiste no Supabase em background
    const userId = req.userId;
    Promise.all([
      plano             ? salvarPlano(userId, plano)                                           : Promise.resolve(),
      memoriaAtualizada ? salvarMemoria(userId, memoriaAtualizada)                             : Promise.resolve(),
      salvarHistorico(userId, [], historicoAtualizado),
      perfil            ? salvarPerfil(userId, { ...perfil, contadorInteracoes: (perfil.contadorInteracoes || 0) + 1 }) : Promise.resolve(),
    ]).catch(err => console.error('Erro ao salvar no Supabase (processar):', err));

  } catch (error) {
    console.error('Erro na API:', error);
    if (error.status === 401) return res.status(401).json({ erro: 'Chave de API inválida' });
    res.status(500).json({ erro: 'Erro interno do servidor', detalhe: error.message });
  }
});

// ── Dados do usuário ──────────────────────────────────────────────────────────
app.get('/api/usuario/dados', autenticarUsuario, async (req, res) => {
  try {
    const dados = await carregarDadosUsuario(req.userId);
    res.json(dados);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    res.status(500).json({ erro: 'Erro ao carregar dados do usuário' });
  }
});

app.post('/api/usuario/tarefas-concluidas', autenticarUsuario, async (req, res) => {
  try {
    const { tarefaIds } = req.body;
    await salvarTarefasConcluidas(req.userId, tarefaIds);
    res.json({ sucesso: true });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao salvar tarefas concluídas' });
  }
});

app.post('/api/usuario/salvar-plano', autenticarUsuario, async (req, res) => {
  try {
    await salvarPlano(req.userId, req.body.plano);
    res.json({ sucesso: true });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao salvar plano' });
  }
});

app.post('/api/usuario/salvar-memoria', autenticarUsuario, async (req, res) => {
  try {
    await salvarMemoria(req.userId, req.body.memoria);
    res.json({ sucesso: true });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao salvar memória' });
  }
});

app.post('/api/usuario/salvar-perfil', autenticarUsuario, async (req, res) => {
  try {
    await salvarPerfil(req.userId, req.body.perfil);
    res.json({ sucesso: true });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao salvar perfil' });
  }
});

app.post('/api/usuario/salvar-historico', autenticarUsuario, async (req, res) => {
  try {
    const { historicoDisplay, historicoApi } = req.body;
    await salvarHistorico(req.userId, historicoDisplay || [], historicoApi || []);
    res.json({ sucesso: true });
  } catch (error) {
    console.error('[SAVE] Erro ao salvar histórico:', error);
    res.status(500).json({ erro: 'Erro ao salvar histórico' });
  }
});

// ── Métricas reais da semana a partir dos compromissos ───────────────────────
function calcularMetricasSemana(compromissos) {
  const JANELA_INI  = 8  * 60; // 08h = 480 min
  const JANELA_FIM  = 22 * 60; // 22h = 1320 min
  const JANELA_DIA  = JANELA_FIM - JANELA_INI; // 840 min
  const NOITE_INI   = 18 * 60; // 18h
  const NOITE_FIM   = 22 * 60; // 22h
  const DIAS        = 7;

  // Blocos por dia (0=Dom..6=Sáb)
  const porDiaNum = Array.from({ length: DIAS }, () => []);

  (compromissos || []).forEach(c => {
    if (!c.hora) return;
    const [h, m] = c.hora.split(':').map(Number);
    const ini = h * 60 + m;
    let dur = 60;
    if (c.horaFim) {
      const [hf, mf] = c.horaFim.split(':').map(Number);
      const d = (hf * 60 + mf) - ini;
      if (d > 0) dur = d;
    } else if (c.duracao) {
      dur = c.duracao;
    }
    const fim = ini + dur;

    const add = (d) => {
      const iniClamp = Math.max(ini, JANELA_INI);
      const fimClamp = Math.min(fim, JANELA_FIM);
      if (fimClamp > iniClamp) porDiaNum[d].push({ ini: iniClamp, fim: fimClamp });
    };

    if (c.recorrencia?.tipo === 'diaria') {
      for (let d = 0; d < DIAS; d++) add(d);
    } else if (c.recorrencia?.tipo === 'semanal' && Array.isArray(c.recorrencia.diasSemana)) {
      c.recorrencia.diasSemana.forEach(d => add(d));
    } else if (c.data) {
      const dia = new Date(c.data + 'T12:00:00').getDay();
      add(dia);
    }
  });

  let totalOcupado    = 0;
  let noitesLivres    = 0;
  let blocosLongos    = 0;
  let diasFragmentados = 0;

  for (let d = 0; d < DIAS; d++) {
    // Ordena e mescla intervalos sobrepostos
    const merged = [];
    porDiaNum[d].sort((a, b) => a.ini - b.ini).forEach(iv => {
      if (!merged.length || iv.ini > merged[merged.length - 1].fim) {
        merged.push({ ...iv });
      } else {
        merged[merged.length - 1].fim = Math.max(merged[merged.length - 1].fim, iv.fim);
      }
    });

    const ocupadoDia = merged.reduce((s, iv) => s + (iv.fim - iv.ini), 0);
    totalOcupado += ocupadoDia;

    // Noite livre: < 30 min de compromissos entre 18h-22h
    const noiteOcupada = merged
      .filter(iv => iv.fim > NOITE_INI && iv.ini < NOITE_FIM)
      .reduce((s, iv) => s + (Math.min(iv.fim, NOITE_FIM) - Math.max(iv.ini, NOITE_INI)), 0);
    if (noiteOcupada < 30) noitesLivres++;

    // Intervalos livres
    const livres = [];
    let prev = JANELA_INI;
    merged.forEach(iv => {
      if (iv.ini > prev) livres.push(iv.ini - prev);
      prev = Math.max(prev, iv.fim);
    });
    if (prev < JANELA_FIM) livres.push(JANELA_FIM - prev);

    // Blocos livres >= 2h
    blocosLongos += livres.filter(b => b >= 120).length;

    // Dia fragmentado: 3+ lacunas curtas (< 90 min)
    if (livres.filter(b => b > 0 && b < 90).length >= 3) diasFragmentados++;
  }

  const percentualLivre = Math.round(((JANELA_DIA * DIAS - totalOcupado) / (JANELA_DIA * DIAS)) * 100);
  const horasLivres     = Math.round((JANELA_DIA * DIAS - totalOcupado) / 60);

  return { horasLivres, noitesLivres, diasFragmentados, blocosLongos, percentualLivre };
}

// ── Estado da Semana — análise em linguagem natural via Claude ────────────────
app.post('/api/estado-semana', async (req, res) => {
  const { planoAtual, scoreDiscreto = 0, rotina = null } = req.body;

  // Sem plano: resposta neutra
  if (!planoAtual) {
    return res.json({
      emoji: '📋',
      titulo: 'Sem rotina cadastrada',
      descricao: 'Adicione compromissos e tarefas para ver uma análise da sua semana.',
      scoreDiscreto: 0,
    });
  }

  // Nomes longos em pt-BR indexados por getDay() (0=dom..6=sáb)
  const NOMES_DIA_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  // Mapeia compromissos extraindo os dias reais da semana em que ocorrem.
  // Para recorrentes: usa recorrencia.diasSemana (ints 0-6) — campo correto.
  // Para únicos: usa c.data para derivar o nome do dia.
  const compromissos = (planoAtual.compromissos || []).map(c => {
    let diasSemana;
    if (c.recorrencia?.tipo === 'semanal' && Array.isArray(c.recorrencia.diasSemana)) {
      // Recorrente semanal: expande cada int para o nome do dia real
      diasSemana = c.recorrencia.diasSemana.map(d => NOMES_DIA_PT[d]);
    } else if (c.recorrencia?.tipo === 'diaria') {
      // Recorrente diário: ocorre todos os dias da semana
      diasSemana = [...NOMES_DIA_PT];
    } else {
      // Evento único ou recorrência mensal: usa a data explícita
      diasSemana = c.data
        ? [new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })]
        : ['indefinido'];
    }
    return {
      titulo: c.titulo,
      hora: c.hora || null,
      horaFim: c.horaFim || null,
      categoria: c.categoria,
      diasSemana,
    };
  });

  // Agrupa por dia da semana — garante que a IA analise cada dia separadamente
  const porDia = {};
  compromissos.forEach(c => {
    (c.diasSemana || ['indefinido']).forEach(dia => {
      if (!porDia[dia]) porDia[dia] = [];
      porDia[dia].push({ titulo: c.titulo, hora: c.hora, horaFim: c.horaFim, categoria: c.categoria });
    });
  });

  const tarefas = (planoAtual.tarefas || [])
    .filter(t => t.tipo !== 'flora')
    .map(t => ({
      titulo: t.titulo,
      prioridade: t.prioridade,
      concluida: !!t.concluida,
      temPrazo: !!t.prazo,
    }));

  const comprometidas = rotina?.comprometida || [];
  const ritmoAceito   = rotina?.ritmoAceito  || null;

  // Calcula métricas reais de tempo
  const metricas = calcularMetricasSemana(planoAtual.compromissos || []);
  const blocoMetricas = `
Métricas calculadas da semana:
- Horas livres (8h-22h): ${metricas.horasLivres}h de ${7 * 14}h disponíveis (${metricas.percentualLivre}% livre)
- Noites livres (18h-22h com < 30 min de compromissos): ${metricas.noitesLivres}/7
- Blocos de 2h+ consecutivos livres: ${metricas.blocosLongos}
- Dias com agenda fragmentada (3+ lacunas curtas): ${metricas.diasFragmentados}/7
`;

  const blocoRotinaPrompt = comprometidas.length > 0 || ritmoAceito ? `
Contexto do usuário:
${comprometidas.length > 0 ? `- Atividades INEGOCIÁVEIS (não criticar): ${comprometidas.join(', ')}` : ''}
${ritmoAceito === 'intenso'  ? '- Ritmo aceito: INTENSO — agenda cheia é escolha consciente, não problema.' : ''}
${ritmoAceito === 'moderado' ? '- Ritmo aceito: MODERADO — pode apontar fragmentação excessiva.' : ''}
${ritmoAceito === 'variavel' ? '- Ritmo aceito: VARIÁVEL — adaptar análise ao contexto.' : ''}
` : '';

  const systemPrompt = `Você analisa rotinas semanais e retorna JSON.

Retorne SOMENTE este JSON, sem texto antes ou depois:
{
  "emoji": "um emoji representando o estado",
  "titulo": "título curto em português (2-4 palavras)",
  "descricao": "análise direta em 2-3 frases em português. Sem drama, sem motivacional.",
  "scoreDiscreto": número de 0 a 100
}

Estados de referência:
🌊 Fluindo bem — obrigações, descanso e tempo pessoal equilibrados
✨ Semana leve — agenda tranquila, bom momento para pendências
⚠️ Semana fragmentada — tempo livre em blocos pequenos demais para descanso real
🔥 Semana carregada — compromissos pesados concentrados, pouco espaço
😮‍💨 Semana sobrecarregada — mais do que dá pra absorver, algo precisa sair
${blocoRotinaPrompt}
REGRA DE CONFLITO — CRÍTICO:
Os compromissos chegam agrupados por dia da semana (cada chave é um dia diferente).
CONFLITO só existe DENTRO do mesmo grupo (mesmo dia) e no mesmo horário.
NUNCA compare horários entre grupos diferentes — são dias separados, não há sobreposição possível.
Atividades inegociáveis listadas acima NÃO devem ser criticadas na descrição.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `${blocoMetricas}\nAgenda organizada por dia da semana:\n${JSON.stringify(porDia, null, 2)}\n\nTarefas: ${JSON.stringify(tarefas)}\nScore base: ${scoreDiscreto}\n\nREGRA CRÍTICA: Conflito de horário APENAS entre atividades listadas no MESMO DIA. Atividades em dias diferentes com horário similar NÃO são conflito. Analise cada dia separadamente. Use as métricas calculadas acima como base objetiva para a análise — elas refletem o tempo real disponível.`,
      }],
    });

    const rawText = response.content[0]?.text || '';
    const resultado = extrairJsonSeguro(rawText);

    if (!resultado.emoji || !resultado.titulo || !resultado.descricao) {
      throw new Error(`Campos obrigatórios ausentes: ${JSON.stringify(Object.keys(resultado))}`);
    }

    res.json({
      emoji:         resultado.emoji,
      titulo:        resultado.titulo,
      descricao:     resultado.descricao,
      scoreDiscreto: typeof resultado.scoreDiscreto === 'number' ? resultado.scoreDiscreto : scoreDiscreto,
    });
  } catch (error) {
    console.error('Erro no estado-semana:', error.message);
    // Fallback determinístico baseado no score
    const s = scoreDiscreto;
    const fallback =
      s >= 75 ? { emoji: '🌊', titulo: 'Fluindo bem',        descricao: 'Sua semana tem espaço pra respirar e equilibra obrigações com tempo pessoal.' } :
      s >= 50 ? { emoji: '⚠️',  titulo: 'Semana moderada',    descricao: 'Ocupado, mas ainda dá pra manobrar. Atenção aos blocos livres.' } :
      s >= 30 ? { emoji: '🔥',  titulo: 'Semana carregada',   descricao: 'Muitos compromissos concentrados. Tente proteger ao menos um período de descanso.' } :
                { emoji: '😮‍💨', titulo: 'Semana sobrecarregada', descricao: 'Mais do que dá pra absorver bem. Veja o que pode ser adiado.' };
    res.json({ ...fallback, scoreDiscreto: s });
  }
});

// ── Gamificação ───────────────────────────────────────────────────────────────
app.get('/api/gamificacao', (req, res) => {
  // A memória é armazenada no client — este endpoint retorna a estrutura esperada
  // para uso futuro com banco de dados ou validação server-side
  res.json({
    info: 'Gamificação gerenciada client-side via userMemory. Use o campo gamificacao da memória.',
    niveis: [
      { nivel: 1, nome: 'Iniciante',    pontos: 0   },
      { nivel: 2, nome: 'Consistente',  pontos: 100 },
      { nivel: 3, nome: 'Focado',       pontos: 250 },
      { nivel: 4, nome: 'Produtivo',    pontos: 500 },
      { nivel: 5, nome: 'Mestre',       pontos: 1000 },
    ],
    badges: {
      primeiro_nivel: { label: '🏆 Primeiro Nível', desc: 'Acumulou 100 pontos' },
      semana_streak:  { label: '🔥 Semana Completa', desc: '7 dias seguidos ativo' },
      mes_streak:     { label: '⭐ Mês Seguido',     desc: '30 dias seguidos ativo' },
      dedicado:       { label: '💎 Dedicado',        desc: 'Acumulou 500 pontos' },
    },
    eventos: {
      compromisso_feito:    { pontos: +10, desc: 'Compromisso realizado' },
      compromisso_parcial:  { pontos:  +5, desc: 'Compromisso parcialmente realizado' },
      compromisso_perdido:  { pontos:  -5, desc: 'Compromisso não realizado' },
      dia_ativo:            { pontos:  +2, desc: 'Dia ativo no app' },
      semana_completa:      { pontos: +50, desc: 'Semana de rotina completa' },
    },
  });
});

// ── Plano de Ação — inicia conversa a partir do diagnóstico do Estado da Semana ─
app.post('/api/plano-acao', autenticarUsuario, async (req, res) => {
  const { diagnostico, planoAtual, memoria, perfil } = req.body;

  if (!diagnostico?.titulo) {
    return res.status(400).json({ erro: 'Diagnóstico não informado' });
  }

  const systemPrompt = buildFloraPrompt(
    perfil,
    null,
    memoria || MEMORIA_INICIAL,
    [],
    planoAtual,
  );

  const triggerMsg = `O sistema detectou que a semana do usuário está com problemas e o usuário clicou em "Ver plano de ação".

Estado identificado: "${diagnostico.titulo}" ${diagnostico.emoji || ''}
Análise: "${diagnostico.descricao || ''}"

Inicie a conversa de plano de ação de forma natural. Reconheça brevemente o estado da semana, diga que vai ajudar a reorganizar, e apresente UMA sugestão concreta e específica baseada nos compromissos do plano atual. Peça confirmação antes de qualquer alteração.

Lembre: nunca sugira mudar atividades comprometidas. Só altere o que o usuário aprovar.

Retorne JSON no formato padrão.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: triggerMsg }],
    });

    const rawText = response.content[0]?.text || '';
    const { mensagem, quickReplies } = parseFloraResponse(rawText);

    // Histórico sintético para manter contexto na próxima mensagem do usuário
    const historicoSintetico = [
      { role: 'user',      content: triggerMsg },
      { role: 'assistant', content: rawText    },
    ];

    res.json({ mensagem, quickReplies, _historico: historicoSintetico });
  } catch (error) {
    console.error('Erro no plano-acao:', error.message);
    res.status(500).json({ erro: 'Erro interno', detalhe: error.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', versao: '2.1.0', assistente: 'Flora' }));

app.listen(PORT, () => {
  console.log(`\n🌿 Flora (Fluxo v2.1) rodando na porta ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
