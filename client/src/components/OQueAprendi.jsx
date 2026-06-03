/**
 * OQueAprendi.jsx — "O que a Flora aprendeu sobre você"
 *
 * Tela de valor: mostra, de forma calorosa e organizada, o que a Flora já
 * entendeu do usuário a partir da memória estruturada (objeto `memoria`).
 * Só lê dados que já existem — nada é enviado a lugar nenhum.
 */
import React from 'react';
import { X, Sparkles } from 'lucide-react';

// Normaliza para array (campos podem vir como string/null do banco)
const arr = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [String(v)] : []);
const tem = (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);

function Chips({ itens }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {itens.map((t, i) => (
        <span
          key={i}
          className="px-2.5 py-1 rounded-full text-[12px] text-zinc-300"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}
        >
          {typeof t === 'string' ? t : JSON.stringify(t)}
        </span>
      ))}
    </div>
  );
}

function Campo({ label, valor }) {
  if (!tem(valor)) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[12px] text-zinc-500 flex-shrink-0">{label}</span>
      <span className="text-[13px] text-zinc-200 text-right">{valor}</span>
    </div>
  );
}

function Secao({ icon, titulo, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base leading-none">{icon}</span>
        <h3 className="font-titulo font-semibold text-white text-sm">{titulo}</h3>
      </div>
      {children}
    </div>
  );
}

export default function OQueAprendi({ memoria, perfil, onFechar }) {
  const m = memoria || {};
  const secoes = [];

  // ── Sobre você ───────────────────────────────────────────────────────────
  const id = m.identidade || {};
  const nome = id.nome || perfil?.nome;
  if (tem(nome) || tem(id.idade) || tem(id.ocupacao || perfil?.ocupacao)) {
    secoes.push(
      <Secao key="voce" icon="🌱" titulo="Sobre você">
        <Campo label="Nome" valor={nome} />
        <Campo label="Idade" valor={id.idade ? `${id.idade} anos` : null} />
        <Campo label="Ocupação" valor={id.ocupacao || perfil?.ocupacao} />
      </Secao>
    );
  }

  // ── Trabalho ─────────────────────────────────────────────────────────────
  const t = m.trabalho || {};
  if (tem(t.horarioEntrada) || tem(t.horarioSaida) || tem(t.localizacao) || tem(t.tempoDeslocamentoIda)) {
    secoes.push(
      <Secao key="trabalho" icon="💼" titulo="Trabalho">
        <Campo label="Horário" valor={[t.horarioEntrada, t.horarioSaida].filter(Boolean).join(' – ')} />
        <Campo label="Local" valor={t.localizacao} />
        <Campo label="Deslocamento (ida)" valor={t.tempoDeslocamentoIda ? `${t.tempoDeslocamentoIda} min` : null} />
        <Campo label="Transporte" valor={t.meioTransporteIda} />
      </Secao>
    );
  }

  // ── Moradia ──────────────────────────────────────────────────────────────
  const mo = m.moradia || {};
  if (tem(mo.cidade) || tem(mo.bairro)) {
    secoes.push(
      <Secao key="moradia" icon="🏠" titulo="Onde você mora">
        <Campo label="Cidade" valor={mo.cidade} />
        <Campo label="Bairro" valor={mo.bairro} />
        {mo.temCarroOuMoto && <Campo label="Transporte próprio" valor="Sim" />}
      </Secao>
    );
  }

  // ── Rotina e atividades ──────────────────────────────────────────────────
  const rot = m.rotina || {};
  const ativ = arr(m.atividades?.lista);
  const inegociaveis = arr(rot.comprometida);
  const ac = m.academia || {};
  if (ativ.length || inegociaveis.length || tem(rot.ritmoAceito) || tem(ac.localizacao)) {
    secoes.push(
      <Secao key="rotina" icon="🔁" titulo="Sua rotina">
        {inegociaveis.length > 0 && (
          <div className="mb-2.5">
            <p className="text-[11px] text-zinc-500 mb-1.5">Inegociáveis (a Flora nunca questiona)</p>
            <Chips itens={inegociaveis} />
          </div>
        )}
        {ativ.length > 0 && (
          <div className="mb-2.5">
            <p className="text-[11px] text-zinc-500 mb-1.5">Atividades</p>
            <Chips itens={ativ} />
          </div>
        )}
        <Campo label="Ritmo aceito" valor={rot.ritmoAceito} />
        <Campo label="Academia" valor={ac.localizacao} />
      </Secao>
    );
  }

  // ── Sono e energia ───────────────────────────────────────────────────────
  const sono = m.sono || {};
  const en = m.energia || {};
  const picos = [];
  if (en.picoManha) picos.push('manhã');
  if (en.picoTarde) picos.push('tarde');
  if (en.picoNoite) picos.push('noite');
  if (tem(sono.horarioDormir) || tem(sono.horarioAcordar) || picos.length) {
    secoes.push(
      <Secao key="energia" icon="🌙" titulo="Sono e energia">
        <Campo label="Dorme ~" valor={sono.horarioDormir} />
        <Campo label="Acorda ~" valor={sono.horarioAcordar} />
        <Campo label="Qualidade do sono" valor={sono.qualidade} />
        {picos.length > 0 && <Campo label="Pico de energia" valor={picos.join(', ')} />}
      </Secao>
    );
  }

  // ── Objetivos e sonhos ───────────────────────────────────────────────────
  const obj = m.objetivos || {};
  const metas = [...arr(obj.curto), ...arr(obj.medio), ...arr(obj.longo)];
  const sonhos = arr(obj.sonhos);
  if (metas.length || sonhos.length) {
    secoes.push(
      <Secao key="objetivos" icon="🎯" titulo="Objetivos e sonhos">
        {metas.length > 0 && (
          <div className="mb-2.5">
            <p className="text-[11px] text-zinc-500 mb-1.5">Metas</p>
            <Chips itens={metas} />
          </div>
        )}
        {sonhos.length > 0 && (
          <div>
            <p className="text-[11px] text-zinc-500 mb-1.5">Sonhos</p>
            <Chips itens={sonhos} />
          </div>
        )}
      </Secao>
    );
  }

  // ── Onde você perde tempo ────────────────────────────────────────────────
  const perda = arr(m.perdaTempo?.identificados);
  if (perda.length) {
    secoes.push(
      <Secao key="perda" icon="⏳" titulo="Onde o tempo escapa">
        <Chips itens={perda} />
      </Secao>
    );
  }

  // ── Pessoas importantes ──────────────────────────────────────────────────
  const pessoas = arr(m.pessoasImportantes?.lista);
  if (pessoas.length) {
    secoes.push(
      <Secao key="pessoas" icon="💛" titulo="Pessoas importantes">
        <Chips itens={pessoas} />
      </Secao>
    );
  }

  // ── Notas soltas ─────────────────────────────────────────────────────────
  const notas = arr(m.notas).slice(-8);
  if (notas.length) {
    secoes.push(
      <Secao key="notas" icon="📝" titulo="Outras coisas que ela notou">
        <ul className="space-y-1.5">
          {notas.map((n, i) => (
            <li key={i} className="text-[13px] text-zinc-300 leading-snug flex gap-2">
              <span className="text-amber-500/60 flex-shrink-0">•</span>
              <span>{typeof n === 'string' ? n : JSON.stringify(n)}</span>
            </li>
          ))}
        </ul>
      </Secao>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
        style={{ background: '#0f0f13', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), transparent)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-amber-500" />
            </div>
            <div>
              <h2 className="font-titulo font-bold text-white text-base leading-tight">O que aprendi sobre você</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">A Flora guarda entendimento, não conversas</p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {secoes.length > 0 ? (
            secoes
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="text-4xl mb-4">🌱</div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                A Flora ainda está te conhecendo.
              </p>
              <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                Quanto mais você conversa com ela sobre sua rotina, seus objetivos e o
                que te trava, mais ela aprende — e isso aparece aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
