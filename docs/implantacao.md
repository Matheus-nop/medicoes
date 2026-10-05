# Subir o app de Medições e Contratos

O app mora no **mesmo projeto Supabase** do Roteiros e do Estoque, no schema
`medicoes`. Não se cria projeto novo. São quatro etapas; nenhuma exige terminal.

## 1. Banco — SQL Editor do projeto compartilhado

Cole e rode **um arquivo por vez, nesta ordem**:

1. `supabase/migrations/0000_schema.sql`
2. `supabase/migrations/0001_perfis.sql`
3. `supabase/migrations/0002_boletins.sql`
4. `supabase/migrations/0003_comprovantes.sql`
5. `supabase/migrations/0004_modelo_e_om_faturada.sql` — o papel da Rio+ e a OM
   faturada. **Aplique antes do deploy que a traz**: o boletim novo já grava
   o `modelo`.
6. `supabase/migrations/0005_controle.sql` — o controle de medições.
7. `supabase/scripts/semear-controle-aguas-do-rio.sql` — o histórico da
   planilha. A conferência do fim lista cada período: tem de bater com o
   RESUMO EXECUTIVO (setembro/2026: 1.558.887,59 medido, 566.982,35 faturado).
   Os períodos nascem com o nome da ABA; a 0016 os recua para o mês medido.
8. `supabase/migrations/0006_saldo_que_passa.sql` — o mês passa a guardar só
   o medido e o faturado dele, e o saldo anterior vem sozinho. Converte o
   histórico (uma vez só) sem mudar nenhum saldo: a lista do fim tem de dar
   setembro/2026 com saldo 991.905,24.
9. `supabase/migrations/0007_recebimento.sql` — o recebimento do financeiro.
   Não muda nenhum saldo. Depois dela, o financeiro abre "Lançar
   recebimentos", escolhe o mês de início e informa a abertura de cada base.
10. `supabase/migrations/0008_papel_aguas_2026.sql` — o papel do Águas do Rio
    padrão 2026.
11. `supabase/scripts/importar-boletins-agosto-2026.sql` — os 41 boletins de
    agosto. A primeira conferência tem de dar 41 boletins, 165 OMs e
    227.115,00; a segunda lista a OM que ficou de fora por já estar em outro
    boletim (vazia é o esperado).
12. `supabase/migrations/0009_periodo_pela_chegada.sql` — o período do
    boletim ("OMs de … a …") passa a olhar a data de chegada, que é a que os
    boletins importados trazem.
13. `supabase/migrations/0010_bases.sql` — o cadastro de bases. Ele nasce com
    as bases dos boletins que já existem (o mais recente de cada uma empresta
    os dados); a conferência tem de dizer `✓ ok` e mostra quantas bases entraram.
14. `supabase/migrations/0011_cada_time_lanca_o_seu.sql` — cada time lança o
    que é seu (ver **4. Acessos**). **Antes**, confira em Usuários o papel de
    cada pessoa: quem lança o controle e está como Orçamento para de conseguir
    salvar. O fim da conferência lista quem está em cada papel.
15. `supabase/migrations/0012_nomes_do_cliente.sql` — os nomes do mesmo
    cliente. Depois de aplicar, abra a ficha **ÁGUAS DO RIO / AEGEA** no
    Arquivo por cliente e, em "Nomes deste cliente", junte os nomes do Sisloc
    (AGUAS DO RIO 1 SPE, AGUAS DO RIO 4 SPE, AEGEA…).
16. `supabase/migrations/0013_contratos.sql` — os contratos. Rode depois da
    0012 (a conta do medido usa o vínculo). Depois, o faturamento cadastra os
    contratos vigentes em **Contratos**, com o nome do cliente **igual ao do
    controle** — é por ele que o medido entra no contrato — e registra os
    aditivos que já existem (prorrogações e reajustes), senão o reajuste
    aparece como atrasado.
17. `supabase/migrations/0014_om_de_comprovante.sql` — o Nº OM passa a aceitar
    o número do comprovante ("1170-01"), que vai no papel quando a linha se
    cobra por ele.
18. `supabase/scripts/corrigir-agosto-setorizada-leste.sql` — as duas OMs da
    Setorizada Leste Bloco 1 que a importação de agosto deixou de fora (o
    boletim vai a 18 OMs e R$ 38.904,00).
19. `supabase/scripts/importar-boletins-setembro-2026.sql` — os 41 boletins de
    setembro (145 OMs, R$ 195.477,00), fechados em 02/10/2026. A conferência no
    fim tem de dar 41, 145 e 195.477,00, e a lista de OMs em outro boletim tem
    de vir vazia.
20. `supabase/migrations/0015_regional_da_base.sql` — a regional de cada base,
    preenchida pelas pastas dos arquivos (49 bases). A conferência mostra
    quantas bases há em cada regional; a que ficar sem se acerta em
    **Cadastro de bases**.
21. `supabase/migrations/0016_o_mes_da_medicao.sql` — o período passa a ter o
    nome do mês MEDIDO, e não o da aba da planilha: a aba SETEMBRO é a medição
    de agosto (saldo de julho + medido em agosto). Cada período recua um mês —
    "Setembro 2026" vira "Agosto 2026" —, o início do recebimento recua junto, e
    nenhum saldo muda (a lista do fim mostra o saldo de cada um: Agosto 2026 tem
    de dar 991.905,24). Roda uma vez só: rodar de novo não desloca outra vez.

Cada uma (menos a 0000) termina numa conferência: **toda linha tem de dizer
`✓ ok`**. Se aparecer `!!`, a colagem provavelmente chegou cortada — rode o
arquivo de novo; elas são idempotentes.

> As `0090`, `0091` e `0092` do Gestão de Estoque **não se aplicam**: são a
> versão antiga do boletim, de quando ele morava lá. O PR #180 de lá fica
> fechado sem merge.

Depois, a **primeira diretoria**. Ninguém tem acesso ainda, e só a diretoria dá
acesso — a primeira pessoa entra pelo SQL. Troque o nome e o e-mail:

```sql
insert into medicoes.perfis (id, nome, papel)
select id, 'SEU NOME', 'diretoria' from auth.users where email = 'seu@email'
on conflict (id) do update set papel = 'diretoria', ativo = true;
```

O e-mail tem de ser de alguém que **já tem login** no Estoque ou no Roteiros.
Deve responder `INSERT 0 1`. Se responder `INSERT 0 0`, o e-mail não existe em
`auth.users`.

Por fim, a prova das travas: `supabase/scripts/provar-as-travas.sql` — a
PARTE 1 inteira, e os trechos da PARTE 2 um por vez.

## 2. Painel do Supabase

- **Settings → API → Exposed schemas**: acrescentar `medicoes` ao lado de
  `public` e `estoque`. Sem isso o app responde 404 em tudo.
- **Authentication → URL Configuration → Redirect URLs**: acrescentar o
  endereço do app (`https://medicoes.novaopcaoequipamentos.com.br/**`). É o que
  faz o "esqueci minha senha" voltar para cá.

## 3. Vercel

**Add New → Project → importar `Matheus-nop/medicoes`.** O framework é
detectado sozinho (Next.js).

Variáveis de ambiente — as quatro primeiras são **as mesmas do Estoque**
(copie de lá: Settings → Environment Variables):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | o mesmo do Estoque |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | o mesmo do Estoque |
| `SUPABASE_SERVICE_ROLE_KEY` | o mesmo do Estoque (só para criar usuário e trocar senha) |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | `.novaopcaoequipamentos.com.br` |
| `NEXT_PUBLIC_URL_ESTOQUE` | o endereço do Estoque |
| `NEXT_PUBLIC_URL_ROTEIROS` | o endereço do Roteiros |
| `NEXT_PUBLIC_URL_FROTA` | o endereço da Frota (opcional) |

**Domains**: `medicoes.novaopcaoequipamentos.com.br`. Com o cookie no domínio
pai, quem já está logado no **Estoque** entra aqui sem digitar a senha. Do
**Roteiros** a senha é a mesma, mas é preciso entrar de novo: ele guarda a
sessão no navegador (localStorage), e não no cookie.

**E nos outros dois apps**, para o Medições aparecer na troca de sistema:
acrescente a variável com o endereço daqui e faça um redeploy — no Estoque ela
se chama `NEXT_PUBLIC_URL_MEDICOES`; no Roteiros, `VITE_URL_MEDICOES`. O item na
lista de cada um vem nos PRs de lá.

## 4. Acessos

Entre com a conta da diretoria, abra **Usuários** e dê o papel de cada pessoa:

| Papel | Lança | Só lê |
|---|---|---|
| Diretoria | tudo, mais reabrir boletim e dar/tirar acesso | — |
| Orçamento | boletim de manutenção e cadastro de bases | controle, recebimento e contratos |
| Faturamento | boletim, cadastro de bases, o controle (Lançar medições) e os contratos | recebimento |
| Financeiro | recebimento | boletim, bases, controle e contratos |

Ler, todo mundo lê. A trava é da `0011` (e a do recebimento, da `0007`); a
tela de quem não lança mostra o aviso de quem lança, em vez do botão.

Quem já tem login no grupo recebe o acesso com a **mesma senha**. Quem não tem
ganha uma conta nova — e essa conta nasce **sem acesso** ao Roteiros e ao
Estoque (os gatilhos de lá dariam PCM e operador a qualquer conta nova; a tela
de usuários desfaz isso na hora).

## Depois de no ar

- Tirar as medições do Estoque: a seção Comercial do menu e as telas saem de
  lá num PR próprio, quando o time já estiver usando este.
