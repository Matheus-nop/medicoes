-- =====================================================================
-- O que resta não é o valor global (depois da 0020)
-- =====================================================================
-- Os contratos foram cadastrados com o que RESTAVA no campo do valor global.
-- Este script passa esse número para o saldo conferido, no mês do controle
-- anterior ao do cadastro (cadastrado em outubro: o saldo conta o
-- faturamento até setembro), e deixa o valor global vazio até alguém
-- digitar o do papel.
--
-- TRECHO 1 só lê: a lista de TODOS os contratos, com o que o sistema vê de
-- cada um. Confira e me mande. TRECHO 2 faz a troca.
-- =====================================================================

-- TRECHO 1 — a conferência de todos os contratos (nada muda aqui)
set search_path = medicoes, public;
select c.numero, c.cliente,
       array_to_string(c.regioes, ', ')                                      as regional,
       c.vigencia_inicio                                                     as inicio,
       c.vigencia_atual                                                      as ate,
       c.valor                                                               as valor_cadastrado,
       c.saldo_conferido,
       to_char(coalesce(c.saldo_ate,
         (date_trunc('month', c.criado_em) - interval '1 month')::date), 'MM/YYYY') as saldo_depois_de,
       min(m.mes)                                                            as controle_desde,
       max(m.mes) filter (where m.medido <> 0 or m.faturado <> 0)            as controle_ate,
       coalesce(sum(m.faturado), 0)                                          as faturado_no_sistema,
       coalesce(sum(m.faturado) filter (where m.mes > coalesce(c.saldo_ate,
         (date_trunc('month', c.criado_em) - interval '1 month')::date)), 0) as faturado_depois,
       coalesce(sum(m.medido) - sum(m.faturado), 0)                          as medido_a_faturar,
       c.aditivos,
       c.criado_em::date                                                     as cadastrado_em
from contratos_atual c
left join contrato_meses m on m.contrato_id = c.id
group by c.id, c.numero, c.cliente, c.regioes, c.vigencia_inicio, c.vigencia_atual, c.valor,
         c.saldo_conferido, c.saldo_ate, c.criado_em, c.aditivos
order by c.cliente, regional, c.numero;

-- TRECHO 2 — o que resta vira saldo conferido (só onde ainda não há saldo conferido)
set search_path = medicoes, public;
update contratos
   set saldo_conferido = valor,
       saldo_ate = (date_trunc('month', criado_em) - interval '1 month')::date,
       valor = null
 where saldo_conferido is null
   and valor is not null
returning numero, array_to_string(regioes, ', ') as regional, saldo_conferido,
          to_char(saldo_ate, 'MM/YYYY') as depois_do_faturamento_de;
