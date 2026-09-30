-- =====================================================================
-- 0000_schema.sql — medições mora no schema `medicoes`
-- (rode ANTES da 0001, no SQL Editor do projeto compartilhado)
-- =====================================================================
--
-- O projeto Supabase é o mesmo do Roteiros (`public`) e do Estoque
-- (`estoque`). Cada app no seu schema: os três têm `perfis` e funções de papel
-- com o mesmo nome, e no mesmo schema um sobrescreveria o outro.
--
-- Depois de rodar as migrações, falta UM passo no painel do Supabase:
-- Settings → API → Exposed schemas, acrescentar `medicoes`. Sem isso o
-- PostgREST não enxerga as tabelas e o app responde 404 em tudo.

create schema if not exists medicoes;

comment on schema medicoes is
  'Medições e contratos. `public` é do Roteiros, `estoque` é do Estoque.';

grant usage on schema medicoes to authenticated, anon, service_role;

-- O que for criado daqui para frente neste schema já nasce acessível ao app.
-- A RLS de cada tabela é que decide quem vê o quê.
alter default privileges in schema medicoes
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema medicoes
  grant usage, select on sequences to authenticated;
alter default privileges in schema medicoes
  grant execute on functions to authenticated;
