-- =====================================================================
-- A regional que foi parar no nome do cliente (depois da 0019)
-- =====================================================================
-- "AEGEA SANEAMENTO E PARTICIPAÇÕES S.A - BAIXADA II" não é cliente do
-- controle: é a regional BAIXADA II do ÁGUAS DO RIO / AEGEA. O que vem
-- depois do último " - " do nome, quando é o nome de UMA regional do
-- controle, vira a regional do contrato, e o cliente passa a ser o do
-- controle. O nome como estava fica na observação.
--
-- Rode o TRECHO 1, confira, e só então o TRECHO 2. Contrato cujo cliente
-- já é do controle não entra.
-- =====================================================================

-- TRECHO 1 — o que vai mudar (nada muda aqui)
set search_path = medicoes, public;
with fora as (
  select c.id, c.numero, c.cliente,
         trim(regexp_replace(c.cliente, '^.*\s-\s*', '')) as sufixo
  from contratos c
  where not exists (select 1 from controle_regioes g
                     where chave_da_ficha(g.cliente) = chave_da_ficha(c.cliente))
), achou as (
  select f.id, f.numero, f.cliente, f.sufixo,
         count(g.*) as regionais,
         min(g.cliente) as cliente_do_controle,
         min(g.nome) as regional
  from fora f
  left join controle_regioes g on chave_do_nome(g.nome) = chave_do_nome(f.sufixo)
  group by f.id, f.numero, f.cliente, f.sufixo
)
select numero, cliente as hoje, cliente_do_controle as fica, regional,
       case when regionais = 1 then 'acerta'
            when regionais = 0 then '!! nenhuma regional com esse nome'
            else '!! mais de uma regional com esse nome' end as situacao
from achou order by situacao, cliente, numero;

-- TRECHO 2 — acerta os que disseram 'acerta'
set search_path = medicoes, public;
with fora as (
  select c.id, trim(regexp_replace(c.cliente, '^.*\s-\s*', '')) as sufixo
  from contratos c
  where not exists (select 1 from controle_regioes g
                     where chave_da_ficha(g.cliente) = chave_da_ficha(c.cliente))
), unica as (
  select f.id, min(g.cliente) as cliente, min(g.nome) as regional
  from fora f
  join controle_regioes g on chave_do_nome(g.nome) = chave_do_nome(f.sufixo)
  group by f.id
  having count(*) = 1
)
update contratos c
   set observacao = concat_ws(E'\n', c.observacao, 'Nome no cadastro: ' || c.cliente),
       cliente = u.cliente,
       regioes = array[u.regional]
  from unica u
 where u.id = c.id
returning c.numero, c.cliente, c.regioes;
