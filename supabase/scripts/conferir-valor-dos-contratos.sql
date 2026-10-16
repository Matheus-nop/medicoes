-- Os contratos com valor global que parece dígito faltando ("13" querendo
-- dizer 13 milhões). Só lê: o valor certo se corrige na ficha, em
-- Cadastro → Corrigir, olhando o papel do contrato.
set search_path = medicoes, public;
select numero, cliente, regioes, valor, vigencia_inicio, vigencia_fim
from contratos
where valor is not null and valor < 1000
order by cliente, numero;
