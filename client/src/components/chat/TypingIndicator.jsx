import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 px-4">
      {/* Avatar da Flora */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 font-titulo font-bold text-xs text-black"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
      >
        F
      </div>

      {/* Bolha com dots animados */}
      <div
        className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{
          background: '#1a1a22',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-zinc-500"
            style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>

      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
