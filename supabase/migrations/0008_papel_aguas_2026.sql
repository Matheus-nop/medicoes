set search_path = medicoes, public;

-- =====================================================================
-- 0008: o papel do Águas do Rio padrão 2026
-- (idempotente; rode depois da 0007)
-- =====================================================================
--
-- O Águas do Rio / AEGEA passou a usar o "BM Manutenção Águas do Rio padrão
-- 2026": o topo da Rio+ (quatro caixas, a base na quarta) com as colunas do
-- TESTE 2 (recibo de retirada e de entrega). É o terceiro `modelo`: `aguas`.
--
-- O TESTE 2 (`acao`) continua para o boletim que já saiu nele. Os boletins do
-- Águas do Rio / AEGEA ainda ABERTOS passam para o padrão novo — os fechados
-- ficam como foram para o cliente.

alter table boletins drop constraint if exists boletins_modelo_check;
alter table boletins add constraint boletins_modelo_check
  check (modelo in ('acao', 'rio_mais', 'aguas'));

update boletins b set modelo = 'aguas'
where b.modelo = 'acao'
  and upper(b.cliente) ~ '(AGUAS|ÁGUAS) DO RIO|AEGEA'
  and coalesce((select a.situacao from boletim_andamentos a
                 where a.boletim_id = b.id order by a.id desc limit 1), 'aberto') = 'aberto';

notify pgrst, 'reload schema';

select 'o boletim aceita o modelo aguas' as item,
       case when exists (select 1 from pg_constraint
                          where conname = 'boletins_modelo_check'
                            and pg_get_constraintdef(oid) like '%aguas%')
            then '✓ ok' else '!! a constraint nao foi trocada' end as situacao;
