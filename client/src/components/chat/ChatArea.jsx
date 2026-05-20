import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';

export default function ChatArea({ mensagens, carregando, onQuickReply }) {
  const scrollRef = useRef(null);

  // Auto-scroll para o final quando chega mensagem nova ou começa a carregar
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    el.scrollTo({ top: el.scrollHeight, behavior: perto ? 'smooth' : 'auto' });
  }, [mensagens.length, carregando]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a3a transparent' }}
    >
      <div className="flex flex-col gap-4 py-4 min-h-full">
        {mensagens.length === 0 && !carregando && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center opacity-40">
            <div className="text-4xl mb-3">🌿</div>
            <p className="text-sm text-zinc-500">A Flora está esperando...</p>
          </div>
        )}

        {mensagens.map((msg, i) => {
          // Quick replies ficam activos enquanto não houver mensagem do usuário depois
          // e não estiver carregando uma nova resposta
          const hasUserAfter = mensagens.slice(i + 1).some(m => m.tipo === 'user');
          const qrAtivos = !hasUserAfter && !carregando;

          return (
            <ChatMessage
              key={`${msg.timestamp}-${i}`}
              mensagem={msg}
              qrAtivos={qrAtivos}
              onQuickReply={onQuickReply}
            />
          );
        })}

        {carregando && <TypingIndicator />}

        <div className="h-2" />
      </div>
    </div>
  );
}
