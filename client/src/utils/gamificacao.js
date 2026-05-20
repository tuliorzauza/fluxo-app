/**
 * gamificacao.js — Lógica central do sistema de gamificação do Fluxo
 *
 * Usada tanto nos componentes de UI quanto pelo App.jsx para
 * processar eventos de pontuação localmente (sem round-trip ao servidor).
 */

// ─── Níveis ───────────────────────────────────────────────────────────────────
export const NIVEIS = [
  { nivel: 1,  nome: 'Semente',     emoji: '🌱', min: 0,    max: 100   },
  { nivel: 2,  nome: 'Broto',       emoji: '🌿', min: 101,  max: 250   },
  { nivel: 3,  nome: 'Raiz',        emoji: '🌾', min: 251,  max: 500   },
  { nivel: 4,  nome: 'Caule',       emoji: '🪴', min: 501,  max: 900   },
  { nivel: 5,  nome: 'Folha',       emoji: '🍃', min: 901,  max: 1400  },
  { nivel: 6,  nome: 'Galho',       emoji: '🌲', min: 1401, max: 2000  },
  { nivel: 7,  nome: 'Copa',        emoji: '🌳', min: 2001, max: 3000  },
  { nivel: 8,  nome: 'Floresta',    emoji: '🌴', min: 3001, max: 5000  },
  { nivel: 9,  nome: 'Sequoia',     emoji: '🎋', min: 5001, max: 8000  },
  { nivel: 10, nome: 'Flora Lenda', emoji: '✨', min: 8001, max: Infinity },
];

// ─── Tabela de pontos por evento ──────────────────────────────────────────────
export const EVENTOS_PONTOS = {
  // Ganhos
  compromisso_no_horario:  +10,
  compromisso_feito:       +10, // alias
  compromisso_reagendado:  +7,
  tarefa_flexivel:         +5,
  compromisso_parcial:     +5,  // alias
  lembrete_resolvido:      +3,
  dia_ativo:               +2,
  semana_100pct:           +50,
  semana_completa:         +50, // alias
  semana_80pct:            +20,
  novo_habito:             +30,
  meta_semanal:            +15,
  pergunta_profunda:       +5,
  // Perdas
  compromisso_perdido:     -5,
  tarefa_ignorada:         -3,
  semana_ruim:             -10,
};

// ─── Catálogo completo de badges ──────────────────────────────────────────────
export const TODOS_BADGES = [
  // ── Primeiros passos ──
  {
    id: 'onboarding_feito',
    emoji: '🌱', nome: 'Primeira Raiz',
    desc: 'Completou o onboarding e entrou no Fluxo',
    secreto: false, categoria: 'inicio',
  },
  {
    id: 'primeira_conversa',
    emoji: '💬', nome: 'Primeira Conversa',
    desc: 'Mandou a primeira mensagem pra Flora',
    secreto: false, categoria: 'inicio',
  },
  {
    id: 'semana_montada',
    emoji: '📅', nome: 'Semana Montada',
    desc: 'Criou a primeira rotina semanal completa',
    secreto: false, categoria: 'inicio',
  },
  {
    id: 'primeira_vitoria',
    emoji: '✅', nome: 'Primeira Vitória',
    desc: 'Concluiu o primeiro compromisso',
    secreto: false, categoria: 'inicio',
  },

  // ── Consistência (streak) ──
  {
    id: 'semana_streak',
    emoji: '🔥', nome: 'Semana Perfeita',
    desc: '7 dias consecutivos usando o app',
    secreto: false, categoria: 'consistencia',
  },
  {
    id: 'quinzena_forte',
    emoji: '⚡', nome: 'Quinzena Forte',
    desc: '15 dias de streak',
    secreto: false, categoria: 'consistencia',
  },
  {
    id: 'mes_streak',
    emoji: '🏆', nome: 'Mês Imparável',
    desc: '30 dias de streak',
    secreto: false, categoria: 'consistencia',
  },
  {
    id: 'centenaria',
    emoji: '👑', nome: 'Flora Centenária',
    desc: '100 dias de streak',
    secreto: false, categoria: 'consistencia',
  },
  {
    id: 'inabalavel',
    emoji: '💎', nome: 'Inabalável',
    desc: '365 dias de streak',
    secreto: false, categoria: 'consistencia',
  },

  // ── Rotina ──
  {
    id: 'atleta_nascente',
    emoji: '💪', nome: 'Atleta Nascente',
    desc: 'Academia concluída 10 vezes',
    secreto: false, categoria: 'rotina',
  },
  {
    id: 'guerreiro',
    emoji: '🥊', nome: 'Guerreiro',
    desc: 'Luta / boxe concluída 10 vezes',
    secreto: false, categoria: 'rotina',
  },
  {
    id: 'estudioso',
    emoji: '📚', nome: 'Estudioso',
    desc: 'Sessão de estudo concluída 10 vezes',
    secreto: false, categoria: 'rotina',
  },
  {
    id: 'estilo_de_vida',
    emoji: '🛹', nome: 'Estilo de Vida',
    desc: 'Esporte alternativo (skate, surf…) 10 vezes',
    secreto: false, categoria: 'rotina',
  },
  {
    id: 'madrugador',
    emoji: '🌅', nome: 'Madrugador',
    desc: 'Acordou no horário planejado 5 vezes seguidas',
    secreto: false, categoria: 'rotina',
  },

  // ── Semanas ──
  {
    id: 'semana_100',
    emoji: '🌟', nome: 'Semana 100%',
    desc: 'Fechou uma semana inteira 100%',
    secreto: false, categoria: 'semanas',
  },
  {
    id: 'tres_semanas',
    emoji: '🔄', nome: 'Três Semanas',
    desc: '3 semanas consecutivas com 80%+',
    secreto: false, categoria: 'semanas',
  },
  {
    id: 'mes_solido',
    emoji: '🌊', nome: 'Mês Sólido',
    desc: '4 semanas consecutivas com 70%+',
    secreto: false, categoria: 'semanas',
  },

  // ── Metas ──
  {
    id: 'foco_total',
    emoji: '🎯', nome: 'Foco Total',
    desc: 'Meta semanal atingida 3 semanas seguidas',
    secreto: false, categoria: 'metas',
  },
  {
    id: 'consciencia',
    emoji: '💰', nome: 'Consciência',
    desc: 'Adicionou meta financeira e acompanhou por 1 mês',
    secreto: false, categoria: 'metas',
  },
  {
    id: 'autoconhecimento',
    emoji: '🧠', nome: 'Autoconhecimento',
    desc: 'Respondeu 10 perguntas profundas da Flora',
    secreto: false, categoria: 'metas',
  },

  // ── Especiais (secretas) ──
  {
    id: 'coruja',
    emoji: '🌙', nome: 'Coruja',
    desc: 'Completou tarefa depois da meia-noite 3 vezes',
    secreto: true, categoria: 'especiais',
  },
  {
    id: 'pontualidade',
    emoji: '⏰', nome: 'Pontualidade',
    desc: '20 compromissos concluídos no horário exato',
    secreto: true, categoria: 'especiais',
  },
  {
    id: 'malabares',
    emoji: '🎪', nome: 'Malabares',
    desc: '5+ compromissos num dia, todos cumpridos',
    secreto: true, categoria: 'especiais',
  },
  {
    id: 'vulneravel',
    emoji: '❤️', nome: 'Vulnerável',
    desc: 'Compartilhou um medo com a Flora',
    secreto: true, categoria: 'especiais',
  },

  // ── Níveis de pontos ──
  {
    id: 'primeiro_nivel',
    emoji: '⭐', nome: 'Primeiro Nível',
    desc: 'Acumulou 100 pontos',
    secreto: false, categoria: 'nivel',
  },
  {
    id: 'dedicado',
    emoji: '🌿', nome: 'Dedicado',
    desc: 'Acumulou 500 pontos',
    secreto: false, categoria: 'nivel',
  },
];

export const BADGES_MAP = Object.fromEntries(TODOS_BADGES.map(b => [b.id, b]));

// ─── Categorias de badge (para o grid de conquistas) ─────────────────────────
export const CATEGORIAS_BADGE = [
  { id: 'inicio',       label: 'Primeiros passos' },
  { id: 'consistencia', label: 'Consistência'      },
  { id: 'rotina',       label: 'Rotina'            },
  { id: 'semanas',      label: 'Semanas'           },
  { id: 'metas',        label: 'Metas'             },
  { id: 'especiais',    label: 'Especiais 🔒'      },
  { id: 'nivel',        label: 'Pontos'            },
];

// ─── Mensagens personalizadas por nível (para Flora falar no chat) ────────────
export const MENSAGENS_NIVEL = {
  2:  (nome) => `Você passou pro Broto${nome ? `, ${nome}` : ''}! 🌿 Tá crescendo. Cada ação que você tomou até aqui foi uma escolha — e elas tão fazendo diferença. Vamos em frente.`,
  3:  (nome) => `Você chegou na Raiz${nome ? `, ${nome}` : ''}! 🌾 Isso significa que você tá construindo algo sólido. As bases tão firmes. Agora a gente vai crescer juntos.`,
  4:  (nome) => `Caule${nome ? `, ${nome}` : ''}! 🪴 Você tá de pé, firme. Quantas pessoas desistem aqui? Você não. Isso é o que importa.`,
  5:  (nome) => `Folha${nome ? `, ${nome}` : ''}! 🍃 Agora você tá respirando. Você criou uma rotina que oxigena sua semana. Isso é mais raro do que parece.`,
  6:  (nome) => `Galho${nome ? `, ${nome}` : ''}! 🌲 Tô vendo você se expandir. Não é só tarefa cumprida — é quem você tá virando no processo.`,
  7:  (nome) => `Copa${nome ? `, ${nome}` : ''}! 🌳 Você chegou longe. De verdade. A vista daqui é diferente. Continue.`,
  8:  (nome) => `Floresta${nome ? `, ${nome}` : ''}! 🌴 Você não é mais uma planta — você é um ecossistema inteiro. Impressionante.`,
  9:  (nome) => `Sequoia${nome ? `, ${nome}` : ''}! 🎋 Centenário. Você construiu algo que resiste. Pouquíssimas pessoas chegam aqui. Sinta isso.`,
  10: (nome) => `FLORA LENDA${nome ? `, ${nome}` : ''}! ✨ Não existe mais o que eu possa te ensinar sobre consistência. Você me ensinou.`,
};

// ─── Funções de cálculo ───────────────────────────────────────────────────────

/** Retorna o objeto de nível para uma quantidade de pontos */
export function getNivel(pontos) {
  const p = Math.max(0, pontos || 0);
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (p >= NIVEIS[i].min) return NIVEIS[i];
  }
  return NIVEIS[0];
}

/** Retorna o próximo nível (null se já no máximo) */
export function getProximoNivel(pontos) {
  const atual = getNivel(pontos);
  return NIVEIS.find(n => n.nivel === atual.nivel + 1) || null;
}

/** Retorna progresso percentual (0–100) para o próximo nível */
export function getProgressoNivel(pontos) {
  const p = Math.max(0, pontos || 0);
  const atual = getNivel(p);
  const proximo = getProximoNivel(p);
  if (!proximo) return 100;
  const range = proximo.min - atual.min;
  const avanco = p - atual.min;
  return Math.min(100, Math.max(0, Math.round((avanco / range) * 100)));
}

/**
 * Processa um evento de gamificação no client side.
 * Retorna { memoriaAtualizada, delta, levelUp, novasBadges }
 */
export function processarEventoGamificacao(memoria, evento, extra = {}) {
  if (!memoria) return { memoriaAtualizada: memoria, delta: 0, levelUp: null, novasBadges: [] };

  const hoje = new Date().toISOString().split('T')[0];
  const gam = JSON.parse(JSON.stringify(memoria.gamificacao || {
    pontos: 0, nivel: 1, streak: 0, ultimaAtividade: null,
    badges: [], historicoPontos: [], contadores: {}, recompensas: { pontosAcumulados: 0, resgatados: [], disponiveis: [] },
  }));

  const delta = EVENTOS_PONTOS[evento] ?? 0;
  const nivelAnterior = getNivel(gam.pontos);

  // Atualiza pontos
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
      gam.streak = (ultima === ontem.toISOString().split('T')[0])
        ? (gam.streak || 0) + 1
        : 1;
    }
    gam.ultimaAtividade = hoje;
  }

  // Atualiza contadores extras
  const cont = gam.contadores || {};
  if (extra.tipo === 'academia')       cont.academia       = (cont.academia       || 0) + 1;
  if (extra.tipo === 'luta')           cont.luta           = (cont.luta           || 0) + 1;
  if (extra.tipo === 'estudo')         cont.estudo         = (cont.estudo         || 0) + 1;
  if (extra.tipo === 'skate')          cont.skate          = (cont.skate          || 0) + 1;
  if (extra.meianoite)                 cont.tarefasMeiaNoite = (cont.tarefasMeiaNoite || 0) + 1;
  if (extra.noPrazo)                   cont.compromissosNoPrazo = (cont.compromissosNoPrazo || 0) + 1;
  if (evento === 'pergunta_profunda')  cont.perguntasProfundas  = (cont.perguntasProfundas  || 0) + 1;
  gam.contadores = cont;

  // Histórico
  gam.historicoPontos = [
    ...(gam.historicoPontos || []).slice(-99),
    { data: hoje, evento, delta, pontos: gam.pontos, descricao: extra.descricao || '' },
  ];

  // ── Verificação de badges ────────────────────────────────────────────────
  const badgesAtuais = new Set(gam.badges || []);
  const novasBadges = [];

  const checar = (id, condicao) => {
    if (condicao && !badgesAtuais.has(id)) {
      badgesAtuais.add(id);
      novasBadges.push(id);
    }
  };

  // Primeiros passos
  checar('primeira_vitoria',   extra.primeiroCompromisso);
  checar('semana_montada',     extra.primeiraSemanaMontada);
  checar('primeira_conversa',  extra.primeiraConversa);
  checar('onboarding_feito',   extra.onboardingFeito);

  // Consistência
  checar('semana_streak',      (gam.streak || 0) >= 7);
  checar('quinzena_forte',     (gam.streak || 0) >= 15);
  checar('mes_streak',         (gam.streak || 0) >= 30);
  checar('centenaria',         (gam.streak || 0) >= 100);
  checar('inabalavel',         (gam.streak || 0) >= 365);

  // Rotina
  checar('atleta_nascente',    (cont.academia || 0) >= 10);
  checar('guerreiro',          (cont.luta     || 0) >= 10);
  checar('estudioso',          (cont.estudo   || 0) >= 10);
  checar('estilo_de_vida',     (cont.skate    || 0) >= 10);

  // Especiais
  checar('coruja',             (cont.tarefasMeiaNoite     || 0) >= 3);
  checar('pontualidade',       (cont.compromissosNoPrazo  || 0) >= 20);

  // Metas
  checar('autoconhecimento',   (cont.perguntasProfundas   || 0) >= 10);

  // Pontos
  checar('primeiro_nivel',     gam.pontos >= 100);
  checar('dedicado',           gam.pontos >= 500);

  // Semanas
  checar('semana_100',         extra.semana100);

  gam.badges = [...badgesAtuais];

  // ── Level up? ─────────────────────────────────────────────────────────────
  const nivelNovo = getNivel(gam.pontos);
  const levelUp = nivelNovo.nivel > nivelAnterior.nivel ? nivelNovo : null;

  // Recompensas (estrutura futura)
  if (!gam.recompensas) {
    gam.recompensas = { pontosAcumulados: 0, resgatados: [], disponiveis: [] };
    // FUTURO: Sistema de resgate de recompensas reais
    // Pontos Flora poderão ser trocados por créditos, descontos ou
    // acesso antecipado a features. Conectar com Stripe ou parceiros.
  }

  const memoriaAtualizada = { ...memoria, gamificacao: gam };
  return { memoriaAtualizada, delta, levelUp, novasBadges };
}

// ─── Gera ranking com usuários fictícios + usuário real ───────────────────────
export function gerarRanking(userPontos = 0, userName = 'Você', userStreak = 0) {
  const CONCORRENTES = [
    { nome: 'Lucas Ferreira',   av: 'LF' },
    { nome: 'Ana Beatriz',      av: 'AB' },
    { nome: 'Rafael Costa',     av: 'RC' },
    { nome: 'Juliana Mota',     av: 'JM' },
    { nome: 'Gabriel Souza',    av: 'GS' },
    { nome: 'Mariana Lima',     av: 'ML' },
    { nome: 'Pedro Alves',      av: 'PA' },
    { nome: 'Camila Ramos',     av: 'CR' },
    { nome: 'Bruno Oliveira',   av: 'BO' },
    { nome: 'Fernanda Cruz',    av: 'FC' },
    { nome: 'Diego Nunes',      av: 'DN' },
    { nome: 'Priya Santos',     av: 'PS' },
  ];

  const base = Math.max(50, userPontos);

  const usuarios = CONCORRENTES.map((c, i) => {
    // Variação determinística mas verossímil em volta do usuário
    const spread = Math.round(base * 0.8);
    const offset = ((i * 137 + 23) % (spread * 2)) - spread;
    const pts = Math.max(5, base + offset + (i < 3 ? Math.round(base * 0.25) : 0));
    const nv = getNivel(pts);
    const sk = Math.max(0, Math.round(pts / 18) + ((i * 5) % 7) - 2);
    return { id: `fake-${i}`, nome: c.nome, av: c.av, pontos: pts, nivel: nv.nivel, nomeNivel: nv.nome, emoji: nv.emoji, streak: sk, isUser: false };
  });

  const nvUser = getNivel(userPontos);
  usuarios.push({
    id: 'me',
    nome: userName,
    av: (userName || 'EU').slice(0, 2).toUpperCase(),
    pontos: userPontos,
    nivel: nvUser.nivel,
    nomeNivel: nvUser.nome,
    emoji: nvUser.emoji,
    streak: userStreak,
    isUser: true,
  });

  return usuarios
    .sort((a, b) => b.pontos - a.pontos)
    .map((u, i) => ({ ...u, posicao: i + 1 }));
}

// ─── Formata delta de pontos (+10, -5 etc) ────────────────────────────────────
export function formatarDelta(delta) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

// ─── Emoji/label do evento para o histórico ───────────────────────────────────
export function descricaoEvento(evento, descricao) {
  if (descricao) return descricao;
  const map = {
    compromisso_no_horario:  'Compromisso no horário',
    compromisso_feito:       'Compromisso concluído',
    compromisso_reagendado:  'Compromisso reagendado',
    tarefa_flexivel:         'Tarefa concluída',
    compromisso_parcial:     'Compromisso parcial',
    lembrete_resolvido:      'Lembrete resolvido',
    dia_ativo:               'Dia ativo no app',
    semana_100pct:           'Semana 100%! 🎉',
    semana_completa:         'Semana completa 🎉',
    semana_80pct:            'Semana 80%+',
    novo_habito:             'Novo hábito cumprido',
    meta_semanal:            'Meta semanal atingida',
    pergunta_profunda:       'Pergunta da Flora respondida',
    compromisso_perdido:     'Compromisso não feito',
    tarefa_ignorada:         'Tarefa ignorada',
    semana_ruim:             'Semana abaixo de 40%',
  };
  return map[evento] || evento;
}

export function emojiEvento(delta) {
  if (delta > 20) return '🏆';
  if (delta > 0)  return '✅';
  if (delta < 0)  return '❌';
  return '📌';
}
