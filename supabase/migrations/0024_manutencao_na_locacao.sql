set search_path = medicoes, public;

-- =====================================================================
-- 0024: os BMs de manutenção dentro da medição de locação
-- (idempotente; rode depois da 0023)
-- =====================================================================
--
-- A planilha da AEGEA leva, embaixo da locação, a manutenção da área. A
-- faturista exporta o PDF dos BMs de manutenção (gerados aqui mesmo) e
-- arrasta na medição de locação: o PDF só diz QUAIS boletins são — pelas
-- OMs impressas nele —, e as linhas vêm do próprio boletim, com o valor que
-- foi cobrado. Esta tabela guarda essa escolha: quais BMs entram em qual
-- medição. Nenhum número se copia: a OM, o patrimônio e o valor são os do
-- boletim, lidos na hora.
--
--   locacao_manutencoes — um BM de manutenção incluído numa medição
-- =====================================================================

create table if not exists locacao_manutencoes (
  id           bigint generated always as identity primary key,
  medicao_id   bigint not null references locacao_medicoes(id) on delete cascade,
  boletim_id   bigint not null references boletins(id) on delete cascade,
  arquivo      text,
  incluido_por uuid not null default auth.uid() references auth.users(id),
  incluido_em  timestamptz not null default now(),
  unique (medicao_id, boletim_id)
);

create index if not exists locacao_manutencoes_da_medicao on locacao_manutencoes (medicao_id);

alter table locacao_manutencoes enable row level security;

drop policy if exists le_locacao_manutencoes on locacao_manutencoes;
create policy le_locacao_manutencoes on locacao_manutencoes for select using ((select e_usuario_ativo()));
drop policy if exists inclui_locacao_manutencao on locacao_manutencoes;
create policy inclui_locacao_manutencao on locacao_manutencoes
  for insert with check (meu_papel() in ('faturamento', 'diretoria') and incluido_por = auth.uid());
drop policy if exists tira_locacao_manutencao on locacao_manutencoes;
create policy tira_locacao_manutencao on locacao_manutencoes
  for delete using (meu_papel() in ('faturamento', 'diretoria'));

revoke all on locacao_manutencoes from anon;
revoke update, truncate on locacao_manutencoes from authenticated;
grant select, insert, delete on locacao_manutencoes to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select ordem, o_que, situacao from (
  select 1 as ordem, 'a tabela, com RLS' as o_que,
         case when exists (select 1 from pg_tables where schemaname = 'medicoes' and rowsecurity
                            and tablename = 'locacao_manutencoes')
              then '✓ ok' else '!! faltou a tabela ou a RLS' end as situacao
  union all
  select 2, 'só o faturamento e a diretoria incluem',
         case when exists (select 1 from pg_policies where schemaname = 'medicoes' and tablename = 'locacao_manutencoes'
                            and cmd = 'INSERT' and with_check like '%faturamento%' and with_check not like '%orcamento%')
              then '✓ ok' else '!! confira a policy de incluir' end
  union all
  select 3, 'anon não lê, e ninguém reescreve',
         case when not exists (select 1 from information_schema.table_privileges
                                where table_schema = 'medicoes' and table_name = 'locacao_manutencoes'
                                  and (grantee = 'anon'
                                       or (grantee = 'authenticated' and privilege_type in ('UPDATE', 'TRUNCATE'))))
              then '✓ ok' else '!! há acesso a mais' end
) c
order by ordem;
