set search_path = medicoes, public;

-- =====================================================================
-- 0022: ler a OM que não está em boletim — no Estoque
-- (idempotente; rode depois da 0021 — termina numa tabela)
-- =====================================================================
--
-- "Precisava de uma opção para ler a OM que, por algum motivo, não esteja na
--  medição."
--
-- O relatório de manutenção (0021) nasce da OM do boletim. Quando a OM ainda
-- não foi colada em boletim nenhum — ou foi cobrada por fora —, ele abria em
-- branco. Mas a OM quase sempre já passou pelo Estoque, em quatro lugares:
--
--   1. acompanhamento — a colagem do Sisloc que o PCM faz de hora em hora
--      (`oficina_itens`): patrimônio, equipamento, cliente, tipo de OM, a
--      abertura e o Vl. orçamento.
--   2. carteira — a colagem das OMs em aberto (`oms_abertas_itens`): o mesmo,
--      com a data de chegada.
--   3. OS — a ordem de serviço do Estoque (`ordens_servico`), achada por
--      qualquer dos três números: o defeito e os números de entrada e retorno.
--   4. orçamento — a máquina de cliente em De clientes (`orcamentos`).
--
-- A função devolve a linha mais recente de cada lugar onde a OM aparece, e a
-- tela junta (`juntarLeituras`, lib/medicoes/relatorio.ts). É a regra da 0003:
-- `security definer` curta, só as colunas que o relatório usa, só para quem
-- tem perfil ativo aqui, e nada escrito no schema do Estoque. Custo e gasto
-- não saem: o valor que se lê é o Vl. orçamento (o que se cobra).
--
-- A OM casa sem os zeros da frente: o boletim escreve 038129, a colagem 38129.

create or replace function medicoes.om_nos_outros_apps(p_om text)
returns table (
  fonte       text,
  visto_em    timestamptz,
  patrimonio  text,
  equipamento text,
  modelo      text,
  cliente     text,
  tipo_om     text,
  aberta_em   timestamptz,
  chegou_em   timestamptz,
  defeito     text,
  om_entrada  text,
  om_retorno  text,
  valor       numeric
)
language sql
stable
security definer
set search_path = medicoes, public
as $fn$
  with alvo as (
    select nullif(ltrim(regexp_replace(coalesce(p_om, ''), '\D', '', 'g'), '0'), '') as n
  )
  (select 'acompanhamento', l.lida_em, i.patrimonio,
          coalesce(nullif(btrim(concat_ws(' ', t.nome, e.marca)), ''), i.tipo),
          e.modelo, i.cliente, i.tipo_om, i.aberta_em, null::timestamptz,
          null::text, null::text, null::text, i.orcamento
     from estoque.oficina_itens i
     join estoque.oficina_leituras l on l.id = i.leitura_id and l.anulada_em is null
     left join estoque.equipamentos e on e.patrimonio = upper(btrim(i.patrimonio))
     left join estoque.tipos_equipamento t on t.id = e.tipo_id, alvo
    where medicoes.e_usuario_ativo() and ltrim(btrim(i.om), '0') = alvo.n
    order by l.lida_em desc limit 1)
  union all
  (select 'carteira', c.lida_em, i.patrimonio,
          coalesce(nullif(btrim(concat_ws(' ', t.nome, e.marca)), ''), i.tipo),
          e.modelo, i.cliente, i.tipo_om, i.aberta_em, i.chegou_em,
          null, null, null, null::numeric
     from estoque.oms_abertas_itens i
     join estoque.oms_abertas_colagens c on c.id = i.colagem_id and c.anulada_em is null
     left join estoque.equipamentos e on e.patrimonio = upper(btrim(i.patrimonio))
     left join estoque.tipos_equipamento t on t.id = e.tipo_id, alvo
    where medicoes.e_usuario_ativo() and ltrim(btrim(i.om), '0') = alvo.n
    order by c.lida_em desc limit 1)
  union all
  (select 'os', o.aberta_em, e.patrimonio,
          nullif(btrim(concat_ws(' ', t.nome, e.marca)), ''),
          e.modelo, o.cliente, null, o.aberta_em, null,
          o.defeito, o.om_entrada, o.om_retorno, null
     from estoque.ordens_servico o
     join estoque.equipamentos e on e.id = o.equipamento_id
     left join estoque.tipos_equipamento t on t.id = e.tipo_id, alvo
    where medicoes.e_usuario_ativo()
      and alvo.n in (ltrim(btrim(o.om_corretiva), '0'), ltrim(btrim(o.om_entrada), '0'), ltrim(btrim(o.om_retorno), '0'))
    order by o.aberta_em desc limit 1)
  union all
  (select 'orcamento', r.aberto_em, e.patrimonio,
          nullif(btrim(concat_ws(' ', t.nome, e.marca)), ''),
          e.modelo, r.cliente, null, r.aberto_em, r.chegou_em::timestamptz,
          r.defeito, null, null, r.valor
     from estoque.orcamentos r
     join estoque.equipamentos e on e.id = r.equipamento_id
     left join estoque.tipos_equipamento t on t.id = e.tipo_id, alvo
    where medicoes.e_usuario_ativo()
      and alvo.n in (ltrim(btrim(r.om_orcamento), '0'), ltrim(btrim(r.om_execucao), '0'))
    order by r.aberto_em desc limit 1);
$fn$;

revoke all on function medicoes.om_nos_outros_apps(text) from public, anon;
grant execute on function medicoes.om_nos_outros_apps(text) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Conferência — rodar até aqui devolve uma tabela de duas linhas, as duas
-- em `✓ ok`. `Success. No rows returned` quer dizer que a colagem não chegou
-- ao fim.
-- ---------------------------------------------------------------------
select ordem, o_que, situacao from (
  select 1 as ordem, 'a leitura existe e roda como dona (security definer)' as o_que,
         case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                            where n.nspname = 'medicoes' and p.proname = 'om_nos_outros_apps' and p.prosecdef)
              then '✓ ok' else '!! falta a função' end as situacao
  union all
  select 2, 'anon não executa; quem não tem perfil aqui recebe nada',
         case when not has_function_privilege('anon', 'medicoes.om_nos_outros_apps(text)', 'EXECUTE')
               and (select count(*) from medicoes.om_nos_outros_apps('0')) = 0
              then '✓ ok' else '!! anon executa a leitura' end
) c
order by ordem;
