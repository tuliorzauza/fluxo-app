import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, Calendar, ChevronDown } from 'lucide-react';
import { getCategoria } from '../utils/categorias';
import { getCompromissosDoDia, hojeYMD, amanhaYMD } from '../utils/planoUtils';

const PRIORIDADE_CONFIG = {
  alta:  { label: 'Alta',  classe: 'tag-alta',  ordem: 0 },
  media: { label: 'Média', classe: 'tag-media', ordem: 1 },
  baixa: { label: 'Baixa', classe: 'tag-baixa', ordem: 2 },
};

// ── Helpers de data ───────────────────────────────────────────────────────────
// hojeYMD() e amanhaYMD() importadas de planoUtils — fonte única de verdade com fuso BRT.

function labelData(prazo, hora) {
  if (!prazo) return null;
  const hoje = hojeYMD();
  const amanha = amanhaYMD();
  const horaStr = hora ? ` às ${hora.replace(':', 'h')}` : '';
  if (prazo === hoje)   return { texto: `Hoje${horaStr}`,   cor: hora ? 'text-amber-400' : 'text-amber-400' };
  if (prazo === amanha) return { texto: `Amanhã${horaStr}`, cor: 'text-blue-400' };
  try {
    const d = new Date(prazo + 'T12:00:00');
    const [, mes, dia] = prazo.split('-');
    const diaSem = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()];
    return { texto: `${diaSem}, ${dia}/${mes}${horaStr}`, cor: 'text-zinc-500' };
  } catch { return { texto: prazo + horaStr, cor: 'text-zinc-500' }; }
}

function grupoData(prazo) {
  if (!prazo) return 'sem_data';
  const hoje   = hojeYMD();
  const amanha = amanhaYMD();
  if (prazo < hoje)     return 'atrasado';
  if (prazo === hoje)   return 'hoje';
  if (prazo === amanha) return 'amanha';
  return 'futuro';
}

function prioOrdem(p) { return PRIORIDADE_CONFIG[p]?.ordem ?? 3; }

// ── Próxima ocorrência de item recorrente ─────────────────────────────────────
function proximaOcorrencia(c) {
  // BUG-031: usar fuso Brasília para evitar off-by-one após 21h BRT
  const hojeStr = hojeYMD();
  if (!c.recorrencia) return c.data;
  const { tipo, diasSemana, excecoes = [] } = c.recorrencia;
  const hojeDate = new Date(hojeStr + 'T12:00:00');
  if (tipo === 'diaria') {
    for (let i = 0; i <= 1; i++) {
      const d = new Date(hojeDate); d.setDate(hojeDate.getDate() + i);
      const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!excecoes.includes(s)) return s;
    }
  }
  if (tipo === 'semanal' && diasSemana?.length) {
    for (let i = 0; i <= 7; i++) {
      const d = new Date(hojeDate); d.setDate(hojeDate.getDate() + i);
      const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (diasSemana.includes(d.getDay()) && !excecoes.includes(s)) return s;
    }
  }
  return c.data || hojeStr;
}

// ── Normaliza compromisso para o mesmo formato de tarefa ─────────────────────
// prazoOverride: quando o bucket já sabe a data (hoje/amanhã), evita chamar proximaOcorrencia
function normalizarCompromisso(c, prazoOverride = null) {
  const prazo = prazoOverride !== null ? prazoOverride : proximaOcorrencia(c);
  let blocoSugerido = null;
  if (c.hora) {
    if (c.duracao) {
      const [h, m] = c.hora.split(':').map(Number);
      const fimMin = h * 60 + m + c.duracao;
      const fimH = String(Math.floor(fimMin / 60)).padStart(2, '0');
      const fimM = String(fimMin % 60).padStart(2, '0');
      blocoSugerido = `${c.hora.replace(':', 'h')}-${fimH}h${fimM}`;
    } else {
      blocoSugerido = `às ${c.hora.replace(':', 'h')}`;
    }
  }
  return {
    ...c,
    // _viewId: namespace separado para dedup/key — id original fica intacto para onToggle
    _viewId: 'comp-view-' + c.id,
    prazo,
    hora: c.hora || null,
    prioridade: c.categoria === 'fixo' ? 'alta' : c.categoria === 'compromisso' ? 'alta' : 'media',
    blocoSugerido,
    concluida: c.concluida || false,
    _isCompromisso: true,
  };
}

// ── Ordenação inteligente ─────────────────────────────────────────────────────
function extrairHoraMinutos(t) {
  if (t.hora) {
    const m = t.hora.match(/^(\d{1,2}):(\d{2})/);
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  }
  if (t.blocoSugerido) {
    const m = t.blocoSugerido.match(/(\d{1,2})[h:](\d{0,2})/i);
    if (m) return parseInt(m[1]) * 60 + (parseInt(m[2]) || 0);
  }
  return null;
}

const PALAVRAS_RISCO_SAUDE = ['infeccionar', 'urgente', 'emergência', 'emergencia', 'hospital', 'médico', 'medico', 'vence hoje', 'vence amanhã'];
const PALAVRAS_COMPROMISSO = ['combinei', 'ligação com', 'ligacao com', 'reunião com', 'reuniao com', 'entregar para', 'entregar pra'];

function smartOrdem(t) {
  const hora = extrairHoraMinutos(t);
  if (hora !== null) return hora; // timed: cronológico (0-1439)
  const titulo = (t.titulo || '').toLowerCase();
  if (PALAVRAS_RISCO_SAUDE.some(k => titulo.includes(k))) return 2000;
  if (PALAVRAS_COMPROMISSO.some(k => titulo.includes(k)))  return 3000;
  return 10000 + prioOrdem(t.prioridade) * 1000;
}

// ── Componente do item ────────────────────────────────────────────────────────
function TarefaItem({ tarefa, expanded, onToggle, onExpand }) {
  const config = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG.media;
  const cat = getCategoria(tarefa);
  const temDetalhes = tarefa.prazo || tarefa.blocoSugerido;
  const dataLabel = labelData(tarefa.prazo, tarefa.hora);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        tarefa.concluida
          ? 'border-white/[0.04] bg-[#0f0f13] opacity-50'
          : expanded
          ? 'border-amber-500/25 bg-[#0f0f13]'
          : 'border-white/[0.05] bg-[#0f0f13] hover:border-white/[0.09] hover:bg-[#131318]'
      }`}
      style={expanded ? { boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.1)' } : {}}
    >
      {/* Linha principal */}
      <div
        className="flex items-center gap-3 px-3.5 py-3 cursor-pointer select-none"
        onClick={() => temDetalhes && !tarefa.concluida && onExpand(tarefa.id)}
      >
        {/* Checkbox */}
        <button
          className="flex-shrink-0 transition-transform duration-100 active:scale-90"
          onClick={(e) => { e.stopPropagation(); onToggle(tarefa.id); }}
        >
          {tarefa.concluida
            ? <CheckCircle2 size={18} className="text-amber-500" />
            : <Circle size={18} className="text-zinc-600 hover:text-zinc-400 transition-colors" />
          }
        </button>

        {/* Indicador de categoria */}
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.dot}`} title={cat.label} />

        {/* Título + data inline */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${
            tarefa.concluida ? 'line-through text-zinc-600' : 'text-white'
          }`}>
            {tarefa.titulo}
          </p>
          {dataLabel && !tarefa.concluida && (
            <p className={`text-[10px] mt-0.5 ${dataLabel.cor}`}>
              📅 {dataLabel.texto}
            </p>
          )}
        </div>

        {/* Tag prioridade */}
        <span className={config.classe}>{config.label}</span>

        {/* Chevron de expansão */}
        {temDetalhes && !tarefa.concluida && (
          <ChevronDown
            size={14}
            className="text-zinc-600 flex-shrink-0 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        )}
      </div>

      {/* Detalhes expansíveis */}
      <div
        className={`px-3.5 overflow-hidden transition-all duration-250 ease-in-out ${
          expanded ? 'task-detail-open pb-3.5' : 'task-detail-enter'
        }`}
      >
        <div className="border-t border-white/[0.05] pt-3 flex flex-wrap gap-x-4 gap-y-2">
          {tarefa.prazo && (
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-amber-500/70" />
              <span className="text-xs text-zinc-400">
                <span className="text-zinc-600 mr-1">
                  {tarefa._isCompromisso ? 'Data:' : 'Prazo:'}
                </span>
                {tarefa.prazo}{tarefa.hora ? ` às ${tarefa.hora.replace(':', 'h')}` : ''}
              </span>
            </div>
          )}
          {tarefa.blocoSugerido && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-amber-500/70" />
              <span className="text-xs text-zinc-400">
                <span className="text-zinc-600 mr-1">
                  {tarefa._isCompromisso ? 'Duração:' : 'Bloco:'}
                </span>
                {tarefa.blocoSugerido}
              </span>
            </div>
          )}
          <button
            onClick={() => onToggle(tarefa.id)}
            className="ml-auto text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
          >
            Marcar como feito →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Separador de grupo ────────────────────────────────────────────────────────
function GrupoLabel({ label }) {
  return (
    <p className="text-[11px] text-zinc-600 uppercase tracking-widest mb-2 mt-4 font-titulo px-1 first:mt-0">
      {label}
    </p>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function TaskList({ tarefas = [], compromissos = [], onToggle, compromissosDoDia = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  // Storage independente de concluídas — fonte de verdade que Flora não toca
  const concluidasExt = (() => {
    try { return JSON.parse(localStorage.getItem('fluxo_tarefas_concluidas') || '{}'); } catch { return {}; }
  })();

  // Filtra tarefas internas da Flora e adiciona _viewId para dedup/key
  const tarefasUsuario = tarefas
    .filter(t => t.tipo !== 'flora')
    .map(t => ({ ...t, _viewId: t.id, concluida: t.concluida || !!concluidasExt[t.id] }));

  const hojeStr = hojeYMD();   // de planoUtils — BRT-safe
  const amanhaStr = amanhaYMD();

  // ── HOJE: usa prop centralizada do Dashboard (getCompromissosDoDia já filtra correto)
  const idsHoje = new Set((compromissosDoDia || []).map(c => c.id));
  const compHoje = (compromissosDoDia || []).map(c => {
    const norm = normalizarCompromisso(c, hojeStr);
    return { ...norm, concluida: norm.concluida || !!concluidasExt[c.id] };
  });

  // ── AMANHÃ: usa getCompromissosDoDia centralizado, sem duplicar lógica na mão
  const compAmanh = getCompromissosDoDia({ compromissos }, amanhaStr)
    .filter(c => !idsHoje.has(c.id))  // dedup: itens diários já estão em HOJE
    .map(c => {
      const norm = normalizarCompromisso(c, amanhaStr);
      return { ...norm, concluida: norm.concluida || !!concluidasExt[c.id] };
    });
  const idsAmanh = new Set(compAmanh.map(c => c.id));

  // ── FUTURO: compromissos além de amanhã (mantém lógica existente via proximaOcorrencia)
  const compFuturo = compromissos.filter(c => {
    if (!c.titulo || idsHoje.has(c.id) || idsAmanh.has(c.id)) return false;
    if (!c.recorrencia) return c.data && c.data > amanhaStr;
    return true;  // recorrente: próxima ocorrência calculada por proximaOcorrencia
  }).map(c => {
    const norm = normalizarCompromisso(c);
    return { ...norm, concluida: norm.concluida || !!concluidasExt[c.id] };
  }).filter(c => c.prazo && c.prazo > amanhaStr);

  // Une os três buckets (dedup final por _viewId como segurança)
  const compromissosNorm = [...compHoje, ...compAmanh, ...compFuturo];

  // Une tarefas + compromissos e deduplica por _viewId — evita duplicatas
  // quando o mesmo item chega pelas duas props ou o array é percorrido duas vezes.
  const todosItens = Array.from(
    new Map(
      [...tarefasUsuario, ...compromissosNorm].map(item => [item._viewId, item])
    ).values()
  );

  const pendentes  = todosItens.filter(t => !t.concluida);
  const concluidas = todosItens.filter(t =>  t.concluida);
  const progresso  = todosItens.length > 0
    ? Math.round((concluidas.length / todosItens.length) * 100) : 0;

  // Agrupa pendentes: atrasado → hoje → amanhã → futuro → sem data
  const GRUPOS_ORDEM = ['atrasado', 'hoje', 'amanha', 'futuro', 'sem_data'];
  const GRUPOS_LABEL = {
    atrasado: '⚠️ Atrasadas',
    hoje:     '📌 Hoje',
    amanha:   '📅 Amanhã',
    futuro:   '🗓 Em breve',
    sem_data: '📋 Sem prazo',
  };

  const grupos = {};
  GRUPOS_ORDEM.forEach(g => { grupos[g] = []; });
  pendentes.forEach(t => {
    const g = grupoData(t.prazo);
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(t);
  });

  // Ordenação inteligente: timed cronológico, untimed por urgência
  Object.keys(grupos).forEach(g => {
    grupos[g].sort((a, b) => smartOrdem(a) - smartOrdem(b));
  });

  const gruposComItens = GRUPOS_ORDEM.filter(g => grupos[g].length > 0);

  // Contagem por tipo para o header
  const totalTarefas = tarefasUsuario.length;
  const totalCompromissos = compromissosNorm.length;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <CheckCircle2 size={15} className="text-amber-500" />
          </div>
          <div>
            <h2 className="font-titulo font-semibold text-white text-base">Painel do Dia</h2>
            {totalCompromissos > 0 && (
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {totalTarefas} tarefa{totalTarefas !== 1 ? 's' : ''} · {totalCompromissos} compromisso{totalCompromissos !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{concluidas.length}/{todosItens.length}</span>
          <div className="w-20 h-1.5 bg-[#1e1e28] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progresso}%`,
                background: progresso === 100
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, #d97706, #f59e0b)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Vazio */}
      {todosItens.length === 0 && (
        <p className="text-sm text-zinc-600 text-center py-6">
          Nenhuma tarefa ainda — conta o que você tem pela frente
        </p>
      )}

      {/* Grupos de pendentes */}
      {gruposComItens.map((grupo) => (
        <div key={grupo}>
          <GrupoLabel label={GRUPOS_LABEL[grupo]} />
          <div className="space-y-2 mb-2">
            {grupos[grupo].map(t => (
              <TarefaItem
                key={t._viewId} tarefa={t}
                expanded={expandedId === t.id}
                onToggle={onToggle}
                onExpand={toggleExpand}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Concluídas (colapsadas no final) */}
      {concluidas.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-zinc-600 uppercase tracking-widest mb-2.5 font-titulo px-1">
            ✅ Concluídas ({concluidas.length})
          </p>
          <div className="space-y-2">
            {concluidas.map(t => (
              <TarefaItem
                key={t._viewId} tarefa={t}
                expanded={expandedId === t.id}
                onToggle={onToggle}
                onExpand={toggleExpand}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
