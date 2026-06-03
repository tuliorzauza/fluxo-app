/**
 * Paywall.jsx — Tela de upgrade para o plano Pro.
 *
 * Mostrada quando o usuário free atinge o limite diário de mensagens, ou
 * acionada manualmente pelo perfil. Os preços de exibição vêm de env vars
 * opcionais (VITE_PRECO_MENSAL / VITE_PRECO_ANUAL); o valor real é cobrado
 * pelo Stripe Checkout.
 */
import React, { useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';

const PRECO_MENSAL = import.meta.env.VITE_PRECO_MENSAL || null; // ex: "R$ 29"
const PRECO_ANUAL  = import.meta.env.VITE_PRECO_ANUAL  || null; // ex: "R$ 290"

const BENEFICIOS = [
  'Mensagens ilimitadas com a Flora',
  'Organização da rotina sem travas',
  'Estado da semana e momentos livres sempre atualizados',
  'Tudo que a Flora aprende sobre você, sem limite',
];

export default function Paywall({ restantes = 0, limiteDia = 10, onAssinar, onFechar, atingiuLimite = true }) {
  const [carregando, setCarregando] = useState(null); // 'mensal' | 'anual'

  const assinar = async (plano) => {
    setCarregando(plano);
    try { await onAssinar(plano); } finally { setCarregando(null); }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
        style={{ background: '#0f0f13', border: '1px solid rgba(245,158,11,0.2)', maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div
          className="relative px-5 pt-6 pb-5 flex-shrink-0 text-center"
          style={{ background: 'linear-gradient(160deg, rgba(245,158,11,0.14), transparent)' }}
        >
          <button
            onClick={onFechar}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
            <Sparkles size={20} className="text-amber-500" />
          </div>
          <h2 className="font-titulo font-bold text-white text-lg leading-tight">
            {atingiuLimite ? 'Você usou suas mensagens de hoje' : 'Destrave a Flora por completo'}
          </h2>
          <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed px-2">
            {atingiuLimite
              ? `O plano gratuito inclui ${limiteDia} mensagens por dia. Vire Pro e converse sem limite.`
              : 'Mensagens ilimitadas e a organização da sua vida sem travas.'}
          </p>
        </div>

        {/* Benefícios */}
        <div className="px-5 py-4 space-y-2.5">
          {BENEFICIOS.map((b, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={10} className="text-amber-400" />
              </div>
              <span className="text-[13px] text-zinc-300 leading-snug">{b}</span>
            </div>
          ))}
        </div>

        {/* Planos */}
        <div className="px-5 pb-5 pt-1 space-y-2.5">
          <button
            onClick={() => assinar('anual')}
            disabled={!!carregando}
            className="w-full relative py-3.5 rounded-xl font-semibold font-titulo text-sm transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' }}
          >
            <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500 text-black">
              melhor valor
            </span>
            {carregando === 'anual' ? 'Abrindo...' : `Plano anual${PRECO_ANUAL ? ` · ${PRECO_ANUAL}/ano` : ''}`}
          </button>

          <button
            onClick={() => assinar('mensal')}
            disabled={!!carregando}
            className="w-full py-3.5 rounded-xl font-semibold font-titulo text-sm transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7' }}
          >
            {carregando === 'mensal' ? 'Abrindo...' : `Plano mensal${PRECO_MENSAL ? ` · ${PRECO_MENSAL}/mês` : ''}`}
          </button>

          <p className="text-[10px] text-zinc-600 text-center pt-1 leading-relaxed">
            Você verá o valor exato na próxima tela. Pagamento seguro via Stripe.
            {atingiuLimite && ' Seu limite renova amanhã.'}
          </p>
        </div>
      </div>
    </div>
  );
}
