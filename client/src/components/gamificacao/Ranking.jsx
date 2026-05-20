/**
 * Ranking.jsx — Leaderboard com usuários fictícios + usuário real
 * Cria competição realista com pontuações próximas ao usuário.
 */
import React, { useState, useMemo } from 'react';
import { X, Flame, Crown } from 'lucide-react';
import { gerarRanking, getNivel } from '../../utils/gamificacao';

const FILTROS = [
  { id: 'geral',   label: 'Geral'    },
  { id: 'semanal', label: 'Semanal'  },
  { id: 'mensal',  label: 'Mensal'   },
];

// Simula variações de pontos para filtros semanal/mensal
function ajustarParaFiltro(ranking, filtro) {
  if (filtro === 'geral') return ranking;
  return ranking.map(u => {
    const mult = filtro === 'semanal' ? 0.12 : 0.35;
    const pts = u.isUser ? Math.round(u.pontos * mult) : Math.round(u.pontos * mult * (0.8 + Math.random() * 0.4));
    return { ...u, pontos: Math.max(0, pts) };
  }).sort((a, b) => b.pontos - a.pontos).map((u, i) => ({ ...u, posicao: i + 1 }));
}

function medalha(pos) {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return null;
}

export default function Ranking({ gamificacao, perfil, onFechar }) {
  const [filtro, setFiltro] = useState('geral');

  const pontos  = gamificacao?.pontos  || 0;
  const streak  = gamificacao?.streak  || 0;
  const nome    = perfil?.nome?.split(' ')[0] || 'Você';

  const rankingBase = useMemo(
    () => gerarRanking(pontos, nome, streak),
    [pontos, nome, streak]
  );

  const ranking = ajustarParaFiltro(rankingBase, filtro);
  const minhaPosicao = ranking.find(u => u.isUser)?.posicao || '-';

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
            <h2 className="font-titulo font-bold text-white text-lg flex items-center gap-2">
              <Crown size={16} className="text-amber-400" />
              Ranking
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Você está em <span className="text-amber-400 font-semibold">#{minhaPosicao}</span>
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

        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-5 pb-6">
          <div className="space-y-2">
            {ranking.map((u, i) => {
              const med = medalha(u.posicao);
              const isMe = u.isUser;
              const nivelInfo = getNivel(u.pontos);

              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${
                    isMe
                      ? 'border'
                      : 'border border-transparent'
                  }`}
                  style={isMe ? {
                    background: 'rgba(245,158,11,0.06)',
                    borderColor: 'rgba(245,158,11,0.2)',
                    boxShadow: '0 0 12px rgba(245,158,11,0.05)',
                  } : {
                    background: i < 3 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  {/* Posição */}
                  <div className="w-7 text-center flex-shrink-0">
                    {med ? (
                      <span className="text-lg">{med}</span>
                    ) : (
                      <span className="text-xs text-zinc-600 font-titulo font-semibold">
                        #{u.posicao}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold font-titulo flex-shrink-0"
                    style={{
                      background: isMe
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'rgba(255,255,255,0.07)',
                      color: isMe ? '#000' : '#a1a1aa',
                    }}
                  >
                    {u.av}
                  </div>

                  {/* Nome + nível */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-none truncate ${isMe ? 'text-amber-300' : 'text-zinc-300'}`}>
                      {u.nome} {isMe && '(você)'}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {nivelInfo.emoji} {u.nomeNivel}
                    </p>
                  </div>

                  {/* Streak */}
                  {u.streak > 0 && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Flame size={11} className={u.streak >= 7 ? 'text-amber-400' : 'text-zinc-600'} />
                      <span className="text-[10px] text-zinc-500">{u.streak}</span>
                    </div>
                  )}

                  {/* Pontos */}
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-sm font-bold font-titulo ${isMe ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {u.pontos}
                    </span>
                    <span className="text-[10px] text-zinc-700 ml-0.5">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
