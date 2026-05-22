import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

// Emojis que representam estados negativos da semana
const EMOJIS_NEGATIVOS = new Set(['⚠️', '🔥', '😮‍💨', '🌀']);

const CACHE_KEY = 'fluxo_estado_semana';

function hojeYMD() {
  return new Date().toISOString().split('T')[0];
}

// Hash da agenda: identifica mudanças na composição do plano
function calcularHashAgenda(plano) {
  const eventos = [
    ...(plano.compromissos || []).map(c => `c:${c.id || c.titulo}:${c.hora || ''}`),
    ...(plano.tarefas || []).filter(t => !t.concluida).map(t => `t:${t.id || t.titulo}`),
  ].sort();
  try {
    return btoa(unescape(encodeURIComponent(eventos.join('|'))));
  } catch {
    return eventos.join('|');
  }
}

function lerCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function salvarCache(estado, hashAgenda) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...estado,
      data: hojeYMD(),
      hashAgenda,
    }));
  } catch {}
}

// Lê rotina da memória local para enriquecer a análise
function lerRotina() {
  try {
    const raw = localStorage.getItem('fluxo_memory_v1');
    if (!raw) return null;
    return JSON.parse(raw)?.rotina || null;
  } catch { return null; }
}

function getFallback(score) {
  if (score >= 75) return { emoji: '🌊', titulo: 'Fluindo bem' };
  if (score >= 50) return { emoji: '⚠️',  titulo: 'Semana moderada' };
  if (score >= 30) return { emoji: '🔥',  titulo: 'Semana carregada' };
  return { emoji: '😮‍💨', titulo: 'Semana sobrecarregada' };
}

export default function EstadoSemana({ plano, onVerPlano }) {
  const [estado, setEstado]   = useState(null);
  const [loading, setLoading] = useState(false);
  const hashRef = useRef(null);

  const scoreDiscreto = plano?.diagnostico?.scoreTempoLivre ?? 0;

  useEffect(() => {
    if (!plano) return;

    console.log('ESTADO SEMANA DEBUG:', {
      hash: calcularHashAgenda(plano),
      hashRef: hashRef.current,
      cache: lerCache(),
      hoje: hojeYMD()
    });

    const hash = calcularHashAgenda(plano);

    // Mesmo hash desde o último fetch — não reprocessar
    if (hashRef.current === hash) return;
    hashRef.current = hash;

    const hoje = hojeYMD();
    const cache = lerCache();

    // Cache válido: mesmo dia e mesma composição de agenda
    if (cache?.data === hoje && cache?.hashAgenda === hash) {
      setEstado({
        emoji:         cache.emoji,
        titulo:        cache.titulo,
        descricao:     cache.descricao,
        scoreDiscreto: cache.scoreDiscreto ?? scoreDiscreto,
      });
      return;
    }

    // Precisa gerar novo estado
    setLoading(true);
    const rotina = lerRotina();

    fetch(`${API_URL}/api/estado-semana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planoAtual: plano, scoreDiscreto, rotina }),
    })
      .then(r => r.json())
      .then(data => {
        setEstado(data);
        salvarCache(data, hash);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [plano, scoreDiscreto]);

  if (!plano) return null;

  const fb = getFallback(scoreDiscreto);

  // Skeleton enquanto carrega (só na primeira vez, sem estado ainda)
  if (loading && !estado) {
    return (
      <div className="card flex flex-col items-center justify-center py-7 gap-3">
        <div className="w-10 h-10 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="w-28 h-4 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="space-y-2 mt-1">
          <div className="w-44 h-3 rounded-full bg-white/[0.03] animate-pulse" />
          <div className="w-36 h-3 rounded-full bg-white/[0.03] animate-pulse" />
        </div>
      </div>
    );
  }

  const emoji     = estado?.emoji     || fb.emoji;
  const titulo    = estado?.titulo    || fb.titulo;
  const descricao = estado?.descricao || null;
  const score     = estado?.scoreDiscreto ?? scoreDiscreto;

  const ehNegativo = EMOJIS_NEGATIVOS.has(emoji);

  const handleVerPlano = () => {
    try {
      localStorage.setItem('fluxo_plano_acao_pendente', JSON.stringify({
        titulo,
        emoji,
        descricao,
        scoreDiscreto: score,
      }));
    } catch {}
    onVerPlano?.();
  };

  return (
    <div
      className="card flex flex-col items-center py-6 text-center relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #1a1a24 0%, #131319 100%)' }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)' }}
      />

      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-4 font-titulo relative">
        Estado da semana
      </p>

      <div className="text-4xl mb-3 relative leading-none">{emoji}</div>

      <p className="font-titulo font-bold text-xl text-white leading-tight mb-2 relative">
        {titulo}
      </p>

      {descricao && (
        <p className="text-sm text-zinc-400 leading-relaxed max-w-[230px] relative">
          {descricao}
        </p>
      )}

      {ehNegativo && onVerPlano && (
        <button
          onClick={handleVerPlano}
          className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 relative"
          style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: '#f59e0b',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(245,158,11,0.18)';
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)';
          }}
        >
          <Lightbulb size={13} />
          Ver plano de ação
        </button>
      )}

      <p className="text-[10px] text-zinc-700 mt-4 relative">
        {score}/100
      </p>
    </div>
  );
}
