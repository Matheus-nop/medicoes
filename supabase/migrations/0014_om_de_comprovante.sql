set search_path = medicoes, public;

-- =====================================================================
-- 0014: a linha cobrada pelo comprovante
-- (idempotente; rode antes de importar os boletins de setembro)
-- =====================================================================
--
-- Nos boletins de setembro/2026 do Águas do Rio, 29 linhas não trazem a OM
-- do Sisloc no "Nº OM", e sim o número do comprovante — de substituição,
-- de devolução ou de manutenção no local: 1170-01, 2252-17, 2641-05. É o que
-- está no papel que o cliente recebeu, e é o que se cobra (R$ 54.561,00).
--
-- A 0002 só aceitava dígitos. Agora aceita também o número com traço e um
-- a três dígitos depois. Continua valendo "uma OM, um boletim": o mesmo
-- comprovante não entra em dois.

alter table boletim_oms drop constraint if exists boletim_oms_om_check;
alter table boletim_oms add constraint boletim_oms_om_check
  check (om ~ '^[0-9]{3,10}(-[0-9]{1,3})?$');

-- Conferência — tem de dizer `✓ ok`
select case when exists (
         select 1 from pg_constraint
         where conname = 'boletim_oms_om_check'
           and pg_get_constraintdef(oid) like '%-[0-9]{1,3}%')
       then '✓ ok' else '!! a regra nova nao entrou' end as om_de_comprovante;
