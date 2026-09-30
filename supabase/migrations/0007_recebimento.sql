set search_path = medicoes, public;

-- =====================================================================
-- 0007: o recebimento do financeiro
-- (idempotente; rode depois da 0006)
-- =====================================================================
--
-- Faturado não é pago. O ciclo tem três passos, e cada um é de um time:
--
--   medido   → faturado   (faturamento, em `controle_valores`)
--   faturado → recebido   (financeiro, aqui)
--
-- O recebimento segue a regra do saldo (0006): o mês guarda só o que foi
-- recebido NELE, e o "a receber" passa sozinho de um mês para o outro:
--
--   a receber = tudo o que foi faturado até o mês − tudo o que foi recebido
--
-- Por que uma tabela à parte, e não uma coluna em `controle_valores`: lá cada
-- lançamento é uma linha nova com o medido e o faturado. Se o recebido
-- morasse na mesma linha, o faturamento salvando o medido apagaria o que o
-- financeiro lançou. Cada time escreve na sua tabela.
--
-- O COMEÇO. O histórico da planilha tem faturamento desde abril/2025, e
-- ninguém registrou o que foi recebido. Somar tudo daria um "a receber" de
-- milhões que não existe. Por isso o recebimento começa num MÊS DE INÍCIO por
-- cliente (`controle_recebimento_inicio`), escolhido pelo financeiro; antes
-- dele nada conta. No mês de início, a `abertura` de cada base e categoria é o
-- a receber que já vinha de antes — o que o financeiro tem em aberto hoje.
--
-- Quem lança: financeiro e diretoria (a RLS confere o papel). Append-only como
-- o resto: corrige-se lançando por cima, e o valor que vale é o último.

-- ---------------------------------------------------------------------
-- 1. A tabela
-- ---------------------------------------------------------------------

create table if not exists controle_recebimentos (
  id          bigint generated always as identity primary key,
  periodo_id  bigint not null references controle_periodos(id),
  regiao_id   bigint not null references controle_regioes(id),
  categoria   text not null check (categoria in ('manutencao', 'locacao', 'indenizacao')),
  recebido    numeric(14,2) not null default 0,
  -- O a receber que já vinha de antes do início. Só faz sentido no mês de
  -- início; em outro mês é um ajuste, e a tela não oferece.
  abertura    numeric(14,2) not null default 0,
  observacao  text,
  quem        uuid not null default auth.uid() references auth.users(id),
  em          timestamptz not null default now()
);

create index if not exists controle_recebimentos_celula
  on controle_recebimentos (periodo_id, regiao_id, categoria, id desc);

alter table controle_recebimentos enable row level security;

drop policy if exists le_controle_recebimentos on controle_recebimentos;
create policy le_controle_recebimentos on controle_recebimentos
  for select using (e_usuario_ativo());

drop policy if exists lanca_recebimento on controle_recebimentos;
create policy lanca_recebimento on controle_recebimentos
  for insert with check (
    e_usuario_ativo()
    and quem = auth.uid()
    and meu_papel() in ('financeiro', 'diretoria')
  );

grant select, insert on controle_recebimentos to authenticated;
revoke update, delete on controle_recebimentos from authenticated;
grant usage on sequence controle_recebimentos_id_seq to authenticated;

-- O mês em que o cliente começa a ter o recebimento acompanhado. O último
-- lançado vale — mudar o início é lançar outro.
create table if not exists controle_recebimento_inicio (
  id       bigint generated always as identity primary key,
  cliente  text not null check (length(trim(cliente)) > 0),
  mes      date not null check (extract(day from mes) = 1),
  quem     uuid not null default auth.uid() references auth.users(id),
  em       timestamptz not null default now()
);

alter table controle_recebimento_inicio enable row level security;

drop policy if exists le_recebimento_inicio on controle_recebimento_inicio;
create policy le_recebimento_inicio on controle_recebimento_inicio
  for select using (e_usuario_ativo());

drop policy if exists define_recebimento_inicio on controle_recebimento_inicio;
create policy define_recebimento_inicio on controle_recebimento_inicio
  for insert with check (
    e_usuario_ativo()
    and quem = auth.uid()
    and meu_papel() in ('financeiro', 'diretoria')
  );

grant select, insert on controle_recebimento_inicio to authenticated;
revoke update, delete on controle_recebimento_inicio from authenticated;
grant usage on sequence controle_recebimento_inicio_id_seq to authenticated;

-- O recebido que vale em cada célula: o último lançado.
create or replace view controle_recebido_atual with (security_invoker = true) as
select distinct on (periodo_id, regiao_id, categoria)
       periodo_id, regiao_id, categoria, recebido, abertura, em, quem
from controle_recebimentos
order by periodo_id, regiao_id, categoria, id desc;

create or replace view controle_inicio_atual with (security_invoker = true) as
select distinct on (cliente) cliente, mes, em, quem
from controle_recebimento_inicio
order by cliente, id desc;

-- ---------------------------------------------------------------------
-- 2. A posição ganha o recebimento — as colunas novas entram NO FIM
-- ---------------------------------------------------------------------

create or replace view controle_posicao with (security_invoker = true) as
select cliente, periodo_id, mes, rotulo, regiao_id, regiao, ordem, categoria,
       saldo_anterior, medido, faturado, saldo,
       acompanha, abertura, recebido, a_receber_anterior, a_receber
from (
  select b.*,
         coalesce(sum(b.movimento) over w_antes, 0) as a_receber_anterior,
         sum(b.movimento) over w_ate as a_receber
  from (
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
             rows between unbounded preceding and current row) as saldo,
           -- O recebimento só conta do mês de início em diante.
           (i.mes is not null and p.mes >= i.mes) as acompanha,
           case when i.mes is not null and p.mes >= i.mes then coalesce(x.abertura, 0) else 0 end as abertura,
           case when i.mes is not null and p.mes >= i.mes then coalesce(x.recebido, 0) else 0 end as recebido,
           case when i.mes is not null and p.mes >= i.mes
                then coalesce(x.abertura, 0) + coalesce(a.faturado, 0) - coalesce(x.recebido, 0)
                else 0 end as movimento
    from controle_periodos p
    join controle_regioes r on r.cliente = p.cliente
    cross join (values ('manutencao'), ('locacao'), ('indenizacao')) c(categoria)
    left join controle_atual a
           on a.periodo_id = p.id and a.regiao_id = r.id and a.categoria = c.categoria
    left join controle_recebido_atual x
           on x.periodo_id = p.id and x.regiao_id = r.id and x.categoria = c.categoria
    left join controle_inicio_atual i on i.cliente = p.cliente
  ) b
  window w_antes as (partition by b.regiao_id, b.categoria order by b.mes
                     rows between unbounded preceding and 1 preceding),
         w_ate   as (partition by b.regiao_id, b.categoria order by b.mes
                     rows between unbounded preceding and current row)
) t
where saldo_anterior <> 0 or medido <> 0 or faturado <> 0
   or abertura <> 0 or recebido <> 0 or a_receber_anterior <> 0;

create or replace view controle_mes with (security_invoker = true) as
select cliente, periodo_id, mes, rotulo,
       sum(saldo_anterior) as saldo_anterior,
       sum(medido)         as medido,
       sum(faturado)       as faturado,
       sum(saldo)          as saldo,
       sum(saldo_anterior + medido) as a_faturar,
       bool_or(acompanha)       as acompanha,
       sum(abertura)            as abertura,
       sum(recebido)            as recebido,
       sum(a_receber_anterior)  as a_receber_anterior,
       sum(a_receber)           as a_receber
from controle_posicao
group by cliente, periodo_id, mes, rotulo;

grant select on controle_recebido_atual, controle_inicio_atual, controle_posicao, controle_mes
  to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 3. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'as duas tabelas existem com RLS' as item,
         case when (select count(*) from pg_tables where schemaname = 'medicoes' and rowsecurity
                     and tablename in ('controle_recebimentos', 'controle_recebimento_inicio')) = 2
              then '✓ ok' else '!! sem tabela ou sem RLS' end as situacao
  union all
  select 2, 'so financeiro e diretoria lancam recebimento',
         case when exists (select 1 from pg_policies where schemaname = 'medicoes'
                            and tablename = 'controle_recebimentos' and policyname = 'lanca_recebimento'
                            and with_check like '%financeiro%')
              then '✓ ok' else '!! a trava do papel nao esta la' end
  union all
  select 3, 'ninguem edita nem apaga recebimento',
         case when (select count(*) from pg_policies where schemaname = 'medicoes'
                     and tablename in ('controle_recebimentos', 'controle_recebimento_inicio')
                     and cmd in ('UPDATE', 'DELETE')) = 0
              then '✓ ok' else '!! existe policy de update ou delete' end
  union all
  select 4, 'a posicao mostra o a receber',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes'
                       and ((table_name = 'controle_posicao' and column_name in ('recebido', 'a_receber'))
                         or (table_name = 'controle_mes' and column_name = 'a_receber'))) = 3
              then '✓ ok' else '!! a view nao foi trocada' end
) r order by ordem;
