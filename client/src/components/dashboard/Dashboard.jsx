import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import EstadoSemana        from '../EstadoSemana';
import NextActionCard      from '../NextActionCard';
import WeekView            from '../WeekView';
import TaskList            from '../TaskList';
import DiagnosticCard      from '../DiagnosticCard';
import SuggestionCard      from '../SuggestionCard';
import GamificacaoCard     from '../gamificacao/GamificacaoCard';
import BadgesScreen        from '../gamificacao/BadgesScreen';
import HistoricoPontos     from '../gamificacao/HistoricoPontos';
import MicrointervalosCard from './MicrointervalosCard';
import { calcularScore, getCompromissosDoDia, hojeYMD } from '../../utils/planoUtils';

export default function Dashboard({
  plano,
  gamificacao,
  perfil,
  modoCaos = false,
  memoria,
  onToggleTarefa,
  onEditarItem,
  onDeletarItem,
  onAdicionarCompromisso,
  onVerPlano,
}) {
  const [mostrarSemana, setMostrarSemana] = useState(true);
  const [modal, setModal] = useState(null); // 'conquistas' | 'historico'

  if (!plano && !gamificacao?.pontos) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
        <div className="text-4xl mb-4">📅</div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Seu plano semanal vai aparecer aqui depois que a Flora organizar suas informações.
        </p>
        <p className="text-zinc-600 text-xs mt-2">Conta pra ela o que você tem pela frente →</p>
      </div>
    );
  }

  const planoComScore = plano ? calcularScore(plano) : null;
  const diagnostico   = planoComScore?.diagnostico || null;

  // Filtragem centralizada — calculada UMA vez e distribuída para todos os cards
  const hoje = hojeYMD();
  const compromissosDoDia = planoComScore ? getCompromissosDoDia(planoComScore, hoje) : [];

  // No Modo Caos: mostra apenas TaskList filtrada com máx 3 itens
  if (modoCaos && planoComScore) {
    const tarefasCaos = (planoComScore.tarefas || [])
      .filter(t => !t.concluida)
      .slice(0, 3);

    return (
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="rounded-2xl p-3 text-center"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <p className="text-xs text-violet-300 leading-relaxed">
            🌀 Foco total. Só o essencial do dia aparece aqui.
          </p>
        </div>
        <TaskList
          tarefas={tarefasCaos}
          compromissos={[]}
          compromissosDoDia={[]}
          onToggle={onToggleTarefa}
        />
        <p className="text-center text-[11px] text-zinc-700 pt-2">
          Fluxo · Modo Caos ativo · dados salvos localmente
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-8">

      {/* ── Card de gamificação ──────────────────────────────────────────── */}
      {gamificacao && (
        <GamificacaoCard
          gamificacao={gamificacao}
          onAbrirConquistas={() => setModal('conquistas')}
          onAbrirHistorico={ () => setModal('historico') }
        />
      )}

      {/* ── Estado da Semana + Próxima ação ─────────────────────────────── */}
      {planoComScore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EstadoSemana plano={planoComScore} onVerPlano={onVerPlano} />
          <NextActionCard plano={planoComScore} proximaAcao={planoComScore.proximaAcao} compromissosDoDia={compromissosDoDia} />
        </div>
      )}

      {/* ── Momentos livres hoje ────────────────────────────────────────── */}
      {planoComScore && (
        <MicrointervalosCard plano={planoComScore} onAbrirChat={onVerPlano} compromissosDoDia={compromissosDoDia} />
      )}

      {/* ── Visão semanal colapsável ────────────────────────────────────── */}
      {planoComScore && (
        <div>
          <button
            onClick={() => setMostrarSemana(v => !v)}
            className="w-full flex items-center justify-between px-1 py-2 mb-2 group"
          >
            <span className="font-titulo text-[11px] uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">
              Semana
            </span>
            {mostrarSemana
              ? <ChevronUp   size={13} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              : <ChevronDown size={13} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            }
          </button>
          {mostrarSemana && (
            <WeekView
              compromissos={planoComScore.compromissos || []}
              tarefas={planoComScore.tarefas || []}
              onToggleTarefa={onToggleTarefa}
              onEditarItem={onEditarItem}
              onDeletarItem={onDeletarItem}
              onAdicionarCompromisso={onAdicionarCompromisso}
            />
          )}
        </div>
      )}

      {planoComScore && (
        <>
          <TaskList
            tarefas={planoComScore.tarefas || []}
            compromissos={planoComScore.compromissos || []}
            compromissosDoDia={compromissosDoDia}
            onToggle={onToggleTarefa}
          />
          <DiagnosticCard diagnostico={diagnostico} />
          <SuggestionCard sugestao={planoComScore.sugestaoPratica} />
        </>
      )}

      <p className="text-center text-[11px] text-zinc-700 pt-2">
        Fluxo · ecossistema Tempo · dados salvos localmente
      </p>

      {/* ── Modais ──────────────────────────────────────────────────────── */}
      {modal === 'conquistas' && (
        <BadgesScreen
          badges={gamificacao?.badges || []}
          onFechar={() => setModal(null)}
        />
      )}
      {modal === 'historico' && (
        <HistoricoPontos
          historico={gamificacao?.historicoPontos || []}
          pontosTotal={gamificacao?.pontos || 0}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  );
}
