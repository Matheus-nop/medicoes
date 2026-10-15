set search_path = medicoes, public;

-- =====================================================================
-- 0018: os ciclos do contrato e o mês a mês dele
-- (idempotente; rode depois da 0017)
-- =====================================================================
--
-- O contrato renova: um período novo, com valor novo, e o consumo recomeça.
-- A renovação é um aditivo como os outros — não se edita, a diretoria apaga o
-- lançado por engano —, do tipo `renovacao`, com o período e o valor do ciclo
-- que ela abre. Renovação que já aconteceu entra com a data dela.
--
-- Os ciclos não são tabela: saem dos aditivos, na conta de
-- `ciclosDoContrato` (lib/medicoes/contratos.ts). Daqui sai só o que o
-- controle diz de cada contrato em cada mês — o medido e o FATURADO, que é
-- o que faz o saldo do contrato andar sozinho.
--
--   contrato_aditivos.nova_vigencia_inicio — onde começa o ciclo da renovação
--                                            (vazio: o dia seguinte ao fim do
--                                            ciclo anterior)
--   contrato_aditivos.valor_ciclo          — o valor do ciclo novo
--   contrato_aditivos.incorpora_saldo      — o termo leva o que sobrou do
--                                            ciclo anterior para o novo
--   contrato_meses                         — medido e faturado do controle,
--                                            por contrato e mês
-- =====================================================================

-- 1. O tipo novo e os campos da renovação
alter table contrato_aditivos add column if not exists nova_vigencia_inicio date;
alter table contrato_aditivos add column if not exists valor_ciclo numeric(14, 2);
alter table contrato_aditivos add column if not exists incorpora_saldo boolean not null default false;

alter table contrato_aditivos drop constraint if exists contrato_aditivos_tipo_check;
alter table contrato_aditivos add constraint contrato_aditivos_tipo_check
  check (tipo in ('prorrogacao', 'reajuste', 'valor', 'encerramento', 'renovacao', 'outro'));

alter table contrato_aditivos drop constraint if exists renovacao_tem_periodo;
alter table contrato_aditivos add constraint renovacao_tem_periodo
  check (tipo <> 'renovacao' or nova_vigencia_fim is not null);

alter table contrato_aditivos drop constraint if exists renovacao_periodo_em_ordem;
alter table contrato_aditivos add constraint renovacao_periodo_em_ordem
  check (nova_vigencia_inicio is null or nova_vigencia_fim is null or nova_vigencia_fim >= nova_vigencia_inicio);

alter table contrato_aditivos drop constraint if exists valor_ciclo_positivo;
alter table contrato_aditivos add constraint valor_ciclo_positivo
  check (valor_ciclo is null or valor_ciclo >= 0);

-- 2. O mês a mês de cada contrato: o controle do cliente (pela chave e pelo
--    vínculo, como na 0013), nas categorias do contrato, do mês do início em
--    diante. Em que ciclo cada mês cai é conta do código.
create or replace view contrato_meses with (security_invoker = true) as
select c.id as contrato_id,
       x.mes,
       sum(x.medido)   as medido,
       sum(x.faturado) as faturado
from contratos c
join controle_atual x
  on chave_da_ficha(x.cliente) = chave_da_ficha(c.cliente)
 and x.mes >= date_trunc('month', c.vigencia_inicio)::date
 and (c.categorias is null or x.categoria = any (c.categorias))
group by c.id, x.mes;

grant select on contrato_meses to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 3. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select item, situacao from (
  select 1 as ordem, 'o aditivo aceita renovacao' as item,
         case when pg_get_constraintdef((select oid from pg_constraint
                                          where conname = 'contrato_aditivos_tipo_check')) like '%renovacao%'
              then '✓ ok' else '!! o tipo renovacao nao entrou' end as situacao
  union all
  select 2, 'a renovacao tem os campos do ciclo',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes' and table_name = 'contrato_aditivos'
                       and column_name in ('nova_vigencia_inicio', 'valor_ciclo', 'incorpora_saldo')) = 3
              then '✓ ok' else '!! faltou coluna' end
  union all
  select 3, 'aditivo continua sem update',
         case when not exists (select 1 from information_schema.table_privileges
                                where table_schema = 'medicoes' and grantee = 'authenticated'
                                  and table_name = 'contrato_aditivos' and privilege_type = 'UPDATE')
              then '✓ ok' else '!! da para reescrever aditivo' end
  union all
  select 4, 'o mes a mes do contrato responde',
         case when (select count(*) from contrato_meses) >= 0
              then '✓ ok' else '!! a view nao responde' end
) r order by ordem;
