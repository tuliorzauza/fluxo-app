/**
 * QueroFazer.jsx — Aba "Quero Fazer": banco de desejos para os momentos livres.
 *
 * O usuário lista coisas que gostaria de fazer quando sobrar um tempo. A Flora
 * também adiciona itens a partir das conversas. O card "Momentos livres" cruza
 * essa lista com os gaps da agenda e sugere o que cabe no horário/duração.
 *
 * Sem culpa, sem cobrança: é uma coleção de possibilidades, não uma to-do list.
 */
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Sparkles, MessageSquare, Minus } from 'lucide-react';
import { hojeYMD } from '../utils/planoUtils';
import { calcSemana, toYMD } from '../utils/calendarUtils';

export const CATEGORIAS_QF = {
  aprendizado: { label: 'Aprender', emoji: '📚' },
  lazer:       { label: 'Lazer',    emoji: '🎬' },
  corpo:       { label: 'Corpo',    emoji: '🏃' },
  criativo:    { label: 'Criativo', emoji: '🎨' },
  social:      { label: 'Social',   emoji: '👥' },
  descanso:    { label: 'Descanso', emoji: '😌' },
  outro:       { label: 'Outro',    emoji: '✨' },
};

export const PERIODOS_QF = {
  qualquer: 'Qualquer hora',
  manha:    'Manhã',
  tarde:    'Tarde',
  noite:    'Noite',
};

const DURACOES = [
  { min: 15,  label: '15 min' },
  { min: 30,  label: '30 min' },
  { min: 60,  label: '1h' },
  { min: 120, label: '2h+' },
];

const EXEMPLOS = [
  { titulo: 'Ler um livro',              categoria: 'aprendizado', duracaoMin: 30,  periodo: 'qualquer' },
  { titulo: 'Caminhar',                  categoria: 'corpo',       duracaoMin: 20,  periodo: 'qualquer' },
  { titulo: 'Aprender um instrumento',   categoria: 'criativo',    duracaoMin: 30,  periodo: 'qualquer' },
  { titulo: 'Ver um filme de repertório',categoria: 'lazer',       duracaoMin: 90,  periodo: 'noite' },
];

function fmtDur(min) {
  if (!min) return null;
  if (min >= 60) return min % 60 ? `${Math.floor(min / 60)}h${min % 60}` : `${min / 60}h`;
  return `${min}min`;
}

// ── Formulário de adição (inline, baixo atrito) ───────────────────────────────
function FormAdicionar({ onAdicionar, onCancelar }) {
  const [titulo, setTitulo] = useState('');
  const [duracaoMin, setDuracao] = useState(30);
  const [periodo, setPeriodo] = useState('qualquer');
  const [categoria, setCategoria] = useState('outro');

  const salvar = () => {
    if (!titulo.trim()) return;
    onAdicionar({ titulo: titulo.trim(), duracaoMin, periodo, categoria });
    setTitulo('');
  };

  return (
    <div className="card space-y-3">
      <input
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && salvar()}
        placeholder="O que você quer fazer quando tiver tempo?"
        className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40"
      />

      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5 font-titulo">Quanto tempo precisa</p>
        <div className="flex gap-1.5">
          {DURACOES.map((d) => (
            <button key={d.min} onClick={() => setDuracao(d.min)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={duracaoMin === d.min
                ? { background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)', color: '#f59e0b' }
                : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5 font-titulo">Melhor período</p>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(PERIODOS_QF).map(([id, label]) => (
            <button key={id} onClick={() => setPeriodo(id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={periodo === id
                ? { background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)', color: '#f59e0b' }
                : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5 font-titulo">Categoria</p>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(CATEGORIAS_QF).map(([id, c]) => (
            <button key={id} onClick={() => setCategoria(id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={categoria === id
                ? { background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)', color: '#f59e0b' }
                : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-0.5">
        <button onClick={salvar} disabled={!titulo.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-titulo transition-all active:scale-95 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' }}>
          Adicionar
        </button>
        <button onClick={onCancelar}
          className="px-4 py-2.5 rounded-xl text-sm text-zinc-400 bg-white/5 hover:bg-white/10 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Item da lista ─────────────────────────────────────────────────────────────
function ItemQF({ item, feitoSemana, feitoHoje, onConcluir, onRemover }) {
  const cat = CATEGORIAS_QF[item.categoria] || CATEGORIAS_QF.outro;
  const dur = fmtDur(item.duracaoMin);
  const periodo = item.periodo && item.periodo !== 'qualquer' ? PERIODOS_QF[item.periodo] : null;
  const podeDecrementar = feitoHoje > 0;

  return (
    <div className="card !py-3 flex items-center gap-3 group">
      <span className="text-xl flex-shrink-0">{cat.emoji}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium leading-tight truncate">{item.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {dur && <span className="text-[10px] text-zinc-500">⏱ {dur}</span>}
          {periodo && <span className="text-[10px] text-zinc-500">· {periodo}</span>}
          {feitoSemana > 0 && (
            <span className="text-[10px] text-emerald-500/80">· {feitoSemana}× essa semana</span>
          )}
        </div>
      </div>

      {/* Contador diário: − N + */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onConcluir(item.id, -1)}
          disabled={!podeDecrementar}
          title="Tirar um"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-25"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Minus size={11} className="text-zinc-400" />
        </button>

        <span
          className="w-6 text-center font-titulo font-bold text-sm leading-none"
          style={{ color: feitoHoje > 0 ? '#4ade80' : '#52525b' }}>
          {feitoHoje}
        </span>

        <button
          onClick={() => onConcluir(item.id, +1)}
          title="Marcar mais uma vez"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
          style={feitoHoje > 0
            ? { background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)' }
            : { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <Plus size={11} className="text-emerald-400" />
        </button>
      </div>

      <button onClick={() => onRemover(item.id)} title="Remover da lista"
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Aba principal ─────────────────────────────────────────────────────────────
export default function QueroFazer({ queroFazer = [], onAdicionar, onConcluir, onRemover, onAbrirChat }) {
  const [adicionando, setAdicionando] = useState(false);
  const lista = queroFazer || [];
  const hoje = hojeYMD();
  const setSemana = useMemo(() => new Set(calcSemana(0).map(toYMD)), []);

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Sparkles size={16} className="text-amber-500" />
        </div>
        <div>
          <h2 className="font-titulo font-bold text-white text-lg leading-none">Quero Fazer</h2>
          <p className="text-[11px] text-zinc-500 mt-1">Pra quando sobrar um tempo — sem pressão</p>
        </div>
      </div>

      {/* Form ou botão de adicionar */}
      {adicionando ? (
        <FormAdicionar
          onAdicionar={(item) => { onAdicionar(item); setAdicionando(false); }}
          onCancelar={() => setAdicionando(false)}
        />
      ) : (
        <button
          onClick={() => setAdicionando(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold font-titulo transition-all active:scale-[0.98]"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
        >
          <Plus size={16} /> Adicionar algo que queira fazer
        </button>
      )}

      {/* Lista ou empty state */}
      {lista.length > 0 ? (
        <div className="space-y-2">
          {lista.map((item) => {
            // Suporta dois formatos: array legado [...datas] e objeto { data: count }
            let feitoEm = item.feitoEm || {};
            if (Array.isArray(feitoEm)) {
              const counts = {};
              feitoEm.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
              feitoEm = counts;
            }
            const feitoHoje = feitoEm[hoje] || 0;
            const feitoSemana = Object.entries(feitoEm)
              .filter(([d]) => setSemana.has(d))
              .reduce((s, [, v]) => s + v, 0);
            return (
              <ItemQF
                key={item.id}
                item={item}
                feitoSemana={feitoSemana}
                feitoHoje={feitoHoje}
                onConcluir={onConcluir}
                onRemover={onRemover}
              />
            );
          })}
        </div>
      ) : !adicionando && (
        <div className="text-center pt-6 pb-2 px-4">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Sua lista de possibilidades começa aqui.
          </p>
          <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
            Quando você tiver um tempo livre, a Flora vai sugerir algo daqui — em vez
            de você cair no feed sem querer.
          </p>

          {/* Exemplos pra tocar e adicionar */}
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-6 mb-2.5 font-titulo">Toque pra começar</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {EXEMPLOS.map((ex, i) => (
              <button key={i} onClick={() => onAdicionar(ex)}
                className="px-3 py-1.5 rounded-full text-xs text-zinc-300 transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {CATEGORIAS_QF[ex.categoria].emoji} {ex.titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dica: a Flora também anota */}
      {lista.length > 0 && (
        <button
          onClick={onAbrirChat}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-colors hover:bg-white/[0.03]"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <MessageSquare size={14} className="text-zinc-500 flex-shrink-0" />
          <span className="text-xs text-zinc-500 leading-snug">
            Pode contar pra Flora também — "queria voltar a desenhar" e ela anota aqui.
          </span>
        </button>
      )}
    </div>
  );
}
