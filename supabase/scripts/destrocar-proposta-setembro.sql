-- =====================================================================
-- Setembro/2026: a PROPOSTA é a OM principal do Sisloc
-- (rode no SQL Editor; pode rodar duas vezes — a troca só vale uma vez)
-- =====================================================================
--
-- Os três números de cada linha, como a casa fala:
--   · PROPOSTA ...... a OM principal do Sisloc (a corretiva, a da colagem) —
--                     é o `om` do sistema, o que não pode entrar duas vezes;
--   · Nº OM ......... a OM de entrada (`om_retirada`);
--   · OM ENTREGA .... a de retorno, digitada à mão (`recibo_entrega`).
--
-- Agosto foi importado certo: o papel dele tinha Nº OM (a principal) e
-- RECIBO RETIRADA (a entrada). Em setembro o papel do cliente mudou — a
-- coluna PROPOSTA passou a trazer a principal (o número maior em 115 de 116
-- linhas) e a Nº OM, a entrada — e a importação guardou as duas trocadas.
-- Aqui elas se destrocam. Além do papel, isso faz a colagem reconhecer a OM
-- de setembro que alguém colar de novo (uma OM, um boletim).
--
-- Só as linhas importadas de setembro do Águas do Rio / AEGEA, e só quando a
-- PROPOSTA é um número de OM. A linha cuja PROPOSTA já está noutro boletim
-- (colada de novo esta semana, por exemplo) NÃO se troca: aparece na
-- conferência do fim para decidir à mão — é cobrança em dobro.
-- =====================================================================

set search_path = medicoes, public;

-- 1. A troca, com a marca de que foi feita na própria linha (`origem`).
update boletim_oms i
   set om = i.om_retirada,
       om_retirada = i.om,
       origem = i.origem || ' · proposta destrocada'
  from boletins b
 where b.id = i.boletim_id
   and b.modelo = 'aguas'
   and i.origem like 'importado: 9 - SETEMBRO%'
   and i.origem not like '%proposta destrocada%'
   and i.om_retirada ~ '^[0-9]{3,10}(-[0-9]{1,3})?$'
   and not exists (select 1 from boletim_oms x where x.om = i.om_retirada and x.id <> i.id);

-- 2. Conferência: quantas trocaram (esperado: 145, todas as de setembro).
select count(*) filter (where origem like '%proposta destrocada%') as destrocadas,
       count(*) filter (where origem not like '%proposta destrocada%') as ficaram
from boletim_oms
where origem like 'importado: 9 - SETEMBRO%';

-- 3. As que ficaram e por quê. Sem PROPOSTA no papel é normal (comprovante,
--    linha sem proposta). "já está no BM-…" é a OM principal colada de novo
--    noutro boletim: diga qual dos dois fica.
select i.om as numero_hoje, i.om_retirada as proposta_no_papel, b.numero, b.base,
       case when i.om_retirada is null or i.om_retirada !~ '^[0-9]{3,10}(-[0-9]{1,3})?$'
            then 'sem proposta no papel'
            else 'proposta já está no ' || (select bb.numero || ' (' || coalesce(bb.base, '') || ', ' || coalesce(bb.referencia, '') || ')'
                                             from boletim_oms x join boletins bb on bb.id = x.boletim_id
                                            where x.om = i.om_retirada limit 1)
       end as motivo
from boletim_oms i
join boletins b on b.id = i.boletim_id
where i.origem like 'importado: 9 - SETEMBRO%'
  and i.origem not like '%proposta destrocada%'
order by motivo, b.base;
