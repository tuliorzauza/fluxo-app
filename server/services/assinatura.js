/**
 * assinatura.js — Estado de assinatura e uso de mensagens (modelo freemium).
 *
 * Plano free: limite de LIMITE_MENSAGENS_FREE mensagens por dia (BRT).
 * Plano pro:  ilimitado enquanto a assinatura estiver ativa.
 *
 * O backend usa service_role, então estas queries ignoram RLS.
 */
const { supabase } = require('./supabase');

// Limite diário do plano free. Ajuste aqui se quiser afrouxar/apertar.
const LIMITE_MENSAGENS_FREE = 10;

async function getAssinatura(userId) {
  const { data, error } = await supabase
    .from('assinaturas').select('*').eq('user_id', userId).maybeSingle();
  if (error) console.error('[ASSINATURA] erro ao ler:', error.message);
  return data || { plano: 'free', status: 'inativa' };
}

// True se o usuário tem acesso pro válido agora.
function ehPro(assinatura) {
  if (!assinatura || assinatura.plano !== 'pro') return false;
  if (assinatura.status !== 'ativa') return false;
  // Tolerância: se periodo_fim existe e já passou, não é mais pro.
  if (assinatura.periodo_fim && new Date(assinatura.periodo_fim) < new Date()) return false;
  return true;
}

async function getUsoHoje(userId, dataYMD) {
  const { data, error } = await supabase
    .from('uso_mensagens').select('contador')
    .eq('user_id', userId).eq('data', dataYMD).maybeSingle();
  if (error) console.error('[USO] erro ao ler:', error.message);
  return data?.contador || 0;
}

// Incremento atômico via RPC. Retorna o novo total (ou null em erro).
async function incrementarUso(userId, dataYMD) {
  const { data, error } = await supabase.rpc('incrementar_uso', {
    p_user_id: userId, p_data: dataYMD,
  });
  if (error) { console.error('[USO] rpc incrementar_uso erro:', error.message); return null; }
  return data;
}

async function upsertAssinatura(userId, campos) {
  const { error } = await supabase.from('assinaturas').upsert({
    user_id: userId,
    ...campos,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

// Acha o user_id a partir do customer do Stripe (para webhooks sem metadata).
async function getUserIdPorCustomer(customerId) {
  if (!customerId) return null;
  const { data } = await supabase
    .from('assinaturas').select('user_id')
    .eq('stripe_customer_id', customerId).maybeSingle();
  return data?.user_id || null;
}

module.exports = {
  LIMITE_MENSAGENS_FREE,
  getAssinatura, ehPro, getUsoHoje, incrementarUso,
  upsertAssinatura, getUserIdPorCustomer,
};
