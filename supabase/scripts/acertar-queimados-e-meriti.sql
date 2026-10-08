-- =====================================================================
-- Os BMs abertos de Queimados e de São João de Meriti, na base de antes
-- (rode no SQL Editor depois de acertar-abertos-de-outubro.sql; pode rodar
-- duas vezes)
-- =====================================================================
--
-- O Sisloc escreve o local de um jeito que não bate com o cadastro nem sem
-- o "BASE" da frente. A base certa é a dos boletins que já saíram — e eles
-- saíram SEPARADOS:
--
--   Queimados (Águas do Rio):
--     · "BAIXADA II - QUEIMADOS" ............................ Nº 06 em setembro
--     · "BAIXADA II - QUEIMADOS - SETOR OPERACIONAL" ........ Nº 01 em agosto
--     Mesmo endereço, numeração própria. O nome do Sisloc com SETOR
--     OPERACIONAL vai para a segunda; o resto, para a primeira.
--
--   São João de Meriti (AEGEA):
--     · "AEGEA - BAIXADA I - OPERAÇÃO" (Jardim Alegria) ..... Nº 08 e 09
--     · "AEGEA - BAIXADA I - SERVIÇO" (Vila São João) ....... Nº 09
--     O nome do Sisloc com SERVIÇO vai para a segunda; o resto, para a
--     primeira.
--
-- Como no outro script: o BM vai para a base certa com o próximo Nº dela (se
-- ainda está com o 01 da base nova), o nome do Sisloc fica como outro nome da
-- base — a próxima colagem cai sozinha —, e a base nova que ficou sem boletim
-- sai do cadastro. Só mexe em BM ABERTO.
-- =====================================================================

set search_path = medicoes, public;

-- 0. Antes.
select b.id, b.numero, b.cliente, b.base, b.documento, b.referencia
from boletins b
join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
where chave_do_nome(b.base) ~ '(QUEIMADOS|MERITI|MERETI)';

-- 1. A base do cadastro aprende o nome do Sisloc.
with alvo as (
  select b.id, b.cliente, b.base as sisloc,
         case when chave_do_nome(b.base) ~ 'QUEIMADOS.*SETOR OPERACIONAL' then 'BAIXADA II - QUEIMADOS - SETOR OPERACIONAL'
              when chave_do_nome(b.base) ~ 'QUEIMADOS'                    then 'BAIXADA II - QUEIMADOS'
              when chave_do_nome(b.base) ~ '(MERITI|MERETI).*SERVI'       then 'AEGEA - BAIXADA I - SERVIÇO'
              else 'AEGEA - BAIXADA I - OPERAÇÃO' end as certa
  from boletins b
  join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
  where chave_do_nome(b.base) ~ '(QUEIMADOS|MERITI|MERETI)'
    and not exists (select 1 from bases c
                     where chave_do_nome(c.cliente) = chave_do_nome(b.cliente)
                       and chave_do_nome(c.nome) = chave_do_nome(b.base)
                       and coalesce(c.regional, '') <> '')
)
update bases c
   set apelidos = (select array(select distinct x from unnest(c.apelidos || n.nomes) x))
  from (select a.cliente, a.certa, array_agg(distinct a.sisloc) as nomes from alvo a group by a.cliente, a.certa) n
 where chave_do_nome(c.cliente) = chave_do_nome(n.cliente)
   and chave_do_nome(c.nome) = chave_do_nome(n.certa);

-- 2. O BM vai para a base certa, com o próximo Nº dela.
with alvo as (
  select b.id, b.cliente,
         case when chave_do_nome(b.base) ~ 'QUEIMADOS.*SETOR OPERACIONAL' then 'BAIXADA II - QUEIMADOS - SETOR OPERACIONAL'
              when chave_do_nome(b.base) ~ 'QUEIMADOS'                    then 'BAIXADA II - QUEIMADOS'
              when chave_do_nome(b.base) ~ '(MERITI|MERETI).*SERVI'       then 'AEGEA - BAIXADA I - SERVIÇO'
              else 'AEGEA - BAIXADA I - OPERAÇÃO' end as certa
  from boletins b
  join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
  where chave_do_nome(b.base) ~ '(QUEIMADOS|MERITI|MERETI)'
    and not exists (select 1 from bases c
                     where chave_do_nome(c.cliente) = chave_do_nome(b.cliente)
                       and chave_do_nome(c.nome) = chave_do_nome(b.base)
                       and coalesce(c.regional, '') <> '')
),
com_numero as (
  select a.id, c.nome as certa,
         lpad((coalesce((select max(x.documento::int) from boletins x
                          where chave_do_nome(x.cliente) = chave_do_nome(a.cliente)
                            and chave_do_nome(x.base) = chave_do_nome(c.nome)
                            and x.id <> a.id and x.documento ~ '^[0-9]{1,4}$'), 0) + 1)::text, 2, '0') as proximo
  from alvo a
  join bases c on chave_do_nome(c.cliente) = chave_do_nome(a.cliente)
              and chave_do_nome(c.nome) = chave_do_nome(a.certa)
)
update boletins b
   set base = n.certa,
       documento = case when b.documento is null or b.documento = '01' then n.proximo else b.documento end
  from com_numero n
 where b.id = n.id;

-- 3. A base nova que ficou sem boletim sai do cadastro.
delete from bases x
 where chave_do_nome(x.nome) ~ '(QUEIMADOS|MERITI|MERETI)'
   and coalesce(x.regional, '') = ''
   and chave_do_nome(x.nome) not in (chave_do_nome('BAIXADA II - QUEIMADOS'),
                                     chave_do_nome('BAIXADA II - QUEIMADOS - SETOR OPERACIONAL'),
                                     chave_do_nome('AEGEA - BAIXADA I - SERVIÇO'),
                                     chave_do_nome('AEGEA - BAIXADA I - OPERAÇÃO'))
   and not exists (select 1 from boletins b
                    where chave_do_nome(b.cliente) = chave_do_nome(x.cliente)
                      and chave_do_nome(b.base) = chave_do_nome(x.nome));

-- 4. Depois.
select b.id, b.numero, b.base, b.documento, b.referencia, c.regional, c.apelidos
from boletins b
join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'aberto'
left join bases c on chave_do_nome(c.cliente) = chave_do_nome(b.cliente) and chave_do_nome(c.nome) = chave_do_nome(b.base)
where chave_do_nome(b.base) ~ '(QUEIMADOS|MERITI|MERETI)'
   or chave_do_nome(b.base) in (chave_do_nome('AEGEA - BAIXADA I - SERVIÇO'), chave_do_nome('AEGEA - BAIXADA I - OPERAÇÃO'));
