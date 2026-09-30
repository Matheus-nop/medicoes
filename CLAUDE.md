# Medições e Contratos — Grupo Nova Opção

O app do time de faturamento, orçamento, financeiro e diretoria: boletins de
medição, contratos, painéis e relatórios num lugar só. Nasceu dentro do
Gestão de Estoque (Fase 10 de lá) e saiu para não pesar o app do galpão.
Escala real: dezenas de boletins por mês, meia dúzia de clientes grandes.
Não otimize para escala maior.

## Stack
Next.js App Router · TypeScript · Supabase (Postgres, Auth) · Tailwind · Vercel

## Onde mora
- **O mesmo projeto Supabase** do Roteiros e do Estoque, no schema **`medicoes`**.
  `public` é do Roteiros, `estoque` é do Estoque. Não se cria tabela fora de
  `medicoes`, e não se escreve no schema dos outros.
- O login é o mesmo `auth.users` dos três apps. A sessão é dividida com o
  Estoque (cookie no domínio pai, `NEXT_PUBLIC_COOKIE_DOMAIN`); o Roteiros
  guarda a dele em localStorage, e lá se entra de novo.
- O que se lê dos outros apps passa por função `security definer` curta, que
  devolve só as colunas que o boletim usa e só a usuário ativo daqui. Nunca
  por grant direto na tabela deles.

## Regras invioláveis
- Situação de boletim **não é coluna**: é o último andamento. Total, custo,
  margem, período e data de emissão saem de view. Número novo é view.
- Andamento é append-only. Não existe policy de update nem de delete.
- Uma OM entra em **um** boletim só (`unique (om)`).
- Boletim fechado não muda: a RLS só deixa mexer em OM de boletim aberto.
- O valor cobrado é o **Vl. orçamento** do Sisloc. Custo nunca vira preço.
- Custo e margem **não vão no papel** do cliente.
- Nome de quem usa o sistema nunca é texto livre: FK para `auth.users`.
  (Contato do cliente é texto: é gente de fora, sem login.)
- RLS ativa em todas as tabelas. Política nova exige teste que prove o bloqueio.
- Migração roda duas vezes sem quebrar e **sem `do $$` comprido**: ela é colada
  à mão no SQL Editor, e metade de um dollar quote engole o resto do arquivo.
  `text` com `check` em vez de `create type`.
- Português nos campos, tabelas e UI.

## Papéis (`medicoes.perfis`)
- **diretoria**: vê tudo, reabre boletim, dá e tira acesso.
- **financeiro**: fatura.
- **faturamento**: monta, fecha e envia boletim.
- **orcamento**: monta boletim e confere valor.
Hoje só "reabrir" e "dar acesso" são restritos (diretoria); o resto é de
qualquer usuário ativo. Apertar mais é decisão do time, não do código.

Quem é criado por aqui nasce **sem acesso** no Roteiros e no Estoque: os
gatilhos de lá dão PCM e operador a qualquer conta nova, e a tela de usuários
desfaz isso logo depois de criar.

## Vocabulário do domínio
- **boletim** (BM): as OMs cobradas de um cliente **numa base**, com valor, que
  vão para o cliente aprovar e depois para o faturamento. Documento Nº
  `BM-0001 - AGOSTO/2026`. O papel é o modelo da **Ação** Serviços e Máquinas.
- **base**: a fiscalização do cliente que confere o boletim — o "Nome local de
  entrega" do Sisloc.
- **OM**: a ordem de manutenção do Sisloc. Três momentos, três números:
  entrada (recibo de retirada), corretiva (a que se cobra), retorno
  (comprovante de entrega).
- **modelo**: o papel que o cliente recebe. `acao` (TESTE 2) é do Águas do Rio /
  AEGEA; `rio_mais` é o da Rio+ Saneamento — a base no topo, sem recibos e com
  o STATUS (PENDENTE/FATURADO) de cada OM. Nasce do nome do cliente e se troca.
- **OM faturada**: a Rio+ fatura OM por OM (`om_faturadas`, 0004). Só com o
  boletim fechado ou enviado; o boletim inteiro faturado conta todas.
- **medido**: o que saiu num boletim fechado. **saldo**: medido e não faturado.
- **controle**: a planilha "CONTROLE DE MEDIÇÕES" — manutenção, locação e
  indenização (extravios) de um cliente, por **região**, num **período**. Não é
  o boletim: é o contrato inteiro, lançado à mão ou colado da aba do mês.
- **período**: a FOTO do saldo em aberto num mês, acumulada. **Não se somam
  períodos**: a posição atual é a foto mais recente.
- **colagem**: a lista do Sisloc copiada e colada, com a linha de títulos.

## Estado
- [~] Fase 1 — a base: schema `medicoes`, perfis e papéis, boletim de medição
      de manutenção (vindo do Estoque), papel no modelo TESTE 2, comprovantes da
      OS e do Roteiros. Migrações `0000` a `0003` **aplicadas** no projeto
      compartilhado, com as conferências em `✓ ok`. Falta a primeira semana de
      uso com o faturamento.
- [~] Fase 2 — um papel por cliente (TESTE 2 e Rio+) com a OM faturada uma a
      uma (`0004`), e o controle de medições (`0005`): manutenção, locação e
      indenização por região e período, append-only, com o saldo em view. O
      histórico da planilha (abr/2025 a set/2026, 305 células) entra por
      `supabase/scripts/semear-controle-aguas-do-rio.sql`, e os totais batem
      com o RESUMO EXECUTIVO. Falta aplicar no Supabase e rodar um mês.
- [~] Fase 3 — o painel do controle (`/controle`): indicadores, as três
      categorias, evolução, saldo por região, relatório por base para o
      WhatsApp e o histórico — ao vivo, relendo a cada minuto. Contratos
      ainda não.
