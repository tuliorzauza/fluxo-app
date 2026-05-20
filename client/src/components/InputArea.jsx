import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

const exemplos = [
  'tenho reunião terça às 14h, preciso entregar relatório sexta, quero treinar 3x essa semana',
  'consulta médica quinta 10h, apresentação segunda, fico muito tempo no celular à noite',
  'preciso estudar para prova na próxima semana, tenho happy hour quarta',
];

export default function InputArea({ onProcessar, carregando, temDados }) {
  const [texto, setTexto] = useState('');
  const [exemploIdx, setExemploIdx] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!temDados) {
      const intervalo = setInterval(() => {
        setExemploIdx((i) => (i + 1) % exemplos.length);
      }, 3500);
      return () => clearInterval(intervalo);
    }
  }, [temDados]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [texto]);

  const handleEnviar = () => {
    if (texto.trim() && !carregando) {
      onProcessar(texto.trim());
      setTexto('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative rounded-2xl border transition-all duration-200 ${
          carregando
            ? 'border-amber-500/40 bg-[#16161d] glow-amber'
            : 'border-[#1e1e28] bg-[#16161d] focus-within:border-amber-500/50 focus-within:glow-amber'
        }`}
      >
        {carregando && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                background:
                  'linear-gradient(90deg, transparent, #f59e0b, transparent)',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={carregando}
          placeholder={
            temDados
              ? 'Adicione mais coisas à sua semana...'
              : exemplos[exemploIdx]
          }
          className="w-full bg-transparent text-white placeholder-zinc-600 resize-none outline-none px-5 pt-5 pb-4 pr-16 text-[15px] leading-relaxed font-corpo min-h-[72px] transition-all duration-300"
          rows={1}
        />

        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          {carregando ? (
            <div className="w-9 h-9 flex items-center justify-center">
              <svg className="loading-ring w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="40 20"
                />
              </svg>
            </div>
          ) : (
            <button
              onClick={handleEnviar}
              disabled={!texto.trim()}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${
                texto.trim()
                  ? 'bg-amber-500 hover:bg-amber-400 text-black active:scale-90'
                  : 'bg-[#1e1e28] text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 px-1">
        <Sparkles size={12} className="text-zinc-600 flex-shrink-0" />
        <p className="text-xs text-zinc-600">
          {carregando
            ? 'Analisando sua semana...'
            : 'Escreva em linguagem natural — a IA entende tudo'}
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
