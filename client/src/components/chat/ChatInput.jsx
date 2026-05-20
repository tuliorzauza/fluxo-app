import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';

const PLACEHOLDERS = [
  'Conta o que você tem pela frente...',
  'O que tá na sua cabeça essa semana?',
  'Tem algo te preocupando?',
  'Qual compromisso quer encaixar?',
];

const DRAFT_KEY = 'flora_draft_message';

export default function ChatInput({ onSend, carregando }) {
  const [texto, setTexto] = useState(() => {
    // Carrega rascunho salvo ao montar
    try { return localStorage.getItem(DRAFT_KEY) || ''; } catch { return ''; }
  });
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const textareaRef  = useRef(null);
  const debounceRef  = useRef(null);

  // Rotaciona placeholder sutilmente
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Auto-resize do textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [texto]);

  // Salva rascunho com debounce de 500ms
  const salvarRascunho = useCallback((valor) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        if (valor) {
          localStorage.setItem(DRAFT_KEY, valor);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {}
    }, 500);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setTexto(val);
    salvarRascunho(val);
  };

  const enviar = () => {
    const msg = texto.trim();
    if (!msg || carregando) return;
    // Limpa rascunho imediatamente ao enviar
    if (debounceRef.current) clearTimeout(debounceRef.current);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    onSend(msg);
    setTexto('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div
      className="px-3 py-3 border-t"
      style={{ borderColor: 'rgba(255,255,255,0.05)', background: '#0f0f13' }}
    >
      <div
        className="flex items-end gap-2.5 rounded-2xl px-4 py-2.5 transition-all"
        style={{
          background: '#16161d',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: texto ? '0 0 0 2px rgba(245,158,11,0.12)' : 'none',
        }}
      >
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={carregando}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-zinc-600 resize-none outline-none text-[15px] leading-relaxed py-1 font-corpo min-h-[28px]"
          style={{ maxHeight: 120 }}
        />

        <button
          onClick={enviar}
          disabled={!texto.trim() || carregando}
          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 mb-0.5"
          style={{
            background: texto.trim() && !carregando
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'rgba(255,255,255,0.04)',
            boxShadow: texto.trim() && !carregando ? '0 2px 8px rgba(245,158,11,0.3)' : 'none',
          }}
        >
          {carregando ? (
            <svg className="loading-ring w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray="40 20" />
            </svg>
          ) : (
            <Send size={14} className={texto.trim() ? 'text-black' : 'text-zinc-600'} />
          )}
        </button>
      </div>

      <p className="text-[10px] text-zinc-700 text-center mt-1.5">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  );
}
