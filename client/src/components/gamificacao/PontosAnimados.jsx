/**
 * PontosAnimados.jsx — Animações flutuantes de ganho/perda de pontos
 * Renderizadas em posição fixa na tela, disparam e somem em 2 segundos.
 */
import React from 'react';

export default function PontosAnimados({ animacoes = [] }) {
  if (animacoes.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-28 z-50 pointer-events-none flex flex-col-reverse gap-1 items-end">
      {animacoes.map(a => {
        const positivo = (a.delta || 0) > 0;
        const texto = positivo ? `+${a.delta} pts` : `${a.delta} pts`;

        return (
          <div
            key={a.id}
            className="font-titulo font-bold text-sm select-none"
            style={{
              color: positivo ? '#f59e0b' : '#f87171',
              animation: 'pontosSubir 2s ease-out forwards',
              textShadow: positivo
                ? '0 0 12px rgba(245,158,11,0.6)'
                : '0 0 12px rgba(248,113,113,0.6)',
            }}
          >
            {texto}
          </div>
        );
      })}
    </div>
  );
}
