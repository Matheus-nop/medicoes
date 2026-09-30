set search_path = medicoes, public;

-- =====================================================================
-- 0002: o boletim de medição de manutenção
-- (idempotente; rode depois da 0001)
-- =====================================================================
--
-- Veio do Gestão de Estoque, onde nasceu como as migrações 0090 e 0091 — que
-- NÃO foram aplicadas lá e não devem ser: o boletim mora aqui agora.
--
-- A manutenção cobrada do cliente vira OM no Sisloc. No fim do período alguém
-- junta essas OMs, põe o valor, manda ao cliente aprovar e depois ao
-- faturamento. Aqui o boletim se monta COLANDO a lista do Sisloc
-- (`lib/medicoes/medicoes.ts` lê), e o painel sai das views.
--
-- AS TRÊS TABELAS
--
--   1. `boletins` — número, cliente, base e os dados do cliente que vão no
--      papel. Só o que não é conta.
--   2. `boletim_oms` — as OMs do boletim. `unique (om)`: uma OM entra em UM
--      boletim, nunca em dois.
--   3. `boletim_andamentos` — aberto, fechado, enviado, faturado. Append-only:
--      a situação é o ÚLTIMO andamento, e nunca uma coluna.
--
-- O QUE A RLS TRAVA
--
--   · OM só entra, muda ou sai com o boletim ABERTO.
--   · Só a diretoria reabre (restritiva).
--   · Ninguém edita nem apaga andamento — não há policy nem grant.
--   · Ninguém assina no lugar de outro: `criado_por`, `incluido_por` e `quem`
--     são `auth.uid()`.
--
-- O "está aberto" é uma subconsulta em `boletim_andamentos`, e não a view:
-- uma policy em `boletim_oms` que lesse uma view que lê `boletim_oms` entraria
-- em recursão. Pelo mesmo motivo a policy de `boletim_andamentos` não confere a
-- ordem dos passos (seria a tabela lendo a si mesma): a ordem é da tela, e
-- reabrir — o único passo para trás — é da diretoria.

-- ---------------------------------------------------------------------
-- 1. As tabelas
-- ---------------------------------------------------------------------

create sequence if not exists boletim_numero_seq;

create table if not exists boletins (
  id          bigint generated always as identity primary key,
  -- BM-0001. Número de sequência, e não por cliente nem por mês: é o que vai
  -- no papel e no e-mail, e o que tem de ser único sem conversa.
  numero      text not null unique
              default ('BM-' || lpad(nextval('medicoes.boletim_numero_seq')::text, 4, '0')),
  -- O nome como o Sisloc escreve. Não é pessoa, e o cadastro de clientes do
  -- Roteiros não conhece metade dos nomes do Sisloc — o mesmo texto que o
  -- Estoque grava em `estoque.orcamentos.cliente`.
  cliente     text not null check (length(trim(cliente)) > 0),
  -- O MÊS DE REFERÊNCIA do papel: "AGOSTO/2026", o mês do serviço (o boletim
  -- de agosto se emite em setembro). Nasce da OM mais recente e se corrige à
  -- mão; o período de verdade sai das OMs (na view).
  referencia  text,
  observacao  text,
  -- A base / fiscalização do cliente — um boletim por base. É o "Nome local
  -- de entrega" do Sisloc.
  base        text,
  -- Os dados do cliente que vão no papel. Gente de fora, sem login: texto.
  -- São do BOLETIM, e não de um cadastro: o papel de agosto não muda porque o
  -- contato trocou em outubro. O boletim novo nasce com os do último da mesma
  -- base, que é o que evita digitar tudo de novo todo mês.
  contato     text,
  email       text,
  telefone    text,
  local_obra  text,
  criado_por  uuid not null default auth.uid() references auth.users(id),
  criado_em   timestamptz not null default now()
);

create table if not exists boletim_oms (
  id           bigint generated always as identity primary key,
  boletim_id   bigint not null references boletins(id) on delete cascade,
  -- O `Número` do Sisloc, com os zeros da frente ("034292").
  om           text not null check (om ~ '^[0-9]{3,10}$'),
  -- Retrato da OM no instante da colagem. Não é cópia de cadastro: é o que o
  -- cliente vai ler no papel, e o papel não pode mudar porque o Sisloc mudou.
  patrimonio   text,
  equipamento  text,
  -- "Nome local de entrega": a base e a obra, juntas ("BASE NORTE - ILHA").
  local        text,
  cidade       text,
  tipo_om      text,
  complemento  text,
  aberta_em    timestamptz,
  concluida_em timestamptz,
  entregue_em  timestamptz,
  -- CUSTO, como veio: "Total previsto" e "Total Gasto (R$)".
  previsto     numeric(12,2),
  gasto        numeric(12,2),
  -- PREÇO aprovado, quando houve orçamento: "Vl. orçamento".
  orcamento    numeric(12,2),
  -- O que se COBRA. Não é conta: é decisão, e muda enquanto o boletim está
  -- aberto. `fonte` diz de onde veio o número — e `manual` quando alguém o
  -- trocou, para custo repassado não passar por preço sem ninguém ver.
  valor        numeric(12,2) not null default 0 check (valor >= 0),
  fonte        text not null default 'nenhum'
               check (fonte in ('orcamento', 'previsto', 'gasto', 'nenhum', 'manual')),
  observacao   text,
  -- "RECIBO RETIRADA" e "RECIBO ENTREGA" do papel: a OM de entrada e a do
  -- retorno no Sisloc. Vêm da colagem, da OS do Estoque ou do Roteiros (0003),
  -- ou se digitam.
  om_retirada    text,
  recibo_entrega text,
  chegada_em     timestamptz,
  -- A coluna "O" no instante da colagem ("5 - Oficina executando…").
  etapa_om       text,
  -- A linha colada, para conferir de onde saiu cada campo.
  origem       text,
  incluido_por uuid not null default auth.uid() references auth.users(id),
  incluido_em  timestamptz not null default now(),
  constraint boletim_om_uma_vez unique (om)
);

create index if not exists boletim_oms_boletim on boletim_oms (boletim_id);

create table if not exists boletim_andamentos (
  id          bigint generated always as identity primary key,
  boletim_id  bigint not null references boletins(id) on delete cascade,
  situacao    text not null check (situacao in ('aberto', 'fechado', 'enviado', 'faturado')),
  quem        uuid not null default auth.uid() references auth.users(id),
  em          timestamptz not null default now(),
  -- Por que reabriu, número da NF, "enviado para fulano@cliente". Livre.
  observacao  text
);

create index if not exists boletim_andamentos_boletim on boletim_andamentos (boletim_id, id desc);

-- ---------------------------------------------------------------------
-- 2. As views — a situação, os totais e o painel por cliente
-- ---------------------------------------------------------------------
--
-- `security_invoker`: quem lê a view passa pela RLS das tabelas, como em
-- todas as outras views do medicoes.

-- A situação é o último andamento. Pelo `id`, e não pelo `em`: dois
-- andamentos na mesma transação têm o mesmo `now()`.
create or replace view boletim_situacao with (security_invoker = true) as
select b.id as boletim_id,
       coalesce(a.situacao, 'aberto') as situacao,
       a.em   as situacao_em,
       a.quem as situacao_por
from boletins b
left join lateral (
  select x.situacao, x.em, x.quem
  from boletim_andamentos x
  where x.boletim_id = b.id
  order by x.id desc
  limit 1
) a on true;

-- A OM com o custo que vale: o gasto lançado, e o previsto enquanto não há
-- gasto. É a coluna que a margem usa.
create or replace view boletim_oms_atual with (security_invoker = true) as
select i.id, i.boletim_id, i.om, i.patrimonio, i.equipamento, i.local, i.cidade,
       i.tipo_om, i.complemento, i.aberta_em, i.concluida_em, i.entregue_em,
       i.previsto, i.gasto, i.orcamento, i.valor, i.fonte, i.observacao,
       i.incluido_em,
       coalesce(i.gasto, i.previsto) as custo,
       i.om_retirada, i.recibo_entrega, i.chegada_em, i.etapa_om
from boletim_oms i;

create or replace view boletins_atual with (security_invoker = true) as
select b.id, b.numero, b.cliente, b.referencia, b.observacao, b.criado_em,
       pc.nome as criado_por_nome,
       s.situacao, s.situacao_em,
       ps.nome as situacao_por_nome,
       coalesce(t.oms, 0)   as oms,
       coalesce(t.valor, 0) as valor,
       t.custo,
       t.primeira_om,
       t.ultima_om,
       b.base, b.contato, b.email, b.telefone, b.local_obra,
       -- A DATA DE EMISSÃO: o último fechamento. Reaberto e fechado de novo,
       -- vale o novo — o papel que sai é o de agora.
       f.fechado_em
from boletins b
join boletim_situacao s on s.boletim_id = b.id
left join perfis pc on pc.id = b.criado_por
left join perfis ps on ps.id = s.situacao_por
left join (
  select boletim_id,
         count(*)::int as oms,
         sum(valor) as valor,
         sum(coalesce(gasto, previsto)) as custo,
         min(coalesce(concluida_em, aberta_em)) as primeira_om,
         max(coalesce(concluida_em, aberta_em)) as ultima_om
  from boletim_oms
  group by boletim_id
) t on t.boletim_id = b.id
left join (
  select boletim_id, max(em) as fechado_em
  from boletim_andamentos
  where situacao = 'fechado'
  group by boletim_id
) f on f.boletim_id = b.id;

-- O painel que hoje sai da planilha: medido, faturado e saldo por cliente.
--
--   em_medicao — boletim aberto: o número ainda muda, e por isso fica à parte.
--   medido     — fechado, enviado ou faturado: o que foi apresentado.
--   faturado   — o que o financeiro já faturou.
--   saldo      — medido e não faturado. É o que se cobra de dentro de casa.
--
-- A mesma conta vive em `saldoPorCliente` (lib/medicoes/medicoes.ts), com teste.
create or replace view por_cliente with (security_invoker = true) as
select cliente,
       count(*)::int as boletins,
       sum(oms)::int as oms,
       coalesce(sum(valor) filter (where situacao = 'aberto'), 0)   as em_medicao,
       coalesce(sum(valor) filter (where situacao <> 'aberto'), 0)  as medido,
       coalesce(sum(valor) filter (where situacao = 'faturado'), 0) as faturado,
       coalesce(sum(valor) filter (where situacao in ('fechado', 'enviado')), 0) as saldo,
       max(criado_em) as ultimo_boletim
from boletins_atual
group by cliente;

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------

alter table boletins   enable row level security;
alter table boletim_oms      enable row level security;
alter table boletim_andamentos enable row level security;

-- Leitura: quem é usuário do medicoes. A conta da oficina (a TV) não entra.
drop policy if exists le_boletins on boletins;
create policy le_boletins on boletins
  for select using (e_usuario_ativo());

drop policy if exists le_boletim_oms on boletim_oms;
create policy le_boletim_oms on boletim_oms
  for select using (e_usuario_ativo());

drop policy if exists le_boletim_andamentos on boletim_andamentos;
create policy le_boletim_andamentos on boletim_andamentos
  for select using (e_usuario_ativo());

-- O boletim nasce em nome de quem abre.
drop policy if exists abre_boletim on boletins;
create policy abre_boletim on boletins
  for insert with check (e_usuario_ativo() and criado_por = auth.uid());

-- Referência e observação mudam só com o boletim aberto.
drop policy if exists edita_boletim_aberto on boletins;
create policy edita_boletim_aberto on boletins
  for update
  using (
    e_usuario_ativo()
    and coalesce((select a.situacao from boletim_andamentos a
                   where a.boletim_id = boletins.id
                   order by a.id desc limit 1), 'aberto') = 'aberto'
  )
  with check (e_usuario_ativo());

-- Apagar: só aberto, e só quem abriu ou a diretoria. É para o boletim criado por
-- engano — o que já foi para o cliente não se apaga, se reabre.
drop policy if exists apaga_boletim_aberto on boletins;
create policy apaga_boletim_aberto on boletins
  for delete
  using (
    (e_diretoria() or (e_usuario_ativo() and criado_por = auth.uid()))
    and coalesce((select a.situacao from boletim_andamentos a
                   where a.boletim_id = boletins.id
                   order by a.id desc limit 1), 'aberto') = 'aberto'
  );

-- A OM entra, muda e sai só com o boletim aberto.
drop policy if exists inclui_om on boletim_oms;
create policy inclui_om on boletim_oms
  for insert with check (
    e_usuario_ativo()
    and incluido_por = auth.uid()
    and coalesce((select a.situacao from boletim_andamentos a
                   where a.boletim_id = boletim_oms.boletim_id
                   order by a.id desc limit 1), 'aberto') = 'aberto'
  );

drop policy if exists edita_om on boletim_oms;
create policy edita_om on boletim_oms
  for update
  using (
    e_usuario_ativo()
    and coalesce((select a.situacao from boletim_andamentos a
                   where a.boletim_id = boletim_oms.boletim_id
                   order by a.id desc limit 1), 'aberto') = 'aberto'
  )
  with check (
    e_usuario_ativo()
    and coalesce((select a.situacao from boletim_andamentos a
                   where a.boletim_id = boletim_oms.boletim_id
                   order by a.id desc limit 1), 'aberto') = 'aberto'
  );

drop policy if exists tira_om on boletim_oms;
create policy tira_om on boletim_oms
  for delete
  using (
    e_usuario_ativo()
    and coalesce((select a.situacao from boletim_andamentos a
                   where a.boletim_id = boletim_oms.boletim_id
                   order by a.id desc limit 1), 'aberto') = 'aberto'
  );

-- O andamento é assinado por quem aperta.
drop policy if exists registra_andamento on boletim_andamentos;
create policy registra_andamento on boletim_andamentos
  for insert with check (e_usuario_ativo() and quem = auth.uid());

-- Reabrir é da diretoria. Restritiva: soma-se à de cima, não a substitui.
drop policy if exists so_diretoria_reabre on boletim_andamentos;
create policy so_diretoria_reabre on boletim_andamentos
  as restrictive for insert
  with check (situacao <> 'aberto' or e_diretoria());

-- Sem policy de update nem de delete em `boletim_andamentos`: nem a diretoria
-- reescreve a história do boletim.

-- ---------------------------------------------------------------------
-- 4. Privilégios — RLS filtra linha, GRANT decide quem chega na tabela
-- ---------------------------------------------------------------------

grant select on
  boletins, boletim_oms, boletim_andamentos,
  boletim_situacao, boletim_oms_atual, boletins_atual,
  por_cliente
  to authenticated;

grant insert, update, delete on boletins, boletim_oms to authenticated;
grant insert on boletim_andamentos to authenticated;

grant usage on sequence boletim_numero_seq to authenticated;
grant usage on sequence boletins_id_seq to authenticated;
grant usage on sequence boletim_oms_id_seq to authenticated;
grant usage on sequence boletim_andamentos_id_seq to authenticated;

-- O PostgREST só enxerga tabela nova depois de recarregar o cache.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 5. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'as tres tabelas existem' as item,
         case when (select count(*) from information_schema.tables
                     where table_schema = 'medicoes'
                       and table_name in ('boletins', 'boletim_oms', 'boletim_andamentos')) = 3
              then '✓ ok' else '!! faltou alguma' end as situacao
  union all
  select 2, 'as quatro views existem',
         case when (select count(*) from information_schema.views
                     where table_schema = 'medicoes'
                       and table_name in ('boletim_situacao', 'boletim_oms_atual',
                                          'boletins_atual', 'por_cliente')) = 4
              then '✓ ok' else '!! faltou alguma' end
  union all
  select 3, 'RLS ativa nas tres tabelas',
         case when (select count(*) from pg_tables
                     where schemaname = 'medicoes' and rowsecurity
                       and tablename in ('boletins', 'boletim_oms', 'boletim_andamentos')) = 3
              then '✓ ok' else '!! alguma ficou aberta' end
  union all
  select 4, 'a mesma OM nao entra em dois boletins',
         case when exists (select 1 from pg_constraint where conname = 'boletim_om_uma_vez')
              then '✓ ok' else '!! faltou a constraint' end
  union all
  select 5, 'ninguem edita nem apaga andamento',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and tablename = 'boletim_andamentos'
                       and cmd in ('UPDATE', 'DELETE')) = 0
              then '✓ ok' else '!! existe policy de update ou delete' end
  union all
  select 6, 'so a diretoria reabre',
         case when exists (select 1 from pg_policies where schemaname = 'medicoes'
                            and tablename = 'boletim_andamentos'
                            and policyname = 'so_diretoria_reabre'
                            and permissive = 'RESTRICTIVE')
              then '✓ ok' else '!! a trava nao e restritiva' end
  union all
  select 7, 'as tres policies de OM exigem boletim aberto',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and tablename = 'boletim_oms'
                       and cmd in ('INSERT', 'UPDATE', 'DELETE')
                       and coalesce(qual, '') || coalesce(with_check, '') like '%boletim_andamentos%') = 3
              then '✓ ok' else '!! da para mexer em OM de boletim fechado' end
  union all
  select 8, 'a situacao nao e coluna de lugar nenhum',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes' and table_name = 'boletins'
                       and column_name in ('situacao', 'total', 'valor')) = 0
              then '✓ ok' else '!! alguem gravou conta no boletim' end
) r order by ordem;
