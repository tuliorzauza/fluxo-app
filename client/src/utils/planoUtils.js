/**
 * planoUtils.js — Utilitários para manipulação do plano da Flora
 */

/**
 * BUG-025 — Merge defensivo de compromissos.
 * Ao aplicar novoPlano da Flora, preserva excecoes de recorrência de itens anteriores.
 * Evita que a Flora "esqueça" de retornar uma excecao e ressuscite um evento cancelado.
 *
 * Regra: excecoes = union(excecoes_anteriores, excecoes_novas)
 * Outros campos: prevalece sempre o novoPlano (Flora é fonte de verdade para conteúdo).
 */
export function mergeCompromissos(anteriores, novos) {
  if (!novos) return anteriores || [];

  const mapaAnteriores = new Map((anteriores || []).map(c => [c.id, c]));

  return novos.map(novoComp => {
    const anterior = mapaAnteriores.get(novoComp.id);
    if (!anterior || !novoComp.recorrencia) return novoComp;

    // Unifica excecoes: preserva as anteriores caso Flora tenha omitido alguma
    const excecoesAnteriores = anterior.recorrencia?.excecoes || [];
    const excecoesNovas = novoComp.recorrencia?.excecoes || [];
    const excecoesUnificadas = [...new Set([...excecoesAnteriores, ...excecoesNovas])];

    if (excecoesUnificadas.length === excecoesNovas.length) return novoComp; // nenhuma perda

    return {
      ...novoComp,
      recorrencia: {
        ...novoComp.recorrencia,
        excecoes: excecoesUnificadas,
      },
    };
  });
}

export function calcularScore(plano) {
  if (!plano?.tarefas || plano.tarefas.length === 0) return plano;
  const total = plano.tarefas.length;
  const concluidas = plano.tarefas.filter(t => t.concluida).length;
  const bonus = Math.round((concluidas / total) * 20);
  const base = plano.diagnostico?.scoreTempoLivre || 50;
  return {
    ...plano,
    diagnostico: { ...plano.diagnostico, scoreTempoLivre: Math.min(100, base + bonus) },
  };
}

export function preservarEstadosTarefas(anteriores, novas) {
  if (!anteriores || !novas) return novas || [];

  // Dedup primário por ID
  const porId = new Map(novas.map(t => [t.id, t]));

  // Dedup secundário por titulo+prazo — elimina duplicatas geradas quando Flora
  // cria novo ID para a versão atualizada mas deixa o original no array.
  // Preferência: versão COM hora (mais completa), independente da ordem no array.
  const porChave = new Map();
  porId.forEach(t => {
    const chave = (t.titulo || '').toLowerCase().trim() + '|' + (t.prazo || '');
    const existente = porChave.get(chave);
    if (!existente || (t.hora && !existente.hora)) {
      porChave.set(chave, t);
    }
  });

  const novasUnicas = Array.from(porChave.values());

  // Preserva estado concluida do plano anterior pelo ID original
  const snap = {};
  anteriores.forEach(t => { snap[t.id] = t.concluida; });

  // Cria também snap por titulo+prazo como fallback
  const snapPorChave = {};
  anteriores.forEach(t => {
    const chave = (t.titulo || '').toLowerCase().trim() + '|' + (t.prazo || '');
    snapPorChave[chave] = t.concluida;
  });

  return novasUnicas.map(t => {
    const chave = (t.titulo || '').toLowerCase().trim() + '|' + (t.prazo || '');
    const concluidaPorId = snap[t.id];
    const concluidaPorChave = snapPorChave[chave];
    const concluidaFinal =
      concluidaPorId !== undefined ? concluidaPorId :
      concluidaPorChave !== undefined ? concluidaPorChave :
      (t.concluida || false);
    return { ...t, concluida: concluidaFinal };
  });
}
