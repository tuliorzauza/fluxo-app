const { supabase } = require('./supabase');

async function carregarDadosUsuario(userId) {
  const [perfil, plano, memoria, historico, tarefasConcluidas] = await Promise.all([
    supabase.from('perfis').select('*').eq('id', userId).single(),
    supabase.from('planos').select('*').eq('user_id', userId).single(),
    supabase.from('memorias').select('*').eq('user_id', userId).single(),
    supabase.from('historicos').select('*').eq('user_id', userId).single(),
    supabase.from('tarefas_concluidas').select('*').eq('user_id', userId).single(),
  ]);

  return {
    perfil: perfil.data || null,
    plano: plano.data ? {
      compromissos:  plano.data.compromissos  || [],
      tarefas:       plano.data.tarefas       || [],
      diagnostico:   plano.data.diagnostico   || {},
      proximaAcao:   plano.data.proxima_acao  || null,
      sugestaoPratica: plano.data.sugestao_pratica || null,
      reorganizacoes:  plano.data.reorganizacoes  || null,
    } : null,
    memoria:          memoria.data?.dados          || null,
    historicoDisplay: historico.data?.historico_display || [],
    historicoApi:     historico.data?.historico_api     || [],
    tarefasConcluidas: tarefasConcluidas.data?.tarefa_ids || {},
  };
}

async function salvarPlano(userId, plano) {
  const { error } = await supabase.from('planos').upsert({
    user_id:          userId,
    compromissos:     plano.compromissos    || [],
    tarefas:          plano.tarefas         || [],
    diagnostico:      plano.diagnostico     || {},
    proxima_acao:     plano.proximaAcao     || null,
    sugestao_pratica: plano.sugestaoPratica || null,
    reorganizacoes:   plano.reorganizacoes  || null,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function salvarMemoria(userId, memoria) {
  const { error } = await supabase.from('memorias').upsert({
    user_id: userId,
    dados:   memoria,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function salvarHistorico(userId, historicoDisplay, historicoApi) {
  const { error } = await supabase.from('historicos').upsert({
    user_id:          userId,
    historico_display: historicoDisplay,
    historico_api:     historicoApi,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function salvarPerfil(userId, perfil) {
  const { error } = await supabase.from('perfis').upsert({
    id:                        userId,
    nome:                      perfil.nome                      || null,
    ocupacao:                  perfil.ocupacao                  || null,
    estilo:                    perfil.estilo                    || 'equilibrada',
    ritmo:                     perfil.ritmo                     || null,
    desafios:                  perfil.desafios                  || [],
    objetivos:                 perfil.objetivos                 || [],
    contador_interacoes:       perfil.contadorInteracoes        || 0,
    perguntas_profundas_feitas: perfil.perguntasProfundasFeitas || [],
  }, { onConflict: 'id' });
  if (error) throw error;
}

async function salvarTarefasConcluidas(userId, tarefaIds) {
  const { error } = await supabase.from('tarefas_concluidas').upsert({
    user_id:   userId,
    tarefa_ids: tarefaIds,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

module.exports = {
  carregarDadosUsuario,
  salvarPlano,
  salvarMemoria,
  salvarHistorico,
  salvarPerfil,
  salvarTarefasConcluidas,
};
