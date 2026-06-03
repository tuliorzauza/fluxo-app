-- ============================================================================
-- Fluxo — Reativar Row Level Security (RLS)
-- AUDIT-05 (auditoria pré-mercado 2026-06-03)
-- ============================================================================
--
-- COMO RODAR:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cole este arquivo inteiro e clique em "Run"
--
-- POR QUE É SEGURO:
--   O backend (Railway) usa a SUPABASE_SERVICE_KEY (service_role), que SEMPRE
--   BYPASSA o RLS. Todas as leituras/escritas de dados passam pelo backend, então
--   o app continua funcionando normalmente. Estas policies bloqueiam apenas acesso
--   DIRETO às tabelas via anon key (que hoje qualquer um com a URL pública poderia
--   tentar). O frontend só usa a anon key para auth (login/sessão), nunca para ler
--   tabelas — por isso nada quebra.
--
-- O QUE FAZ:
--   - Liga RLS nas 5 tabelas.
--   - Cria policy "dono" em cada uma: o usuário autenticado só enxerga/edita as
--     próprias linhas (auth.uid() = id / user_id).
-- ============================================================================

-- Habilita RLS
alter table public.perfis              enable row level security;
alter table public.planos              enable row level security;
alter table public.memorias            enable row level security;
alter table public.historicos          enable row level security;
alter table public.tarefas_concluidas  enable row level security;

-- perfis: a PK é "id" (= auth.uid())
drop policy if exists "perfis_owner" on public.perfis;
create policy "perfis_owner" on public.perfis
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- planos: dono via user_id
drop policy if exists "planos_owner" on public.planos;
create policy "planos_owner" on public.planos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- memorias: dono via user_id
drop policy if exists "memorias_owner" on public.memorias;
create policy "memorias_owner" on public.memorias
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- historicos: dono via user_id
drop policy if exists "historicos_owner" on public.historicos;
create policy "historicos_owner" on public.historicos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- tarefas_concluidas: dono via user_id
drop policy if exists "tarefas_concluidas_owner" on public.tarefas_concluidas;
create policy "tarefas_concluidas_owner" on public.tarefas_concluidas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- VERIFICAÇÃO (opcional) — rode depois para confirmar que o RLS está ligado:
--   select tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--     and tablename in ('perfis','planos','memorias','historicos','tarefas_concluidas');
-- rowsecurity deve ser 'true' nas 5 linhas.
-- ============================================================================
