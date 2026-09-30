set search_path = medicoes, public;

-- =====================================================================
-- 0010: o cadastro de bases
-- (idempotente; rode depois da 0009)
-- =====================================================================
--
-- Cada base do cliente tem os dados que se repetem todo mês no papel: o
-- responsável (o "CONTATO" do cliente), e-mail, telefone, o local da obra, a
-- observação de sempre e o modelo do papel. Até aqui o boletim novo copiava
-- esses dados do último boletim da mesma base; agora eles moram no cadastro,
-- e o boletim novo nasce com eles — e com o próximo Documento Nº da base.
--
-- O cadastro é o que vale DAQUI PARA A FRENTE. O boletim continua guardando
-- os seus dados (o papel de agosto não muda porque o responsável trocou em
-- outubro); editar a base não mexe em boletim nenhum.
--
-- O nome da base no Sisloc nem sempre vem escrito igual. A base se acha pela
-- CHAVE do nome — sem acento, sem pontuação, sem caixa —, a mesma conta de
-- `chaveDoCliente` em lib/medicoes/medicoes.ts. Uma base por cliente e chave.

-- ---------------------------------------------------------------------
-- 1. A chave do nome — a mesma de `chaveDoCliente`
-- ---------------------------------------------------------------------

create or replace function chave_do_nome(nome text)
returns text language sql immutable
as $fn$
  select trim(regexp_replace(regexp_replace(replace(
           translate(upper(coalesce(nome, '')),
                     'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN'),
           '.', ''), '[^A-Z0-9 ]', ' ', 'g'), '\s+', ' ', 'g'))
$fn$;

grant execute on function chave_do_nome(text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. A tabela
-- ---------------------------------------------------------------------

create table if not exists bases (
  id             bigint generated always as identity primary key,
  cliente        text not null check (length(trim(cliente)) > 0),
  nome           text not null check (length(trim(nome)) > 0),
  -- O "CONTATO" do cliente no papel: quem confere o boletim na base.
  responsavel    text,
  email          text,
  telefone       text,
  local_obra     text,
  -- A observação que vai em todo boletim desta base (contrato, pedido…).
  observacao     text,
  -- O papel desta base, quando não é o do cliente.
  modelo         text check (modelo in ('acao', 'rio_mais', 'aguas')),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid default auth.uid() references auth.users(id)
);

create unique index if not exists base_uma_vez
  on bases (chave_do_nome(cliente), chave_do_nome(nome));

alter table bases enable row level security;

drop policy if exists le_bases on bases;
create policy le_bases on bases for select using (e_usuario_ativo());

drop policy if exists cria_base on bases;
create policy cria_base on bases for insert with check (e_usuario_ativo());

drop policy if exists edita_base on bases;
create policy edita_base on bases
  for update using (e_usuario_ativo()) with check (e_usuario_ativo());

-- Apagar é da diretoria: base apagada é base que some do cadastro, e o
-- boletim seguinte dela nasce em branco.
drop policy if exists apaga_base on bases;
create policy apaga_base on bases for delete using (e_diretoria());

grant select, insert, update, delete on bases to authenticated;
grant usage on sequence bases_id_seq to authenticated;

-- ---------------------------------------------------------------------
-- 3. O cadastro nasce dos boletins que já existem — o mais recente de cada
--    base empresta os dados. Base que já está no cadastro fica como está.
-- ---------------------------------------------------------------------

insert into bases (cliente, nome, responsavel, email, telefone, local_obra, modelo, atualizado_por)
select distinct on (chave_do_nome(b.cliente), chave_do_nome(b.base))
       b.cliente, b.base, b.contato, b.email, b.telefone, b.local_obra, b.modelo, null
from boletins b
where b.base is not null and length(trim(b.base)) > 0
order by chave_do_nome(b.cliente), chave_do_nome(b.base), b.id desc
on conflict (chave_do_nome(cliente), chave_do_nome(nome)) do nothing;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 4. Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'o cadastro de bases existe com RLS' as item,
         case when exists (select 1 from pg_tables where schemaname = 'medicoes'
                            and tablename = 'bases' and rowsecurity)
              then '✓ ok' else '!! sem tabela ou sem RLS' end as situacao
  union all
  select 2, 'uma base por cliente e nome',
         case when exists (select 1 from pg_indexes where schemaname = 'medicoes'
                            and indexname = 'base_uma_vez')
              then '✓ ok' else '!! faltou o indice' end
  union all
  select 3, 'so a diretoria apaga base',
         case when exists (select 1 from pg_policies where schemaname = 'medicoes'
                            and tablename = 'bases' and cmd = 'DELETE'
                            and qual like '%e_diretoria%')
              then '✓ ok' else '!! a trava nao esta la' end
  union all
  select 4, 'toda base de boletim entrou no cadastro',
         case when not exists (
                select 1 from boletins b
                where b.base is not null and length(trim(b.base)) > 0
                  and not exists (select 1 from bases x
                                   where chave_do_nome(x.cliente) = chave_do_nome(b.cliente)
                                     and chave_do_nome(x.nome) = chave_do_nome(b.base)))
              then '✓ ok' else '!! alguma base ficou de fora' end
) r order by ordem;

select count(*) as bases_no_cadastro from bases;
