-- =====================================================================
-- Os BMs abertos de São Gonçalo, Duque de Caxias CAV e Setorizada Rio Norte,
-- na base dos boletins anteriores e com a regional
-- (rode no SQL Editor; pode rodar duas vezes)
-- =====================================================================
--
-- Como o Sisloc escreve → a base dos boletins que já saíram:
--   · "BASE LESTE - SÃO GONÇALO"            → LESTE - BOA VISTA - SÃO GONÇALO
--                                              (Nº 15 em agosto, 16 em setembro) — regional LESTE
--   · "DUQUE DE CAXIAS - BAIXADA I - CAV"   → AEGEA - BAIXADA I - CAV
--                                              (Nº 08 em agosto, 09 em setembro) — regional BAIXADA I
--   · "SETORIZADA RIO DE JANEIRO RIO NOR…"  → PROJETO RIO DE JANEIRO RIO NORTE BLOCO 4 VCG
--                                              (Nº 06 em setembro) — regional NORTE
--
-- O BM vai para a base certa com o próximo Nº dela (se ainda está com o 01 da
-- base nova); o nome do Sisloc fica como outro nome da base (a próxima colagem
-- cai sozinha); a base certa ganha a regional, se ainda não tem; e a base nova
-- que ficou sem boletim sai do cadastro. Só mexe em BM ABERTO.
-- =====================================================================

set search_path = medicoes, public;

create temporary table if not exists de_para (sisloc text, certa text, regional text) on commit preserve rows;
truncate de_para;
insert into de_para values
  ('BASE LESTE SAO GONCALO%',            'LESTE - BOA VISTA - SÃO GONÇALO',              'LESTE'),
  ('DUQUE DE CAXIAS BAIXADA I CAV%',     'AEGEA - BAIXADA I - CAV',                      'BAIXADA I'),
  ('SETORIZADA RIO DE JANEIRO RIO NOR%', 'PROJETO RIO DE JANEIRO RIO NORTE BLOCO 4 VCG', 'NORTE');

-- 0. Antes.
select b.id, b.numero, b.cliente, b.base, b.documento, b.referencia
from boletins b
join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
join de_para d on chave_do_nome(b.base) like d.sisloc;

-- 1. A base certa aprende o nome do Sisloc e ganha a regional, se não tem.
update bases c
   set apelidos = (select array(select distinct x from unnest(c.apelidos || n.nomes) x)),
       regional = coalesce(nullif(c.regional, ''), n.regional)
  from (select b.cliente, d.certa, d.regional, array_agg(distinct b.base) as nomes
          from boletins b
          join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
          join de_para d on chave_do_nome(b.base) like d.sisloc
         group by b.cliente, d.certa, d.regional) n
 where chave_do_nome(c.cliente) = chave_do_nome(n.cliente)
   and chave_do_nome(c.nome) = chave_do_nome(n.certa);

-- 2. O BM vai para a base certa, com o próximo Nº dela.
with alvo as (
  select b.id, c.nome as certa,
         lpad((coalesce((select max(x.documento::int) from boletins x
                          where chave_do_nome(x.cliente) = chave_do_nome(b.cliente)
                            and chave_do_nome(x.base) = chave_do_nome(c.nome)
                            and x.id <> b.id and x.documento ~ '^[0-9]{1,4}$'), 0) + 1)::text, 2, '0') as proximo
  from boletins b
  join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
  join de_para d on chave_do_nome(b.base) like d.sisloc
  join bases c on chave_do_nome(c.cliente) = chave_do_nome(b.cliente)
              and chave_do_nome(c.nome) = chave_do_nome(d.certa)
)
update boletins b
   set base = alvo.certa,
       documento = case when b.documento is null or b.documento = '01' then alvo.proximo else b.documento end
  from alvo
 where b.id = alvo.id;

-- 3. A base nova que ficou sem boletim sai do cadastro.
delete from bases x
 using de_para d
 where chave_do_nome(x.nome) like d.sisloc
   and coalesce(x.regional, '') = ''
   and not exists (select 1 from boletins b
                    where chave_do_nome(b.cliente) = chave_do_nome(x.cliente)
                      and chave_do_nome(b.base) = chave_do_nome(x.nome));

-- 4. Depois: os três na base certa, com Nº e regional. Se algum não aparecer,
--    a base certa não está no cadastro com esse cliente — me mande o "Antes".
select b.id, b.numero, b.base, b.documento, b.referencia, c.regional, c.apelidos
from boletins b
join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
join de_para d on chave_do_nome(b.base) = chave_do_nome(d.certa)
left join bases c on chave_do_nome(c.cliente) = chave_do_nome(b.cliente) and chave_do_nome(c.nome) = chave_do_nome(b.base);
