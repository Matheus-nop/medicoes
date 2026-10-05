set search_path = medicoes, public;

-- =====================================================================
-- 0017: os outros nomes da base
-- (idempotente; rode depois da 0016)
-- =====================================================================
--
-- O Sisloc nem sempre escreve a base como o cadastro: "BASE LESTE- MARICÁ"
-- na colagem é a "LESTE - MARICÁ" do cadastro. Sem saber disso, a colagem
-- propunha base nova e boletim novo — e o mês, que se lança aos poucos no
-- boletim aberto da base, se espalhava em vários.
--
-- Cada base guarda os outros nomes com que já apareceu. A colagem acha a base
-- por qualquer um deles; quando alguém escolhe a base certa para um nome que
-- não batia, o nome entra aqui, e da próxima vez vai sozinho.

alter table bases add column if not exists apelidos text[] not null default '{}';

comment on column bases.apelidos is
  'Os outros nomes com que a base aparece na colagem do Sisloc. A busca da base '
  'olha o nome e estes, pela chave (sem acento, pontuação nem caixa).';

notify pgrst, 'reload schema';

-- Conferência — tem de dizer `✓ ok`
select case when exists (select 1 from information_schema.columns
                          where table_schema = 'medicoes' and table_name = 'bases'
                            and column_name = 'apelidos')
            then '✓ ok' else '!! faltou a coluna' end as outros_nomes_da_base;
