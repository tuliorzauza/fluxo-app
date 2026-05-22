import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, CalendarDays, Clock, UserCircle, Trash2, Waves, Zap } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

import Onboarding      from './components/onboarding/Onboarding';
import ChatArea        from './components/chat/ChatArea';
import ChatInput       from './components/chat/ChatInput';
import Dashboard       from './components/dashboard/Dashboard';
import RoutineView     from './components/routine/RoutineView';
import ScoreCompact    from './components/shared/ScoreCompact';
import PontosAnimados  from './components/gamificacao/PontosAnimados';
import CelebracaoNivel from './components/gamificacao/CelebracaoNivel';

import { calcularScore, preservarEstadosTarefas } from './utils/planoUtils';
import {
  processarEventoGamificacao,
  getNivel,
  MENSAGENS_NIVEL,
} from './utils/gamificacao';

// ── Storage keys ──────────────────────────────────────────────────────────────
const SK = {
  plano:       'fluxo_plano_v2',
  histDisplay: 'fluxo_hist_display_v2',
  histApi:     'fluxo_hist_api_v2',
  perfil:      'fluxo_perfil_v2',
  onboarding:  'fluxo_onboarding_done_v2',
  floraJaOi:   'fluxo_flora_oi_v2',
  memoria:     'fluxo_memory_v1',
  concluidas:  'fluxo_tarefas_concluidas',
};

const ls_get = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const ls_set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ── Deduplica tarefas por ID preservando estado concluida ────────────────────
function mesclarTarefas(existentes, novas) {
  const map = new Map();
  (existentes || []).forEach(t => map.set(t.id, t));
  (novas || []).forEach(t => {
    if (map.has(t.id)) {
      map.set(t.id, { ...t, concluida: map.get(t.id).concluida });
    } else {
      map.set(t.id, t);
    }
  });
  return Array.from(map.values());
}

// ── Extrai mensagem parcial do JSON sendo streamado ───────────────────────────
function extractMensagemFromPartialJson(partial) {
  const match = partial.match(/"mensagem"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
  if (!match) return '';
  return match[1]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\t/g, '\t');
}

// ── Mensagem de boas-vindas da Flora ─────────────────────────────────────────
function mensagemBoasVindas(perfil) {
  const nome = perfil?.nome?.split(' ')[0] || '';
  return `Oi${nome ? ` ${nome}` : ''}! Sou a Flora, sua assistente pessoal aqui no Fluxo 🌿\n\nTô aqui pra te ajudar a organizar sua semana de um jeito que funcione de verdade pra você — sem aquela sensação de que o dia passou e você não fez nada.\n\nPra começar: o que tá na sua cabeça pra essa semana? Pode ser qualquer coisa — trabalho, estudos, compromissos, até aquele treino que você fica adiando 😄`;
}

// ── Memória gamificação inicial ───────────────────────────────────────────────
const GAM_INICIAL = {
  pontos: 0, nivel: 1, streak: 0, ultimaAtividade: null,
  badges: [], historicoPontos: [], contadores: {}, recompensas: { pontosAcumulados: 0, resgatados: [], disponiveis: [] },
};

// ── Extrai atividades de um texto livre ───────────────────────────────────────
function extrairAtividadesDoTexto(texto) {
  if (!texto || typeof texto !== 'string') return [];
  return texto
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);
}


// ── Notificações ─────────────────────────────────────────────────────────────
async function pedirPermissaoNotificacao() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

function enviarNotificacao(titulo, corpo, opcoes = {}) {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(titulo, {
    body: corpo,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: opcoes.tag || 'fluxo-geral',
    renotify: true,
    requireInteraction: opcoes.requireInteraction || false,
    data: opcoes.data || {},
  });
  n.onclick = () => { window.focus(); n.close(); if (opcoes.onClick) opcoes.onClick(); };
}

const notificacoesEnviadas = new Set();

function verificarNotificacoes(planoAtual, memoriaAtual) {
  if (Notification.permission !== 'granted') return;
  const agora    = new Date();
  const hora     = agora.getHours() * 60 + agora.getMinutes();
  const hojeStr  = agora.toISOString().split('T')[0];

  // Lembrete 30min antes de compromissos de hoje
  (planoAtual?.compromissos || []).forEach(comp => {
    if (!comp.hora || comp.concluida) return;
    if (comp.data && comp.data !== hojeStr) return;
    const [h, m] = comp.hora.split(':').map(Number);
    const diff   = (h * 60 + m) - hora;
    if (diff >= 28 && diff <= 32) {
      const tag = `lembrete-30min-${comp.id}`;
      if (!notificacoesEnviadas.has(tag)) {
        notificacoesEnviadas.add(tag);
        enviarNotificacao(`Em 30 minutos: ${comp.titulo}`, `Prepare-se para ${comp.titulo} às ${comp.hora}`, { tag });
      }
    }
  });

  // Streak em risco às 21h
  const streak = memoriaAtual?.gamificacao?.streak || 0;
  if (agora.getHours() === 21 && agora.getMinutes() < 5 && streak > 0) {
    const tag = `streak-risco-${hojeStr}`;
    if (!notificacoesEnviadas.has(tag)) {
      notificacoesEnviadas.add(tag);
      enviarNotificacao('Seu streak tá em risco 🔥', `${streak} dia${streak > 1 ? 's' : ''} de sequência. Não deixa escapar hoje.`, { tag });
    }
  }

  // Check-in noturno às 20h
  if (agora.getHours() === 20 && agora.getMinutes() < 5) {
    const tag = `checkin-${hojeStr}`;
    const jaFez = (memoriaAtual?.checkIns || []).some(c => c.data === hojeStr);
    if (!notificacoesEnviadas.has(tag) && !jaFez) {
      notificacoesEnviadas.add(tag);
      enviarNotificacao('Como foi seu dia? 🌙', 'A Flora quer saber. Leva só 2 minutos.', { tag });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // BUG 1 — inicialização lazy: lê o localStorage diretamente no primeiro render,
  // evitando o ciclo null → useEffect → setState que perde estado no hot reload.
  const [onboardingFeito, setOnboardingFeito] = useState(() => !!ls_get(SK.onboarding));
  const [perfil,          setPerfil]          = useState(() => ls_get(SK.perfil));
  const [plano,           setPlano]           = useState(() => {
    const p = ls_get(SK.plano);
    if (!p) return null;
    if (p.tarefas) p.tarefas = mesclarTarefas([], p.tarefas);
    return p;
  });
  const [histApi,         setHistApi]         = useState(() => ls_get(SK.histApi) || []);
  const [memoria,         setMemoria]         = useState(() => ls_get(SK.memoria));
  const [mensagens,       setMensagens]       = useState(() => {
    if (!ls_get(SK.onboarding)) return [];
    return ls_get(SK.histDisplay) || [];
  });
  const [carregando,      setCarregando]      = useState(false);
  const [erro,            setErro]            = useState(null);
  const [aba,             setAba]             = useState('chat');

  // Modo Caos
  const [modoCaos, setModoCaos] = useState(false);

  // Storage independente de concluídas — nunca tocado pela Flora
  const [concluidasExternas, setConcluidasExternas] = useState(() => ls_get(SK.concluidas) || {});
  // Ref sempre atualizado para uso dentro de updaters funcionais sem dependência de closure
  const concluidasRef = useRef(concluidasExternas);
  useEffect(() => { concluidasRef.current = concluidasExternas; }, [concluidasExternas]);

  // Notificações
  const [notificacaoPermissao, setNotificacaoPermissao] = useState(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });


  // ── Gamificação UI ──────────────────────────────────────────────────────────
  const [animacoes,      setAnimacoes]      = useState([]);
  const [celebracaoNivel, setCelebracaoNivel] = useState(null);

  // Boas-vindas: exibe primeira mensagem da Flora se o histórico ainda está vazio
  useEffect(() => {
    if (!ls_get(SK.onboarding)) return;
    if ((ls_get(SK.histDisplay) || []).length === 0 && !ls_get(SK.floraJaOi)) {
      const msgBV = {
        tipo: 'flora',
        texto: mensagemBoasVindas(ls_get(SK.perfil)),
        timestamp: new Date().toISOString(),
      };
      setMensagens([msgBV]);
      ls_set(SK.histDisplay, [msgBV]);
      ls_set(SK.floraJaOi, true);
    }
  }, []); // roda uma única vez na montagem

  // ── Permissão de notificação — pede 30s após onboarding ──────────────────
  useEffect(() => {
    if (!onboardingFeito) return;
    const t = setTimeout(() => { pedirPermissaoNotificacao(); }, 30000);
    return () => clearTimeout(t);
  }, [onboardingFeito]);

// ── Verificação periódica de notificações (a cada 5 min) ─────────────────
  useEffect(() => {
    if (Notification.permission !== 'granted') return;
    if (!plano && !memoria) return;
    verificarNotificacoes(plano, memoria);
    const intervalo = setInterval(() => verificarNotificacoes(plano, memoria), 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [plano, memoria]);

  // ── Helpers de gamificação ─────────────────────────────────────────────────
  const adicionarAnimacao = useCallback((delta) => {
    if (!delta) return;
    const id = Date.now() + Math.random();
    setAnimacoes(prev => [...prev, { id, delta }]);
    setTimeout(() => setAnimacoes(prev => prev.filter(a => a.id !== id)), 2200);
  }, []);

  const verificarLevelUp = useCallback((memoriaAntiga, memoriaAtualizada, nome) => {
    const nivelAntigo = memoriaAntiga?.gamificacao?.nivel || 1;
    const nivelNovo   = memoriaAtualizada?.gamificacao?.nivel || 1;
    if (nivelNovo > nivelAntigo) {
      const nivelInfo = getNivel(memoriaAtualizada.gamificacao.pontos);
      const msgFn = MENSAGENS_NIVEL[nivelNovo];
      const mensagem = msgFn ? msgFn(nome?.split(' ')[0] || '') : null;
      setCelebracaoNivel({ ...nivelInfo, mensagem });
    }
  }, []);

  // ── Ativar notificações via botão manual ─────────────────────────────────
  const ativarNotificacoes = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações.');
      return;
    }
    const resultado = await Notification.requestPermission();
    setNotificacaoPermissao(resultado);
    if (resultado === 'granted') {
      new Notification('Fluxo ativado! 🌿', {
        body: 'Você vai receber lembretes da Flora aqui.',
        icon: '/icon-192.png',
      });
    } else if (resultado === 'denied') {
      alert(
        'Notificações bloqueadas.\n\nNo iPhone:\n1. Ajustes → Safari → Notificações\n2. Ative para este site\n\nNo Android:\n1. Configurações → Apps → Navegador → Notificações\n2. Ative e recarregue o app'
      );
    }
  }, []);

  // ── Onboarding concluído ─────────────────────────────────────────────────
  const concluirOnboarding = useCallback((respostas) => {
    setPerfil(respostas);
    setOnboardingFeito(true);
    ls_set(SK.perfil, respostas);
    ls_set(SK.onboarding, true);

    // Badge de onboarding
    const memoriaBase = ls_get(SK.memoria) || { gamificacao: { ...GAM_INICIAL } };
    const { memoriaAtualizada } = processarEventoGamificacao(memoriaBase, 'dia_ativo', {
      onboardingFeito: true,
      descricao: 'Onboarding concluído',
    });

    // Salva ritmoAceito e compromissos fixos do onboarding na memória
    const cfixos = respostas.compromissosFixos;
    const memoriaFinal = {
      ...memoriaAtualizada,
      rotina: {
        comprometida: cfixos?.temFixos ? extrairAtividadesDoTexto(cfixos.descricao) : [],
        ritmoAceito: respostas.ritmo || null,
        flexiveis: [],
        horariosFixos: cfixos?.temFixos ? (cfixos.descricao || null) : null,
        ...(memoriaAtualizada.rotina || {}),
      },
    };
    setMemoria(memoriaFinal);
    ls_set(SK.memoria, memoriaFinal);

    // Se o usuário informou compromissos fixos, salva flag para Flora criar no plano
    if (cfixos?.temFixos && cfixos.descricao?.trim()) {
      ls_set('fluxo_compromissos_fixos_pendentes', cfixos.descricao.trim());
    }

    const msgBV = {
      tipo: 'flora',
      texto: mensagemBoasVindas(respostas),
      timestamp: new Date().toISOString(),
    };
    setMensagens([msgBV]);
    ls_set(SK.histDisplay, [msgBV]);
    ls_set(SK.floraJaOi, true);
  }, []);

  // ── Enviar mensagem (com streaming SSE) ────────────────────────────────
  const enviarMensagem = useCallback(async (input) => {
    setCarregando(true);
    setErro(null);

    const msgUser = { tipo: 'user', texto: input, timestamp: new Date().toISOString() };
    const novasMensagens = [...mensagens, msgUser];

    // Placeholder da Flora durante streaming
    const ts = new Date().toISOString();
    const msgFloraPH = {
      tipo: 'flora',
      texto: '',
      streaming: true,
      streamRaw: '',
      streamMensagem: '',
      timestamp: ts,
    };
    setMensagens([...novasMensagens, msgFloraPH]);

    // Badge primeira conversa
    const memoriaAtual = ls_get(SK.memoria) || { gamificacao: { ...GAM_INICIAL } };
    const primeiraConversa = !memoriaAtual?.gamificacao?.badges?.includes('primeira_conversa') &&
      (ls_get(SK.histApi) || []).length === 0;

    try {
      const dataHoraAtual = new Date().toLocaleString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      const res = await fetch(`${API_URL}/api/processar/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          historicoMensagens: histApi,
          dataHoraAtual,
          perfil,
          planoAtual: plano,
          memoria: memoria || null,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.erro || `Erro ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let rawAccumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let data;
          try { data = JSON.parse(part.slice(6)); } catch { continue; }

          if (data.type === 'chunk') {
            rawAccumulated += data.text;
            const mensagemParcial = extractMensagemFromPartialJson(rawAccumulated);
            setMensagens(prev => prev.map((m, i) =>
              i === prev.length - 1 && m.streaming
                ? { ...m, streamRaw: rawAccumulated, streamMensagem: mensagemParcial }
                : m
            ));

          } else if (data.type === 'done') {
            const {
              mensagem, modo, plano: novoPlano,
              _historico, perguntaInjetada, quickReplies,
              memoriaAtualizada,
            } = data;

            // Substitui placeholder pela mensagem final
            const msgFlora = {
              tipo: 'flora',
              texto: mensagem,
              modo,
              quickReplies: quickReplies || null,
              timestamp: new Date().toISOString(),
            };
            const mensagensFinais = [...novasMensagens, msgFlora];
            setMensagens(mensagensFinais);
            ls_set(SK.histDisplay, mensagensFinais);

            setHistApi(_historico || []);
            ls_set(SK.histApi, _historico || []);

            if (novoPlano && !input.includes('[MODO_CAOS]')) {
              setPlano(prevPlano => {
                const tarefasMerged = preservarEstadosTarefas(prevPlano?.tarefas || [], novoPlano.tarefas);
                const planoAtualizado = { ...novoPlano, tarefas: tarefasMerged };
                ls_set(SK.plano, planoAtualizado);
                return planoAtualizado;
              });
            }

            // ── Gamificação após resposta ─────────────────────────────────
            if (memoriaAtualizada) {
              // Se houve badge de primeira conversa, processa client-side
              let memFinal = memoriaAtualizada;
              if (primeiraConversa) {
                const { memoriaAtualizada: m2 } = processarEventoGamificacao(memFinal, 'dia_ativo', {
                  primeiraConversa: true,
                  descricao: 'Primeira conversa com a Flora',
                });
                memFinal = m2;
              }

              const deltaPoints = (memFinal.gamificacao?.pontos || 0) - (memoria?.gamificacao?.pontos || 0);
              adicionarAnimacao(deltaPoints);
              verificarLevelUp(memoria, memFinal, perfil?.nome);

              setMemoria(memFinal);
              ls_set(SK.memoria, memFinal);
            }

            // Atualiza perfil
            const perfilAtualizado = {
              ...perfil,
              contadorInteracoes: (perfil?.contadorInteracoes || 0) + 1,
              perguntasProfundasFeitas: perguntaInjetada
                ? [...(perfil?.perguntasProfundasFeitas || []), perguntaInjetada]
                : (perfil?.perguntasProfundasFeitas || []),
            };
            setPerfil(perfilAtualizado);
            ls_set(SK.perfil, perfilAtualizado);

          } else if (data.type === 'error') {
            throw new Error(data.erro || 'Erro no streaming');
          }
        }
      }
    } catch (e) {
      console.error(e);
      setErro(e.message || 'Algo deu errado. Tenta de novo?');
      setMensagens(novasMensagens);
    } finally {
      setCarregando(false);
    }
  }, [mensagens, histApi, perfil, plano, memoria, adicionarAnimacao, verificarLevelUp]);

  // ── Ritual de Fechamento — check-in noturno automático (20h-23h) ────────
  const checkinDisparadoRef = useRef(false);
  const enviarMensagemRef   = useRef(enviarMensagem);
  useEffect(() => { enviarMensagemRef.current = enviarMensagem; }, [enviarMensagem]);

  useEffect(() => {
    if (!onboardingFeito || checkinDisparadoRef.current) return;
    const hora = new Date().getHours();
    if (hora < 20 || hora >= 23) return;

    const hoje = new Date().toISOString().split('T')[0];
    const checkIns = memoria?.checkIns || [];
    const jaFezHoje = checkIns.some(c => c.data === hoje);
    if (jaFezHoje) return;

    checkinDisparadoRef.current = true;
    const t = setTimeout(() => {
      enviarMensagemRef.current('[RITUAL_FECHAMENTO] Hora de fechar o dia. Como foi?');
    }, 1200);
    return () => clearTimeout(t);
  }, [onboardingFeito, memoria]);

  // ── Rotinas Temporárias — lembrete de retorno 2 dias antes ───────────────
  const pausaLembretaRef = useRef(false);
  useEffect(() => {
    if (!onboardingFeito || pausaLembretaRef.current) return;
    const pausas = memoria?.rotina?.pausas || [];
    if (!pausas.length) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pausaParaLembrar = pausas.find(p => {
      if (!p.dataEstimadaRetorno) return false;
      const retorno = new Date(p.dataEstimadaRetorno + 'T00:00:00');
      const diff = Math.round((retorno - hoje) / 86400000);
      return diff === 2 || diff === 1;
    });

    if (!pausaParaLembrar) return;

    pausaLembretaRef.current = true;
    const atividades = (pausaParaLembrar.atividades || []).join(', ') || pausaParaLembrar.motivo || 'sua rotina';
    const t = setTimeout(() => {
      enviarMensagemRef.current(
        `[ROTINA_RETORNO] Daqui 2 dias era pra você voltar com ${atividades}. Como tá?`
      );
    }, 2000);
    return () => clearTimeout(t);
  }, [onboardingFeito, memoria]);

// ── Compromissos fixos do onboarding → criar no plano via Flora ──────────
  const compromissosPendentesRef = useRef(false);
  useEffect(() => {
    if (!onboardingFeito || compromissosPendentesRef.current) return;
    const descricao = ls_get('fluxo_compromissos_fixos_pendentes');
    if (!descricao) return;
    compromissosPendentesRef.current = true;
    localStorage.removeItem('fluxo_compromissos_fixos_pendentes');
    const t = setTimeout(() => {
      enviarMensagemRef.current(
        `[Sistema] O usuário acabou de completar o onboarding e informou os seguintes compromissos fixos:\n"${descricao}"\n\nCrie esses compromissos recorrentes no plano agora, com categoria 'fixo', horários e dias corretos. Não faça perguntas — interprete e crie diretamente.`
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [onboardingFeito]);

  // ── Modo Caos ────────────────────────────────────────────────────────────
  const ativarModoCaos = useCallback(() => {
    setModoCaos(true);
    setAba('chat');
    setTimeout(() => {
      enviarMensagem('[MODO_CAOS] Estou perdido e sobrecarregado. Preciso de um plano de sobrevivência simplificado para hoje. Máximo 3 itens, apenas inegociáveis.');
    }, 80);
  }, [enviarMensagem]);

  // ── Plano de ação iniciado pelo Estado da Semana ───────────────────────
  const iniciarPlanoAcao = useCallback(async (diagnostico) => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`${API_URL}/api/plano-acao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnostico,
          planoAtual: plano,
          memoria: memoria || null,
          perfil,
        }),
      });

      if (!res.ok) throw new Error(`Erro ${res.status}`);

      const { mensagem, quickReplies, _historico } = await res.json();

      const msgFlora = {
        tipo: 'flora',
        texto: mensagem,
        quickReplies: quickReplies || null,
        timestamp: new Date().toISOString(),
      };

      setMensagens(prev => {
        const nova = [...prev, msgFlora];
        ls_set(SK.histDisplay, nova);
        return nova;
      });

      if (_historico?.length) {
        setHistApi(prev => {
          const atualizado = [...prev, ..._historico].slice(-24);
          ls_set(SK.histApi, atualizado);
          return atualizado;
        });
      }
    } catch (e) {
      console.error('Erro ao iniciar plano de ação:', e);
    } finally {
      setCarregando(false);
    }
  }, [plano, memoria, perfil]);

  // Detecta flag do plano de ação ao abrir a aba Chat
  const planoAcaoProcessadoRef = useRef(false);
  useEffect(() => {
    if (aba !== 'chat') {
      planoAcaoProcessadoRef.current = false;
      return;
    }
    if (planoAcaoProcessadoRef.current) return;

    const flagRaw = localStorage.getItem('fluxo_plano_acao_pendente');
    if (!flagRaw) return;

    planoAcaoProcessadoRef.current = true;
    localStorage.removeItem('fluxo_plano_acao_pendente');

    let diagnostico;
    try { diagnostico = JSON.parse(flagRaw); } catch { return; }

    iniciarPlanoAcao(diagnostico);
  }, [aba, iniciarPlanoAcao]);

  // ── Toggle de tarefa ou compromisso ────────────────────────────────────
  const toggleTarefa = useCallback((id) => {
    let itemCompletado = null;
    let marcando = false; // direção do toggle, determinada dentro do updater

    setPlano(prev => {
      if (!prev) return prev;

      const tarefa = prev.tarefas?.find(t => t.id === id);
      let novo;

      if (tarefa) {
        // Estado efetivo = storage independente OU concluida no plano
        const eraConcluidaEfetiva = !!concluidasRef.current[id] || tarefa.concluida;
        marcando = !eraConcluidaEfetiva;
        if (marcando) itemCompletado = tarefa;
        novo = {
          ...prev,
          tarefas: prev.tarefas.map(t =>
            t.id === id ? { ...t, concluida: marcando } : t
          ),
        };
      } else {
        const compromisso = prev.compromissos?.find(c => c.id === id);
        if (!compromisso) return prev;
        const eraConcluidaEfetiva = !!concluidasRef.current[id] || compromisso.concluida;
        marcando = !eraConcluidaEfetiva;
        if (marcando) itemCompletado = compromisso;
        novo = {
          ...prev,
          compromissos: prev.compromissos.map(c =>
            c.id === id ? { ...c, concluida: marcando } : c
          ),
        };
      }

      localStorage.setItem(SK.plano, JSON.stringify(novo));
      return novo;
    });

    // Atualiza storage independente — nunca tocado pela Flora
    setConcluidasExternas(prev => {
      const novo = { ...prev };
      if (marcando) {
        novo[id] = true;
      } else {
        delete novo[id];
      }
      ls_set(SK.concluidas, novo);
      return novo;
    });

    // Gamificação — roda após o updater, usando o item capturado
    if (itemCompletado) {
      const memoriaBase = memoria || { gamificacao: { ...GAM_INICIAL } };
      const badges = memoriaBase.gamificacao?.badges || [];
      const tituloItem = itemCompletado.titulo || '';
      const extra = {
        descricao: tituloItem,
        primeiroCompromisso: !badges.includes('primeira_vitoria'),
        tipo: tituloItem.toLowerCase().includes('academ') ? 'academia'
            : tituloItem.toLowerCase().includes('luta') || tituloItem.toLowerCase().includes('boxe') ? 'luta'
            : tituloItem.toLowerCase().includes('estudo') || tituloItem.toLowerCase().includes('estud') ? 'estudo'
            : tituloItem.toLowerCase().includes('skate') ? 'skate'
            : null,
        meianoite: new Date().getHours() === 0 || new Date().getHours() >= 23,
      };

      const eventoGam = itemCompletado._isCompromisso ? 'compromisso_feito' : 'tarefa_flexivel';
      const { memoriaAtualizada: memGam, delta, levelUp } = processarEventoGamificacao(
        memoriaBase, eventoGam, extra
      );

      adicionarAnimacao(delta);
      if (levelUp) {
        const msgFn = MENSAGENS_NIVEL[levelUp.nivel];
        const mensagem = msgFn ? msgFn(perfil?.nome?.split(' ')[0] || '') : null;
        setCelebracaoNivel({ ...levelUp, mensagem });
      }
      setMemoria(memGam);
      ls_set(SK.memoria, memGam);

      const celebracoes = [
        `✅ "${tituloItem}" feito! +${delta} pontos. Uma a menos na lista 💪`,
        `✅ Marcado! "${tituloItem}" concluído. +${delta} pts — continue assim 🌟`,
        `✅ Isso aí! "${tituloItem}" feito. +${delta} pontos 🔥`,
      ];
      const msgCelebracao = {
        tipo: 'flora',
        texto: celebracoes[Math.floor(Math.random() * celebracoes.length)],
        timestamp: new Date().toISOString(),
      };
      setMensagens(prev => {
        const nova = [...prev, msgCelebracao];
        ls_set(SK.histDisplay, nova);
        return nova;
      });
    }
  }, [memoria, perfil, adicionarAnimacao]);

  // ── Editar item do calendário ───────────────────────────────────────────
  const editarItem = useCallback((id, changes, tipo) => {
    if (!plano) return;
    let novo;
    if (tipo === 'tarefa') {
      novo = { ...plano, tarefas: plano.tarefas.map(t => t.id === id ? { ...t, ...changes } : t) };
    } else {
      novo = { ...plano, compromissos: (plano.compromissos || []).map(c => c.id === id ? { ...c, ...changes } : c) };
    }
    setPlano(novo);
    ls_set(SK.plano, novo);
  }, [plano]);

  // ── Deletar item do calendário ──────────────────────────────────────────
  const deletarItem = useCallback((id, tipo) => {
    if (!plano) return;
    let novo;
    if (tipo === 'tarefa') {
      novo = { ...plano, tarefas: plano.tarefas.filter(t => t.id !== id) };
    } else {
      novo = { ...plano, compromissos: (plano.compromissos || []).filter(c => c.id !== id) };
    }
    setPlano(novo);
    ls_set(SK.plano, novo);
  }, [plano]);

  // ── Adicionar compromisso direto pelo calendário ────────────────────────
  const adicionarCompromisso = useCallback((compromisso) => {
    const planoBase = plano || { compromissos: [], tarefas: [] };
    const novo = {
      ...planoBase,
      compromissos: [...(planoBase.compromissos || []), compromisso],
    };
    setPlano(novo);
    ls_set(SK.plano, novo);
  }, [plano]);

  // ── Fechar celebração de nível (e mandar mensagem da Flora no chat) ─────
  const fecharCelebracao = useCallback(() => {
    if (celebracaoNivel?.mensagem) {
      const msgFlora = {
        tipo: 'flora',
        texto: celebracaoNivel.mensagem,
        timestamp: new Date().toISOString(),
      };
      setMensagens(prev => {
        const nova = [...prev, msgFlora];
        ls_set(SK.histDisplay, nova);
        return nova;
      });
    }
    setCelebracaoNivel(null);
  }, [celebracaoNivel]);

  // ── Limpar tudo ─────────────────────────────────────────────────────────
  const limpar = () => {
    if (!window.confirm('Limpar o histórico e o plano atual?')) return;
    setPlano(null); setMensagens([]); setHistApi([]); setConcluidasExternas({});
    Object.values(SK).forEach(k => {
      if (k !== SK.perfil && k !== SK.onboarding && k !== SK.floraJaOi && k !== SK.memoria) {
        localStorage.removeItem(k);
      }
    });
    const msgBV = { tipo: 'flora', texto: mensagemBoasVindas(perfil), timestamp: new Date().toISOString() };
    setMensagens([msgBV]);
    ls_set(SK.histDisplay, [msgBV]);
  };

  const resetarPerfil = () => {
    if (!window.confirm('Refazer o onboarding e redefinir seu perfil?')) return;
    Object.values(SK).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  // ── Onboarding ───────────────────────────────────────────────────────────
  if (!onboardingFeito) return <Onboarding onConcluir={concluirOnboarding} />;

  // ── Score para o header ──────────────────────────────────────────────────
  const planoComScore = plano ? calcularScore(plano) : null;
  const score = planoComScore?.diagnostico?.scoreTempoLivre || 0;
  const primeiroNome = perfil?.nome?.split(' ')[0];
  const gam = memoria?.gamificacao;

  // ── App principal ────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-[#0f0f13] font-corpo"
      style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.2)',
              boxShadow: '0 0 12px rgba(245,158,11,0.08)',
            }}
          >
            <Waves size={14} className="text-amber-500" />
          </div>
          <div>
            <h1 className="font-titulo font-bold text-base text-white leading-none">
              {primeiroNome ? `Oi, ${primeiroNome}` : 'Fluxo'}
            </h1>
            <p className="text-[10px] text-zinc-600 mt-0.5">com a Flora</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gam?.pontos > 0 && (
            <button
              onClick={() => setAba('plano')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.15)',
              }}
              title={`${gam.pontos} pts — Streak: ${gam.streak} dias`}
            >
              <span className="text-[11px] font-bold text-amber-500 font-titulo">
                Nv.{gam.nivel}
              </span>
              {gam.streak >= 3 && (
                <span className="text-[11px]">🔥{gam.streak}</span>
              )}
            </button>
          )}
          {plano && <ScoreCompact score={score} />}
          {notificacaoPermissao === 'default' && (
            <button
              onClick={ativarNotificacoes}
              title="Ativar notificações"
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-[11px]">🔔</span>
              <span className="text-[10px] font-semibold" style={{ color: '#52525b' }}>Notif</span>
            </button>
          )}
          {notificacaoPermissao === 'denied' && (
            <button
              onClick={() => alert('Notificações bloqueadas.\n\nNo iPhone:\n1. Ajustes → Safari → Notificações\n2. Ative para este site\n\nNo Android:\n1. Configurações → Apps → Navegador → Notificações\n2. Ative e recarregue o app')}
              title="Notificações bloqueadas — toque para instruções"
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl opacity-50"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-[11px]">🔕</span>
            </button>
          )}
<button onClick={limpar} title="Limpar histórico"
            className="p-1.5 rounded-lg text-zinc-700 hover:text-zinc-400 transition-colors hover:bg-white/[0.04]">
            <Trash2 size={14} />
          </button>
          <button onClick={resetarPerfil} title="Redefinir perfil"
            className="p-1.5 rounded-lg text-zinc-700 hover:text-zinc-400 transition-colors hover:bg-white/[0.04]">
            <UserCircle size={16} />
          </button>
        </div>
      </header>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-shrink-0 px-4 pt-2 pb-0 gap-1"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        {[
          { id: 'chat',   label: 'Chat',   icon: MessageSquare },
          { id: 'plano',  label: 'Plano',  icon: CalendarDays  },
          { id: 'rotina', label: 'Rotina', icon: Clock         },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold font-titulo transition-all duration-150 rounded-t-lg relative"
            style={{
              color: aba === id ? '#f59e0b' : '#52525b',
              background: aba === id ? 'rgba(245,158,11,0.06)' : 'transparent',
            }}
          >
            <Icon size={13} />
            {label}
            {aba === id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                style={{ background: '#f59e0b' }}
              />
            )}
          </button>
        ))}

        {plano && aba === 'chat' && (() => {
          const pendentes = plano.tarefas?.filter(t => !t.concluida).length || 0;
          return pendentes > 0 ? (
            <div className="ml-auto self-center">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
              >
                {pendentes} tarefa{pendentes > 1 ? 's' : ''}
              </span>
            </div>
          ) : null;
        })()}
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat sempre montado (hidden quando outra aba) para não perder estado */}
        <div className={`flex-1 flex flex-col overflow-hidden ${aba !== 'chat' ? 'hidden' : ''}`}>
          {erro && (
            <div className="mx-4 mt-2 p-3 rounded-xl bg-red-500/8 border border-red-500/20 flex-shrink-0">
              <p className="text-xs text-red-300">{erro}</p>
            </div>
          )}
          <ChatArea mensagens={mensagens} carregando={carregando} onQuickReply={enviarMensagem} />
          {/* Botão Modo Caos — acima do input, sempre visível no chat */}
          {!modoCaos && (
            <div className="px-3 pt-2 pb-0 flex justify-end flex-shrink-0">
              <button
                onClick={ativarModoCaos}
                disabled={carregando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.28)',
                  color: '#a78bfa',
                }}
              >
                <Zap size={11} />
                Estou perdido 🌀
              </button>
            </div>
          )}
          {modoCaos && (
            <div className="px-3 pt-2 pb-0 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">🌀 Modo Caos ativo</span>
              <button
                onClick={() => setModoCaos(false)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Voltar ao normal ↩
              </button>
            </div>
          )}
          <ChatInput onSend={enviarMensagem} carregando={carregando} />
        </div>

        {aba === 'plano' && (
          <div className="flex-1 overflow-y-auto">
            {modoCaos && (
              <div className="mx-4 mt-3 mb-1 flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <span className="text-xs text-violet-400 font-semibold">🌀 Modo Caos — plano simplificado</span>
                <button onClick={() => setModoCaos(false)} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                  Voltar ao normal ↩
                </button>
              </div>
            )}
            <Dashboard
              plano={planoComScore}
              gamificacao={gam}
              perfil={perfil}
              modoCaos={modoCaos}
              memoria={memoria}
              onToggleTarefa={toggleTarefa}
              onEditarItem={editarItem}
              onDeletarItem={deletarItem}
              onAdicionarCompromisso={adicionarCompromisso}
              onVerPlano={() => setAba('chat')}
            />
          </div>
        )}

        {aba === 'rotina' && (
          <div className="flex-1 overflow-y-auto">
            {plano || true ? (
              <RoutineView
                compromissos={plano?.compromissos || []}
                tarefas={plano?.tarefas || []}
                onEditarItem={editarItem}
                onDeletarItem={deletarItem}
                onAdicionarCompromisso={adicionarCompromisso}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
                <div className="text-4xl mb-4">⏰</div>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Sua rotina semanal vai aparecer aqui.
                </p>
                <p className="text-zinc-600 text-xs mt-2">Conte pra Flora o que tem na sua semana →</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Camada global de gamificação (sempre renderizada) ───────────── */}
      <PontosAnimados animacoes={animacoes} />
      {celebracaoNivel && (
        <CelebracaoNivel info={celebracaoNivel} onContinuar={fecharCelebracao} />
      )}
    </div>
  );
}
