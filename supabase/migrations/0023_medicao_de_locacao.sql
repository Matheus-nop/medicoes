set search_path = medicoes, public;

-- =====================================================================
-- 0023: a medição de locação
-- (idempotente; rode depois da 0021 — a 0022 foi desfeita e não existe)
-- =====================================================================
--
-- A AEGEA pede a medição de locação do mês na planilha padrão dela ("EVIDÊNCIAS
-- - OS & Equip."): equipamento a equipamento, de todas as bases e de todos os
-- contratos, com projeto, município, superintendência e bloco. O time
-- digitava tudo a partir do "Boletim de medição" do Sisloc de cada base.
-- Agora o PDF do Sisloc se importa: cada boletim lido entra na medição do mês
-- do cliente, com as linhas como o Sisloc as deu.
--
--   bases.projeto, municipio, superintendencia, bloco — o que a planilha da
--        AEGEA pede de cada linha, digitado uma vez na base, e não em cada uma
--   bases.coordenador, coordenador_contato — o coordenador da AEGEA na base
--        (gente de fora, sem login: é texto)
--   locacao_medicoes — a medição de um cliente num mês, com o cabeçalho da
--        planilha (contratante, contrato, superintendência…)
--   locacao_boletins — um "Boletim de medição" do Sisloc importado (uma base)
--   locacao_itens    — as linhas dele, acessórios inclusive
--
-- A troca (a posição) não se grava: sai das linhas, pelo "Subs." do Sisloc,
-- em `posicoesDoBoletim` (lib/medicoes/locacao.ts). O total também não: é a
-- soma das linhas.
-- =====================================================================

-- 1. O que a AEGEA pede de cada base
alter table bases add column if not exists projeto text;
alter table bases add column if not exists municipio text;
alter table bases add column if not exists superintendencia text;
alter table bases add column if not exists bloco text;
alter table bases add column if not exists coordenador text;
alter table bases add column if not exists coordenador_contato text;

-- 2. A medição do mês
create table if not exists locacao_medicoes (
  id                  bigint generated always as identity primary key,
  cliente             text not null check (length(trim(cliente)) > 0),
  -- O mês da medição, no dia 1º.
  mes                 date not null check (extract(day from mes) = 1),
  -- O cabeçalho da planilha da AEGEA.
  contratante         text,
  obra                text,
  contrato_juridico   text,
  contrato_sistemico  text,
  superintendencia    text,
  observacao          text,
  criado_por          uuid not null default auth.uid() references auth.users(id),
  criado_em           timestamptz not null default now()
);

create unique index if not exists locacao_uma_medicao_por_mes
  on locacao_medicoes (chave_do_nome(cliente), mes);

-- 3. Os boletins do Sisloc que compõem a medição (um por base)
create table if not exists locacao_boletins (
  id              bigint generated always as identity primary key,
  medicao_id      bigint not null references locacao_medicoes(id) on delete cascade,
  base_id         bigint references bases(id) on delete set null,
  -- O nome da base como o Sisloc escreve (o Entrega sem o endereço) e o
  -- Entrega inteiro.
  base_nome       text not null check (length(trim(base_nome)) > 0),
  entrega         text not null,
  cliente_sisloc  text,
  cod_docto       text,
  fichas          text[] not null default '{}',
  periodo_inicio  date not null,
  periodo_fim     date not null check (periodo_fim >= periodo_inicio),
  -- O TOTAL GERAL do Sisloc, para conferir a soma das linhas.
  total_sisloc    numeric(14, 2),
  arquivo         text,
  importado_por   uuid not null default auth.uid() references auth.users(id),
  importado_em    timestamptz not null default now()
);

-- O mesmo boletim importado de novo substitui o anterior (a tela apaga e
-- grava): o código do documento identifica.
create unique index if not exists locacao_boletim_uma_vez
  on locacao_boletins (medicao_id, cod_docto) where cod_docto is not null;
create index if not exists locacao_boletins_da_medicao on locacao_boletins (medicao_id);

-- 4. As linhas, como o Sisloc deu
create table if not exists locacao_itens (
  id             bigint generated always as identity primary key,
  boletim_id     bigint not null references locacao_boletins(id) on delete cascade,
  ordem          integer not null,
  remessa        text not null,
  remessa_data   date,
  nf_remessa     text,
  grupo          text,
  qtde           numeric(10, 2) not null default 1,
  equipamento    text not null,
  patrimonio     text,
  inicio         date not null,
  fim            date not null check (fim >= inicio),
  dias           integer not null check (dias >= 0),
  substituido    boolean not null default false,
  valor_base     numeric(14, 2) not null default 0,
  valor_total    numeric(14, 2) not null default 0,
  -- O coordenador desta linha, quando não é o da base.
  coordenador    text
);

create index if not exists locacao_itens_do_boletim on locacao_itens (boletim_id);
create index if not exists locacao_itens_por_patrimonio on locacao_itens (patrimonio);

-- 5. RLS: todo mundo daqui lê; o faturamento e a diretoria lançam
alter table locacao_medicoes enable row level security;
alter table locacao_boletins enable row level security;
alter table locacao_itens enable row level security;

drop policy if exists le_locacao_medicoes on locacao_medicoes;
create policy le_locacao_medicoes on locacao_medicoes for select using ((select e_usuario_ativo()));
drop policy if exists abre_locacao_medicao on locacao_medicoes;
create policy abre_locacao_medicao on locacao_medicoes
  for insert with check (meu_papel() in ('faturamento', 'diretoria') and criado_por = auth.uid());
drop policy if exists muda_locacao_medicao on locacao_medicoes;
create policy muda_locacao_medicao on locacao_medicoes
  for update using (meu_papel() in ('faturamento', 'diretoria'))
  with check (meu_papel() in ('faturamento', 'diretoria'));
drop policy if exists apaga_locacao_medicao on locacao_medicoes;
create policy apaga_locacao_medicao on locacao_medicoes for delete using (e_diretoria());

drop policy if exists le_locacao_boletins on locacao_boletins;
create policy le_locacao_boletins on locacao_boletins for select using ((select e_usuario_ativo()));
drop policy if exists importa_locacao_boletim on locacao_boletins;
create policy importa_locacao_boletim on locacao_boletins
  for insert with check (meu_papel() in ('faturamento', 'diretoria') and importado_por = auth.uid());
drop policy if exists muda_locacao_boletim on locacao_boletins;
create policy muda_locacao_boletim on locacao_boletins
  for update using (meu_papel() in ('faturamento', 'diretoria'))
  with check (meu_papel() in ('faturamento', 'diretoria'));
drop policy if exists tira_locacao_boletim on locacao_boletins;
create policy tira_locacao_boletim on locacao_boletins
  for delete using (meu_papel() in ('faturamento', 'diretoria'));

drop policy if exists le_locacao_itens on locacao_itens;
create policy le_locacao_itens on locacao_itens for select using ((select e_usuario_ativo()));
drop policy if exists grava_locacao_item on locacao_itens;
create policy grava_locacao_item on locacao_itens
  for insert with check (meu_papel() in ('faturamento', 'diretoria'));
drop policy if exists muda_locacao_item on locacao_itens;
create policy muda_locacao_item on locacao_itens
  for update using (meu_papel() in ('faturamento', 'diretoria'))
  with check (meu_papel() in ('faturamento', 'diretoria'));
drop policy if exists tira_locacao_item on locacao_itens;
create policy tira_locacao_item on locacao_itens
  for delete using (meu_papel() in ('faturamento', 'diretoria'));

revoke all on locacao_medicoes, locacao_boletins, locacao_itens from anon;
grant select, insert, update, delete on locacao_medicoes, locacao_boletins, locacao_itens to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 6. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------
select ordem, o_que, situacao from (
  select 1 as ordem, 'as três tabelas, com RLS' as o_que,
         case when (select count(*) from pg_tables where schemaname = 'medicoes' and rowsecurity
                     and tablename in ('locacao_medicoes', 'locacao_boletins', 'locacao_itens')) = 3
              then '✓ ok' else '!! faltou tabela ou RLS' end as situacao
  union all
  select 2, 'a base tem os campos da AEGEA e o coordenador',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes' and table_name = 'bases'
                       and column_name in ('projeto', 'municipio', 'superintendencia', 'bloco',
                                           'coordenador', 'coordenador_contato')) = 6
              then '✓ ok' else '!! faltou coluna na base' end
  union all
  select 3, 'só o faturamento e a diretoria importam',
         case when (select count(*) from pg_policies where schemaname = 'medicoes' and cmd = 'INSERT'
                     and tablename in ('locacao_medicoes', 'locacao_boletins', 'locacao_itens')
                     and with_check like '%faturamento%' and with_check not like '%orcamento%') = 3
              then '✓ ok' else '!! confira as policies de gravar' end
  union all
  select 4, 'anon não lê nada',
         case when not exists (select 1 from information_schema.table_privileges
                                where table_schema = 'medicoes' and grantee = 'anon'
                                  and table_name in ('locacao_medicoes', 'locacao_boletins', 'locacao_itens'))
              then '✓ ok' else '!! anon tem acesso' end
) c
order by ordem;
