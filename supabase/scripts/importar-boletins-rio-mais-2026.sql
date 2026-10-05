-- =====================================================================
-- Os boletins de manutenção da RIO + SANEAMENTO BL3 S.A — dezembro/2025 a
-- setembro/2026 (51 boletins, 104 OMs, R$ 64.550,00), lidos do arquivo "2026"
-- Rode no SQL Editor. Pode rodar duas vezes: boletim que já existe (mesmo
-- cliente, base, mês e documento) não é criado de novo, e OM que já está em
-- algum boletim fica onde está (uma OM, um boletim).
--
-- Entram no papel da Rio+ (modelo rio_mais), FECHADOS no dia 2 do mês
-- seguinte ao da medição — a data de emissão de cada papel. Todas as OMs
-- estão PENDENTE no papel: o que já foi faturado se marca depois, OM por OM,
-- pela planilha de saldo a faturar.
-- Autor: matheus@novaopcaoequipamentos.com.br (criado_por, incluido_por e quem fechou).
--
-- Por mês:
--   DEZEMBRO/2025    2 boletim(ns)   6 OM(s)  R$   2.876,00
--   JANEIRO/2026     4 boletim(ns)  11 OM(s)  R$   3.806,00
--   FEVEREIRO/2026   3 boletim(ns)   9 OM(s)  R$   4.103,00
--   MARÇO/2026       7 boletim(ns)  15 OM(s)  R$  12.785,00
--   ABRIL/2026       6 boletim(ns)  11 OM(s)  R$  11.812,00
--   MAIO/2026        7 boletim(ns)  11 OM(s)  R$   5.672,00
--   JUNHO/2026       5 boletim(ns)  12 OM(s)  R$   6.979,00
--   JULHO/2026       6 boletim(ns)   7 OM(s)  R$   3.487,00
--   AGOSTO/2026      6 boletim(ns)   8 OM(s)  R$   3.959,00
--   SETEMBRO/2026    5 boletim(ns)  14 OM(s)  R$   9.071,00
--
-- O que se conferiu nos arquivos:
--   · A fonte é o PDF de cada boletim (o que foi ao cliente); a planilha ao
--     lado bate com ele em todos. Três planilhas vieram corrompidas no RAR
--     (Itaguaí GSO de janeiro, Campo Grande Áreas Irregulares de março e
--     Campo Grande GSO de maio) — entram pelo PDF.
--   · As pastas repetem boletins antigos ("SEM MANUTENÇÃO …", "NÃO HOUVE
--     MANUTENÇÃO …"): é a mesma medição, guardada de novo no mês em que a
--     base não teve OM. Entra uma vez só, no mês dela.
--   · Itaguaí Perdas 03 (dezembro/2025, 4 OMs, R$ 1.960,00) só tem a
--     planilha, sem PDF — entra, porque o 04 de fevereiro vem logo depois.
--   · Campo Grande Subs Ramal 01 (janeiro): a proposta 018375 virou data no
--     Excel (22/04/1950 é o dia 18.375); entra como 018375.
--   · Ficam de fora as planilhas vazias (Campo Grande Perdas 01 e Vassouras
--     02 de novembro/2025, Grande Reparo 03 de dezembro/2025) e o resumo
--     "MEDIÇÃO PENDENTE DE NOVEMBRO À MAIO-26 - CAMPO GRANDE GSO", que junta
--     OMs que já estão nos boletins de cada mês.
--   · Nomes das bases: o do papel, arrumado — "ÁERAS" vira ÁREAS, "PINHERAL"
--     vira PINHEIRAL, e "ITAGUAÍ GSO" vira "ITAGUAÍ - GSO". A regional é a
--     pasta: Campo Grande, Itaguaí, Vassouras - Piraí - Pinheiral.
--
-- Um comando por boletim: se a colagem cortar, o que chegou inteiro entrou, e
-- rodar de novo completa o resto.
-- =====================================================================

set search_path = medicoes, public;

-- 1 - JANEIRO/ITAGUAI/03 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS.xlsx  (4 OM(s), R$ 1.960,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - PERDAS', '03', 'DEZEMBRO/2025', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI PERDAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'DEZEMBRO/2025' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'DEZEMBRO/2025' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 1 - JANEIRO/ITAGUAI/03 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS.xlsx', u.id
  from u, (values
  ('017278', '231215-253', 'GRUPO GERADOR 3,5KVA', '2025-12-17 12:00-03', 388.00),
  ('017279', '240115-304', 'GRUPO GERADOR 3,5KVA', '2025-12-17 12:00-03', 635.00),
  ('017284', '231215-239', 'GRUPO GERADOR 3,5KVA', '2025-12-17 12:00-03', 543.00),
  ('017274', '200615-103', 'GRUPO GERADOR 3,5KVA', '2025-12-17 12:00-03', 394.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-01-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 1 - JANEIRO/VASSOURAS - PIRAÍ/02 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ.pdf  (2 OM(s), R$ 916,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PIRAÍ', '02', 'DEZEMBRO/2025', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'DEZEMBRO/2025' and documento is not distinct from '02')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'DEZEMBRO/2025' and documento is not distinct from '02'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 1 - JANEIRO/VASSOURAS - PIRAÍ/02 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ.pdf', u.id
  from u, (values
  ('017287', '241115-034', 'GRUPO GERADOR 3,5KVA', '2025-12-17 12:00-03', 611.00),
  ('017045', '18075-053', 'BOMBA DE MANGOTE 3"', '2025-12-13 12:00-03', 305.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-01-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 1 - JANEIRO/CAMPO GRANDE/04 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - JANEIRO.pdf  (5 OM(s), R$ 2.162,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '04', 'JANEIRO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'JANEIRO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'JANEIRO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 1 - JANEIRO/CAMPO GRANDE/04 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - JANEIRO.pdf', u.id
  from u, (values
  ('017537', '13432', 'MAQUINA DE PINTURA (TERCEIRO)', '2023-12-23 12:00-03', 696.00),
  ('018369', '110814-101', 'MARTELO ROMPEDOR 20KG', '2026-01-13 12:00-03', 667.00),
  ('018370', '25045-880', 'BOMBA DE MANGOTE', '2026-01-13 12:00-03', 305.00),
  ('018374', '23115-297', 'BOMBA DE MANGOTE', '2026-01-13 12:00-03', 370.00),
  ('019021', '240925-188', 'CORTADORA MANUAL HUSQVARNA', '2026-01-22 12:00-03', 124.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-02-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 1 - JANEIRO/CAMPO GRANDE/01 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - JANEIRO.pdf  (2 OM(s), R$ 714,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - SUBS RAMAL', '01', 'JANEIRO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - SUBS RAMAL', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'JANEIRO/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'JANEIRO/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 1 - JANEIRO/CAMPO GRANDE/01 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - JANEIRO.pdf', u.id
  from u, (values
  ('019019', '25012-191', 'CORTADORA PISO HUSQVARNA', '2026-01-22 12:00-03', 420.00),
  ('018375', '211115-051', 'GRUPO GERADOR 3,5 KVA', '2026-01-13 12:00-03', 294.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-02-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 1 - JANEIRO/CAMPO GRANDE/JANEIRO - 02 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - ÁERAS IRREGULARES - JANEIRO.pdf  (1 OM(s), R$ 102,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - ÁREAS IRREGULARES', '02', 'JANEIRO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - ÁREAS IRREGULARES', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - ÁREAS IRREGULARES' and referencia = 'JANEIRO/2026' and documento is not distinct from '02')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - ÁREAS IRREGULARES' and referencia = 'JANEIRO/2026' and documento is not distinct from '02'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 1 - JANEIRO/CAMPO GRANDE/JANEIRO - 02 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - ÁERAS IRREGULARES - JANEIRO.pdf', u.id
  from u, (values
  ('018371', '240115-272', 'GRUPO GERADOR 3,5 KVA', '2025-12-18 12:00-03', 102.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-02-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 1 - JANEIRO/ITAGUAI/04 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - JANEIRO.pdf  (3 OM(s), R$ 828,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '04', 'JANEIRO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'JANEIRO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'JANEIRO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 1 - JANEIRO/ITAGUAI/04 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - JANEIRO.pdf', u.id
  from u, (values
  ('018354', '24015-199', 'BOMBA DE MANGOTE 3"', '2026-01-13 12:00-03', 448.00),
  ('019022', '24015-103', 'BOMBA DE MANGOTE 3"', '2026-01-22 12:00-03', 240.00),
  ('019027', '25105-052', 'BOMBA DE MANGOTE 3"', '2026-01-22 12:00-03', 140.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-02-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 2 - FEVEREIRO/CAMPO GRANDE/05 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - FEVEREIRO.pdf  (4 OM(s), R$ 2.228,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '05', 'FEVEREIRO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'FEVEREIRO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'FEVEREIRO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 2 - FEVEREIRO/CAMPO GRANDE/05 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - FEVEREIRO.pdf', u.id
  from u, (values
  ('020225', '220636-120', 'GRUPO GERADOR 3,5 KVA', '2026-02-06 12:00-03', 315.00),
  ('020473', '25012-173', 'CORTADORA PISO HUSQVARNA', '2026-02-10 12:00-03', 420.00),
  ('000183', '24C0629836A0362', 'GRUPO GERADOR 3,5 KVA (TERCEIRO)', '2026-02-09 12:00-03', 781.00),
  ('018904', '231215-249', 'GRUPO GERADOR 3,5KVA', '2026-01-21 12:00-03', 712.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-03-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 2 - FEVEREIRO/ITAGUAI/05 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - FEVEREIRO.pdf  (1 OM(s), R$ 298,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '05', 'FEVEREIRO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'FEVEREIRO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'FEVEREIRO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 2 - FEVEREIRO/ITAGUAI/05 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - FEVEREIRO.pdf', u.id
  from u, (values
  ('020212', '240115-266', 'GRUPO GERADOR 3,5 KVA', '2026-02-06 12:00-03', 298.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-03-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 2 - FEVEREIRO/ITAGUAI/04 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - FEVEREIRO.pdf  (4 OM(s), R$ 1.577,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - PERDAS', '04', 'FEVEREIRO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI PERDAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'FEVEREIRO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'FEVEREIRO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 2 - FEVEREIRO/ITAGUAI/04 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - FEVEREIRO.pdf', u.id
  from u, (values
  ('020200', '211114-087', 'MARTELO ROMPEDOR 20KG', '2026-02-06 12:00-03', 260.00),
  ('020201', '240115-305', 'GRUPO GERADOR 3,5KVA', '2026-02-06 12:00-03', 310.00),
  ('020474', '231215-238', 'GRUPO GERADOR 3,5KVA', '2026-02-10 12:00-03', 544.00),
  ('020477', '230515-145', 'GRUPO GERADOR 3,5KVA', '2026-02-10 12:00-03', 463.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-03-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 3 - MARÇO/CAMPO GRANDE/04 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - GRANDE REPARO - FEVEREIRO.pdf  (1 OM(s), R$ 3.611,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GRANDE REPARO', '04', 'MARÇO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GRANDE REPARO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GRANDE REPARO' and referencia = 'MARÇO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GRANDE REPARO' and referencia = 'MARÇO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 3 - MARÇO/CAMPO GRANDE/04 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - GRANDE REPARO - FEVEREIRO.pdf', u.id
  from u, (values
  ('022284', '16056-167', 'BOMBA SUBMERSÍVEL SPV', '2026-03-07 12:00-03', 3611.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-04-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 3 - MARÇO/CAMPO GRANDE/06 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - MARÇO.pdf  (6 OM(s), R$ 5.282,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '06', 'MARÇO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'MARÇO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'MARÇO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 3 - MARÇO/CAMPO GRANDE/06 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - MARÇO.pdf', u.id
  from u, (values
  ('022035', '24116-158', 'BOMBA SUBMERSÍVEL SPV6"', '2026-03-04 12:00-03', 3611.00),
  ('022425', '240125-061', 'CORTADORA MANUAL HUSQVARNA', '2026-03-07 12:00-03', 401.00),
  ('022431', '250115-548', 'GRUPO GERADOR 3,5KVA', '2026-03-07 12:00-03', 229.00),
  ('022512', '220315-099', 'GRUPO GERADOR 3,5KVA', '2026-03-09 12:00-03', 310.00),
  ('022583', '24093-010', 'GRUPO GERADOR 9KVA', '2026-03-10 12:00-03', 623.00),
  ('022606', '19024-124', 'MOTOVIBRADOR GASOLINA', '2025-03-10 12:00-03', 108.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-04-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 3 - MARÇO/CAMPO GRANDE/02 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - MARÇO.pdf  (1 OM(s), R$ 396,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - SUBS RAMAL', '02', 'MARÇO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - SUBS RAMAL', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'MARÇO/2026' and documento is not distinct from '02')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'MARÇO/2026' and documento is not distinct from '02'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 3 - MARÇO/CAMPO GRANDE/02 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - MARÇO.pdf', u.id
  from u, (values
  ('022434', '24065-090', 'BOMBA DE MANGOTE 3"', '2026-03-07 12:00-03', 396.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-04-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 3 - MARÇO/CAMPO GRANDE/03 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - ÁERAS IRREGULARES - MARÇO.pdf  (1 OM(s), R$ 428,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - ÁREAS IRREGULARES', '03', 'MARÇO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - ÁREAS IRREGULARES', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - ÁREAS IRREGULARES' and referencia = 'MARÇO/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - ÁREAS IRREGULARES' and referencia = 'MARÇO/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 3 - MARÇO/CAMPO GRANDE/03 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - ÁERAS IRREGULARES - MARÇO.pdf', u.id
  from u, (values
  ('023870', '240364-447', 'MOTOVIBRADOR GASOLINA', '2026-03-25 12:00-03', 428.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-04-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 3 - MARÇO/ITAGUAI/06 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - MARÇO.pdf  (3 OM(s), R$ 589,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '06', 'MARÇO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'MARÇO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'MARÇO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 3 - MARÇO/ITAGUAI/06 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - MARÇO.pdf', u.id
  from u, (values
  ('022427', '250225-412', 'CORTADORA MANUAL HUSQVARNA', '2026-03-07 12:00-03', 286.00),
  ('022513', '231215-256', 'GRUPO GERADOR 3,5 KVA', '2026-03-09 12:00-03', 148.00),
  ('020809', '22058-066', 'COMPACTADOR DE SOLO WOLKAN', '2026-02-13 12:00-03', 155.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-04-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 3 - MARÇO/ITAGUAI/05 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - MARÇO.pdf  (2 OM(s), R$ 1.022,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - PERDAS', '05', 'MARÇO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI PERDAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'MARÇO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'MARÇO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 3 - MARÇO/ITAGUAI/05 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - MARÇO.pdf', u.id
  from u, (values
  ('022585', '240115-411', 'GRUPO GERADOR 3,5KVA', '2026-03-10 12:00-03', 230.00),
  ('022604', '13042-021', 'CORTADORA PISO NORTON', '2026-03-10 12:00-03', 792.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-04-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 3 - MARÇO/VASSOURAS - PIRAÍ/03 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - MARÇO.pdf  (1 OM(s), R$ 1.457,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'VASSOURAS', '03', 'MARÇO/2026', 'RUA OTAVIO GOMES, 269 - LOJA 02 - CENTRO - VASSOURAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'MARÇO/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'MARÇO/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 3 - MARÇO/VASSOURAS - PIRAÍ/03 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - MARÇO.pdf', u.id
  from u, (values
  ('022889', '240825-101', 'CORTADORA MANUAL HUSQVARNA', '2026-03-13 12:00-03', 1457.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-04-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 4 - ABRIL/CAMPO GRANDE/07 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - ABRIL.pdf  (3 OM(s), R$ 8.402,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '07', 'ABRIL/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'ABRIL/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'ABRIL/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 4 - ABRIL/CAMPO GRANDE/07 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - ABRIL.pdf', u.id
  from u, (values
  ('024844', '230515-163', 'GRUPO GERADOR 3,5KVA', '2026-04-09 12:00-03', 2591.00),
  ('025008', '231215-249', 'GRUPO GERADOR 3,5KVA', '2026-04-11 12:00-03', 595.00),
  ('025035', '240925-188', 'CORTADORA MANUAL HUSQVARNA', '2026-04-11 12:00-03', 5216.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-05-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 4 - ABRIL/CAMPO GRANDE/03 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - ABRIL.pdf  (1 OM(s), R$ 396,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - SUBS RAMAL', '03', 'ABRIL/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - SUBS RAMAL', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'ABRIL/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'ABRIL/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 4 - ABRIL/CAMPO GRANDE/03 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - ABRIL.pdf', u.id
  from u, (values
  ('025011', '24065-090', 'BOMBA DE MANGOTE 3"', '2026-04-11 12:00-03', 396.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-05-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 4 - ABRIL/CAMPO GRANDE/04 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - ÁERAS IRREGULARES - ABRIL.pdf  (2 OM(s), R$ 624,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - ÁREAS IRREGULARES', '04', 'ABRIL/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - ÁREAS IRREGULARES', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - ÁREAS IRREGULARES' and referencia = 'ABRIL/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - ÁREAS IRREGULARES' and referencia = 'ABRIL/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 4 - ABRIL/CAMPO GRANDE/04 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - ÁERAS IRREGULARES - ABRIL.pdf', u.id
  from u, (values
  ('024060', '25012-174', 'CORTADORA PISO HUSQVARNA', '2026-03-27 12:00-03', 488.00),
  ('025009', '250210-243', 'ESMERILHADEIRA 4"', '2026-04-11 12:00-03', 136.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-05-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 4 - ABRIL/ITAGUAI/01 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ COMERCIAL - ABRIL.pdf  (1 OM(s), R$ 405,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - COMERCIAL', '01', 'ABRIL/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI COMERCIAL', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - COMERCIAL' and referencia = 'ABRIL/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - COMERCIAL' and referencia = 'ABRIL/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 4 - ABRIL/ITAGUAI/01 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ COMERCIAL - ABRIL.pdf', u.id
  from u, (values
  ('024044', '220315-075', 'GRUPO GERADOR 3,5KVA', '2026-03-27 12:00-03', 405.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-05-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 4 - ABRIL/ITAGUAI/06 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - ABRIL.pdf  (2 OM(s), R$ 1.576,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '06', 'ABRIL/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'ABRIL/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'ABRIL/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 4 - ABRIL/ITAGUAI/06 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - ABRIL.pdf', u.id
  from u, (values
  ('025015', '25106-191', 'BOMBA SUBMERSÍVEL SPV', '2026-04-11 12:00-03', 999.00),
  ('025023', '25025-268', 'BOMBA DE MANGOTE', '2026-04-11 12:00-03', 577.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-05-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 4 - ABRIL/VASSOURAS - PIRAÍ/03 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - ABRIL.pdf  (2 OM(s), R$ 409,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PIRAÍ', '03', 'ABRIL/2026', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'ABRIL/2026' and documento is not distinct from '03')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'ABRIL/2026' and documento is not distinct from '03'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 4 - ABRIL/VASSOURAS - PIRAÍ/03 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - ABRIL.pdf', u.id
  from u, (values
  ('025016', '240115-276', 'GRUPO GERADOR 3,5KVA', '2026-04-11 12:00-03', 221.00),
  ('025622', '220115-071', 'GRUPO GERADOR 3,5KVA', '2026-04-20 12:00-03', 188.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-05-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 5 - MAIO/CAMPO GRANDE/08 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - MAIO.pdf  (3 OM(s), R$ 1.034,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '08', 'MAIO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'MAIO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'MAIO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 5 - MAIO/CAMPO GRANDE/08 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - MAIO.pdf', u.id
  from u, (values
  ('026697', '24063-194', 'GRUPO GERADOR 9KVA', '2026-05-09 12:00-03', 250.00),
  ('027532', '23125-402', 'BOMBA DE MANGOTE 3"', '2026-05-21 12:00-03', 240.00),
  ('027524', '240715-453', 'GRUPO GERADOR 3,5 KVA', '2026-05-21 12:00-03', 544.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-06-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 5 - MAIO/CAMPO GRANDE/04 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - MAIO.pdf  (1 OM(s), R$ 369,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - SUBS RAMAL', '04', 'MAIO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - SUBS RAMAL', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'MAIO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'MAIO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 5 - MAIO/CAMPO GRANDE/04 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - MAIO.pdf', u.id
  from u, (values
  ('027534', '25012-195', 'CORTADORA PISO HUSQVARNA', '2026-05-21 12:00-03', 369.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-06-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 5 - MAIO/ITAGUAI/07 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - MAIO.pdf  (1 OM(s), R$ 1.289,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '07', 'MAIO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'MAIO/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'MAIO/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 5 - MAIO/ITAGUAI/07 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - MAIO.pdf', u.id
  from u, (values
  ('026365', '008557', 'INVERSORA DE SOLDA BAMBOZZI (TERCEIRO)', '2026-05-05 12:00-03', 1289.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-06-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 5 - MAIO/ITAGUAI/06 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - MAIO.pdf  (1 OM(s), R$ 360,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - PERDAS', '06', 'MAIO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI PERDAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'MAIO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'MAIO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 5 - MAIO/ITAGUAI/06 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - MAIO.pdf', u.id
  from u, (values
  ('027537', '211214-291', 'MARTELO ROMPEDOR 20KG', '2026-05-21 12:00-03', 360.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-06-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 5 - MAIO/VASSOURAS - PIRAÍ - PINHERAL/01 BM MANUTENÇÃO - RIO + SANEAMENTO - PINHERAL - MAIO.pdf  (1 OM(s), R$ 1.623,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PINHEIRAL', '01', 'MAIO/2026', 'PRAÇA SÃO JORGE, S - N - CENTRO - PINHEIRAL - RJ', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PINHEIRAL' and referencia = 'MAIO/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PINHEIRAL' and referencia = 'MAIO/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 5 - MAIO/VASSOURAS - PIRAÍ - PINHERAL/01 BM MANUTENÇÃO - RIO + SANEAMENTO - PINHERAL - MAIO.pdf', u.id
  from u, (values
  ('027527', '13106-113', 'BOMBA SUBMERSÍVEL SPV 4"', '2026-05-21 12:00-03', 1623.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-06-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 5 - MAIO/VASSOURAS - PIRAÍ - PINHERAL/04 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - MAIO.pdf  (2 OM(s), R$ 224,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PIRAÍ', '04', 'MAIO/2026', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'MAIO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'MAIO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 5 - MAIO/VASSOURAS - PIRAÍ - PINHERAL/04 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - MAIO.pdf', u.id
  from u, (values
  ('026698', '25104-143', 'MOTOVIBRADOR GASOLINA', '2026-05-09 12:00-03', 108.00),
  ('027522', '22012-057', 'CORTADORA PISO NORTON', '2026-05-21 12:00-03', 116.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-06-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 5 - MAIO/VASSOURAS - PIRAÍ - PINHERAL/04 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - MAIO.pdf  (2 OM(s), R$ 773,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'VASSOURAS', '04', 'MAIO/2026', 'RUA OTAVIO GOMES, 269 - LOJA 02 - CENTRO - VASSOURAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'MAIO/2026' and documento is not distinct from '04')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'MAIO/2026' and documento is not distinct from '04'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 5 - MAIO/VASSOURAS - PIRAÍ - PINHERAL/04 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - MAIO.pdf', u.id
  from u, (values
  ('026709', '220315-081', 'GRUPO GERADOR 3,5KVA', '2026-05-09 12:00-03', 148.00),
  ('027529', '220315-081', 'GRUPO GERADOR 3,5KVA', '2026-05-21 12:00-03', 625.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-06-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 6 - JUNHO/CAMPO GRANDE/09 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - JUNHO.pdf  (3 OM(s), R$ 1.691,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '09', 'JUNHO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'JUNHO/2026' and documento is not distinct from '09')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'JUNHO/2026' and documento is not distinct from '09'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 6 - JUNHO/CAMPO GRANDE/09 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - JUNHO.pdf', u.id
  from u, (values
  ('027930', '230515-149', 'GRUPO GERADOR 9KVA', '2026-05-25 12:00-03', 394.00),
  ('027999', '25045-880', 'BOMBA DE MANGOTE 3"', '2026-06-10 12:00-03', 396.00),
  ('029268', '211214-295', 'MARTELO ROMPEDOR 20KG', '2026-06-24 12:00-03', 901.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-07-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 6 - JUNHO/CAMPO GRANDE/05 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - JUNHO.pdf  (1 OM(s), R$ 383,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - SUBS RAMAL', '05', 'JUNHO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - SUBS RAMAL', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'JUNHO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'JUNHO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 6 - JUNHO/CAMPO GRANDE/05 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - JUNHO.pdf', u.id
  from u, (values
  ('027964', '211115-051', 'GRUPO GERADOR 3,5KVA', '2026-06-10 12:00-03', 383.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-07-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 6 - JUNHO/ITAGUAI/08 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - JUNHO.pdf  (5 OM(s), R$ 1.745,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '08', 'JUNHO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'JUNHO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'JUNHO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 6 - JUNHO/ITAGUAI/08 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - JUNHO.pdf', u.id
  from u, (values
  ('026366', '16396', 'ESMERILHADEIRA 7" GWA 2200-330 (TERCEIRO)', '2026-06-01 12:00-03', 298.00),
  ('026367', '221021722', 'FURADEIRA BOSCH GSB 550 RE - 220V (TERCEIRO)', '2026-05-12 12:00-03', 358.00),
  ('026368', '225201223', 'FURADEIRA BOSCH GSB 550 RE - 220V (TERCEIRO)', '2026-05-12 12:00-03', 619.00),
  ('027942', '240614-297', 'MARTELO ROMPEDOR 20KG', '2026-05-25 12:00-03', 360.00),
  ('029137', '250225-310', 'CORTADORA MANUAL HUSQVARNA', '2026-06-24 12:00-03', 110.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-07-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 6 - JUNHO/ITAGUAI/07 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - JUNHO.pdf  (1 OM(s), R$ 388,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - PERDAS', '07', 'JUNHO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI PERDAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'JUNHO/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'JUNHO/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 6 - JUNHO/ITAGUAI/07 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - JUNHO.pdf', u.id
  from u, (values
  ('027458', '23101-134', 'PLACA VIBRATÓRIA 100KG CSM', '2026-06-15 12:00-03', 388.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-07-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 6 - JUNHO/VASSOURAS - PIRAÍ - PINHERAL/05 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - JUNHO.pdf  (2 OM(s), R$ 2.772,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PIRAÍ', '05', 'JUNHO/2026', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'JUNHO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'JUNHO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 6 - JUNHO/VASSOURAS - PIRAÍ - PINHERAL/05 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - JUNHO.pdf', u.id
  from u, (values
  ('028668', '250115-260', 'GRUPO GERADOR 3,5KVA', '2026-06-03 12:00-03', 148.00),
  ('028661', '260325-112', 'CORTADORA MANUAL STHIL', '2026-06-17 12:00-03', 2624.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-07-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 7 - JULHO/CAMPO GRANDE/10 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - JULHO.pdf  (2 OM(s), R$ 1.162,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '10', 'JULHO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'JULHO/2026' and documento is not distinct from '10')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'JULHO/2026' and documento is not distinct from '10'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 7 - JULHO/CAMPO GRANDE/10 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - JULHO.pdf', u.id
  from u, (values
  ('032178', '24081-170', 'PLACA VIBRATÓRIA 100KG', '2026-07-21 12:00-03', 218.00),
  ('029639', '24115-795', 'BOMBA DE MANGOTE 3"', '2026-07-02 12:00-03', 944.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-08-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 7 - JULHO/CAMPO GRANDE/06 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - JULHO.pdf  (1 OM(s), R$ 310,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - SUBS RAMAL', '06', 'JULHO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - SUBS RAMAL', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'JULHO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'JULHO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 7 - JULHO/CAMPO GRANDE/06 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - JULHO.pdf', u.id
  from u, (values
  ('031104', '211115-051', 'GRUPO GERADOR 3,5KVA', '2026-07-15 12:00-03', 310.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-08-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 7 - JULHO/ITAGUAI/09 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - JULHO..pdf  (1 OM(s), R$ 631,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '09', 'JULHO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'JULHO/2026' and documento is not distinct from '09')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'JULHO/2026' and documento is not distinct from '09'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 7 - JULHO/ITAGUAI/09 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - JULHO..pdf', u.id
  from u, (values
  ('030467', '24018-156', 'COMPACTADOR DE SOLO WOLKAN', '2026-07-21 12:00-03', 631.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-08-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 7 - JULHO/VASSOURAS - PIRAÍ - PINHERAL/06 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - JULHO.pdf  (1 OM(s), R$ 148,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PIRAÍ', '06', 'JULHO/2026', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'JULHO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'JULHO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 7 - JULHO/VASSOURAS - PIRAÍ - PINHERAL/06 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - JULHO.pdf', u.id
  from u, (values
  ('031164', '231015-225', 'GRUPO GERADOR 3,5KVA', '2026-07-07 12:00-03', 148.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-08-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 7 - JULHO/VASSOURAS - PIRAÍ - PINHERAL/01 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ PERDAS- JULHO.pdf  (1 OM(s), R$ 544,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PIRAÍ - PERDAS', '01', 'JULHO/2026', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ PERDAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ - PERDAS' and referencia = 'JULHO/2026' and documento is not distinct from '01')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ - PERDAS' and referencia = 'JULHO/2026' and documento is not distinct from '01'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 7 - JULHO/VASSOURAS - PIRAÍ - PINHERAL/01 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ PERDAS- JULHO.pdf', u.id
  from u, (values
  ('031447', '231215-253', 'GRUPO GERADOR 3,5KVA', '2026-07-21 12:00-03', 544.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-08-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 7 - JULHO/VASSOURAS - PIRAÍ - PINHERAL/05 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - JULHO..pdf  (1 OM(s), R$ 692,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'VASSOURAS', '05', 'JULHO/2026', 'RUA OTAVIO GOMES, 269 - LOJA 02 - CENTRO - VASSOURAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'JULHO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'JULHO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 7 - JULHO/VASSOURAS - PIRAÍ - PINHERAL/05 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - JULHO..pdf', u.id
  from u, (values
  ('030387', '230315-133', 'GRUPO GERADOR 3,5KVA', '2026-07-15 12:00-03', 692.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-08-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 8 - AGOSTO/CAMPO GRANDE/11 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - AGOSTO.pdf  (2 OM(s), R$ 1.185,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '11', 'AGOSTO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'AGOSTO/2026' and documento is not distinct from '11')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'AGOSTO/2026' and documento is not distinct from '11'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 8 - AGOSTO/CAMPO GRANDE/11 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - AGOSTO.pdf', u.id
  from u, (values
  ('033276', '25104-280', 'MOTOVIBRADOR GASOLINA', '2026-08-17 12:00-03', 608.00),
  ('033944', '25045-882', 'BOMBA DE MANGOTE 3"', '2026-08-17 12:00-03', 577.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 8 - AGOSTO/CAMPO GRANDE/07 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - AGOSTO.pdf  (1 OM(s), R$ 758,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - SUBS RAMAL', '07', 'AGOSTO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - SUBS RAMAL', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'AGOSTO/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - SUBS RAMAL' and referencia = 'AGOSTO/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 8 - AGOSTO/CAMPO GRANDE/07 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - SUBS RAMAL - AGOSTO.pdf', u.id
  from u, (values
  ('033280', '231215-247', 'GRUPO GERADOR 3,5KVA', '2026-08-17 12:00-03', 758.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 8 - AGOSTO/CAMPO GRANDE/05 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - ÁERAS IRREGULARES - AGOSTO.pdf  (1 OM(s), R$ 396,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - ÁREAS IRREGULARES', '05', 'AGOSTO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - ÁREAS IRREGULARES', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - ÁREAS IRREGULARES' and referencia = 'AGOSTO/2026' and documento is not distinct from '05')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - ÁREAS IRREGULARES' and referencia = 'AGOSTO/2026' and documento is not distinct from '05'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 8 - AGOSTO/CAMPO GRANDE/05 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE - ÁERAS IRREGULARES - AGOSTO.pdf', u.id
  from u, (values
  ('032685', '24095-626', 'BOMBA DE MANGOTE 3"', '2026-08-06 12:00-03', 396.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 8 - AGOSTO/ITAGUAI/10 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - AGOSTO.pdf  (2 OM(s), R$ 1.232,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '10', 'AGOSTO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'AGOSTO/2026' and documento is not distinct from '10')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'AGOSTO/2026' and documento is not distinct from '10'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 8 - AGOSTO/ITAGUAI/10 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - AGOSTO.pdf', u.id
  from u, (values
  ('032435', '22121-066', 'PLACA VIBRATÓRIA 100KG CSM', '2026-08-12 12:00-03', 823.00),
  ('033430', null, 'ESMERILHADEIRA 7" BOSCH GWS 25-180 (TERCEIRO)', '2026-08-18 12:00-03', 409.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 8 - AGOSTO/VASSOURAS - PIRAÍ - PINHERAL/07 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - AGOSTO.pdf  (1 OM(s), R$ 148,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PIRAÍ', '07', 'AGOSTO/2026', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'AGOSTO/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'AGOSTO/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 8 - AGOSTO/VASSOURAS - PIRAÍ - PINHERAL/07 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - AGOSTO.pdf', u.id
  from u, (values
  ('034288', '250115-260', 'GRUPO GERADOR 3,5KVA', '2026-08-17 12:00-03', 148.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 8 - AGOSTO/VASSOURAS - PIRAÍ - PINHERAL/06 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - AGOSTO.pdf  (1 OM(s), R$ 240,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'VASSOURAS', '06', 'AGOSTO/2026', 'RUA OTAVIO GOMES, 269 - LOJA 02 - CENTRO - VASSOURAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'AGOSTO/2026' and documento is not distinct from '06')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'AGOSTO/2026' and documento is not distinct from '06'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 8 - AGOSTO/VASSOURAS - PIRAÍ - PINHERAL/06 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - AGOSTO.pdf', u.id
  from u, (values
  ('032686', '24085-763', 'BOMBA DE MANGOTE 3"', '2026-08-06 12:00-03', 240.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-09-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 9 - SETEMBRO/CAMPO GRANDE/12 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - SETEMBRO.pdf  (4 OM(s), R$ 3.286,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'CAMPO GRANDE - GSO', '12', 'SETEMBRO/2026', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '12')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'CAMPO GRANDE - GSO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '12'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 9 - SETEMBRO/CAMPO GRANDE/12 BM MANUTENÇÃO - RIO + SANEAMENTO - CAMPO GRANDE -GSO - SETEMBRO.pdf', u.id
  from u, (values
  ('033296', '23115-172', 'BOMBA DE MANGOTE 3"', '2026-09-21 12:00-03', 156.00),
  ('034675', '250225-243', 'CORTADORA MANUAL HUSQVARNA', '2026-09-18 12:00-03', 2624.00),
  ('035330', '240925-188', 'CORTADORA MANUAL HUSQVARNA', '2026-09-25 12:00-03', 110.00),
  ('036632', '24115-800', 'BOMBA DE MANGOTE 3"', '2026-09-21 12:00-03', 396.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 9 - SETEMBRO/ITAGUAI/11 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - SETEMBRO.pdf  (4 OM(s), R$ 3.065,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - GSO', '11', 'SETEMBRO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '11')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - GSO' and referencia = 'SETEMBRO/2026' and documento is not distinct from '11'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 9 - SETEMBRO/ITAGUAI/11 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ GSO - SETEMBRO.pdf', u.id
  from u, (values
  ('031727', null, 'GRUPO GERADOR DIESEL VONDER (TERCEIRO)', '2026-08-18 12:00-03', 2460.00),
  ('033852', '24015-290', 'BOMBA DE MANGOTE 3"', '2026-09-03 12:00-03', 156.00),
  ('034541', '25025-161', 'BOMBA DE MANGOTE 3"', '2026-09-09 12:00-03', 221.00),
  ('037046', '231215-256', 'GRUPO GERADOR 3,5KVA', '2026-09-25 12:00-03', 228.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 9 - SETEMBRO/ITAGUAI/08 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - SETEMBRO.pdf  (2 OM(s), R$ 536,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'ITAGUAÍ - PERDAS', '08', 'SETEMBRO/2026', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI PERDAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'ITAGUAÍ - PERDAS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 9 - SETEMBRO/ITAGUAI/08 BM MANUTENÇÃO - RIO + SANEAMENTO - ITAGUAÍ PERDAS - SETEMBRO.pdf', u.id
  from u, (values
  ('037056', '240115-411', 'GRUPO GERADOR 3,5KVA', '2026-09-25 12:00-03', 388.00),
  ('037060', '231215-239', 'GRUPO GERADOR 3,5KVA', '2026-09-25 12:00-03', 148.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 9 - SETEMBRO/VASSOURAS - PIRAÍ - PINHERAL/08 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - SETEMBRO.pdf  (3 OM(s), R$ 1.559,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'PIRAÍ', '08', 'SETEMBRO/2026', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'SETEMBRO/2026' and documento is not distinct from '08')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'PIRAÍ' and referencia = 'SETEMBRO/2026' and documento is not distinct from '08'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 9 - SETEMBRO/VASSOURAS - PIRAÍ - PINHERAL/08 BM MANUTENÇÃO - RIO + SANEAMENTO - PIRAÍ - SETEMBRO.pdf', u.id
  from u, (values
  ('035164', '240215-415', 'GRUPO GERADOR 3,5KVA', '2026-09-24 12:00-03', 441.00),
  ('035789', '22052-102', 'CORTADORA PISO WOLKAN', '2026-09-25 12:00-03', 803.00),
  ('035800', '231015-225', 'GRUPO GERADOR 3,5KVA', '2026-09-25 12:00-03', 315.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- 9 - SETEMBRO/VASSOURAS - PIRAÍ - PINHERAL/07 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - SETEMBRO.pdf  (1 OM(s), R$ 625,00)
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
novo as (
  insert into boletins (cliente, base, documento, referencia, local_obra, modelo, criado_por)
  select 'RIO + SANEAMENTO BL3 S.A', 'VASSOURAS', '07', 'SETEMBRO/2026', 'RUA OTAVIO GOMES, 269 - LOJA 02 - CENTRO - VASSOURAS', 'rio_mais', u.id
  from u
  where not exists (select 1 from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '07')
  returning id
),
alvo as (
  select id from novo
  union all
  select id from boletins where cliente = 'RIO + SANEAMENTO BL3 S.A' and base = 'VASSOURAS' and referencia = 'SETEMBRO/2026' and documento is not distinct from '07'
),
oms as (
  insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, origem, incluido_por)
  select (select id from alvo limit 1), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento',
         'importado: 2026 / 9 - SETEMBRO/VASSOURAS - PIRAÍ - PINHERAL/07 BM MANUTENÇÃO - RIO + SANEAMENTO - VASSOURAS - SETEMBRO.pdf', u.id
  from u, (values
  ('035790', '240115-301', 'GRUPO GERADOR 3,5 KVA', '2026-09-25 12:00-03', 625.00)
  ) v(om, pat, equip, dia, valor)
  where (select id from alvo limit 1) is not null
  on conflict on constraint boletim_om_uma_vez do nothing
  returning 1
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select a.id, 'fechado', u.id, '2026-10-02 12:00-03', 'importado do arquivo 2026 da Rio+'
from (select id from alvo limit 1) a, u
where (select count(*) from oms) >= 0
  and not exists (select 1 from boletim_andamentos x where x.boletim_id = a.id);

-- As bases da Rio+ no cadastro, com a regional (a pasta do arquivo) e o
-- endereço do papel. A que já está no cadastro ganha só a regional, se não
-- tinha. "GSO - ITAGUAI" é como o Sisloc chama a de Itaguaí GSO: fica como
-- outro nome dela (0017), e a colagem cai na pasta certa.
insert into bases (cliente, nome, regional, local_obra, modelo, apelidos, atualizado_por)
select 'RIO + SANEAMENTO BL3 S.A', v.nome, v.regional, v.local, 'rio_mais', v.apelidos::text[], null
from (values
  ('CAMPO GRANDE - GRANDE REPARO', 'CAMPO GRANDE', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GRANDE REPARO', '{}'),
  ('CAMPO GRANDE - GSO', 'CAMPO GRANDE', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - GSO', '{}'),
  ('CAMPO GRANDE - SUBS RAMAL', 'CAMPO GRANDE', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - SUBS RAMAL', '{}'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'CAMPO GRANDE', 'RUA DOS LIMOEIROS, 118 - CAMPO GRANDE - ÁREAS IRREGULARES', '{}'),
  ('ITAGUAÍ - COMERCIAL', 'ITAGUAÍ', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI COMERCIAL', '{}'),
  ('ITAGUAÍ - GSO', 'ITAGUAÍ', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI GSO', '{GSO - ITAGUAI}'),
  ('ITAGUAÍ - PERDAS', 'ITAGUAÍ', 'RUA PREFEITO JOSE MARIA DE BRITO, 238 - MONT SERRAT - ITAGUAI PERDAS', '{}'),
  ('PINHEIRAL', 'VASSOURAS - PIRAÍ - PINHEIRAL', 'PRAÇA SÃO JORGE, S - N - CENTRO - PINHEIRAL - RJ', '{}'),
  ('PIRAÍ', 'VASSOURAS - PIRAÍ - PINHEIRAL', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ', '{}'),
  ('PIRAÍ - PERDAS', 'VASSOURAS - PIRAÍ - PINHEIRAL', 'RUA CAP MANOEL TORRES, 1345 - CENTRO - PIRAÍ PERDAS', '{}'),
  ('VASSOURAS', 'VASSOURAS - PIRAÍ - PINHEIRAL', 'RUA OTAVIO GOMES, 269 - LOJA 02 - CENTRO - VASSOURAS', '{}')
) v(nome, regional, local, apelidos)
on conflict (chave_do_nome(cliente), chave_do_nome(nome)) do update
  set regional = coalesce(bases.regional, excluded.regional),
      apelidos = (select array(select distinct unnest(bases.apelidos || excluded.apelidos)));

-- Conferência: 51 boletins, 104 OMs, R$ 64.550,00, todos fechados.
select count(*) as boletins, sum(oms) as oms, sum(valor) as valor,
       count(*) filter (where situacao = 'fechado') as fechados
from boletins_atual
where cliente = 'RIO + SANEAMENTO BL3 S.A' and modelo = 'rio_mais';

-- Por mês — tem que bater com a tabela do topo.
select referencia, count(*) as boletins, sum(oms) as oms, sum(valor) as valor
from boletins_atual
where cliente = 'RIO + SANEAMENTO BL3 S.A' and modelo = 'rio_mais'
group by referencia
order by right(referencia, 4),
         array_position(array['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO',
                              'AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'], split_part(referencia, '/', 1));

-- E a OM do arquivo que ficou de fora porque JÁ ESTAVA em outro boletim
-- (uma OM, um boletim). Vazio é o esperado.
select v.om, b.numero, b.cliente, b.base, b.referencia
from (values
  ('017278'),
  ('017279'),
  ('017284'),
  ('017274'),
  ('017287'),
  ('017045'),
  ('017537'),
  ('018369'),
  ('018370'),
  ('018374'),
  ('019021'),
  ('019019'),
  ('018375'),
  ('018371'),
  ('018354'),
  ('019022'),
  ('019027'),
  ('020225'),
  ('020473'),
  ('000183'),
  ('018904'),
  ('020212'),
  ('020200'),
  ('020201'),
  ('020474'),
  ('020477'),
  ('022284'),
  ('022035'),
  ('022425'),
  ('022431'),
  ('022512'),
  ('022583'),
  ('022606'),
  ('022434'),
  ('023870'),
  ('022427'),
  ('022513'),
  ('020809'),
  ('022585'),
  ('022604'),
  ('022889'),
  ('024844'),
  ('025008'),
  ('025035'),
  ('025011'),
  ('024060'),
  ('025009'),
  ('024044'),
  ('025015'),
  ('025023'),
  ('025016'),
  ('025622'),
  ('026697'),
  ('027532'),
  ('027524'),
  ('027534'),
  ('026365'),
  ('027537'),
  ('027527'),
  ('026698'),
  ('027522'),
  ('026709'),
  ('027529'),
  ('027930'),
  ('027999'),
  ('029268'),
  ('027964'),
  ('026366'),
  ('026367'),
  ('026368'),
  ('027942'),
  ('029137'),
  ('027458'),
  ('028668'),
  ('028661'),
  ('032178'),
  ('029639'),
  ('031104'),
  ('030467'),
  ('031164'),
  ('031447'),
  ('030387'),
  ('033276'),
  ('033944'),
  ('033280'),
  ('032685'),
  ('032435'),
  ('033430'),
  ('034288'),
  ('032686'),
  ('033296'),
  ('034675'),
  ('035330'),
  ('036632'),
  ('031727'),
  ('033852'),
  ('034541'),
  ('037046'),
  ('037056'),
  ('037060'),
  ('035164'),
  ('035789'),
  ('035800'),
  ('035790')
) v(om)
join boletim_oms i on i.om = v.om
join boletins b on b.id = i.boletim_id
where not (b.cliente = 'RIO + SANEAMENTO BL3 S.A' and b.modelo = 'rio_mais' and i.origem like 'importado: 2026 / %');
