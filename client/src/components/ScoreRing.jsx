import React, { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';

function getConfig(score) {
  if (score >= 75) return {
    label: 'Equilibrada', desc: 'Sua semana tem espaço pra respirar',
    gradStart: '#22c55e', gradEnd: '#4ade80', glow: 'rgba(34,197,94,0.2)',
  };
  if (score >= 50) return {
    label: 'Moderada', desc: 'Ocupado, mas ainda dá pra manobrar',
    gradStart: '#f59e0b', gradEnd: '#fbbf24', glow: 'rgba(245,158,11,0.2)',
  };
  if (score >= 30) return {
    label: 'Carregada', desc: 'Sua semana tá bem puxada',
    gradStart: '#f97316', gradEnd: '#fb923c', glow: 'rgba(249,115,22,0.2)',
  };
  return {
    label: 'Crítica', desc: 'Muita coisa — vamos aliviar isso',
    gradStart: '#ef4444', gradEnd: '#f87171', glow: 'rgba(239,68,68,0.2)',
  };
}

export default function ScoreRing({ score = 0, diagnostico = null }) {
  const [animScore, setAnimScore] = useState(0);
  const [mostrarInfo, setMostrarInfo] = useState(false);
  const prevScore = useRef(0);

  useEffect(() => {
    const alvo = score;
    const inicio = prevScore.current;
    const duracao = 900;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duracao, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setAnimScore(Math.round(inicio + (alvo - inicio) * ease));
      if (p < 1) requestAnimationFrame(tick);
      else prevScore.current = alvo;
    };
    requestAnimationFrame(tick);
  }, [score]);

  const { label, desc, gradStart, gradEnd, glow } = getConfig(score);
  const gradId = 'scoreGrad';
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (animScore / 100) * CIRC;

  // Determina nível de penalidade exibida
  const gargalos = diagnostico?.principaisGargalos || [];
  const tempoEstimado = diagnostico?.tempoEstimadoPerdido || null;

  return (
    <div className="card flex flex-col items-center py-6 relative overflow-hidden">
      {/* Fundo radial suave */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 60%, ${glow}, transparent 65%)` }} />

      {/* Botão de info */}
      <button
        onClick={() => setMostrarInfo(v => !v)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-colors z-10"
        title="Como o score é calculado"
      >
        <Info size={14} />
      </button>

      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-5 font-titulo">
        Score de tempo livre
      </p>

      {/* Anel SVG */}
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={gradStart} />
              <stop offset="100%" stopColor={gradEnd}   />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={R} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
          <circle cx="60" cy="60" r={R} fill="none"
            stroke={`url(#${gradId})`} strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.05s linear', filter: `drop-shadow(0 0 6px ${gradStart}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold font-titulo leading-none" style={{ color: gradStart }}>
            {animScore}
          </span>
          <span className="text-xs text-zinc-600 mt-0.5">/ 100</span>
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="font-semibold font-titulo text-lg" style={{ color: gradStart }}>{label}</p>
        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{desc}</p>
      </div>

      {/* ── Painel explicativo ───────────────────────────────────────────── */}
      {mostrarInfo && (
        <div className="absolute inset-0 rounded-[20px] bg-[#13131b]/97 backdrop-blur-sm flex flex-col p-5 animate-fade-in z-20">
          <div className="flex items-center justify-between mb-4">
            <p className="font-titulo font-semibold text-sm text-white">Como o score funciona</p>
            <button onClick={() => setMostrarInfo(false)}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
              <X size={14} />
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            O score reflete o equilíbrio entre o que você tem pra fazer,
            o tempo livre que sobra e como isso tá distribuído na semana.
          </p>

          <div className="space-y-3 flex-1">
            <FormulaItem
              emoji="📊"
              titulo="Fórmula base"
              detalhe="score = 100 − sobrecarga − concentração + distribuição"
            />
            <FormulaItem
              emoji="⚠️"
              titulo="Penalidade de sobrecarga"
              detalhe="Reduz quando há muitas tarefas de alta prioridade ou compromissos sobrepostos"
            />
            <FormulaItem
              emoji="📅"
              titulo="Penalidade de concentração"
              detalhe="Reduz quando mais de 60% dos itens estão concentrados em 1–2 dias"
            />
            <FormulaItem
              emoji="✅"
              titulo="Bônus de distribuição"
              detalhe="Aumenta conforme tarefas são concluídas (+20 pts pelo progresso total)"
            />

            {gargalos.length > 0 && (
              <div className="mt-2 pt-3 border-t border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-titulo">
                  Seus gargalos
                </p>
                {gargalos.slice(0, 3).map((g, i) => (
                  <p key={i} className="text-[11px] text-zinc-400 flex gap-1.5 mb-1">
                    <span className="text-amber-500 flex-shrink-0">·</span> {g}
                  </p>
                ))}
              </div>
            )}

            {tempoEstimado && (
              <div className="mt-1 p-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15">
                <p className="text-[11px] text-amber-300">
                  ⏱ Tempo estimado perdido: <strong>{tempoEstimado}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FormulaItem({ emoji, titulo, detalhe }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-base flex-shrink-0 leading-none mt-0.5">{emoji}</span>
      <div>
        <p className="text-xs font-semibold text-zinc-300">{titulo}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{detalhe}</p>
      </div>
    </div>
  );
}
