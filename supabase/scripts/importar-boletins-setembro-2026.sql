-- =====================================================================
-- Os boletins de manutenção de SETEMBRO/2026 do Águas do Rio / AEGEA
-- (41 boletins, 145 OMs, R$ 195.477,00 — lidos dos arquivos padronizados)
-- Rode no SQL Editor. Pode rodar duas vezes: boletim que já existe (mesmo
-- cliente, base, mês e documento) não é criado de novo, e OM que já está em
-- algum boletim fica onde está (uma OM, um boletim).
--
-- Entram no papel padrão 2026 do Águas do Rio, FECHADOS na data de emissão
-- (02/10/2026) — já foram emitidos. Enviar e faturar se marca na tela.
-- Autor: matheus@novaopcaoequipamentos.com.br (criado_por, incluido_por e quem fechou).
--
-- O que se conferiu nos arquivos (pasta "9 - SETEMBRO"):
--   · Entram só os 41 boletins com mês SETEMBRO/2026 — todos têm o PDF
--     emitido ao lado. Ficam de fora o MODELO, os 6 "SEM MANUTENÇÃO" e 3
--     planilhas de agosto esquecidas na pasta (Jardim Primavera Serviços,
--     Queimados Setor Operacional, Centro Sul Botafogo): todas as OMs delas
--     já entraram na importação de agosto.
--   · Setorizada Leste Bloco 1 VCG tem 24 OMs (R$ 51.921,00): o modelo
--     cresceu com linhas inseridas, e o leitor vai até a linha do TOTAL.
--   · VCG Nova Iguaçu Baixada 2 Bloco 4: uma linha só com o nome do
--     equipamento (sem OM nem valor) ficou de fora.
--   · 29 linhas trazem no Nº OM o número do comprovante (1170-01, 2252-17…),
--     de substituição, devolução ou manutenção no local — entram como estão
--     no papel.
--   · Em setembro a coluna do recibo de retirada se chama PROPOSTA, e a do
--     recibo de entrega, OM ENTREGA, na maioria dos arquivos. Os números
--     entram nos mesmos campos (om_retirada e recibo_entrega).
--   · Os totais de cada arquivo batem com a soma das OMs.
--
-- Um comando por boletim: se a colagem cortar, o que chegou inteiro entrou, e
-- rodar de novo completa o resto.
-- =====================================================================

set search_path = medicoes, public;

-- 04 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - PIAM BELFORD-ROXO - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PIAM BAIXADA I - OPERAÇÃO', '04', 'SETEMBRO/2026', 'Sra° Larissa Costa', null, 'AVENIDA RETIRO DA IMPRENSA, 76 - PIAM BELFORD-ROXO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PIAM BAIXADA I - OPERAÇÃO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PIAM BAIXADA I - OPERAÇÃO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 04 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - PIAM BELFORD-ROXO - SETEMBRO.xlsx', u.id
  from u, (values
  ('1170-01', '25025-488', 'BOMBA DE MANGOTE 3"', '2026-08-20 12:00-03', 296.00, '034671', '1170-01', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('036271', '19024-537', 'MOTOVIBRADOR GASOLINA BRANCO', '2026-09-15 12:00-03', 218.00, '037319', '036271', 'CMANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 04 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - VILA ESPERANÇA - MAGÉ - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - OPERAÇÃO', '04', 'SETEMBRO/2026', 'Sraº Larissa Costa', null, 'RUA FRANCISCO ALVES DE OLIVEIRA, 850 - VILA ESPERANÇA - MAGÉ RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 04 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - VILA ESPERANÇA - MAGÉ - SETEMBRO.xlsx', u.id
  from u, (values
  ('035866', '19094-672', 'MOTOVIBRADOR GASOLINA BRANCO', '2026-09-09 12:00-03', 220.00, '037229', '035866', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 07 - BM MANUTENÇÃO - BAIXADA 1 SERVIÇOS - PIAM BELFORD-ROXO - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PIAM BAIXADA I - SERVIÇOS', '07', 'SETEMBRO/2026', 'Sra° Larissa Costa', null, 'AVENIDA RETIRO DA IMPRENSA, 76 - PIAM BELFORD-ROXO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PIAM BAIXADA I - SERVIÇOS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PIAM BAIXADA I - SERVIÇOS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 07 - BM MANUTENÇÃO - BAIXADA 1 SERVIÇOS - PIAM BELFORD-ROXO - SETEMBRO.xlsx', u.id
  from u, (values
  ('034903', '23108-135', 'COMPACTADOR DE SOLO NORTON', '2026-08-25 12:00-03', 465.00, '035025', '035154', null),
  ('033819', '22052-089', 'CORTADORA PISO WOLKAN', '2026-09-04 12:00-03', 420.00, '036009', '033819', 'MANUTENÇÃO NO LOCAL'),
  ('036693', '240925-186', 'CORTADORA MANUAL HUSQVARNA', '2026-09-21 12:00-03', 2624.00, '036708', '036799', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 08 - BM MANUTENÇÃO - BAIXADA 1 SERVIÇOS - CENTRO DUQUE DE CAXIAS - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - SERVIÇO', '08', 'SETEMBRO/2026', 'Sraº Larissa Costa', null, 'AV. DOUTOR MANUEL TELES, 237 - CENTRO, DUQUE DE CAXIAS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - SERVIÇO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - SERVIÇO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 08 - BM MANUTENÇÃO - BAIXADA 1 SERVIÇOS - CENTRO DUQUE DE CAXIAS - SETEMBRO.xlsx', u.id
  from u, (values
  ('033301', '240125-063', 'CORTADORA MANUAL HUSQVARNA', '2026-08-05 12:00-03', 2624.00, '033597', '033656', null),
  ('1348-01', '250225-404', 'CORTADORA MANUAL HUSQVARNA', '2026-08-25 12:00-03', 2811.00, '034429', '1348-01', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('1178-18', '24095-626', 'BOMBA DE MANGOTE 3"', '2026-08-27 12:00-03', 396.00, '035498', '1178-18', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('034444', '250115-476', 'GRUPO GERADOR 3,5 KVA', '2026-08-19 12:00-03', 148.00, '036691', '034444', 'MANUTENÇÃO NO LOCAL'),
  ('035069', '250115-479', 'GRUPO GERADOR 3,5 KVA', '2026-08-27 12:00-03', 220.00, '036893', '035069', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 09 - BM MANUTENÇÃO - BAIXADA 1 CAV - CENTRO DUQUE DE CAXIAS - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - CAV', '09', 'SETEMBRO/2026', 'Sraº Larissa Costa', null, 'AV. DOUTOR MANUEL TELES, 237 - CENTRO, DUQUE DE CAXIAS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - CAV' and referencia = 'SETEMBRO/2026' and documento is not distinct from '09')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - CAV' and referencia = 'SETEMBRO/2026' and documento is not distinct from '09'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 09 - BM MANUTENÇÃO - BAIXADA 1 CAV - CENTRO DUQUE DE CAXIAS - SETEMBRO.xlsx', u.id
  from u, (values
  ('034446', '240115-426', 'GRUPO GERADOR 3,5 KVA', '2026-08-19 12:00-03', 220.00, '036709', '034446', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 09 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - JARDIM ALEGRIA - SÃO JOÃO DE MERITI - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - OPERAÇÃO', '09', 'SETEMBRO/2026', 'Sraº Larissa Costa', null, 'AV. EUCLIDES DA CUNHA, 470 - JARDIM ALEGRIA, SÃO JOÃO DE MERETI', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '09')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '09'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 09 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - JARDIM ALEGRIA - SÃO JOÃO DE MERITI - SETEMBRO.xlsx', u.id
  from u, (values
  ('035757', '24114-365', 'MOTOVIBRADOR GASOLINA BRANCO', '2026-09-04 12:00-03', 108.00, '037208', '035757', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 09 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - VILA SÃO JOÃO - SÃO JOÃO DE MERITI - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - SERVIÇO', '09', 'SETEMBRO/2026', 'Sraº Larissa Costa', null, 'AV. EUCLIDES DA CUNHA, 470 - VILA SÃO JOÃO, SÃO JOÃO DE MERETI', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - SERVIÇO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '09')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - SERVIÇO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '09'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 09 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - VILA SÃO JOÃO - SÃO JOÃO DE MERITI - SETEMBRO.xlsx', u.id
  from u, (values
  ('035844', '250115-489', 'GRUPO GERADOR 3,5 KVA', '2026-09-15 12:00-03', 396.00, '037211', '035844', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 10 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - JARDIM PRIMAVERA - DUQUE DE CAXIAS - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - OPERAÇÃO', '10', 'SETEMBRO/2026', 'Sraº Larissa Costa', null, 'ALAMEDA CALHEIROS DA GRAÇA, 221 - JARDIM PRIMAVERA - DUQUE DE CAXIAS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '10')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '10'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 10 - BM MANUTENÇÃO - BAIXADA 1 OPERAÇÃO - JARDIM PRIMAVERA - DUQUE DE CAXIAS - SETEMBRO.xlsx', u.id
  from u, (values
  ('035867', '230315-039', 'GRUPO GERADOR 3,5KVA', '2026-09-09 12:00-03', 394.00, '037234', '035867', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 06 - BM MANUTENÇÃO - BAIXADA 2 QUEIMADOS  - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - QUEIMADOS', '06', 'SETEMBRO/2026', 'Sra. Fabiane', null, 'ESTRADA CARLOS SAMPAIO, 176 - QUEIMADOS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - QUEIMADOS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - QUEIMADOS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 06 - BM MANUTENÇÃO - BAIXADA 2 QUEIMADOS  - SETEMBRO.xlsx', u.id
  from u, (values
  ('035566', '250225-250', 'CORTADORA MANUAL HUSQVARNA', '2026-09-02 12:00-03', 2624.00, '035626', '035763', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM MANUTENÇÃO - BAIXADA 2 CALIFÓRNIA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - CALIFÓRNIA, NOVA IGUAÇU', '14', 'SETEMBRO/2026', 'Sra. Fabiane', null, 'RUA OSCAR SOARES,1362 - CALIFÓRNIA, NOVA IGUAÇU', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - CALIFÓRNIA, NOVA IGUAÇU' and referencia = 'SETEMBRO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - CALIFÓRNIA, NOVA IGUAÇU' and referencia = 'SETEMBRO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 14 - BM MANUTENÇÃO - BAIXADA 2 CALIFÓRNIA - SETEMBRO.xlsx', u.id
  from u, (values
  ('033825', '21014-697', 'MOTOVIBRADOR GASOLINA', '2026-08-11 12:00-03', 350.00, '033864', '034319', null),
  ('034999', '240115-293', 'GRUPO GERADOR 3,5 KVA', '2026-08-27 12:00-03', 875.00, '035210', '035321', null),
  ('035573', '12014-085', 'MOTOVIBRADOR GASOLINA', '2026-09-02 12:00-03', 350.00, '035628', '035738', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM MANUTENÇÃO - BAIXADA 2 NOVA IGUAÇU - D17 - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - CALIFÓRNIA D-17', '15', 'SETEMBRO/2026', 'Sra. Fabiane', null, 'RUA OSCAR SOARES,1362 - CALIFÓRNIA, NOVA IGUAÇU', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - CALIFÓRNIA D-17' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - CALIFÓRNIA D-17' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 15 - BM MANUTENÇÃO - BAIXADA 2 NOVA IGUAÇU - D17 - SETEMBRO.xlsx', u.id
  from u, (values
  ('1095-21', '25035-032', 'BOMBA DE MANGOTE 3"', '2026-09-10 12:00-03', 740.00, '036622', '1095-21', null),
  ('036389', '24015-109', 'BOMBA DE MANGOTE 3"', '2026-09-16 12:00-03', 396.00, '036417', '036549', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 16 - BM MANUTENÇÃO - BAIXADA 2 NILÓPOLIS - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - OLINDA / NILÓPOLIS D-18', '16', 'SETEMBRO/2026', 'Sra. Fabiane', null, 'RUA VEREADOR FRANCISCO NUNES, 1000', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - OLINDA / NILÓPOLIS D-18' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - OLINDA / NILÓPOLIS D-18' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 16 - BM MANUTENÇÃO - BAIXADA 2 NILÓPOLIS - SETEMBRO.xlsx', u.id
  from u, (values
  ('034516', '240115-320', 'GRUPO GERADOR 3,5KVA', '2026-08-21 12:00-03', 315.00, '034847', '034889', null),
  ('035911', '240115-313', 'GRUPO GERADOR 3,5KVA', '2026-09-10 12:00-03', 442.00, '036053', '036197', null),
  ('036121', '240115-307', 'GRUPO GERADOR 3,5KVA', '2026-09-15 12:00-03', 514.00, '036317', '036346', null),
  ('034455', '260315-731', 'GRUPO GERADOR 3,5KVA', '2026-09-15 12:00-03', 148.00, '036712', '034455', 'MANUTENÇÃO NO LOCAL'),
  ('034997', '251115-706', 'GRUPO GERADOR 3,5KVA', '2026-08-27 12:00-03', 148.00, '036872', '034997', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 01 - BM MANUTENÇÃO - SETORIZADA NOVA IGUAÇU BAIXADA 2 BLOCO 4 VCG - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4 VCG', '01', 'SETEMBRO/2026', 'Sraº Thaynã', '21 97226-0057', 'RUA OSCAR SOARES, 1362 - NOA IGUAÇU - RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4 VCG' and referencia = 'SETEMBRO/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4 VCG' and referencia = 'SETEMBRO/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 01 - BM MANUTENÇÃO - SETORIZADA NOVA IGUAÇU BAIXADA 2 BLOCO 4 VCG - SETEMBRO.xlsx', u.id
  from u, (values
  ('036382', '251125-431', 'CORTADORA MANUAL HUSQVARNA', '2026-09-16 12:00-03', 2624.00, '036437', '036500', null),
  ('036424', '250225-236', 'CORTADORA MANUAL HUSQVARNA', '2026-09-16 12:00-03', 2624.00, '036440', '036525', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 02 - BM MANUTENÇÃO - VCG NOVA IGUAÇU BAIXADA 2 BLOCO 4 - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4', '02', 'SETEMBRO/2026', 'Sraº Thaynã', '21 97226-0057', 'RUA OSCAR SOARES, 1362 - NOA IGUAÇU - RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4' and referencia = 'SETEMBRO/2026' and documento is not distinct from '02')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4' and referencia = 'SETEMBRO/2026' and documento is not distinct from '02'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 02 - BM MANUTENÇÃO - VCG NOVA IGUAÇU BAIXADA 2 BLOCO 4 - SETEMBRO.xlsx', u.id
  from u, (values
  ('035514', '240125-049', 'CORTADORA MANUAL HUSQVARNA', '2026-09-02 12:00-03', 2624.00, '035614', '035731', null),
  ('035390', '240825-149', 'CORTADORA MANUAL HUSQVARNA', '2026-09-02 12:00-03', 5216.00, '035607', '035719', null),
  ('2641-05', '240825-142', 'CORTADORA MANUAL HUSQVARNA', '2026-08-28 12:00-03', 2624.00, '035799', '2641-05', 'COMPROVANTE DE SUBSTITUIÇÃO')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 03 - BM MANUTENÇÃO - PENHA CAV NORTE - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PENHA - CAV NORTE', '03', 'SETEMBRO/2026', 'SRA. THAYNA', null, 'RUA CUBA, 1 - PENHA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PENHA - CAV NORTE' and referencia = 'SETEMBRO/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PENHA - CAV NORTE' and referencia = 'SETEMBRO/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 03 - BM MANUTENÇÃO - PENHA CAV NORTE - SETEMBRO.xlsx', u.id
  from u, (values
  ('036012', '240125-043', 'CORTADORA MANUAL HUSQVARNA', '2026-09-10 12:00-03', 3193.00, '036073', '036247', null),
  ('035617', '230625-017', 'CORTADORA MANUAL HUSQVARNA', '2026-09-03 12:00-03', 2624.00, '035695', '035736', null),
  ('036252', '240825-098', 'CORTADORA MANUAL HUSQVARNA', '2026-09-15 12:00-03', 2624.00, '036329', '036372', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 05 - BM MANUTENÇÃO - SETORIZADA BAIXADA 1 BELFORD ROXO BLOCO 4 VCG - JD AMÉRICA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - BAIXADA I - BELFORD ROXO - BLOCO 4 - VCG', '05', 'SETEMBRO/2026', 'Sraº Thaynã 1', '21 97226-0057', 'AV. RODOVIA PRESIDENTE DUTRA, 670 JARDIM AMÉRICA', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - BAIXADA I - BELFORD ROXO - BLOCO 4 - VCG' and referencia = 'SETEMBRO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - BAIXADA I - BELFORD ROXO - BLOCO 4 - VCG' and referencia = 'SETEMBRO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 05 - BM MANUTENÇÃO - SETORIZADA BAIXADA 1 BELFORD ROXO BLOCO 4 VCG - JD AMÉRICA - SETEMBRO.xlsx', u.id
  from u, (values
  ('035500', '250115-617', 'GRUPO GERADOR 3,5 KVA', '2026-09-02 12:00-03', 394.00, '035552', '035638', null),
  ('035512', '240115-286', 'GRUPO GERADOR 3,5 KVA', '2026-09-02 12:00-03', 1039.00, '035612', '035754', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 05 - BM MANUTENÇÃO - VCG RIO BONITO LAGOS BLOCO 1 - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - RIO BONITO - LAGOS - BLOCO 1', '05', 'SETEMBRO/2026', 'Sra° Thaynã', '21 97226-0057', 'RUA NILO PEÇANHA, 130', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO BONITO - LAGOS - BLOCO 1' and referencia = 'SETEMBRO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO BONITO - LAGOS - BLOCO 1' and referencia = 'SETEMBRO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 05 - BM MANUTENÇÃO - VCG RIO BONITO LAGOS BLOCO 1 - SETEMBRO.xlsx', u.id
  from u, (values
  ('036006', '25104-273', 'MOTOVIBRADOR GASOLINA', '2026-09-10 12:00-03', 421.00, '037309', '036006', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 05 - BM MANUTENÇÃO - VCG RIO DE JANEIRO COMUNIDADES BLOCO 4 - JD AMÉRICA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4', '05', 'SETEMBRO/2026', 'Sr° Gabriel Gama', null, 'RODOVIA PRESIDENTE DUTRA, 478 - JARDIM AMÉRICA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4' and referencia = 'SETEMBRO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4' and referencia = 'SETEMBRO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 05 - BM MANUTENÇÃO - VCG RIO DE JANEIRO COMUNIDADES BLOCO 4 - JD AMÉRICA - SETEMBRO.xlsx', u.id
  from u, (values
  ('033181', '250225-291', 'CORTADORA MANUAL HUSQVARNA', '2026-08-05 12:00-03', 3025.00, '034921', '035216', null),
  ('033429', '250225-304', 'CORTADORA MANUAL HUSQVARNA', '2026-08-07 12:00-03', 2797.00, '034944', '035221', null),
  ('035241', '250225-306', 'CORTADORA MANUAL HUSQVARNA', '2026-09-02 12:00-03', 2940.00, '035242', '035314', null),
  ('035089', '250225-328', 'CORTADORA MANUAL HUSQVARNA', '2026-08-28 12:00-03', 2624.00, '035338', '035442', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 06 - BM MANUTENÇÃO - VCG  PROJETO RIO DE JANEIRO RIO NORTE - JARDIM AMÉRICA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PROJETO RIO DE JANEIRO RIO NORTE BLOCO 4 VCG', '06', 'SETEMBRO/2026', 'Sraº Thaynã', null, 'RODOVIA PRESIDENTE DUTRA, 478 - JARDIM AMÉRICA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PROJETO RIO DE JANEIRO RIO NORTE BLOCO 4 VCG' and referencia = 'SETEMBRO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PROJETO RIO DE JANEIRO RIO NORTE BLOCO 4 VCG' and referencia = 'SETEMBRO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 06 - BM MANUTENÇÃO - VCG  PROJETO RIO DE JANEIRO RIO NORTE - JARDIM AMÉRICA - SETEMBRO.xlsx', u.id
  from u, (values
  ('035515', '250225-375', 'CORTADORA MANUAL HUSQVARNA', '2026-09-02 12:00-03', 2624.00, '035615', '035668', null),
  ('034275', '21112-041', 'CORTADORA PISO NORTON', '2026-08-18 12:00-03', 420.00, '036145', '034275', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 09 - BM MANUTENÇÃO - SETORIZADA LESTE BLOCO 1 VCG - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - SÃO GONÇALO - LESTE - BLOCO 1 - VCG', '09', 'SETEMBRO/2026', 'Sra° Thaynã', '21 97226-0057', 'RODOVIA GOVERNADOR MARIO COVAS, 101 - KM 312', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - SÃO GONÇALO - LESTE - BLOCO 1 - VCG' and referencia = 'SETEMBRO/2026' and documento is not distinct from '09')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - SÃO GONÇALO - LESTE - BLOCO 1 - VCG' and referencia = 'SETEMBRO/2026' and documento is not distinct from '09'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 09 - BM MANUTENÇÃO - SETORIZADA LESTE BLOCO 1 VCG - SETEMBRO.xlsx', u.id
  from u, (values
  ('2188-03', '250225-396', 'CORTADORA MANUAL HUSQVARNA', '2026-07-24 12:00-03', 2656.00, '032642', '2188-03', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('1156-01', '250225-356', 'CORTADORA MANUAL HUSQVARNA', '2026-07-24 12:00-03', 2624.00, '032643', '1156-01', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('1167-02', '250225-340', 'CORTADORA MANUAL HUSQVARNA', '2026-07-22 12:00-03', 2624.00, '032645', '1167-02', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('034414', '250115-523', 'CORTADORA MANUAL HUSQVARNA', '2026-08-19 12:00-03', 757.00, '034556', '034706', null),
  ('1167-04', '240825-121', 'CORTADORA MANUAL HUSQVARNA', '2026-08-25 12:00-03', 2624.00, '034564', '1167-04', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('2252-17', '250225-370', 'CORTADORA MANUAL HUSQVARNA', '2026-08-25 12:00-03', 3029.00, '034565', '2252-17', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('034272', '250225-366', 'CORTADORA MANUAL HUSQVARNA', '2026-08-20 12:00-03', 2624.00, '034574', '034900', null),
  ('034413', '260615-171', 'GRUPO GERADOR 3,5KVA', '2026-08-19 12:00-03', 692.00, '034856', '034560', null),
  ('035103', '251125-435', 'CORTADORA MANUAL HUSQVARNA', '2026-08-26 12:00-03', 2656.00, '035114', '035230', null),
  ('034911', '240125-072', 'CORTADORA MANUAL HUSQVARNA', '2026-08-26 12:00-03', 2868.00, '035116', '034911', null),
  ('034907', '250225-263', 'CORTADORA MANUAL HUSQVARNA', '2026-08-26 12:00-03', 2712.00, '035128', '035151', null),
  ('034908', '250225-237', 'CORTADORA MANUAL HUSQVARNA', '2026-08-26 12:00-03', 2672.00, '035129', '035305', null),
  ('034912', '250225-246', 'CORTADORA MANUAL HUSQVARNA', '2026-08-26 12:00-03', 2624.00, '035132', '035315', null),
  ('035104', '250225-341', 'CORTADORA MANUAL HUSQVARNA', '2026-08-26 12:00-03', 2624.00, '035144', '035316', null),
  ('035106', '250225-336', 'CORTADORA MANUAL HUSQVARNA', '2026-08-26 12:00-03', 2811.00, '035146', '035318', null),
  ('035299', '260315-161', 'GRUPO GERADOR 3,5KVA', '2026-09-02 12:00-03', 737.00, '035597', '035667', null),
  ('035298', '250225-405', 'CORTADORA MANUAL HUSQVARNA', '2026-09-04 12:00-03', 3029.00, '035906', '035947', null),
  ('035296', '250225-257', 'CORTADORA MANUAL HUSQVARNA', '2026-09-04 12:00-03', 2624.00, '035908', '036005', null),
  ('036129', '240925-169', 'CORTADORA MANUAL HUSQVARNA', '2026-09-16 12:00-03', 2787.00, '036405', '036522', null),
  ('2252-16', '240825-110', 'CORTADORA MANUAL HUSQVARNA', '2026-08-25 12:00-03', 2624.00, '036551', '2252-16', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('034464', '250915-357', 'GRUPO GERADOR 3,5KVA', '2026-08-19 12:00-03', 237.00, '036716', '034464', 'MANUTENÇÃO NO LOCAL'),
  ('2252-18', '251125-285', 'CORTADORA MANUAL HUSQVARNA', '2026-08-25 12:00-03', 2624.00, '036792', '2252-18', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('035747', '250915-670', 'GRUPO GERADOR 3,5KVA', '2026-09-04 12:00-03', 366.00, '037207', '035747', 'MANUTENÇÃO NO LOCAL'),
  ('036139', '260315-744', 'GRUPO GERADOR 3,5KVA', '2026-09-16 12:00-03', 296.00, '037314', '036139', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 11 - BM MANUTENÇÃO -  VCG BAIXADA 1 BELFORD ROXO - BLOCO 4 - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - BAIXADA I - BELFORD ROXO - BLOCO 4', '11', 'SETEMBRO/2026', 'Sraº Thaynã', '21 97226-0057', 'RODOVIA PRESIDENTE DUTRA, 670 - JARDIM AMÉRICA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - BAIXADA I - BELFORD ROXO - BLOCO 4' and referencia = 'SETEMBRO/2026' and documento is not distinct from '11')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - BAIXADA I - BELFORD ROXO - BLOCO 4' and referencia = 'SETEMBRO/2026' and documento is not distinct from '11'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 11 - BM MANUTENÇÃO -  VCG BAIXADA 1 BELFORD ROXO - BLOCO 4 - SETEMBRO.xlsx', u.id
  from u, (values
  ('1159-02', '260325-216', 'CORTADORA MANUAL HUSQVARNA', '2026-08-28 12:00-03', 2624.00, '034432', '1159-02', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('1159-01', '260325-148', 'CORTADORA MANUAL HUSQVARNA', '2026-08-28 12:00-03', 2656.00, '034433', '1159-01', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('035511', '240715-451', 'GRUPO GERADOR 3,5 KVA', '2026-09-02 12:00-03', 688.00, '035611', '035725', null),
  ('035516', '250225-327', 'CORTADORA MANUAL HUSQVARNA', '2026-09-02 12:00-03', 2624.00, '035618', '035737', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 13 - BM MANUTENÇÃO - VCG RIO DE JANEIRO COMUNIDADES BLOCO 4 - SETORIZADA.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4', '13', 'SETEMBRO/2026', 'Sraº Thaynã', '21 97226-0057', 'CAMPO SÃO CRISTOVÃO, 166 - SÃO CRISTOVÃO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4' and referencia = 'SETEMBRO/2026' and documento is not distinct from '13')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4' and referencia = 'SETEMBRO/2026' and documento is not distinct from '13'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 13 - BM MANUTENÇÃO - VCG RIO DE JANEIRO COMUNIDADES BLOCO 4 - SETORIZADA.xlsx', u.id
  from u, (values
  ('2226-02', '251125-443', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2624.00, '033374', '2226-02', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('2159-08', '250225-395', 'CORTADORA MANUAL HUSQVARNA', '2026-08-26 12:00-03', 2704.00, '034672', '2159-08', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('034481', '250115-517', 'GRUPO GERADOR 3,5 KVA', '2026-08-19 12:00-03', 1210.00, '034538', '034651', null),
  ('034878', '240125-065', 'CORTADORA MANUAL HUSQVARNA', '2026-08-24 12:00-03', 2624.00, '034938', '035220', null),
  ('1532-01', '250114-662', 'MARTELO ROMPEDOR 30KG', '2026-08-25 12:00-03', 428.00, '035044', '1532-01', 'COMPROVANTE DE DEVOLUÇÃO'),
  ('035260', '250225-392', 'CORTADORA MANUAL HUSQVARNA', '2026-08-28 12:00-03', 2624.00, '035308', '035517', null),
  ('034619', '240115-669', 'GRUPO GERADOR 3,5 KVA', '2026-08-20 12:00-03', 148.00, '036812', '034619', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 05 - BM MANUTENÇÃO - COMUNIDADES GAVEA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - GÁVEA', '05', 'SETEMBRO/2026', 'SR. LUCAS', null, 'ESTRADA DA GÁVEA, 240 - RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - GÁVEA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - GÁVEA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 05 - BM MANUTENÇÃO - COMUNIDADES GAVEA - SETEMBRO.xlsx', u.id
  from u, (values
  ('035492', '663603', 'COMPACTADOR DE SOLO WOLKAN (TERCEIRO)', '2026-09-10 12:00-03', 1354.00, '036061', '036888', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 06 - BM MANUTENÇÃO - COMUNIDADES ENGENHO DE DENTRO COMERCIAL - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A - COMERCIAL', 'COMUNIDADES - ENGENHO DE DENTRO - COMERCIAL', '06', 'SETEMBRO/2026', 'Sraº Maisa', null, 'RUA MARIO CALDERADO, 485 - ENGENHO DE DENTRO, RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A - COMERCIAL' and base = 'COMUNIDADES - ENGENHO DE DENTRO - COMERCIAL' and referencia = 'SETEMBRO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A - COMERCIAL' and base = 'COMUNIDADES - ENGENHO DE DENTRO - COMERCIAL' and referencia = 'SETEMBRO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 06 - BM MANUTENÇÃO - COMUNIDADES ENGENHO DE DENTRO COMERCIAL - SETEMBRO.xlsx', u.id
  from u, (values
  ('1264-01', '240115-418', 'GRUPO GERADOR 3,5 KVA', '2026-09-14 12:00-03', 166.00, '036219', '1264-01', 'COMPROVANTE DE DEVOLUÇÃO')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM MANUTENÇÃO - COMUNIDADES MARÉ - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - MARÉ', '15', 'SETEMBRO/2026', 'Srº Diogenes e Sraº Talita', null, 'RUA TEXEIRA IBEIRO S/N, MARÉ RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - MARÉ' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - MARÉ' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 15 - BM MANUTENÇÃO - COMUNIDADES MARÉ - SETEMBRO.xlsx', u.id
  from u, (values
  ('035038', '231125-026', 'CORTADORA MANUAL HUSQVARNA', '2026-09-01 12:00-03', 216.00, '035496', '035547', null),
  ('036370', '18104-040', 'MOTOVIBRADOR GASOLINA', '2026-09-16 12:00-03', 549.00, '036414', '036550', null),
  ('036374', 'SN', 'CORTADORA MANUAL STHIIL (TERCEIRO)', '2026-09-16 12:00-03', 1262.00, '036726', '037271', null),
  ('035935', '250115-526', 'GRUPO GERADOR 3,5KVA', '2026-09-11 12:00-03', 296.00, '037240', '035935', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 16 - BM MANUTENÇÃO - COMUNIDADES ENGENHO DE DENTRO - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - ENGENHO DE DENTRO', '16', 'SETEMBRO/2026', 'Srº Lucas', null, 'RUA MARIO CALDERADO, 485 - ENGENHO DE DENTRO, RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - ENGENHO DE DENTRO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - ENGENHO DE DENTRO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 16 - BM MANUTENÇÃO - COMUNIDADES ENGENHO DE DENTRO - SETEMBRO.xlsx', u.id
  from u, (values
  ('036086', '240115-361', 'GRUPO GERADOR 3,5KVA', '2026-09-14 12:00-03', 148.00, '037313', '036086', 'MANUTENÇÃO NO LOCAL'),
  ('035465', '241125-204', 'CORTADORA MANUAL HUSQVARNA', '2026-09-01 12:00-03', 2734.00, '035507', '035571', null),
  ('034715', '240115-369', 'GRUPO GERADOR 3,5KVA', '2026-08-25 12:00-03', 838.00, '035017', '035060', null),
  ('035039', '240115-366', 'GRUPO GERADOR 3,5KVA', '2026-08-28 12:00-03', 938.00, '035329', '035329', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 16 - BM MANUTENÇÃO - COMUNIDADES PENHA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - PENHA', '16', 'SETEMBRO/2026', 'SR. LUCAS', null, 'RUA CUBA, 01 - PENHA, RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - PENHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - PENHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 16 - BM MANUTENÇÃO - COMUNIDADES PENHA - SETEMBRO.xlsx', u.id
  from u, (values
  ('035430', '240115-348', 'GRUPO GERADOR 3,5 KVA', '2026-09-02 12:00-03', 642.00, '035608', '035722', null),
  ('035959', '240115-342', 'GRUPO GERADOR 3,5 KVA', '2026-09-11 12:00-03', 368.00, '037243', '035959', 'MANUTENÇÃO NO LOCAL'),
  ('034958', '24014-136', 'MOTOVOBRADOR GASOLINA', '2026-08-28 12:00-03', 176.00, '036857', '034958', 'MANUTENÇÃO NO LOCAL'),
  ('1192-30', '24015-206', 'BOMBA DE MANGOTE 3"', '2026-08-21 12:00-03', 396.00, '034753', '1192-30', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 01 - BM MANUTENÇÃO BAIXADA 2 NOVA IGUAÇU - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'GRANDE DIÂMETRO BAIXADA 2 CALIFÓRNIA', '01', 'SETEMBRO/2026', 'Sra° Thayna', null, 'RUA OSCAR SOARES, 1362 - CALIFÓRNIA NOVA IGUAÇU RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'GRANDE DIÂMETRO BAIXADA 2 CALIFÓRNIA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'GRANDE DIÂMETRO BAIXADA 2 CALIFÓRNIA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 01 - BM MANUTENÇÃO BAIXADA 2 NOVA IGUAÇU - SETEMBRO.xlsx', u.id
  from u, (values
  ('034855', '241125-192', 'CORTADORA MANUAL HUSQVARNA', '2026-08-24 12:00-03', 2624.00, '034962', '035223', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 02 - BM MANUTENÇÃO BAIXADA 1 VIGÁRIO GERAL - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'GRANDE DIÂMETRO - ETE - VIGÁRIO GERAL', '02', 'SETEMBRO/2026', 'Sra° Thayna', null, 'RUA BULHÕES DE MARCIAL, 1050 - VIGÁRIO GERAL - RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'GRANDE DIÂMETRO - ETE - VIGÁRIO GERAL' and referencia = 'SETEMBRO/2026' and documento is not distinct from '02')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'GRANDE DIÂMETRO - ETE - VIGÁRIO GERAL' and referencia = 'SETEMBRO/2026' and documento is not distinct from '02'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 02 - BM MANUTENÇÃO BAIXADA 1 VIGÁRIO GERAL - SETEMBRO.xlsx', u.id
  from u, (values
  ('014810', '20240930005', 'RETIFICADOR DE SOLDA (TERCEIRO)', '2026-08-03 12:00-03', 845.00, '015766', '037276', null),
  ('014809', 'SN', 'RETIFICADOR DE SOLDA (TERCEIRO)', '2026-08-03 12:00-03', 1385.00, '015764', '037274', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 03 - BM MANUTENÇÃO - INTERIOR - ITAOCARA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'BASE INTERIOR - ITAOCARA', '03', 'SETEMBRO/2026', 'Sra° Larissa Costa', null, 'AV. MARECHAL FLORIANO PEIXOTO, 508 - JARDIM DA ALDEIA - ITAOCARA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'BASE INTERIOR - ITAOCARA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'BASE INTERIOR - ITAOCARA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 03 - BM MANUTENÇÃO - INTERIOR - ITAOCARA - SETEMBRO.xlsx', u.id
  from u, (values
  ('1153-03', '240825-113', 'CORTADORA MANUAL HUSQVARNA', '2026-08-28 12:00-03', 3397.00, '036609', '1153-03', 'COMPROVANTE DE DEVOLUÇÃO')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM MANUTENÇÃO - LESTE - ITABORAÍ - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'LESTE - ITABORAÍ', '14', 'SETEMBRO/2026', 'Sr. Wendel', null, 'RUA MILTON CHICO, SN - VENDAS DAS PEDRAS - ITABORAÍ RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - ITABORAÍ' and referencia = 'SETEMBRO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - ITABORAÍ' and referencia = 'SETEMBRO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 14 - BM MANUTENÇÃO - LESTE - ITABORAÍ - SETEMBRO.xlsx', u.id
  from u, (values
  ('035878', '240825-130', 'CORTADORA MANUAL HUSQVARNA', '2026-09-10 12:00-03', 773.00, '036062', '036155', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM MANUTENÇÃO - LESTE - MARICÁ - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'LESTE - MARICÁ', '15', 'SETEMBRO/2026', 'Sraº Wendel', null, 'RUA CARLOS MARIGUELLA - ITAOCAIA VALLEY, MARICÁ RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - MARICÁ' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - MARICÁ' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 15 - BM MANUTENÇÃO - LESTE - MARICÁ - SETEMBRO.xlsx', u.id
  from u, (values
  ('034691', '24115-663', 'BOMBA DE MANGOTE 3"', '2026-08-21 12:00-03', 396.00, '034776', '034867', null),
  ('2118-08', '240825-139', 'CORTADORA MANUAL HUSQVARNA', '2026-08-27 12:00-03', 2760.00, '034848', '2118-08', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('035424', '240825-136', 'CORTADORA MANUAL HUSQVARNA', '2026-09-01 12:00-03', 2624.00, '035503', '035592', null),
  ('036111', '240825-116', 'CORTADORA MANUAL HUSQVARNA', '2026-09-15 12:00-03', 3029.00, '036315', '036364', null),
  ('034649', '22058-086', 'COMPACTADOR DE SOLO WOLKAN', '2026-08-25 12:00-03', 218.00, '036798', '034649', 'MANUTENÇÃO NO LOCAL'),
  ('035450', '230515-168', 'GRUPO GERADOR 3,5KVA', '2026-09-04 12:00-03', 315.00, '037228', '035994', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 16 - BM MANUTENÇÃO - LESTE - SÃO GONÇALO - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'LESTE - BOA VISTA - SÃO GONÇALO', '16', 'SETEMBRO/2026', 'Sr. Wendel', null, 'ROD. DOV. MARIO COVAS, 101 KM 312, BOA VISTA - SÃO GONÇALO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - BOA VISTA - SÃO GONÇALO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - BOA VISTA - SÃO GONÇALO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 16 - BM MANUTENÇÃO - LESTE - SÃO GONÇALO - SETEMBRO.xlsx', u.id
  from u, (values
  ('036279', '15122-037', 'CORTADORA MANUAL HUSQVARNA', '2026-09-16 12:00-03', 370.00, '036432', '036604', null),
  ('037066', '240125-424', 'CORTADORA MANUAL HUSQVARNA', '2026-09-25 12:00-03', 2624.00, '036984', '037175', null),
  ('036743', '230625-066', 'CORTADORA MANUAL HUSQVARNA', '2026-09-24 12:00-03', 2624.00, '036985', '037018', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 07 - BM MANUTENÇÃO -  NORTE VILA KOSMOS - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - VILA KOSMOS', '07', 'SETEMBRO/2026', 'Srº Danilo', null, 'RUA ALECRIM, 1085 - VILA KOSMO RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - VILA KOSMOS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - VILA KOSMOS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 07 - BM MANUTENÇÃO -  NORTE VILA KOSMOS - SETEMBRO.xlsx', u.id
  from u, (values
  ('035891', '251125-411', 'CORTADORA MANUAL HUSQVARNA', '2026-09-10 12:00-03', 2624.00, '036064', '036148', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM MANUTENÇÃO - NORTE ILHA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - ILHA', '15', 'SETEMBRO/2026', 'SR° MAURO', null, 'RUA DOMINGUES MONDIN, 315 - TAUÁ - ILHA DO GOVERNADOR RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - ILHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - ILHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 15 - BM MANUTENÇÃO - NORTE ILHA - SETEMBRO.xlsx', u.id
  from u, (values
  ('035177', '220315-076', 'GRUPO GERADOR 3,5KVA', '2026-08-27 12:00-03', 463.00, '035211', '035322', null),
  ('035569', '220315-077', 'GRUPO GERADOR 3,5KVA', '2026-09-04 12:00-03', 148.00, '035711', '035913', null),
  ('1470-10', '25025-321', 'BOMBA DE MANGOTE 3"', '2026-09-21 12:00-03', 156.00, '035981', '1470-10', null),
  ('034845', '22044-290', 'MOTOVIBRADOR GASOLINA', '2026-08-27 12:00-03', 102.00, '036835', '034845', 'MANUTENÇÃO NO LOCAL'),
  ('034982', '250115-601', 'GRUPO GERADOR 3,5KVA', '2026-08-27 12:00-03', 148.00, '036862', '034982', 'MANUTENÇÃO NO LOCAL'),
  ('035460', '220315-074', 'GRUPO GERADOR 3,5KVA', '2026-09-01 12:00-03', 148.00, '037135', '035460', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM MANUTENÇÃO - NORTE MEIER - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - MEIER', '15', 'SETEMBRO/2026', 'Sraº Érica', null, 'RUA JOSÉ BONIFÁCIO, 528 - MEIER RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - MEIER' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - MEIER' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 15 - BM MANUTENÇÃO - NORTE MEIER - SETEMBRO.xlsx', u.id
  from u, (values
  ('035444', '23108-129', 'COMPACTADOR DE SOLO NORTON', '2026-09-01 12:00-03', 300.00, '036403', '036493', null),
  ('034485', '240115-330', 'GRUPO GERADOR 3,5 KVA', '2026-08-19 12:00-03', 394.00, '036718', '034485', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM MANUTENÇÃO - NORTE PENHA - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'NORTE - PENHA', '15', 'SETEMBRO/2026', 'Sraº Amanda Tenório', null, 'RUA CUBA, 01 - PENHA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'NORTE - PENHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'NORTE - PENHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 15 - BM MANUTENÇÃO - NORTE PENHA - SETEMBRO.xlsx', u.id
  from u, (values
  ('1244-01', '240115-335', 'GRUPO GERADOR 3,5KVA', '2026-09-04 12:00-03', 2386.00, '032434', '1244-01', 'COMPROVANTE DE SUBSTITUIÇÃO.'),
  ('034342', '24014-326', 'MOTOVIBRADOR GASOLINA', '2026-08-18 12:00-03', 170.00, '036680', '034342', 'MANUTENÇÃO NO LOCAL'),
  ('035249', '260325-474', 'CORTADORA MANUAL HUSQVARNA', '2026-08-28 12:00-03', 2624.00, '035340', '035445', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 16 - BM MANUTENÇÃO - NORTE CAMINHO - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'NORTE - CAMPINHO', '16', 'SETEMBRO/2026', 'Srº Jonathan Araujo', null, 'ESTRADA INTENDENTE MAGALHÃES, 504 - RIO DE JANEIRO RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'NORTE - CAMPINHO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'NORTE - CAMPINHO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 16 - BM MANUTENÇÃO - NORTE CAMINHO - SETEMBRO.xlsx', u.id
  from u, (values
  ('035378', '240925-177', 'CORTADORA MANUAL HUSQVARNA', '2026-08-31 12:00-03', 2624.00, '035436', '035462', null),
  ('036285', '24014-251', 'MOTOVIBRADOR GASOLINA', '2026-09-17 12:00-03', 288.00, '036531', '036612', null),
  ('035136', '240115-397', 'GRUPO GERADOR 3,5KVA', '2026-08-31 12:00-03', 296.00, '036907', '035136', 'MANUTENÇÃO NO LOCAL'),
  ('035139', '24014-243', 'MOTOVIBRADOR GASOLINA', '2026-08-31 12:00-03', 108.00, '036909', '035139', 'MANUTENÇÃO NO LOCAL'),
  ('035140', '24014-258', 'MOTOVIBRADOR GASOLINA', '2026-08-31 12:00-03', 218.00, '036911', '035140', 'MANUTENÇÃO NO LOCAL'),
  ('035376', '24014-242', 'MOTOVIBRADOR GASOLINA', '2026-08-31 12:00-03', 285.00, '037013', '035376', 'MANUTENÇÃO NO LOCAL'),
  ('035377', '240115-399', 'GRUPO GERADOR 3,5KVA', '2026-08-31 12:00-03', 148.00, '037017', '035377', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM MANUTENÇÃO - BASE SUL - BOTAFOGO - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'SUL - BOTAFOGO', '15', 'SETEMBRO/2026', 'Sraº Barbara Goes', null, 'AVENIDA REPORTER NESTOR MOREIRA, 76 - BOTAFOGO RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - BOTAFOGO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - BOTAFOGO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 15 - BM MANUTENÇÃO - BASE SUL - BOTAFOGO - SETEMBRO.xlsx', u.id
  from u, (values
  ('034451', '240915-465', 'GRUPO GERADOR 3,5 KVA', '2026-08-19 12:00-03', 625.00, '034550', '034652', null),
  ('2421-01', '240925-181', 'CORTADORA MANUAL HUSQVARNA', '2026-08-25 12:00-03', 2624.00, '033958', '2421-01', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('034279', '240715-442', 'GRUPO GERADOR 3,5 KVA', '2026-08-18 12:00-03', 368.00, '036480', '034279', 'MANUTENÇÃO NO LOCAL'),
  ('036249', '240915-466', 'GRUPO GERADOR 3,5 KVA', '2026-09-15 12:00-03', 220.00, '036331', '036371', null),
  ('036024', '19074-658', 'MOTOVIBRADOR GASOLINA', '2026-09-10 12:00-03', 214.00, '036074', '036090', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 16 - BM MANUTENÇÃO - BASE SUL - ROCHA 1 - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'SUL - ROCHA', '16', 'SETEMBRO/2026', 'Sraº Barbara Goes', null, 'RUA FREI, 93 - ROCHA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - ROCHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - ROCHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 16 - BM MANUTENÇÃO - BASE SUL - ROCHA 1 - SETEMBRO.xlsx', u.id
  from u, (values
  ('1505-17', '18095-289', 'BOMBA DE MANGOTE 3"', '2026-08-25 12:00-03', 240.00, '034818', '1505-17', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('034505', '230215-128', 'BOMBA DE MANGOTE 3"', '2026-08-20 12:00-03', 776.00, '034680', '034888', null),
  ('034553', '19024-540', 'MOTOVIBRADOR A GASOLINA', '2026-08-20 12:00-03', 298.00, '034684', '034953', null),
  ('2255-03', '24115-807', 'BOMBA DE MANGOTE 3"', '2026-08-27 12:00-03', 240.00, '034823', '2255-03', null),
  ('034987', '22044-160', 'MOTOVIBRADOR A GASOLINA', '2026-08-25 12:00-03', 320.00, '035020', '035152', null),
  ('035771', '24015-238', 'BOMBA DE MANGOTE 3"', '2026-09-04 12:00-03', 396.00, '035890', '036478', null),
  ('035765', '24085-756', 'BOMBA DE MANGOTE 3"', '2026-09-04 12:00-03', 240.00, '035897', '036350', null),
  ('036422', '25085-304', 'BOMBA DE MANGOTE 3"', '2026-09-16 12:00-03', 396.00, '036439', '036515', null),
  ('035477', '24094-836', 'MOTOVIBRADOR A GASOLINA', '2026-09-04 12:00-03', 218.00, '037139', '035477', 'MANUTENÇÃO NO LOCAL')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 16 - BM MANUTENÇÃO - BASE SUL - ROCHA 4 - SETEMBRO.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'SUL - ROCHA', '16', 'SETEMBRO/2026', 'Sraº Barbara Goes', null, 'RUA FREI, 93 - ROCHA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'SUL - ROCHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'SUL - ROCHA' and referencia = 'SETEMBRO/2026' and documento is not distinct from '16'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 9 - SETEMBRO / 16 - BM MANUTENÇÃO - BASE SUL - ROCHA 4 - SETEMBRO.xlsx', u.id
  from u, (values
  ('2853-02', '24115-800', 'BOMBA DE MANGOTE 3"', '2026-08-27 12:00-03', 240.00, '034822', '2853-02', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('2852-03', '241125-200', 'CORTADORA MANUAL HUSQVARNA', '2026-08-21 12:00-03', 2624.00, '033866', '2852-03', 'COMPROVANTE DE SUBSTITUIÇÃO'),
  ('034508', '240115-380', 'GRUPO GERADOR 3,5KVA', '2026-08-20 12:00-03', 148.00, '034681', '034950', null),
  ('034985', '240125-041', 'CORTADORA MANUAL HUSQVARNA', '2026-08-25 12:00-03', 2624.00, '035019', '035344', null),
  ('036156', '240115-385', 'GRUPO GERADOR 3,5KVA', '2026-09-14 12:00-03', 571.00, '036203', '035343', null),
  ('2852-04', '241125-210', 'CORTADORA MANUAL HUSQVARNA', '2026-08-27 12:00-03', 2624.00, '036817', '2852-04', 'COMPROVANTE DE SUBSTITUIÇÃO')
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado dos arquivos de setembro'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- As bases que aparecem pela primeira vez entram no cadastro (0010), com os
-- dados do boletim mais recente. Base que já está no cadastro fica como está.
insert into bases (cliente, nome, responsavel, email, telefone, local_obra, modelo, atualizado_por)
select distinct on (chave_do_nome(b.cliente), chave_do_nome(b.base))
       b.cliente, b.base, b.contato, b.email, b.telefone, b.local_obra, b.modelo, null
from boletins b
where b.referencia = 'SETEMBRO/2026' and b.base is not null and length(trim(b.base)) > 0
order by chave_do_nome(b.cliente), chave_do_nome(b.base), b.id desc
on conflict (chave_do_nome(cliente), chave_do_nome(nome)) do nothing;

-- Conferência: 41 boletins de SETEMBRO/2026 no padrão aguas, 145 OMs, 195.477,00.
select count(*) as boletins, sum(oms) as oms, sum(valor) as valor,
       count(*) filter (where situacao = 'fechado') as fechados
from boletins_atual
where referencia = 'SETEMBRO/2026' and modelo = 'aguas';

-- E a OM do arquivo que ficou de fora porque JÁ ESTAVA em outro boletim
-- (uma OM, um boletim). Vazio é o esperado; se aparecer, diga se ela sai do
-- boletim antigo e vem para o de setembro.
select v.om, b.numero, b.base, b.referencia, s.situacao
from (values
  ('1170-01'),
  ('036271'),
  ('035866'),
  ('034903'),
  ('033819'),
  ('036693'),
  ('033301'),
  ('1348-01'),
  ('1178-18'),
  ('034444'),
  ('035069'),
  ('034446'),
  ('035757'),
  ('035844'),
  ('035867'),
  ('035566'),
  ('033825'),
  ('034999'),
  ('035573'),
  ('1095-21'),
  ('036389'),
  ('034516'),
  ('035911'),
  ('036121'),
  ('034455'),
  ('034997'),
  ('036382'),
  ('036424'),
  ('035514'),
  ('035390'),
  ('2641-05'),
  ('036012'),
  ('035617'),
  ('036252'),
  ('035500'),
  ('035512'),
  ('036006'),
  ('033181'),
  ('033429'),
  ('035241'),
  ('035089'),
  ('035515'),
  ('034275'),
  ('2188-03'),
  ('1156-01'),
  ('1167-02'),
  ('034414'),
  ('1167-04'),
  ('2252-17'),
  ('034272'),
  ('034413'),
  ('035103'),
  ('034911'),
  ('034907'),
  ('034908'),
  ('034912'),
  ('035104'),
  ('035106'),
  ('035299'),
  ('035298'),
  ('035296'),
  ('036129'),
  ('2252-16'),
  ('034464'),
  ('2252-18'),
  ('035747'),
  ('036139'),
  ('1159-02'),
  ('1159-01'),
  ('035511'),
  ('035516'),
  ('2226-02'),
  ('2159-08'),
  ('034481'),
  ('034878'),
  ('1532-01'),
  ('035260'),
  ('034619'),
  ('035492'),
  ('1264-01'),
  ('035038'),
  ('036370'),
  ('036374'),
  ('035935'),
  ('036086'),
  ('035465'),
  ('034715'),
  ('035039'),
  ('035430'),
  ('035959'),
  ('034958'),
  ('1192-30'),
  ('034855'),
  ('014810'),
  ('014809'),
  ('1153-03'),
  ('035878'),
  ('034691'),
  ('2118-08'),
  ('035424'),
  ('036111'),
  ('034649'),
  ('035450'),
  ('036279'),
  ('037066'),
  ('036743'),
  ('035891'),
  ('035177'),
  ('035569'),
  ('1470-10'),
  ('034845'),
  ('034982'),
  ('035460'),
  ('035444'),
  ('034485'),
  ('1244-01'),
  ('034342'),
  ('035249'),
  ('035378'),
  ('036285'),
  ('035136'),
  ('035139'),
  ('035140'),
  ('035376'),
  ('035377'),
  ('034451'),
  ('2421-01'),
  ('034279'),
  ('036249'),
  ('036024'),
  ('1505-17'),
  ('034505'),
  ('034553'),
  ('2255-03'),
  ('034987'),
  ('035771'),
  ('035765'),
  ('036422'),
  ('035477'),
  ('2853-02'),
  ('2852-03'),
  ('034508'),
  ('034985'),
  ('036156'),
  ('2852-04')
) v(om)
join boletim_oms i on i.om = v.om
join boletins b on b.id = i.boletim_id
join boletim_situacao s on s.boletim_id = b.id
where not (b.referencia = 'SETEMBRO/2026' and b.modelo = 'aguas');
