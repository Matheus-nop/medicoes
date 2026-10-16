set search_path = medicoes, public;

-- =====================================================================
-- 0020: o saldo conferido do contrato
-- (idempotente; rode depois da 0019)
-- =====================================================================
--
-- O time sabe quanto RESTA de cada contrato hoje, e nem sempre o valor
-- global do papel — e o controle do sistema só começa em março/2025, então o
-- que foi faturado antes dele o sistema não vê. O saldo conferido é esse
-- número com data: "restavam R$ X depois do faturamento de setembro/2026".
-- Dali em diante o saldo anda sozinho com o faturado do controle.
--
--   contratos.saldo_conferido — quanto restava
--   contratos.saldo_ate       — o mês do controle (dia 1º) até o qual esse
--                               saldo já conta o faturado
--
-- Com o valor global também preenchido, a diferença é o faturado antes do
-- sistema, e o percentual consumido fica certo. Sem ele, o contrato mostra o
-- saldo e o ritmo, sem percentual. Os dois vazios: preço unitário, sem teto.
-- A conta está em `ciclosDoContrato` (lib/medicoes/contratos.ts).
-- =====================================================================

alter table contratos add column if not exists saldo_conferido numeric(14, 2);
alter table contratos add column if not exists saldo_ate date;

alter table contratos drop constraint if exists saldo_conferido_com_mes;
alter table contratos add constraint saldo_conferido_com_mes
  check ((saldo_conferido is null) = (saldo_ate is null));

alter table contratos drop constraint if exists saldo_ate_no_dia_primeiro;
alter table contratos add constraint saldo_ate_no_dia_primeiro
  check (saldo_ate is null or extract(day from saldo_ate) = 1);

-- O contrato de hoje, com o saldo conferido no fim (a view só cresce no fim).
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
       c.regioes,
       c.saldo_conferido,
       c.saldo_ate
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
-- Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select item, situacao from (
  select 1 as ordem, 'o contrato tem o saldo conferido' as item,
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes' and table_name = 'contratos'
                       and column_name in ('saldo_conferido', 'saldo_ate')) = 2
              then '✓ ok' else '!! faltou coluna' end as situacao
  union all
  select 2, 'a view devolve o saldo conferido',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes' and table_name = 'contratos_atual'
                       and column_name in ('saldo_conferido', 'saldo_ate')) = 2
              then '✓ ok' else '!! a view nao mudou' end
) r order by ordem;
