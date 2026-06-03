/**
 * stripe.js — Cliente Stripe e helpers de checkout/webhook.
 *
 * Tudo é no-op seguro enquanto STRIPE_SECRET_KEY não estiver definida.
 * Configurar nas env vars do Railway:
 *   STRIPE_SECRET_KEY      — chave secreta (sk_...)
 *   STRIPE_WEBHOOK_SECRET  — segredo do endpoint de webhook (whsec_...)
 *   STRIPE_PRICE_MENSAL    — price id do plano mensal (price_...)
 *   STRIPE_PRICE_ANUAL     — price id do plano anual (price_...)
 */
const Stripe = require('stripe');

const SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = SECRET ? new Stripe(SECRET) : null;

const PRICES = {
  mensal: process.env.STRIPE_PRICE_MENSAL,
  anual:  process.env.STRIPE_PRICE_ANUAL,
};

function stripeAtivo() { return !!stripe; }

// Cria uma sessão de Stripe Checkout (assinatura). Retorna a session.
async function criarCheckout({ userId, email, plano, sucessoUrl, cancelUrl, customerId }) {
  if (!stripe) throw new Error('Stripe não configurado (STRIPE_SECRET_KEY ausente)');
  const price = PRICES[plano] || PRICES.mensal;
  if (!price) throw new Error(`Price não configurado para o plano "${plano}"`);

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: sucessoUrl,
    cancel_url: cancelUrl,
    ...(customerId ? { customer: customerId } : { customer_email: email || undefined }),
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
  });
}

// Valida e constrói o evento de webhook a partir do corpo cru + assinatura.
function construirEvento(rawBody, signature) {
  if (!stripe) throw new Error('Stripe não configurado');
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) throw new Error('STRIPE_WEBHOOK_SECRET ausente');
  return stripe.webhooks.constructEvent(rawBody, signature, segredo);
}

// Busca uma assinatura no Stripe (para pegar current_period_end / status).
async function getSubscription(subscriptionId) {
  if (!stripe || !subscriptionId) return null;
  try { return await stripe.subscriptions.retrieve(subscriptionId); }
  catch (e) { console.error('[STRIPE] retrieve subscription erro:', e.message); return null; }
}

module.exports = { stripe, stripeAtivo, criarCheckout, construirEvento, getSubscription, PRICES };
