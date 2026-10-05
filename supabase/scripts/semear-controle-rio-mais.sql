-- =====================================================================
-- O controle da Rio+ Saneamento, pela planilha "RIO + SANEAMENTOS"
-- (dezembro/2025 a setembro/2026; rode no SQL Editor, pode rodar duas vezes)
-- =====================================================================
--
-- Cada aba da planilha ("MEDIÇÕES ENVIADAS EM SETEMBRO / 2026") é a foto do
-- que estava em aberto naquele mês, base por base: locação, manutenção e
-- indenização, com o valor medido e, quando houve nota, o faturado. Aqui cada
-- aba vira o período do mesmo mês (a aba SETEMBRO é o período Setembro 2026 —
-- na Rio+ o nome da aba já é o mês da medição), e cada base vira uma região.
--
-- O medido do mês é o que entrou na aba e não estava na anterior; o faturado
-- é a coluna VALOR FATURADO, mais o que sumiu da planilha de um mês para o
-- outro (a planilha junta meses numa nota só, na linha de um deles). Com isso o
-- saldo de cada período é exatamente o "SALDO A FATURAR" da aba:
--
--   Dezembro 2025   medido   151.441,34  faturado    56.073,34  saldo    95.368,00
--   Janeiro 2026    medido    70.151,72  faturado   113.287,73  saldo    52.231,99
--   Fevereiro 2026  medido   183.969,37  faturado   141.009,38  saldo    95.191,98
--   Março 2026      medido    71.534,21  faturado    66.695,98  saldo   100.030,21
--   Abril 2026      medido    25.721,98  faturado    61.862,99  saldo    63.889,20
--   Maio 2026       medido    64.223,00  faturado    41.246,00  saldo    86.866,20
--   Junho 2026      medido    70.173,87  faturado    94.971,08  saldo    62.068,99
--   Julho 2026      medido    62.234,33  faturado    63.215,33  saldo    61.087,99
--   Agosto 2026     medido    66.799,67  faturado    54.010,99  saldo    73.876,67
--   Setembro 2026   medido    72.344,67  faturado    18.972,67  saldo   127.248,67
--
-- Dezembro/2025 é a abertura: o medido dele inclui o que estava em aberto de
-- meses anteriores. Antes disso o controle da Rio+ não tem histórico.
--
-- Casos lidos à mão (estão na observação da célula):
--   · Itaguaí Comercial, fevereiro: a NF 63349 (15.950,00) junta quatro meses
--     de locação (4 × 2.400) e a indenização de 6.350,00 — separadas aqui.
--   · Itaguaí Perdas, abril: a indenização de janeiro foi revista de 79.110 para
--     35.290 — medido negativo de 43.820, o ajuste.
--   · Campo Grande Áreas Irregulares, julho: a manutenção de março e abril
--     (1.052) sai faturada junto da locação (NF 65192).
--
-- As linhas entram com `quem` nulo: vieram da planilha.
-- Um comando por período: se a colagem cortar, rode de novo.
-- =====================================================================

set search_path = medicoes, public;

insert into controle_regioes (cliente, nome, ordem)
select 'RIO + SANEAMENTO BL3 S.A', nome, ordem from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 1),
  ('CAMPO GRANDE - GSO', 2),
  ('CAMPO GRANDE - GRANDE REPARO', 3),
  ('CAMPO GRANDE - PERDAS', 4),
  ('CAMPO GRANDE - SUBS RAMAL', 5),
  ('ITAGUAÍ - COMERCIAL', 6),
  ('ITAGUAÍ - GSO', 7),
  ('ITAGUAÍ - PERDAS', 8),
  ('PINHEIRAL', 9),
  ('PIRAÍ', 10),
  ('PIRAÍ - METRO II', 11),
  ('PIRAÍ - PERDAS', 12),
  ('VASSOURAS', 13)
) v(nome, ordem)
on conflict (cliente, nome) do nothing;

insert into controle_periodos (cliente, mes, rotulo)
select 'RIO + SANEAMENTO BL3 S.A', mes, rotulo from (values
  ('2025-12-01'::date, 'Dezembro 2025'),
  ('2026-01-01'::date, 'Janeiro 2026'),
  ('2026-02-01'::date, 'Fevereiro 2026'),
  ('2026-03-01'::date, 'Março 2026'),
  ('2026-04-01'::date, 'Abril 2026'),
  ('2026-05-01'::date, 'Maio 2026'),
  ('2026-06-01'::date, 'Junho 2026'),
  ('2026-07-01'::date, 'Julho 2026'),
  ('2026-08-01'::date, 'Agosto 2026'),
  ('2026-09-01'::date, 'Setembro 2026')
) v(mes, rotulo)
on conflict (cliente, mes) do nothing;

-- Dezembro 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'manutencao', 533.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 3000.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('CAMPO GRANDE - GSO', 'manutencao', 3471.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('CAMPO GRANDE - GSO', 'locacao', 11548.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('CAMPO GRANDE - GRANDE REPARO', 'manutencao', 1307.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1886.67, 1886.67, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('CAMPO GRANDE - PERDAS', 'manutencao', 549.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('CAMPO GRANDE - PERDAS', 'locacao', 4100.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 2080.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 7200.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('ITAGUAÍ - GSO', 'manutencao', 1496.0, 1496.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('ITAGUAÍ - GSO', 'locacao', 12990.0, 12990.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('ITAGUAÍ - PERDAS', 'manutencao', 4569.0, 250.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('ITAGUAÍ - PERDAS', 'locacao', 64120.0, 16030.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('PIRAÍ', 'manutencao', 916.0, 0.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('PIRAÍ', 'locacao', 19804.67, 9469.67, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 570.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('VASSOURAS', 'manutencao', 3765.0, 3765.0, 'abertura: inclui o que estava em aberto de meses anteriores'),
  ('VASSOURAS', 'locacao', 7536.0, 7536.0, 'abertura: inclui o que estava em aberto de meses anteriores')
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2025-12-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Janeiro 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'manutencao', 102.0, 0.0, null),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 3000.0, 6000.0, null),
  ('CAMPO GRANDE - GSO', 'manutencao', 2162.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 12220.7, 11548.03, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.01, 1820.01, null),
  ('CAMPO GRANDE - PERDAS', 'locacao', 2050.0, 0.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'manutencao', 714.0, 0.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 2080.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 2400.0, 0.0, null),
  ('ITAGUAÍ - GSO', 'manutencao', 828.0, 828.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 12990.02, 12990.02, null),
  ('ITAGUAÍ - PERDAS', 'manutencao', 0.0, 4319.0, '4.319,00 saíram da planilha sem NF própria (faturados junto de outra linha)'),
  ('ITAGUAÍ - PERDAS', 'locacao', 14853.32, 48090.0, '48.090,00 saíram da planilha sem NF própria (faturados junto de outra linha)'),
  ('PIRAÍ', 'manutencao', 0.0, 916.0, null),
  ('PIRAÍ', 'locacao', 10791.67, 21126.67, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 0.0, null),
  ('VASSOURAS', 'locacao', 3570.0, 3570.0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-01-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Fevereiro 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'manutencao', 686.0, 1219.0, '533,00 saíram da planilha sem NF própria (faturados junto de outra linha)'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 3000.0, 3000.01, null),
  ('CAMPO GRANDE - GSO', 'manutencao', 1516.0, 1516.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 13860.0, 26080.67, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'manutencao', 714.0, 2021.0, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.0, 1820.0, null),
  ('CAMPO GRANDE - PERDAS', 'manutencao', 712.0, 1261.0, null),
  ('CAMPO GRANDE - PERDAS', 'locacao', 2050.0, 0.0, null),
  ('CAMPO GRANDE - PERDAS', 'indenizacao', 39387.0, 39387.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'manutencao', 0.0, 714.0, '714,00 saíram da planilha sem NF própria (faturados junto de outra linha)'),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 2080.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 950.0, 10550.0, null),
  ('ITAGUAÍ - COMERCIAL', 'indenizacao', 6350.0, 6350.0, null),
  ('ITAGUAÍ - GSO', 'manutencao', 298.0, 298.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 12990.01, 12990.01, null),
  ('ITAGUAÍ - PERDAS', 'manutencao', 1577.0, 0.0, null),
  ('ITAGUAÍ - PERDAS', 'locacao', 1204.36, 16057.68, null),
  ('ITAGUAÍ - PERDAS', 'indenizacao', 79110.0, 0.0, null),
  ('PIRAÍ', 'locacao', 11525.0, 11525.01, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 570.0, null),
  ('VASSOURAS', 'locacao', 3570.0, 3570.0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-02-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Março 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'manutencao', 428.0, 0.0, null),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 1353.34, -0.01, null),
  ('CAMPO GRANDE - GSO', 'manutencao', 5282.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 14890.0, 14890.0, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'manutencao', 3611.0, 0.0, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.0, 1820.0, null),
  ('CAMPO GRANDE - PERDAS', 'locacao', 0.0, 8200.0, '8.200,00 saíram da planilha sem NF própria (faturados junto de outra linha)'),
  ('CAMPO GRANDE - SUBS RAMAL', 'manutencao', 396.0, 396.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 2080.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 1078.86, 0.0, null),
  ('ITAGUAÍ - GSO', 'manutencao', 589.0, 589.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 13040.0, 13040.0, null),
  ('ITAGUAÍ - PERDAS', 'manutencao', 1022.0, 1577.0, null),
  ('ITAGUAÍ - PERDAS', 'locacao', 5130.34, 5165.0, null),
  ('PIRAÍ', 'locacao', 12772.0, 12771.99, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 1140.0, null),
  ('PIRAÍ - PERDAS', 'locacao', 2444.67, 0.0, null),
  ('VASSOURAS', 'manutencao', 1457.0, 1457.0, null),
  ('VASSOURAS', 'locacao', 3570.0, 3570.0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-03-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Abril 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'manutencao', 624.0, 0.0, null),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 400.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'manutencao', 8402.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 14890.0, 14890.0, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.0, 1820.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'manutencao', 396.0, 396.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 2080.0, null),
  ('ITAGUAÍ - COMERCIAL', 'manutencao', 405.0, 0.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 1280.0, 0.0, null),
  ('ITAGUAÍ - GSO', 'manutencao', 1576.0, 1576.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 13140.0, 13140.0, null),
  ('ITAGUAÍ - PERDAS', 'manutencao', 0.0, 1022.0, null),
  ('ITAGUAÍ - PERDAS', 'locacao', 4720.0, 4685.34, null),
  ('ITAGUAÍ - PERDAS', 'indenizacao', -43820.0, 0.0, 'a indenização de janeiro foi revista na planilha: de 79.110,00 para 35.290,00'),
  ('PIRAÍ', 'manutencao', 409.0, 409.0, null),
  ('PIRAÍ', 'locacao', 11469.33, 11469.33, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 570.0, null),
  ('PIRAÍ - PERDAS', 'locacao', 3699.99, 6144.66, null),
  ('VASSOURAS', 'locacao', 3660.66, 3660.66, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-04-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Maio 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 520.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'manutencao', 1034.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 15170.0, 0.0, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.0, 1820.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'manutencao', 369.0, 369.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 2080.0, null),
  ('ITAGUAÍ - COMERCIAL', 'manutencao', 0.0, 405.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 1280.0, 3638.0, null),
  ('ITAGUAÍ - GSO', 'manutencao', 1289.0, 1289.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 13140.0, 13140.0, null),
  ('ITAGUAÍ - PERDAS', 'manutencao', 360.0, 0.0, null),
  ('ITAGUAÍ - PERDAS', 'locacao', 4286.0, 0.0, null),
  ('PINHEIRAL', 'manutencao', 1623.0, 1623.0, null),
  ('PIRAÍ', 'manutencao', 224.0, 224.0, null),
  ('PIRAÍ', 'locacao', 11635.0, 11635.0, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 0.0, null),
  ('PIRAÍ - PERDAS', 'locacao', 3800.0, 0.0, null),
  ('VASSOURAS', 'manutencao', 773.0, 773.0, null),
  ('VASSOURAS', 'locacao', 4250.0, 4250.0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-05-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Junho 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 4393.68, 3525.01, null),
  ('CAMPO GRANDE - GSO', 'manutencao', 1691.0, 5633.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 15190.0, 30360.0, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.0, 1820.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'manutencao', 383.0, 0.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 0.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 1280.0, 1280.87, null),
  ('ITAGUAÍ - GSO', 'manutencao', 1745.0, 1745.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 13547.86, 13547.86, null),
  ('ITAGUAÍ - PERDAS', 'manutencao', 388.0, 748.0, null),
  ('ITAGUAÍ - PERDAS', 'locacao', 4115.0, 8401.0, null),
  ('PIRAÍ', 'manutencao', 2772.0, 2772.0, null),
  ('PIRAÍ', 'locacao', 11955.66, 11955.67, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 1140.0, null),
  ('PIRAÍ - PERDAS', 'locacao', 3800.0, 7600.0, null),
  ('VASSOURAS', 'locacao', 4442.67, 4442.67, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-06-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Julho 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'manutencao', 0.0, 1154.0, '1.052,00 saíram da planilha sem NF própria (faturados junto de outra linha)'),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', -32.0, 3110.01, 'a locação de julho foi revista na planilha: de 3.010,00 para 2.978,00'),
  ('CAMPO GRANDE - GSO', 'manutencao', 1162.0, 13684.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 14090.0, 0.0, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.0, 0.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'manutencao', 310.0, 383.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 2080.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 1280.0, 1280.0, null),
  ('ITAGUAÍ - GSO', 'manutencao', 631.0, 631.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 13279.33, 13279.33, null),
  ('ITAGUAÍ - PERDAS', 'locacao', 4605.0, 4605.0, null),
  ('PIRAÍ', 'manutencao', 148.0, 148.0, null),
  ('PIRAÍ', 'locacao', 12305.0, 12304.99, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 570.0, null),
  ('PIRAÍ - PERDAS', 'manutencao', 544.0, 544.0, null),
  ('PIRAÍ - PERDAS', 'locacao', 3800.0, 3800.0, null),
  ('VASSOURAS', 'manutencao', 692.0, 692.0, null),
  ('VASSOURAS', 'locacao', 4950.0, 4950.0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-07-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Agosto 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'manutencao', 396.0, 396.0, null),
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 3010.0, 3010.0, null),
  ('CAMPO GRANDE - GSO', 'manutencao', 1185.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 13892.67, 14090.0, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.0, 3640.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'manutencao', 758.0, 0.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2068.0, 0.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 1280.0, -0.01, null),
  ('ITAGUAÍ - GSO', 'manutencao', 1232.0, 1232.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 13430.0, 13430.0, null),
  ('ITAGUAÍ - PERDAS', 'locacao', 5715.0, 0.0, null),
  ('PIRAÍ', 'manutencao', 148.0, 148.0, null),
  ('PIRAÍ', 'locacao', 12305.0, 12305.0, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 570.0, null),
  ('PIRAÍ - PERDAS', 'locacao', 3800.0, 0.0, null),
  ('VASSOURAS', 'manutencao', 240.0, 240.0, null),
  ('VASSOURAS', 'locacao', 4950.0, 4950.0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-08-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Setembro 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('CAMPO GRANDE - ÁREAS IRREGULARES', 'locacao', 4170.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'manutencao', 3286.0, 0.0, null),
  ('CAMPO GRANDE - GSO', 'locacao', 14369.33, 13892.67, null),
  ('CAMPO GRANDE - GRANDE REPARO', 'locacao', 1820.0, 0.0, null),
  ('CAMPO GRANDE - SUBS RAMAL', 'locacao', 2080.0, 0.0, null),
  ('ITAGUAÍ - COMERCIAL', 'locacao', 1280.0, 1280.0, null),
  ('ITAGUAÍ - GSO', 'manutencao', 3065.0, 0.0, null),
  ('ITAGUAÍ - GSO', 'locacao', 12534.34, 0.0, null),
  ('ITAGUAÍ - PERDAS', 'manutencao', 536.0, 0.0, null),
  ('ITAGUAÍ - PERDAS', 'locacao', 5395.0, 0.0, null),
  ('PIRAÍ', 'manutencao', 1559.0, 0.0, null),
  ('PIRAÍ', 'locacao', 12305.0, 0.0, null),
  ('PIRAÍ - METRO II', 'locacao', 570.0, 0.0, null),
  ('PIRAÍ - PERDAS', 'locacao', 3800.0, 3800.0, null),
  ('VASSOURAS', 'manutencao', 625.0, 0.0, null),
  ('VASSOURAS', 'locacao', 4950.0, 0.0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'RIO + SANEAMENTO BL3 S.A' and p.mes = '2026-09-01'
join controle_regioes  g on g.cliente = 'RIO + SANEAMENTO BL3 S.A' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Conferência: o saldo de cada período tem de ser o SALDO A FATURAR da aba
-- (setembro: 127.248,67).
select rotulo, medido, faturado, saldo
from controle_mes
where cliente = 'RIO + SANEAMENTO BL3 S.A'
order by mes;
