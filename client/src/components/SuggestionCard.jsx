import React from 'react';
import { Lightbulb, Timer, ChevronRight } from 'lucide-react';

export default function SuggestionCard({ sugestao }) {
  if (!sugestao) return null;

  const { problema, solucao, tempoRecuperado } = sugestao;

  return (
    <div className="card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-28 h-28 opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #10b981, transparent 70%)',
        }}
      />

      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Lightbulb size={15} className="text-emerald-400" />
        </div>
        <h2 className="font-titulo font-semibold text-white text-base">Como recuperar tempo</h2>
      </div>

      {problema && (
        <div className="mb-3 p-3 rounded-xl bg-[#0f0f13] border border-[#1e1e28]">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1 font-titulo">Problema identificado</p>
          <p className="text-sm text-zinc-300">{problema}</p>
        </div>
      )}

      {solucao && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
          <p className="text-xs text-emerald-500 uppercase tracking-wide mb-1 font-titulo">Solução sugerida</p>
          <p className="text-sm text-zinc-200 leading-relaxed">{solucao}</p>
        </div>
      )}

      {tempoRecuperado && (
        <div className="flex items-center gap-2 mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Timer size={14} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">
            Potencial recuperado:{' '}
            <span className="text-emerald-400">{tempoRecuperado}</span>
          </p>
        </div>
      )}
    </div>
  );
}
