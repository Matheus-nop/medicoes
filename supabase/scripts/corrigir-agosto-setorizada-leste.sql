-- =====================================================================
-- Correção da importação de AGOSTO/2026: Setorizada Leste Bloco 1 VCG
-- =====================================================================
--
-- O boletim 08 da Setorizada Leste Bloco 1 (VCG São Gonçalo) tem 18 OMs e
-- R$ 38.904,00 no papel. A importação de agosto leu só as 16 primeiras
-- linhas do modelo — a planilha tinha linhas inseridas — e entrou com
-- R$ 38.044,00. Faltaram estas duas:
--
--   17 · OM 033046 · CORTADORA PISO HUSQVARNA 25012-192 · R$ 712,00
--   18 · OM 033273 · GRUPO GERADOR 3,5KVA 250115-557    · R$ 148,00
--
-- (O "TOTAL digitado 712" anotado em agosto era, na verdade, a 17ª OM.)
--
-- Roda no SQL Editor, onde o boletim fechado aceita a OM — pela tela só
-- reabrindo. Pode rodar duas vezes: a OM que já está num boletim fica onde
-- está. Se o boletim já foi enviado ao cliente, o papel que ele recebeu já
-- tinha as 18: o sistema só passa a concordar com ele.

set search_path = medicoes, public;

with u as (select id from auth.users where email = 'matheus@novaopcaoequipamentos.com.br'),
alvo as (
  select id from boletins
  where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A'
    and base = 'SETORIZADA - LESTE - BLOCO 1 - VCG'
    and referencia = 'AGOSTO/2026' and documento = '08'
)
insert into boletim_oms (boletim_id, om, patrimonio, equipamento, chegada_em, valor, fonte, om_retirada, recibo_entrega, observacao, origem, incluido_por)
select (select id from alvo), v.om, v.pat, v.equip, v.dia::timestamptz, v.valor, 'orcamento', v.ret, v.ent, null,
       'importado: 08 - AGOSTO / 08 - BM Manutenção - Águas do Rio - Setorizada Leste Bloco 1 - VCG São Gonçalo - Agosto 2026.xlsx (linhas 17 e 18)', u.id
from u, (values
  ('033046', '25012-192', 'CORTADORA PISO HUSQVARNA', '2026-07-30 12:00-03', 712.00, '032933', '033066'),
  ('033273', '250115-557', 'GRUPO GERADOR 3,5KVA', '2026-08-04 12:00-03', 148.00, '032744', '033326')
) v(om, pat, equip, dia, valor, ret, ent)
where (select id from alvo) is not null
on conflict on constraint boletim_om_uma_vez do nothing;

-- Conferência: 18 OMs e 38.904,00.
select numero, documento, oms, valor, situacao
from boletins_atual
where cliente = 'AEGEA SANEAMENTO E PARTICIPAÇÕES S.A'
  and base = 'SETORIZADA - LESTE - BLOCO 1 - VCG' and referencia = 'AGOSTO/2026';
