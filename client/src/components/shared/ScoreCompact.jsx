import React from 'react';

function getConfig(score) {
  if (score >= 75) return { label: 'Equilibrada', cor: '#22c55e' };
  if (score >= 50) return { label: 'Moderada',    cor: '#f59e0b' };
  if (score >= 30) return { label: 'Carregada',   cor: '#f97316' };
  return               { label: 'Crítica',       cor: '#ef4444' };
}

export default function ScoreCompact({ score = 0 }) {
  const { label, cor } = getConfig(score);

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all"
      style={{
        background: `${cor}14`,
        border: `1px solid ${cor}30`,
      }}
    >
      {/* Mini anel */}
      <svg width="14" height="14" viewBox="0 0 14 14" className="-rotate-90">
        <circle cx="7" cy="7" r="5" fill="none" stroke={`${cor}30`} strokeWidth="2" />
        <circle cx="7" cy="7" r="5" fill="none" stroke={cor} strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 5}`}
          strokeDashoffset={`${2 * Math.PI * 5 * (1 - score / 100)}`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="text-xs font-semibold font-titulo" style={{ color: cor }}>{score}</span>
      <span className="text-[11px] text-zinc-500 hidden sm:inline">{label}</span>
    </div>
  );
}
