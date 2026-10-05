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
- **diretoria**: lança tudo, reabre boletim, dá e tira acesso.
- **orcamento**: o boletim de manutenção e o cadastro de bases.
- **faturamento**: o boletim, o cadastro de bases e o controle (`/controle/lancar`).
- **financeiro**: o recebimento (`/controle/receber`).
- O contrato (`/contratos`) é do **faturamento** e da diretoria; apagar
  contrato ou aditivo é só da diretoria.
Ler, todo mundo lê. Cada time lança o que é seu (`0011`, policies
**restritivas** que se somam às de antes); a regra mora também em
`QUEM_LANCA` (`lib/medicoes/papeis.ts`), que só decide se a tela mostra o
botão ou o `SoLeitura` com quem lança. Mudou um, muda o outro.

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
  (comprovante de entrega). Quando a linha se cobra por um comprovante de
  substituição, devolução ou manutenção no local, o "Nº OM" é o número dele,
  com traço ("1170-01") — a `0014` aceita os dois formatos (`omValida`).
  A colagem do Sisloc continua só com a OM numérica.
- **modelo**: o papel que o cliente recebe. `aguas` é o "Águas do Rio padrão
  2026" (0008): a base no topo e os recibos de retirada e entrega, com os
  títulos PROPOSTA e OM ENTREGA, como o papel do cliente desde setembro/2026
  — os mesmos no TESTE 2 e nas telas (o campo continua `om_retirada` e
  `recibo_entrega`). `rio_mais` é
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
  manutenção do cliente (`/clientes/extrato`, por mês e por base). Tudo na tela ou em
  PDF — planilha não, que é dela que a casa está saindo. O nome do boletim vem do Sisloc e o do
  controle é digitado: quando não batem, são duas fichas — de propósito — até
  alguém **juntar** os nomes na ficha ("Nomes deste cliente").
- **vínculo** (`vinculos_de_cliente`, 0012): "o nome X é o cliente Y". Junta
  as fichas no arquivo, na ficha e no extrato; o boletim e o papel continuam
  com o nome do Sisloc. Um nível só: o cliente de um vínculo não se junta a
  outro. Desfazer é apagar — não tem número dentro. A conta é `chaveDaFicha`
  (`lib/medicoes/arquivo.ts`).
- **painel executivo** (`/controle`): a aba "Por cliente" e a aba "Todos os
  clientes", onde cada um entra com a SUA posição mais recente.
- **padrão das telas**: cartões em quadro e painéis que recolhem
  (`CartaoDoQuadro`, `Painel`), não tabela linha a linha. Tabela fica para o
  papel e para o histórico.
- **controle**: a planilha "CONTROLE DE MEDIÇÕES" — manutenção, locação e
  indenização (extravios) de um cliente, por **região**, num **período**. Não é
  o boletim: é o contrato inteiro, lançado no sistema ou importado da aba do
  mês enquanto a planilha existir.
- **período**: um mês — o mês da MEDIÇÃO, e não o da aba da planilha. A
  planilha nomeia a aba pelo mês em que fecha: a aba SETEMBRO é a medição de
  agosto, o período "Agosto 2026" (0016). Em outubro se lança setembro. Guarda
  o medido e o faturado DO MÊS; o saldo anterior
  não se digita nem se grava — sai da soma dos meses de antes
  (`controle_posicao`, 0006). Agosto: medido 100, faturado 30 → saldo 70.
  Setembro: saldo de agosto 70 + medido − faturado. Corrigiu agosto, setembro
  acompanha. O histórico da planilha foi convertido pela 0006 sem mudar
  nenhum saldo; onde a planilha zerou saldo sem faturar, ficou medido negativo
  naquele mês (o ajuste que ela fazia calada).
- **importar a planilha** (enquanto ela existir): "Importar da planilha" no
  lançamento lê o .xlsx (ou a colagem da aba), acha a aba do MÊS SEGUINTE
  (`abaDaMedicao`: a medição de agosto está na aba SET) e preenche o quadro — medido do mês = medido da planilha − saldo anterior do sistema, e o
  saldo que fica é o da planilha. Não salva sozinho; saldo zerado sem faturar
  aparece como aviso para conferir.
  A planilha de **medições em aberto** ("MEDIÇÕES EM ABERTO SEM FATURAMENTO",
  abas "ÁGUAS DO RIO - OUTUBRO") também entra, reconhecida pelos três SALDO A
  FATURAR no título (`formatoDaAba`): cada região tem uma linha por mês ainda
  em aberto. Medido = as linhas do mês da medição; saldo = a soma do SALDO A
  FATURAR da região; faturado = anterior + medido − saldo (NORTE em setembro:
  16.606 de agosto, 11.006 medidos, saldo 11.006 → 16.606 faturados). Quando
  o faturado daria negativo numa categoria e positivo noutra da mesma região, é
  **compensação** de meses antigos (o crédito de R$ 101,33 da locação de julho
  da SUL abatendo a manutenção de junho): ela vai para o MÊS ANTERIOR ao salvar
  (faturado −101,33 numa, +101,33 na outra, com observação; o total de lá não
  muda), e o mês importado fica igual à planilha. O que sobrar sem par vira
  ajuste no medido, e a tela avisa (`lerAbaEmAberto`, `doEmAbertoParaOMes`).
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
- **cadastro de bases** (`/bases`, 0010): responsável, e-mail, telefone,
  local da obra, observação e papel de cada base. O boletim novo nasce com
  eles (e, no que o cadastro não diz, com os do último boletim da base) e com
  o próximo Documento Nº da base ("08" → "09"). Base nova entra no cadastro
  ao abrir o primeiro boletim. A base se acha pela chave do nome
  (`chave_do_nome` no banco = `chaveDoCliente` no código). Editar a base não
  muda boletim que já existe; "Puxar dados da base" traz para o aberto.
- **regional**: a região do controle onde fica a base (Norte, Sul, Leste,
  Baixada I e II, Comunidade, Interior, Grande Diâmetro, VCG, Vila Kosmos).
  É campo do cadastro de bases (`0015`), porque o nome da base nem sempre a
  diz ("PENHA - CAV NORTE" é VCG); nasceu das pastas dos arquivos de agosto e
  setembro. A tela inicial filtra por ela (`?regional=VCG`), na ordem das
  regiões do controle, e a base sem regional aparece em "Sem regional".
- **PDF de todos** (`/boletins/lote?mes=&regional=&base=`): os papéis dos
  boletins apresentados de um recorte, um por página, num PDF só — a pasta da
  regional de uma vez. O aberto fica de fora (é prévia). O papel é o mesmo da
  folha de cada boletim (`PapelDoBoletim`).
- **mês de referência**: o "AGOSTO/2026" do boletim. A tela inicial filtra
  por ele (e pela base), e os números do topo passam a ser os do recorte. O
  mês se acha pela chave (`ordemDaReferencia`), não pela grafia; fica no
  endereço (`/?mes=202608`) para voltar do boletim sem perder o filtro.
- **colagem**: a lista do Sisloc copiada e colada, com a linha de títulos.
  Ela agrupa as OMs por cliente e base, e cada grupo vai para o boletim
  ABERTO da base — o mês se lança aos poucos no mesmo BM até o fechamento.
  Antes de abrir, "Editar destino" no cartão troca a base (a do cadastro, ou
  uma nova com o nome que se escrever), o Documento Nº e o mês de referência.
- **outros nomes da base** (`bases.apelidos`, 0017): o Sisloc escreve "BASE
  LESTE- MARICÁ" para a "LESTE - MARICÁ" do cadastro. Quando alguém escolhe a
  base certa para um nome que não batia, o nome entra nos outros nomes dela, e
  da próxima colagem o grupo vai sozinho (`acharBase` olha o nome e eles).
- **contrato** (`/contratos`, 0013): com quem, o quê, até quando, quanto e
  por qual índice. O cadastro se corrige; o que MUDA o contrato é **aditivo**
  (prorrogação, reajuste, acréscimo ou supressão, encerramento), que não se
  edita — o lançado por engano a diretoria apaga. A vigência e o valor de hoje
  e o **medido** (o do controle do cliente nos meses da vigência, pelas
  categorias do contrato, pela chave e pelo vínculo) saem de
  `contratos_atual`. A situação (vigente, vence logo, vencido, encerrado), o
  próximo reajuste e os alertas dependem de hoje e saem de
  `lib/medicoes/contratos.ts`. O reajuste registrado cobre o aniversário a até
  meio ano dele. O contador do menu é o de contratos pedindo ação (vence,
  venceu, reajuste sem registro, 90% do valor medido). Faturamento e
  diretoria lançam.

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
      histórico da planilha (abas ABR/2025 a SET/2026, ou seja, as medições de
      mar/2025 a ago/2026 depois da `0016`; 305 células) entra por
      `supabase/scripts/semear-controle-aguas-do-rio.sql`, e os totais batem
      com o RESUMO EXECUTIVO. `0004` a `0006` e a semente **aplicadas**. Falta
      rodar um mês lançando no sistema.
- [~] Fase 3 — o painel do controle (`/controle`): indicadores, as três
      categorias, evolução, saldo por região, relatório por base para o
      WhatsApp e o histórico — ao vivo, relendo a cada minuto, com a variação
      contra a foto anterior. O relatório (`/controle/relatorio`), de uma base
      ou de todas, sai em PDF A4 e vai por e-mail (o e-mail abre pronto; o PDF
      se anexa à mão — link de e-mail não leva arquivo). Os contratos vieram na Fase 6.
- [x] Os boletins de agosto/2026 do Águas do Rio / AEGEA (41, 167 OMs,
      R$ 227.975,00) entraram por `supabase/scripts/importar-boletins-agosto-2026.sql`,
      depois da `0008`. A primeira versão lia só as 16 linhas do modelo e
      deixou duas OMs da Setorizada Leste de fora;
      `corrigir-agosto-setorizada-leste.sql` completa.
- [~] Os de setembro/2026 (41, 145 OMs, R$ 195.477,00) entram por
      `importar-boletins-setembro-2026.sql`, depois da `0014`. Os scripts
      saem de um leitor que vai até a linha do TOTAL (o modelo cresce quando
      inserem linhas) e confere cada boletim contra o total do arquivo.
- [~] Fase 4 — o financeiro: recebimento (`0007`) com mês de início e
      abertura, e a idade do saldo a faturar e do a receber no painel. `0007`
      aplicada; falta o financeiro definir o início e a abertura de cada cliente.
- [~] Fase 5 — o dia a dia: o papel do Águas do Rio 2026 (`0008`), o período
      do boletim pela chegada (`0009`), o cadastro de bases com o próximo
      Documento Nº (`0010`), o filtro por base na tela inicial, no extrato e no
      arquivo, cada time lançando o que é seu (`0011`) e os nomes do mesmo cliente
      juntados no arquivo (`0012`). `0008` a `0010` **aplicadas**, e os
      boletins de agosto importados. Falta aplicar a `0011` e a `0012`, juntar
      os nomes do Águas do Rio / AEGEA, completar o cadastro de bases
      (responsável e local da obra) e rodar outubro inteiro no sistema com a
      planilha ao lado.
- [~] Fase 6 — os contratos (`0013`): cadastro, aditivos, a vigência e o valor
      de hoje contra o medido do controle, o reajuste pelo aniversário, os
      alertas no quadro, na ficha do cliente e no contador do menu. Falta
      aplicar a `0013` e cadastrar os contratos vigentes, a começar pelo do
      Águas do Rio / AEGEA.
- [~] O mês da medição (`0016`): os períodos recuam um mês para ter o nome do
      mês medido; nenhum saldo muda. Falta aplicar.
- As provas de RLS de todas as migrações estão em
  `supabase/scripts/provar-as-travas.sql` (trechos 1 a 21).
