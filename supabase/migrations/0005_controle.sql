set search_path = medicoes, public;

-- =====================================================================
-- 0005: o controle de medições — manutenção, locação e indenização
-- (idempotente; rode depois da 0004)
-- =====================================================================
--
-- É a planilha "CONTROLE DE MEDIÇÕES", e não o boletim. O boletim é a
-- manutenção OM por OM; o controle é o retrato do mês de TODO o contrato —
-- manutenção, locação e indenização (extravios) —, região por região, com o
-- que foi medido e o que foi faturado. É dele que sai o painel da diretoria.
--
-- A REGRA DA PLANILHA, QUE CONTINUA VALENDO
--
--   Cada mês é a FOTO do saldo em aberto naquele mês (acumulada). Não se somam
--   meses: a posição atual é a foto mais recente. Por isso o período é uma
--   linha própria e o painel escolhe UM período, nunca uma soma deles.
--
-- AS TRÊS TABELAS
--
--   1. `controle_regioes` — as regiões de um cliente (NORTE, SUL, VCG…), na
--      ordem da planilha. Região é do cliente: a Rio+ tem as bases dela.
--   2. `controle_periodos` — o mês de cada foto. `mes` é o primeiro dia do
--      último mês coberto (Jun/Jul 2025 é julho), e `rotulo` é como a
--      planilha escreve.
--   3. `controle_valores` — medido e faturado de uma região, numa categoria,
--      num período. Append-only, como o andamento: corrigir é lançar de novo,
--      e o valor que vale é o ÚLTIMO. A história de quem mudou o número fica.
--
-- O saldo, o total e o % faturado não são coluna: saem de `controle_atual`.
-- A mesma conta vive em `lib/medicoes/controle.ts`, com teste.
--
-- `quem` pode ser nulo só numa linha: a que veio da planilha antiga, semeada
-- pelo SQL Editor (onde não há `auth.uid()`). Pela tela, a policy exige que
-- seja quem está logado.

-- ---------------------------------------------------------------------
-- 1. As tabelas
-- ---------------------------------------------------------------------

create table if not exists controle_regioes (
  id       bigint generated always as identity primary key,
  cliente  text not null check (length(trim(cliente)) > 0),
  nome     text not null check (length(trim(nome)) > 0),
  ordem    int  not null default 0,
  constraint controle_regiao_uma_vez unique (cliente, nome)
);

create table if not exists controle_periodos (
  id       bigint generated always as identity primary key,
  cliente  text not null check (length(trim(cliente)) > 0),
  mes      date not null check (extract(day from mes) = 1),
  rotulo   text not null check (length(trim(rotulo)) > 0),
  constraint controle_periodo_uma_vez unique (cliente, mes)
);

create table if not exists controle_valores (
  id          bigint generated always as identity primary key,
  periodo_id  bigint not null references controle_periodos(id),
  regiao_id   bigint not null references controle_regioes(id),
  categoria   text not null check (categoria in ('manutencao', 'locacao', 'indenizacao')),
  medido      numeric(14,2) not null default 0,
  faturado    numeric(14,2) not null default 0,
  observacao  text,
  quem        uuid default auth.uid() references auth.users(id),
  em          timestamptz not null default now()
);

create index if not exists controle_valores_celula
  on controle_valores (periodo_id, regiao_id, categoria, id desc);

-- ---------------------------------------------------------------------
-- 2. As views
-- ---------------------------------------------------------------------

-- O valor que vale em cada célula: o último lançado. Pelo `id`, e não pelo
-- `em`, como no andamento.
create or replace view controle_atual with (security_invoker = true) as
select distinct on (v.periodo_id, v.regiao_id, v.categoria)
       p.cliente, p.id as periodo_id, p.mes, p.rotulo,
       r.id as regiao_id, r.nome as regiao, r.ordem,
       v.categoria, v.medido, v.faturado,
       v.medido - v.faturado as saldo,
       v.observacao, v.em, v.quem
from controle_valores v
join controle_periodos p on p.id = v.periodo_id
join controle_regioes  r on r.id = v.regiao_id
order by v.periodo_id, v.regiao_id, v.categoria, v.id desc;

-- Um período inteiro, por categoria: a linha do "RESUMO EXECUTIVO".
create or replace view controle_por_periodo with (security_invoker = true) as
select cliente, periodo_id, mes, rotulo,
       coalesce(sum(medido)   filter (where categoria = 'manutencao'), 0)  as manutencao_medido,
       coalesce(sum(faturado) filter (where categoria = 'manutencao'), 0)  as manutencao_faturado,
       coalesce(sum(medido)   filter (where categoria = 'locacao'), 0)     as locacao_medido,
       coalesce(sum(faturado) filter (where categoria = 'locacao'), 0)     as locacao_faturado,
       coalesce(sum(medido)   filter (where categoria = 'indenizacao'), 0) as indenizacao_medido,
       coalesce(sum(faturado) filter (where categoria = 'indenizacao'), 0) as indenizacao_faturado,
       sum(medido)   as medido,
       sum(faturado) as faturado,
       sum(medido) - sum(faturado) as saldo,
       case when sum(medido) > 0 then round(sum(faturado) / sum(medido), 4) end as fracao_faturada
from controle_atual
group by cliente, periodo_id, mes, rotulo;

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------

alter table controle_regioes  enable row level security;
alter table controle_periodos enable row level security;
alter table controle_valores  enable row level security;

drop policy if exists le_controle_regioes on controle_regioes;
create policy le_controle_regioes on controle_regioes
  for select using (e_usuario_ativo());

drop policy if exists le_controle_periodos on controle_periodos;
create policy le_controle_periodos on controle_periodos
  for select using (e_usuario_ativo());

drop policy if exists le_controle_valores on controle_valores;
create policy le_controle_valores on controle_valores
  for select using (e_usuario_ativo());

-- Região e período nascem pela tela, de qualquer usuário ativo. O nome e a
-- ordem da região se acertam; o período não muda de mês (seria outra foto).
drop policy if exists cria_regiao on controle_regioes;
create policy cria_regiao on controle_regioes
  for insert with check (e_usuario_ativo());

drop policy if exists acerta_regiao on controle_regioes;
create policy acerta_regiao on controle_regioes
  for update using (e_usuario_ativo()) with check (e_usuario_ativo());

drop policy if exists cria_periodo on controle_periodos;
create policy cria_periodo on controle_periodos
  for insert with check (e_usuario_ativo());

-- O valor é assinado por quem lança.
drop policy if exists lanca_valor on controle_valores;
create policy lanca_valor on controle_valores
  for insert with check (e_usuario_ativo() and quem = auth.uid());

-- Sem policy de update nem de delete em `controle_valores`: o número errado se
-- corrige lançando o certo por cima, e o errado fica na história.

-- ---------------------------------------------------------------------
-- 4. Privilégios
-- ---------------------------------------------------------------------

grant select on controle_regioes, controle_periodos, controle_valores,
                controle_atual, controle_por_periodo
  to authenticated;
grant insert, update on controle_regioes to authenticated;
grant insert on controle_periodos, controle_valores to authenticated;
revoke update, delete on controle_valores from authenticated;
revoke update, delete on controle_periodos from authenticated;
revoke delete on controle_regioes from authenticated;

grant usage on sequence controle_regioes_id_seq, controle_periodos_id_seq,
                        controle_valores_id_seq
  to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 5. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'as tres tabelas existem com RLS' as item,
         case when (select count(*) from pg_tables
                     where schemaname = 'medicoes' and rowsecurity
                       and tablename in ('controle_regioes', 'controle_periodos',
                                         'controle_valores')) = 3
              then '✓ ok' else '!! faltou tabela ou RLS' end as situacao
  union all
  select 2, 'as duas views existem',
         case when (select count(*) from information_schema.views
                     where table_schema = 'medicoes'
                       and table_name in ('controle_atual', 'controle_por_periodo')) = 2
              then '✓ ok' else '!! faltou view' end
  union all
  select 3, 'ninguem edita nem apaga valor lancado',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and tablename = 'controle_valores'
                       and cmd in ('UPDATE', 'DELETE')) = 0
              then '✓ ok' else '!! existe policy de update ou delete' end
  union all
  select 4, 'o saldo nao e coluna',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes' and table_name = 'controle_valores'
                       and column_name in ('saldo', 'total')) = 0
              then '✓ ok' else '!! alguem gravou conta' end
) r order by ordem;
