-- ═════════════════════════════════════════════════════════════
-- Provar as travas de medições (0001 a 0011)
-- ═════════════════════════════════════════════════════════════
--
-- Sem nenhum `do $$`: cada trecho é curto e se cola sozinho.
--
-- PARTE 1 — as travas estão configuradas? É a conferência do fim da 0002;
--   rode de novo depois de qualquer migração que encoste nas medições.
--
-- PARTE 2 — o Postgres as aplica, com sessão de gente de verdade. Cole UM
--   trecho, rode, veja o resultado, apague, cole o próximo. Todos terminam em
--   `rollback`: nada fica.
--
-- ATENÇÃO À DIFERENÇA DE SINTOMA NO TRECHO 3
--
-- Quando a trava está no `using` de um `update` ou `delete`, o Postgres NÃO dá
-- erro: não vê a linha e afeta zero linhas. O esperado é `UPDATE 0` /
-- `DELETE 0`. É por isso que `app/(sistema)/acoes.ts` confere se
-- voltou linha depois de gravar.
--
-- Os trechos usam a primeira pessoa de faturamento e a primeira da diretoria.
-- Sem ninguém de faturamento cadastrado eles falham com "null value" em vez
-- da trava.
--
-- Rodado antes da entrega num Postgres 16 com auth simulada: todos os trechos
-- deram o resultado esperado.


-- ═════════════════════════════════════════════════════════════
-- PARTE 1
-- ═════════════════════════════════════════════════════════════

select ordem, o_que, situacao from (
  select 1 as ordem, 'RLS ligada nas tres tabelas' as o_que,
         case when (select count(*) from pg_tables
                     where schemaname = 'medicoes' and rowsecurity
                       and tablename in ('boletins','boletim_oms','boletim_andamentos')) = 3
              then '✓ ok' else '!! alguma ficou sem RLS' end as situacao
  union all
  select 2, 'a mesma OM nao entra em dois boletins',
         case when exists (select 1 from pg_constraint where conname = 'boletim_om_uma_vez')
              then '✓ ok' else '!! faltou a constraint' end
  union all
  select 3, 'OM so muda com o boletim aberto (3 policies)',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and tablename = 'boletim_oms'
                       and cmd in ('INSERT','UPDATE','DELETE')
                       and coalesce(qual, '') || coalesce(with_check, '') like '%boletim_andamentos%') = 3
              then '✓ ok' else '!! da para mexer em OM de boletim fechado' end
  union all
  select 4, 'andamento e append-only (sem policy nem grant de update/delete)',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes' and tablename = 'boletim_andamentos'
                       and cmd in ('UPDATE','DELETE')) = 0
               and (select count(*) from information_schema.table_privileges
                     where table_schema = 'medicoes' and grantee = 'authenticated'
                       and table_name = 'boletim_andamentos'
                       and privilege_type in ('UPDATE','DELETE')) = 0
              then '✓ ok' else '!! da para reescrever a historia do boletim' end
  union all
  select 5, 'so a diretoria reabre (restritiva)',
         case when exists (select 1 from pg_policies where schemaname = 'medicoes'
                            and tablename = 'boletim_andamentos'
                            and policyname = 'so_diretoria_reabre'
                            and permissive = 'RESTRICTIVE')
              then '✓ ok' else '!! a trava nao e restritiva' end
  union all
  select 6, 'ninguem assina no lugar de outro',
         case when (select count(*) from pg_policies
                     where schemaname = 'medicoes'
                       and tablename in ('boletins','boletim_oms','boletim_andamentos')
                       and cmd = 'INSERT' and permissive = 'PERMISSIVE'
                       and with_check like '%auth.uid()%') = 3
              then '✓ ok' else '!! da para assinar no lugar de outro' end
) r order by ordem;


-- ═════════════════════════════════════════════════════════════
-- PARTE 2
-- ═════════════════════════════════════════════════════════════

-- ── 1. A mesma OM em dois boletins ───────────────────────────
-- Esperado: ERROR 23505 (duplicate key ... "boletim_om_uma_vez")
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA A', auth.uid());
insert into medicoes.boletim_oms (boletim_id, om, incluido_por)
  values ((select max(id) from medicoes.boletins), '999001', auth.uid());
insert into medicoes.boletins (cliente, criado_por) values ('PROVA B', auth.uid());
insert into medicoes.boletim_oms (boletim_id, om, incluido_por)
  values ((select max(id) from medicoes.boletins), '999001', auth.uid());
rollback;
*/


-- ── 2. OM não entra em boletim fechado ───────────────────────
-- Esperado: ERROR 42501 (new row violates row-level security policy for
-- table "boletim_oms")
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA', auth.uid());
insert into medicoes.boletim_andamentos (boletim_id, situacao, quem)
  values ((select max(id) from medicoes.boletins), 'fechado', auth.uid());
insert into medicoes.boletim_oms (boletim_id, om, incluido_por)
  values ((select max(id) from medicoes.boletins), '999002', auth.uid());
rollback;
*/


-- ── 3. OM de boletim fechado não muda nem sai ────────────────
-- Esperado: UPDATE 0 e DELETE 0 (zero linhas, sem erro — ver o topo)
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA', auth.uid());
insert into medicoes.boletim_oms (boletim_id, om, valor, incluido_por)
  values ((select max(id) from medicoes.boletins), '999003', 10, auth.uid());
insert into medicoes.boletim_andamentos (boletim_id, situacao, quem)
  values ((select max(id) from medicoes.boletins), 'fechado', auth.uid());
update medicoes.boletim_oms set valor = 999 where om = '999003' returning id;
delete from medicoes.boletim_oms where om = '999003' returning id;
rollback;
*/


-- ── 4. Faturamento não reabre ────────────────────────────────
-- Esperado: ERROR 42501 (... policy "so_diretoria_reabre")
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA', auth.uid());
insert into medicoes.boletim_andamentos (boletim_id, situacao, quem)
  values ((select max(id) from medicoes.boletins), 'fechado', auth.uid());
insert into medicoes.boletim_andamentos (boletim_id, situacao, quem)
  values ((select max(id) from medicoes.boletins), 'aberto', auth.uid());
rollback;
*/


-- ── 5. Ninguém assina no lugar de outro ──────────────────────
-- Esperado: ERROR 42501. Faturamento tenta marcar como enviado em nome da diretoria.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA', auth.uid());
insert into medicoes.boletim_andamentos (boletim_id, situacao, quem)
  values ((select max(id) from medicoes.boletins), 'fechado',
          (select p.id from medicoes.perfis p where p.papel = 'diretoria' order by p.id limit 1));
rollback;
*/


-- ── 6. Nem a diretoria reescreve andamento ────────────────────────
-- Esperado: ERROR 42501 (permission denied for table boletim_andamentos)
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'diretoria' order by p.id limit 1))::text, true);
set local role authenticated;
update medicoes.boletim_andamentos set situacao = 'aberto';
rollback;
*/


-- ── 7. Gestor reabre, e o valor volta a mudar ────────────────
-- Esperado: SEM erro, e o update devolve 1 linha. É a prova de que a trava
-- não trava demais.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'diretoria' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA', auth.uid());
insert into medicoes.boletim_oms (boletim_id, om, valor, incluido_por)
  values ((select max(id) from medicoes.boletins), '999007', 10, auth.uid());
insert into medicoes.boletim_andamentos (boletim_id, situacao, quem)
  values ((select max(id) from medicoes.boletins), 'fechado', auth.uid());
insert into medicoes.boletim_andamentos (boletim_id, situacao, quem, observacao)
  values ((select max(id) from medicoes.boletins), 'aberto', auth.uid(), 'prova');
update medicoes.boletim_oms set valor = 20, fonte = 'manual' where om = '999007' returning id;
rollback;
*/


-- ── 8. Recibo e dados do cliente também congelam ─────
-- Esperado: UPDATE 0 nas duas (zero linhas, sem erro — ver o topo). As
-- colunas não têm policy própria: é a das OMs que as segura.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA', auth.uid());
insert into medicoes.boletim_oms (boletim_id, om, valor, incluido_por)
  values ((select max(id) from medicoes.boletins), '999008', 10, auth.uid());
insert into medicoes.boletim_andamentos (boletim_id, situacao, quem)
  values ((select max(id) from medicoes.boletins), 'fechado', auth.uid());
update medicoes.boletim_oms set recibo_entrega = '033923' where om = '999008' returning id;
update medicoes.boletins set contato = 'mexido'
 where id = (select max(id) from medicoes.boletins) returning id;
rollback;
*/


-- ── 9. Quem tem login no grupo e não tem perfil aqui não vê nada ──
-- Esperado: 0, 0 e papel vazio. Troque o e-mail pelo de alguém do galpão.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id::text from auth.users where email = 'alguem-do-galpao@exemplo.com'))::text, true);
set local role authenticated;
select (select count(*) from medicoes.boletins_atual) as boletins,
       (select count(*) from medicoes.os_com_oms()) as os,
       medicoes.meu_papel() as papel;
rollback;
*/


-- ── 10. Ninguém se dá acesso sozinho ─────────────────────────
-- Esperado: ERROR 42501 no insert e UPDATE 0 no update.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
update medicoes.perfis set papel = 'diretoria' where id = auth.uid() returning id;
insert into medicoes.perfis (id, nome, papel)
values ((select id from auth.users where id not in (select id from medicoes.perfis) limit 1), 'x', 'diretoria');
rollback;
*/


-- ── 11. As leituras dos outros apps não abrem as tabelas de lá ──
-- Esperado: a primeira devolve linhas (patrimônio e os três números); a
-- segunda, ERROR 42501 (permission denied for schema estoque).
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
select * from medicoes.os_com_oms() limit 5;
select count(*) from estoque.ordens_servico;
rollback;
*/


-- ── 12. OM de boletim aberto não se fatura (0004) ───────────
-- Esperado: ERROR 42501 (new row violates row-level security policy for
-- table "om_faturadas"). Precisa de um boletim ABERTO com ao menos uma OM.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.om_faturadas (boletim_om_id)
select i.id from medicoes.boletim_oms i
join medicoes.boletim_situacao s on s.boletim_id = i.boletim_id
where s.situacao = 'aberto' limit 1;
rollback;
*/


-- ── 13. Valor do controle não se reescreve nem se apaga (0005) ──
-- Esperado: o primeiro insert passa (INSERT 0 1); o segundo, assinado em
-- nome de outro, ERROR 42501; o update e o delete, ERROR 42501 (permission
-- denied for table controle_valores). Rode depois da semente da planilha.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.controle_valores (periodo_id, regiao_id, categoria, medido, faturado)
select max(p.id), min(r.id), 'locacao', 10, 5
from medicoes.controle_periodos p, medicoes.controle_regioes r;
savepoint a;
insert into medicoes.controle_valores (periodo_id, regiao_id, categoria, quem)
select max(p.id), min(r.id), 'locacao', (select id from auth.users where id <> auth.uid() limit 1)
from medicoes.controle_periodos p, medicoes.controle_regioes r;
rollback to a;
savepoint b; update medicoes.controle_valores set medido = 0; rollback to b;
delete from medicoes.controle_valores;
rollback;
*/


-- ═════════════════════════════════════════════════════════════
-- DA 0007 EM DIANTE
-- ═════════════════════════════════════════════════════════════

-- ── 14. Faturamento não lança recebimento (0007) ─────────────
-- Esperado: ERROR 42501 (... policy for table "controle_recebimentos").
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.controle_recebimentos (periodo_id, regiao_id, categoria, recebido)
select max(p.id), min(r.id), 'locacao', 10
from medicoes.controle_periodos p, medicoes.controle_regioes r;
rollback;
*/


-- ── 15. Recebimento também não se reescreve (0007) ───────────
-- Esperado: ERROR 42501 (permission denied for table controle_recebimentos),
-- mesmo para a diretoria.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'diretoria' order by p.id limit 1))::text, true);
set local role authenticated;
update medicoes.controle_recebimentos set recebido = 0;
rollback;
*/


-- ── 16. Só a diretoria apaga base do cadastro (0010) ─────────
-- Esperado: DELETE 0 (zero linhas, sem erro — ver o topo).
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
delete from medicoes.bases returning id;
rollback;
*/


-- ── 17. O orçamento não lança no controle (0011) ─────────────
-- Esperado: ERROR 42501 (... policy for table "controle_valores"). Precisa
-- de alguém com papel de orçamento.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'orcamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.controle_valores (periodo_id, regiao_id, categoria, medido, faturado)
select max(p.id), min(r.id), 'locacao', 10, 5
from medicoes.controle_periodos p, medicoes.controle_regioes r;
rollback;
*/


-- ── 18. O financeiro não abre boletim nem mexe no cadastro (0011) ──
-- Esperado: ERROR 42501 no insert do boletim; UPDATE 0 na base. Precisa de
-- alguém com papel de financeiro.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'financeiro' order by p.id limit 1))::text, true);
set local role authenticated;
savepoint a;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA', auth.uid());
rollback to a;
update medicoes.bases set responsavel = 'mexido' returning id;
rollback;
*/


-- ── 19. A trava do time não trava demais (0011) ──────────────
-- Esperado: SEM erro. O orçamento abre boletim e inclui OM; o faturamento
-- lança no controle e lê o boletim. Os dois inserts devolvem 1 linha.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'orcamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.boletins (cliente, criado_por) values ('PROVA', auth.uid()) returning id;
insert into medicoes.boletim_oms (boletim_id, om, incluido_por)
  values ((select max(id) from medicoes.boletins), '999019', auth.uid()) returning id;
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.controle_valores (periodo_id, regiao_id, categoria, medido, faturado)
select max(p.id), min(r.id), 'locacao', 10, 5
from medicoes.controle_periodos p, medicoes.controle_regioes r returning id;
select count(*) as boletins_que_o_faturamento_le from medicoes.boletins;
rollback;
*/


-- ── 20. Juntar nomes é do time do boletim, e não se reescreve (0012) ──
-- Esperado: o insert do orçamento passa (INSERT 0 1); o do financeiro,
-- ERROR 42501; o update, ERROR 42501 (permission denied); e o delete do
-- financeiro, DELETE 0. Precisa de alguém de orçamento e de financeiro.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'orcamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.vinculos_de_cliente (nome, cliente) values ('PROVA SISLOC S.A', 'PROVA / CONTROLE');
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'financeiro' order by p.id limit 1))::text, true);
set local role authenticated;
savepoint a;
insert into medicoes.vinculos_de_cliente (nome, cliente) values ('OUTRA S.A', 'PROVA / CONTROLE');
rollback to a;
savepoint b;
update medicoes.vinculos_de_cliente set cliente = 'mexido';
rollback to b;
delete from medicoes.vinculos_de_cliente where nome = 'PROVA SISLOC S.A' returning id;
rollback;
*/


-- ── 21. Contrato é do faturamento, e aditivo não se reescreve (0013) ──
-- Esperado: o contrato e o aditivo do faturamento passam (INSERT 0 1 nos
-- dois); o contrato do orçamento, ERROR 42501; o update no aditivo, ERROR
-- 42501 (permission denied); o delete do faturamento, DELETE 0 no aditivo e
-- no contrato (só a diretoria apaga). Precisa de alguém de orçamento.
/*
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'faturamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.contratos (numero, cliente, vigencia_inicio, vigencia_fim, valor)
values ('PROVA-21', 'PROVA', '2026-01-01', '2026-12-31', 1000);
insert into medicoes.contrato_aditivos (contrato_id, tipo, data, nova_vigencia_fim)
select id, 'prorrogacao', '2026-12-01', '2027-12-31' from medicoes.contratos where numero = 'PROVA-21';
savepoint a;
update medicoes.contrato_aditivos set nova_vigencia_fim = '2030-01-01';
rollback to a;
delete from medicoes.contrato_aditivos returning id;
delete from medicoes.contratos returning id;
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select p.id::text from medicoes.perfis p
    where p.ativo and p.papel = 'orcamento' order by p.id limit 1))::text, true);
set local role authenticated;
insert into medicoes.contratos (numero, cliente, vigencia_inicio, vigencia_fim)
values ('PROVA-21B', 'PROVA', '2026-01-01', '2026-12-31');
rollback;
*/
