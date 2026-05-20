/**
 * userMemory.js — Memória permanente e estruturada do usuário
 *
 * Persiste entre sessões (via localStorage no client, enviada em cada request).
 * Atualizada pela Flora a cada interação relevante via campo "memoriaUpdate".
 */

// ─── Thresholds de nível (espelho de client/src/utils/gamificacao.js) ─────────
const NIVEL_THRESHOLDS = [
  { nivel: 1,  nome: 'Semente',     min: 0    },
  { nivel: 2,  nome: 'Broto',       min: 101  },
  { nivel: 3,  nome: 'Raiz',        min: 251  },
  { nivel: 4,  nome: 'Caule',       min: 501  },
  { nivel: 5,  nome: 'Folha',       min: 901  },
  { nivel: 6,  nome: 'Galho',       min: 1401 },
  { nivel: 7,  nome: 'Copa',        min: 2001 },
  { nivel: 8,  nome: 'Floresta',    min: 3001 },
  { nivel: 9,  nome: 'Sequoia',     min: 5001 },
  { nivel: 10, nome: 'Flora Lenda', min: 8001 },
];

function calcularNivel(pontos) {
  const p = Math.max(0, pontos || 0);
  for (let i = NIVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (p >= NIVEL_THRESHOLDS[i].min) return NIVEL_THRESHOLDS[i].nivel;
  }
  return 1;
}

// ─── Tabela de pontos (espelho de client/src/utils/gamificacao.js) ────────────
const PONTOS_EVENTO = {
  compromisso_no_horario:    +10,
  compromisso_feito:         +10,
  compromisso_reagendado:    +7,
  tarefa_flexivel:           +5,
  compromisso_parcial:       +5,
  lembrete_resolvido:        +3,
  dia_ativo:                 +5,
  checkin_noturno:           +5,
  projeto_no_concluido:      +5,
  pergunta_profunda:         +3,
  semana_100pct:             +50,
  semana_completa:           +50,
  semana_80pct:              +20,
  novo_habito:               +30,
  meta_semanal:              +15,
  compromisso_perdido:       -5,
  tarefa_ignorada:           -3,
  semana_ruim:               -10,
};

// ─── Estrutura inicial da memória ─────────────────────────────────────────────
const MEMORIA_INICIAL = {
  identidade:  { nome: '', idade: null, ocupacao: '' },
  trabalho:    {
    horarioEntrada: '', horarioSaida: '',
    localizacao: '',
    tempoDeslocamentoIda:   null,
    tempoDeslocamentoVolta: null,
    meioTransporteIda:   '',
    meioTransporteVolta: '',
    custoDeslocamento:   null,
  },
  moradia:     { cidade: '', bairro: '', temCarroOuMoto: false },
  academia:    { localizacao: '', distanciaDoTrabalho: '', distanciaDeCasa: '', horarios: [] },
  atividades:  { lista: [] },
  sono:        { horarioDormir: '', horarioAcordar: '', qualidade: '' },
  energia:     { picoManha: null, picoTarde: null, picoNoite: null, cansadoNaVolta: null },
  financas:    { situacaoAtual: '', metaFinanceira: '', gastosFixos: [], toleranciaUber: '' },
  objetivos:   { curto: [], medio: [], longo: [], sonhos: [], medos: [] },
  perdaTempo:  { identificados: [], sugestoesAprovadas: [], sugestoesRejeitadas: [] },
  pessoasImportantes: { lista: [] },
  gamificacao: {
    pontos: 0,
    nivel: 1,
    streak: 0,
    ultimaAtividade: null,
    badges: [],
    historicoPontos: [],
    contadores: {
      compromissosNoPrazo: 0,
      perguntasProfundas:  0,
      tarefasMeiaNoite:    0,
      semanasPerfeitas:    0,
      semanasConsec80:     0,
      semanasConsec70:     0,
      metasConsecutivas:   0,
      academia: 0, luta: 0, estudo: 0, skate: 0,
    },
    // FUTURO: Sistema de resgate de recompensas reais
    // Pontos Flora poderão ser trocados por créditos, descontos ou
    // acesso antecipado a features. Conectar com Stripe ou parceiros.
    recompensas: {
      pontosAcumulados: 0,
      resgatados:       [],
      disponiveis:      [],
    },
  },
  rotina: {
    comprometida: [],  // atividades inegociáveis (Flora nunca questiona)
    ritmoAceito:  null, // "intenso" | "moderado" | "variavel"
    flexiveis:    [],  // atividades que podem ser ajustadas
    pausas:       [],  // [{ motivo, dataInicio, dataEstimadaRetorno, atividades }]
  },
  checkIns:        [], // [{ data, diaComo, oQueFuncionou, oQueTravou, amanha }]
  microintervalos: {
    atividadesPreparadas: [], // atividades curtas que o usuário quer encaixar nos gaps
  },
  notas: [],
};

// ─── Verifica se item é adaptação positiva (não deve entrar em perdaTempo) ─────
function ehAdaptacaoPositiva(item, memoria) {
  const lower = typeof item === 'string' ? item.toLowerCase() : '';
  if (!lower) return false;

  // Palavras-chave de adaptação positiva
  const ADAPTACOES = [
    'academia', 'gym', 'treino', 'muscula', 'corrida', 'natação', 'nadar',
    'ciclismo', 'bike', 'yoga', 'pilates', 'meditação', 'meditar',
    'luta', 'jiu', 'boxe', 'muay', 'karatê', 'judo',
    'estudo', 'estudar', 'curso', 'aula', 'leitura', 'ler',
    'skate', 'surf', 'esporte', 'futebol', 'basquete',
    'terapia', 'psicólogo', 'psicóloga',
  ];
  if (ADAPTACOES.some(a => lower.includes(a))) return true;

  // Intercorrências de saúde e pausas forçadas nunca são perdas de tempo
  const SAUDE = [
    'lesão', 'lesao', 'recuperação', 'recuperacao', 'machucado', 'machucada',
    'cirurgia', 'doença', 'doenca', 'temporariamente', 'pausa temporária',
    'pausa temporaria', 'pausada', 'pausado', 'fraturado', 'fraturada',
    'torção', 'torcao', 'contusão', 'contusao', 'cortado', 'cortada',
    'inflamado', 'inflamada', 'intercorrência', 'intercorrencia',
    'força maior', 'forca maior', 'reativar', 'retomar quando',
  ];
  if (SAUDE.some(s => lower.includes(s))) return true;

  // Checa se atividade está na rotina ou objetivos do usuário
  const atividades = memoria?.atividades?.lista || [];
  if (atividades.some(a => lower.includes(a.toLowerCase()))) return true;

  const objetivos = [
    ...(memoria?.objetivos?.curto || []),
    ...(memoria?.objetivos?.medio || []),
    ...(memoria?.objetivos?.longo || []),
  ];
  if (objetivos.some(o => lower.includes(o.toLowerCase()))) return true;

  return false;
}

// ─── Mescla atualizações na memória existente ─────────────────────────────────
function mesclarMemoria(memoria, updates) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return memoria;

  const resultado = JSON.parse(JSON.stringify(memoria || MEMORIA_INICIAL));

  for (const [chave, valor] of Object.entries(updates)) {
    if (valor === undefined) continue;

    // Filtro especial: perdaTempo.identificados não deve conter adaptações positivas
    if (chave === 'perdaTempo.identificados' && Array.isArray(valor)) {
      const filtrado = valor.filter(item => !ehAdaptacaoPositiva(item, resultado));
      if (filtrado.length === 0) continue;
      // Continua com a lógica normal usando o valor filtrado
      const partes = 'perdaTempo.identificados'.split('.');
      let obj = resultado;
      for (let i = 0; i < partes.length - 1; i++) {
        if (obj[partes[i]] == null || typeof obj[partes[i]] !== 'object') obj[partes[i]] = {};
        obj = obj[partes[i]];
      }
      const existentes = new Set(obj[partes[partes.length - 1]] || []);
      filtrado.forEach(item => existentes.add(item));
      obj[partes[partes.length - 1]] = [...existentes];
      continue;
    }

    if (chave.includes('.')) {
      const partes = chave.split('.');
      let obj = resultado;
      for (let i = 0; i < partes.length - 1; i++) {
        if (obj[partes[i]] == null || typeof obj[partes[i]] !== 'object') obj[partes[i]] = {};
        obj = obj[partes[i]];
      }
      obj[partes[partes.length - 1]] = valor;
    } else if (chave === 'checkIns' && Array.isArray(valor)) {
      const existentes = new Map((resultado.checkIns || []).map(c => [c.data, c]));
      valor.forEach(c => { if (c.data) existentes.set(c.data, c); });
      resultado.checkIns = [...existentes.values()].slice(-90); // ~3 meses
    } else if (chave === 'notas' && Array.isArray(valor)) {
      const existentes = new Set((resultado.notas || []).map(n => (typeof n === 'string' ? n : JSON.stringify(n))));
      const novas = valor.filter(n => !existentes.has(typeof n === 'string' ? n : JSON.stringify(n)));
      resultado.notas = [...(resultado.notas || []), ...novas].slice(-50);
    } else if (chave === 'perdaTempo' && valor !== null && typeof valor === 'object' && !Array.isArray(valor)) {
      // Filtro especial: intercepta notação de objeto aninhado { perdaTempo: { identificados: [...] } }
      let valorFiltrado = valor;
      if (Array.isArray(valor.identificados)) {
        valorFiltrado = {
          ...valor,
          identificados: valor.identificados.filter(item => !ehAdaptacaoPositiva(item, resultado)),
        };
      }
      resultado[chave] = mesclarMemoria(resultado[chave] || {}, valorFiltrado);
    } else if (valor !== null && typeof valor === 'object' && !Array.isArray(valor) &&
               resultado[chave] !== null && typeof resultado[chave] === 'object' && !Array.isArray(resultado[chave])) {
      resultado[chave] = mesclarMemoria(resultado[chave], valor);
    } else {
      resultado[chave] = valor;
    }
  }

  return resultado;
}

// ─── Formata memória como texto para injetar no prompt ───────────────────────
function formatarMemoriaParaPrompt(memoria) {
  if (!memoria) return '(sem dados salvos ainda)';
  const linhas = [];

  const id = memoria.identidade || {};
  if (id.nome)     linhas.push(`Nome: ${id.nome}`);
  if (id.idade)    linhas.push(`Idade: ${id.idade} anos`);
  if (id.ocupacao) linhas.push(`Ocupação: ${id.ocupacao}`);

  const trab = memoria.trabalho || {};
  const ti = [];
  if (trab.horarioEntrada)       ti.push(`entrada ${trab.horarioEntrada}`);
  if (trab.horarioSaida)         ti.push(`saída ${trab.horarioSaida}`);
  if (trab.localizacao)          ti.push(`local: ${trab.localizacao}`);
  if (trab.tempoDeslocamentoIda) ti.push(`deslocamento ida: ${trab.tempoDeslocamentoIda}min`);
  if (trab.tempoDeslocamentoVolta) ti.push(`deslocamento volta: ${trab.tempoDeslocamentoVolta}min`);
  if (trab.meioTransporteIda)    ti.push(`transporte ida: ${trab.meioTransporteIda}`);
  if (trab.custoDeslocamento)    ti.push(`custo deslocamento: R$${trab.custoDeslocamento}/dia`);
  if (ti.length) linhas.push(`Trabalho: ${ti.join(', ')}`);

  const mor = memoria.moradia || {};
  const mi = [];
  if (mor.cidade) mi.push(mor.cidade);
  if (mor.bairro) mi.push(mor.bairro);
  if (mor.temCarroOuMoto) mi.push('tem carro/moto');
  if (mi.length) linhas.push(`Moradia: ${mi.join(', ')}`);

  const ac = memoria.academia || {};
  const ai = [];
  if (ac.localizacao)         ai.push(`local: ${ac.localizacao}`);
  if (ac.distanciaDoTrabalho) ai.push(`dist. trabalho: ${ac.distanciaDoTrabalho}`);
  if (ac.distanciaDeCasa)     ai.push(`dist. casa: ${ac.distanciaDeCasa}`);
  if (ac.horarios?.length)    ai.push(`horários: ${ac.horarios.join(', ')}`);
  if (ai.length) linhas.push(`Academia: ${ai.join(', ')}`);

  if (memoria.atividades?.lista?.length) linhas.push(`Atividades: ${memoria.atividades.lista.join(', ')}`);

  const sono = memoria.sono || {};
  const si = [];
  if (sono.horarioDormir)  si.push(`dorme ~${sono.horarioDormir}`);
  if (sono.horarioAcordar) si.push(`acorda ~${sono.horarioAcordar}`);
  if (sono.qualidade)      si.push(`qualidade: ${sono.qualidade}`);
  if (si.length) linhas.push(`Sono: ${si.join(', ')}`);

  const en = memoria.energia || {};
  const ei = [];
  if (en.picoManha  != null) ei.push(`pico manhã: ${en.picoManha  ? 'sim' : 'não'}`);
  if (en.picoTarde  != null) ei.push(`pico tarde: ${en.picoTarde  ? 'sim' : 'não'}`);
  if (en.picoNoite  != null) ei.push(`pico noite: ${en.picoNoite  ? 'sim' : 'não'}`);
  if (en.cansadoNaVolta != null) ei.push(`cansado na volta: ${en.cansadoNaVolta ? 'sim' : 'não'}`);
  if (ei.length) linhas.push(`Energia: ${ei.join(', ')}`);

  const fin = memoria.financas || {};
  const fi = [];
  if (fin.situacaoAtual)  fi.push(fin.situacaoAtual);
  if (fin.metaFinanceira) fi.push(`meta: ${fin.metaFinanceira}`);
  if (fin.toleranciaUber) fi.push(`tolerância Uber: ${fin.toleranciaUber}`);
  if (fi.length) linhas.push(`Finanças: ${fi.join(', ')}`);

  const obj = memoria.objetivos || {};
  if (obj.curto?.length)  linhas.push(`Objetivos (curto): ${obj.curto.join('; ')}`);
  if (obj.medio?.length)  linhas.push(`Objetivos (médio): ${obj.medio.join('; ')}`);
  if (obj.longo?.length)  linhas.push(`Objetivos (longo): ${obj.longo.join('; ')}`);
  if (obj.sonhos?.length) linhas.push(`Sonhos: ${obj.sonhos.join('; ')}`);
  if (obj.medos?.length)  linhas.push(`Medos: ${obj.medos.join('; ')}`);

  const pt = memoria.perdaTempo || {};
  if (pt.identificados?.length) linhas.push(`Onde perde tempo: ${pt.identificados.join('; ')}`);

  if (memoria.pessoasImportantes?.lista?.length) {
    linhas.push(`Pessoas importantes: ${memoria.pessoasImportantes.lista.join(', ')}`);
  }

  const gam = memoria.gamificacao || {};
  if (gam.pontos > 0) {
    const nivelInfo = NIVEL_THRESHOLDS.slice().reverse().find(n => gam.pontos >= n.min) || NIVEL_THRESHOLDS[0];
    linhas.push(`Gamificação: ${gam.pontos} pts · ${nivelInfo.nome} (Nv.${gam.nivel}) · Streak ${gam.streak} dias`);
    if (gam.badges?.length > 0) linhas.push(`  Conquistas: ${gam.badges.slice(-5).join(', ')}`);
  }

  if (memoria.notas?.length) linhas.push(`Notas: ${memoria.notas.slice(-5).join('; ')}`);

  const rot = memoria.rotina || {};
  if (rot.comprometida?.length) linhas.push(`Rotina inegociável: ${rot.comprometida.join(', ')}`);
  if (rot.flexiveis?.length)    linhas.push(`Rotina flexível: ${rot.flexiveis.join(', ')}`);
  if (rot.ritmoAceito)          linhas.push(`Ritmo aceito: ${rot.ritmoAceito}`);
  if (rot.pausas?.length) {
    const pausasAtivas = rot.pausas.filter(p => !p.dataEstimadaRetorno || new Date(p.dataEstimadaRetorno) >= new Date());
    if (pausasAtivas.length) {
      linhas.push(`Pausas ativas: ${pausasAtivas.map(p => `${p.motivo} (${p.atividades?.join(', ')})`).join('; ')}`);
    }
  }

  const checkIns = memoria.checkIns || [];
  if (checkIns.length) {
    const hoje = new Date().toISOString().split('T')[0];
    const feitoHoje = checkIns.some(c => c.data === hoje);
    linhas.push(`Check-in noturno hoje: ${feitoHoje ? 'já feito' : 'pendente'}`);
  }

  return linhas.length ? linhas.join('\n') : '(memória ainda vazia — colete informações naturalmente ao longo da conversa)';
}

// ─── Atualiza gamificação baseado em evento (chamado pelo servidor) ───────────
function atualizarGamificacao(memoria, evento) {
  const hoje = new Date().toISOString().split('T')[0];
  const gam = JSON.parse(JSON.stringify(
    memoria.gamificacao || MEMORIA_INICIAL.gamificacao
  ));

  const delta = PONTOS_EVENTO[evento] ?? 0;
  gam.pontos = Math.max(0, (gam.pontos || 0) + delta);

  // Streak
  if (evento === 'dia_ativo') {
    const ultima = gam.ultimaAtividade;
    if (!ultima) {
      gam.streak = 1;
    } else if (ultima === hoje) {
      // já registrado hoje
    } else {
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      gam.streak = ultima === ontem.toISOString().split('T')[0]
        ? (gam.streak || 0) + 1 : 1;
    }
    gam.ultimaAtividade = hoje;
  }

  // Nível com thresholds corretos
  gam.nivel = calcularNivel(gam.pontos);

  // Histórico
  gam.historicoPontos = [
    ...(gam.historicoPontos || []).slice(-99),
    { data: hoje, evento, delta, pontos: gam.pontos },
  ];

  // Badges automáticos por streak e pontos
  const badges = new Set(gam.badges || []);
  if (gam.streak >= 7)   badges.add('semana_streak');
  if (gam.streak >= 15)  badges.add('quinzena_forte');
  if (gam.streak >= 30)  badges.add('mes_streak');
  if (gam.streak >= 100) badges.add('centenaria');
  if (gam.streak >= 365) badges.add('inabalavel');
  if (gam.pontos >= 100) badges.add('primeiro_nivel');
  if (gam.pontos >= 500) badges.add('dedicado');
  gam.badges = [...badges];

  // Garante estrutura de recompensas
  if (!gam.recompensas) {
    gam.recompensas = { pontosAcumulados: 0, resgatados: [], disponiveis: [] };
  }

  return { ...memoria, gamificacao: gam };
}

module.exports = { MEMORIA_INICIAL, mesclarMemoria, formatarMemoriaParaPrompt, atualizarGamificacao };
