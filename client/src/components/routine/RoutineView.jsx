/**
 * RoutineView.jsx — Visualização tipo Google Agenda
 *
 * Grid horário (4h–23h) × 7 dias da semana.
 * Cada item ocupa um bloco vertical proporcional à sua duração.
 * Inclui modal completo de adição de compromissos.
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Repeat, X, Edit2, Trash2, Plus } from 'lucide-react';
import { CATEGORIAS, getCategoria } from '../../utils/categorias';
import {
  DIAS_LABEL, MESES_LABEL,
  calcSemana, ocorrenciasNaSemana, isHoje,
  horaParaMinutos, duracaoMinutos,
} from '../../utils/calendarUtils';

const HORA_INI   = 4;
const HORA_FIM   = 24;
const TOTAL_MIN  = (HORA_FIM - HORA_INI) * 60;
const ALTURA_HORA  = 48;
const ALTURA_TOTAL = (HORA_FIM - HORA_INI) * ALTURA_HORA;

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─────────────────────────────────────────────────────────────────────────────
export default function RoutineView({
  compromissos = [],
  tarefas = [],
  onEditarItem,
  onDeletarItem,
  onAdicionarCompromisso,
}) {
  const [offset,     setOffset]     = useState(0);
  const [itemSel,    setItemSel]    = useState(null); // { item, dia }
  const [showAddModal, setShowAddModal] = useState(false);

  const semana = useMemo(() => calcSemana(offset), [offset]);

  // ── Blocos posicionados por dia ──────────────────────────────────────────
  const blocosPorDia = useMemo(() => {
    const mapa = {};
    semana.forEach(d => { mapa[d.toDateString()] = []; });

    const adicionar = (item, tipo) => {
      const ocorrencias = ocorrenciasNaSemana(item, semana);
      ocorrencias.forEach(d => {
        const key = d.toDateString();
        if (!(key in mapa)) return;
        const minutosIni = horaParaMinutos(item.hora);
        if (minutosIni == null) return;
        const dur = duracaoMinutos(item, 60);
        const topo = ((minutosIni - HORA_INI * 60) / 60) * ALTURA_HORA;
        const altura = (dur / 60) * ALTURA_HORA;
        if (topo < 0 || topo > ALTURA_TOTAL) return;
        mapa[key].push({
          item: { ...item, _tipo: tipo },
          topo: Math.max(0, topo),
          altura: Math.max(20, altura),
        });
      });
    };

    compromissos.forEach(c => adicionar(c, 'compromisso'));
    tarefas.forEach(t => {
      if (t.concluida) return;
      if (getCategoria(t).id === 'lembrete') return;
      adicionar(t, 'tarefa');
    });

    return mapa;
  }, [semana, compromissos, tarefas]);

  const semanaLabel = () => {
    const ini = semana[0], fim = semana[6];
    return ini.getMonth() === fim.getMonth()
      ? `${ini.getDate()}–${fim.getDate()} de ${MESES_LABEL[ini.getMonth()]}`
      : `${ini.getDate()} ${MESES_LABEL[ini.getMonth()]} – ${fim.getDate()} ${MESES_LABEL[fim.getMonth()]}`;
  };

  const horas = Array.from({ length: HORA_FIM - HORA_INI }, (_, i) => HORA_INI + i);

  return (
    <div className="px-4 py-4 pb-8">
      {/* ── Header com navegação ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Calendar size={16} className="text-amber-500" />
          </div>
          <div>
            <h2 className="font-titulo font-semibold text-white text-lg leading-none">Sua rotina</h2>
            <p className="text-[11px] text-zinc-500 mt-1">{semanaLabel()}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Botão adicionar novo compromisso */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-titulo transition-colors"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.2)',
              color: '#f59e0b',
            }}
          >
            <Plus size={12} /> Novo
          </button>

          {offset !== 0 && (
            <button onClick={() => setOffset(0)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors font-semibold font-titulo">
              hoje
            </button>
          )}
          <button onClick={() => setOffset(o => o - 1)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setOffset(o => o + 1)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Grade da timeline ────────────────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-white/5 bg-[#13131b] sticky top-0 z-10">
          <div />
          {semana.map((d, i) => {
            const hojeKey = isHoje(d);
            return (
              <div key={i}
                className={`text-center py-2 border-l border-white/5 ${hojeKey ? 'bg-amber-500/5' : ''}`}
              >
                <p className={`text-[10px] uppercase tracking-wide font-medium ${hojeKey ? 'text-amber-500' : 'text-zinc-600'}`}>
                  {DIAS_LABEL[i]}
                </p>
                <p className={`text-sm font-titulo font-semibold mt-0.5 ${hojeKey ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Corpo da grade */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] relative" style={{ height: ALTURA_TOTAL }}>
          {/* Coluna das horas */}
          <div className="relative border-r border-white/5">
            {horas.map((h, i) => (
              <div key={h}
                className="absolute right-2 text-[10px] text-zinc-600 font-mono"
                style={{ top: i * ALTURA_HORA - 5 }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {semana.map((d, i) => {
            const key = d.toDateString();
            const hojeKey = isHoje(d);
            const blocos = blocosPorDia[key] || [];

            return (
              <div key={i}
                className={`relative border-l border-white/5 ${hojeKey ? 'bg-amber-500/[0.02]' : ''}`}
              >
                {horas.map((_, idx) => (
                  <div key={idx}
                    className="absolute left-0 right-0 border-t border-white/[0.03]"
                    style={{ top: idx * ALTURA_HORA }}
                  />
                ))}

                {hojeKey && (() => {
                  const agora = new Date();
                  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
                  const topo = ((minutosAgora - HORA_INI * 60) / 60) * ALTURA_HORA;
                  if (topo < 0 || topo > ALTURA_TOTAL) return null;
                  return (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: topo }}>
                      <div className="h-px bg-amber-500/70" />
                      <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]" />
                    </div>
                  );
                })()}

                {blocos.map((b, j) => {
                  const cat = getCategoria(b.item);
                  const recorrente = !!b.item.recorrencia;
                  return (
                    <button key={j}
                      onClick={() => setItemSel({ item: b.item, dia: d })}
                      className={`absolute left-0.5 right-0.5 rounded-md border px-1.5 py-1 overflow-hidden text-left transition-all hover:brightness-110 hover:scale-[1.02] ${cat.corBg} ${cat.corBorda} ${cat.corTexto}`}
                      style={{ top: b.topo, height: b.altura }}
                      title={b.item.titulo}
                    >
                      <div className="flex items-start gap-0.5 leading-tight">
                        {recorrente && <Repeat size={7} className="opacity-50 flex-shrink-0 mt-0.5" />}
                        <div className="min-w-0 flex-1">
                          {b.item.hora && <p className="text-[8px] opacity-60 font-mono">{b.item.hora}</p>}
                          <p className="text-[9px] font-medium truncate">{b.item.titulo}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legenda ──────────────────────────────────────────────────────── */}
      <div className="mt-4 px-1 flex items-center gap-x-4 gap-y-1.5 flex-wrap">
        {Object.values(CATEGORIAS).filter(c => c.id !== 'lembrete').map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${c.corBg} ${c.corBorda} border`} />
            <span className="text-[11px] text-zinc-500">{c.label}</span>
          </div>
        ))}
      </div>

      {/* ── Modal de detalhes/edição ─────────────────────────────────────── */}
      {itemSel && (
        <ModalItem
          item={itemSel.item}
          dia={itemSel.dia}
          onFechar={() => setItemSel(null)}
          onEditar={(changes) => { onEditarItem?.(itemSel.item.id, changes, itemSel.item._tipo); setItemSel(null); }}
          onApagar={() => { onDeletarItem?.(itemSel.item.id, itemSel.item._tipo); setItemSel(null); }}
        />
      )}

      {/* ── Modal de adicionar novo compromisso ──────────────────────────── */}
      {showAddModal && (
        <ModalAdicionar
          onFechar={() => setShowAddModal(false)}
          onSalvar={(comp) => {
            onAdicionarCompromisso?.(comp);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Modal de detalhes/edição ────────────────────────────────────────────────
function ModalItem({ item, dia, onFechar, onEditar, onApagar }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    titulo:    item.titulo,
    hora:      item.hora || '',
    categoria: item.categoria || 'compromisso',
  });
  const cat = getCategoria(item);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onFechar}>
      <div onClick={e => e.stopPropagation()}
        className="card w-full sm:max-w-sm rounded-b-none sm:rounded-2xl animate-slide-up">

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-titulo">
              {cat.icon} {cat.label}
            </p>
          </div>
          <button onClick={onFechar}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
            <X size={14} />
          </button>
        </div>

        {!editando ? (
          <>
            <h3 className="font-titulo font-bold text-xl text-white mb-1">{item.titulo}</h3>
            <p className="text-sm text-zinc-400 mb-4">
              {DIAS_LABEL[dia.getDay()]}, {String(dia.getDate()).padStart(2,'0')}/{String(dia.getMonth()+1).padStart(2,'0')}
              {item.hora && ` · ${item.hora}`}
            </p>

            {item.recorrencia && (
              <div className="mb-4 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                <Repeat size={12} className="text-zinc-500 flex-shrink-0" />
                <p className="text-[11px] text-zinc-400">{descreverRecorrencia(item.recorrencia)}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setEditando(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors">
                <Edit2 size={12} /> Editar
              </button>
              <button onClick={onApagar}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold transition-colors">
                <Trash2 size={12} /> Apagar
              </button>
            </div>
          </>
        ) : (
          <>
            <input autoFocus
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-amber-500/40"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            />
            <input type="time"
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 mb-2 focus:outline-none focus:border-amber-500/40"
              value={form.hora}
              onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
            />
            <select
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 mb-3 focus:outline-none focus:border-amber-500/40"
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            >
              {Object.values(CATEGORIAS).map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => onEditar(form)}
                className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors">
                Salvar
              </button>
              <button onClick={() => setEditando(false)}
                className="flex-1 py-2 rounded-lg bg-white/5 text-zinc-400 text-xs transition-colors">
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal de adicionar novo compromisso ─────────────────────────────────────
function ModalAdicionar({ onFechar, onSalvar }) {
  const hoje = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    titulo:        '',
    categoria:     'compromisso',
    data:          hoje,
    horaInicio:    '',
    horaFim:       '',
    recorrente:    false,
    tipoRecorrencia: 'semanal',
    diasSemana:    [],
    observacoes:   '',
  });

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  const toggleDia = (idx) => {
    setForm(f => ({
      ...f,
      diasSemana: f.diasSemana.includes(idx)
        ? f.diasSemana.filter(d => d !== idx)
        : [...f.diasSemana, idx].sort((a,b) => a - b),
    }));
  };

  const salvar = () => {
    if (!form.titulo.trim()) return;

    // Calcula duração em minutos
    let duracao = 60;
    if (form.horaInicio && form.horaFim) {
      const [hIni, mIni] = form.horaInicio.split(':').map(Number);
      const [hFim, mFim] = form.horaFim.split(':').map(Number);
      const diff = (hFim * 60 + mFim) - (hIni * 60 + mIni);
      if (diff > 0) duracao = diff;
    }

    // Recorrência
    let recorrencia = null;
    if (form.recorrente) {
      if (form.tipoRecorrencia === 'diaria') {
        recorrencia = { tipo: 'diaria' };
      } else if (form.tipoRecorrencia === 'semanal') {
        // Se não escolheu dias, usa o dia da semana da data selecionada
        const diasEscolhidos = form.diasSemana.length > 0
          ? form.diasSemana
          : [new Date(form.data + 'T12:00:00').getDay()];
        recorrencia = { tipo: 'semanal', diasSemana: diasEscolhidos };
      } else if (form.tipoRecorrencia === 'mensal') {
        recorrencia = { tipo: 'mensal', diaDoMes: new Date(form.data + 'T12:00:00').getDate() };
      }
    }

    const compromisso = {
      id:         `comp-${Date.now()}`,
      titulo:     form.titulo.trim(),
      categoria:  form.categoria,
      data:       form.recorrente ? form.data : form.data,
      hora:       form.horaInicio || null,
      duracao,
      tipo:       'outro',
      recorrencia,
      observacoes: form.observacoes.trim() || null,
    };

    onSalvar(compromisso);
  };

  const inputCls = "w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/40 placeholder-zinc-600";
  const labelCls = "block text-[11px] text-zinc-500 mb-1 font-titulo uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onFechar}>
      <div onClick={e => e.stopPropagation()}
        className="card w-full sm:max-w-md rounded-b-none sm:rounded-2xl animate-slide-up max-h-[90dvh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Plus size={13} className="text-amber-500" />
            </div>
            <h3 className="font-titulo font-semibold text-white text-base">Novo compromisso</h3>
          </div>
          <button onClick={onFechar}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Título */}
        <div className="mb-3">
          <label className={labelCls}>Título *</label>
          <input
            autoFocus
            className={inputCls}
            placeholder="Ex: Reunião de equipe, Academia, Consulta..."
            value={form.titulo}
            onChange={e => set('titulo', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && salvar()}
          />
        </div>

        {/* Categoria */}
        <div className="mb-3">
          <label className={labelCls}>Categoria</label>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.values(CATEGORIAS).filter(c => ['fixo','rotina','compromisso'].includes(c.id)).map(c => (
              <button key={c.id}
                onClick={() => set('categoria', c.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all border ${
                  form.categoria === c.id
                    ? `${c.corBg} ${c.corBorda} ${c.corTexto}`
                    : 'bg-white/5 border-white/8 text-zinc-500'
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data */}
        <div className="mb-3">
          <label className={labelCls}>Data</label>
          <input type="date"
            className={inputCls}
            value={form.data}
            min={hoje}
            onChange={e => set('data', e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Horários */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Início</label>
            <input type="time"
              className={inputCls}
              value={form.horaInicio}
              onChange={e => set('horaInicio', e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label className={labelCls}>Fim</label>
            <input type="time"
              className={inputCls}
              value={form.horaFim}
              onChange={e => set('horaFim', e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Recorrência */}
        <div className="mb-3">
          <label className={labelCls}>Recorrência</label>
          <button
            onClick={() => set('recorrente', !form.recorrente)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
              form.recorrente
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-white/5 border-white/10 text-zinc-400'
            }`}
          >
            <Repeat size={13} />
            {form.recorrente ? 'Evento recorrente (ativo)' : 'Evento único — clique para recorrente'}
          </button>

          {form.recorrente && (
            <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/8 space-y-2.5">
              {/* Tipo de recorrência */}
              <div className="flex gap-1.5">
                {[
                  { id: 'diaria',  label: 'Diária' },
                  { id: 'semanal', label: 'Semanal' },
                  { id: 'mensal',  label: 'Mensal' },
                ].map(op => (
                  <button key={op.id}
                    onClick={() => set('tipoRecorrencia', op.id)}
                    className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all ${
                      form.tipoRecorrencia === op.id
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-white/5 border-white/8 text-zinc-500'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              {/* Dias da semana (só para semanal) */}
              {form.tipoRecorrencia === 'semanal' && (
                <div>
                  <p className="text-[10px] text-zinc-600 mb-1.5">Dias da semana (opcional — se vazio, usa o dia da data)</p>
                  <div className="flex gap-1">
                    {DIAS_SEMANA.map((d, i) => (
                      <button key={i}
                        onClick={() => toggleDia(i)}
                        className={`flex-1 py-1 rounded-md text-[10px] font-medium border transition-all ${
                          form.diasSemana.includes(i)
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-white/5 border-white/8 text-zinc-600'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="mb-5">
          <label className={labelCls}>Observações</label>
          <textarea
            className={inputCls + ' resize-none'}
            placeholder="Notas adicionais (opcional)"
            rows={2}
            value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)}
          />
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button
            onClick={salvar}
            disabled={!form.titulo.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-titulo transition-all disabled:opacity-40"
            style={{
              background: form.titulo.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.04)',
              color: form.titulo.trim() ? '#000' : '#52525b',
            }}
          >
            Adicionar à rotina
          </button>
          <button onClick={onFechar}
            className="px-4 py-2.5 rounded-xl bg-white/5 text-zinc-400 text-sm transition-colors hover:bg-white/10">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function descreverRecorrencia(rec) {
  if (!rec) return '';
  if (rec.tipo === 'diaria') return 'Repete todos os dias';
  if (rec.tipo === 'semanal') {
    const dias = (rec.diasSemana || []).map(d => DIAS_LABEL[d]).join(', ');
    return `Repete toda semana: ${dias}`;
  }
  if (rec.tipo === 'mensal') return `Repete todo dia ${rec.diaDoMes} do mês`;
  return 'Recorrente';
}
