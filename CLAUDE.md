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
- **modelo**: o papel que o cliente recebe. `aguas` é o "Águas do Rio padrão
  2026" (0008): a base no topo e os recibos de retirada e entrega. `rio_mais` é
  o da Rio+ Saneamento — a base no topo, sem recibos e com o STATUS
  (PENDENTE/FATURADO) de cada OM. Os dois moram em `papel-2026.tsx`. `acao` é o
  TESTE 2, o anterior, para o que já saiu nele. Nasce do nome do cliente e se
  troca no boletim.
- **OM faturada**: a Rio+ fatura OM por OM (`om_faturadas`, 0004). Só com o
  boletim fechado ou enviado; o boletim inteiro faturado conta todas.
- **medido**: o que saiu num boletim fechado. **saldo**: medido e não faturado.
- **Dois lançamentos, dois times.** "Lançar medições de manutenção" (`/`) é do
  **orçamento**: o boletim, OM por OM, colado do Sisloc. "Lançar medições"
  (`/controle/lancar`) é do **faturamento**: o controle por região, conforme o
  faturamento anda, e é o que o painel mostra. Um não alimenta o outro sozinho.
- **arquivo por cliente** (`/clientes`): a ficha de cada cliente, com a
  manutenção (boletins por base, cada um com o seu papel) e o faturamento (as
  bases e os meses do controle, cada um com o seu relatório), e o extrato de
  manutenção do cliente (`/clientes/extrato`, por mês). Tudo na tela ou em
  PDF — planilha não, que é dela que a casa está saindo. O nome do boletim vem do Sisloc e o do
  controle é digitado: quando não batem, são duas fichas — de propósito.
- **painel executivo** (`/controle`): a aba "Por cliente" e a aba "Todos os
  clientes", onde cada um entra com a SUA posição mais recente.
- **padrão das telas**: cartões em quadro e painéis que recolhem
  (`CartaoDoQuadro`, `Painel`), não tabela linha a linha. Tabela fica para o
  papel e para o histórico.
- **controle**: a planilha "CONTROLE DE MEDIÇÕES" — manutenção, locação e
  indenização (extravios) de um cliente, por **região**, num **período**. Não é
  o boletim: é o contrato inteiro, lançado no sistema ou importado da aba do
  mês enquanto a planilha existir.
- **período**: um mês. Guarda o medido e o faturado DO MÊS; o saldo anterior
  não se digita nem se grava — sai da soma dos meses de antes
  (`controle_posicao`, 0006). Agosto: medido 100, faturado 30 → saldo 70.
  Setembro: saldo de agosto 70 + medido − faturado. Corrigiu agosto, setembro
  acompanha. O histórico da planilha foi convertido pela 0006 sem mudar
  nenhum saldo; onde a planilha zerou saldo sem faturar, ficou medido negativo
  naquele mês (o ajuste que ela fazia calada).
- **importar a planilha** (enquanto ela existir): "Importar da planilha" no
  lançamento lê o .xlsx (ou a colagem da aba), acha a aba do mês e preenche o
  quadro — medido do mês = medido da planilha − saldo anterior do sistema, e o
  saldo que fica é o da planilha. Não salva sozinho; saldo zerado sem faturar
  aparece como aviso para conferir.
- **recebimento** (financeiro, `/controle/receber`, 0007): faturado não é
  pago. O mês guarda o recebido nele, numa tabela própria
  (`controle_recebimentos`) — na mesma linha do medido, o faturamento
  apagaria o que o financeiro lançou. a receber = abertura + faturado −
  recebido, e passa sozinho de um mês para o outro. Começa num **mês de
  início** por cliente (`controle_recebimento_inicio`): antes dele nada conta,
  porque o histórico não tem o que foi pago; no mês de início, a **abertura**
  de cada base é o que já estava a receber. Só financeiro e diretoria lançam
  (a RLS confere o papel).
- **idade do aberto**: de que mês é cada real do saldo a faturar e do a
  receber. O que sai abate primeiro o mais antigo (é como se cobra); o que
  sai a mais vira crédito e abate o que entrar depois — assim a idade soma
  exatamente o saldo. Faixas: do mês, 1 mês, 2 meses, 3 ou mais. A abertura
  do recebimento conta como velha. Conta em `lib/medicoes/controle.ts`.
- **colagem**: a lista do Sisloc copiada e colada, com a linha de títulos.

## Aparência
- App instalável (PWA): `app/manifest.ts`, `public/sw.js` e o convite de
  `components/instalar.tsx`. O ícone é próprio — a prancheta do boletim com
  barras de medição, traço branco no marinho da casa (`public/icone.svg`, e os
  PNGs gerados dele). Ícone novo pede subir o nome do cache no `sw.js`.

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
      com o RESUMO EXECUTIVO. `0004` a `0006` e a semente **aplicadas**. Falta
      rodar um mês lançando no sistema.
- [~] Fase 3 — o painel do controle (`/controle`): indicadores, as três
      categorias, evolução, saldo por região, relatório por base para o
      WhatsApp e o histórico — ao vivo, relendo a cada minuto, com a variação
      contra a foto anterior. O relatório (`/controle/relatorio`), de uma base
      ou de todas, sai em PDF A4 e vai por e-mail (o e-mail abre pronto; o PDF
      se anexa à mão — link de e-mail não leva arquivo). Contratos ainda não.
- [~] Os boletins de agosto/2026 do Águas do Rio / AEGEA (41, 165 OMs,
      R$ 227.115,00) entram por `supabase/scripts/importar-boletins-agosto-2026.sql`,
      depois da `0008`.
- [~] Fase 4 — o financeiro: recebimento (`0007`) com mês de início e
      abertura, e a idade do saldo a faturar e do a receber no painel. Falta
      aplicar a `0007` e o financeiro definir o início de cada cliente.
