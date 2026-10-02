set search_path = medicoes, public;

-- =====================================================================
-- 0015: a regional de cada base
-- (idempotente; rode depois da 0014)
-- =====================================================================
--
-- A tela de medições de manutenção filtra por regional — Norte, Sul, Leste,
-- Baixada I, Baixada II, Comunidade, Interior, Grande Diâmetro, VCG, Vila
-- Kosmos —, as mesmas regiões do controle. O nome da base nem sempre diz a
-- regional ("PENHA - CAV NORTE" é VCG), então ela é um campo do cadastro.
--
-- Nasce preenchida pelas pastas dos arquivos de agosto e setembro/2026 (cada
-- base está numa pasta só); a Vila Kosmos, que vinha na pasta do Norte, fica
-- na VILA KOSMOS, como no controle. Base que já tem regional não muda: o
-- que se corrigiu na tela fica.

alter table bases add column if not exists regional text
  check (regional is null or length(trim(regional)) > 0);

update bases b
   set regional = v.regional
  from (values
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - CAV', 'BAIXADA I'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - OPERAÇÃO', 'BAIXADA I'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'AEGEA - BAIXADA I - SERVIÇO', 'BAIXADA I'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'BAIXADA I - SERVIÇOS', 'BAIXADA I'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'BELFORD ROXO BAIXADA I - OPERAÇÃO', 'BAIXADA I'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'BELFORD ROXO BAIXADA I - SERVIÇOS', 'BAIXADA I'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PIAM BAIXADA I - OPERAÇÃO', 'BAIXADA I'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PIAM BAIXADA I - SERVIÇOS', 'BAIXADA I'),
  ('AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - CALIFÓRNIA D-17', 'BAIXADA II'),
  ('AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - CALIFÓRNIA, NOVA IGUAÇU', 'BAIXADA II'),
  ('AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - OLINDA / NILÓPOLIS D-18', 'BAIXADA II'),
  ('AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - QUEIMADOS', 'BAIXADA II'),
  ('AGUAS DO RIO 4 SPE S.A', 'BAIXADA II - QUEIMADOS - SETOR OPERACIONAL', 'BAIXADA II'),
  ('AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - ENGENHO DE DENTRO', 'COMUNIDADE'),
  ('AGUAS DO RIO 4 SPE S.A - COMERCIAL', 'COMUNIDADES - ENGENHO DE DENTRO - COMERCIAL', 'COMUNIDADE'),
  ('AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - GÁVEA', 'COMUNIDADE'),
  ('AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - MARÉ', 'COMUNIDADE'),
  ('AGUAS DO RIO 4 SPE S.A', 'COMUNIDADES - PENHA', 'COMUNIDADE'),
  ('AGUAS DO RIO 1 SPE S.A', 'GRANDE DIÂMETRO - CENTRO SUL BOTAFOGO', 'GRANDE DIÂMETRO'),
  ('AGUAS DO RIO 1 SPE S.A', 'GRANDE DIÂMETRO - ETE - VIGÁRIO GERAL', 'GRANDE DIÂMETRO'),
  ('AGUAS DO RIO 1 SPE S.A', 'GRANDE DIÂMETRO BAIXADA 2 CALIFÓRNIA', 'GRANDE DIÂMETRO'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'BASE INTERIOR - ITAOCARA', 'INTERIOR'),
  ('AGUAS DO RIO 1 SPE S.A', 'LESTE - BOA VISTA - SÃO GONÇALO', 'LESTE'),
  ('AGUAS DO RIO 1 SPE S.A', 'LESTE - ITABORAÍ', 'LESTE'),
  ('AGUAS DO RIO 1 SPE S.A', 'LESTE - MARICÁ', 'LESTE'),
  ('AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - ILHA', 'NORTE'),
  ('AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - MEIER', 'NORTE'),
  ('AGUAS DO RIO 4 SPE S.A', 'NORTE - CAMPINHO', 'NORTE'),
  ('AGUAS DO RIO 4 SPE S.A', 'NORTE - PENHA', 'NORTE'),
  ('AGUAS DO RIO 1 SPE S.A', 'SUL - BOTAFOGO', 'SUL'),
  ('AGUAS DO RIO 1 SPE S.A', 'SUL - GÁVEA', 'SUL'),
  ('AGUAS DO RIO 1 SPE S.A', 'SUL - ROCHA', 'SUL'),
  ('AGUAS DO RIO 4 SPE S.A', 'SUL - ROCHA', 'SUL'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'DUQUE DE CAXIAS - CAV', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'FISCALIZAÇÃO - BAIXADA I - BLOCO 4 - VCG', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PENHA - CAV NORTE', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'PROJETO RIO DE JANEIRO RIO NORTE BLOCO 4 VCG', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - BAIXADA I - BELFORD ROXO - BLOCO 4 - VCG', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - LESTE - BLOCO 1 - VCG', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4 VCG', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA - SÃO GONÇALO - LESTE - BLOCO 1 - VCG', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'SETORIZADA RIO DE JANEIRO - COMUNIDADES BLOCO 4 - VCG', 'VCG'),
  ('AGUAS DO RIO 1 SPE S.A', 'SÃO GONÇALO - CAV', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - BAIXADA I - BELFORD ROXO - BLOCO 4', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - RIO BONITO - LAGOS - BLOCO 1', 'VCG'),
  ('AEGEA SANEAMENTO E PARTICIPAÇÕES S.A', 'VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4', 'VCG'),
  ('AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - VILA KOSMO', 'VILA KOSMOS'),
  ('AGUAS DO RIO 4 SPE S.A', 'BASE NORTE - VILA KOSMOS', 'VILA KOSMOS')
  ) v(cliente, nome, regional)
 where b.regional is null
   and chave_do_nome(b.cliente) = chave_do_nome(v.cliente)
   and chave_do_nome(b.nome) = chave_do_nome(v.nome);

notify pgrst, 'reload schema';

-- Conferência: quantas bases em cada regional, e as que ficaram sem.
select coalesce(regional, '— sem regional') as regional, count(*) as bases
from bases group by 1 order by 1;
