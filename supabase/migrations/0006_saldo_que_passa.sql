set search_path = medicoes, public;

-- =====================================================================
-- 0006: o saldo que passa de um mês para o outro
-- (idempotente; rode depois da 0005)
-- =====================================================================
--
-- O QUE MUDA
--
--   Até a 0005 cada mês era a FOTO da planilha: o medido já trazia dentro o
--   saldo do mês anterior. Agora o mês guarda só o que aconteceu NELE:
--
--     Agosto:   medido 100, faturado 30          → saldo 70
--     Setembro: saldo de agosto 70 (calculado), medido e faturado do mês
--               → saldo = 70 + medido − faturado
--
--   O saldo anterior não se digita nem se grava: sai da soma dos meses
--   anteriores, na view `controle_posicao`. Corrigiu agosto, setembro acompanha.
--
-- O HISTÓRICO DA PLANILHA
--
--   Os meses que vieram da planilha (e o que já se lançou no formato antigo)
--   são convertidos: medido do mês = medido da foto − saldo do mês anterior.
--   Nenhum saldo muda. Onde a planilha zerou um saldo sem faturar (a base some
--   de um mês para o outro), a conversão deixa um medido NEGATIVO naquele mês —
--   é o ajuste que a planilha fez calada, agora visível.
--
--   A conversão é append-only como tudo aqui (linha nova por cima, com a
--   observação "conversão 0006") e roda UMA vez só: ela e a marca de
--   convertido são um comando só, que o Postgres faz inteiro ou não faz.

-- ---------------------------------------------------------------------
-- 1. A marca de qual formato o controle está
-- ---------------------------------------------------------------------

create table if not exists controle_formato (
  versao  int primary key,
  em      timestamptz not null default now()
);

alter table controle_formato enable row level security;
drop policy if exists le_controle_formato on controle_formato;
create policy le_controle_formato on controle_formato
  for select using (e_usuario_ativo());
grant select on controle_formato to authenticated;
revoke insert, update, delete on controle_formato from authenticated;

-- ---------------------------------------------------------------------
-- 2. A conversão — um comando só, e só se ainda não foi feita
-- ---------------------------------------------------------------------

with foto as (
  -- A grade inteira de cada cliente: período × região × categoria, com o
  -- valor da foto (zero onde a planilha não tinha nada).
  select p.cliente, p.id as periodo_id, p.mes, r.id as regiao_id, c.categoria,
         coalesce(a.medido, 0) as medido, coalesce(a.faturado, 0) as faturado,
         a.medido is not null as tinha
  from controle_periodos p
  join controle_regioes r on r.cliente = p.cliente
  cross join (values ('manutencao'), ('locacao'), ('indenizacao')) c(categoria)
  left join controle_atual a
         on a.periodo_id = p.id and a.regiao_id = r.id and a.categoria = c.categoria
  where not exists (select 1 from controle_formato where versao >= 2)
),
anterior as (
  select f.*,
         coalesce(lag(f.medido - f.faturado) over (
           partition by f.regiao_id, f.categoria order by f.mes), 0) as saldo_antes
  from foto f
),
convertidas as (
  insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
  select periodo_id, regiao_id, categoria, medido - saldo_antes, faturado, 'conversão 0006', null
  from anterior
  where saldo_antes <> 0
  returning 1
)
insert into controle_formato (versao)
select 2
where not exists (select 1 from controle_formato where versao >= 2)
  and (select count(*) from convertidas) >= 0;

-- ---------------------------------------------------------------------
-- 3. A posição: saldo anterior, o mês, e o saldo
-- ---------------------------------------------------------------------

-- Toda base e categoria em todo período do cliente — inclusive a que não teve
-- lançamento no mês, mas trouxe saldo. Linha toda zerada fica de fora.
create or replace view controle_posicao with (security_invoker = true) as
select * from (
  select p.cliente, p.id as periodo_id, p.mes, p.rotulo,
         r.id as regiao_id, r.nome as regiao, r.ordem,
         c.categoria,
         coalesce(sum(coalesce(a.medido, 0) - coalesce(a.faturado, 0)) over (
           partition by r.id, c.categoria order by p.mes
           rows between unbounded preceding and 1 preceding), 0) as saldo_anterior,
         coalesce(a.medido, 0)   as medido,
         coalesce(a.faturado, 0) as faturado,
         sum(coalesce(a.medido, 0) - coalesce(a.faturado, 0)) over (
           partition by r.id, c.categoria order by p.mes
           rows between unbounded preceding and current row) as saldo
  from controle_periodos p
  join controle_regioes r on r.cliente = p.cliente
  cross join (values ('manutencao'), ('locacao'), ('indenizacao')) c(categoria)
  left join controle_atual a
         on a.periodo_id = p.id and a.regiao_id = r.id and a.categoria = c.categoria
) x
where saldo_anterior <> 0 or medido <> 0 or faturado <> 0;

-- O período inteiro. `medido` e `faturado` são os DO MÊS; `a_faturar` é o
-- saldo anterior mais o medido — o que havia para faturar no mês.
create or replace view controle_mes with (security_invoker = true) as
select cliente, periodo_id, mes, rotulo,
       sum(saldo_anterior) as saldo_anterior,
       sum(medido)         as medido,
       sum(faturado)       as faturado,
       sum(saldo)          as saldo,
       sum(saldo_anterior + medido) as a_faturar
from controle_posicao
group by cliente, periodo_id, mes, rotulo;

grant select on controle_posicao, controle_mes to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 4. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'o controle esta no formato do mes (versao 2)' as item,
         case when exists (select 1 from controle_formato where versao = 2)
              then '✓ ok' else '!! a conversao nao rodou' end as situacao
  union all
  select 2, 'as duas views novas existem',
         case when (select count(*) from information_schema.views
                     where table_schema = 'medicoes'
                       and table_name in ('controle_posicao', 'controle_mes')) = 2
              then '✓ ok' else '!! faltou view' end
  union all
  select 3, 'ninguem grava a marca pela tela',
         case when not has_table_privilege('authenticated', 'medicoes.controle_formato', 'insert')
              then '✓ ok' else '!! authenticated grava a marca' end
) r order by ordem;

-- E a prova de que nenhum saldo mudou: o saldo de cada mês, que tem de ser o
-- mesmo do RESUMO EXECUTIVO (setembro/2026: 991.905,24).
select rotulo, saldo_anterior, medido, faturado, saldo
from controle_mes
order by cliente, mes;
