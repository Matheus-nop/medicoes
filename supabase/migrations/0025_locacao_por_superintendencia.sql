set search_path = medicoes, public;

-- =====================================================================
-- 0025: a medição de locação por superintendência, e a medição fechada
-- (idempotente; rode depois da 0024)
-- =====================================================================
--
-- A AEGEA recebe uma medição por superintendência — GRANDE DIÂMETRO, VCG,
-- BAIXADA 1… —, e não uma do mês inteiro. Até aqui a medição era uma por
-- cliente e mês, e todo PDF arrastado caía nela: o VCG se misturava ao Grande
-- Diâmetro. Agora:
--
--   1. a medição é uma por cliente, mês e SUPERINTENDÊNCIA (o campo do
--      cabeçalho da planilha, que já existia). Quem importa diz para qual vai.
--   2. a medição se FECHA: fechada, nenhum boletim do Sisloc nem BM de
--      manutenção entra, sai ou muda, e o cabeçalho fica como está. O
--      faturamento e a diretoria fecham; reabrir é só da diretoria, como no
--      boletim de manutenção.
--
-- A medição que já existe fica com a superintendência que tem no cabeçalho
-- (a de outubro, GRANDE DIÂMETRO). Nenhum dado muda.
-- =====================================================================

-- 1. Quem fechou, e quando. Vazio, a medição está aberta.
alter table locacao_medicoes add column if not exists fechada_em timestamptz;
alter table locacao_medicoes add column if not exists fechada_por uuid references auth.users(id);

-- 2. Uma por cliente, mês e superintendência (sem superintendência conta como uma).
drop index if exists locacao_uma_medicao_por_mes;
create unique index if not exists locacao_uma_medicao_por_superintendencia
  on locacao_medicoes (chave_do_nome(cliente), mes, chave_do_nome(superintendencia));

-- 3. A medição está aberta? Lida pela RLS de quem a enxerga.
create or replace function locacao_aberta(medicao bigint)
returns boolean language sql stable
as $fn$
  select exists (select 1 from medicoes.locacao_medicoes m where m.id = medicao and m.fechada_em is null)
$fn$;
grant execute on function locacao_aberta(bigint) to authenticated;

-- 4. A medição fechada só a diretoria mexe (é ela quem reabre). As policies
--    abaixo são RESTRITIVAS: somam-se às da 0023 e da 0024, não as trocam.
drop policy if exists locacao_fechada_so_diretoria on locacao_medicoes;
create policy locacao_fechada_so_diretoria on locacao_medicoes as restrictive
  for update using (fechada_em is null or e_diretoria()) with check (true);

drop policy if exists boletim_em_medicao_aberta_entra on locacao_boletins;
create policy boletim_em_medicao_aberta_entra on locacao_boletins as restrictive
  for insert with check (locacao_aberta(medicao_id));
drop policy if exists boletim_em_medicao_aberta_muda on locacao_boletins;
create policy boletim_em_medicao_aberta_muda on locacao_boletins as restrictive
  for update using (locacao_aberta(medicao_id)) with check (locacao_aberta(medicao_id));
drop policy if exists boletim_em_medicao_aberta_sai on locacao_boletins;
create policy boletim_em_medicao_aberta_sai on locacao_boletins as restrictive
  for delete using (locacao_aberta(medicao_id));

drop policy if exists item_em_medicao_aberta_entra on locacao_itens;
create policy item_em_medicao_aberta_entra on locacao_itens as restrictive
  for insert with check (locacao_aberta((select b.medicao_id from locacao_boletins b where b.id = boletim_id)));
drop policy if exists item_em_medicao_aberta_muda on locacao_itens;
create policy item_em_medicao_aberta_muda on locacao_itens as restrictive
  for update using (locacao_aberta((select b.medicao_id from locacao_boletins b where b.id = boletim_id)));
drop policy if exists item_em_medicao_aberta_sai on locacao_itens;
create policy item_em_medicao_aberta_sai on locacao_itens as restrictive
  for delete using (locacao_aberta((select b.medicao_id from locacao_boletins b where b.id = boletim_id)));

drop policy if exists bm_em_medicao_aberta_entra on locacao_manutencoes;
create policy bm_em_medicao_aberta_entra on locacao_manutencoes as restrictive
  for insert with check (locacao_aberta(medicao_id));
drop policy if exists bm_em_medicao_aberta_sai on locacao_manutencoes;
create policy bm_em_medicao_aberta_sai on locacao_manutencoes as restrictive
  for delete using (locacao_aberta(medicao_id));

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 5. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select ordem, o_que, situacao from (
  select 1 as ordem, 'a medição sabe se está fechada' as o_que,
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes' and table_name = 'locacao_medicoes'
                       and column_name in ('fechada_em', 'fechada_por')) = 2
              then '✓ ok' else '!! faltou coluna' end as situacao
  union all
  select 2, 'uma por cliente, mês e superintendência',
         case when exists (select 1 from pg_indexes where schemaname = 'medicoes'
                            and indexname = 'locacao_uma_medicao_por_superintendencia')
               and not exists (select 1 from pg_indexes where schemaname = 'medicoes'
                                and indexname = 'locacao_uma_medicao_por_mes')
              then '✓ ok' else '!! confira o índice da medição' end
  union all
  select 3, 'medição fechada trava boletim, linha e BM',
         case when (select count(*) from pg_policies where schemaname = 'medicoes' and permissive = 'RESTRICTIVE'
                     and tablename in ('locacao_medicoes', 'locacao_boletins', 'locacao_itens', 'locacao_manutencoes')
                     and policyname in ('locacao_fechada_so_diretoria',
                                        'boletim_em_medicao_aberta_entra', 'boletim_em_medicao_aberta_muda', 'boletim_em_medicao_aberta_sai',
                                        'item_em_medicao_aberta_entra', 'item_em_medicao_aberta_muda', 'item_em_medicao_aberta_sai',
                                        'bm_em_medicao_aberta_entra', 'bm_em_medicao_aberta_sai')) = 9
              then '✓ ok' else '!! faltou policy da medição fechada' end
  union all
  select 4, 'nenhuma medição repetida no mês e na superintendência',
         case when not exists (select 1 from locacao_medicoes
                                group by chave_do_nome(cliente), mes, chave_do_nome(superintendencia) having count(*) > 1)
              then '✓ ok' else '!! há medição repetida' end
) c
order by ordem;
