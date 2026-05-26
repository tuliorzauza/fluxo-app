import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight } from 'lucide-react';

// Retorna todos os compromissos que ocorrem hoje
function compromissosDoDia(compromissos) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split('T')[0];
  const diaSemana = hoje.getDay();

  return (compromissos || []).filter(c => {
    const excecoes = c.recorrencia?.excecoes || [];
    if (excecoes.includes(hojeStr)) return false;
    if (!c.recorrencia) return c.data === hojeStr;
    if (c.recorrencia.tipo === 'diaria') return true;
    if (c.recorrencia.tipo === 'semanal') return (c.recorrencia.diasSemana || []).includes(diaSemana);
    return false;
  }).filter(c => c.hora); // só com horário definido
}

// Converte "HH:MM" em minutos desde meia-noite
function hhmm(str) {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function fmt(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}h${m ? String(m).padStart(2, '0') : ''}`;
}

// Encontra lacunas de 15min a 120min entre compromissos do dia
function calcularLacunas(compromissos) {
  const blocos = compromissos
    .map(c => ({
      inicio: hhmm(c.hora),
      fim: hhmm(c.hora) + (c.duracao || 60),
      titulo: c.titulo,
    }))
    .filter(b => b.inicio !== null)
    .sort((a, b) => a.inicio - b.inicio);

  const INICIO_DIA = 6 * 60;
  const FIM_DIA    = 23 * 60;
  const lacunas = [];
  let cursor = INICIO_DIA;

  for (const b of blocos) {
    const gap = b.inicio - cursor;
    if (gap >= 15) {
      lacunas.push({
        inicio: cursor,
        fim: b.inicio,
        duracao: gap,
        antes: b.titulo,
        tipo: gap > 120 ? 'bloco_longo' : 'microintervalo',
      });
    }
    cursor = Math.max(cursor, b.fim);
  }
  // Lacuna após o último compromisso
  const gapFinal = FIM_DIA - cursor;
  if (gapFinal >= 15) {
    lacunas.push({
      inicio: cursor,
      fim: FIM_DIA,
      duracao: gapFinal,
      antes: null,
      tipo: gapFinal > 120 ? 'bloco_longo' : 'microintervalo',
    });
  }

  return lacunas.slice(0, 4); // máx 4 lacunas
}

function labelDuracao(min, tipo) {
  if (min < 60) return `⚡ ~${min}min livres`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const durStr = m ? `${h}h${m}min` : `${h}h`;
  return tipo === 'bloco_longo' ? `🕐 ${durStr} livres` : `⚡ ~${durStr} livres`;
}

export default function MicrointervalosCard({ plano, onAbrirChat }) {
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  const hoje = compromissosDoDia(plano?.compromissos);
  const todas = calcularLacunas(hoje);

  if (todas.length === 0) return null;

  const horaAtual = agora.getHours() * 60 + agora.getMinutes();
  const lacunas = todas.filter(l => l.inicio > horaAtual + 15);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Clock size={13} className="text-blue-400" />
          </div>
          <h3 className="font-titulo font-semibold text-white text-sm">Momentos livres hoje</h3>
        </div>
        <button
          onClick={onAbrirChat}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Ajustar <ChevronRight size={11} />
        </button>
      </div>

      {lacunas.length === 0 ? (
        <p className="text-center text-[12px] text-zinc-600 py-2">
          Nenhum intervalo livre restante hoje 🌙
        </p>
      ) : (
        <div className="space-y-2">
          {lacunas.map((l, i) => {
            const isLongo = l.tipo === 'bloco_longo';
            return (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl"
                style={isLongo
                  ? { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }
                  : { background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }
                }>
                <div className="flex-shrink-0">
                  <p className={`text-[11px] font-mono ${isLongo ? 'text-indigo-300' : 'text-blue-300'}`}>{fmt(l.inicio)}–{fmt(l.fim)}</p>
                  <p className="text-[10px] text-zinc-500 font-semibold">{labelDuracao(l.duracao, l.tipo)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    {l.antes ? `Antes de ${l.antes}` : 'Final do dia'}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5 italic">
                    {l.duracao <= 20 ? 'Respira, hidrata, estica.' :
                     l.duracao <= 45 ? 'Leitura leve, emails ou descanso.' :
                     l.duracao <= 120 ? 'Estudo focado ou tarefa pendente.' :
                     'Bloco grande — bom pra projeto, descanso ou o que quiser.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
