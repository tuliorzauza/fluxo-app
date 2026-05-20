import React from 'react';
import { AlertTriangle, TrendingDown, Clock } from 'lucide-react';

export default function DiagnosticCard({ diagnostico }) {
  if (!diagnostico) return null;

  const { principaisGargalos = [], tempoEstimadoPerdido, scoreTempoLivre } = diagnostico;

  return (
    <div className="card border-orange-500/20">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
          <TrendingDown size={15} className="text-orange-400" />
        </div>
        <div>
          <h2 className="font-titulo font-semibold text-white text-base leading-none">Onde você está perdendo tempo</h2>
          {principaisGargalos.length > 0 && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Encontrei {principaisGargalos.length}{' '}
              {principaisGargalos.length === 1 ? 'gargalo' : 'gargalos'}
            </p>
          )}
        </div>
      </div>

      {principaisGargalos.length > 0 && (
        <div className="space-y-2 mb-4">
          {principaisGargalos.map((gargalo, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15"
            >
              <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-orange-400">{i + 1}</span>
              </div>
              <p className="text-sm text-zinc-300 leading-snug">{gargalo}</p>
            </div>
          ))}
        </div>
      )}

      {tempoEstimadoPerdido && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0f0f13] border border-[#1e1e28]">
          <Clock size={14} className="text-zinc-500 flex-shrink-0" />
          <p className="text-sm text-zinc-400">
            Tempo estimado sendo desperdiçado:{' '}
            <span className="text-orange-400 font-medium">{tempoEstimadoPerdido}</span>
          </p>
        </div>
      )}
    </div>
  );
}
