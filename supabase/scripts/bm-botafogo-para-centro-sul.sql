set search_path = medicoes, public;

-- =====================================================================
-- O BM 01 da "BASE GRANDE DIAMETRO BOTAFOGO - CAV" é da GRANDE DIÂMETRO -
-- CENTRO SUL. Essa base não existe no cadastro: o nome só estava no boletim,
-- e por isso a medição de locação de outubro mostrava a manutenção dele no
-- "—" do resumo, sem projeto, município, superintendência nem bloco.
--
-- Troca só a base do boletim (a OM 031733), para o nome do cadastro.
-- O número, as OMs, o valor e a situação ficam como estão.
-- Pode rodar duas vezes: na segunda, não acha mais nada para trocar.
-- =====================================================================

-- 1. Antes: tem de aparecer UMA linha, o BM 01 com a OM 031733.
select b.id, b.numero, b.documento, b.referencia, b.base, b.cliente
from boletins b
where chave_do_nome(b.base) = chave_do_nome('BASE GRANDE DIAMETRO BOTAFOGO - CAV')
  and exists (select 1 from boletim_oms o where o.boletim_id = b.id and o.om = '031733');

-- 2. A troca, com o nome exatamente como está no cadastro de bases.
update boletins b
set base = coalesce(
  (select x.nome from bases x
    where chave_do_nome(x.nome) = chave_do_nome('GRANDE DIÂMETRO - CENTRO SUL')
    order by x.id limit 1),
  'GRANDE DIÂMETRO - CENTRO SUL')
where chave_do_nome(b.base) = chave_do_nome('BASE GRANDE DIAMETRO BOTAFOGO - CAV')
  and exists (select 1 from boletim_oms o where o.boletim_id = b.id and o.om = '031733')
returning b.id, b.numero, b.documento, b.base;

-- 3. Conferência — tem de dizer `✓ ok`
select case
  when exists (select 1 from boletins b
                where exists (select 1 from boletim_oms o where o.boletim_id = b.id and o.om = '031733')
                  and chave_do_nome(b.base) = chave_do_nome('GRANDE DIÂMETRO - CENTRO SUL'))
  then '✓ ok — o BM da OM 031733 é da GRANDE DIÂMETRO - CENTRO SUL'
  else '!! o BM da OM 031733 não está na Centro Sul: confira o passo 1'
end as situacao;
