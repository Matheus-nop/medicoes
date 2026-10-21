set search_path = medicoes, public;

-- =====================================================================
-- 0021: o relatório de manutenção do cliente — o anexo da OM
-- (idempotente; rode depois da 0020 — termina numa tabela)
-- =====================================================================
--
-- "A orçamentista preenche no Excel um formulário que o cliente exige, no
--  padrão dele. Quero que preencha no sistema e gere o PDF no formato deles."
--
-- O Águas do Rio pede, para cada OM cobrada, o "RELATÓRIO DE MANUTENÇÃO DE
-- EQUIPAMENTO": fornecedor, data da retirada, responsável, superintendência,
-- tipo de manutenção, defeito aparente, equipamento, modelo, patrimônio, a
-- observação (os comprovantes de retirada e de entrega), o diagnóstico
-- técnico, três fotos — retirada, em manutenção, entrega — e a lista de
-- materiais substituídos com o valor de cada um, cuja soma é o valor da OM.
--
-- É o anexo da OM do boletim: quase tudo já está aqui. A OM, o equipamento, o
-- patrimônio, a chegada, o Nº OM e a OM entrega vêm de `boletim_oms`; a base
-- (a superintendência) e o contato (o responsável) vêm do boletim. O modelo
-- da máquina vem do cadastro do Estoque, pela função curta do fim (a regra da
-- 0003: o que se lê dos outros apps passa por `security definer`).
--
-- COMO SE GUARDA
--
-- Um relatório por OM (`unique (om)`), e cada "Gravar" é uma VERSÃO nova, com
-- tudo o que se preencheu num `jsonb`: a última manda, e as de antes ficam.
-- Nada se edita nem se apaga. O total não se grava: é a soma dos materiais,
-- feita na tela e no papel. As fotos ficam no bucket privado
-- `medicoes-relatorios`, e a versão guarda o caminho delas.
--
-- QUEM
--
-- Ler, todo mundo daqui lê. Gravar é de quem lança o boletim — orçamento,
-- faturamento, diretoria —, como na 0011, e sempre em nome de quem está logado.
--
-- A prova está em `supabase/scripts/provar-as-travas.sql`, trecho 22.

-- ---------------------------------------------------------------------
-- 1. O relatório e as versões
-- ---------------------------------------------------------------------

create table if not exists relatorios_de_manutencao (
  id         bigint generated always as identity primary key,
  -- A OM que se cobra (a PROPOSTA do boletim), como o Sisloc a numera.
  om         text not null unique check (om ~ '^[0-9]{3,10}$'),
  -- O papel do cliente. `text` com `check`: o próximo formato é um valor a mais.
  modelo     text not null default 'aguas' check (modelo in ('aguas')),
  criado_por uuid not null default auth.uid() references auth.users (id),
  criado_em  timestamptz not null default now()
);

create table if not exists relatorio_de_manutencao_versoes (
  id           bigint generated always as identity primary key,
  relatorio_id bigint not null references relatorios_de_manutencao (id) on delete cascade,
  -- O que se preencheu, inteiro. A forma está em `lib/medicoes/relatorio.ts`.
  dados        jsonb  not null check (jsonb_typeof(dados) = 'object'),
  gravado_por  uuid   not null default auth.uid() references auth.users (id),
  gravado_em   timestamptz not null default now()
);

create index if not exists relatorio_de_manutencao_versoes_do_relatorio
  on relatorio_de_manutencao_versoes (relatorio_id, gravado_em desc, id desc);

alter table relatorios_de_manutencao        enable row level security;
alter table relatorio_de_manutencao_versoes enable row level security;

-- ---------------------------------------------------------------------
-- 2. O relatório de agora — a última versão, e o boletim da OM
-- ---------------------------------------------------------------------

create or replace view medicoes.relatorios_de_manutencao_atuais
with (security_invoker = true) as
select
  r.id,
  r.om,
  r.modelo,
  r.criado_em,
  v.dados,
  v.gravado_em,
  coalesce(p.nome, 'sem nome')                                  as gravado_por_nome,
  (select count(*) from medicoes.relatorio_de_manutencao_versoes x
    where x.relatorio_id = r.id)::int                           as versoes,
  i.boletim_id,
  b.numero                                                      as boletim_numero,
  b.cliente,
  b.base
from medicoes.relatorios_de_manutencao r
left join lateral (
  select x.dados, x.gravado_em, x.gravado_por
    from medicoes.relatorio_de_manutencao_versoes x
   where x.relatorio_id = r.id
   order by x.gravado_em desc, x.id desc
   limit 1
) v on true
left join medicoes.perfis p on p.id = v.gravado_por
left join medicoes.boletim_oms i on i.om = r.om
left join medicoes.boletins b on b.id = i.boletim_id;

-- ---------------------------------------------------------------------
-- 3. RLS: todo mundo daqui lê; quem lança o boletim grava, em nome dele
-- ---------------------------------------------------------------------

drop policy if exists le_relatorios_de_manutencao on relatorios_de_manutencao;
create policy le_relatorios_de_manutencao on relatorios_de_manutencao
  for select using ((select e_usuario_ativo()));
drop policy if exists abre_relatorio_de_manutencao on relatorios_de_manutencao;
create policy abre_relatorio_de_manutencao on relatorios_de_manutencao
  for insert with check (meu_papel() in ('orcamento', 'faturamento', 'diretoria') and criado_por = auth.uid());

drop policy if exists le_relatorio_de_manutencao_versoes on relatorio_de_manutencao_versoes;
create policy le_relatorio_de_manutencao_versoes on relatorio_de_manutencao_versoes
  for select using ((select e_usuario_ativo()));
drop policy if exists grava_relatorio_de_manutencao on relatorio_de_manutencao_versoes;
create policy grava_relatorio_de_manutencao on relatorio_de_manutencao_versoes
  for insert with check (meu_papel() in ('orcamento', 'faturamento', 'diretoria') and gravado_por = auth.uid());

-- O revoke vem antes: o privilégio padrão do schema dá update e delete a toda
-- tabela nova.
revoke all on relatorios_de_manutencao, relatorio_de_manutencao_versoes from anon;
revoke update, delete, truncate on relatorios_de_manutencao, relatorio_de_manutencao_versoes from authenticated;
grant select, insert on relatorios_de_manutencao, relatorio_de_manutencao_versoes to authenticated;
revoke all on relatorios_de_manutencao_atuais from anon;
grant select on relatorios_de_manutencao_atuais to authenticated;

-- ---------------------------------------------------------------------
-- 4. O bucket das fotos
-- ---------------------------------------------------------------------
-- Privado. A foto é reduzida no aparelho (≈200 KB); o limite de 3 MB é para
-- o aparelho que não reduz.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medicoes-relatorios', 'medicoes-relatorios', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists medicoes_relatorio_le_foto on storage.objects;
create policy medicoes_relatorio_le_foto on storage.objects
  for select using (bucket_id = 'medicoes-relatorios' and medicoes.e_usuario_ativo());

drop policy if exists medicoes_relatorio_sobe_foto on storage.objects;
create policy medicoes_relatorio_sobe_foto on storage.objects
  for insert with check (bucket_id = 'medicoes-relatorios'
                         and medicoes.meu_papel() in ('orcamento', 'faturamento', 'diretoria'));

-- ---------------------------------------------------------------------
-- 5. O modelo da máquina, lido do cadastro do Estoque
-- ---------------------------------------------------------------------
-- Só as colunas que o relatório usa, e só para quem tem perfil ativo aqui.
-- O patrimônio casa como o Estoque grava: maiúsculo, sem espaço nas pontas.

create or replace function medicoes.equipamentos_do_estoque(p_patrimonios text[])
returns table (patrimonio text, tipo text, marca text, modelo text, serie text)
language sql
stable
security definer
set search_path = medicoes, public
as $fn$
  select e.patrimonio, t.nome, e.marca, e.modelo, e.serie
  from estoque.equipamentos e
  left join estoque.tipos_equipamento t on t.id = e.tipo_id
  where medicoes.e_usuario_ativo()
    and e.patrimonio in (select upper(btrim(x)) from unnest(p_patrimonios) as x);
$fn$;

revoke all on function medicoes.equipamentos_do_estoque(text[]) from public, anon;
grant execute on function medicoes.equipamentos_do_estoque(text[]) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 6. Conferência — rodar até aqui devolve uma tabela de seis linhas, todas
--    em `✓ ok`. `Success. No rows returned` quer dizer que a colagem não
--    chegou ao fim.
-- ---------------------------------------------------------------------
select ordem, o_que, situacao from (
  select 1 as ordem, 'as duas tabelas, com RLS' as o_que,
         case when (select count(*) from pg_tables where schemaname = 'medicoes' and rowsecurity
                     and tablename in ('relatorios_de_manutencao', 'relatorio_de_manutencao_versoes')) = 2
              then '✓ ok' else '!! faltou tabela ou RLS' end as situacao
  union all
  select 2, 'a view roda como quem chama',
         case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                            where n.nspname = 'medicoes' and c.relname = 'relatorios_de_manutencao_atuais'
                              and 'security_invoker=true' = any (coalesce(c.reloptions, '{}')))
              then '✓ ok' else '!! falta a view ou ela roda como dona' end
  union all
  select 3, 'versão não se edita nem se apaga',
         case when not exists (select 1 from pg_policies where schemaname = 'medicoes'
                                and tablename in ('relatorios_de_manutencao', 'relatorio_de_manutencao_versoes')
                                and cmd in ('UPDATE', 'DELETE', 'ALL'))
               and not exists (select 1 from information_schema.table_privileges
                                where table_schema = 'medicoes' and grantee in ('authenticated', 'anon')
                                  and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE')
                                  and table_name in ('relatorios_de_manutencao', 'relatorio_de_manutencao_versoes'))
              then '✓ ok' else '!! dá para reescrever o relatório' end
  union all
  select 4, 'grava quem lança o boletim, e em nome dele',
         case when (select count(*) from pg_policies where schemaname = 'medicoes' and cmd = 'INSERT'
                     and tablename in ('relatorios_de_manutencao', 'relatorio_de_manutencao_versoes')
                     and with_check like '%orcamento%' and with_check like '%auth.uid()%') = 2
              then '✓ ok' else '!! a policy de gravar não é a do boletim' end
  union all
  select 5, 'o bucket das fotos: privado, ler com perfil, subir quem lança, trocar e apagar ninguém',
         case when exists (select 1 from storage.buckets where id = 'medicoes-relatorios' and not public)
               and (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
                     and policyname like 'medicoes_relatorio_%') = 2
               and not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                                and policyname like 'medicoes_relatorio_%' and cmd in ('UPDATE', 'DELETE', 'ALL'))
              then '✓ ok' else '!! confira o bucket e as policies' end
  union all
  select 6, 'o modelo do Estoque se lê pela função, e só com perfil daqui',
         case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                            where n.nspname = 'medicoes' and p.proname = 'equipamentos_do_estoque' and p.prosecdef)
               and not has_function_privilege('anon', 'medicoes.equipamentos_do_estoque(text[])', 'EXECUTE')
              then '✓ ok' else '!! falta a função ou anon a executa' end
) c
order by ordem;
