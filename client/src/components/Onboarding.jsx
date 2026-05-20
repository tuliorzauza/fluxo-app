import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Waves } from 'lucide-react';

const PERGUNTAS = [
  {
    id: 'nome',
    emoji: '👋',
    titulo: 'Oi! Como posso te chamar?',
    subtitulo: 'Vou usar seu nome para tornar tudo mais pessoal.',
    tipo: 'texto',
    placeholder: 'Seu nome...',
  },
  {
    id: 'ocupacao',
    emoji: '💼',
    titulo: 'Qual é sua principal ocupação?',
    subtitulo: 'Isso me ajuda a entender seu ritmo e prioridades.',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'estudante', label: 'Estudante', emoji: '📚' },
      { valor: 'profissional', label: 'Profissional', emoji: '💻' },
      { valor: 'freelancer', label: 'Freelancer', emoji: '🚀' },
      { valor: 'outro', label: 'Outro', emoji: '✨' },
    ],
  },
  {
    id: 'semana',
    emoji: '📅',
    titulo: 'Como costuma ser sua semana?',
    subtitulo: 'Seja honesto — não tem resposta errada.',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'tranquila', label: 'Tranquila', emoji: '😌', desc: 'Consigo respirar' },
      { valor: 'corrida', label: 'Corrida', emoji: '🏃', desc: 'Sempre tem coisa' },
      { valor: 'caotica', label: 'Caótica', emoji: '🌪️', desc: 'Difícil de controlar' },
    ],
  },
  {
    id: 'energia',
    emoji: '⚡',
    titulo: 'Quando você tem mais energia?',
    subtitulo: 'Vou sugerir seus blocos de foco nesse horário.',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'manha', label: 'Manhã', emoji: '🌅', desc: 'Acordo disposto' },
      { valor: 'tarde', label: 'Tarde', emoji: '☀️', desc: 'Produtivo pós-almoço' },
      { valor: 'noite', label: 'Noite', emoji: '🌙', desc: 'Rendo mais tarde' },
    ],
  },
  {
    id: 'problema',
    emoji: '🎯',
    titulo: 'O que mais te atrapalha no dia a dia?',
    subtitulo: 'Vou focar especialmente nisso.',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'procrastinacao', label: 'Procrastinação', emoji: '😅' },
      { valor: 'muitas_tarefas', label: 'Muitas tarefas', emoji: '📋' },
      { valor: 'foco', label: 'Falta de foco', emoji: '🧠' },
      { valor: 'imprevistos', label: 'Imprevistos', emoji: '🔥' },
    ],
  },
  {
    id: 'objetivo',
    emoji: '🏆',
    titulo: 'O que você quer melhorar com o Fluxo?',
    subtitulo: 'Seu objetivo vai guiar todas as minhas sugestões.',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'produtividade', label: 'Produtividade', emoji: '⚡' },
      { valor: 'estudos', label: 'Estudos', emoji: '📖' },
      { valor: 'saude', label: 'Saúde', emoji: '💪' },
      { valor: 'equilibrio', label: 'Equilíbrio', emoji: '⚖️' },
    ],
  },
];

export default function Onboarding({ onConcluir }) {
  const [etapa, setEtapa] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [textoNome, setTextoNome] = useState('');
  const [visivel, setVisivel] = useState(true);
  const [concluindo, setConcluindo] = useState(false);

  const pergunta = PERGUNTAS[etapa];
  const progresso = ((etapa) / PERGUNTAS.length) * 100;

  // transição suave entre etapas
  function avancarEtapa(novasRespostas) {
    setVisivel(false);
    setTimeout(() => {
      const proxima = etapa + 1;
      if (proxima >= PERGUNTAS.length) {
        setConcluindo(true);
        setTimeout(() => onConcluir(novasRespostas), 1800);
      } else {
        setEtapa(proxima);
        setVisivel(true);
      }
    }, 220);
  }

  function selecionarOpcao(valor) {
    const novasRespostas = { ...respostas, [pergunta.id]: valor };
    setRespostas(novasRespostas);
    avancarEtapa(novasRespostas);
  }

  function confirmarNome() {
    const nome = textoNome.trim();
    if (!nome) return;
    const novasRespostas = { ...respostas, nome };
    setRespostas(novasRespostas);
    avancarEtapa(novasRespostas);
  }

  if (concluindo) {
    return <TelaConclusao nome={respostas.nome} />;
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center px-5">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
          <Waves size={14} className="text-amber-500" />
        </div>
        <span className="font-titulo font-bold text-lg text-white">Fluxo</span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full max-w-sm mb-10">
        <div className="h-0.5 bg-[#1e1e28] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="text-xs text-zinc-600 mt-2 text-right">
          {etapa + 1} de {PERGUNTAS.length}
        </p>
      </div>

      {/* Conteúdo da pergunta */}
      <div
        className="w-full max-w-sm transition-all duration-220"
        style={{
          opacity: visivel ? 1 : 0,
          transform: visivel ? 'translateY(0)' : 'translateY(12px)',
        }}
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-5 select-none">{pergunta.emoji}</div>
          <h2 className="font-titulo font-bold text-2xl text-white leading-tight mb-2">
            {pergunta.titulo}
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">{pergunta.subtitulo}</p>
        </div>

        {/* Input de texto (nome) */}
        {pergunta.tipo === 'texto' && (
          <div className="space-y-3">
            <input
              type="text"
              value={textoNome}
              onChange={(e) => setTextoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmarNome()}
              placeholder={pergunta.placeholder}
              autoFocus
              className="w-full bg-[#16161d] border border-[#1e1e28] focus:border-amber-500/50 rounded-2xl px-5 py-4 text-white placeholder-zinc-600 outline-none transition-all duration-200 text-base font-corpo focus:shadow-[0_0_0_3px_rgba(245,158,11,0.1)]"
            />
            <button
              onClick={confirmarNome}
              disabled={!textoNome.trim()}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-[#1e1e28] disabled:text-zinc-600 text-black disabled:cursor-not-allowed font-semibold rounded-2xl py-4 transition-all duration-150 active:scale-95"
            >
              Continuar
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Opções */}
        {pergunta.tipo === 'opcoes' && (
          <div className={`grid gap-3 ${pergunta.opcoes.length === 4 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {pergunta.opcoes.map((opcao) => (
              <button
                key={opcao.valor}
                onClick={() => selecionarOpcao(opcao.valor)}
                className="group relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border border-[#1e1e28] bg-[#16161d] hover:border-amber-500/40 hover:bg-amber-500/5 transition-all duration-150 active:scale-95 text-center"
              >
                <span className="text-2xl select-none">{opcao.emoji}</span>
                <span className="text-sm font-semibold text-white font-titulo">{opcao.label}</span>
                {opcao.desc && (
                  <span className="text-[11px] text-zinc-500">{opcao.desc}</span>
                )}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at center, rgba(245,158,11,0.04), transparent 70%)' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dots de progresso */}
      <div className="flex gap-1.5 mt-10">
        {PERGUNTAS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === etapa ? 20 : 6,
              height: 6,
              background: i === etapa ? '#f59e0b' : i < etapa ? 'rgba(245,158,11,0.4)' : '#1e1e28',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TelaConclusao({ nome }) {
  const [scale, setScale] = useState(0.8);
  useEffect(() => { setTimeout(() => setScale(1), 50); }, []);

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center px-5">
      <div
        className="text-center transition-all duration-500"
        style={{ transform: `scale(${scale})`, opacity: scale }}
      >
        <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6"
          style={{ boxShadow: '0 0 40px rgba(245,158,11,0.2)' }}>
          <Check size={32} className="text-amber-400" strokeWidth={2.5} />
        </div>
        <h2 className="font-titulo font-bold text-3xl text-white mb-3">
          Tudo certo{nome ? `, ${nome}` : ''}!
        </h2>
        <p className="text-zinc-400 text-base leading-relaxed">
          Seu perfil está pronto.<br />Entrando no Fluxo...
        </p>
        <div className="mt-6 flex justify-center">
          <div className="w-6 h-6">
            <svg className="loading-ring w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeDasharray="40 20" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
