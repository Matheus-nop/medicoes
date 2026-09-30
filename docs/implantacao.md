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

| Papel | O que faz |
|---|---|
| Diretoria | tudo, mais reabrir boletim e dar/tirar acesso |
| Financeiro | fatura |
| Faturamento | monta, fecha e envia boletim |
| Orçamento | monta boletim e confere valor |

Quem já tem login no grupo recebe o acesso com a **mesma senha**. Quem não tem
ganha uma conta nova — e essa conta nasce **sem acesso** ao Roteiros e ao
Estoque (os gatilhos de lá dariam PCM e operador a qualquer conta nova; a tela
de usuários desfaz isso na hora).

## Depois de no ar

- Tirar as medições do Estoque: a seção Comercial do menu e as telas saem de
  lá num PR próprio, quando o time já estiver usando este.
