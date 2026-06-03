/**
 * analytics.js — Camada fina sobre o PostHog.
 *
 * Privacidade em primeiro lugar (o Fluxo guarda dados pessoais e emocionais):
 *  - autocapture DESLIGADO: só enviamos eventos explícitos definidos no código.
 *  - session recording DESLIGADO: nunca gravamos a tela do usuário.
 *  - NUNCA enviar conteúdo de mensagem, memória, nomes ou texto livre — só
 *    metadados (contagens, ids de evento, aba, nível).
 *
 * Tudo é no-op enquanto VITE_POSTHOG_KEY não estiver definida, então o app
 * funciona normalmente sem a chave. Para ativar: defina VITE_POSTHOG_KEY
 * (e opcionalmente VITE_POSTHOG_HOST) no ambiente da Vercel.
 */
import posthog from 'posthog-js';

const KEY  = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let ativo = false;

export function initAnalytics() {
  if (ativo || !KEY) return; // sem chave → no-op silencioso
  try {
    posthog.init(KEY, {
      api_host: HOST,
      autocapture: false,              // só eventos explícitos
      capture_pageview: false,         // SPA — disparamos manualmente
      capture_pageleave: true,
      disable_session_recording: true, // app sensível — nunca grava tela
      persistence: 'localStorage+cookie',
    });
    ativo = true;
  } catch (e) {
    console.warn('[ANALYTICS] init falhou:', e?.message);
  }
}

// Dispara um evento. props deve conter SÓ metadados (sem PII / texto livre).
export function track(evento, props = {}) {
  if (!ativo) return;
  try { posthog.capture(evento, props); } catch {}
}

// Associa os eventos ao usuário logado (por UUID do Supabase — sem email/nome).
export function identifyUser(userId, traits = {}) {
  if (!ativo || !userId) return;
  try { posthog.identify(userId, traits); } catch {}
}

// Limpa a identidade no logout (evita misturar usuários no mesmo device).
export function resetAnalytics() {
  if (!ativo) return;
  try { posthog.reset(); } catch {}
}

export function analyticsAtivo() { return ativo; }
