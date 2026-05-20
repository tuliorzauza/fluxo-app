import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Waves } from 'lucide-react';

// ─── Definição das telas ──────────────────────────────────────────────────────
const TELAS = [
  {
    id: 'nome',
    tipo: 'texto',
    emoji: '👋',
    titulo: 'Oi! Como você prefere ser chamado?',
    subtitulo: 'Vou usar seu nome pra tornar tudo mais pessoal.',
    placeholder: 'Seu nome...',
  },
  {
    id: 'ocupacao',
    tipo: 'single',
    emoji: '💼',
    titulo: 'Qual sua principal ocupação?',
    subtitulo: 'Isso me ajuda a entender seu ritmo.',
    opcoes: [
      { valor: 'estudante',    label: 'Estudante',        emoji: '📚' },
      { valor: 'profissional', label: 'Profissional CLT',  emoji: '💻' },
      { valor: 'freelancer',   label: 'Freelancer',        emoji: '🚀' },
      { valor: 'empreendedor', label: 'Empreendedor',      emoji: '🏢' },
      { valor: 'outro',        label: 'Outro',             emoji: '✨' },
    ],
  },
  {
    id: 'ritmo',
    tipo: 'single',
    emoji: '⚡',
    titulo: 'Como você prefere organizar seu tempo?',
    subtitulo: 'Isso ajuda a Flora a sugerir no seu estilo.',
    opcoes: [
      { valor: 'intenso',  label: 'Resolver tudo logo',       emoji: '🚀', desc: 'Concentro tudo pra sobrar tempo depois' },
      { valor: 'moderado', label: 'Distribuir com pausas',    emoji: '🌊', desc: 'Prefiro ir no ritmo ao longo do dia' },
      { valor: 'variavel', label: 'Depende do dia — variável', emoji: '🎲', desc: 'Adapto conforme como estou' },
    ],
  },
  {
    id: 'compromissos_fixos',
    tipo: 'compromissos_fixos',
    emoji: '📅',
    titulo: 'Você tem compromissos fixos recorrentes?',
    subtitulo: 'Aulas, turnos de trabalho, consultas semanais...',
  },
  {
    id: 'desafios',
    tipo: 'multi',
    emoji: '🎯',
    titulo: 'O que mais te atrapalha no dia a dia?',
    subtitulo: 'Pode marcar mais de um.',
    min: 1,
    opcoes: [
      { valor: 'procrastinacao',      label: 'Procrastinação',            emoji: '😅' },
      { valor: 'muitas_tarefas',      label: 'Muitas tarefas acumuladas', emoji: '📋' },
      { valor: 'foco',                label: 'Falta de foco',             emoji: '🧠' },
      { valor: 'imprevistos',         label: 'Imprevistos constantes',    emoji: '🔥' },
      { valor: 'esquecimentos',       label: 'Esqueço compromissos',      emoji: '😬' },
      { valor: 'ansiedade',           label: 'Ansiedade',                 emoji: '😰' },
      { valor: 'sobrecarga',          label: 'Sobrecarga mental',         emoji: '🤯' },
      { valor: 'dificuldade_comecar', label: 'Dificuldade de começar',    emoji: '🚫' },
    ],
  },
  {
    id: 'boas_vindas',
    tipo: 'conclusao',
    emoji: '🌿',
  },
];

// ─── Estado de texto livre por tela ──────────────────────────────────────────
const TELAS_TEXTO = ['nome'];

// ─── Componente principal ──────────────────────────────────────────────────────
export default function Onboarding({ onConcluir }) {
  const [etapa, setEtapa]         = useState(0);
  const [respostas, setRespostas] = useState({});
  const [textos, setTextos]       = useState({});  // textos livres por id de tela
  const [visivel, setVisivel]     = useState(true);
  const [direcao, setDirecao]     = useState('forward');
  const inputRef = useRef(null);

  const tela = TELAS[etapa];
  const progresso = Math.round((etapa / (TELAS.length - 1)) * 100);

  // Foca no campo de texto ao entrar na tela
  useEffect(() => {
    if (tela.tipo === 'texto') setTimeout(() => inputRef.current?.focus(), 260);
  }, [etapa, tela.tipo]);

  // ── Animação de transição ──────────────────────────────────────────────
  const ir = (proxima) => {
    setDirecao(proxima > etapa ? 'forward' : 'back');
    setVisivel(false);
    setTimeout(() => { setEtapa(proxima); setVisivel(true); }, 200);
  };

  const avancar = () => { if (etapa < TELAS.length - 1) ir(etapa + 1); };
  const voltar  = () => { if (etapa > 0) ir(etapa - 1); };

  // ── Validação ────────────────────────────────────────────────────────
  const podeAvancar = () => {
    if (tela.tipo === 'texto')     return (textos['nome'] || '').trim().length > 0;
    if (tela.tipo === 'single')    return !!respostas[tela.id];
    if (tela.tipo === 'multi')     return (respostas[tela.id]?.length || 0) >= (tela.min || 1);
    if (tela.tipo === 'conclusao') return true;
    if (tela.tipo === 'compromissos_fixos') {
      if (!respostas[tela.id]) return false;
      if (respostas[tela.id] === 'sim') return (textos['compromissosFixos'] || '').trim().length > 0;
      return true;
    }
    return false;
  };

  // ── Seleção ────────────────────────────────────────────────────────────
  const selecionarSingle = (valor) => setRespostas(r => ({ ...r, [tela.id]: valor }));

  const toggleMulti = (valor) => {
    setRespostas(r => {
      const atual = r[tela.id] || [];
      if (atual.includes(valor)) {
        return { ...r, [tela.id]: atual.filter(v => v !== valor) };
      }
      if (tela.max && atual.length >= tela.max) return r;
      return { ...r, [tela.id]: [...atual, valor] };
    });
  };

  const setTexto = (id, val) => setTextos(t => ({ ...t, [id]: val }));

  // ── Avançar com Enter no campo de texto ───────────────────────────────
  const handleNomeKeyDown = (e) => {
    if (e.key === 'Enter' && (textos['nome'] || '').trim()) avancar();
  };

  // ── Conclusão ─────────────────────────────────────────────────────────
  const concluir = () => {
    const cfixos = respostas['compromissos_fixos'];
    const perfilFinal = {
      ...respostas,
      compromissosFixos: cfixos === 'nao'
        ? { temFixos: false, descricao: '' }
        : cfixos === 'sim'
        ? { temFixos: true, descricao: (textos['compromissosFixos'] || '').trim() }
        : null,
      nome: (textos['nome'] || '').trim(),
      profundo: {
        areasImportantes:   [],
        objetivoUmAno:      '',
        sonhoGrande:        '',
        maiorMedo:          '',
        estadoAtual:        '',
        respostasProfundas: [],
      },
      historicoEmocional: { notasFlora: [] },
      dataInicio:  new Date().toISOString(),
      contadorInteracoes: 0,
      perguntasProfundasFeitas: [],
    };
    onConcluir(perfilFinal);
  };

  // Offset de animação
  const tx = visivel ? 0 : direcao === 'forward' ? -24 : 24;

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col select-none overflow-hidden">
      {/* Logo */}
      <div className="flex items-center justify-center pt-8 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <Waves size={13} className="text-amber-500" />
          </div>
          <span className="font-titulo font-bold text-base text-white">Fluxo</span>
        </div>
      </div>

      {/* Progresso */}
      <div className="px-6 pt-3 pb-1 flex-shrink-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-zinc-600 font-titulo uppercase tracking-widest">
            {etapa + 1} / {TELAS.length}
          </span>
          <span className="text-[10px] text-zinc-600">{progresso}%</span>
        </div>
        <div className="h-0.5 bg-[#1e1e28] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progresso}%`, background: 'linear-gradient(90deg,#d97706,#f59e0b)' }} />
        </div>
      </div>

      {/* Conteúdo animado */}
      <div
        className="flex-1 flex flex-col px-5 pt-4 pb-2 overflow-y-auto transition-all"
        style={{ opacity: visivel ? 1 : 0, transform: `translateX(${tx}px)`, transitionDuration: '200ms', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
      >
        {tela.tipo === 'conclusao' ? (
          <TelaConclusao nome={(textos['nome'] || '').trim()} onEntrar={concluir} onVoltar={voltar} />
        ) : (
          <>
            {/* Cabeçalho */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">{tela.emoji}</div>
              <h2 className="font-titulo font-bold text-xl text-white leading-tight mb-1.5">{tela.titulo}</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">{tela.subtitulo}</p>
              {tela.tipo === 'multi' && (
                <p className="text-xs mt-1" style={{ color: (respostas[tela.id]?.length || 0) >= (tela.min || 1) ? '#f59e0b' : '#52525b' }}>
                  {tela.max
                    ? `${respostas[tela.id]?.length || 0} de ${tela.max} selecionado(s)`
                    : `${respostas[tela.id]?.length || 0} selecionado(s)`}
                </p>
              )}
            </div>

            {/* Texto curto (nome) */}
            {tela.tipo === 'texto' && (
              <input ref={inputRef} type="text"
                value={textos['nome'] || ''} onChange={e => setTexto('nome', e.target.value)}
                onKeyDown={handleNomeKeyDown} placeholder={tela.placeholder}
                className="w-full bg-[#16161d] border border-[#1e1e28] focus:border-amber-500/50 rounded-2xl px-5 py-4 text-white placeholder-zinc-600 outline-none text-base font-corpo transition-all"
                style={{ boxShadow: textos['nome'] ? '0 0 0 3px rgba(245,158,11,0.1)' : 'none' }}
              />
            )}

            {/* Single select */}
            {tela.tipo === 'single' && (
              <div className={`grid gap-2 ${tela.opcoes.length <= 3 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {tela.opcoes.map(op => {
                  const sel = respostas[tela.id] === op.valor;
                  return (
                    <button key={op.valor} onClick={() => selecionarSingle(op.valor)}
                      className="flex items-center gap-3 p-3 rounded-2xl border transition-all duration-150 active:scale-95 text-left"
                      style={{
                        background:   sel ? 'rgba(245,158,11,0.08)' : '#16161d',
                        borderColor:  sel ? 'rgba(245,158,11,0.38)' : 'rgba(255,255,255,0.05)',
                        boxShadow:    sel ? 'inset 0 0 0 1px rgba(245,158,11,0.12)' : 'none',
                      }}>
                      <span className="text-2xl flex-shrink-0">{op.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold font-titulo leading-tight ${sel ? 'text-amber-400' : 'text-white'}`}>{op.label}</p>
                        {op.desc && <p className="text-[11px] text-zinc-500 mt-0.5">{op.desc}</p>}
                      </div>
                      {sel && <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <Check size={11} className="text-black" strokeWidth={3} />
                      </div>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Compromissos fixos */}
            {tela.tipo === 'compromissos_fixos' && (
              <div className="flex flex-col gap-3">
                {[
                  { valor: 'sim', label: 'Sim, tenho', emoji: '📌' },
                  { valor: 'nao', label: 'Não tenho', emoji: '🆓' },
                ].map(op => {
                  const sel = respostas[tela.id] === op.valor;
                  return (
                    <button key={op.valor} onClick={() => selecionarSingle(op.valor)}
                      className="flex items-center gap-3 p-3 rounded-2xl border transition-all duration-150 active:scale-95 text-left"
                      style={{
                        background:  sel ? 'rgba(245,158,11,0.08)' : '#16161d',
                        borderColor: sel ? 'rgba(245,158,11,0.38)' : 'rgba(255,255,255,0.05)',
                        boxShadow:   sel ? 'inset 0 0 0 1px rgba(245,158,11,0.12)' : 'none',
                      }}>
                      <span className="text-2xl flex-shrink-0">{op.emoji}</span>
                      <p className={`text-sm font-semibold font-titulo ${sel ? 'text-amber-400' : 'text-white'}`}>{op.label}</p>
                      {sel && <div className="ml-auto w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <Check size={11} className="text-black" strokeWidth={3} />
                      </div>}
                    </button>
                  );
                })}
                {respostas[tela.id] === 'sim' && (
                  <textarea
                    value={textos['compromissosFixos'] || ''}
                    onChange={e => setTexto('compromissosFixos', e.target.value)}
                    placeholder="Ex: Academia seg/qua/sex 18h, Trabalho seg-sex 9h-18h..."
                    rows={3}
                    className="w-full bg-[#16161d] border border-[#1e1e28] focus:border-amber-500/50 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 outline-none text-sm font-corpo transition-all resize-none"
                    style={{ boxShadow: (textos['compromissosFixos'] || '').trim() ? '0 0 0 3px rgba(245,158,11,0.1)' : 'none' }}
                  />
                )}
              </div>
            )}

            {/* Multi select */}
            {tela.tipo === 'multi' && (
              <div className="grid grid-cols-2 gap-2">
                {tela.opcoes.map(op => {
                  const sel = (respostas[tela.id] || []).includes(op.valor);
                  const noMax = tela.max && (respostas[tela.id]?.length || 0) >= tela.max && !sel;
                  return (
                    <button key={op.valor} onClick={() => !noMax && toggleMulti(op.valor)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 active:scale-95 text-center"
                      style={{
                        background:  sel ? 'rgba(245,158,11,0.08)' : '#16161d',
                        borderColor: sel ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.05)',
                        opacity:     noMax ? 0.4 : 1,
                        cursor:      noMax ? 'not-allowed' : 'pointer',
                      }}>
                      <div className="relative">
                        <span className="text-xl">{op.emoji}</span>
                        {sel && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                          <Check size={9} className="text-black" strokeWidth={3} />
                        </div>}
                      </div>
                      <span className={`text-xs font-medium leading-tight ${sel ? 'text-amber-400' : 'text-zinc-300'}`}>{op.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Botões de navegação */}
      {tela.tipo !== 'conclusao' && (
        <div className="px-5 pb-7 pt-3 flex-shrink-0 flex items-center gap-2.5">
          {/* Botão voltar */}
          {etapa > 0
            ? <button onClick={voltar}
                className="w-11 h-11 rounded-2xl border border-white/[0.07] bg-white/[0.03] flex items-center justify-center transition-all hover:bg-white/[0.06] active:scale-95">
                <ArrowLeft size={17} className="text-zinc-400" />
              </button>
            : <div className="w-11" />
          }

          {/* Botão avançar */}
          <button onClick={avancar} disabled={!podeAvancar()}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl font-semibold text-sm transition-all duration-150 active:scale-95"
            style={{
              background: podeAvancar() ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#1e1e28',
              color:      podeAvancar() ? '#000' : '#52525b',
              boxShadow:  podeAvancar() ? '0 4px 16px rgba(245,158,11,0.25)' : 'none',
            }}>
            Continuar <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tela de conclusão ────────────────────────────────────────────────────────
function TelaConclusao({ nome, onEntrar, onVoltar }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-7 animate-pop"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 0 48px rgba(245,158,11,0.15)' }}>
        <span className="text-4xl">🌿</span>
      </div>
      <h2 className="font-titulo font-bold text-3xl text-white mb-3 leading-tight">
        Tudo pronto{nome ? `,\n${nome.split(' ')[0]}` : ''}!
      </h2>
      <p className="text-zinc-400 text-sm leading-relaxed mb-10 max-w-xs">
        A Flora já tem tudo que precisa pra te ajudar de verdade — não só com tarefas, mas com o que importa pra você.
      </p>
      <button onClick={onEntrar}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base text-black transition-all duration-150 active:scale-95"
        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 6px 24px rgba(245,158,11,0.3)' }}>
        Entrar no Fluxo <Waves size={17} />
      </button>
      <button onClick={onVoltar} className="mt-4 text-sm text-zinc-600 hover:text-zinc-400 transition-colors py-2">
        ← Voltar e ajustar respostas
      </button>
    </div>
  );
}
