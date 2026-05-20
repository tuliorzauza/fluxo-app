/**
 * HistoricoPontos.jsx — Histórico cronológico de eventos de pontuação
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { formatarDelta, descricaoEvento, emojiEvento } from '../../utils/gamificacao';

const FILTROS = [
  { id: 'tudo',   label: 'Tudo'       },
  { id: 'hoje',   label: 'Hoje'       },
  { id: 'semana', label: 'Esta semana'},
  { id: 'mes',    label: 'Este mês'   },
];

function hoje()   { return new Date().toISOString().split('T')[0]; }
function semanaAtras() {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}
function mesAtras() {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

export default function HistoricoPontos({ historico = [], pontosTotal = 0, onFechar }) {
  const [filtro, setFiltro] = useState('tudo');

  const filtrado = [...historico].reverse().filter(h => {
    if (filtro === 'hoje')   return h.data === hoje();
    if (filtro === 'semana') return h.data >= semanaAtras();
    if (filtro === 'mes')    return h.data >= mesAtras();
    return true;
  });

  const totalFiltro = filtrado.reduce((s, h) => s + (h.delta || 0), 0);

  function formatarData(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    const hj = new Date().toISOString().split('T')[0];
    const on = new Date(); on.setDate(on.getDate() - 1);
    const onStr = on.toISOString().split('T')[0];
    if (iso === hj)    return 'Hoje';
    if (iso === onStr) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onFechar}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl animate-slide-up flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #1a1a24 0%, #131319 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          maxHeight: '90dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
          <div>
            <h2 className="font-titulo font-bold text-white text-lg">Histórico de pontos</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Total: <span className="text-amber-500 font-semibold">{pontosTotal} pts</span>
            </p>
          </div>
          <button onClick={onFechar}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-1.5 px-5 py-3 flex-shrink-0">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold font-titulo transition-all border ${
                filtro === f.id
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-white/5 border-white/8 text-zinc-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Resumo do filtro */}
        {filtro !== 'tudo' && (
          <div className="px-5 pb-2 flex-shrink-0">
            <p className="text-[11px] text-zinc-600">
              {filtrado.length} eventos · {formatarDelta(totalFiltro)} pts no período
            </p>
          </div>
        )}

        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-5 pb-6">
          {filtrado.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-600 text-sm">Nenhum evento neste período.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtrado.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
                >
                  {/* Emoji */}
                  <span className="text-base flex-shrink-0 w-6 text-center">
                    {emojiEvento(h.delta)}
                  </span>

                  {/* Descrição */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 leading-snug truncate">
                      {descricaoEvento(h.evento, h.descricao)}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{formatarData(h.data)}</p>
                  </div>

                  {/* Delta */}
                  <div className="flex-shrink-0 text-right">
                    <span
                      className={`text-sm font-bold font-titulo ${
                        (h.delta || 0) > 0 ? 'text-amber-400' :
                        (h.delta || 0) < 0 ? 'text-red-400' : 'text-zinc-500'
                      }`}
                    >
                      {formatarDelta(h.delta || 0)} pts
                    </span>
                    <p className="text-[10px] text-zinc-700">{h.pontos} total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
