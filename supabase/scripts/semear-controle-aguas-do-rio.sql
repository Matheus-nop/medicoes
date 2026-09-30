-- =====================================================================
-- A planilha "CONTROLE DE MEDIÇÕES" (Águas do Rio / AEGEA) para o controle
-- Rode DEPOIS da 0005, no SQL Editor. Pode rodar duas vezes: região e período
-- que já existem ficam, e célula que já tem valor não é sobrescrita.
--
-- Gerado das abas mensais (ABR 2025 a SET 2026). Só entram as células que a
-- planilha preencheu; "-" e vazio ficam de fora (o painel lê como zero).
-- As linhas entram com `quem` nulo: vieram da planilha, não de alguém logado.
--
-- É um comando por período. Se a colagem cortar, o que chegou inteiro entrou,
-- e rodar de novo completa o resto.
-- =====================================================================

set search_path = medicoes, public;

insert into controle_regioes (cliente, nome, ordem)
select 'ÁGUAS DO RIO / AEGEA', nome, ordem from (values
  ('NORTE', 1),
  ('VILA KOSMOS', 2),
  ('SUL', 3),
  ('LESTE', 4),
  ('BAIXADA I', 5),
  ('BAIXADA II', 6),
  ('COMUNIDADE', 7),
  ('INTERIOR', 8),
  ('GRANDE DIÂMETRO', 9),
  ('VCG', 10)
) v(nome, ordem)
on conflict (cliente, nome) do nothing;

insert into controle_periodos (cliente, mes, rotulo)
select 'ÁGUAS DO RIO / AEGEA', mes, rotulo from (values
  ('2025-04-01'::date, 'Abril 2025'),
  ('2025-05-01'::date, 'Maio 2025'),
  ('2025-07-01'::date, 'Jun/Jul 2025'),
  ('2025-08-01'::date, 'Agosto 2025'),
  ('2025-09-01'::date, 'Setembro 2025'),
  ('2025-10-01'::date, 'Outubro 2025'),
  ('2025-11-01'::date, 'Novembro 2025'),
  ('2025-12-01'::date, 'Dezembro 2025'),
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

-- Abril 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 78537, 0, null),
  ('NORTE', 'locacao', 56429.99, 55669.99, null),
  ('SUL', 'manutencao', 78598, 0, null),
  ('SUL', 'locacao', 147815.8, 226413.48, null),
  ('LESTE', 'manutencao', 16949, 0, null),
  ('LESTE', 'locacao', 259920, 172520.2, null),
  ('BAIXADA I', 'manutencao', 2913, 0, null),
  ('BAIXADA I', 'locacao', 125399.77, 125399.77, null),
  ('BAIXADA II', 'manutencao', 38436, 0, null),
  ('BAIXADA II', 'locacao', 50608, 0, null),
  ('COMUNIDADE', 'manutencao', 5178, 0, null),
  ('COMUNIDADE', 'locacao', 46169, 0, null),
  ('INTERIOR', 'locacao', 12225, 12225, null),
  ('GRANDE DIÂMETRO', 'manutencao', 23416, 0, null),
  ('GRANDE DIÂMETRO', 'locacao', 23542.67, 0, null),
  ('VCG', 'manutencao', 5610, 0, null),
  ('VCG', 'locacao', 163003.34, 0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2025-04-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Maio 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 71358, 0, null),
  ('NORTE', 'locacao', 56094.4, 0, null),
  ('SUL', 'locacao', 52568.94, 52669.5, null),
  ('LESTE', 'manutencao', 30088, 0, null),
  ('LESTE', 'locacao', 133680, 151280.06, null),
  ('BAIXADA I', 'manutencao', 2913, 0, null),
  ('BAIXADA I', 'locacao', 44180, 38039.77, null),
  ('BAIXADA II', 'manutencao', 38584, 0, null),
  ('BAIXADA II', 'locacao', 101216, 51503, null),
  ('COMUNIDADE', 'manutencao', 5178, 54047.02, null),
  ('COMUNIDADE', 'locacao', 95061.5, 0, null),
  ('INTERIOR', 'locacao', 12225, 0, null),
  ('GRANDE DIÂMETRO', 'manutencao', 23416, 45759.54, null),
  ('GRANDE DIÂMETRO', 'locacao', 24333.33, 0, null),
  ('VCG', 'manutencao', 8234, 167918.75, null),
  ('VCG', 'locacao', 325873.34, 0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2025-05-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Jun/Jul 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 118309, 0, null),
  ('NORTE', 'locacao', 96798.38, 0, null),
  ('SUL', 'manutencao', 14845, 0, null),
  ('SUL', 'locacao', 77127, 0, null),
  ('LESTE', 'manutencao', 75199, 0, null),
  ('LESTE', 'locacao', 62518, 0, null),
  ('BAIXADA I', 'locacao', 47175.67, 0, null),
  ('BAIXADA II', 'manutencao', 55441, 0, null),
  ('BAIXADA II', 'locacao', 99978.49, 0, null),
  ('COMUNIDADE', 'manutencao', 13873, 0, null),
  ('COMUNIDADE', 'locacao', 105321.5, 0, null),
  ('INTERIOR', 'locacao', 12225, 0, null),
  ('GRANDE DIÂMETRO', 'manutencao', 20904, 0, null),
  ('GRANDE DIÂMETRO', 'locacao', 28768.34, 0, null),
  ('VCG', 'manutencao', 39232, 0, null),
  ('VCG', 'locacao', 502087.06, 0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2025-07-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Agosto 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 85682, 0, null),
  ('NORTE', 'locacao', 52680.4, 0, null),
  ('SUL', 'manutencao', 35434.5, 0, null),
  ('SUL', 'locacao', 51008.14, 0, null),
  ('LESTE', 'manutencao', 93093, 0, null),
  ('LESTE', 'locacao', 55426.7, 0, null),
  ('BAIXADA I', 'manutencao', 3688, 0, null),
  ('BAIXADA I', 'locacao', 48494, 0, null),
  ('BAIXADA II', 'manutencao', 60930, 0, null),
  ('BAIXADA II', 'locacao', 49079, 0, null),
  ('COMUNIDADE', 'manutencao', 5726, 0, null),
  ('COMUNIDADE', 'locacao', 53320.2, 0, null),
  ('INTERIOR', 'manutencao', 3020, 0, null),
  ('INTERIOR', 'locacao', 12225, 0, null),
  ('GRANDE DIÂMETRO', 'manutencao', 9155, 0, null),
  ('GRANDE DIÂMETRO', 'locacao', 13518.33, 0, null),
  ('VCG', 'manutencao', 56814, 0, null),
  ('VCG', 'locacao', 349334.94, 0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2025-08-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Setembro 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 89222, 0, null),
  ('NORTE', 'locacao', 49509.67, 0, null),
  ('NORTE', 'indenizacao', 94166.17, 0, null),
  ('SUL', 'manutencao', 33158, 0, null),
  ('SUL', 'locacao', 48923.47, 0, null),
  ('LESTE', 'manutencao', 122506, 0, null),
  ('LESTE', 'locacao', 125906.7, 0, null),
  ('BAIXADA I', 'manutencao', 17647, 0, null),
  ('BAIXADA I', 'locacao', 48770, 0, null),
  ('BAIXADA II', 'manutencao', 67425.78, 0, null),
  ('BAIXADA II', 'locacao', 91733.07, 0, null),
  ('BAIXADA II', 'indenizacao', 67825, 0, null),
  ('COMUNIDADE', 'manutencao', 10611, 0, null),
  ('COMUNIDADE', 'locacao', 56360.94, 0, null),
  ('INTERIOR', 'locacao', 12225, 0, null),
  ('GRANDE DIÂMETRO', 'manutencao', 10504, 0, null),
  ('GRANDE DIÂMETRO', 'locacao', 13325, 0, null),
  ('VCG', 'manutencao', 59604, 0, null),
  ('VCG', 'locacao', 209184.32, 0, null),
  ('VCG', 'indenizacao', 127410, 0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2025-09-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Outubro 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 31743, 31743, null),
  ('NORTE', 'locacao', 49243.63, 52253.96, null),
  ('SUL', 'manutencao', 32133, 12293, null),
  ('SUL', 'locacao', 59719.6, 59719.6, null),
  ('LESTE', 'manutencao', 163211, 0, null),
  ('LESTE', 'locacao', 67280, 53600, null),
  ('LESTE', 'indenizacao', 32000, 0, null),
  ('BAIXADA I', 'manutencao', 19967, 3688, null),
  ('BAIXADA I', 'locacao', 52130, 52499.02, null),
  ('BAIXADA II', 'manutencao', 17413, 0, null),
  ('BAIXADA II', 'locacao', 45926, 45816.24, null),
  ('COMUNIDADE', 'manutencao', 7061, 0, null),
  ('COMUNIDADE', 'locacao', 68750.08, 0, null),
  ('INTERIOR', 'locacao', 12225, 12225, null),
  ('GRANDE DIÂMETRO', 'manutencao', 10284, 10284, null),
  ('GRANDE DIÂMETRO', 'locacao', 22274, 22679.01, null),
  ('VCG', 'manutencao', 50860, 0, null),
  ('VCG', 'locacao', 215304, 180479, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2025-10-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Novembro 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 15197, 12511, null),
  ('NORTE', 'locacao', 47477.06, 46409.06, null),
  ('SUL', 'manutencao', 22453, 9914.8, null),
  ('SUL', 'locacao', 79058, 79058, null),
  ('LESTE', 'manutencao', 181741, 0, null),
  ('LESTE', 'locacao', 67280, 53599.92, null),
  ('LESTE', 'indenizacao', 32000, 0, null),
  ('BAIXADA I', 'manutencao', 19058, 12927, null),
  ('BAIXADA I', 'locacao', 50570, 50581.8, null),
  ('BAIXADA II', 'manutencao', 17413, 0, null),
  ('BAIXADA II', 'locacao', 45926, 0, null),
  ('COMUNIDADE', 'manutencao', 10867, 0, null),
  ('COMUNIDADE', 'locacao', 163575.16, 33987, null),
  ('INTERIOR', 'locacao', 12225, 9558, null),
  ('GRANDE DIÂMETRO', 'manutencao', 4658, 4658, null),
  ('GRANDE DIÂMETRO', 'locacao', 13325, 13325, null),
  ('VCG', 'manutencao', 136136, 0, null),
  ('VCG', 'locacao', 257811.67, 185685, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2025-11-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Dezembro 2025
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 11152, 0, null),
  ('NORTE', 'locacao', 49493.08, 48620, null),
  ('SUL', 'manutencao', 18845, 0, null),
  ('SUL', 'locacao', 59248, 13645.56, null),
  ('LESTE', 'manutencao', 189909, 112177, null),
  ('LESTE', 'locacao', 67280, 53600, null),
  ('LESTE', 'indenizacao', 265100, 32000, null),
  ('BAIXADA I', 'manutencao', 8650, 0, null),
  ('BAIXADA I', 'locacao', 50570, 46700, null),
  ('BAIXADA II', 'manutencao', 22049, 0, null),
  ('BAIXADA II', 'locacao', 91852, 33653.51, null),
  ('BAIXADA II', 'indenizacao', 149980, 0, null),
  ('COMUNIDADE', 'manutencao', 14594, 0, null),
  ('COMUNIDADE', 'locacao', 155363.08, 0, null),
  ('COMUNIDADE', 'indenizacao', 136650, 0, null),
  ('INTERIOR', 'locacao', 14892, 0, null),
  ('GRANDE DIÂMETRO', 'manutencao', 6672, 6672, null),
  ('GRANDE DIÂMETRO', 'locacao', 13325, 13325, null),
  ('VCG', 'manutencao', 242102, 140974.66, null),
  ('VCG', 'locacao', 310441.01, 310441.01, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2025-12-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Fevereiro 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 26396, 9993.48, null),
  ('NORTE', 'locacao', 50194.81, 873.08, null),
  ('SUL', 'manutencao', 41342, 0, null),
  ('SUL', 'locacao', 105125.17, 0, null),
  ('LESTE', 'manutencao', 87052, 0, null),
  ('LESTE', 'locacao', 53600, 50590, null),
  ('LESTE', 'indenizacao', 233100, 233100, null),
  ('BAIXADA I', 'manutencao', 10721, 0, null),
  ('BAIXADA I', 'locacao', 54450, 46700, null),
  ('BAIXADA II', 'manutencao', 30595, 0, null),
  ('BAIXADA II', 'locacao', 103433.15, 0, null),
  ('BAIXADA II', 'indenizacao', 139641, 0, null),
  ('COMUNIDADE', 'manutencao', 17472, 0, null),
  ('COMUNIDADE', 'locacao', 215981.31, 0, null),
  ('COMUNIDADE', 'indenizacao', 136650, 136650, null),
  ('INTERIOR', 'locacao', 27117, 9558, null),
  ('GRANDE DIÂMETRO', 'manutencao', 83, 83, null),
  ('GRANDE DIÂMETRO', 'locacao', 13325, 13325, null),
  ('VCG', 'manutencao', 157233.34, 0, null),
  ('VCG', 'locacao', 263605.33, 0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2026-02-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Março 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 25767.52, 16402.52, null),
  ('NORTE', 'locacao', 100010.01, 48798.13, null),
  ('NORTE', 'indenizacao', 28900, 0, null),
  ('SUL', 'manutencao', 56060, 56060, null),
  ('SUL', 'locacao', 164664.17, 164664.17, null),
  ('LESTE', 'manutencao', 94404, 58787, null),
  ('LESTE', 'locacao', 52580, 52580, null),
  ('LESTE', 'indenizacao', 13720, 13720, null),
  ('BAIXADA I', 'manutencao', 13503, 0, null),
  ('BAIXADA I', 'locacao', 58330, 0, null),
  ('BAIXADA II', 'manutencao', 39466, 0, null),
  ('BAIXADA II', 'locacao', 147769.15, 0, null),
  ('BAIXADA II', 'indenizacao', 139641, 0, null),
  ('COMUNIDADE', 'manutencao', 20414, 17472, null),
  ('COMUNIDADE', 'locacao', 271998.31, 271998.31, null),
  ('INTERIOR', 'locacao', 29784, 5785.62, null),
  ('GRANDE DIÂMETRO', 'manutencao', 9469, 9469, null),
  ('GRANDE DIÂMETRO', 'locacao', 32775, 32845.29, null),
  ('VCG', 'manutencao', 203091.34, 203091.34, null),
  ('VCG', 'locacao', 532241.05, 532241.05, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2026-03-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Abril 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 23790.6, 0, null),
  ('NORTE', 'locacao', 102375.9, 33272.22, null),
  ('NORTE', 'indenizacao', 28900, 0, null),
  ('SUL', 'manutencao', 12000, 0, null),
  ('SUL', 'locacao', 61166.34, 0, null),
  ('LESTE', 'manutencao', 49122, 13505, null),
  ('LESTE', 'locacao', 52580, 52579.52, null),
  ('BAIXADA I', 'manutencao', 19087, 0, null),
  ('BAIXADA I', 'locacao', 110365.33, 0, null),
  ('BAIXADA II', 'manutencao', 46390, 0, null),
  ('BAIXADA II', 'locacao', 191154.89, 0, null),
  ('BAIXADA II', 'indenizacao', 139641, 0, null),
  ('COMUNIDADE', 'manutencao', 6760, 6760, null),
  ('COMUNIDADE', 'locacao', 52537, 52537, null),
  ('INTERIOR', 'locacao', 36223.38, 0, null),
  ('GRANDE DIÂMETRO', 'manutencao', 9671, 2861, null),
  ('GRANDE DIÂMETRO', 'locacao', 38295, 38295, null),
  ('VCG', 'manutencao', 94709, 94709, null),
  ('VCG', 'locacao', 276634, 276634.01, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2026-04-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Maio 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 31052.6, 0, null),
  ('NORTE', 'locacao', 113610.82, 0, null),
  ('NORTE', 'indenizacao', 28900, 0, null),
  ('VILA KOSMOS', 'manutencao', 396, 0, null),
  ('VILA KOSMOS', 'locacao', 5105, 0, null),
  ('SUL', 'manutencao', 32281, 12000, null),
  ('SUL', 'locacao', 123767.34, 61166.34, null),
  ('LESTE', 'manutencao', 48336, 0, null),
  ('LESTE', 'locacao', 52580, 0, null),
  ('BAIXADA I', 'manutencao', 23663, 13899, null),
  ('BAIXADA I', 'locacao', 160981.33, 112405.06, null),
  ('BAIXADA I', 'indenizacao', 68460, 68460, null),
  ('BAIXADA II', 'manutencao', 51233, 30595, null),
  ('BAIXADA II', 'locacao', 229519.89, 146818.89, null),
  ('BAIXADA II', 'indenizacao', 139641, 139641, null),
  ('COMUNIDADE', 'manutencao', 2493, 0, null),
  ('COMUNIDADE', 'locacao', 52037, 0, null),
  ('INTERIOR', 'locacao', 46331.04, 36223.4, null),
  ('GRANDE DIÂMETRO', 'manutencao', 16687, 16687, null),
  ('GRANDE DIÂMETRO', 'locacao', 38295, 38295.5, null),
  ('VCG', 'manutencao', 61793, 0, null),
  ('VCG', 'locacao', 280940, 0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2026-05-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Junho 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 34848, 30529, null),
  ('NORTE', 'locacao', 161229.07, 114134.42, null),
  ('NORTE', 'indenizacao', 47260, 0, null),
  ('VILA KOSMOS', 'manutencao', 396, 0, null),
  ('VILA KOSMOS', 'locacao', 10210, 0, null),
  ('SUL', 'manutencao', 37823, 20281, null),
  ('SUL', 'locacao', 125284.67, 65604.6, null),
  ('LESTE', 'manutencao', 58955, 48336, null),
  ('LESTE', 'locacao', 105160, 52584, null),
  ('BAIXADA I', 'manutencao', 15615, 0, null),
  ('BAIXADA I', 'locacao', 107041.76, 5380, null),
  ('BAIXADA II', 'manutencao', 23204, 13645, null),
  ('BAIXADA II', 'locacao', 121066, 82697.95, null),
  ('COMUNIDADE', 'manutencao', 5467, 2493, null),
  ('COMUNIDADE', 'locacao', 104074, 52042, null),
  ('INTERIOR', 'locacao', 18254.66, 0, null),
  ('GRANDE DIÂMETRO', 'manutencao', 11170, 11170, null),
  ('GRANDE DIÂMETRO', 'locacao', 38295, 38295, null),
  ('VCG', 'manutencao', 176900, 33580.33, null),
  ('VCG', 'locacao', 548798.99, 280940, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2026-06-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Julho 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 13109, 0, null),
  ('NORTE', 'locacao', 94391.85, 0, null),
  ('NORTE', 'indenizacao', 31620, 0, null),
  ('VILA KOSMOS', 'manutencao', 802, 0, null),
  ('VILA KOSMOS', 'locacao', 15315, 0, null),
  ('SUL', 'manutencao', 23756, 4058, null),
  ('SUL', 'locacao', 125904.67, 125904.67, null),
  ('LESTE', 'manutencao', 20229, 0, null),
  ('LESTE', 'locacao', 106834, 0, null),
  ('BAIXADA I', 'manutencao', 25792, 0, null),
  ('BAIXADA I', 'locacao', 152967.33, 90950, null),
  ('BAIXADA II', 'manutencao', 16069, 0, null),
  ('BAIXADA II', 'locacao', 77185, 34963, null),
  ('COMUNIDADE', 'manutencao', 4475, 4475, null),
  ('COMUNIDADE', 'locacao', 104074, 104145, null),
  ('INTERIOR', 'manutencao', 1708, 1708, null),
  ('INTERIOR', 'locacao', 25801.66, 25801.66, null),
  ('GRANDE DIÂMETRO', 'locacao', 11718.33, 11718.33, null),
  ('VCG', 'manutencao', 216035.67, 214355.67, null),
  ('VCG', 'locacao', 535336.99, 535336.99, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2026-07-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Agosto 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 20841, 13109, null),
  ('NORTE', 'locacao', 141600.59, 92724.85, null),
  ('NORTE', 'indenizacao', 31620, 18360, null),
  ('VILA KOSMOS', 'manutencao', 1020, 0, null),
  ('VILA KOSMOS', 'locacao', 20420, 0, null),
  ('SUL', 'manutencao', 26405, 0, null),
  ('SUL', 'locacao', 63613.67, 0, null),
  ('LESTE', 'manutencao', 40068, 40068, null),
  ('LESTE', 'locacao', 173158.67, 164119, null),
  ('BAIXADA I', 'manutencao', 32552, 0, null),
  ('BAIXADA I', 'locacao', 122717.33, 101200, null),
  ('BAIXADA II', 'manutencao', 17442, 16069, null),
  ('BAIXADA II', 'locacao', 81242, 81406.23, null),
  ('COMUNIDADE', 'manutencao', 2739, 2739, null),
  ('COMUNIDADE', 'locacao', 52037, 52036.99, null),
  ('INTERIOR', 'locacao', 7822, 0, null),
  ('GRANDE DIÂMETRO', 'manutencao', 12126, 12126, null),
  ('GRANDE DIÂMETRO', 'locacao', 11985, 11985, null),
  ('VCG', 'manutencao', 90245, 0, null),
  ('VCG', 'locacao', 282801.67, 0, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2026-08-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Setembro 2026
insert into controle_valores (periodo_id, regiao_id, categoria, medido, faturado, observacao, quem)
select p.id, g.id, v.categoria, v.medido, v.faturado, v.observacao, null
from (values
  ('NORTE', 'manutencao', 24338, 7732, null),
  ('NORTE', 'locacao', 92934.85, 46077.74, null),
  ('NORTE', 'indenizacao', 13260, 13260, null),
  ('VILA KOSMOS', 'manutencao', 2218, 0, null),
  ('VILA KOSMOS', 'locacao', 25525, 0, null),
  ('SUL', 'manutencao', 34907, 21673, null),
  ('SUL', 'locacao', 127252.67, 63715, null),
  ('LESTE', 'manutencao', 22031, 0, null),
  ('LESTE', 'locacao', 82695.67, 0, null),
  ('BAIXADA I', 'manutencao', 43809, 0, null),
  ('BAIXADA I', 'locacao', 82217.33, 55145.94, null),
  ('BAIXADA II', 'manutencao', 2332, 0, null),
  ('BAIXADA II', 'locacao', 38920, 0, null),
  ('COMUNIDADE', 'manutencao', 6021, 0, null),
  ('COMUNIDADE', 'locacao', 52705.8, 0, null),
  ('INTERIOR', 'manutencao', 3398, 0, null),
  ('INTERIOR', 'locacao', 11815.6, 7822, null),
  ('GRANDE DIÂMETRO', 'manutencao', 15227, 0, null),
  ('GRANDE DIÂMETRO', 'locacao', 11985, 0, null),
  ('VCG', 'manutencao', 285152, 68755, null),
  ('VCG', 'locacao', 580142.67, 282801.67, null)
) v(regiao, categoria, medido, faturado, observacao)
join controle_periodos p on p.cliente = 'ÁGUAS DO RIO / AEGEA' and p.mes = '2026-09-01'
join controle_regioes  g on g.cliente = 'ÁGUAS DO RIO / AEGEA' and g.nome = v.regiao
where not exists (select 1 from controle_valores x
                   where x.periodo_id = p.id and x.regiao_id = g.id and x.categoria = v.categoria);

-- Conferência: o total de cada período tem de bater com o RESUMO EXECUTIVO.
select rotulo, medido, faturado, saldo
from controle_por_periodo
where cliente = 'ÁGUAS DO RIO / AEGEA'
order by mes;
