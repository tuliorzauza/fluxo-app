import React, { useEffect, useMemo } from 'react';
import { Zap } from 'lucide-react';
import { getCompromissosDoDia, hojeYMD, amanhaYMD } from '../utils/planoUtils';

const CACHE_KEY = 'fluxo_proxima_acao';

function horaParaMinutos(hora) {
  if (!hora) return null;
  const m = hora.match(/^(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
}

function blocoParaMinutos(bloco) {
  if (!bloco) return null;
  const m = bloco.match(/(\d{1,2})[h:](\d{0,2})/i);
  return m ? parseInt(m[1]) * 60 + (parseInt(m[2]) || 0) : null;
}

// Hora atual em minutos desde meia-noite, calculada no fuso de Brasília
function horaAtualBRT() {
  const agora = new Date();
  return parseInt(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', timeZone: 'America/Sao_Paulo' })) * 60
    + parseInt(agora.toLocaleTimeString('pt-BR', { minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
}

// comprHoje: lista já filtrada pelo Dashboard via getCompromissosDoDia (fonte única de verdade)
function calcularProxima(plano, comprHoje) {
  if (!plano) return null;

  const hoje   = hojeYMD();
  const amanha = amanhaYMD();
  const agoraMin = horaAtualBRT();

  // Compromissos de hoje (da prop centralizada, excluindo concluídos)
  const itemsCompHoje = (comprHoje || [])
    .filter(c => !c.concluida)
    .map(c => ({
      titulo: c.titulo,
      min: horaParaMinutos(c.hora) ?? 9999,
    }));

  // Tarefas com prazo hoje
  const tarHoje = (plano.tarefas || [])
    .filter(t => !t.concluida && t.tipo !== 'flora' && t.prazo === hoje)
    .map(t => ({
      titulo: t.titulo,
      min: horaParaMinutos(t.hora) ?? blocoParaMinutos(t.blocoSugerido) ?? 9999,
    }));

  const itensHoje = [...itemsCompHoje, ...tarHoje].sort((a, b) => a.min - b.min);

  // Primeiro item ainda por vir (30 min de tolerância)
  const proximo = itensHoje.find(i => i.min >= agoraMin - 30) || itensHoje[0];
  if (proximo) return proximo.titulo;

  // Nada hoje → primeiro item de amanhã (getCompromissosDoDia garante consistência)
  const comprAmanha = getCompromissosDoDia({ compromissos: plano.compromissos }, amanha)
    .filter(c => !c.concluida)
    .map(c => ({ titulo: c.titulo, min: horaParaMinutos(c.hora) ?? 9999 }))
    .sort((a, b) => a.min - b.min);

  const tarAmanha = (plano.tarefas || [])
    .filter(t => !t.concluida && t.tipo !== 'flora' && t.prazo === amanha)
    .map(t => ({ titulo: t.titulo, min: 9999 }));

  const proximoAmanha = comprAmanha[0] || tarAmanha[0];
  if (proximoAmanha) return `Amanhã: ${proximoAmanha.titulo}`;

  return null;
}

function lerCacheProxima() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache?.data === hojeYMD() ? cache : null; // só válido hoje
  } catch { return null; }
}

function salvarCacheProxima(texto) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ texto, data: hojeYMD() }));
  } catch {}
}

export default function NextActionCard({ plano, proximaAcao: proximaAcaoFlora, compromissosDoDia = [] }) {
  // Computa a partir dos compromissos do dia já filtrados pelo Dashboard (fonte única)
  const calculada = useMemo(() => plano ? calcularProxima(plano, compromissosDoDia) : null, [plano, compromissosDoDia]);

  // Persiste quando muda (ex: tarefa marcada como feita)
  useEffect(() => {
    if (calculada) salvarCacheProxima(calculada);
  }, [calculada]);

  // Texto final: calculado → cache do dia → fallback da Flora
  let texto = calculada;
  if (!texto) {
    const cache = lerCacheProxima();
    texto = cache?.texto || proximaAcaoFlora || null;
  }

  if (!texto) return null;

  const isAmanha = texto.startsWith('Amanhã:');

  return (
    <div className="card border-amber-500/25 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }}
      />

      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Zap size={15} className="text-amber-400" />
        </div>
        <h2 className="font-titulo font-semibold text-white text-base">Próxima ação</h2>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-1 h-full min-h-[40px] bg-amber-500 rounded-full flex-shrink-0 mt-1" />
        <div>
          {isAmanha && (
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-titulo mb-0.5">
              Amanhã
            </p>
          )}
          <p className="text-[15px] text-white leading-relaxed font-medium">
            {isAmanha ? texto.replace('Amanhã: ', '') : texto}
          </p>
        </div>
      </div>
    </div>
  );
}
