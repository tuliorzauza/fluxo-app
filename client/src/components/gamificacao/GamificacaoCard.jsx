/**
 * GamificacaoCard.jsx — Card de progresso de gamificação no Dashboard
 * Mostra nível, barra de XP, streak e pontos. Abre conquistas/ranking/histórico.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Flame, ChevronRight } from 'lucide-react';
import { getNivel, getProximoNivel, getProgressoNivel, BADGES_MAP } from '../../utils/gamificacao';

export default function GamificacaoCard({ gamificacao, onAbrirConquistas, onAbrirHistorico }) {
  const gam = gamificacao || { pontos: 0, nivel: 1, streak: 0, badges: [] };
  const pontos = gam.pontos || 0;
  const streak = gam.streak || 0;
  const badges = gam.badges || [];

  const nivelInfo  = getNivel(pontos);
  const proximo    = getProximoNivel(pontos);
  const progresso  = getProgressoNivel(pontos);

  // Animação da barra de progresso na montagem
  const [barraWidth, setBarraWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarraWidth(progresso), 120);
    return () => clearTimeout(t);
  }, [progresso]);

  const pontosParaProximo = proximo ? proximo.min - pontos : 0;

  return (
    <div
      className="card relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #1a1a24 0%, #131319 100%)',
        borderColor: 'rgba(245,158,11,0.12)',
      }}
    >
      {/* Fundo decorativo sutil */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-5"
        style={{
          background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
          transform: 'translate(30%, -30%)',
        }}
      />

      {/* Header: nível + streak */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex items-center gap-3">
          {/* Ícone do nível */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.2)',
              boxShadow: '0 0 16px rgba(245,158,11,0.08)',
            }}
          >
            {nivelInfo.emoji}
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-titulo mb-0.5">
              Nível {nivelInfo.nivel}
            </p>
            <h3 className="font-titulo font-bold text-white text-lg leading-none">
              {nivelInfo.nome}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {pontos} pts
              {proximo && ` · faltam ${pontosParaProximo} para ${proximo.nome}`}
            </p>
          </div>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0"
            style={{
              background: streak >= 7
                ? 'rgba(245,158,11,0.15)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${streak >= 7 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <Flame
              size={13}
              className={streak >= 7 ? 'text-amber-400' : 'text-zinc-500'}
              style={streak >= 7 ? { filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' } : {}}
            />
            <span className={`font-titulo font-bold text-sm ${streak >= 7 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {streak}
            </span>
            <span className="text-[10px] text-zinc-600">dias</span>
          </div>
        )}
      </div>

      {/* Barra de progresso para o próximo nível */}
      {proximo && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-zinc-600">
              {nivelInfo.nome} → {proximo.nome} {proximo.emoji}
            </span>
            <span className="text-[10px] font-semibold text-amber-500 font-titulo">{progresso}%</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${barraWidth}%`,
                background: 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)',
                boxShadow: barraWidth > 0 ? '0 0 8px rgba(245,158,11,0.4)' : 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Badges recentes (máx 5) */}
      {badges.length > 0 && (
        <div className="mb-4 flex items-center gap-1.5 flex-wrap">
          {badges.slice(-5).map(id => {
            const b = BADGES_MAP[id];
            return b ? (
              <span
                key={id}
                title={`${b.nome} — ${b.desc}`}
                className="text-base cursor-default"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
              >
                {b.emoji}
              </span>
            ) : null;
          })}
          {badges.length > 5 && (
            <span className="text-[10px] text-zinc-600">+{badges.length - 5}</span>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Conquistas', icon: Trophy,      onClick: onAbrirConquistas },
          { label: 'Histórico',  icon: ChevronRight, onClick: onAbrirHistorico  },
        ].map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold font-titulo transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.14)',
              color: '#a16207',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)'; e.currentTarget.style.color = '#f59e0b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.06)';  e.currentTarget.style.color = '#a16207'; }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
