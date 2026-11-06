set search_path = medicoes, public;

-- =====================================================================
-- 0026: descontos e acréscimos na medição de locação
-- (idempotente; rode depois da 0025)
-- =====================================================================
--
-- A medição de locação pode levar descontos e acréscimos — vários de cada,
-- cada um com a sua descrição ("dias parados por chuva", "frete extra"). Cada
-- um é em R$ ou em percentual; o percentual é sobre o SUBTOTAL da medição
-- (locação + manutenção), e não um sobre o outro.
--
--   locacao_ajustes — um desconto ou acréscimo de uma medição
--
-- O valor em reais do percentual e o total da medição não se gravam: saem da
-- conta (`contaDosAjustes`, lib/medicoes/locacao.ts). O que se grava é o que
-- a pessoa disse.
-- =====================================================================

create table if not exists locacao_ajustes (
  id          bigint generated always as identity primary key,
  medicao_id  bigint not null references locacao_medicoes(id) on delete cascade,
  tipo        text not null check (tipo in ('desconto', 'acrescimo')),
  descricao   text not null check (length(trim(descricao)) > 0),
  forma       text not null check (forma in ('valor', 'percentual')),
  -- Em reais, ou o percentual (5 = 5%). Sempre positivo: o tipo diz o sinal.
  valor       numeric(14, 2) not null check (valor > 0),
  criado_por  uuid not null default auth.uid() references auth.users(id),
  criado_em   timestamptz not null default now(),
  check (forma = 'valor' or valor <= 100)
);

create index if not exists locacao_ajustes_da_medicao on locacao_ajustes (medicao_id);

alter table locacao_ajustes enable row level security;

-- Todo mundo daqui lê; o faturamento e a diretoria lançam — e só em medição
-- aberta (a `locacao_aberta()` da 0025).
drop policy if exists le_locacao_ajustes on locacao_ajustes;
create policy le_locacao_ajustes on locacao_ajustes for select using ((select e_usuario_ativo()));
drop policy if exists lanca_locacao_ajuste on locacao_ajustes;
create policy lanca_locacao_ajuste on locacao_ajustes
  for insert with check (meu_papel() in ('faturamento', 'diretoria') and criado_por = auth.uid());
drop policy if exists muda_locacao_ajuste on locacao_ajustes;
create policy muda_locacao_ajuste on locacao_ajustes
  for update using (meu_papel() in ('faturamento', 'diretoria'))
  with check (meu_papel() in ('faturamento', 'diretoria'));
drop policy if exists tira_locacao_ajuste on locacao_ajustes;
create policy tira_locacao_ajuste on locacao_ajustes
  for delete using (meu_papel() in ('faturamento', 'diretoria'));

drop policy if exists ajuste_em_medicao_aberta_entra on locacao_ajustes;
create policy ajuste_em_medicao_aberta_entra on locacao_ajustes as restrictive
  for insert with check (locacao_aberta(medicao_id));
drop policy if exists ajuste_em_medicao_aberta_muda on locacao_ajustes;
create policy ajuste_em_medicao_aberta_muda on locacao_ajustes as restrictive
  for update using (locacao_aberta(medicao_id)) with check (locacao_aberta(medicao_id));
drop policy if exists ajuste_em_medicao_aberta_sai on locacao_ajustes;
create policy ajuste_em_medicao_aberta_sai on locacao_ajustes as restrictive
  for delete using (locacao_aberta(medicao_id));

revoke all on locacao_ajustes from anon;
revoke truncate on locacao_ajustes from authenticated;
grant select, insert, update, delete on locacao_ajustes to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select ordem, o_que, situacao from (
  select 1 as ordem, 'a tabela, com RLS' as o_que,
         case when exists (select 1 from pg_tables where schemaname = 'medicoes' and rowsecurity
                            and tablename = 'locacao_ajustes')
              then '✓ ok' else '!! faltou a tabela ou a RLS' end as situacao
  union all
  select 2, 'só o faturamento e a diretoria lançam',
         case when exists (select 1 from pg_policies where schemaname = 'medicoes' and tablename = 'locacao_ajustes'
                            and cmd = 'INSERT' and with_check like '%faturamento%' and with_check not like '%orcamento%')
              then '✓ ok' else '!! confira a policy de lançar' end
  union all
  select 3, 'medição fechada trava o ajuste',
         case when (select count(*) from pg_policies where schemaname = 'medicoes' and tablename = 'locacao_ajustes'
                     and permissive = 'RESTRICTIVE' and policyname like 'ajuste_em_medicao_aberta_%') = 3
              then '✓ ok' else '!! faltou policy da medição fechada' end
  union all
  select 4, 'anon não lê',
         case when not exists (select 1 from information_schema.table_privileges
                                where table_schema = 'medicoes' and table_name = 'locacao_ajustes' and grantee = 'anon')
              then '✓ ok' else '!! anon tem acesso' end
) c
order by ordem;
