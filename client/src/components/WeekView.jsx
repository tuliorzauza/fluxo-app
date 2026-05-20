import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
  Plus, Edit2, Trash2, Check, X, Repeat,
} from 'lucide-react';
import { CATEGORIAS, getCategoria } from '../utils/categorias';
import {
  DIAS_LABEL, MESES_LABEL,
  calcSemana, ocorrenciasNaSemana, mesmaData, isHoje, toYMD,
} from '../utils/calendarUtils';

// ─────────────────────────────────────────────────────────────────────────────
export default function WeekView({
  compromissos = [],
  tarefas = [],
  onEditarItem,
  onDeletarItem,
  onAdicionarCompromisso,
  onToggleTarefa,
}) {
  const [offset,     setOffset]     = useState(0);
  const [diaSel,     setDiaSel]     = useState(null);
  const [modoAdd,    setModoAdd]    = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formNovo,   setFormNovo]   = useState({ titulo: '', hora: '', categoria: 'compromisso' });
  const [formEditar, setFormEditar] = useState({});

  const semana = useMemo(() => calcSemana(offset), [offset]);

  // ── Mapa de eventos por dia (com expansão de recorrência) ─────────────────
  const eventosPorDia = useMemo(() => {
    const mapa = {};
    semana.forEach(d => { mapa[d.toDateString()] = []; });

    compromissos.forEach(c => {
      ocorrenciasNaSemana(c, semana).forEach(d => {
        mapa[d.toDateString()]?.push({ ...c, _tipo: 'compromisso' });
      });
    });

    tarefas.forEach(t => {
      if (t.concluida) return;
      // Lembretes (sem prazo nem horário) não aparecem no calendário
      if (getCategoria(t).id === 'lembrete') return;
      ocorrenciasNaSemana(t, semana).forEach(d => {
        mapa[d.toDateString()]?.push({ ...t, _tipo: 'tarefa' });
      });
    });

    return mapa;
  }, [semana, compromissos, tarefas]);

  // ── Eventos do dia selecionado, ordenados por hora ────────────────────────
  const eventosDia = useMemo(() => {
    if (!diaSel) return [];
    return [...(eventosPorDia[diaSel.toDateString()] || [])].sort((a, b) => {
      if (!a.hora && !b.hora) return 0;
      if (!a.hora) return 1;
      if (!b.hora) return -1;
      return a.hora.localeCompare(b.hora);
    });
  }, [diaSel, eventosPorDia]);

  const semanaLabel = () => {
    const ini = semana[0], fim = semana[6];
    return ini.getMonth() === fim.getMonth()
      ? `${ini.getDate()}–${fim.getDate()} de ${MESES_LABEL[ini.getMonth()]}`
      : `${ini.getDate()} ${MESES_LABEL[ini.getMonth()]} – ${fim.getDate()} ${MESES_LABEL[fim.getMonth()]}`;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const abrirAdd = () => {
    setModoAdd(true);
    setFormNovo({ titulo: '', hora: '', categoria: 'compromisso' });
  };

  const salvarNovo = () => {
    if (!formNovo.titulo.trim() || !diaSel) return;
    onAdicionarCompromisso?.({
      id: `comp-${Date.now()}`,
      titulo: formNovo.titulo.trim(),
      data: toYMD(diaSel),
      hora: formNovo.hora || null,
      categoria: formNovo.categoria,
      recorrencia: null,
    });
    setModoAdd(false);
  };

  const iniciarEdicao = (ev) => {
    setEditandoId(ev.id);
    setFormEditar({ titulo: ev.titulo, hora: ev.hora || '', categoria: ev.categoria || 'compromisso' });
  };

  const salvarEdicao = (ev) => {
    onEditarItem?.(ev.id, formEditar, ev._tipo);
    setEditandoId(null);
  };

  const toggleDia = (dia) => {
    setDiaSel(prev => prev?.toDateString() === dia.toDateString() ? null : dia);
    setModoAdd(false);
    setEditandoId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="card">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Calendar size={15} className="text-amber-500" />
          </div>
          <div>
            <h2 className="font-titulo font-semibold text-white text-base leading-none">Semana</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">{semanaLabel()}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {offset !== 0 && (
            <button onClick={() => { setOffset(0); setDiaSel(null); }}
              className="text-[10px] px-2 py-1 rounded-md text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors font-semibold font-titulo">
              hoje
            </button>
          )}
          <button onClick={() => { setOffset(o => o - 1); setDiaSel(null); }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => { setOffset(o => o + 1); setDiaSel(null); }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Grid semanal ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1">
        {semana.map((dia, i) => {
          const key     = dia.toDateString();
          const hojeKey = isHoje(dia);
          const isSel   = diaSel?.toDateString() === key;
          const eventos = eventosPorDia[key] || [];

          return (
            <button
              key={i}
              onClick={() => toggleDia(dia)}
              className={`rounded-xl p-2 min-h-[72px] border text-left transition-all duration-150 ${
                isSel
                  ? 'border-amber-500/60 bg-amber-500/10'
                  : hojeKey
                  ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                  : 'border-[#1e1e28] bg-[#0f0f13] hover:border-zinc-700'
              }`}
            >
              <div className="text-center mb-1.5">
                <p className={`text-[10px] font-medium uppercase tracking-wide ${hojeKey ? 'text-amber-500' : 'text-zinc-600'}`}>
                  {DIAS_LABEL[i]}
                </p>
                <p className={`text-sm font-semibold font-titulo ${hojeKey ? 'text-amber-400' : isSel ? 'text-amber-300' : 'text-zinc-400'}`}>
                  {dia.getDate()}
                </p>
              </div>

              <div className="space-y-0.5">
                {eventos.slice(0, 2).map((ev, j) => {
                  const cat = getCategoria(ev);
                  return (
                    <div key={j}
                      className={`text-[8px] leading-tight px-1 py-0.5 rounded border truncate ${cat.corBg} ${cat.corBorda} ${cat.corTexto}`}
                      title={ev.titulo}
                    >
                      {ev.hora && <span className="opacity-60">{ev.hora} · </span>}
                      {ev.titulo}
                    </div>
                  );
                })}
                {eventos.length > 2 && (
                  <p className="text-[8px] text-zinc-600 text-center">+{eventos.length - 2}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Painel do dia selecionado ──────────────────────────────────────── */}
      {diaSel && (
        <div className="mt-4 border-t border-white/5 pt-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-titulo font-semibold text-sm text-white">
              {DIAS_LABEL[diaSel.getDay()]}, {String(diaSel.getDate()).padStart(2,'0')}/{String(diaSel.getMonth()+1).padStart(2,'0')}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={abrirAdd}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 px-2 py-1 rounded-lg transition-all">
                <Plus size={11} /> Adicionar
              </button>
              <button onClick={() => setDiaSel(null)}
                className="p-1 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Form — novo compromisso */}
          {modoAdd && (
            <div className="mb-3 p-3 rounded-xl bg-[#1a1a24] border border-white/10 animate-slide-up">
              <p className="text-[11px] text-zinc-400 mb-2 font-titulo font-semibold uppercase tracking-widest">
                Novo compromisso
              </p>
              <input autoFocus placeholder="Título"
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 mb-2 focus:outline-none focus:border-amber-500/40 transition-colors"
                value={formNovo.titulo}
                onChange={e => setFormNovo(f => ({ ...f, titulo: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && salvarNovo()}
              />
              <div className="flex gap-2 mb-2">
                <input type="time"
                  className="flex-1 bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/40 transition-colors"
                  value={formNovo.hora}
                  onChange={e => setFormNovo(f => ({ ...f, hora: e.target.value }))}
                />
                <select
                  className="flex-1 bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/40 transition-colors"
                  value={formNovo.categoria}
                  onChange={e => setFormNovo(f => ({ ...f, categoria: e.target.value }))}
                >
                  {Object.values(CATEGORIAS).filter(c => c.id !== 'lembrete').map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={salvarNovo}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors">
                  Salvar
                </button>
                <button onClick={() => setModoAdd(false)}
                  className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-xs transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {eventosDia.length === 0 && !modoAdd && (
            <p className="text-xs text-zinc-600 py-2 italic">
              Nenhum item neste dia — clique em "Adicionar" para criar
            </p>
          )}

          <div className="space-y-2">
            {eventosDia.map((ev, i) => {
              const cat = getCategoria(ev);
              const isEdit = editandoId === ev.id;
              const recorrente = !!ev.recorrencia;

              if (isEdit) {
                return (
                  <div key={i} className="p-3 rounded-xl bg-[#1a1a24] border border-white/10 animate-slide-up">
                    <input autoFocus
                      className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-amber-500/40 transition-colors"
                      value={formEditar.titulo || ''}
                      onChange={e => setFormEditar(f => ({ ...f, titulo: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && salvarEdicao(ev)}
                    />
                    {ev._tipo === 'compromisso' && (
                      <input type="time"
                        className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 mb-2 focus:outline-none focus:border-amber-500/40 transition-colors"
                        value={formEditar.hora || ''}
                        onChange={e => setFormEditar(f => ({ ...f, hora: e.target.value }))}
                      />
                    )}
                    <select
                      className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 mb-2 focus:outline-none focus:border-amber-500/40 transition-colors"
                      value={formEditar.categoria || 'compromisso'}
                      onChange={e => setFormEditar(f => ({ ...f, categoria: e.target.value }))}
                    >
                      {Object.values(CATEGORIAS).map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => salvarEdicao(ev)}
                        className="flex-1 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs transition-colors">
                        Salvar
                      </button>
                      <button onClick={() => setEditandoId(null)}
                        className="flex-1 py-1 rounded-lg bg-white/5 text-zinc-500 text-xs transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={i}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border group transition-all ${cat.corBg} ${cat.corBorda} ${cat.corTexto}`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.dot}`} />
                  <div className="flex-1 min-w-0">
                    {ev.hora && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <Clock size={9} className="opacity-50 flex-shrink-0" />
                        <span className="text-[10px] opacity-60 font-mono">{ev.hora}</span>
                        {recorrente && <Repeat size={9} className="opacity-50 ml-0.5" title="Recorrente" />}
                      </div>
                    )}
                    <p className="text-xs font-medium truncate">{ev.titulo}</p>
                    <p className="text-[9px] opacity-60 mt-0.5">
                      {cat.icon} {cat.label}
                      {ev._tipo === 'tarefa' && ev.prioridade && ` · prioridade ${ev.prioridade}`}
                    </p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {ev._tipo === 'tarefa' && onToggleTarefa && (
                      <button onClick={() => onToggleTarefa(ev.id)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors" title="Concluir">
                        <Check size={12} />
                      </button>
                    )}
                    <button onClick={() => iniciarEdicao(ev)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors" title="Editar">
                      <Edit2 size={11} />
                    </button>
                    <button onClick={() => onDeletarItem?.(ev.id, ev._tipo)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="Apagar">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legenda de categorias ─────────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-x-4 gap-y-1.5 flex-wrap">
        {Object.values(CATEGORIAS).map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${c.dot}`} />
            <span className="text-[11px] text-zinc-500">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
