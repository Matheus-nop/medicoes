set search_path = medicoes, public;

-- =====================================================================
-- 0019: as regionais do contrato
-- (idempotente; rode depois da 0018)
-- =====================================================================
--
-- O controle é um cliente com regionais (ÁGUAS DO RIO / AEGEA: NORTE, SUL,
-- BAIXADA II…), e o contrato pode ser de uma regional só. Com a regional
-- escrita no nome do cliente ("AEGEA … - BAIXADA II") o contrato não acha o
-- controle: fica sem medido, sem faturado, e o painel abre vazio.
--
--   contratos.regioes — as regionais do controle que o contrato cobre.
--                       Vazio: todas as do cliente.
--
-- O cliente do contrato passa a ser o do controle; a regional, este campo.
-- Os contratos já cadastrados se acertam com
-- `supabase/scripts/acertar-regional-dos-contratos.sql`.
-- =====================================================================

alter table contratos add column if not exists regioes text[];

-- 1. O mês a mês: só as regionais do contrato, quando ele diz quais.
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
 and (c.regioes is null
      or chave_do_nome(x.regiao) in (select chave_do_nome(r) from unnest(c.regioes) r))
group by c.id, x.mes;

grant select on contrato_meses to authenticated;

-- 2. O contrato de hoje, com as regionais no fim (a view só cresce no fim).
create or replace view contratos_atual with (security_invoker = true) as
select c.id, c.numero, c.cliente, c.objeto, c.vigencia_inicio, c.vigencia_fim,
       c.valor, c.categorias, c.indice, coalesce(c.data_base, c.vigencia_inicio) as data_base,
       c.aviso_dias, c.contato, c.email, c.observacao, c.criado_por, c.criado_em,
       v.vigencia_atual,
       case when c.valor is null then null
            else c.valor + coalesce(a.valor_delta, 0) end as valor_atual,
       a.ultimo_reajuste,
       a.encerrado_em,
       coalesce(a.aditivos, 0) as aditivos,
       coalesce((select sum(x.medido) from controle_atual x
                  where chave_da_ficha(x.cliente) = chave_da_ficha(c.cliente)
                    and x.mes >= date_trunc('month', c.vigencia_inicio)::date
                    and x.mes <= least(v.vigencia_atual, coalesce(a.encerrado_em, v.vigencia_atual))
                    and (c.categorias is null or x.categoria = any (c.categorias))
                    and (c.regioes is null
                         or chave_do_nome(x.regiao) in (select chave_do_nome(r) from unnest(c.regioes) r))), 0) as medido,
       (select max(x.mes) from controle_atual x
         where chave_da_ficha(x.cliente) = chave_da_ficha(c.cliente)
           and x.mes >= date_trunc('month', c.vigencia_inicio)::date
           and x.mes <= v.vigencia_atual
           and (c.regioes is null
                or chave_do_nome(x.regiao) in (select chave_do_nome(r) from unnest(c.regioes) r))) as medido_ate,
       c.regioes
from contratos c
left join lateral (
  select sum(valor_delta) as valor_delta,
         max(data) filter (where tipo = 'reajuste') as ultimo_reajuste,
         min(data) filter (where tipo = 'encerramento') as encerrado_em,
         count(*) as aditivos
  from contrato_aditivos where contrato_id = c.id
) a on true
cross join lateral (
  select coalesce((select p.nova_vigencia_fim from contrato_aditivos p
                    where p.contrato_id = c.id and p.nova_vigencia_fim is not null
                    order by p.data desc, p.id desc limit 1),
                  c.vigencia_fim) as vigencia_atual
) v;

grant select on contratos_atual to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 3. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select item, situacao from (
  select 1 as ordem, 'o contrato tem regionais' as item,
         case when exists (select 1 from information_schema.columns
                            where table_schema = 'medicoes' and table_name = 'contratos'
                              and column_name = 'regioes')
              then '✓ ok' else '!! faltou a coluna' end as situacao
  union all
  select 2, 'a view do contrato devolve as regionais',
         case when exists (select 1 from information_schema.columns
                            where table_schema = 'medicoes' and table_name = 'contratos_atual'
                              and column_name = 'regioes')
              then '✓ ok' else '!! a view nao mudou' end
  union all
  select 3, 'o mes a mes responde',
         case when (select count(*) from contrato_meses) >= 0 then '✓ ok' else '!!' end
) r order by ordem;
