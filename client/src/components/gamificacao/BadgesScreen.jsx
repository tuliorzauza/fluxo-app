/**
 * BadgesScreen.jsx — Tela de conquistas (grid de badges)
 * Desbloqueadas em cor, bloqueadas em cinza. Secretas aparecem como "?".
 *
 * CORRIGIDO: useState movido para componente BadgeItem separado
 * (estava dentro de .map(), violando Rules of Hooks).
 */
import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { TODOS_BADGES, CATEGORIAS_BADGE } from '../../utils/gamificacao';

// ── Componente isolado para cada badge (permite useState por instância) ────────
function BadgeItem({ badge, desbloqueada }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const visivel = desbloqueada || !badge.secreto;

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(true)}
      onTouchEnd={() => setTimeout(() => setShowTooltip(false), 1500)}
    >
      {/* Ícone */}
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
          desbloqueada
            ? 'bg-amber-500/12 border border-amber-500/25'
            : 'bg-white/[0.03] border border-white/[0.06]'
        }`}
        style={desbloqueada ? {
          boxShadow: '0 0 12px rgba(245,158,11,0.12)',
        } : {
          filter: 'grayscale(1) brightness(0.4)',
        }}
      >
        {visivel ? (
          <span style={{ filter: desbloqueada ? 'none' : 'grayscale(1)' }}>
            {badge.emoji}
          </span>
        ) : (
          <Lock size={16} className="text-zinc-700" />
        )}
      </div>

      {/* Nome */}
      <p className={`text-[9px] text-center leading-tight font-titulo font-medium ${
        desbloqueada ? 'text-zinc-300' : 'text-zinc-700'
      }`}>
        {visivel ? badge.nome : '???'}
      </p>

      {/* Tooltip */}
      {showTooltip && visivel && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-44 rounded-xl px-3 py-2 text-center animate-fade-in pointer-events-none"
          style={{
            background: '#1e1e2e',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <p className="text-xs font-semibold text-white mb-0.5">{badge.emoji} {badge.nome}</p>
          <p className="text-[10px] text-zinc-400 leading-tight">{badge.desc}</p>
          {desbloqueada && (
            <p className="text-[9px] text-amber-500/70 mt-1">✓ Conquistada</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tela principal ─────────────────────────────────────────────────────────────
export default function BadgesScreen({ badges = [], onFechar }) {
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas');
  const conquistadas = new Set(badges);

  const totalDesbloqueadas = TODOS_BADGES.filter(b => conquistadas.has(b.id)).length;
  const totalVisiveis = TODOS_BADGES.filter(b => !b.secreto || conquistadas.has(b.id)).length;

  const badgesFiltrados = TODOS_BADGES.filter(b => {
    if (categoriaAtiva !== 'todas' && b.categoria !== categoriaAtiva) return false;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onFechar}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl animate-slide-up flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #1a1a24 0%, #131319 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          maxHeight: '90dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
          <div>
            <h2 className="font-titulo font-bold text-white text-lg">Conquistas</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {totalDesbloqueadas} de {totalVisiveis} desbloqueadas
            </p>
          </div>
          <button
            onClick={onFechar}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filtro por categoria */}
        <div className="flex gap-1.5 overflow-x-auto px-5 py-3 flex-shrink-0 hide-scrollbar">
          <button
            onClick={() => setCategoriaAtiva('todas')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold font-titulo transition-all border ${
              categoriaAtiva === 'todas'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-white/5 border-white/8 text-zinc-500'
            }`}
          >
            Todas
          </button>
          {CATEGORIAS_BADGE.map(cat => {
            const count = TODOS_BADGES.filter(b => b.categoria === cat.id && conquistadas.has(b.id)).length;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold font-titulo transition-all border ${
                  categoriaAtiva === cat.id
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border-white/8 text-zinc-500'
                }`}
              >
                {cat.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Grid de badges */}
        <div className="overflow-y-auto px-5 pb-6 flex-1">
          {badgesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-3xl mb-3">🌱</p>
              <p className="text-sm text-zinc-500">Nenhuma conquista nessa categoria ainda.</p>
              <p className="text-[11px] text-zinc-700 mt-1">Continue usando o app pra desbloquear!</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {badgesFiltrados.map(badge => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  desbloqueada={conquistadas.has(badge.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
