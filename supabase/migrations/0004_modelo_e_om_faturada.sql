set search_path = medicoes, public;

-- =====================================================================
-- 0004: um papel por cliente, e a OM faturada uma a uma
-- (idempotente; rode depois da 0003)
-- =====================================================================
--
-- DOIS PAPÉIS
--
--   O Águas do Rio / AEGEA recebe o modelo TESTE 2 (recibo de retirada e de
--   entrega, rodapé da Ação). A Rio+ Saneamento recebe o "BM Manutenção Rio
--   Saneamento padrão 2026": quatro caixas no topo (a quarta é a base), sem
--   recibos, e uma coluna STATUS — PENDENTE ou FATURADO — por OM.
--
--   `modelo` é escolha do boletim, e não conta: nasce do cliente (a tela
--   sabe que "RIO+" é Rio+) e se troca à mão. Fica no boletim, e não num
--   cadastro, pelo mesmo motivo do contato: o papel de agosto não muda porque
--   o cliente trocou de modelo em outubro.
--
--   `documento` é o DOCUMENTO Nº escrito à mão. Vazio, vale o da casa
--   (BM-0001 - AGOSTO/2026). A Rio+ numera por base ("12" em Campo Grande,
--   "08" em Piraí) — quem manda nessa conta é o cliente, e por isso se digita.
--
-- A OM FATURADA
--
--   A Rio+ fatura OM por OM, e o boletim sai com o status de cada uma. Não é
--   coluna da OM: é uma linha em `om_faturadas`, com a nota e quem registrou.
--   E só existe com o boletim JÁ FECHADO — o que não foi apresentado não se
--   fatura. O boletim inteiro faturado (o último andamento) conta todas.
--
--   Desfazer é apagar a linha, e só quem a registrou ou a diretoria apaga.
--   É a marcação errada no dia; o que já foi para o cliente se corrige
--   reabrindo, como sempre.

-- ---------------------------------------------------------------------
-- 1. O modelo e o documento no boletim
-- ---------------------------------------------------------------------

alter table boletins add column if not exists modelo text not null default 'acao'
  check (modelo in ('acao', 'rio_mais'));
alter table boletins add column if not exists documento text;

-- ---------------------------------------------------------------------
-- 2. A OM faturada
-- ---------------------------------------------------------------------

create table if not exists om_faturadas (
  id             bigint generated always as identity primary key,
  boletim_om_id  bigint not null references boletim_oms(id) on delete cascade,
  nota_fiscal    text,
  faturada_em    date not null default current_date,
  quem           uuid not null default auth.uid() references auth.users(id),
  em             timestamptz not null default now(),
  constraint om_faturada_uma_vez unique (boletim_om_id)
);

alter table om_faturadas enable row level security;

drop policy if exists le_om_faturadas on om_faturadas;
create policy le_om_faturadas on om_faturadas
  for select using (e_usuario_ativo());

-- Só com o boletim fechado ou enviado: aberto ainda não foi apresentado, e
-- faturado já conta tudo.
drop policy if exists fatura_om on om_faturadas;
create policy fatura_om on om_faturadas
  for insert with check (
    e_usuario_ativo()
    and quem = auth.uid()
    and (select coalesce((select a.situacao from boletim_andamentos a
                           where a.boletim_id = i.boletim_id
                           order by a.id desc limit 1), 'aberto')
           from boletim_oms i where i.id = om_faturadas.boletim_om_id)
        in ('fechado', 'enviado')
  );

drop policy if exists desfaz_om_faturada on om_faturadas;
create policy desfaz_om_faturada on om_faturadas
  for delete using (e_diretoria() or (e_usuario_ativo() and quem = auth.uid()));

grant select, insert, delete on om_faturadas to authenticated;
grant usage on sequence om_faturadas_id_seq to authenticated;

-- ---------------------------------------------------------------------
-- 3. As views — as colunas novas entram NO FIM (create or replace view
--    não deixa mudar a ordem das que já existem)
-- ---------------------------------------------------------------------

create or replace view boletim_oms_atual with (security_invoker = true) as
select i.id, i.boletim_id, i.om, i.patrimonio, i.equipamento, i.local, i.cidade,
       i.tipo_om, i.complemento, i.aberta_em, i.concluida_em, i.entregue_em,
       i.previsto, i.gasto, i.orcamento, i.valor, i.fonte, i.observacao,
       i.incluido_em,
       coalesce(i.gasto, i.previsto) as custo,
       i.om_retirada, i.recibo_entrega, i.chegada_em, i.etapa_om,
       -- Faturada: marcada uma a uma, ou o boletim inteiro faturado.
       (f.id is not null or s.situacao = 'faturado') as faturada,
       f.nota_fiscal,
       f.faturada_em
from boletim_oms i
join boletim_situacao s on s.boletim_id = i.boletim_id
left join om_faturadas f on f.boletim_om_id = i.id;

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
       f.fechado_em,
       b.modelo,
       b.documento,
       -- O que já se faturou deste boletim: tudo, se ele foi faturado
       -- inteiro; senão, a soma das OMs marcadas.
       case when s.situacao = 'faturado' then coalesce(t.valor, 0)
            else coalesce(t.faturado, 0) end as faturado,
       case when s.situacao = 'faturado' then coalesce(t.oms, 0)
            else coalesce(t.oms_faturadas, 0) end as oms_faturadas
from boletins b
join boletim_situacao s on s.boletim_id = b.id
left join perfis pc on pc.id = b.criado_por
left join perfis ps on ps.id = s.situacao_por
left join (
  select i.boletim_id,
         count(*)::int as oms,
         sum(i.valor) as valor,
         sum(coalesce(i.gasto, i.previsto)) as custo,
         min(coalesce(i.concluida_em, i.aberta_em)) as primeira_om,
         max(coalesce(i.concluida_em, i.aberta_em)) as ultima_om,
         sum(i.valor) filter (where x.id is not null) as faturado,
         (count(x.id))::int as oms_faturadas
  from boletim_oms i
  left join om_faturadas x on x.boletim_om_id = i.id
  group by i.boletim_id
) t on t.boletim_id = b.id
left join (
  select boletim_id, max(em) as fechado_em
  from boletim_andamentos
  where situacao = 'fechado'
  group by boletim_id
) f on f.boletim_id = b.id;

-- O faturado agora conta a OM faturada sozinha. Mesma conta de
-- `saldoPorCliente` (lib/medicoes/medicoes.ts).
create or replace view por_cliente with (security_invoker = true) as
select cliente,
       count(*)::int as boletins,
       sum(oms)::int as oms,
       coalesce(sum(valor) filter (where situacao = 'aberto'), 0)     as em_medicao,
       coalesce(sum(valor) filter (where situacao <> 'aberto'), 0)    as medido,
       coalesce(sum(faturado) filter (where situacao <> 'aberto'), 0) as faturado,
       coalesce(sum(valor - faturado) filter (where situacao <> 'aberto'), 0) as saldo,
       max(criado_em) as ultimo_boletim
from boletins_atual
group by cliente;

grant select on boletim_oms_atual, boletins_atual, por_cliente to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 4. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'o boletim tem modelo e documento' as item,
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes' and table_name = 'boletins'
                       and column_name in ('modelo', 'documento')) = 2
              then '✓ ok' else '!! faltou coluna' end as situacao
  union all
  select 2, 'om_faturadas existe com RLS',
         case when exists (select 1 from pg_tables where schemaname = 'medicoes'
                            and tablename = 'om_faturadas' and rowsecurity)
              then '✓ ok' else '!! sem tabela ou sem RLS' end
  union all
  select 3, 'OM so se fatura de boletim fechado ou enviado',
         case when exists (select 1 from pg_policies where schemaname = 'medicoes'
                            and tablename = 'om_faturadas' and policyname = 'fatura_om'
                            and with_check like '%fechado%')
              then '✓ ok' else '!! a trava nao esta la' end
  union all
  select 4, 'ninguem edita OM faturada (so apaga)',
         case when (select count(*) from pg_policies where schemaname = 'medicoes'
                     and tablename = 'om_faturadas' and cmd = 'UPDATE') = 0
              then '✓ ok' else '!! existe policy de update' end
  union all
  select 5, 'as views mostram o faturado',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'medicoes'
                       and ((table_name = 'boletins_atual' and column_name in ('faturado', 'modelo'))
                         or (table_name = 'boletim_oms_atual' and column_name = 'faturada'))) = 3
              then '✓ ok' else '!! a view nao foi trocada' end
) r order by ordem;
