const { supabase } = require('./supabase');

async function carregarDadosUsuario(userId) {
  // maybeSingle(): retorna data:null sem erro quando não há linha (usuário novo).
  // single() gerava erro PGRST116 ruidoso a cada primeiro acesso.
  const [perfil, plano, memoria, historico, tarefasConcluidas] = await Promise.all([
    supabase.from('perfis').select('*').eq('id', userId).maybeSingle(),
    supabase.from('planos').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('memorias').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('historicos').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('tarefas_concluidas').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  console.log('[LOAD] Dados encontrados para userId:', userId, {
    temPerfil: !!perfil.data,
    temPlano: !!plano.data,
    temMemoria: !!memoria.data,
    erros: [perfil.error?.message, plano.error?.message, memoria.error?.message].filter(Boolean),
  });

  return {
    perfil: perfil.data || null,
    plano: plano.data ? {
      compromissos:  plano.data.compromissos  || [],
      tarefas:       plano.data.tarefas       || [],
      queroFazer:    plano.data.quero_fazer   || [],
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
  console.log('[SAVE PLANO] userId:', userId);
  console.log('[SAVE PLANO] plano keys:', Object.keys(plano || {}));
  const payload = {
    user_id:          userId,
    compromissos:     plano.compromissos    || [],
    tarefas:          plano.tarefas         || [],
    quero_fazer:      plano.queroFazer      || [],
    diagnostico:      plano.diagnostico     || {},
    proxima_acao:     plano.proximaAcao     || null,
    sugestao_pratica: plano.sugestaoPratica || null,
    reorganizacoes:   plano.reorganizacoes  || null,
  };
  let { data, error } = await supabase.from('planos').upsert(payload, { onConflict: 'user_id' });

  // Resiliência: se a migração quero_fazer ainda não rodou, a coluna não existe.
  // Salva sem ela (não quebra o caminho crítico) e avisa. Roda quero-fazer-setup.sql.
  if (error && /quero_fazer/i.test(error.message || '') ) {
    console.warn('[SAVE PLANO] coluna quero_fazer ausente — salvando sem ela. Rode supabase/quero-fazer-setup.sql');
    const { quero_fazer, ...semQF } = payload;
    ({ data, error } = await supabase.from('planos').upsert(semQF, { onConflict: 'user_id' }));
  }
  console.log('[SAVE PLANO] error:', JSON.stringify(error));
  if (error) throw error;
}

async function salvarMemoria(userId, memoria) {
  console.log('[SAVE MEMORIA] userId:', userId);
  console.log('[SAVE MEMORIA] memoria keys:', Object.keys(memoria || {}));
  const { data, error } = await supabase.from('memorias').upsert({
    user_id: userId,
    dados:   memoria,
  }, { onConflict: 'user_id' });
  console.log('[SAVE MEMORIA] data:', data);
  console.log('[SAVE MEMORIA] error:', JSON.stringify(error));
  if (error) throw error;
}

async function salvarHistorico(userId, historicoDisplay, historicoApi) {
  console.log('[SAVE HISTORICO] userId:', userId);
  console.log('[SAVE HISTORICO] display length:', historicoDisplay?.length);
  console.log('[SAVE HISTORICO] api length:', historicoApi?.length);
  const { data, error } = await supabase.from('historicos').upsert({
    user_id:           userId,
    historico_display: historicoDisplay,
    historico_api:     historicoApi,
  }, { onConflict: 'user_id' });
  console.log('[SAVE HISTORICO] data:', data);
  console.log('[SAVE HISTORICO] error:', JSON.stringify(error));
  if (error) throw error;
}

async function salvarPerfil(userId, perfil) {
  console.log('[SAVE PERFIL] userId:', userId);
  console.log('[SAVE PERFIL] nome:', perfil?.nome);
  const { data, error } = await supabase.from('perfis').upsert({
    id:                         userId,
    nome:                       perfil.nome                      || null,
    ocupacao:                   perfil.ocupacao                  || null,
    estilo:                     perfil.estilo                    || 'equilibrada',
    ritmo:                      perfil.ritmo                     || null,
    desafios:                   perfil.desafios                  || [],
    objetivos:                  perfil.objetivos                 || [],
    contador_interacoes:        perfil.contadorInteracoes        || 0,
    perguntas_profundas_feitas: perfil.perguntasProfundasFeitas  || [],
    configuracoes:              perfil.configuracoes             || {},
  }, { onConflict: 'id' });
  console.log('[SAVE PERFIL] data:', data);
  console.log('[SAVE PERFIL] error:', JSON.stringify(error));
  if (error) throw error;
}

async function salvarTarefasConcluidas(userId, tarefaIds) {
  console.log('[SAVE TAREFAS] userId:', userId);
  const { data, error } = await supabase.from('tarefas_concluidas').upsert({
    user_id:    userId,
    tarefa_ids: tarefaIds,
  }, { onConflict: 'user_id' });
  console.log('[SAVE TAREFAS] data:', data);
  console.log('[SAVE TAREFAS] error:', JSON.stringify(error));
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
