import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, CalendarDays, Clock, UserCircle, Trash2, Waves, Zap, LogOut } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

import { supabase } from './lib/supabase';
import Login from './components/auth/Login';

import Onboarding      from './components/onboarding/Onboarding';
import ChatArea        from './components/chat/ChatArea';
import ChatInput       from './components/chat/ChatInput';
import Dashboard       from './components/dashboard/Dashboard';
import RoutineView     from './components/routine/RoutineView';
import ScoreCompact    from './components/shared/ScoreCompact';
import PontosAnimados  from './components/gamificacao/PontosAnimados';
import CelebracaoNivel from './components/gamificacao/CelebracaoNivel';

import ModalConfiguracoes from './components/ModalConfiguracoes';

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

// ── Helper: headers autenticados com refresh proativo ────────────────────────
async function getAuthHeaders() {
  const { data: { session }, error } = await supabase.auth.getSession();

  // Sem sessão ou erro → tenta refresh
  if (error || !session) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    const token = refreshData?.session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Token expira em menos de 60s → renova antes de usar
  const agora = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - agora < 60) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    const token = refreshData?.session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  return {
    'Content-Type': 'application/json',
    ...(session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

// ── fetch autenticado com retry automático em caso de 401 ────────────────────
async function fetchComAuth(url, opcoes = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(url, { ...opcoes, headers });

  if (res.status === 401) {
    const { data } = await supabase.auth.refreshSession();
    if (data?.session) {
      const novasHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      };
      return fetch(url, { ...opcoes, headers: novasHeaders });
    }
  }

  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Autenticação ────────────────────────────────────────────────────────────
  const [sessao,         setSessao]         = useState(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

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
  const [mostrarTooltip,  setMostrarTooltip]  = useState(false);
  const [mostrarPerfil,   setMostrarPerfil]   = useState(false);
  const [mostrarConfig,   setMostrarConfig]   = useState(false);
  const tooltipRef = useRef(null);

  // ── Configurações do usuário ────────────────────────────────────────────────
  const CONFIG_PADRAO = {
    tema: 'escuro',
    notificacoes: { lembretes: true, checkin: true, streak: true },
    tomFlora: 'calorosa',
  };
  const [config, setConfig] = useState(() => {
    const perfilLocal = ls_get(SK.perfil);
    return perfilLocal?.configuracoes || CONFIG_PADRAO;
  });

  // ── Supabase Auth — sessão e listener ──────────────────────────────────────
  const carregarDadosUsuarioRef = useRef(null);
  useEffect(() => {
    // getSession apenas libera o loading inicial — não carrega dados aqui
    // para evitar duplo disparo com onAuthStateChange
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH] getSession:', session ? 'tem sessão' : 'sem sessão');
      setSessao(session);
      setCarregandoAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] evento:', event, '| sessão:', session ? 'presente' : 'ausente');

      if (event === 'SIGNED_OUT') {
        setSessao(null);
        setPlano(null);
        setMensagens([]);
        setHistApi([]);
        setMemoria(null);
        setPerfil(null);
        setOnboardingFeito(false);
        setConcluidasExternas({});
        return;
      }

      setSessao(session);
      setCarregandoAuth(false);

      // Carrega dados apenas nos eventos que indicam login novo ou sessão inicial
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        carregarDadosUsuarioRef.current?.();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

    // Persiste perfil no Supabase para sincronização multi-dispositivo
    fetchComAuth(`${API_URL}/api/usuario/salvar-perfil`, {
      method: 'POST',
      body: JSON.stringify({ perfil: respostas }),
    })
      .then(() => console.log('[SAVE] Perfil do onboarding salvo no Supabase'))
      .catch(err => console.error('[SAVE] Erro ao salvar perfil:', err));

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

      const { data: { session } } = await supabase.auth.getSession();
      console.log('[TOKEN DEBUG] session existe:', !!session);
      console.log('[TOKEN DEBUG] access_token (20 chars):', session?.access_token?.slice(0, 20));
      console.log('[TOKEN DEBUG] expires_at:', session?.expires_at);
      console.log('[TOKEN DEBUG] agora:', Math.floor(Date.now() / 1000));
      const headers = await getAuthHeaders();
      console.log('[DEBUG] enviarMensagem — Authorization:', headers.Authorization?.slice(0, 30) + '...');
      const res = await fetchComAuth(`${API_URL}/api/processar/stream`, {
        method: 'POST',
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
      const res = await fetchComAuth(`${API_URL}/api/plano-acao`, {
        method: 'POST',
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
      sincronizarTarefasConcluidas(novo);
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

  // ── Salvar configurações (Supabase + localStorage) ─────────────────────────
  const salvarConfig = useCallback(async (novasConfig) => {
    setConfig(novasConfig);
    const perfilAtualizado = { ...(perfil || {}), configuracoes: novasConfig };
    setPerfil(perfilAtualizado);
    ls_set(SK.perfil, perfilAtualizado);
    try {
      await fetchComAuth(`${API_URL}/api/usuario/salvar-perfil`, {
        method: 'POST',
        body: JSON.stringify({ perfil: perfilAtualizado }),
      });
    } catch (err) {
      console.error('[CONFIG] Erro ao salvar configurações:', err);
    }
  }, [perfil]);

  // ── Aplicar tema ao root ─────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', config.tema || 'escuro');
  }, [config.tema]);

  // Fecha tooltip ao clicar fora
  useEffect(() => {
    if (!mostrarTooltip) return;
    const handler = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setMostrarTooltip(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mostrarTooltip]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    Object.values(SK).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('fluxo_tarefas_concluidas');
    localStorage.removeItem('fluxo_estado_semana');
    setSessao(null);
    setPlano(null);
    setMensagens([]);
    setHistApi([]);
    setMemoria(null);
    setPerfil(null);
    setOnboardingFeito(false);
    setConcluidasExternas({});
  };

  // ── Carregar dados do usuário do Supabase ────────────────────────────────
  const carregandoDadosRef = useRef(false);
  const carregarDadosUsuario = useCallback(async () => {
    if (carregandoDadosRef.current) return;
    carregandoDadosRef.current = true;
    try {
      const res = await fetchComAuth(`${API_URL}/api/usuario/dados`);

      if (res.status === 401) {
        console.error('[AUTH] 401 em carregarDadosUsuario — ignorando, sem logout');
        return;
      }
      if (!res.ok) {
        console.error('[AUTH] Erro ao carregar dados:', res.status);
        return;
      }

      const dados = await res.json();

      console.log('[LOAD] Dados do Supabase:', {
        temPerfil: !!dados.perfil?.nome,
        temPlano: !!dados.plano,
        temMemoria: !!dados.memoria,
        historicoDisplay: dados.historicoDisplay?.length,
      });

      // Se não há nenhum dado no Supabase → tenta migrar do localStorage (primeiro login)
      const semDadosNoSupabase = !dados.perfil?.nome && !dados.plano && !dados.memoria;
      if (semDadosNoSupabase) {
        await migrarLocalStorageParaSupabaseRef.current?.();
        return; // após migrar, o próximo carregamento buscará do Supabase
      }

      // Perfil — se existe no Supabase, onboarding já foi feito
      if (dados.perfil?.nome) {
        setPerfil(dados.perfil);
        ls_set(SK.perfil, dados.perfil);
        setOnboardingFeito(true);
        ls_set(SK.onboarding, true);
        // Aplica configurações sincronizadas entre dispositivos
        if (dados.perfil.configuracoes) {
          setConfig(dados.perfil.configuracoes);
        }
      }

      // Plano — Supabase SEMPRE sobrescreve localStorage
      if (dados.plano?.compromissos || dados.plano?.tarefas) {
        setPlano(dados.plano);
        ls_set(SK.plano, dados.plano);
      }

      // Memória — Supabase SEMPRE sobrescreve localStorage
      if (dados.memoria) {
        setMemoria(dados.memoria);
        ls_set(SK.memoria, dados.memoria);
      }

      // historicoDisplay NÃO carregado intencionalmente — decisão de produto:
      // "A Flora não guarda conversas. Ela guarda entendimento."
      // Chat sempre inicia limpo. Contexto é mantido via historicoApi (abaixo).
      if (dados.historicoApi?.length > 0) {
        setHistApi(dados.historicoApi);
        ls_set(SK.histApi, dados.historicoApi);
      }
      if (dados.tarefasConcluidas && Object.keys(dados.tarefasConcluidas).length) {
        setConcluidasExternas(dados.tarefasConcluidas);
        ls_set(SK.concluidas, dados.tarefasConcluidas);
      }
    } catch (err) {
      console.error('[AUTH] Erro em carregarDadosUsuario:', err);
    } finally {
      carregandoDadosRef.current = false;
    }
  }, []);

  // Registra no ref para uso dentro do useEffect de auth (evita dependência circular)
  useEffect(() => {
    carregarDadosUsuarioRef.current = carregarDadosUsuario;
  }, [carregarDadosUsuario]);

  // ── Migração do localStorage para o Supabase (primeiro login) ────────────
  const migracaoFeitaRef = useRef(false);
  const migrarLocalStorageParaSupabaseRef = useRef(null);
  const migrarLocalStorageParaSupabase = useCallback(async () => {
    if (migracaoFeitaRef.current) return;
    const planoLocal   = ls_get(SK.plano);
    const memoriaLocal = ls_get(SK.memoria);
    const perfilLocal  = ls_get(SK.perfil);

    if (!planoLocal && !memoriaLocal && !perfilLocal) return;

    migracaoFeitaRef.current = true;
    try {
      await Promise.all([
        planoLocal ? fetchComAuth(`${API_URL}/api/usuario/salvar-plano`, {
          method: 'POST',
          body: JSON.stringify({ plano: planoLocal }),
        }) : Promise.resolve(),
        memoriaLocal ? fetchComAuth(`${API_URL}/api/usuario/salvar-memoria`, {
          method: 'POST',
          body: JSON.stringify({ memoria: memoriaLocal }),
        }) : Promise.resolve(),
        perfilLocal ? fetchComAuth(`${API_URL}/api/usuario/salvar-perfil`, {
          method: 'POST',
          body: JSON.stringify({ perfil: perfilLocal }),
        }) : Promise.resolve(),
      ]);
      console.log('Migração localStorage → Supabase concluída');
    } catch (err) {
      console.error('Erro na migração:', err);
      migracaoFeitaRef.current = false; // permite retry
    }
  }, []);

  useEffect(() => {
    migrarLocalStorageParaSupabaseRef.current = migrarLocalStorageParaSupabase;
  }, [migrarLocalStorageParaSupabase]);

  // ── Sincronizar tarefas concluídas com Supabase ─────────────────────────
  async function sincronizarTarefasConcluidas(tarefaIds) {
    try {
      await fetchComAuth(`${API_URL}/api/usuario/tarefas-concluidas`, {
        method: 'POST',
        body: JSON.stringify({ tarefaIds }),
      });
    } catch (err) {
      console.error('Erro ao sincronizar tarefas concluídas:', err);
    }
  }

  // ── Auth guards ─────────────────────────────────────────────────────────────
  if (carregandoAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f13]">
        <div className="text-amber-500 text-sm font-titulo">Carregando...</div>
      </div>
    );
  }

  if (!sessao) {
    return <Login />;
  }

  // ── Onboarding ───────────────────────────────────────────────────────────
  if (!onboardingFeito) return <Onboarding onConcluir={concluirOnboarding} />;

  // ── Score para o header ──────────────────────────────────────────────────
  const planoComScore = plano ? calcularScore(plano) : null;
  const primeiroNome = perfil?.nome?.split(' ')[0];

  // ── Pendências do dia (substitui o ScoreCompact) ─────────────────────────
  const hoje       = new Date().toISOString().split('T')[0];
  const diaSemana  = new Date().getDay();
  const tarefasPendentesHoje = (plano?.tarefas || []).filter(t => {
    if (t.concluida) return false;
    return t.prazo === hoje;
  }).length;
  const compromissosHoje = (plano?.compromissos || []).filter(c => {
    if (c.concluida) return false;
    if (c.recorrencia?.tipo === 'semanal') {
      return (c.recorrencia.diasSemana || []).includes(diaSemana);
    }
    if (c.recorrencia?.tipo === 'diaria') return true;
    return c.data === hoje;
  }).length;
  const totalPendentesHoje = tarefasPendentesHoje + compromissosHoje;
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
          {plano && totalPendentesHoje > 0 && (
            <div className="relative" ref={tooltipRef}>
              <button
                onClick={() => setMostrarTooltip(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-full transition-all active:scale-95"
                style={{
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}
              >
                <span className="text-xs font-bold text-amber-500 font-titulo">{totalPendentesHoje}</span>
                <span className="text-[10px] text-amber-500/70 hidden sm:inline">hoje</span>
              </button>
              {mostrarTooltip && (
                <div
                  className="absolute right-0 top-full mt-2 z-50 rounded-xl py-2.5 px-3.5 shadow-xl"
                  style={{
                    background: '#1a1a24',
                    border: '1px solid rgba(245,158,11,0.25)',
                    minWidth: '180px',
                  }}
                >
                  <p className="text-[11px] font-semibold text-amber-400 mb-1.5">Você ainda tem:</p>
                  {tarefasPendentesHoje > 0 && (
                    <p className="text-xs text-zinc-300">
                      📝 {tarefasPendentesHoje} tarefa{tarefasPendentesHoje > 1 ? 's' : ''}
                    </p>
                  )}
                  {compromissosHoje > 0 && (
                    <p className="text-xs text-zinc-300 mt-0.5">
                      📅 {compromissosHoje} compromisso{compromissosHoje > 1 ? 's' : ''}
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-500 mt-1">pendentes hoje</p>
                  <button
                    onClick={() => { setMostrarTooltip(false); setAba('plano'); }}
                    className="mt-2 text-[10px] font-semibold text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    Ver plano →
                  </button>
                </div>
              )}
            </div>
          )}
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
          <button onClick={() => setMostrarPerfil(true)} title="Meu perfil"
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

      {/* ── Modal de perfil ─────────────────────────────────────────────── */}
      {mostrarPerfil && (
        <ModalPerfil
          perfil={perfil}
          sessao={sessao}
          gamificacao={gam}
          onFechar={() => setMostrarPerfil(false)}
          onResetar={resetarPerfil}
          onLogout={handleLogout}
          onAbrirConfig={() => { setMostrarPerfil(false); setMostrarConfig(true); }}
        />
      )}

      {/* ── Modal de configurações ───────────────────────────────────────── */}
      {mostrarConfig && (
        <ModalConfiguracoes
          config={config}
          onSalvar={salvarConfig}
          onFechar={() => setMostrarConfig(false)}
          onLimparMemoria={() => {
            if (!window.confirm('Limpar toda a memória da Flora? Ela vai esquecer o que aprendeu sobre você.')) return;
            const memoriaZerada = { gamificacao: memoria?.gamificacao || {} };
            setMemoria(memoriaZerada);
            ls_set(SK.memoria, memoriaZerada);
            fetchComAuth(`${API_URL}/api/usuario/salvar-memoria`, {
              method: 'POST',
              body: JSON.stringify({ memoria: memoriaZerada }),
            }).catch(() => {});
            setMostrarConfig(false);
          }}
        />
      )}
    </div>
  );
}

// ── Modal de perfil ──────────────────────────────────────────────────────────
function ModalPerfil({ perfil, sessao, gamificacao, onFechar, onResetar, onLogout, onAbrirConfig }) {
  const nome      = perfil?.nome || 'Você';
  const email     = sessao?.user?.email || '';
  const inicial   = nome.charAt(0).toUpperCase();
  const nivel     = gamificacao?.nivel || 1;
  const pontos    = gamificacao?.pontos || 0;
  const streak    = gamificacao?.streak || 0;

  const NOMES_NIVEL = ['', 'Iniciante', 'Consistente', 'Focado', 'Produtivo', 'Mestre'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: '#15151e', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header com avatar */}
        <div
          className="px-5 pt-6 pb-5 flex items-center gap-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <span className="text-xl font-bold text-amber-400 font-titulo">{inicial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-titulo font-bold text-white text-base leading-tight truncate">{nome}</p>
            {email && <p className="text-xs text-zinc-500 mt-0.5 truncate">{email}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                Nv.{nivel} · {NOMES_NIVEL[nivel] || 'Avançado'}
              </span>
              {streak >= 2 && (
                <span className="text-[10px] text-zinc-400">🔥 {streak} dias</span>
              )}
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-3 divide-x divide-white/[0.05] px-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { label: 'Pontos', valor: pontos },
            { label: 'Nível',  valor: nivel },
            { label: 'Streak', valor: `${streak}d` },
          ].map(({ label, valor }) => (
            <div key={label} className="py-3 flex flex-col items-center">
              <span className="font-titulo font-bold text-base text-white">{valor}</span>
              <span className="text-[10px] text-zinc-600 mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Ações */}
        <div className="px-4 py-3 space-y-0.5">
          <button
            onClick={onAbrirConfig}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-zinc-300 transition-colors hover:bg-white/5 text-left"
          >
            <span className="text-base leading-none">⚙️</span>
            Configurações
          </button>
          <button
            onClick={onResetar}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-zinc-400 transition-colors hover:bg-white/5 text-left"
          >
            <UserCircle size={15} className="text-zinc-500 flex-shrink-0" />
            Editar perfil
            <span className="ml-auto text-xs text-zinc-600">Refazer onboarding</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 transition-colors hover:bg-red-500/8 text-left"
          >
            <LogOut size={15} className="flex-shrink-0" />
            Sair da conta
          </button>
        </div>

        {/* Em breve */}
        <div
          className="mx-4 mb-4 rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-4 pt-3 pb-2">Em breve</p>
          {[
            { icon: '🧠', label: 'O que aprendi sobre você' },
            { icon: '📊', label: 'Resumo da semana' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5 opacity-40">
              <span className="text-sm">{icon}</span>
              <span className="text-xs text-zinc-500">{label}</span>
              <span className="ml-auto text-[10px] text-zinc-700">em breve</span>
            </div>
          ))}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
