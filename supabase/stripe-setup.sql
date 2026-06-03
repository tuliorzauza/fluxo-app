-- ============================================================================
-- Fluxo — Setup do Stripe (modelo freemium por LIMITE DE MENSAGENS)
-- Rode no SQL Editor do Supabase (uma vez).
-- ============================================================================
-- O backend usa service_role (bypassa RLS). As policies abaixo protegem contra
-- acesso direto via anon key, no mesmo padrão das outras tabelas.
-- ============================================================================

-- ── Assinaturas ─────────────────────────────────────────────────────────────
create table if not exists public.assinaturas (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  plano                   text not null default 'free',     -- 'free' | 'pro'
  status                  text not null default 'inativa',  -- 'ativa' | 'cancelada' | 'inadimplente' | 'inativa'
  stripe_customer_id      text,
  stripe_subscription_id  text,
  periodo_fim             timestamptz,                       -- fim do período pago atual
  atualizado_em           timestamptz not null default now()
);

alter table public.assinaturas enable row level security;
drop policy if exists "assinaturas_owner" on public.assinaturas;
create policy "assinaturas_owner" on public.assinaturas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Uso diário de mensagens (para o limite do plano free) ───────────────────
create table if not exists public.uso_mensagens (
  user_id   uuid not null references auth.users(id) on delete cascade,
  data      date not null,
  contador  int  not null default 0,
  primary key (user_id, data)
);

alter table public.uso_mensagens enable row level security;
drop policy if exists "uso_mensagens_owner" on public.uso_mensagens;
create policy "uso_mensagens_owner" on public.uso_mensagens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Incremento atômico do contador diário ───────────────────────────────────
-- Evita corrida (read-modify-write) ao contar mensagens. Retorna o novo total.
create or replace function public.incrementar_uso(p_user_id uuid, p_data date)
returns int
language plpgsql
security definer
as $$
declare
  novo int;
begin
  insert into public.uso_mensagens (user_id, data, contador)
  values (p_user_id, p_data, 1)
  on conflict (user_id, data)
  do update set contador = public.uso_mensagens.contador + 1
  returning contador into novo;
  return novo;
end;
$$;

-- ============================================================================
-- VERIFICAÇÃO:
--   select * from public.assinaturas limit 5;
--   select public.incrementar_uso(auth.uid(), current_date); -- testa o RPC
-- ============================================================================
