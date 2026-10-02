-- =====================================================================
-- Os boletins de manutenção de AGOSTO/2026 do Águas do Rio / AEGEA
-- (41 boletins, 167 OMs, R$ 227.975,00 — lidos dos arquivos padronizados)
-- Rode no SQL Editor. Pode rodar duas vezes: boletim que já existe (mesmo
-- cliente, base, mês e documento) não é criado de novo, e OM que já está em
-- algum boletim fica onde está (uma OM, um boletim).
--
-- Entram no papel padrão 2026 do Águas do Rio, FECHADOS na data de emissão
-- (02/09/2026) — já foram emitidos. Enviar e faturar se marca na tela.
-- Autor: matheus@novaopcaoequipamentos.com.br (criado_por, incluido_por e quem fechou).
--
-- Conferências feitas nos arquivos:
--   · VCG São Gonçalo (Setorizada Leste Bloco 1): 18 OMs, R$ 38.904,00 — a
--     planilha tem linhas inseridas, e o leitor vai até a linha do TOTAL. (A
--     primeira versão deste script lia só 16 linhas; quem já rodou completa
--     com supabase/scripts/corrigir-agosto-setorizada-leste.sql.)
--   · Base Sul Botafogo: emissão 02/08/2026 no arquivo; entrou 02/09/2026, como
--     os outros 40.
--   · As datas digitadas como texto (Norte Ilha Tauá e Campinho) foram lidas.
--   · Recibo "--------" entrou vazio.
--
-- Um comando por boletim: se a colagem cortar, o que chegou inteiro entrou, e
-- rodar de novo completa o resto.
-- =====================================================================

set search_path = medicoes, public;

-- 03 - BM Manutenção - Águas do Rio - Baixada I - Piam Belford Roxo Operação - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'BELFORD ROXO BAIXADA I - OPERAÇÃO', '03', 'AGOSTO/2026', 'Sra° Larissa Costa', null, 'AVENIDA RETIRO DA IMPRENSA, 76 - PIAM BELFORD-ROXO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'BELFORD ROXO BAIXADA I - OPERAÇÃO' and referencia = 'AGOSTO/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'BELFORD ROXO BAIXADA I - OPERAÇÃO' and referencia = 'AGOSTO/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 03 - BM Manutenção - Águas do Rio - Baixada I - Piam Belford Roxo Operação - Agosto 2026.xlsx', u.id
  from u, (values
  ('034060', '23128-078', 'COMPACTADOR DE SOLO WOLKAN', '2026-08-13 12:00-03', 1902.00, '033732', '034609', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 06 - BM Manutenção - Águas do Rio - Baixada I - Piam Belford Roxo Serviços - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'BELFORD ROXO BAIXADA I - SERVIÇOS', '06', 'AGOSTO/2026', 'Sra° Larissa Costa', null, 'AVENIDA RETIRO DA IMPRENSA, 76 - PIAM BELFORD-ROXO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'BELFORD ROXO BAIXADA I - SERVIÇOS' and referencia = 'AGOSTO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'BELFORD ROXO BAIXADA I - SERVIÇOS' and referencia = 'AGOSTO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 06 - BM Manutenção - Águas do Rio - Baixada I - Piam Belford Roxo Serviços - Agosto 2026.xlsx', u.id
  from u, (values
  ('033090', '250115-259', 'GRUPO GERADOR 3,5KVA', '2026-07-31 12:00-03', 477.00, '032958', '033192', null),
  ('033219', '250115-522', 'GRUPO GERADOR 3,5KVA', '2026-07-07 12:00-03', 148.00, '031180', '031180 ML', null),
  ('034931', '19064-650', 'MOTOVIBRADOR GASOLINA', '2026-07-22 12:00-03', 512.00, '032206', '032206 ML', null),
  ('035072', '250115-522', 'GRUPO GERADOR 3,5KVA', '2026-07-31 12:00-03', 394.00, '032959', '032959 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 07 - BM Manutenção - Águas do Rio - Baixada I - Duque de Caxias Serviço - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - SERVIÇO', '07', 'AGOSTO/2026', 'Sraº Larissa Costa', null, 'AV. DOUTOR MANUEL TELES, 237 - CENTRO, DUQUE DE CAXIAS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - SERVIÇO' and referencia = 'AGOSTO/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - SERVIÇO' and referencia = 'AGOSTO/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 07 - BM Manutenção - Águas do Rio - Baixada I - Duque de Caxias Serviço - Agosto 2026.xlsx', u.id
  from u, (values
  ('032624', '250225-233', 'CORTADORA MANUAL HUSQVARNA', '2026-07-27 12:00-03', 2903.00, '032499', '033498', null),
  ('033647', '231215-250', 'GRUPO GERADOR 3,5KVA', '2026-07-10 12:00-03', 216.00, '031429', '031429 ML', null),
  ('035279', '250115-471', 'GRUPO GERADOR 3,5KVA', '2026-08-13 12:00-03', 148.00, '033734', '033734 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 08 - BM Manutenção - Águas do Rio - Baixada I - Jardim Primavera Serviços - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'BAIXADA I - SERVIÇOS', '08', 'AGOSTO/2026', 'Sraº Larissa Costa', null, 'ALMEDA CALHEIROS DA GRAÇA, 221 JARDIM PRIMAVERA - DUQUE DE CAXIAS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'BAIXADA I - SERVIÇOS' and referencia = 'AGOSTO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'BAIXADA I - SERVIÇOS' and referencia = 'AGOSTO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 08 - BM Manutenção - Águas do Rio - Baixada I - Jardim Primavera Serviços - Agosto 2026.xlsx', u.id
  from u, (values
  ('033955', '22058-082', 'COMPACTADOR DE SOLO WOLKAN', '2026-08-12 12:00-03', 1956.00, '033894', '034424', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 08 - BM Manutenção - Águas do Rio - Baixada I - São João de Meriti Operação - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - OPERAÇÃO', '08', 'AGOSTO/2026', 'Sraº Larissa Costa', null, 'AV. EUCLIDES DA CUNHA, 470 - JARDIM ALEGRIA, SÃO JOÃO DE MERETI', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'AGOSTO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'AGOSTO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 08 - BM Manutenção - Águas do Rio - Baixada I - São João de Meriti Operação - Agosto 2026.xlsx', u.id
  from u, (values
  ('032895', '24095-066', 'BOMBA DE MANGOTE 3"', '2026-07-29 12:00-03', 396.00, '1197-05', '1197-05 T', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 08 - BM Manutenção - Águas do Rio - Baixada I CAV - Duque de Caxias - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - CAV', '08', 'AGOSTO/2026', 'Sraº Larissa Costa', null, 'AV. DOUTOR MANUEL TELES, 237 - CENTRO, DUQUE DE CAXIAS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - CAV' and referencia = 'AGOSTO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - CAV' and referencia = 'AGOSTO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 08 - BM Manutenção - Águas do Rio - Baixada I CAV - Duque de Caxias - Agosto 2026.xlsx', u.id
  from u, (values
  ('033872', '23085-072', 'BOMBA DE MANGOTE 3"', '2026-07-03 12:00-03', 156.00, '1180-08', '1180-08 T', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 09 - BM Manutenção - Águas do Rio - Baixada I - Duque de Caxias Operação - Agosto 2026 (1).xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - OPERAÇÃO', '09', 'AGOSTO/2026', 'Sraº Larissa Costa', null, 'AV. DOUTOR MANUEL TELES, 237 - CENTRO, DUQUE DE CAXIAS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'AGOSTO/2026' and documento is not distinct from '09')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'AEGEA - BAIXADA I - OPERAÇÃO' and referencia = 'AGOSTO/2026' and documento is not distinct from '09'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 09 - BM Manutenção - Águas do Rio - Baixada I - Duque de Caxias Operação - Agosto 2026 (1).xlsx', u.id
  from u, (values
  ('031546', '200615-002', 'GRUPO GERADOR 3,5KVA', '2026-07-10 12:00-03', 919.00, '031425', '031639', null),
  ('033579', '25012-188', 'CORTADORA PISO HUSQVARNA', '2026-08-06 12:00-03', 1130.00, '033342', '034017', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 01 - BM Manutenção - Águas do Rio - Baixada 2 Queimados Setor Operacional - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - QUEIMADOS - SETOR OPERACIONAL', '01', 'AGOSTO/2026', 'Sra. Fabiane', null, 'ESTRADA CARLOS SAMPAIO, 176 - QUEIMADOS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - QUEIMADOS - SETOR OPERACIONAL' and referencia = 'AGOSTO/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - QUEIMADOS - SETOR OPERACIONAL' and referencia = 'AGOSTO/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 01 - BM Manutenção - Águas do Rio - Baixada 2 Queimados Setor Operacional - Agosto 2026.xlsx', u.id
  from u, (values
  ('032044', '22052-083', 'CORTADORA PISO WOLKAN', '2026-07-17 12:00-03', 478.00, '031714', '032259', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 13 - BM Manutenção - Águas do Rio - Baixada 2 Califórnia Nova Iguaçu - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - CALIFÓRNIA, NOVA IGUAÇU', '13', 'AGOSTO/2026', 'Sra. Fabiane', null, 'RUA OSCAR SOARES,1362 - CALIFÓRNIA, NOVA IGUAÇU', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - CALIFÓRNIA, NOVA IGUAÇU' and referencia = 'AGOSTO/2026' and documento is not distinct from '13')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - CALIFÓRNIA, NOVA IGUAÇU' and referencia = 'AGOSTO/2026' and documento is not distinct from '13'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 13 - BM Manutenção - Águas do Rio - Baixada 2 Califórnia Nova Iguaçu - Agosto 2026.xlsx', u.id
  from u, (values
  ('035175', '24014-012', 'MOTOVIBRADOR GASOLINA', '2026-08-04 12:00-03', 108.00, '033159', '033159 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM Manutenção - Águas do Rio - Baixada 2 Califórnia D-17 - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - CALIFÓRNIA D-17', '14', 'AGOSTO/2026', 'Sra. Fabiane', null, 'RUA OSCAR SOARES,1362 - CALIFÓRNIA, NOVA IGUAÇU', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - CALIFÓRNIA D-17' and referencia = 'AGOSTO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - CALIFÓRNIA D-17' and referencia = 'AGOSTO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 14 - BM Manutenção - Águas do Rio - Baixada 2 Califórnia D-17 - Agosto 2026.xlsx', u.id
  from u, (values
  ('031454', '24012-123', 'CORTADORA PISO NORTON', '2026-07-09 12:00-03', 477.00, '031261', '031890', null),
  ('032786', '25025-578', 'BOMBA DE MANGOTE 3"', '2026-07-28 12:00-03', 396.00, '032786', '032844', null),
  ('032807', '24018-148', 'COMPACTADOR DE SOLO WOLKAN', '2026-07-28 12:00-03', 742.00, '032565', '033036', null),
  ('034968', '251115-718', 'GRUPO GERADOR 3,5KVA', '2026-07-28 12:00-03', 148.00, '032620', '032620 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM Manutenção - Águas do Rio - Baixada 2 Olinda Nilópolis - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - OLINDA / NILÓPOLIS D-18', '15', 'AGOSTO/2026', 'Sra. Fabiane', null, 'RUA VEREADOR FRANCISCO NUNES, 1000', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - OLINDA / NILÓPOLIS D-18' and referencia = 'AGOSTO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BAIXADA II - OLINDA / NILÓPOLIS D-18' and referencia = 'AGOSTO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 15 - BM Manutenção - Águas do Rio - Baixada 2 Olinda Nilópolis - Agosto 2026.xlsx', u.id
  from u, (values
  ('033666', '240115-298', 'GRUPO GERADOR 3,5KVA', '2026-08-07 12:00-03', 703.00, '033242', '033763', null),
  ('033668', '24011-302', 'GRUPO GERADOR 3,5KVA', '2026-08-07 12:00-03', 148.00, '033595', '033721', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 01 - BM Manutenção - Águas do Rio - VCG Nova Iguaçu Baixada 2 Bloco 4 - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4', '01', 'AGOSTO/2026', 'Sraº Thaynã', null, 'RUA OSCAR SOARES, 1362 - NOA IGUAÇU - RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 01 - BM Manutenção - Águas do Rio - VCG Nova Iguaçu Baixada 2 Bloco 4 - Agosto 2026.xlsx', u.id
  from u, (values
  ('032731', '251125-431', 'CORTADORA MANUAL HUSQVARNA', '2026-07-23 12:00-03', 2624.00, '032344', '033923', null),
  ('032424', '251125-079', 'CORTADORA MANUAL HUSQVARNA', '2026-07-23 12:00-03', 2624.00, '032366', '033194', null),
  ('034474', '14048-057', 'COMPACTADOR DE SOLO PRETOTEC', '2026-08-19 12:00-03', 1900.00, null, null, null),
  ('034476', '21048-030', 'COMPACTADOR DE SOLO PRETOTEC', '2026-08-19 12:00-03', 1900.00, null, null, null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 02 - BM Manutenção - Águas do Rio - Duque de Caxias CAV - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'DUQUE DE CAXIAS - CAV', '02', 'AGOSTO/2026', 'SRA. THAYNÃ', null, 'AVENIDA DOUTOR MANUEL TELES, 237 - DUQUE DE CAXIAS', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'DUQUE DE CAXIAS - CAV' and referencia = 'AGOSTO/2026' and documento is not distinct from '02')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'DUQUE DE CAXIAS - CAV' and referencia = 'AGOSTO/2026' and documento is not distinct from '02'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 02 - BM Manutenção - Águas do Rio - Duque de Caxias CAV - Agosto 2026.xlsx', u.id
  from u, (values
  ('032397', '230625-006', 'CORTADORA MANUAL HUSQVARNA', '2026-07-09 12:00-03', 5216.00, '1070-04', '1070-04 t', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 02 - BM Manutenção - Águas do Rio - Fiscalização Baixada 1 VCG - Jardim América - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'FISCALIZAÇÃO - BAIXADA I - BLOCO 4 - VCG', '02', 'AGOSTO/2026', 'Sraº Thaynã', null, 'RODOVIA PRESIDENTE DUTRA, 478 - JARDIM AMÉRICA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'FISCALIZAÇÃO - BAIXADA I - BLOCO 4 - VCG' and referencia = 'AGOSTO/2026' and documento is not distinct from '02')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'FISCALIZAÇÃO - BAIXADA I - BLOCO 4 - VCG' and referencia = 'AGOSTO/2026' and documento is not distinct from '02'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 02 - BM Manutenção - Águas do Rio - Fiscalização Baixada 1 VCG - Jardim América - Agosto 2026.xlsx', u.id
  from u, (values
  ('033085', '250225-298', 'CORTADORA MANUAL HUSQVARNA', '2026-07-31 12:00-03', 2624.00, '033011', '033756', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 02 - BM Manutenção - Águas do Rio - Penha CAV - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PENHA - CAV NORTE', '02', 'AGOSTO/2026', 'SRA. THAYNA', null, 'RUA CUBA, 1 - PENHA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PENHA - CAV NORTE' and referencia = 'AGOSTO/2026' and documento is not distinct from '02')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'PENHA - CAV NORTE' and referencia = 'AGOSTO/2026' and documento is not distinct from '02'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 02 - BM Manutenção - Águas do Rio - Penha CAV - Agosto 2026.xlsx', u.id
  from u, (values
  ('032440', '230625-017', 'CORTADORA MANUAL HUSQVARNA', '2026-07-23 12:00-03', 2624.00, '032360', '033754', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 03 - BM Manutenção - Águas do Rio - Setorizada Comunidades Bloco 4 VCG - Engenho de Dentro - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA RIO DE JANEIRO - COMUNIDADES BLOCO 4 - VCG', '03', 'AGOSTO/2026', 'Sraº Thaynã', null, 'RUA MÁRIO CALDERARO, 485 - ENGENHO DE DENTRO - RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA RIO DE JANEIRO - COMUNIDADES BLOCO 4 - VCG' and referencia = 'AGOSTO/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA RIO DE JANEIRO - COMUNIDADES BLOCO 4 - VCG' and referencia = 'AGOSTO/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 03 - BM Manutenção - Águas do Rio - Setorizada Comunidades Bloco 4 VCG - Engenho de Dentro - Agosto 2026.xlsx', u.id
  from u, (values
  ('032249', '200715-008', 'GRUPO GERADOR 3,5 KVA', '2026-07-21 12:00-03', 905.00, '031865', '032348', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 03 - BM Manutenção - Águas do Rio - VCG Baixada 2 Bloco 4 - Belford Roxo - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4', '03', 'AGOSTO/2026', 'Sraº Thaynã', null, 'AVENIDA JORGE JÚLIO DA COSTA DOS SANTOS, 406 - BELFORD - ROXO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 03 - BM Manutenção - Águas do Rio - VCG Baixada 2 Bloco 4 - Belford Roxo - Agosto 2026.xlsx', u.id
  from u, (values
  ('032051', '240825-149', 'CORTADORA MANUAL HUSQVARNA', '2026-07-17 12:00-03', 2624.00, '031979', '032120', null),
  ('032053', '240125-057', 'CORTADORA MANUAL HUSQVARNA', '2026-07-17 12:00-03', 2734.00, '031982', '032187', null),
  ('032823', '240125-057', 'CORTADORA MANUAL HUSQVARNA', '2026-07-28 12:00-03', 2624.00, '032747', '034002', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 04 - BM Manutenção - Águas do Rio - VCG Baixada 1 Bloco 4 Setorizada - Belford Roxo - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - BAIXADA I - BELFORD ROXO - BLOCO 4 - VCG', '04', 'AGOSTO/2026', 'Sraº Thaynã 1', null, 'AV. RODOVIA PRESIDENTE DUTRA, 670 JARDIM AMÉRICA', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - BAIXADA I - BELFORD ROXO - BLOCO 4 - VCG' and referencia = 'AGOSTO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - BAIXADA I - BELFORD ROXO - BLOCO 4 - VCG' and referencia = 'AGOSTO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 04 - BM Manutenção - Águas do Rio - VCG Baixada 1 Bloco 4 Setorizada - Belford Roxo - Agosto 2026.xlsx', u.id
  from u, (values
  ('033236', '250114-703', 'MARTELO ROMPEDOR 30KG', '2026-08-04 12:00-03', 428.00, '033216', '033650', null),
  ('032967', '250225-297', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2624.00, '032967', '033034', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 04 - BM Manutenção - Águas do Rio - VCG Comunidades Bloco 4 - Jardim América - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4', '04', 'AGOSTO/2026', 'Sr° Gabriel Gama', null, 'RODOVIA PRESIDENTE DUTRA, 478 - JARDIM AMÉRICA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 04 - BM Manutenção - Águas do Rio - VCG Comunidades Bloco 4 - Jardim América - Agosto 2026.xlsx', u.id
  from u, (values
  ('031391', '250225-292', 'CORTADORA MANUAL HUSQVARNA', '2026-07-09 12:00-03', 2624.00, '031366', '031584', null),
  ('032160', '250225-318', 'CORTADORA MANUAL HUSQVARNA', '2026-07-20 12:00-03', 2624.00, '032126', '033057', null),
  ('032163', '250225-319', 'CORTADORA MANUAL HUSQVARNA', '2026-07-20 12:00-03', 2624.00, '032127', '033330', null),
  ('032164', '25022-282', 'CORTADORA MANUAL HUSQVARNA', '2026-07-20 12:00-03', 2624.00, '032128', '033334', null),
  ('032314', '250225-292', 'CORTADORA MANUAL HUSQVARNA', '2026-07-22 12:00-03', 2624.00, '032299', '033332', null),
  ('032517', '250225-334', 'CORTADORA MANUAL HUSQVARNA', '2026-07-24 12:00-03', 2624.00, '032445', '033501', null),
  ('032521', '250225-315', 'CORTADORA MANUAL HUSQVARNA', '2026-07-24 12:00-03', 1072.00, '032282', '033500', null),
  ('032800', '250225-308', 'CORTADORA MANUAL HUSQVARNA', '2026-07-28 12:00-03', 2624.00, '032647', '033998', null),
  ('032803', '250225-322', 'CORTADORA MANUAL HUSQVARNA', '2026-07-28 12:00-03', 2624.00, '032633', '034208', null),
  ('032993', '250225-287', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2712.00, '032027', '034205', null),
  ('033000', '250225-321', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2624.00, '032923', '034207', null),
  ('033086', '250225-305', 'CORTADORA MANUAL HUSQVARNA', '2026-07-31 12:00-03', 2624.00, '033012', '034239', null),
  ('033087', '250225-302', 'CORTADORA MANUAL HUSQVARNA', '2026-07-31 12:00-03', 2624.00, '033013', '034318', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 04 - BM Manutenção - Águas do Rio - VCG Rio Bonito - Lagos - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - RIO BONITO - LAGOS - BLOCO 1', '04', 'AGOSTO/2026', 'Sr° Gabriel Gama', null, 'RUA NILO PEÇANHA, 130', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO BONITO - LAGOS - BLOCO 1' and referencia = 'AGOSTO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO BONITO - LAGOS - BLOCO 1' and referencia = 'AGOSTO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 04 - BM Manutenção - Águas do Rio - VCG Rio Bonito - Lagos - Agosto 2026.xlsx', u.id
  from u, (values
  ('032513', '240125-034', 'CORTADORA MANUAL HUSQVARNA', '2026-07-24 12:00-03', 2624.00, '032470', '033504', null),
  ('035240', '230815-219', 'GRUPO GERADOR 3,5 KVA', '2026-08-06 12:00-03', 394.00, '033492', '033492 ML', null),
  ('035282', '251215-303', 'GRUPO GERADOR 3,5 KVA', '2026-08-14 12:00-03', 542.00, '034105', '034105 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 05 - BM Manutenção - Águas do Rio - CAV - São Gonçalo - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'SÃO GONÇALO - CAV', '05', 'AGOSTO/2026', 'Srº Alvaro', null, 'ROD. GOV. MARIO COVAS, 101 KM 312 - SÃO GONÇALO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SÃO GONÇALO - CAV' and referencia = 'AGOSTO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SÃO GONÇALO - CAV' and referencia = 'AGOSTO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 05 - BM Manutenção - Águas do Rio - CAV - São Gonçalo - Agosto 2026.xlsx', u.id
  from u, (values
  ('031745', '230625-011', 'CORTADORA MANUAL HUSQVARNA', '2026-07-14 12:00-03', 3025.00, '031603', '032365', null),
  ('031537', '25115-067', 'BOMBA DE MANGOTE 3"', '2026-07-10 12:00-03', 1424.00, '031469', '031641', null),
  ('033092', '230625-014', 'CORTADORA MANUAL HUSQVARNA', '2026-07-31 12:00-03', 2712.00, '033022', '034325', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 08 - BM Manutenção - Águas do Rio - Setorizada Leste Bloco 1 - VCG São Gonçalo - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - LESTE - BLOCO 1 - VCG', '08', 'AGOSTO/2026', 'Sra° Thaynã', null, 'RODOVIA GOVERNADOR MARIO COVAS, 101 - KM 312', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - LESTE - BLOCO 1 - VCG' and referencia = 'AGOSTO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'SETORIZADA - LESTE - BLOCO 1 - VCG' and referencia = 'AGOSTO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 08 - BM Manutenção - Águas do Rio - Setorizada Leste Bloco 1 - VCG São Gonçalo - Agosto 2026.xlsx', u.id
  from u, (values
  ('031744', '250225-401', 'CORTADORA MANUAL HUSQVARNA', '2026-07-14 12:00-03', 2624.00, '031653', '031905', null),
  ('031966', '250225-225', 'CORTADORA MANUAL HUSQVARNA', '2026-07-22 12:00-03', 88.00, '1232-04', '1232-04 T', null),
  ('032324', '240825-004', 'CORTADORA MANUAL HUSQVARNA', '2026-07-22 12:00-03', 587.00, '2252-08', '2252-08 T', null),
  ('032325', '250225-274', 'CORTADORA MANUAL HUSQVARNA', '2026-07-22 12:00-03', 2624.00, '032156', '032412', null),
  ('032399', '231125-028', 'CORTADORA MANUAL HUSQVARNA', '2026-07-24 12:00-03', 2624.00, '2252-15', '2252-15', null),
  ('032625', '240125-072', 'CORTADORA MANUAL HUSQVARNA', '2026-07-27 12:00-03', 2624.00, '032562', '033495', null),
  ('032626', '250225-348', 'CORTADORA MANUAL HUSQVARNA', '2026-07-27 12:00-03', 2624.00, '032566', '033652', null),
  ('033560', '240825-110', 'CORTADORA MANUAL HUSQVARNA', '2026-07-27 12:00-03', 525.00, '032571', '033560', null),
  ('032631', '250225-399', 'CORTADORA MANUAL HUSQVARNA', '2026-07-27 12:00-03', 2734.00, '032576', '033651', null),
  ('032634', '241125-195', 'CORTADORA MANUAL HUSQVARNA', '2026-07-27 12:00-03', 5216.00, '032585', '033871', null),
  ('032986', '241125-219', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2624.00, '032906', '034202', null),
  ('033005', '241125-202', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2624.00, '032887', '034201', null),
  ('033006', '231125-029', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2624.00, '032888', '034189', null),
  ('033007', '250225-257', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2624.00, '032890', '034204', null),
  ('033008', '250225-401', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2624.00, '032898', '034218', null),
  ('033009', '250225-341', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 2654.00, '032902', '034209', null),
  ('033046', '25012-192', 'CORTADORA PISO HUSQVARNA', '2026-07-30 12:00-03', 712.00, '032933', '033066', null),
  ('033273', '250115-557', 'GRUPO GERADOR 3,5KVA', '2026-08-04 12:00-03', 148.00, '032744', '033326', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 10 - BM Manutenção - Águas do Rio - VCG Baixada 1 Belford Roxo Bloco 4 670 - Jardim América - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - BAIXADA I - BELFORD ROXO - BLOCO 4', '10', 'AGOSTO/2026', 'Sraº Thaynã', null, 'RODOVIA PRESIDENTE DUTRA, 670 - JARDIM AMÉRICA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - BAIXADA I - BELFORD ROXO - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '10')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - BAIXADA I - BELFORD ROXO - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '10'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 10 - BM Manutenção - Águas do Rio - VCG Baixada 1 Belford Roxo Bloco 4 670 - Jardim América - Agosto 2026.xlsx', u.id
  from u, (values
  ('030545', '250225-337', 'CORTADORA MANUAL HUSQVARNA', '2026-07-22 12:00-03', 2624.00, '032084', '033048', null),
  ('031564', '230515-125', 'GRUPO GERADOR 3,5KVA', '2026-07-13 12:00-03', 556.00, '031531', '031572', null),
  ('031896', '240125-064', 'CORTADORA MANUAL HUSQVARNA', '2026-07-16 12:00-03', 2624.00, '031891', '031974', null),
  ('031897', '250115-582', 'GRUPO GERADOR 3,5KVA', '2026-07-16 12:00-03', 265.00, '031893', '031973', null),
  ('032329', '24072-154', 'CORTADORA PISO NORTON', '2026-07-22 12:00-03', 1460.00, '032082', '032386', null),
  ('032331', '25112-173', 'CORTADORA PISO NORTON', '2026-07-22 12:00-03', 821.00, '032079', '032460', null),
  ('032712', '250225-300', 'CORTADORA MANUAL HUSQVARNA', '2026-07-28 12:00-03', 2624.00, '032710', '033058', null),
  ('032830', '240925-171', 'CORTADORA MANUAL HUSQVARNA', '2026-07-28 12:00-03', 2624.00, '032672', '034198', null),
  ('032834', '251125-323', 'CORTADORA MANUAL HUSQVARNA', '2026-07-28 12:00-03', 2885.00, '032670', '034236', null),
  ('032836', '260325-216', 'CORTADORA MANUAL HUSQVARNA', '2026-07-28 12:00-03', 2624.00, '032677', '033014', null),
  ('032905', '240125-073', 'CORTADORA MANUAL HUSQVARNA', '2026-07-29 12:00-03', 2624.00, '032858', '034190', null),
  ('033375', '251125-326', 'CORTADORA MANUAL HUSQVARNA', '2026-08-04 12:00-03', 2624.00, '033264', '034116', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 12 - BM Manutenção - Águas do Rio - VCG Comunidades Bloco 4 São Cristóvão Bloco 4 166 - Agosto 2026 (1).xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4', '12', 'AGOSTO/2026', 'Sraº Thaynã', null, 'CAMPO SÃO CRISTOVÃO, 166 - SÃO CRISTOVÃO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '12')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A' and base = 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4' and referencia = 'AGOSTO/2026' and documento is not distinct from '12'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 12 - BM Manutenção - Águas do Rio - VCG Comunidades Bloco 4 São Cristóvão Bloco 4 166 - Agosto 2026 (1).xlsx', u.id
  from u, (values
  ('032234', '250115-538', 'GRUPO GERADOR 3,5KVA', '2026-07-21 12:00-03', 310.00, '032208', '032359', null),
  ('035262', '250115-533', 'GRUPO GERADOR 3,5KVA', '2026-08-13 12:00-03', 148.00, '033661', '033661 ML', null),
  ('032640', '251125-271', 'CORTADORA MANUAL HUSQVARNA', '2026-07-20 12:00-03', 2624.00, '2159-07', '2159-07', null),
  ('032797', '250225-272', 'CORTADORA MANUAL HUSQVARNA', '2026-07-28 12:00-03', 2624.00, '032657', '033925', null),
  ('035053', '250115-517', 'CORTADORA MANUAL HUSQVARNA', '2026-07-30 12:00-03', 148.00, '032868', '032868 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 05 - BM Manutenção - Águas do Rio - Comunidades Engenho de Dentro Comercial - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A - COMERCIAL', 'COMUNIDADES - ENGENHO DE DENTRO - COMERCIAL', '05', 'AGOSTO/2026', 'Sraº Maisa', null, 'RUA MARIO CALDERADO, 485 - ENGENHO DE DENTRO, RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A - COMERCIAL' and base = 'COMUNIDADES - ENGENHO DE DENTRO - COMERCIAL' and referencia = 'AGOSTO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A - COMERCIAL' and base = 'COMUNIDADES - ENGENHO DE DENTRO - COMERCIAL' and referencia = 'AGOSTO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 05 - BM Manutenção - Águas do Rio - Comunidades Engenho de Dentro Comercial - Agosto 2026.xlsx', u.id
  from u, (values
  ('032245', '231125-027', 'CORTADORA MANUAL HUSQVARNA', '2026-07-21 12:00-03', 2924.00, '032038', '033138', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM Manutenção - Águas do Rio - Comunidades Maré - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - MARÉ', '14', 'AGOSTO/2026', 'Srº Diogenes e Sraº Talita', null, 'RUA TEXEIRA IBEIRO S/N, MARÉ RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - MARÉ' and referencia = 'AGOSTO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - MARÉ' and referencia = 'AGOSTO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 14 - BM Manutenção - Águas do Rio - Comunidades Maré - Agosto 2026.xlsx', u.id
  from u, (values
  ('031143', '240115-425', 'GRUPO GERADOR 3,5KVA', '2026-07-06 12:00-03', 442.00, '030819', '031481', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM Manutenção - Águas do Rio - Comunidades Engenho de Dentro - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - ENGENHO DE DENTRO', '15', 'AGOSTO/2026', 'Srº Lucas', null, 'RUA MARIO CALDERADO, 485 - ENGENHO DE DENTRO, RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - ENGENHO DE DENTRO' and referencia = 'AGOSTO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - ENGENHO DE DENTRO' and referencia = 'AGOSTO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 15 - BM Manutenção - Águas do Rio - Comunidades Engenho de Dentro - Agosto 2026.xlsx', u.id
  from u, (values
  ('029232', '230515-187', 'GRUPO GERADOR 3,5KVA', '2026-08-18 12:00-03', 148.00, '028766', '034235', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM Manutenção - Águas do Rio - Comunidades Penha - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - PENHA', '15', 'AGOSTO/2026', 'SR. LUCAS', null, 'RUA CUBA, 01 - PENHA, RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - PENHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'COMUNIDADES - PENHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 15 - BM Manutenção - Águas do Rio - Comunidades Penha - Agosto 2026.xlsx', u.id
  from u, (values
  ('031032', '240115-350', 'GRUPO GERADOR 3,5KVA', '2026-07-03 12:00-03', 771.00, '030792', '031059', null),
  ('032343', '25065-472', 'BOMBA DE MANGOTE 3"', '2026-07-20 12:00-03', 396.00, '1192-24', '1292-24 T', null),
  ('032530', '25025-822', 'BOMBA DE MANGOTE 3"', '2026-07-24 12:00-03', 396.00, '1241-13', '1241-13', null),
  ('032583', '24015-211', 'BOMBA DE MANGOTE 3"', '2026-07-23 12:00-03', 240.00, '1192-26', '1192-26 D', null),
  ('034069', '24014-123', 'MOTOVIBRADOR GASOLINA', '2026-08-13 12:00-03', 286.00, '033916', '034613', null),
  ('034143', '25095-502', 'BOMBA DE MANGOTE 3"', '2026-08-13 12:00-03', 140.00, '1192-29', '1192-29', null),
  ('034956', '24014-192', 'MOTOVIBRADOR GASOLINA', '2026-07-23 12:00-03', 278.00, '032375', '032375', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 01 - BM Manutenção - Águas do Rio - Grande Diâmetro - Vigário Geral Baixada 1 - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'GRANDE DIÂMETRO - ETE - VIGÁRIO GERAL', '01', 'AGOSTO/2026', 'Sra° Thayna', null, 'RUA BULHÕES DE MARCIAL, 1050 - VIGÁRIO GERAL - RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'GRANDE DIÂMETRO - ETE - VIGÁRIO GERAL' and referencia = 'AGOSTO/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'GRANDE DIÂMETRO - ETE - VIGÁRIO GERAL' and referencia = 'AGOSTO/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 01 - BM Manutenção - Águas do Rio - Grande Diâmetro - Vigário Geral Baixada 1 - Agosto 2026.xlsx', u.id
  from u, (values
  ('030972', '00588', 'CORTADORA MANUAL STHIL (TERCEIROS)', '2026-07-09 12:00-03', 2997.00, '030812', '033920', null),
  ('030974', '00585', 'CORTADORA MANUAL STHIL (TERCEIROS)', '2026-07-09 12:00-03', 2972.00, '030814', '033918', null),
  ('031858', '0063', 'CORTADORA MANUAL STHIL (TERCEIROS)', '2026-08-17 12:00-03', 2771.00, '031753', '035185', null),
  ('031953', '001', 'CORTADORA MANUAL STHIL (TERCEIROS)', '2026-08-17 12:00-03', 2771.00, '030814', '035186', null),
  ('031996', '002', 'CORTADORA MANUAL STHIL (TERCEIROS)', '2026-08-17 12:00-03', 2771.00, '031910', '035188', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 11 - BM Manutenção - Águas do Rio - Centro Sul - Botafogo - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'GRANDE DIÂMETRO - CENTRO SUL BOTAFOGO', '11', 'AGOSTO/2026', 'Sraº Thaynã', null, 'AV. REPORTER NESTOR MOREIRA, 40 - BOTAFOGO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'GRANDE DIÂMETRO - CENTRO SUL BOTAFOGO' and referencia = 'AGOSTO/2026' and documento is not distinct from '11')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'GRANDE DIÂMETRO - CENTRO SUL BOTAFOGO' and referencia = 'AGOSTO/2026' and documento is not distinct from '11'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 11 - BM Manutenção - Águas do Rio - Centro Sul - Botafogo - Agosto 2026.xlsx', u.id
  from u, (values
  ('032701', '25056-187', 'BOMBA SUBMERSÍVEL SPV', '2026-06-27 12:00-03', 945.00, '2354-05', '2354-05 t', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM Manutenção - Águas do Rio - Leste - Maricá - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'LESTE - MARICÁ', '14', 'AGOSTO/2026', 'Sraº Wendel', null, 'RUA CARLOS MARIGUELLA - ITAOCAIA VALLEY, MARICÁ RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - MARICÁ' and referencia = 'AGOSTO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - MARICÁ' and referencia = 'AGOSTO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 14 - BM Manutenção - Águas do Rio - Leste - Maricá - Agosto 2026.xlsx', u.id
  from u, (values
  ('031790', '25065-146', 'BOMBA DE MANGOTE 3"', '2026-07-13 12:00-03', 973.00, '1852-14', '1852-14 T', null),
  ('033291', '240825-139', 'CORTADORA MANUAL HUSQVARNA', '2026-08-04 12:00-03', 2624.00, '033207', '034042', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM Manutenção - Águas do Rio - Leste - São Gonçalo - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'LESTE - BOA VISTA - SÃO GONÇALO', '15', 'AGOSTO/2026', 'Sr. Wendel', null, 'ROD. DOV. MARIO COVAS, 101 KM 312, BOA VISTA - SÃO GONÇALO', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - BOA VISTA - SÃO GONÇALO' and referencia = 'AGOSTO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'LESTE - BOA VISTA - SÃO GONÇALO' and referencia = 'AGOSTO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 15 - BM Manutenção - Águas do Rio - Leste - São Gonçalo - Agosto 2026.xlsx', u.id
  from u, (values
  ('031117', '240825-127', 'CORTADORA MANUAL HUSQVARNA', '2026-07-06 12:00-03', 2624.00, '031071', '031246', null),
  ('031540', '25045-894', 'BOMBA DE MANGOTE 3"', '2026-07-10 12:00-03', 240.00, '031467', '031581', null),
  ('031739', '240825-140', 'CORTADORA MANUAL HUSQVARNA', '2026-07-14 12:00-03', 3025.00, '031669', '032367', null),
  ('031942', '25115-556', 'BOMBA DE MANGOTE 3"', '2026-07-16 12:00-03', 140.00, '031889', '031972', null),
  ('031963', '24115-527', 'BOMBA DE MANGOTE 3"', '2026-07-16 12:00-03', 325.00, '031963', '031971', null),
  ('032426', '240825-103', 'CORTADORA MANUAL HUSQVARNA', '2026-07-23 12:00-03', 401.00, '032123', '032497', null),
  ('032894', '24115-527', 'BOMBA DE MANGOTE 3"', '2026-07-29 12:00-03', 396.00, '032879', '032975', null),
  ('033095', '25114-805', 'MOTOVIBRADOR GASOLINA', '2026-07-31 12:00-03', 758.00, '033030', '033211', null),
  ('033574', '241125-212', 'CORTADORA MANUAL HUSQVARNA', '2026-08-06 12:00-03', 2624.00, '033550', '034043', null),
  ('033576', '240825-103', 'CORTADORA MANUAL HUSQVARNA', '2026-08-06 12:00-03', 2653.00, '033549', '034106', null),
  ('033853', '250225-358', 'CORTADORA MANUAL HUSQVARNA', '2026-08-20 12:00-03', 2624.00, '2112-06', '2112-06', null),
  ('033855', '240825-119', 'CORTADORA MANUAL HUSQVARNA', '2026-08-11 12:00-03', 2624.00, '033688', '034605', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 06 - BM Manutenção - Águas do Rio - Norte - Vila Kosmos - Agosto 2026 (1).xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - VILA KOSMO', '06', 'AGOSTO/2026', 'Srº Danilo', null, 'RUA ALECRIM, 1085 - VILA KOSMO RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - VILA KOSMO' and referencia = 'AGOSTO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - VILA KOSMO' and referencia = 'AGOSTO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 06 - BM Manutenção - Águas do Rio - Norte - Vila Kosmos - Agosto 2026 (1).xlsx', u.id
  from u, (values
  ('031989', '240925-170', 'CORTADORA MANUAL HUSQVARNA', '2026-07-16 12:00-03', 1198.00, '031827', '032005', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM Manutenção - Águas do Rio - Norte - Ilha Tauá - Agosto 2026 (1).xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - ILHA', '14', 'AGOSTO/2026', 'SR° MAURO', null, 'RUA DOMINGUES MONDIN, 315 - TAUÁ - ILHA DO GOVERNADOR RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - ILHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - ILHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 14 - BM Manutenção - Águas do Rio - Norte - Ilha Tauá - Agosto 2026 (1).xlsx', u.id
  from u, (values
  ('031455', '18114-500', 'MOTOVIBRADOR GASOLINA', '2026-07-09 12:00-03', 180.00, '031419', '031559', null),
  ('033186', '24018-168', 'COMPACTADOR DE SOLO WOLKAN', '2026-08-03 12:00-03', 1447.00, '032983', '033403', null),
  ('033277', '19024-521', 'MOTOVIBRADOR GASOLINA', '2026-08-04 12:00-03', 379.00, '033225', '033510', null),
  ('033281', '250115-601', 'GRUPO GERADOR 3,5KVA', '2026-08-04 12:00-03', 728.00, '033223', '033486', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM Manutenção - Águas do Rio - Norte - Méier - Agosto 2026 (1).xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - MEIER', '14', 'AGOSTO/2026', 'Sraº Érica', null, 'RUA JOSÉ BONIFÁCIO, 528 - MEIER RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - MEIER' and referencia = 'AGOSTO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'BASE NORTE - MEIER' and referencia = 'AGOSTO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 14 - BM Manutenção - Águas do Rio - Norte - Méier - Agosto 2026 (1).xlsx', u.id
  from u, (values
  ('031113', '25105-318', 'BOMBA DE MANGOTE 3"', '2026-07-06 12:00-03', 112.00, '031080', '031173', null),
  ('031141', '240125-048', 'CORTADORA MANUAL HUSQVARNA', '2026-07-06 12:00-03', 2624.00, '030895', '031165', null),
  ('031749', '24014-178', 'MOTOVIBRADOR GASOLINA', '2026-07-14 12:00-03', 434.00, '031517', '031800', null),
  ('033290', '240125-048', 'CORTADORA MANUAL HUSQVARNA', '2026-08-04 12:00-03', 430.00, '033145', '034378', null),
  ('033300', '25105-318', 'BOMBA DE MANGOTE 3"', '2026-08-04 12:00-03', 577.00, '033256', '033479', null),
  ('033205', '240425-085', 'CORTADORA MANUAL HUSQVARNA', '2026-07-22 12:00-03', 2624.00, '032279', '033205', null),
  ('032337', '22042-065', 'CORTADORA PISO WOLKAN', '2026-07-22 12:00-03', 444.00, '032016', '032551', null),
  ('033439', '24015-338', 'BOMBA DE MANGOTE 3"', '2026-08-04 12:00-03', 156.00, '033258', '033476', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM Manutenção - Águas do Rio - Norte - Penha - Agosto 2026 (1).xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'NORTE - PENHA', '14', 'AGOSTO/2026', 'Sraº Amanda Tenório', null, 'RUA CUBA, 01 - PENHA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'NORTE - PENHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'NORTE - PENHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 14 - BM Manutenção - Águas do Rio - Norte - Penha - Agosto 2026 (1).xlsx', u.id
  from u, (values
  ('031664', '24015-036', 'BOMBA DE MANGOTE 3"', '2026-07-10 12:00-03', 396.00, '1241-15', '1241-15', null),
  ('033684', '24015-405', 'BOMBA DE MANGOTE 3"', '2026-08-07 12:00-03', 396.00, '033622', '033728', null),
  ('033685', '220315-079', 'GRUPO GERADOR 3,5KVA', '2026-08-07 12:00-03', 330.00, '033617', '033783', null),
  ('034425', '24014-326', 'MOTOVIBRADOR GASOLINA', '2026-07-16 12:00-03', 108.00, '031871', '031871 ML', null),
  ('034426', '240115-337', 'GRUPO GERADOR 3,5KVA', '2026-07-16 12:00-03', 148.00, '031875', '031875 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM Manutenção - Águas do Rio - Norte - Campinho - Agosto 2026 (1).xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'NORTE - CAMPINHO', '15', 'AGOSTO/2026', 'Srº Jonathan Araujo', null, 'ESTRADA INTENDENTE MAGALHÃES, 504 - RIO DE JANEIRO RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'NORTE - CAMPINHO' and referencia = 'AGOSTO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'NORTE - CAMPINHO' and referencia = 'AGOSTO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 15 - BM Manutenção - Águas do Rio - Norte - Campinho - Agosto 2026 (1).xlsx', u.id
  from u, (values
  ('031609', '240115-402', 'GRUPO GERADOR 3,5KVA', '2026-07-13 12:00-03', 1003.00, '031292', '031683', null),
  ('031622', '25115-395', 'BOMBA DE MANGOTE 3"', '2026-07-13 12:00-03', 577.00, '031588', '031637', null),
  ('031624', '25025-585', 'BOMBA DE MANGOTE 3"', '2026-07-13 12:00-03', 156.00, '031587', '031671', null),
  ('031647', '240115-397', 'GRUPO GERADOR 3,5KVA', '2026-07-17 12:00-03', 1312.00, '031796', '031797', null),
  ('032122', '007', 'CORTADORA MANUAL STHIL (TERCEIRO)', '2026-08-03 12:00-03', 574.00, '031987', '033924', null),
  ('033447', '13085-111', 'BOMBA DE MANGOTE 3"', '2026-08-05 12:00-03', 396.00, '033414', '033556', null),
  ('033578', '24092-175', 'CORTADORA MANUAL HUSQVARNA', '2026-08-06 12:00-03', 726.00, '033541', '034487', null),
  ('034461', '240115-403', 'GRUPO GERADOR 3,5KVA', '2026-07-17 12:00-03', 148.00, '031984', '031984 ML', null),
  ('035280', '23108-145', 'COMPACTADOR DE SOLO NORTON', '2026-08-11 12:00-03', 201.00, '033737', '033737 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 14 - BM Manutenção - Águas do Rio - Base Sul - Botafogo - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'SUL - BOTAFOGO', '14', 'AGOSTO/2026', 'Sraº Barbara Goes', null, 'AVENIDA REPORTER NESTOR MOREIRA, 76 - BOTAFOGO RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - BOTAFOGO' and referencia = 'AGOSTO/2026' and documento is not distinct from '14')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - BOTAFOGO' and referencia = 'AGOSTO/2026' and documento is not distinct from '14'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 14 - BM Manutenção - Águas do Rio - Base Sul - Botafogo - Agosto 2026.xlsx', u.id
  from u, (values
  ('031131', '250225-255', 'CORTADORA MANUAL HUSQVARNA', '2026-07-06 12:00-03', 279.00, '030925', '031170', null),
  ('031740', '191214-199', 'MARTELO ROMPEDOR 30KG', '2026-07-14 12:00-03', 428.00, '031668', '031883', null),
  ('032159', '22014-145', 'MOTOVIBRADOR GASOLINA', '2026-07-20 12:00-03', 394.00, '032109', '032258', null),
  ('033099', '24095-783', 'BOMBA DE MANGOTE 3"', '2026-07-31 12:00-03', 240.00, '033024', '033204', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM Manutenção - Águas do Rio - Base Sul - Rocha 1 - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'SUL - ROCHA', '15', 'AGOSTO/2026', 'Sraº Barbara Goes', null, 'RUA FREI, 93 - ROCHA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - ROCHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - ROCHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 15 - BM Manutenção - Águas do Rio - Base Sul - Rocha 1 - Agosto 2026.xlsx', u.id
  from u, (values
  ('031332', '240115-431', 'GRUPO GERADOR 3,5KVA', '2026-07-08 12:00-03', 442.00, '030993', '033208', null),
  ('031335', '24015-010', 'BOMBA DE MANGOTE 3"', '2026-07-08 12:00-03', 396.00, '031305', '031508', null),
  ('031862', '25115-157', 'BOMBA DE MANGOTE 3"', '2026-07-15 12:00-03', 548.00, '2255-02', '2255-02 T', null),
  ('032780', '25085-304', 'BOMBA DE MANGOTE 3"', '2026-07-28 12:00-03', 221.00, '032753', '032936', null),
  ('032781', '24115-807', 'BOMBA DE MANGOTE 3"', '2026-07-28 12:00-03', 357.00, '032752', '032937', null),
  ('034147', '25035-696', 'BOMBA DE MANGOTE 3"', '2026-08-13 12:00-03', 357.00, '1624-01 T', '1624-01 T', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 15 - BM Manutenção - Águas do Rio - Base Sul - Rocha 4 - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 4 SPE S.A', 'SUL - ROCHA', '15', 'AGOSTO/2026', 'Sraº Barbara Goes', null, 'RUA FREI, 93 - ROCHA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'SUL - ROCHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '15')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 4 SPE S.A' and base = 'SUL - ROCHA' and referencia = 'AGOSTO/2026' and documento is not distinct from '15'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 15 - BM Manutenção - Águas do Rio - Base Sul - Rocha 4 - Agosto 2026.xlsx', u.id
  from u, (values
  ('029718', '18416901', 'BOMBA DE MANGOTE (TERCEIRO)', '2026-07-06 12:00-03', 463.00, '029714', '035358', null),
  ('032678', '24115-805', 'BOMBA DE MANGOTE 3"', '2026-07-15 12:00-03', 396.00, '2853-01', '2853-01 T', null),
  ('033458', '240115-384', 'GRUPO GERADOR 3,5KVA', '2026-08-05 12:00-03', 1301.00, '033315', '033874', null),
  ('033844', '23095-150', 'BOMBA DE MANGOTE 3"', '2026-08-11 12:00-03', 357.00, '033824', '034102', null),
  ('034127', '24015-300', 'BOMBA DE MANGOTE 3"', '2026-08-14 12:00-03', 228.00, '034092', '034321', null),
  ('035207', '24014-070', 'MOTOVIBRADOR GASOLINA', '2026-08-05 12:00-03', 108.00, '033309', '033309 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 16 - BM Manutenção - Águas do Rio - Base Sul - Gávea - Agosto 2026.xlsx
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, contato, telefone, local_obra, observacao, modelo, criado_por)
  select 'AGUAS DO RIO 1 SPE S.A', 'SUL - GÁVEA', '16', 'AGOSTO/2026', 'Sraº Barbara Goes', null, 'AV. RODRIGO OTÁVIO, 166 - GAVEA RJ', null, 'aguas', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - GÁVEA' and referencia = 'AGOSTO/2026' and documento is not distinct from '16')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'AGUAS DO RIO 1 SPE S.A' and base = 'SUL - GÁVEA' and referencia = 'AGOSTO/2026' and documento is not distinct from '16'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, v.obs,
         'importado: 08 - AGOSTO / 16 - BM Manutenção - Águas do Rio - Base Sul - Gávea - Agosto 2026.xlsx', u.id
  from u, (values
  ('033097', '25115-693', 'BOMBA DE MANGOTE 3"', '2026-07-31 12:00-03', 380.00, '033020', '033243', null),
  ('033797', '240115-387', 'GRUPO GERADOR 3,5KVA', '2026-07-14 12:00-03', 220.00, '031676', '031676 ML', null),
  ('033986', '19024-524', 'MOTOVIBRADOR GASOLINA', '2026-08-12 12:00-03', 943.00, '033902', '034478', null),
  ('035076', '240115-386', 'GRUPO GERADOR 3,5KVA', '2026-07-31 12:00-03', 148.00, '032968', '032968 T', null),
  ('035084', '230615-195', 'GRUPO GERADOR 3,5KVA', '2026-07-31 12:00-03', 148.00, '033016', '033016', null),
  ('035085', '240115-392', 'GRUPO GERADOR 3,5KVA', '2026-07-31 12:00-03', 148.00, '033018', '033018 ML', null)
  ) v(om, pat, equip, dia, valor, ret, ent, obs)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado dos arquivos de agosto'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- As bases que aparecem pela primeira vez entram no cadastro (0010), com os
-- dados do boletim mais recente. Base que já está no cadastro fica como está.
insert into bases (cliente, nome, responsavel, email, telefone, local_obra, modelo, atualizado_por)
select distinct on (chave_do_nome(b.cliente), chave_do_nome(b.base))
       b.cliente, b.base, b.contato, b.email, b.telefone, b.local_obra, b.modelo, null
from boletins b
where b.referencia = 'AGOSTO/2026' and b.base is not null and length(trim(b.base)) > 0
order by chave_do_nome(b.cliente), chave_do_nome(b.base), b.id desc
on conflict (chave_do_nome(cliente), chave_do_nome(nome)) do nothing;

-- Conferência: 41 boletins de AGOSTO/2026 no padrão aguas, 167 OMs, 227.975,00.
select count(*) as boletins, sum(oms) as oms, sum(valor) as valor,
       count(*) filter (where situacao = 'fechado') as fechados
from boletins_atual
where referencia = 'AGOSTO/2026' and modelo = 'aguas';

-- E a OM do arquivo que ficou de fora porque JÁ ESTAVA em outro boletim
-- (uma OM, um boletim). Vazio é o esperado; se aparecer, diga se ela sai do
-- boletim antigo e vem para o de agosto.
select v.om, b.numero, b.base, b.referencia, s.situacao
from (values
  ('034060'),
  ('033090'),
  ('033219'),
  ('034931'),
  ('035072'),
  ('032624'),
  ('033647'),
  ('035279'),
  ('033955'),
  ('032895'),
  ('033872'),
  ('031546'),
  ('033579'),
  ('032044'),
  ('035175'),
  ('031454'),
  ('032786'),
  ('032807'),
  ('034968'),
  ('033666'),
  ('033668'),
  ('032731'),
  ('032424'),
  ('034474'),
  ('034476'),
  ('032397'),
  ('033085'),
  ('032440'),
  ('032249'),
  ('032051'),
  ('032053'),
  ('032823'),
  ('033236'),
  ('032967'),
  ('031391'),
  ('032160'),
  ('032163'),
  ('032164'),
  ('032314'),
  ('032517'),
  ('032521'),
  ('032800'),
  ('032803'),
  ('032993'),
  ('033000'),
  ('033086'),
  ('033087'),
  ('032513'),
  ('035240'),
  ('035282'),
  ('031745'),
  ('031537'),
  ('033092'),
  ('031744'),
  ('031966'),
  ('032324'),
  ('032325'),
  ('032399'),
  ('032625'),
  ('032626'),
  ('033560'),
  ('032631'),
  ('032634'),
  ('032986'),
  ('033005'),
  ('033006'),
  ('033007'),
  ('033008'),
  ('033009'),
  ('033046'),
  ('033273'),
  ('030545'),
  ('031564'),
  ('031896'),
  ('031897'),
  ('032329'),
  ('032331'),
  ('032712'),
  ('032830'),
  ('032834'),
  ('032836'),
  ('032905'),
  ('033375'),
  ('032234'),
  ('035262'),
  ('032640'),
  ('032797'),
  ('035053'),
  ('032245'),
  ('031143'),
  ('029232'),
  ('031032'),
  ('032343'),
  ('032530'),
  ('032583'),
  ('034069'),
  ('034143'),
  ('034956'),
  ('030972'),
  ('030974'),
  ('031858'),
  ('031953'),
  ('031996'),
  ('032701'),
  ('031790'),
  ('033291'),
  ('031117'),
  ('031540'),
  ('031739'),
  ('031942'),
  ('031963'),
  ('032426'),
  ('032894'),
  ('033095'),
  ('033574'),
  ('033576'),
  ('033853'),
  ('033855'),
  ('031989'),
  ('031455'),
  ('033186'),
  ('033277'),
  ('033281'),
  ('031113'),
  ('031141'),
  ('031749'),
  ('033290'),
  ('033300'),
  ('033205'),
  ('032337'),
  ('033439'),
  ('031664'),
  ('033684'),
  ('033685'),
  ('034425'),
  ('034426'),
  ('031609'),
  ('031622'),
  ('031624'),
  ('031647'),
  ('032122'),
  ('033447'),
  ('033578'),
  ('034461'),
  ('035280'),
  ('031131'),
  ('031740'),
  ('032159'),
  ('033099'),
  ('031332'),
  ('031335'),
  ('031862'),
  ('032780'),
  ('032781'),
  ('034147'),
  ('029718'),
  ('032678'),
  ('033458'),
  ('033844'),
  ('034127'),
  ('035207'),
  ('033097'),
  ('033797'),
  ('033986'),
  ('035076'),
  ('035084'),
  ('035085')
) v(om)
join boletim_oms i on i.om = v.om
join boletins b on b.id = i.boletim_id
join boletim_situacao s on s.boletim_id = b.id
where not (b.referencia = 'AGOSTO/2026' and b.modelo = 'aguas');
