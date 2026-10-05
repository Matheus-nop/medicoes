set search_path = medicoes, public;

-- =====================================================================
-- 0016: o período tem o nome do mês da MEDIÇÃO, não o da aba
-- (rode uma vez só — e se rodar de novo, não desloca outra vez)
-- =====================================================================
--
-- A planilha nomeia a aba pelo mês em que ela é fechada: a aba SETEMBRO é a
-- medição de AGOSTO — o saldo de julho mais o que se mediu em agosto. O
-- controle copiou o nome da aba, e todo período ficou com um mês à frente.
--
-- Aqui cada período recua um mês, com o nome junto: "Setembro 2026" vira
-- "Agosto 2026", "Jun/Jul 2025" vira "Mai/Jun 2025", e o "Outubro 2026" que
-- já foi aberto vira "Setembro 2026". Os valores não mudam — nenhum número
-- muda: só o nome do mês em que ele está. O mês de início do recebimento recua
-- junto, para continuar apontando o mesmo período.
--
-- A importação da planilha passa a procurar a aba do MÊS SEGUINTE: a medição
-- de agosto está na aba SET.
--
-- O deslocamento é feito uma vez, e a marca `controle_formato` versão 3 diz
-- que já foi. É um comando só (o deslocamento e a marca juntos): se a colagem
-- cortar, ou ele entrou inteiro ou não entrou.

-- 1. Cada período vai para o mês anterior — primeiro para longe (200 anos
--    atrás), porque dois períodos não podem ocupar o mesmo mês nem por um
--    instante; o passo 2 traz de volta. O início do recebimento recua junto.
with marca as (
  select exists (select 1 from controle_formato where versao >= 3) as feita
),
alvo as (
  select id, rotulo, (mes - interval '1 month')::date as novo
  from controle_periodos
  where mes >= date '1950-01-01'
),
periodos as (
  update controle_periodos c
     set mes = (a.novo - interval '200 years')::date,
         rotulo = case
           when a.rotulo like '%/%' then
             (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])
               [extract(month from (a.novo - interval '1 month'))::int]
             || '/' ||
             (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])
               [extract(month from a.novo)::int]
             || ' ' || extract(year from a.novo)::int
           else
             (array['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto',
                    'Setembro','Outubro','Novembro','Dezembro'])[extract(month from a.novo)::int]
             || ' ' || extract(year from a.novo)::int
         end
    from alvo a, marca
   where c.id = a.id and not marca.feita
  returning 1
),
inicio as (
  update controle_recebimento_inicio
     set mes = (mes - interval '1 month')::date
    from marca
   where not marca.feita
  returning 1
)
insert into controle_formato (versao)
select 3
from marca
where not marca.feita
  and (select count(*) from periodos) >= 0
  and (select count(*) from inicio) >= 0;

-- 2. Os períodos voltam para perto — já no mês da medição. Sem nada lá
--    longe, não faz nada; por isso pode rodar de novo.
update controle_periodos
   set mes = (mes + interval '200 years')::date
 where mes < date '1950-01-01';

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------

select case when exists (select 1 from controle_formato where versao >= 3)
            then '✓ ok' else '!! nao deslocou' end as mes_da_medicao,
       case when not exists (select 1 from controle_periodos where mes < date '1950-01-01')
            then '✓ ok' else '!! ficou periodo longe: rode o arquivo de novo' end as nenhum_longe;

-- Os períodos com o nome novo, e o saldo de cada um (não pode ter mudado).
select cliente, rotulo, mes, saldo
from controle_mes
order by cliente, mes;
