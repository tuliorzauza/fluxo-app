/**
 * ResumoSemana.jsx — Síntese retrospectiva da semana, no tom da Flora.
 *
 * Calcula as métricas da semana a partir de dados que já existem (plano,
 * conclusões e check-ins) e pede ao backend um resumo caloroso (Claude Haiku),
 * com cache por semana para não reprocessar a cada abertura.
 */
import React, { useState, useEffect } from 'react';
import { X, CalendarRange } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCompromissosDoDia } from '../utils/planoUtils';
import { calcSemana, toYMD } from '../utils/calendarUtils';

const API_URL = import.meta.env.VITE_API_URL || '';
const CACHE_KEY = 'fluxo_resumo_semana';

// Calcula números da semana atual a partir do plano + conclusões + memória.
function calcularNumeros(plano, memoria) {
  const semana = calcSemana(0);
  const datas = semana.map(toYMD);
  const setDatas = new Set(datas);

  let concluidas = {};
  try { concluidas = JSON.parse(localStorage.getItem('fluxo_tarefas_concluidas') || '{}'); } catch {}

  // Conta compromissos da semana e quantos foram concluídos
  let total = 0;
  let feitas = 0;
  const titulosSemana = [];
  datas.forEach(d => {
    getCompromissosDoDia(plano, d).forEach(c => {
      total++;
      titulosSemana.push({ titulo: c.titulo, dia: d, hora: c.hora || null });
      const feitoRecorrente = c.recorrencia && concluidas[`${c.id}__${d}`];
      const feitoPontual = !c.recorrencia && (concluidas[c.id] || c.concluida);
      if (feitoRecorrente || feitoPontual) feitas++;
    });
  });

  // Tarefas com prazo nesta semana
  (plano?.tarefas || []).forEach(t => {
    if (t.tipo === 'flora' || !t.prazo || !setDatas.has(t.prazo)) return;
    total++;
    if (concluidas[t.id] || t.concluida) feitas++;
  });

  // Dias ativos: datas distintas com alguma conclusão dentro da semana
  const diasComConclusao = new Set();
  Object.keys(concluidas).forEach(k => {
    const idx = k.lastIndexOf('__');
    if (idx !== -1) {
      const d = k.slice(idx + 2);
      if (setDatas.has(d)) diasComConclusao.add(d);
    }
  });

  const checkInsSemana = (memoria?.checkIns || []).filter(c => setDatas.has(c.data));

  return {
    numeros: {
      concluidas: feitas,
      total,
      streak: memoria?.gamificacao?.streak || 0,
      diasAtivos: diasComConclusao.size,
    },
    checkIns: checkInsSemana,
    compromissos: titulosSemana,
    semanaInicio: datas[0],
  };
}

function hashNumeros(n) {
  return `${n.concluidas}-${n.total}-${n.streak}-${n.diasAtivos}`;
}

export default function ResumoSemana({ plano, memoria, perfil, tomFlora = 'calorosa', onFechar }) {
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!plano) { setEstado({ vazio: true }); return; }

    const dados = calcularNumeros(plano, memoria);
    const hash = hashNumeros(dados.numeros);

    // Cache válido: mesma semana e mesmos números
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cache?.semanaInicio === dados.semanaInicio && cache?.hash === hash) {
        setEstado(cache.resultado);
        return;
      }
    } catch {}

    setLoading(true);
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const token = session?.access_token;
        return fetch(`${API_URL}/api/resumo-semana`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            numeros: dados.numeros,
            checkIns: dados.checkIns,
            compromissos: dados.compromissos,
            nomeUsuario: perfil?.nome?.split(' ')[0] || '',
            tomFlora,
          }),
        });
      })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`resumo ${r.status}`))))
      .then(resultado => {
        setEstado(resultado);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ semanaInicio: dados.semanaInicio, hash, resultado }));
        } catch {}
        setLoading(false);
      })
      .catch(() => { setErro(true); setLoading(false); });
  }, [plano, memoria, perfil, tomFlora]);

  const numeros = estado?.numeros;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
        style={{ background: '#0f0f13', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), transparent)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
              <CalendarRange size={16} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="font-titulo font-bold text-white text-base leading-tight">Resumo da semana</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Como foi sua semana, sem cobrança</p>
            </div>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] animate-pulse" />
              <p className="text-xs text-zinc-600">A Flora está revisando sua semana...</p>
            </div>
          )}

          {!loading && estado?.vazio && (
            <div className="text-center py-14 px-6">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="text-sm text-zinc-400">Ainda não há semana pra resumir.</p>
              <p className="text-xs text-zinc-600 mt-2">Conforme você usa o Fluxo, este resumo ganha vida.</p>
            </div>
          )}

          {!loading && erro && !estado?.titulo && (
            <div className="text-center py-14 px-6">
              <p className="text-sm text-zinc-400">Não consegui montar o resumo agora.</p>
              <p className="text-xs text-zinc-600 mt-2">Tenta de novo daqui a pouco?</p>
            </div>
          )}

          {!loading && estado?.titulo && (
            <>
              {/* Números */}
              {numeros && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { valor: `${numeros.concluidas}/${numeros.total}`, label: 'concluídas' },
                    { valor: numeros.diasAtivos,                        label: 'dias ativos' },
                    { valor: `${numeros.streak}d`,                      label: 'sequência' },
                  ].map(({ valor, label }) => (
                    <div key={label} className="card !p-3 flex flex-col items-center text-center">
                      <span className="font-titulo font-bold text-lg text-white leading-none">{valor}</span>
                      <span className="text-[10px] text-zinc-600 mt-1">{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumo */}
              <div className="card">
                <h3 className="font-titulo font-bold text-white text-base mb-1.5">{estado.titulo}</h3>
                {estado.resumo && <p className="text-sm text-zinc-300 leading-relaxed">{estado.resumo}</p>}
              </div>

              {estado.destaque && (
                <div className="card" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <p className="text-[11px] text-emerald-400/80 uppercase tracking-widest font-titulo mb-1">Destaque</p>
                  <p className="text-sm text-zinc-200 leading-relaxed">{estado.destaque}</p>
                </div>
              )}

              {estado.sugestao && (
                <div className="card" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-[11px] text-amber-400/80 uppercase tracking-widest font-titulo mb-1">Pra próxima semana</p>
                  <p className="text-sm text-zinc-200 leading-relaxed">{estado.sugestao}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
