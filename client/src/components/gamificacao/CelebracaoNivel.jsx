/**
 * CelebracaoNivel.jsx — Tela de celebração fullscreen ao subir de nível
 * Partículas CSS puras, sem biblioteca externa.
 */
import React, { useEffect, useState } from 'react';

// Gera partículas de confete com posições e cores aleatórias (determinísticas via seed)
function gerarParticulas(n = 40) {
  const cores = ['#f59e0b','#fbbf24','#34d399','#60a5fa','#f472b6','#a78bfa','#fb7185'];
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    left: ((i * 37 + 13) % 100),          // 0–100 %
    delay: ((i * 47) % 1800) / 1000,       // 0–1.8s
    dur:   1.2 + ((i * 23) % 8) / 10,     // 1.2–2s
    cor:   cores[i % cores.length],
    rot:   (i * 61) % 360,
    shape: i % 3,                           // 0=círculo, 1=quadrado, 2=triângulo
  }));
}

const PARTICULAS = gerarParticulas(50);

export default function CelebracaoNivel({ info, onContinuar }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    // Delay mínimo pra animação de entrada não cortar
    const t = setTimeout(() => setVisivel(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { nivel, nome, emoji, mensagem } = info;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: 'rgba(8,8,12,0.97)',
        backdropFilter: 'blur(12px)',
        opacity: visivel ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* ── Confete ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICULAS.map(p => (
          <div
            key={p.id}
            className="absolute top-0"
            style={{
              left: `${p.left}%`,
              width:  p.shape === 1 ? 8 : 6,
              height: p.shape === 1 ? 8 : 6,
              background: p.shape === 2 ? 'transparent' : p.cor,
              borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '2px' : '0',
              borderLeft:  p.shape === 2 ? '4px solid transparent' : undefined,
              borderRight: p.shape === 2 ? '4px solid transparent' : undefined,
              borderBottom: p.shape === 2 ? `8px solid ${p.cor}` : undefined,
              animation: `confettiCair ${p.dur}s ${p.delay}s ease-in infinite`,
              transform: `rotate(${p.rot}deg)`,
            }}
          />
        ))}
      </div>

      {/* ── Conteúdo principal ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center px-8 relative z-10">
        {/* Ícone do nível com brilho pulsante */}
        <div
          className="text-7xl mb-6"
          style={{
            animation: 'pulseGlow 1.5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.6))',
          }}
        >
          {emoji}
        </div>

        {/* Texto "SUBIU DE NÍVEL" */}
        <p
          className="text-[11px] font-titulo font-semibold uppercase tracking-[0.3em] mb-2"
          style={{ color: '#f59e0b', textShadow: '0 0 20px rgba(245,158,11,0.5)' }}
        >
          Subiu de nível!
        </p>

        {/* Nome do nível */}
        <h1
          className="font-titulo font-black text-4xl text-white mb-1"
          style={{
            textShadow: '0 0 40px rgba(245,158,11,0.3)',
            letterSpacing: '-0.02em',
          }}
        >
          Nível {nivel}
        </h1>
        <h2
          className="font-titulo font-bold text-2xl mb-6"
          style={{ color: '#f59e0b' }}
        >
          {nome}
        </h2>

        {/* Mensagem da Flora */}
        {mensagem && (
          <div
            className="mb-8 max-w-xs rounded-2xl px-5 py-4 text-sm text-zinc-300 leading-relaxed text-left"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <div className="flex items-start gap-2">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-black mt-0.5"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                F
              </div>
              <p>{mensagem}</p>
            </div>
          </div>
        )}

        {/* Botão continuar */}
        <button
          onClick={onContinuar}
          className="px-10 py-3.5 rounded-2xl font-titulo font-bold text-black text-base transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 4px 24px rgba(245,158,11,0.4)',
          }}
        >
          Continuar 🚀
        </button>
      </div>
    </div>
  );
}
