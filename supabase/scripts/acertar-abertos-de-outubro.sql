-- =====================================================================
-- Os BMs abertos esta semana: o mês e a base
-- (rode no SQL Editor; pode rodar duas vezes — o que já foi acertado fica)
-- =====================================================================
--
-- Dois tropeços da colagem, já corrigidos no sistema:
--
--   1. O mês. A colagem tirava o mês da data das OMs: as que chegaram de 21 a
--      23/09 abriram BMs de SETEMBRO/2026 em outubro, quando o BM de setembro
--      de cada base já tinha sido emitido. Agora ela abre no mês em que se
--      lança. Aqui, todo BM ABERTO de SETEMBRO/2026 passa a OUTUBRO/2026 — os
--      de setembro de verdade estão todos fechados (vieram dos arquivos).
--
--   2. A base. O Sisloc escreve "BASE SUL - ROCHA" para a "SUL - ROCHA" do
--      cadastro, e por esse "BASE" a colagem abria uma base nova, sem regional
--      e com Nº 01. Agora o "BASE" da frente não conta. Aqui, o BM aberto
--      numa dessas bases novas vai para a base do cadastro, com o próximo
--      Documento Nº dela; o nome do Sisloc fica como outro nome da base; e a
--      base nova, que ficou sem boletim, sai do cadastro.
--
-- Só mexe em BM ABERTO. Nada de fechado, enviado ou faturado muda.
-- =====================================================================

set search_path = medicoes, public;

-- 0. Antes: os abertos como estão.
select b.id, b.numero, b.cliente, b.base, b.documento, b.referencia, c.regional
from boletins b
join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
left join bases c on chave_do_nome(c.cliente) = chave_do_nome(b.cliente) and chave_do_nome(c.nome) = chave_do_nome(b.base)
order by b.base;

-- 1. O mês: aberto de setembro passa a outubro.
update boletins b
   set referencia = 'OUTUBRO/2026'
  from boletim_situacao s
 where s.boletim_id = b.id and s.situacao = 'aberto'
   and b.referencia = 'SETEMBRO/2026';

-- 2a. A base do cadastro aprende o nome do Sisloc ("BASE SUL - ROCHA").
with alvo as (
  select distinct c.id as base_certa, b.base as nome_sisloc
  from boletins b
  join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
  join bases c on chave_do_nome(c.cliente) = chave_do_nome(b.cliente)
              and chave_do_nome(c.nome) = regexp_replace(chave_do_nome(b.base), '^BASE ', '')
              and chave_do_nome(c.nome) not like 'BASE %'
  left join bases propria on chave_do_nome(propria.cliente) = chave_do_nome(b.cliente)
                         and chave_do_nome(propria.nome) = chave_do_nome(b.base)
  where chave_do_nome(b.base) like 'BASE %'
    and coalesce(propria.regional, '') = ''
)
update bases c
   set apelidos = (select array(select distinct x from unnest(c.apelidos || array_agg_sisloc.nomes) x))
  from (select base_certa, array_agg(nome_sisloc) as nomes from alvo group by base_certa) array_agg_sisloc
 where c.id = array_agg_sisloc.base_certa;

-- 2b. O BM aberto vai para a base do cadastro, com o próximo Nº dela (se
--     ainda está com o 01 que a base nova lhe deu).
with alvo as (
  select b.id, c.nome as certa,
         lpad((coalesce((select max(x.documento::int) from boletins x
                          where chave_do_nome(x.cliente) = chave_do_nome(b.cliente)
                            and regexp_replace(chave_do_nome(x.base), '^BASE ', '') = chave_do_nome(c.nome)
                            and x.id <> b.id and x.documento ~ '^[0-9]{1,4}$'), 0) + 1)::text, 2, '0') as proximo
  from boletins b
  join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
  join bases c on chave_do_nome(c.cliente) = chave_do_nome(b.cliente)
              and chave_do_nome(c.nome) = regexp_replace(chave_do_nome(b.base), '^BASE ', '')
              and chave_do_nome(c.nome) not like 'BASE %'
  left join bases propria on chave_do_nome(propria.cliente) = chave_do_nome(b.cliente)
                         and chave_do_nome(propria.nome) = chave_do_nome(b.base)
  where chave_do_nome(b.base) like 'BASE %'
    and coalesce(propria.regional, '') = ''
)
update boletins b
   set base = alvo.certa,
       documento = case when b.documento is null or b.documento = '01' then alvo.proximo else b.documento end
  from alvo
 where b.id = alvo.id;

-- 2c. A base nova que ficou sem boletim sai do cadastro (só a que começa com
--     "BASE", não tem regional e tem a irmã certa no cadastro).
delete from bases x
 where chave_do_nome(x.nome) like 'BASE %'
   and coalesce(x.regional, '') = ''
   and exists (select 1 from bases c
                where chave_do_nome(c.cliente) = chave_do_nome(x.cliente)
                  and chave_do_nome(c.nome) = regexp_replace(chave_do_nome(x.nome), '^BASE ', ''))
   and not exists (select 1 from boletins b
                    where chave_do_nome(b.cliente) = chave_do_nome(x.cliente)
                      and chave_do_nome(b.base) = chave_do_nome(x.nome));

-- 3. Depois: os abertos como ficaram. O que ainda aparecer sem regional é base
--    cujo nome do Sisloc não bate com o cadastro nem sem o "BASE" (ex.:
--    "BASE BAIXADA - QUEIMADOS" para "BAIXADA II - QUEIMADOS") — esse se
--    acerta no próprio BM, em Editar, escolhendo a base certa.
select b.id, b.numero, b.base, b.documento, b.referencia, c.regional
from boletins b
join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
left join bases c on chave_do_nome(c.cliente) = chave_do_nome(b.cliente) and chave_do_nome(c.nome) = chave_do_nome(b.base)
order by c.regional nulls first, b.base;
