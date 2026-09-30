set search_path = medicoes, public;

-- =====================================================================
-- 0001: perfis e papéis de medições
-- (idempotente; rode depois da 0000)
-- =====================================================================
--
-- O login é o `auth.users` do projeto, o mesmo do Roteiros e do Estoque. Ter
-- login não é ter acesso: acesso é ter perfil ATIVO aqui. Sem perfil, o app
-- manda para "sem acesso" e a RLS devolve vazio.
--
-- Não há gatilho criando perfil para toda conta nova, de propósito. Os dois
-- outros apps têm (o Estoque dá operador, o Roteiros dá PCM) — aqui o que está
-- atrás da porta é dinheiro, e o acesso é sempre um ato da diretoria.
--
-- Os papéis:
--   diretoria   — vê tudo, reabre boletim, dá e tira acesso
--   financeiro  — fatura
--   faturamento — monta, fecha e envia boletim
--   orcamento   — monta boletim e confere valor
-- `text` com `check`, e não enum: o arquivo fica sem `do $$`, e papel novo é
-- trocar uma constraint.

create table if not exists perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null check (length(btrim(nome)) > 0),
  papel      text not null check (papel in ('diretoria', 'financeiro', 'faturamento', 'orcamento')),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- As três perguntas que as policies fazem. `security definer` para ler
-- `perfis` sem cair na RLS da própria tabela, e curtas: nada de bloco longo.

create or replace function medicoes.meu_papel()
returns text language sql stable security definer set search_path = medicoes, public
as $fn$ select papel from medicoes.perfis where id = auth.uid() and ativo $fn$;

create or replace function medicoes.e_usuario_ativo()
returns boolean language sql stable security definer set search_path = medicoes, public
as $fn$ select exists (select 1 from medicoes.perfis where id = auth.uid() and ativo) $fn$;

create or replace function medicoes.e_diretoria()
returns boolean language sql stable security definer set search_path = medicoes, public
as $fn$ select exists (select 1 from medicoes.perfis
                        where id = auth.uid() and ativo and papel = 'diretoria') $fn$;

revoke all on function medicoes.meu_papel(), medicoes.e_usuario_ativo(), medicoes.e_diretoria()
  from public, anon;
grant execute on function medicoes.meu_papel(), medicoes.e_usuario_ativo(), medicoes.e_diretoria()
  to authenticated;

alter table perfis enable row level security;

-- Quem é daqui vê a lista de colegas (é o que põe nome no histórico).
drop policy if exists le_perfis on perfis;
create policy le_perfis on perfis for select using (e_usuario_ativo());

-- E cada um lê o próprio, ativo ou não — é o que a tela de sem acesso usa.
drop policy if exists le_proprio_perfil on perfis;
create policy le_proprio_perfil on perfis for select using (id = auth.uid());

-- Dar, mudar e tirar acesso é da diretoria.
drop policy if exists diretoria_gere_perfis on perfis;
create policy diretoria_gere_perfis on perfis
  for all using (e_diretoria()) with check (e_diretoria());

grant select, insert, update on perfis to authenticated;
revoke delete on perfis from authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- A PRIMEIRA DIRETORIA
-- ---------------------------------------------------------------------
-- Ninguém tem perfil ainda, e só a diretoria dá acesso: a primeira pessoa
-- entra por aqui. Troque o e-mail pelo de quem vai administrar e rode:
--
--   insert into medicoes.perfis (id, nome, papel)
--   select id, 'SEU NOME', 'diretoria' from auth.users where email = 'seu@email'
--   on conflict (id) do update set papel = 'diretoria', ativo = true;

-- ---------------------------------------------------------------------
-- Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select item, situacao from (
  select 1 as ordem, 'RLS ativa em perfis' as item,
         case when (select rowsecurity from pg_tables
                     where schemaname = 'medicoes' and tablename = 'perfis')
              then '✓ ok' else '!! perfis sem RLS' end as situacao
  union all
  select 2, 'nenhum gatilho cria perfil sozinho',
         case when not exists (select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
                                join pg_namespace n on n.oid = p.pronamespace
                                where n.nspname = 'medicoes' and not t.tgisinternal)
              then '✓ ok' else '!! existe gatilho em medicoes' end
  union all
  select 3, 'ninguem apaga perfil (desativa)',
         case when not has_table_privilege('authenticated', 'medicoes.perfis', 'delete')
              then '✓ ok' else '!! authenticated apaga perfil' end
) r order by ordem;
