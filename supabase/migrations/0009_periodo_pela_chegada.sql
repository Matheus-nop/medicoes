set search_path = medicoes, public;

-- =====================================================================
-- 0009: o período do boletim olha a chegada da máquina
-- (idempotente; rode depois da 0008)
-- =====================================================================
--
-- O período do boletim ("OMs de 14/07 a 30/07/2026") saía da conclusão ou da
-- abertura da OM. O boletim importado dos arquivos só tem a DATA do papel, que
-- mora em `chegada_em` — e o período saía em branco ("OMs de —"). Agora vale
-- a mesma ordem da linha do papel: a chegada, e na falta dela a conclusão ou
-- a abertura. Só a view muda; nenhuma coluna nova.

create or replace view boletins_atual with (security_invoker = true) as
select b.id, b.numero, b.cliente, b.referencia, b.observacao, b.criado_em,
       pc.nome as criado_por_nome,
       s.situacao, s.situacao_em,
       ps.nome as situacao_por_nome,
       coalesce(t.oms, 0)   as oms,
       coalesce(t.valor, 0) as valor,
       t.custo,
       t.primeira_om,
       t.ultima_om,
       b.base, b.contato, b.email, b.telefone, b.local_obra,
       f.fechado_em,
       b.modelo,
       b.documento,
       -- O que já se faturou deste boletim: tudo, se ele foi faturado
       -- inteiro; senão, a soma das OMs marcadas.
       case when s.situacao = 'faturado' then coalesce(t.valor, 0)
            else coalesce(t.faturado, 0) end as faturado,
       case when s.situacao = 'faturado' then coalesce(t.oms, 0)
            else coalesce(t.oms_faturadas, 0) end as oms_faturadas
from boletins b
join boletim_situacao s on s.boletim_id = b.id
left join perfis pc on pc.id = b.criado_por
left join perfis ps on ps.id = s.situacao_por
left join (
  select i.boletim_id,
         count(*)::int as oms,
         sum(i.valor) as valor,
         sum(coalesce(i.gasto, i.previsto)) as custo,
         min(coalesce(i.chegada_em, i.concluida_em, i.aberta_em)) as primeira_om,
         max(coalesce(i.chegada_em, i.concluida_em, i.aberta_em)) as ultima_om,
         sum(i.valor) filter (where x.id is not null) as faturado,
         (count(x.id))::int as oms_faturadas
  from boletim_oms i
  left join om_faturadas x on x.boletim_om_id = i.id
  group by i.boletim_id
) t on t.boletim_id = b.id
left join (
  select boletim_id, max(em) as fechado_em
  from boletim_andamentos
  where situacao = 'fechado'
  group by boletim_id
) f on f.boletim_id = b.id;


grant select on boletins_atual to authenticated;

notify pgrst, 'reload schema';

select 'o periodo do boletim olha a chegada' as item,
       case when pg_get_viewdef('medicoes.boletins_atual'::regclass) like '%chegada_em%'
            then '✓ ok' else '!! a view nao foi trocada' end as situacao;
