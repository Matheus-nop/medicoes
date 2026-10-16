-- =====================================================================
-- Volta os contratos como o time cadastrou
-- =====================================================================
-- Desfaz `passar-o-que-resta-para-o-saldo.sql`: o número que o time digitou
-- (o que resta) volta para o campo do valor global, e o saldo informado fica
-- vazio. Nenhum outro campo muda. Só mexe nos contratos que estão como o
-- script deixou: com saldo informado e sem valor global.
-- =====================================================================
set search_path = medicoes, public;
update contratos
   set valor = saldo_conferido,
       saldo_conferido = null,
       saldo_ate = null
 where saldo_conferido is not null
   and valor is null
returning numero, array_to_string(regioes, ', ') as regional, valor;
