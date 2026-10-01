set search_path = medicoes, public;

-- =====================================================================
-- 0012: os nomes do mesmo cliente
-- (idempotente; rode depois da 0011)
-- =====================================================================
--
-- O boletim traz o nome do Sisloc ("AGUAS DO RIO 4 SPE S.A", "AEGEA
-- SANEAMENTO E PARTICIPAÇÕES S.A"); o controle, o nome digitado ("ÁGUAS DO
-- RIO / AEGEA"). Para o arquivo por cliente são fichas diferentes — e devem
-- ser, até alguém dizer que são o mesmo. O vínculo é esse dizer: "o nome X
-- é o cliente Y". Ele junta as fichas no arquivo, na ficha e no extrato.
--
-- O vínculo NÃO muda o boletim: o papel continua com o nome do Sisloc, que
-- é o que o cliente reconhece. Desfazer é apagar o vínculo — não há número
-- nele, só o agrupamento, e por isso não é append-only como o resto.
--
-- Um nome tem um cliente só (pela chave, a mesma de `chave_do_nome`).

create table if not exists vinculos_de_cliente (
  id       bigint generated always as identity primary key,
  -- O nome como vem (do Sisloc ou do controle).
  nome     text not null check (length(trim(nome)) > 0),
  -- A ficha onde ele entra: o nome que a ficha mostra.
  cliente  text not null check (length(trim(cliente)) > 0),
  quem     uuid not null default auth.uid() references auth.users(id),
  em       timestamptz not null default now(),
  check (chave_do_nome(nome) <> chave_do_nome(cliente))
);

create unique index if not exists vinculo_um_por_nome
  on vinculos_de_cliente (chave_do_nome(nome));

alter table vinculos_de_cliente enable row level security;

drop policy if exists le_vinculos on vinculos_de_cliente;
create policy le_vinculos on vinculos_de_cliente for select using (e_usuario_ativo());

-- Juntar e separar é de quem lança boletim (a mesma régua da 0011).
drop policy if exists junta_nomes on vinculos_de_cliente;
create policy junta_nomes on vinculos_de_cliente for insert with check (
  e_usuario_ativo() and quem = auth.uid()
  and meu_papel() in ('orcamento', 'faturamento', 'diretoria')
);

drop policy if exists separa_nomes on vinculos_de_cliente;
create policy separa_nomes on vinculos_de_cliente for delete using (
  e_usuario_ativo() and meu_papel() in ('orcamento', 'faturamento', 'diretoria')
);

grant select, insert, delete on vinculos_de_cliente to authenticated;
revoke update on vinculos_de_cliente from authenticated;
grant usage on sequence vinculos_de_cliente_id_seq to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Conferência — toda linha tem de dizer `✓ ok`
-- ---------------------------------------------------------------------

select item, situacao from (
  select 1 as ordem, 'os vinculos existem com RLS' as item,
         case when exists (select 1 from pg_tables where schemaname = 'medicoes'
                            and tablename = 'vinculos_de_cliente' and rowsecurity)
              then '✓ ok' else '!! sem tabela ou sem RLS' end as situacao
  union all
  select 2, 'um cliente por nome',
         case when exists (select 1 from pg_indexes where schemaname = 'medicoes'
                            and indexname = 'vinculo_um_por_nome')
              then '✓ ok' else '!! faltou o indice' end
  union all
  select 3, 'juntar e separar so pelo time do boletim',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and tablename = 'vinculos_de_cliente'
                       and cmd in ('INSERT', 'DELETE')
                       and coalesce(qual, '') || coalesce(with_check, '') like '%orcamento%') = 2
              then '✓ ok' else '!! a trava nao esta la' end
  union all
  select 4, 'vinculo nao se reescreve',
         case when not exists (select 1 from information_schema.table_privileges
                                where table_schema = 'medicoes' and grantee = 'authenticated'
                                  and table_name = 'vinculos_de_cliente' and privilege_type = 'UPDATE')
              then '✓ ok' else '!! da para reescrever' end
) r order by ordem;
