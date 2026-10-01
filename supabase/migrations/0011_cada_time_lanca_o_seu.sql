set search_path = medicoes, public;

-- =====================================================================
-- 0011: cada time lança o que é seu
-- (idempotente; rode depois da 0010)
-- =====================================================================
--
-- Até aqui qualquer usuário ativo lançava em qualquer tela. Agora:
--
--   boletim de manutenção (boletim, OM, andamento, cadastro de bases)
--       → orçamento, faturamento e diretoria
--   controle das medições (período, região, medido e faturado)
--       → faturamento e diretoria
--   recebimento → financeiro e diretoria (já era assim desde a 0007)
--
-- Ler continua de todo mundo: o financeiro vê o boletim, o orçamento vê o
-- painel. A OM faturada fica como está — marcar faturado é o fim do boletim,
-- e quem fecha o boletim é quem marca.
--
-- As policies são RESTRITIVAS: somam-se às que já existem (a do boletim
-- aberto, a do "assina por si") em vez de reescrevê-las. Cada uma é uma linha.
--
-- ANTES DE RODAR: confira em Usuários o papel de cada um. Quem lança o
-- controle e está como "Orçamento" para de conseguir salvar.

-- ---------------------------------------------------------------------
-- 1. O boletim de manutenção
-- ---------------------------------------------------------------------

drop policy if exists boletim_entra_pelo_time on boletins;
create policy boletim_entra_pelo_time on boletins as restrictive for insert
  with check (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

drop policy if exists boletim_muda_pelo_time on boletins;
create policy boletim_muda_pelo_time on boletins as restrictive for update
  using (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

drop policy if exists boletim_sai_pelo_time on boletins;
create policy boletim_sai_pelo_time on boletins as restrictive for delete
  using (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

drop policy if exists om_entra_pelo_time on boletim_oms;
create policy om_entra_pelo_time on boletim_oms as restrictive for insert
  with check (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

drop policy if exists om_muda_pelo_time on boletim_oms;
create policy om_muda_pelo_time on boletim_oms as restrictive for update
  using (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

drop policy if exists om_sai_pelo_time on boletim_oms;
create policy om_sai_pelo_time on boletim_oms as restrictive for delete
  using (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

drop policy if exists andamento_pelo_time on boletim_andamentos;
create policy andamento_pelo_time on boletim_andamentos as restrictive for insert
  with check (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

drop policy if exists base_entra_pelo_time on bases;
create policy base_entra_pelo_time on bases as restrictive for insert
  with check (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

drop policy if exists base_muda_pelo_time on bases;
create policy base_muda_pelo_time on bases as restrictive for update
  using (meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

-- ---------------------------------------------------------------------
-- 2. O controle das medições
-- ---------------------------------------------------------------------

drop policy if exists regiao_entra_pelo_faturamento on controle_regioes;
create policy regiao_entra_pelo_faturamento on controle_regioes as restrictive for insert
  with check (meu_papel() in ('faturamento', 'diretoria'));

drop policy if exists regiao_muda_pelo_faturamento on controle_regioes;
create policy regiao_muda_pelo_faturamento on controle_regioes as restrictive for update
  using (meu_papel() in ('faturamento', 'diretoria'));

drop policy if exists periodo_abre_pelo_faturamento on controle_periodos;
create policy periodo_abre_pelo_faturamento on controle_periodos as restrictive for insert
  with check (meu_papel() in ('faturamento', 'diretoria'));

drop policy if exists valor_lancado_pelo_faturamento on controle_valores;
create policy valor_lancado_pelo_faturamento on controle_valores as restrictive for insert
  with check (meu_papel() in ('faturamento', 'diretoria'));

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 3. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'boletim, OM, andamento e base: 9 travas de time' as item,
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and permissive = 'RESTRICTIVE'
                       and tablename in ('boletins', 'boletim_oms', 'boletim_andamentos', 'bases')
                       and coalesce(qual, '') || coalesce(with_check, '') like '%orcamento%') = 9
              then '✓ ok' else '!! falta trava no boletim' end as situacao
  union all
  select 2, 'controle: 4 travas do faturamento',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and permissive = 'RESTRICTIVE'
                       and tablename in ('controle_regioes', 'controle_periodos', 'controle_valores')
                       and coalesce(qual, '') || coalesce(with_check, '') like '%faturamento%') = 4
              then '✓ ok' else '!! falta trava no controle' end
  union all
  select 3, 'nenhuma trava fecha a leitura',
         case when not exists (select 1 from pg_policies
                                where schemaname = 'medicoes' and permissive = 'RESTRICTIVE'
                                  and cmd in ('SELECT', 'ALL'))
              then '✓ ok' else '!! alguma restritiva pega o select' end
) r order by ordem;

-- Quem é quem — confira antes de avisar o time.
select papel, string_agg(nome, ', ' order by nome) as quem
from perfis where ativo group by papel order by papel;
