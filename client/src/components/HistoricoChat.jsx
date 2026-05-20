import React, { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, User, Sparkles } from 'lucide-react';

function formatarHora(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function HistoricoChat({ historico = [] }) {
  const [expandido, setExpandido] = useState(false);

  if (historico.length === 0) return null;

  const visiveis = expandido ? historico : historico.slice(-2);

  return (
    <div className="card">
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
            <MessageSquare size={14} className="text-zinc-400" />
          </div>
          <h2 className="font-titulo font-semibold text-white text-base">Histórico</h2>
          <span className="text-xs text-zinc-600 bg-[#1e1e28] px-2 py-0.5 rounded-full">
            {historico.length} {historico.length === 1 ? 'mensagem' : 'mensagens'}
          </span>
        </div>
        {expandido ? (
          <ChevronUp size={14} className="text-zinc-500" />
        ) : (
          <ChevronDown size={14} className="text-zinc-500" />
        )}
      </button>

      <div className="mt-4 space-y-2">
        {!expandido && historico.length > 2 && (
          <button
            onClick={() => setExpandido(true)}
            className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
          >
            + ver {historico.length - 2} mensagens anteriores
          </button>
        )}

        {visiveis.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.tipo === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                msg.tipo === 'user'
                  ? 'bg-amber-500/20 border border-amber-500/30'
                  : 'bg-zinc-800 border border-zinc-700'
              }`}
            >
              {msg.tipo === 'user' ? (
                <User size={12} className="text-amber-400" />
              ) : (
                <Sparkles size={12} className="text-zinc-400" />
              )}
            </div>

            {/* Bolha */}
            <div
              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.tipo === 'user'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-zinc-200 rounded-tr-sm'
                  : 'bg-[#1e1e28] border border-zinc-800 text-zinc-300 rounded-tl-sm'
              }`}
            >
              <p>{msg.texto}</p>
              {msg.timestamp && (
                <p className={`text-[10px] mt-1 ${msg.tipo === 'user' ? 'text-amber-500/50 text-right' : 'text-zinc-600'}`}>
                  {formatarHora(msg.timestamp)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
