set search_path = medicoes, public;

-- =====================================================================
-- 0003: os comprovantes do boletim — o que se lê dos outros dois apps
-- (idempotente; rode depois da 0002)
-- =====================================================================
--
-- O boletim pede, em cada OM, RECIBO RETIRADA e RECIBO ENTREGA. A OM tem três
-- momentos no Sisloc, cada um com o seu número — entrada, corretiva, retorno —,
-- e os dois recibos já existem em outros apps da casa:
--
--   1. no Estoque, `estoque.ordens_servico`: `om_entrada`, `om_corretiva` e
--      `om_retorno` no mesmo cartão. Achando a OS pela OM cobrada, é ligação
--      exata.
--   2. no Roteiros, `public.demandas`: a demanda de RETORNO AO CLIENTE leva a
--      OM do retorno, e a de RETIRADA leva a da retirada.
--
-- Quem usa medições não é, necessariamente, usuário dos outros dois — e a RLS
-- de lá exige perfil de lá. Por isso as duas leituras são funções `security
-- definer`, curtas, que devolvem SÓ o que o boletim usa e SÓ para quem tem
-- perfil ativo aqui. Cliente, endereço, técnico, defeito, observação: nada
-- disso sai. E nada é escrito nos outros schemas.
--
-- Qual OS e qual demanda são de qual OM mora em `acharComprovantes`
-- (lib/medicoes/medicoes.ts), com teste. Aqui só se lê.

-- As OS do Estoque que têm OM corretiva: os três números e o patrimônio.
create or replace function medicoes.os_com_oms()
returns table (patrimonio text, om_entrada text, om_corretiva text, om_retorno text)
language sql
stable
security definer
set search_path = medicoes, public
as $fn$
  select e.patrimonio, o.om_entrada, o.om_corretiva, o.om_retorno
  from estoque.ordens_servico o
  join estoque.equipamentos e on e.id = o.equipamento_id
  where medicoes.e_usuario_ativo()
    and nullif(btrim(coalesce(o.om_corretiva, '')), '') is not null;
$fn$;

-- As demandas do Roteiros de alguns patrimônios, com o número da OM delas.
create or replace function medicoes.demandas_dos_patrimonios(p_patrimonios text[])
returns table (patrimonio text, tipo text, om text, dia date, finalizada boolean)
language sql
stable
security definer
set search_path = medicoes, public
as $fn$
  select d.patrimonio,
         upper(btrim(d.tipo)),
         btrim(d.om),
         coalesce(d.finalizado_em::date, d.data_reagendada, d.data_planejada, d.data_abertura),
         d.status = 'FINALIZADO'
  from public.demandas d
  where medicoes.e_usuario_ativo()
    and d.status <> 'CANCELADO'
    and nullif(btrim(coalesce(d.om, '')), '') is not null
    and upper(regexp_replace(coalesce(d.patrimonio, ''), '[^0-9A-Za-z]', '', 'g')) in (
      select upper(regexp_replace(x, '[^0-9A-Za-z]', '', 'g')) from unnest(p_patrimonios) as x
    );
$fn$;

revoke all on function medicoes.os_com_oms(), medicoes.demandas_dos_patrimonios(text[])
  from public, anon;
grant execute on function medicoes.os_com_oms(), medicoes.demandas_dos_patrimonios(text[])
  to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select item, situacao from (
  select 1 as ordem, 'as duas leituras existem e sao security definer' as item,
         case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                     where n.nspname = 'medicoes' and p.prosecdef
                       and p.proname in ('os_com_oms', 'demandas_dos_patrimonios')) = 2
              then '✓ ok' else '!! faltou alguma' end as situacao
  union all
  select 2, 'as duas so respondem a quem tem perfil aqui',
         case when pg_get_functiondef('medicoes.os_com_oms()'::regprocedure) like '%e_usuario_ativo()%'
               and pg_get_functiondef('medicoes.demandas_dos_patrimonios(text[])'::regprocedure)
                   like '%e_usuario_ativo()%'
              then '✓ ok' else '!! alguma responde a qualquer um' end
  union all
  select 3, 'anon nao executa',
         case when not has_function_privilege('anon', 'medicoes.os_com_oms()', 'execute')
               and not has_function_privilege('anon', 'medicoes.demandas_dos_patrimonios(text[])', 'execute')
              then '✓ ok' else '!! anon executa' end
) r order by ordem;
