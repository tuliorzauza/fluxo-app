import React, { useEffect, useMemo } from 'react';
import { Zap } from 'lucide-react';

const CACHE_KEY = 'fluxo_proxima_acao';

// BUG-031: toISOString() retorna UTC — após 21h BRT o dia já avança incorretamente.
// toLocaleDateString('sv-SE', ...) retorna YYYY-MM-DD no fuso de Brasília.
function hojeYMD() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function amanhaYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function diaSemanaDe(dataYMD) {
  return new Date(dataYMD + 'T12:00:00').getDay();
}

// Filtra compromissos que ocorrem em uma data específica (considera recorrência)
function compromissosNoDia(comproms, dataYMD) {
  const dia = diaSemanaDe(dataYMD);
  return (comproms || []).filter(c => {
    if (!c.titulo || c.concluida) return false;
    const excecoes = c.recorrencia?.excecoes || [];
    if (excecoes.includes(dataYMD)) return false;
    if (!c.recorrencia) return c.data === dataYMD;
    if (c.recorrencia.tipo === 'diaria') return true;
    if (c.recorrencia.tipo === 'semanal') return (c.recorrencia.diasSemana || []).includes(dia);
    return false;
  });
}

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

function calcularProxima(plano) {
  if (!plano) return null;

  const hoje   = hojeYMD();
  const amanha = amanhaYMD();
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();

  // Compromissos de hoje
  const comprHoje = compromissosNoDia(plano.compromissos, hoje).map(c => ({
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

  const itensHoje = [...comprHoje, ...tarHoje].sort((a, b) => a.min - b.min);

  // Primeiro item ainda por vir (30 min de tolerância)
  const proximo = itensHoje.find(i => i.min >= agoraMin - 30) || itensHoje[0];
  if (proximo) return proximo.titulo;

  // Nada hoje → primeiro item de amanhã
  const comprAmanha = compromissosNoDia(plano.compromissos, amanha)
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

export default function NextActionCard({ plano, proximaAcao: proximaAcaoFlora }) {
  // Computa a partir do plano real, filtrado por hoje
  const calculada = useMemo(() => plano ? calcularProxima(plano) : null, [plano]);

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
