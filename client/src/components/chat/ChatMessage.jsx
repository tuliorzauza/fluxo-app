import React, { memo } from 'react';

// ── Formatação de texto: negrito + quebras de linha ────────────────────────
function formatarTexto(texto) {
  if (!texto) return null;
  return texto
    .split('\n')
    .map((linha, i, arr) => {
      const partes = linha.split(/(\*\*[^*]+\*\*)/g).map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={j} className="font-semibold text-white">{p.slice(2, -2)}</strong>;
        }
        return p;
      });
      return (
        <React.Fragment key={i}>
          {partes}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      );
    });
}

function formatarHora(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ── Quick Reply chips ──────────────────────────────────────────────────────────
function QuickReplies({ replies, onSelect, ativos }) {
  if (!replies?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 pl-1 mt-2 animate-fade-in">
      {replies.map((reply, i) => (
        <button
          key={i}
          disabled={!ativos}
          onClick={() => ativos && onSelect(reply)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
          style={ativos ? {
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: '#f59e0b',
            boxShadow: '0 1px 4px rgba(245,158,11,0.06)',
            cursor: 'pointer',
          } : {
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#52525b',
            cursor: 'default',
            opacity: 0.6,
          }}
          onMouseEnter={e => {
            if (!ativos) return;
            e.currentTarget.style.background = 'rgba(245,158,11,0.18)';
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)';
          }}
          onMouseLeave={e => {
            if (!ativos) return;
            e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)';
          }}
        >
          {reply}
        </button>
      ))}
    </div>
  );
}

// ── Cursor piscante (durante streaming) ───────────────────────────────────────
function StreamingCursor() {
  return (
    <span
      className="inline-block w-0.5 h-[1em] align-middle ml-0.5 rounded-sm"
      style={{
        background: '#f59e0b',
        animation: 'blink 1s step-end infinite',
      }}
    />
  );
}

// ── Componente principal ───────────────────────────────────────────────────
const ChatMessage = memo(function ChatMessage({
  mensagem,
  qrAtivos = false,
  onQuickReply,
}) {
  const isFlora = mensagem.tipo === 'flora';

  if (isFlora) {
    // Extrai texto a mostrar: durante streaming, tenta exibir a mensagem parcial
    const textoExibir = mensagem.streaming
      ? (mensagem.streamMensagem || mensagem.streamRaw || '')
      : mensagem.texto;

    return (
      <div className="flex items-end gap-2.5 px-4 animate-fade-in">
        {/* Avatar Flora */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 font-titulo font-bold text-xs text-black"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          F
        </div>

        <div className="flex flex-col gap-1 max-w-[78%]">
          {/* Balão da mensagem */}
          <div
            className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed text-zinc-200"
            style={{
              background: '#1a1a22',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.25)',
              minHeight: 42,
            }}
          >
            {textoExibir ? formatarTexto(textoExibir) : null}
            {mensagem.streaming && <StreamingCursor />}
          </div>

          {/* Quick replies — mostrados sempre que a mensagem tem QRs;
              amber = ativos (resposta ainda não enviada), cinza = já respondido */}
          {mensagem.quickReplies?.length > 0 && (
            <QuickReplies
              replies={mensagem.quickReplies}
              onSelect={onQuickReply}
              ativos={qrAtivos}
            />
          )}

          {mensagem.timestamp && !mensagem.streaming && (
            <span className="text-[10px] text-zinc-700 pl-1">{formatarHora(mensagem.timestamp)}</span>
          )}
        </div>
      </div>
    );
  }

  // Mensagem do usuário (direita)
  return (
    <div className="flex items-end justify-end px-4 animate-fade-in">
      <div className="flex flex-col gap-1 items-end max-w-[78%]">
        <div
          className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.12))',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: 'inset 0 1px 0 rgba(245,158,11,0.1)',
          }}
        >
          {formatarTexto(mensagem.texto)}
        </div>
        {mensagem.timestamp && (
          <span className="text-[10px] text-zinc-700 pr-1">{formatarHora(mensagem.timestamp)}</span>
        )}
      </div>
    </div>
  );
});

export default ChatMessage;
