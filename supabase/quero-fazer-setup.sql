-- ============================================================================
-- Fluxo — Coluna "Quero Fazer" (banco de intenções do usuário)
-- Rode no SQL Editor do Supabase (uma vez).
-- ============================================================================
-- Guarda a lista de coisas que o usuário quer fazer quando tiver tempo livre.
-- Vive junto do plano (mesma tabela) para herdar o sync e o carregamento
-- autoritativo já existentes. Default '[]' para planos antigos não quebrarem.
-- ============================================================================

alter table public.planos
  add column if not exists quero_fazer jsonb not null default '[]'::jsonb;

-- Verificação:
--   select user_id, jsonb_array_length(quero_fazer) as itens from public.planos;
