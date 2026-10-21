set search_path = medicoes, public;

-- Tira a leitura da OM no Estoque (a 0022 que não ficou). O relatório de
-- manutenção lê a OM da medição, ou da linha colada do Sisloc — o Estoque não
-- é fonte de OM. Só precisa rodar se a 0022 chegou a ser aplicada; rodar sem
-- ela não quebra nada. Termina numa tabela de uma linha em `✓ ok`.

drop function if exists medicoes.om_nos_outros_apps(text);

notify pgrst, 'reload schema';

select 'a leitura da OM no Estoque não existe mais' as o_que,
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'medicoes' and p.proname = 'om_nos_outros_apps')
            then '✓ ok' else '!! a função ainda está lá' end as situacao;
