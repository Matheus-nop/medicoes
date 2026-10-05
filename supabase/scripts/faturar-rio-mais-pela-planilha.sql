-- =====================================================================
-- Rio+ Saneamento: o que já foi faturado, pela planilha "RIO + SANEAMENTOS"
-- (rode DEPOIS de importar-boletins-rio-mais-2026.sql; pode rodar duas vezes)
-- =====================================================================
--
-- Os 51 boletins importados estão FECHADOS. Aqui:
--   · todos passam a ENVIADO, na data de emissão (dia 2 do mês seguinte) —
--     foram ao cliente;
--   · 39 passam a FATURADO (R$ 45.728,00), com a NF na observação;
--   · 12 ficam ENVIADO, esperando nota (R$ 18.822,00) — é exatamente a
--     manutenção pendente da última aba da planilha (MEDIÇÕES SETEMBRO 2026).
--
-- Como se leu a planilha: cada aba lista o que estava em aberto naquele mês.
-- O boletim que sai das abas seguintes foi faturado; a NF é a da linha dele, ou
-- a da linha da mesma base em que o valor foi somado (a planilha junta meses
-- numa nota só: NF 52862 = 121 + 3.350 + 2.162 do Campo Grande GSO).
--
-- Quatro casos lidos à mão:
--   · Campo Grande Subs Ramal, janeiro (714): a planilha põe o valor no bloco
--     do Grande Reparo (241 + 1.066 + 714 = 2.021, NF 52625).
--   · Campo Grande GSO, fevereiro (2.228): a planilha divide em 1.516 no GSO e
--     712 no Setor Perdas — as duas partes na NF 52625.
--   · Campo Grande Áreas Irregulares, março (428) e abril (624): saem da
--     planilha na aba de julho sem NF própria. Entram como faturados, com
--     "conferir a nota" na observação.
--   · Campo Grande GSO, março e abril: a NF está escrita "41" na planilha.
--
-- Um andamento novo por boletim, nunca apagando o anterior. Quem: matheus@novaopcaoequipamentos.com.br.
-- =====================================================================

set search_path = medicoes, public;

-- 1. Enviados: os que ainda estão fechados.
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
v(base, referencia, documento, em) as (values
  ('ITAGUAÍ - PERDAS', 'DEZEMBRO/2025', '03', '2026-01-02 12:00-03'),
  ('PIRAÍ', 'DEZEMBRO/2025', '02', '2026-01-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'JANEIRO/2026', '04', '2026-02-02 12:00-03'),
  ('CAMPO GRANDE - SUBS RAMAL', 'JANEIRO/2026', '01', '2026-02-02 12:00-03'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'JANEIRO/2026', '02', '2026-02-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'JANEIRO/2026', '04', '2026-02-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'FEVEREIRO/2026', '05', '2026-03-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'FEVEREIRO/2026', '05', '2026-03-02 12:00-03'),
  ('ITAGUAÍ - PERDAS', 'FEVEREIRO/2026', '04', '2026-03-02 12:00-03'),
  ('CAMPO GRANDE - GRANDE REPARO', 'MARÇO/2026', '04', '2026-04-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'MARÇO/2026', '06', '2026-04-02 12:00-03'),
  ('CAMPO GRANDE - SUBS RAMAL', 'MARÇO/2026', '02', '2026-04-02 12:00-03'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'MARÇO/2026', '03', '2026-04-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'MARÇO/2026', '06', '2026-04-02 12:00-03'),
  ('ITAGUAÍ - PERDAS', 'MARÇO/2026', '05', '2026-04-02 12:00-03'),
  ('VASSOURAS', 'MARÇO/2026', '03', '2026-04-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'ABRIL/2026', '07', '2026-05-02 12:00-03'),
  ('CAMPO GRANDE - SUBS RAMAL', 'ABRIL/2026', '03', '2026-05-02 12:00-03'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'ABRIL/2026', '04', '2026-05-02 12:00-03'),
  ('ITAGUAÍ - COMERCIAL', 'ABRIL/2026', '01', '2026-05-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'ABRIL/2026', '06', '2026-05-02 12:00-03'),
  ('PIRAÍ', 'ABRIL/2026', '03', '2026-05-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'MAIO/2026', '08', '2026-06-02 12:00-03'),
  ('CAMPO GRANDE - SUBS RAMAL', 'MAIO/2026', '04', '2026-06-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'MAIO/2026', '07', '2026-06-02 12:00-03'),
  ('ITAGUAÍ - PERDAS', 'MAIO/2026', '06', '2026-06-02 12:00-03'),
  ('PINHEIRAL', 'MAIO/2026', '01', '2026-06-02 12:00-03'),
  ('PIRAÍ', 'MAIO/2026', '04', '2026-06-02 12:00-03'),
  ('VASSOURAS', 'MAIO/2026', '04', '2026-06-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'JUNHO/2026', '09', '2026-07-02 12:00-03'),
  ('CAMPO GRANDE - SUBS RAMAL', 'JUNHO/2026', '05', '2026-07-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'JUNHO/2026', '08', '2026-07-02 12:00-03'),
  ('ITAGUAÍ - PERDAS', 'JUNHO/2026', '07', '2026-07-02 12:00-03'),
  ('PIRAÍ', 'JUNHO/2026', '05', '2026-07-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'JULHO/2026', '10', '2026-08-02 12:00-03'),
  ('CAMPO GRANDE - SUBS RAMAL', 'JULHO/2026', '06', '2026-08-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'JULHO/2026', '09', '2026-08-02 12:00-03'),
  ('PIRAÍ', 'JULHO/2026', '06', '2026-08-02 12:00-03'),
  ('PIRAÍ - PERDAS', 'JULHO/2026', '01', '2026-08-02 12:00-03'),
  ('VASSOURAS', 'JULHO/2026', '05', '2026-08-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'AGOSTO/2026', '11', '2026-09-02 12:00-03'),
  ('CAMPO GRANDE - SUBS RAMAL', 'AGOSTO/2026', '07', '2026-09-02 12:00-03'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'AGOSTO/2026', '05', '2026-09-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'AGOSTO/2026', '10', '2026-09-02 12:00-03'),
  ('PIRAÍ', 'AGOSTO/2026', '07', '2026-09-02 12:00-03'),
  ('VASSOURAS', 'AGOSTO/2026', '06', '2026-09-02 12:00-03'),
  ('CAMPO GRANDE - GSO', 'SETEMBRO/2026', '12', '2026-10-02 12:00-03'),
  ('ITAGUAÍ - GSO', 'SETEMBRO/2026', '11', '2026-10-02 12:00-03'),
  ('ITAGUAÍ - PERDAS', 'SETEMBRO/2026', '08', '2026-10-02 12:00-03'),
  ('PIRAÍ', 'SETEMBRO/2026', '08', '2026-10-02 12:00-03'),
  ('VASSOURAS', 'SETEMBRO/2026', '07', '2026-10-02 12:00-03')
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select b.id, 'enviado', u.id, v.em::timestamptz, 'enviado ao cliente (planilha RIO+ SANEAMENTOS)'
from v
join boletins b on b.cliente = 'RIO + SANEAMENTO BL3 S.A' and b.base = v.base and b.referencia = v.referencia
               and b.documento is not distinct from v.documento
join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'fechado'
cross join u;

-- 2. Faturados: os que estão enviados e ainda não têm o faturado.
with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
v(base, referencia, documento, em, observacao) as (values
  ('ITAGUAÍ - PERDAS', 'DEZEMBRO/2025', '03', '2026-01-07 18:00-03', 'NF 52410 (planilha RIO+ SANEAMENTOS)'),
  ('PIRAÍ', 'DEZEMBRO/2025', '02', '2026-02-02 18:00-03', 'NF 52413 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - GSO', 'JANEIRO/2026', '04', '2026-07-07 18:00-03', 'NF 52862 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - SUBS RAMAL', 'JANEIRO/2026', '01', '2026-03-10 18:00-03', 'NF 52625 — na planilha o valor aparece no bloco do Grande Reparo (241 + 1.066 + 714 = 2.021) (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'JANEIRO/2026', '02', '2026-08-20 18:00-03', 'NF 52440 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - GSO', 'JANEIRO/2026', '04', '2026-02-02 18:00-03', 'NF 52412 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - GSO', 'FEVEREIRO/2026', '05', '2026-03-10 18:00-03', 'NF 52625 — a planilha divide os 2.228 do BM: 1.516 no GSO e 712 no Setor Perdas (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - GSO', 'FEVEREIRO/2026', '05', '2026-03-04 18:00-03', 'NF 52414 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - PERDAS', 'FEVEREIRO/2026', '04', '2026-04-08 18:00-03', 'NF 52417 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - GSO', 'MARÇO/2026', '06', '2026-08-20 18:00-03', 'NF 41 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - SUBS RAMAL', 'MARÇO/2026', '02', '2026-04-17 18:00-03', 'NF 52418 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'MARÇO/2026', '03', '2026-07-31 18:00-03', 'sai da planilha na aba de julho sem NF própria — conferir a nota (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - GSO', 'MARÇO/2026', '06', '2026-04-02 18:00-03', 'NF 52415 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - PERDAS', 'MARÇO/2026', '05', '2026-05-05 18:00-03', 'NF 52419 (planilha RIO+ SANEAMENTOS)'),
  ('VASSOURAS', 'MARÇO/2026', '03', '2026-04-08 18:00-03', 'NF 52416 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - GSO', 'ABRIL/2026', '07', '2026-08-20 18:00-03', 'NF 41 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - SUBS RAMAL', 'ABRIL/2026', '03', '2026-05-21 18:00-03', 'NF 52422 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'ABRIL/2026', '04', '2026-07-31 18:00-03', 'sai da planilha na aba de julho sem NF própria — conferir a nota (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - COMERCIAL', 'ABRIL/2026', '01', '2026-05-02 18:00-03', 'NF 52423 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - GSO', 'ABRIL/2026', '06', '2026-05-08 18:00-03', 'NF 52420 (planilha RIO+ SANEAMENTOS)'),
  ('PIRAÍ', 'ABRIL/2026', '03', '2026-05-11 18:00-03', 'NF 52421 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - SUBS RAMAL', 'MAIO/2026', '04', '2026-06-02 18:00-03', 'NF 52427 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - GSO', 'MAIO/2026', '07', '2026-06-02 18:00-03', 'NF 52424 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - PERDAS', 'MAIO/2026', '06', '2026-07-02 18:00-03', 'NF 52429 (planilha RIO+ SANEAMENTOS)'),
  ('PINHEIRAL', 'MAIO/2026', '01', '2026-06-02 18:00-03', 'NF 52792 (planilha RIO+ SANEAMENTOS)'),
  ('PIRAÍ', 'MAIO/2026', '04', '2026-06-02 18:00-03', 'NF 52428 (planilha RIO+ SANEAMENTOS)'),
  ('VASSOURAS', 'MAIO/2026', '04', '2026-06-02 18:00-03', 'NF 52425 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - SUBS RAMAL', 'JUNHO/2026', '05', '2026-08-19 18:00-03', 'NF 52439 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - GSO', 'JUNHO/2026', '08', '2026-07-07 18:00-03', 'NF 52432 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - PERDAS', 'JUNHO/2026', '07', '2026-07-02 18:00-03', 'NF 52430 (planilha RIO+ SANEAMENTOS)'),
  ('PIRAÍ', 'JUNHO/2026', '05', '2026-07-02 18:00-03', 'NF 52433 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - GSO', 'JULHO/2026', '09', '2026-08-10 18:00-03', 'NF 52436 (planilha RIO+ SANEAMENTOS)'),
  ('PIRAÍ', 'JULHO/2026', '06', '2026-08-02 18:00-03', 'NF 52437 (planilha RIO+ SANEAMENTOS)'),
  ('PIRAÍ - PERDAS', 'JULHO/2026', '01', '2026-08-02 18:00-03', 'NF 52438 (planilha RIO+ SANEAMENTOS)'),
  ('VASSOURAS', 'JULHO/2026', '05', '2026-08-02 18:00-03', 'NF 52435 (planilha RIO+ SANEAMENTOS)'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'AGOSTO/2026', '05', '2026-09-02 18:00-03', 'NF 52445 (planilha RIO+ SANEAMENTOS)'),
  ('ITAGUAÍ - GSO', 'AGOSTO/2026', '10', '2026-09-09 18:00-03', 'NF 52444 (planilha RIO+ SANEAMENTOS)'),
  ('PIRAÍ', 'AGOSTO/2026', '07', '2026-09-02 18:00-03', 'NF 52442 (planilha RIO+ SANEAMENTOS)'),
  ('VASSOURAS', 'AGOSTO/2026', '06', '2026-09-02 18:00-03', 'NF 52441 (planilha RIO+ SANEAMENTOS)')
)
insert into boletim_andamentos (boletim_id, situacao, quem, em, observacao)
select b.id, 'faturado', u.id, v.em::timestamptz, v.observacao
from v
join boletins b on b.cliente = 'RIO + SANEAMENTO BL3 S.A' and b.base = v.base and b.referencia = v.referencia
               and b.documento is not distinct from v.documento
join boletim_situacao s on s.boletim_id = b.id and s.situacao = 'enviado'
cross join u;

-- Conferência: 39 faturados (R$ 45.728,00) e 12 enviados (R$ 18.822,00).
select situacao, count(*) as boletins, sum(valor) as valor, sum(valor - faturado) as saldo
from boletins_atual
where cliente = 'RIO + SANEAMENTO BL3 S.A' and modelo = 'rio_mais'
group by situacao
order by situacao;

-- O que fica a faturar, base por base — tem que bater com a manutenção da aba
-- MEDIÇÕES SETEMBRO 2026.
select base, string_agg(initcap(split_part(referencia, '/', 1)), ', ' order by min_ref) as meses, sum(valor) as a_faturar
from (select base, referencia, valor, primeira_om as min_ref from boletins_atual
      where cliente = 'RIO + SANEAMENTO BL3 S.A' and modelo = 'rio_mais' and situacao <> 'faturado') x
group by base
order by base;
