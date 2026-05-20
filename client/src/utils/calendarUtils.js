/**
 * calendarUtils.js — Lógica compartilhada de semanas e recorrência
 *
 * Sistema de recorrência:
 *   item.recorrencia = null                                  // não recorrente
 *   item.recorrencia = { tipo: 'diaria' }                    // todo dia
 *   item.recorrencia = { tipo: 'semanal', diasSemana: [1,3,5] }  // dias específicos (0=dom..6=sáb)
 *   item.recorrencia = { tipo: 'mensal', diaDoMes: 15 }      // dia fixo do mês
 */

export const DIAS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DIAS_LABEL_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const MESES_LABEL = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export const DIAS_ALIAS = [
  ['domingo','dom'],
  ['segunda','seg','segunda-feira'],
  ['terça','ter','terca','terça-feira','terca-feira'],
  ['quarta','qua','quarta-feira'],
  ['quinta','qui','quinta-feira'],
  ['sexta','sex','sexta-feira'],
  ['sábado','sab','sabado','sáb'],
];

// ── Semana com offset (0=atual, -1=passada, 1=próxima) ──────────────────────
export function calcSemana(offset = 0) {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - hoje.getDay() + offset * 7);
  inicio.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

// ── YYYY-MM-DD a partir de Date ─────────────────────────────────────────────
export function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Mesma data? (compara dia/mês/ano) ───────────────────────────────────────
export function mesmaData(a, b) {
  if (!a || !b) return false;
  return a.toDateString() === b.toDateString();
}

export function isHoje(d) {
  return mesmaData(d, new Date());
}

// ── Normaliza string de data → Date dentro da semana exibida ────────────────
export function normalizarDia(dataStr, semana) {
  if (!dataStr) return null;
  const lower = String(dataStr).toLowerCase().trim();

  // Nome de dia da semana
  for (let i = 0; i < DIAS_ALIAS.length; i++) {
    if (DIAS_ALIAS[i].some(a => lower.includes(a))) return semana[i];
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dataStr)) return new Date(dataStr + 'T12:00:00');
  // DD/MM[/YYYY]
  const m = dataStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (m) {
    const ano = m[3] ? parseInt(m[3]) : new Date().getFullYear();
    return new Date(ano, parseInt(m[2]) - 1, parseInt(m[1]), 12);
  }
  return null;
}

// ── Expande item recorrente em todas as datas em que ele ocorre na semana ──
// Respeita recorrencia.excecoes: array de YYYY-MM-DD que NÃO devem aparecer
export function ocorrenciasNaSemana(item, semana) {
  const rec = item.recorrencia;
  const excecoes = rec?.excecoes || [];

  // Filtra datas que estejam na lista de exceções (cancelamentos pontuais)
  const semExcecoes = (datas) => datas.filter(d => !excecoes.includes(toYMD(d)));

  // Sem recorrência: usa item.data ou item.blocoSugerido
  if (!rec) {
    const dataRef = item.data || item.blocoSugerido;
    if (!dataRef) return [];
    const data = normalizarDia(dataRef, semana);
    if (!data || !semana.some(d => mesmaData(d, data))) return [];
    return excecoes.includes(toYMD(data)) ? [] : [data];
  }

  // Recorrência diária
  if (rec.tipo === 'diaria') return semExcecoes([...semana]);

  // Recorrência semanal em dias específicos
  if (rec.tipo === 'semanal') {
    const dias = Array.isArray(rec.diasSemana) ? rec.diasSemana : [];
    return semExcecoes(semana.filter(d => dias.includes(d.getDay())));
  }

  // Recorrência mensal num dia fixo
  if (rec.tipo === 'mensal') {
    return semExcecoes(semana.filter(d => d.getDate() === rec.diaDoMes));
  }

  return [];
}

// ── Parse de "HH:MM" pra minutos desde 00:00 ────────────────────────────────
export function horaParaMinutos(hora) {
  if (!hora) return null;
  const m = hora.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

// ── Duração em minutos a partir de "HH:MM-HH:MM" ou retorna fallback ───────
export function duracaoMinutos(item, fallback = 60) {
  if (item.duracao && Number.isFinite(item.duracao)) return item.duracao;
  if (item.blocoSugerido) {
    const m = item.blocoSugerido.match(/(\d{1,2})h?(\d{0,2})\s*[-–às]+\s*(\d{1,2})h?(\d{0,2})/i);
    if (m) {
      const ini = parseInt(m[1]) * 60 + (parseInt(m[2]) || 0);
      const fim = parseInt(m[3]) * 60 + (parseInt(m[4]) || 0);
      if (fim > ini) return fim - ini;
    }
  }
  return fallback;
}
