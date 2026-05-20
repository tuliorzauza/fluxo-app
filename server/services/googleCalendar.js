/**
 * googleCalendar.js — Stub para integração futura com Google Calendar API
 *
 * Status: NÃO IMPLEMENTADO. Estrutura preparada para evolução.
 *
 * Quando implementar:
 *   1. Adicionar `googleapis` ao package.json
 *   2. Configurar OAuth2 client no .env:
 *        GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *   3. Implementar fluxo OAuth2 (token armazenado por usuário no localStorage
 *      via endpoint /api/google/auth)
 *   4. Substituir as funções stub abaixo
 *
 * Modelo de dados — mapeamento:
 *   Fluxo compromisso  ↔  Google Calendar event
 *   Fluxo recorrencia  ↔  Google Calendar RRULE
 *      diaria   → RRULE:FREQ=DAILY
 *      semanal  → RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR
 *      mensal   → RRULE:FREQ=MONTHLY;BYMONTHDAY=15
 */

// ─── Autenticação OAuth2 ──────────────────────────────────────────────────────

/**
 * Inicia fluxo OAuth2 — retorna URL de consentimento do Google.
 * Frontend redireciona pra essa URL.
 */
async function iniciarAuth() {
  // TODO: implementar com googleapis.OAuth2Client
  throw new Error('Google Calendar integration not implemented yet');
}

/**
 * Callback do OAuth — recebe o code, troca por tokens, persiste.
 */
async function processarCallback(code) {
  // TODO: trocar code por tokens, persistir refresh_token
  throw new Error('Google Calendar integration not implemented yet');
}

/**
 * Verifica se o usuário tem token válido conectado.
 */
async function estaConectado(userId) {
  // TODO: ler token do storage e validar
  return false;
}

// ─── Importação: Google Calendar → Fluxo ──────────────────────────────────────

/**
 * Lista eventos do Google Calendar do usuário num intervalo de tempo.
 *
 * @param {string} userId
 * @param {Date} inicio
 * @param {Date} fim
 * @returns {Promise<Array<Compromisso>>} - eventos no formato Fluxo
 */
async function importarEventos(userId, inicio, fim) {
  // TODO: chamar calendar.events.list, mapear cada evento pra { id, titulo, data, hora, tipo, categoria, recorrencia }
  return [];
}

// ─── Exportação: Fluxo → Google Calendar ──────────────────────────────────────

/**
 * Cria evento no Google Calendar a partir de um compromisso do Fluxo.
 *
 * @param {string} userId
 * @param {object} compromisso - formato Fluxo (id, titulo, data, hora, recorrencia, ...)
 * @returns {Promise<{ googleEventId: string }>}
 */
async function exportarCompromisso(userId, compromisso) {
  // TODO: calendar.events.insert
  // Mapear recorrencia.tipo → RRULE
  throw new Error('Google Calendar integration not implemented yet');
}

/**
 * Atualiza evento existente.
 */
async function atualizarEventoRemoto(userId, googleEventId, mudancas) {
  // TODO: calendar.events.patch
  throw new Error('Google Calendar integration not implemented yet');
}

/**
 * Remove evento do Google Calendar.
 */
async function removerEventoRemoto(userId, googleEventId) {
  // TODO: calendar.events.delete
  throw new Error('Google Calendar integration not implemented yet');
}

// ─── Sincronização bidirecional ───────────────────────────────────────────────

/**
 * Sincroniza eventos: importa novos do Google, exporta novos do Fluxo,
 * resolve conflitos por timestamp.
 *
 * @param {string} userId
 * @param {object} planoFluxo - plano atual do usuário no Fluxo
 * @returns {Promise<{ planoMesclado, conflitos: [] }>}
 */
async function sincronizar(userId, planoFluxo) {
  // TODO: estratégia de merge bidirecional
  return { planoMesclado: planoFluxo, conflitos: [] };
}

// ─── Helpers de mapeamento ────────────────────────────────────────────────────

/**
 * Converte recorrencia do Fluxo pra RRULE do Google Calendar.
 */
function recorrenciaParaRRule(rec) {
  // TODO
  if (!rec) return null;
  if (rec.tipo === 'diaria') return ['RRULE:FREQ=DAILY'];
  if (rec.tipo === 'semanal') {
    const map = ['SU','MO','TU','WE','TH','FR','SA'];
    const dias = (rec.diasSemana || []).map(d => map[d]).join(',');
    return [`RRULE:FREQ=WEEKLY;BYDAY=${dias}`];
  }
  if (rec.tipo === 'mensal') return [`RRULE:FREQ=MONTHLY;BYMONTHDAY=${rec.diaDoMes}`];
  return null;
}

/**
 * Converte RRULE do Google pra recorrencia do Fluxo.
 */
function rruleParaRecorrencia(rrule) {
  // TODO
  return null;
}

module.exports = {
  // Auth
  iniciarAuth, processarCallback, estaConectado,
  // I/O
  importarEventos, exportarCompromisso, atualizarEventoRemoto, removerEventoRemoto,
  // Sync
  sincronizar,
  // Helpers
  recorrenciaParaRRule, rruleParaRecorrencia,
};
