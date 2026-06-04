import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight, Plus } from 'lucide-react';
import { CATEGORIAS_QF } from '../QueroFazer';

// Converte "HH:MM" em minutos desde meia-noite
function hhmm(str) {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

// Bucket de período a partir de minutos desde meia-noite (BRT)
function periodoDe(minutos) {
  const h = Math.floor(minutos / 60);
  if (h >= 5 && h < 12) return 'manha';
  if (h >= 12 && h < 18) return 'tarde';
  return 'noite'; // 18h–24h e madrugada
}

// Cruza a lista "Quero Fazer" com um gap: cabe na duração E no período.
// Prioriza o que foi feito há mais tempo (rotaciona as sugestões).
function sugestoesPara(queroFazer, inicioEfetivoMin, duracaoRestante) {
  const periodo = periodoDe(inicioEfetivoMin);
  return (queroFazer || [])
    .filter(q => q?.titulo)
    .filter(q => !q.duracaoMin || q.duracaoMin <= duracaoRestante)
    .filter(q => !q.periodo || q.periodo === 'qualquer' || q.periodo === periodo)
    .sort((a, b) => (a.ultimaVez || '0').localeCompare(b.ultimaVez || '0'))
    .slice(0, 3);
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

export default function MicrointervalosCard({ plano, onAbrirChat, compromissosDoDia = [], queroFazer = [], onConcluirQueroFazer, onIrQueroFazer }) {
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Usa prop centralizada do Dashboard — já filtrada com fuso BRT correto
  // Filtra apenas compromissos com horário definido (necessário para calcular lacunas)
  const comHora = (compromissosDoDia || []).filter(c => c.hora);
  const todas = calcularLacunas(comHora);

  if (todas.length === 0) return null;

  // Hora atual no fuso de Brasília (BRT, UTC-3)
  const horaAtual = parseInt(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', timeZone: 'America/Sao_Paulo' })) * 60
    + parseInt(agora.toLocaleTimeString('pt-BR', { minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
  // BUG-029: filtro anterior usava l.inicio > horaAtual + 15, o que escondia lacunas
  // que já começaram mas ainda têm tempo útil restante (ex: bloco 9h-11h às 10h30).
  // Correção: filtrar por l.fim — a lacuna é relevante se ainda termina no futuro.
  const lacunas = todas.filter(l => l.fim > horaAtual + 15);

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
                {/* BUG-029: exibe duração restante quando lacuna já começou */}
                {(() => {
                  const inicioEfetivo = Math.max(l.inicio, horaAtual);
                  const duracaoRestante = l.fim - inicioEfetivo;
                  const jaComecou = l.inicio < horaAtual;
                  const tipoEfetivo = duracaoRestante > 120 ? 'bloco_longo' : l.tipo;
                  return (
                    <div className="flex-shrink-0">
                      <p className={`text-[11px] font-mono ${isLongo ? 'text-indigo-300' : 'text-blue-300'}`}>
                        {jaComecou ? `agora–${fmt(l.fim)}` : `${fmt(l.inicio)}–${fmt(l.fim)}`}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-semibold">
                        {labelDuracao(duracaoRestante, tipoEfetivo)}
                        {jaComecou && <span className="text-zinc-600"> restantes</span>}
                      </p>
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    {l.antes ? `Antes de ${l.antes}` : 'Final do dia'}
                  </p>
                  {(() => {
                    // Sugestões do "Quero Fazer" que cabem nesse intervalo (duração + período)
                    const inicioEfetivo = Math.max(l.inicio, horaAtual);
                    const restante = l.fim - inicioEfetivo;
                    const sugs = sugestoesPara(queroFazer, inicioEfetivo, restante);
                    if (sugs.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {sugs.map(s => (
                            <button
                              key={s.id}
                              onClick={() => onConcluirQueroFazer?.(s.id)}
                              title="Marcar que você fez isso"
                              className="px-2 py-1 rounded-full text-[10px] text-amber-300 transition-all active:scale-95"
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)' }}
                            >
                              {(CATEGORIAS_QF[s.categoria]?.emoji) || '✨'} {s.titulo}
                            </button>
                          ))}
                        </div>
                      );
                    }
                    // Sem item compatível → dica genérica de antes
                    return (
                      <p className="text-[10px] text-zinc-600 mt-0.5 italic">
                        {l.duracao <= 20 ? 'Respira, hidrata, estica.' :
                         l.duracao <= 45 ? 'Leitura leve, emails ou descanso.' :
                         l.duracao <= 120 ? 'Estudo focado ou tarefa pendente.' :
                         'Bloco grande — bom pra projeto, descanso ou o que quiser.'}
                      </p>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA pra semear o "Quero Fazer" quando a lista está vazia */}
      {lacunas.length > 0 && (queroFazer || []).length === 0 && onIrQueroFazer && (
        <button
          onClick={onIrQueroFazer}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: '#f59e0b' }}
        >
          <Plus size={12} /> Diga o que quer fazer nesses momentos
        </button>
      )}
    </div>
  );
}
