set search_path = medicoes, public;

-- =====================================================================
-- 0013: os contratos
-- (idempotente; rode depois da 0012)
-- =====================================================================
--
-- O contrato é o que está por trás das medições: com quem, o quê, até
-- quando, quanto e por qual índice se reajusta. A casa precisa saber três
-- coisas sem abrir a pasta: o que vence, o que está para reajustar e quanto
-- do valor do contrato já foi medido.
--
--   contratos          — o cadastro. Se corrige (o cadastro errado é só
--                        errado); o que MUDA o contrato é aditivo.
--   contrato_aditivos  — prorrogação, reajuste, acréscimo ou supressão de
--                        valor, encerramento. Não se reescreve: o aditivo
--                        lançado por engano a diretoria apaga.
--   contratos_atual    — a vigência e o valor de hoje, e o medido no
--                        controle durante a vigência. Tudo conta, nada
--                        gravado.
--
-- A situação (vigente, vence, vencido, encerrado) e o próximo reajuste
-- dependem de "hoje" e moram em `lib/medicoes/contratos.ts`, como a idade do
-- aberto mora em `controle.ts`.
--
-- O medido vem do controle do cliente (`controle_atual`), pela chave do nome
-- — e pelo vínculo da 0012, quando o contrato está com o nome do Sisloc. Um
-- contrato pode valer só para algumas categorias (o de locação não conta a
-- manutenção); vazio, conta as três.

-- ---------------------------------------------------------------------
-- 1. A chave da ficha — a de `chaveDaFicha` em lib/medicoes/arquivo.ts
-- ---------------------------------------------------------------------

-- O parâmetro não se chama `nome`: dentro da subconsulta, `nome` seria a
-- coluna do vínculo, e a conta compararia o vínculo com ele mesmo.
create or replace function chave_da_ficha(um_nome text)
returns text language sql stable
as $fn$
  select medicoes.chave_do_nome(coalesce(
    (select v.cliente from medicoes.vinculos_de_cliente v
      where medicoes.chave_do_nome(v.nome) = medicoes.chave_do_nome(um_nome) limit 1),
    um_nome))
$fn$;

grant execute on function chave_da_ficha(text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. As tabelas
-- ---------------------------------------------------------------------

create table if not exists contratos (
  id               bigint generated always as identity primary key,
  numero           text not null check (length(trim(numero)) > 0),
  cliente          text not null check (length(trim(cliente)) > 0),
  objeto           text,
  vigencia_inicio  date not null,
  vigencia_fim     date not null,
  -- O valor global. Vazio no contrato por preço unitário, sem teto.
  valor            numeric(14, 2) check (valor is null or valor >= 0),
  -- As categorias do controle que o contrato cobre. Vazio: as três.
  categorias       text[] check (categorias is null
                     or categorias <@ array['manutencao', 'locacao', 'indenizacao']::text[]),
  indice           text check (indice in ('IPCA', 'IGP-M', 'INPC', 'IPC-FIPE', 'outro')),
  -- O aniversário do reajuste. Vazio: o início da vigência.
  data_base        date,
  -- Com quantos dias de antecedência a tela começa a avisar o vencimento.
  aviso_dias       integer not null default 90 check (aviso_dias between 0 and 365),
  -- O gestor do contrato no cliente: gente de fora, sem login.
  contato          text,
  email            text,
  observacao       text,
  criado_por       uuid not null default auth.uid() references auth.users(id),
  criado_em        timestamptz not null default now(),
  check (vigencia_fim >= vigencia_inicio)
);

create unique index if not exists contrato_um_numero_por_cliente
  on contratos (chave_do_nome(cliente), upper(trim(numero)));

create table if not exists contrato_aditivos (
  id                 bigint generated always as identity primary key,
  contrato_id        bigint not null references contratos(id) on delete cascade,
  tipo               text not null
                       check (tipo in ('prorrogacao', 'reajuste', 'valor', 'encerramento', 'outro')),
  -- A data em que o aditivo vale (assinatura ou início do efeito).
  data               date not null,
  -- O número do aditivo no papel ("1º Termo Aditivo").
  numero             text,
  nova_vigencia_fim  date,
  -- Quanto muda o valor global: positivo acresce, negativo suprime.
  valor_delta        numeric(14, 2),
  -- O percentual do reajuste, para o histórico (0,0452 = 4,52%).
  percentual         numeric(8, 6),
  descricao          text,
  quem               uuid not null default auth.uid() references auth.users(id),
  em                 timestamptz not null default now(),
  check (tipo <> 'prorrogacao' or nova_vigencia_fim is not null)
);

create index if not exists contrato_aditivos_do_contrato
  on contrato_aditivos (contrato_id, data, id);

-- ---------------------------------------------------------------------
-- 3. RLS — ler é de todos; o contrato é do faturamento e da diretoria
-- ---------------------------------------------------------------------

alter table contratos enable row level security;
alter table contrato_aditivos enable row level security;

drop policy if exists le_contratos on contratos;
create policy le_contratos on contratos for select using (e_usuario_ativo());

drop policy if exists cadastra_contrato on contratos;
create policy cadastra_contrato on contratos for insert with check (
  e_usuario_ativo() and criado_por = auth.uid()
  and meu_papel() in ('faturamento', 'diretoria')
);

drop policy if exists corrige_contrato on contratos;
create policy corrige_contrato on contratos for update
  using (e_usuario_ativo() and meu_papel() in ('faturamento', 'diretoria'))
  with check (e_usuario_ativo() and meu_papel() in ('faturamento', 'diretoria'));

drop policy if exists apaga_contrato on contratos;
create policy apaga_contrato on contratos for delete using (e_diretoria());

drop policy if exists le_aditivos on contrato_aditivos;
create policy le_aditivos on contrato_aditivos for select using (e_usuario_ativo());

drop policy if exists registra_aditivo on contrato_aditivos;
create policy registra_aditivo on contrato_aditivos for insert with check (
  e_usuario_ativo() and quem = auth.uid()
  and meu_papel() in ('faturamento', 'diretoria')
);

drop policy if exists apaga_aditivo on contrato_aditivos;
create policy apaga_aditivo on contrato_aditivos for delete using (e_diretoria());

grant select, insert, update, delete on contratos to authenticated;
grant usage on sequence contratos_id_seq to authenticated;
grant select, insert, delete on contrato_aditivos to authenticated;
revoke update on contrato_aditivos from authenticated;
grant usage on sequence contrato_aditivos_id_seq to authenticated;

-- ---------------------------------------------------------------------
-- 4. O contrato de hoje
-- ---------------------------------------------------------------------

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
                    and (c.categorias is null or x.categoria = any (c.categorias))), 0) as medido,
       (select max(x.mes) from controle_atual x
         where chave_da_ficha(x.cliente) = chave_da_ficha(c.cliente)
           and x.mes >= date_trunc('month', c.vigencia_inicio)::date
           and x.mes <= v.vigencia_atual) as medido_ate
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
-- 5. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'contratos e aditivos existem com RLS' as item,
         case when (select count(*) from pg_tables where schemaname = 'medicoes' and rowsecurity
                     and tablename in ('contratos', 'contrato_aditivos')) = 2
              then '✓ ok' else '!! sem tabela ou sem RLS' end as situacao
  union all
  select 2, 'so faturamento e diretoria cadastram e registram aditivo',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and tablename in ('contratos', 'contrato_aditivos')
                       and cmd in ('INSERT', 'UPDATE')
                       and coalesce(qual, '') || coalesce(with_check, '') like '%faturamento%') = 3
              then '✓ ok' else '!! a trava nao esta la' end
  union all
  select 3, 'aditivo nao se reescreve',
         case when not exists (select 1 from information_schema.table_privileges
                                where table_schema = 'medicoes' and grantee = 'authenticated'
                                  and table_name = 'contrato_aditivos' and privilege_type = 'UPDATE')
               and not exists (select 1 from pg_policies where schemaname = 'medicoes'
                                and tablename = 'contrato_aditivos' and cmd = 'UPDATE')
              then '✓ ok' else '!! da para reescrever aditivo' end
  union all
  select 4, 'so a diretoria apaga',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and tablename in ('contratos', 'contrato_aditivos')
                       and cmd = 'DELETE' and qual like '%e_diretoria%') = 2
              then '✓ ok' else '!! alguem alem da diretoria apaga' end
  union all
  select 5, 'a view do contrato de hoje responde',
         case when (select count(*) from contratos_atual) >= 0
              then '✓ ok' else '!! a view nao responde' end
) r order by ordem;
