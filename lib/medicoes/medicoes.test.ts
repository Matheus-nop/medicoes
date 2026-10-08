// Prova do boletim de medição.
//
// O exemplo é a colagem de verdade do ciclo completo: 23 OMs, cinco clientes,
// orçamento quase sempre 0,00, patrimônio com "SN:" colado depois e local de
// entrega que às vezes só repete o nome do cliente.

import { strictEqual as e, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  chaveDoCliente,
  omValida,
  lerOmsDaMedicao,
  mesmoCliente,
  porDestino,
  chaveDoDestino,
  mesDeReferencia,
  mesDaColagem,
  descricaoDoEquipamento,
  dataDaOm,
  entrouNaOficina,
  acharComprovantes,
  mesmaOm,
  documentoDoBoletim,
  arquivoDoBoletim,
  resumir,
  saldoPorCliente,
  valorSugerido,
  lerValorDigitado,
  type BoletimAtual,
  type ItemDoBoletim,
} from "./medicoes.ts";

const CICLO = readFileSync(
  fileURLToPath(new URL("./exemplos/sisloc-ciclo-completo.tsv", import.meta.url)),
  "utf8",
);

test("sem a linha de títulos não lê nada — valor na coluna errada é cobrança errada", () => {
  const semTitulo = CICLO.split("\n").slice(1).join("\n");
  const r = lerOmsDaMedicao(semTitulo);
  e(r.temCabecalho, false);
  e(r.linhas.length, 0);
});

test("lê toda OM da colagem, e nenhuma some em silêncio", () => {
  const r = lerOmsDaMedicao(CICLO);
  const dados = CICLO.split("\n").slice(1).filter((l) => l.trim().length >= 10);
  e(r.temCabecalho, true);
  e(r.linhas.length + r.ignoradas.length, dados.length);
});

test("tira o cliente, a obra, o equipamento e o valor da coluna certa", () => {
  const r = lerOmsDaMedicao(CICLO);
  const om = r.linhas.find((l) => l.om === "035163");
  ok(om);
  e(om.cliente, "AGUAS DO RIO 1 SPE S.A");
  e(om.equipamento, "CORTADORA MANUAL HUSQVARNA");
  e(om.patrimonio, "240815-133");
  e(om.previsto, 1097.2);
  // Orçamento 0,00: o custo fica como custo, e o valor cobrado é zero.
  e(om.valor, 0);
  e(om.fonte, "nenhum");
  // O local repete o cliente: vale a cidade.
  e(om.local, "RIO DE JANEIRO");
});

test("a base vem junto do local de entrega", () => {
  const r = lerOmsDaMedicao(CICLO);
  e(r.linhas.find((l) => l.om === "034847")?.local, "BASE BAIXADA II - NILOPOLIS");
});

test("o patrimônio sai sem o número de série do fabricante", () => {
  const r = lerOmsDaMedicao(CICLO);
  e(r.linhas.find((l) => l.om === "034856")?.patrimonio, "260615-171");
});

test("o valor é o orçamento, e só ele — 0,00 não é preço, e custo também não", () => {
  e(valorSugerido(28).fonte, "orcamento");
  e(valorSugerido(28).valor, 28);
  // Custo não é preço: sem orçamento, o valor é zero e a tela avisa.
  e(valorSugerido(0).fonte, "nenhum");
  e(valorSugerido(0).valor, 0);
  e(valorSugerido(null).valor, 0);

  const r = lerOmsDaMedicao(CICLO);
  const om = r.linhas.find((l) => l.om === "036075");
  e(om?.valor, 28);
  e(om?.fonte, "orcamento");
});

test("OM repetida na colagem entra uma vez só", () => {
  const linhas = CICLO.split("\n");
  const r = lerOmsDaMedicao([...linhas, linhas[1]].join("\n"));
  e(r.ignoradas.filter((i) => i.motivo.includes("repetida")).length, 1);
});

test("S.A. e S.A são o mesmo cliente", () => {
  ok(mesmoCliente("AEGEA SANEAMENTO E PARTICIPACOES S.A.", "AEGEA SANEAMENTO E PARTICIPACOES S.A"));
  ok(mesmoCliente("Águas do Rio 4 SPE S.A", "AGUAS DO RIO 4 SPE S.A"));
  ok(!mesmoCliente("AGUAS DO RIO 1 SPE S.A", "AGUAS DO RIO 4 SPE S.A"));
  e(chaveDoCliente("  aegea  s.a. "), "AEGEA SA");
  ok(mesmoCliente("AEGEA SA", "AEGEA S.A."));
});

test("a colagem se separa por cliente e base, e cada grupo soma o seu", () => {
  const r = lerOmsDaMedicao(CICLO);
  const grupos = porDestino(r.linhas);
  e(grupos.reduce((t, g) => t + g.linhas.length, 0), r.linhas.length);
  e(new Set(grupos.map((g) => g.chave)).size, grupos.length);
  for (const g of grupos) {
    ok(g.linhas.every((l) => chaveDoDestino(l.cliente, l.local) === g.chave));
    const soma = g.linhas.reduce((t, l) => t + l.valor, 0);
    ok(Math.abs(soma - g.valor) < 0.001);
  }
  // A mesma base, colada duas vezes, cai no mesmo boletim.
  const campinho = grupos.find((g) => g.base === "BASE NORTE- CAMPINHO");
  e(campinho?.linhas.length, 2);
  // Clientes diferentes com a mesma cidade não se misturam.
  ok(grupos.filter((g) => g.base === "RIO DE JANEIRO").every((g) => g.linhas.length >= 1));
});

test("S.A. e S.A na mesma base são o mesmo destino", () => {
  e(chaveDoDestino("AEGEA S.A.", "VCG - BLOCO 4"), chaveDoDestino("AEGEA S.A", "vcg - bloco 4"));
  ok(chaveDoDestino("AEGEA", "BASE 1") !== chaveDoDestino("AEGEA", "BASE 2"));
});

test("lê a etapa e avisa da OM que ainda está na oficina", () => {
  const r = lerOmsDaMedicao(
    readFileSync(fileURLToPath(new URL("./exemplos/sisloc-manutencao.tsv", import.meta.url)), "utf8"),
  );
  const executando = r.linhas.find((l) => l.om === "034667");
  e(executando?.etapa, "em_execucao");
  e(executando?.naOficina, true);
  const concluida = r.linhas.find((l) => l.om === "035163");
  e(concluida?.naOficina, false);
  const entregue = lerOmsDaMedicao(CICLO).linhas.find((l) => l.om === "034292");
  e(entregue?.etapa, "entregue");
  e(entregue?.naOficina, false);
});

test("lê OM RETIRADA e DATA DE CHEGADA quando o Sisloc traz", () => {
  const cab = CICLO.split("\n")[0].split("\t");
  const linha = new Array(cab.length).fill("");
  const col = (nome: string) => cab.findIndex((c) => c.trim() === nome);
  linha[col("Número")] = "032731";
  linha[col("Cliente")] = "AEGEA SANEAMENTO E PARTICIPACOES S.A.";
  linha[col("Nome local de entrega")] = "VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4";
  linha[col("Equipamento")] = "CORTADORA MANUAL HUSQVARNA";
  linha[col("Patr./Núm. série")] = "251125-431";
  linha[col("OM RETIRADA")] = "032344";
  linha[col("DATA DE CHEGADA")] = "23/07/2026";
  linha[col("Dt. abertura")] = "25/07/2026 08:00:00";
  linha[col("Vl. orçamento")] = "2.624,00";
  const r = lerOmsDaMedicao([cab.join("\t"), linha.join("\t")].join("\n"));
  const om = r.linhas[0];
  e(om.omRetirada, "032344");
  e(om.chegadaEm, "2026-07-23T12:00:00-03:00");
  e(om.valor, 2624);
  e(om.local, "VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4");
  e(dataDaOm({ chegada_em: om.chegadaEm, aberta_em: om.abertaEm }), om.chegadaEm);
  e(dataDaOm({ chegada_em: null, aberta_em: om.abertaEm }), om.abertaEm);
});

test("o mês de referência é o do serviço, não o da emissão", () => {
  e(mesDeReferencia(["2026-07-23T12:00:00-03:00", "2026-08-19T12:00:00-03:00"]), "AGOSTO/2026");
  // 31/08 às 22h em Brasília ainda é agosto, mesmo sendo setembro em UTC.
  e(mesDeReferencia(["2026-08-31T22:00:00-03:00"]), "AGOSTO/2026");
  e(mesDeReferencia([null], new Date("2026-09-10T12:00:00-03:00")), "AGOSTO/2026");
  e(mesDeReferencia([], new Date("2026-01-10T12:00:00-03:00")), "DEZEMBRO/2025");
});

test("máquina de cliente leva o complemento na descrição", () => {
  e(descricaoDoEquipamento("CORTADORA DE PISO (CLIENTE)", "TOYAMA TCC450-H"), "CORTADORA DE PISO (CLIENTE) — TOYAMA TCC450-H");
  e(descricaoDoEquipamento("CORTADORA MANUAL HUSQVARNA", ""), "CORTADORA MANUAL HUSQVARNA");
  e(descricaoDoEquipamento("GERADOR HONDA", "honda"), "GERADOR HONDA");
});

const item = (p: Partial<ItemDoBoletim>): ItemDoBoletim => ({
  id: 1,
  om: "1",
  patrimonio: null,
  equipamento: null,
  local: null,
  cidade: null,
  tipo_om: null,
  aberta_em: null,
  concluida_em: null,
  custo: null,
  valor: 0,
  fonte: "nenhum",
  observacao: null,
  complemento: null,
  om_retirada: null,
  recibo_entrega: null,
  chegada_em: null,
  etapa_om: null,
  ...p,
});

test("o resumo soma, fatia por obra e aponta o que conferir", () => {
  const r = resumir([
    item({ om: "1", valor: 100, custo: 60, local: "BASE NORTE - ILHA", equipamento: "GERADOR", fonte: "orcamento" }),
    item({ om: "2", valor: 50, custo: 50, local: "BASE NORTE - ILHA", equipamento: "BOMBA", fonte: "previsto" }),
    item({ om: "3", valor: 0, custo: 20, local: null, cidade: "MARICÁ", equipamento: "GERADOR" }),
  ]);
  e(r.oms, 3);
  e(r.valor, 150);
  e(r.custo, 130);
  e(r.margem, 20);
  e(r.semValor, 1);
  e(r.valorEhCusto, 1);
  e(r.porLocal[0].nome, "BASE NORTE - ILHA");
  e(r.porLocal[0].valor, 150);
  e(r.porLocal[1].nome, "MARICÁ");
  e(r.porEquipamento.find((f) => f.nome === "GERADOR")?.oms, 2);
});

test("sem custo lançado não há margem — e não margem de 100%", () => {
  e(resumir([item({ valor: 10 })]).margem, null);
});

const boletim = (p: Partial<BoletimAtual>): BoletimAtual => ({
  id: 1,
  numero: "BM-0001",
  cliente: "AEGEA",
  referencia: null,
  observacao: null,
  criado_em: "2026-09-01T12:00:00-03:00",
  criado_por_nome: null,
  situacao: "aberto",
  situacao_em: null,
  situacao_por_nome: null,
  oms: 1,
  valor: 0,
  custo: null,
  primeira_om: null,
  ultima_om: null,
  base: null,
  contato: null,
  email: null,
  telefone: null,
  local_obra: null,
  fechado_em: null,
  modelo: "acao",
  documento: null,
  faturado: 0,
  oms_faturadas: 0,
  ...p,
});

test("medido é o que saiu fechado; o aberto fica à parte; saldo é o que falta faturar", () => {
  const [s] = saldoPorCliente([
    boletim({ id: 1, cliente: "AEGEA S.A.", situacao: "aberto", valor: 500 }),
    boletim({ id: 2, cliente: "AEGEA S.A", situacao: "fechado", valor: 300 }),
    boletim({ id: 3, cliente: "AEGEA SA", situacao: "enviado", valor: 200 }),
    boletim({ id: 4, cliente: "Aegea S.A.", situacao: "faturado", valor: 1000 }),
  ]);
  e(s.boletins, 4);
  e(s.emMedicao, 500);
  e(s.medido, 1500);
  e(s.faturado, 1000);
  e(s.saldo, 500);
});

test("a OM faturada sozinha entra no faturado do cliente", () => {
  const [s] = saldoPorCliente([
    boletim({ id: 1, situacao: "enviado", valor: 1000, faturado: 400, oms_faturadas: 2 }),
    // Aberto não conta, mesmo que alguém tenha marcado antes de reabrir.
    boletim({ id: 2, situacao: "aberto", valor: 300, faturado: 300 }),
  ]);
  e(s.medido, 1000);
  e(s.faturado, 400);
  e(s.saldo, 600);
});

test("o valor digitado aceita vírgula e ponto sem multiplicar por cem", () => {
  e(lerValorDigitado("1.097,20"), 1097.2);
  e(lerValorDigitado("1097,2"), 1097.2);
  e(lerValorDigitado("1097.20"), 1097.2);
  e(lerValorDigitado("R$ 350"), 350);
  e(lerValorDigitado("1.500"), 1500);
  e(lerValorDigitado("abc"), null);
  e(lerValorDigitado("-5"), null);
  e(lerValorDigitado(""), null);
});

test("o retrato da etapa diz se a OM entrou antes de a oficina largar", () => {
  ok(entrouNaOficina("5 - Oficina executando ordem de manutenção"));
  ok(!entrouNaOficina("6 - Oficina concluiu serviço"));
  ok(!entrouNaOficina("7 - Equipamento entregue"));
  ok(!entrouNaOficina(null));
  ok(!entrouNaOficina(""));
});

/* ── Os comprovantes ─────────────────────────────────────── */

const OM_COBRADA = {
  om: "032731",
  patrimonio: "251125-431",
  abertaEm: "2026-07-25T08:00:00-03:00",
};

test("a OS da corretiva dá os dois comprovantes, exatos", () => {
  const c = acharComprovantes(
    OM_COBRADA,
    [{ patrimonio: "251125-431", om_entrada: "032344", om_corretiva: "32731", om_retorno: "033923" }],
    [],
  );
  e(c.retirada, "032344");
  e(c.entrega, "033923");
  e(c.deOnde.retirada, "os");
  e(c.deOnde.entrega, "os");
});

test("sem OS, o Roteiros dá pela data: a retirada antes, a entrega finalizada depois", () => {
  const d = (tipo: string, om: string, dia: string, finalizada = true) => ({
    patrimonio: "251125 431",
    tipo,
    om,
    dia,
    finalizada,
  });
  const c = acharComprovantes(OM_COBRADA, [], [
    d("RETIRADA", "031000", "2026-04-01"), // velha demais: outro conserto
    d("RETIRADA", "032344", "2026-07-23"),
    d("RETORNO AO CLIENTE", "033000", "2026-08-01", false), // não finalizada
    d("RETORNO AO CLIENTE", "033923", "2026-08-10"),
    d("RETORNO AO CLIENTE", "034999", "2026-09-20"),
    d("ENTREGA", "035000", "2026-08-05"), // entrega de locação, não retorno
  ]);
  e(c.retirada, "032344");
  e(c.entrega, "033923");
  e(c.deOnde.entrega, "roteiros");
});

test("a Dt. entrega do Sisloc escolhe o retorno mais perto dela", () => {
  const c = acharComprovantes({ ...OM_COBRADA, entregueEm: "2026-09-19T10:00:00-03:00" }, [], [
    { patrimonio: "251125-431", tipo: "RETORNO AO CLIENTE", om: "033923", dia: "2026-08-10", finalizada: true },
    { patrimonio: "251125-431", tipo: "RETORNO AO CLIENTE", om: "034999", dia: "2026-09-20", finalizada: true },
  ]);
  e(c.entrega, "034999");
});

test("a própria OM nunca vira comprovante, e patrimônio de outra máquina não conta", () => {
  const c = acharComprovantes(OM_COBRADA, [], [
    { patrimonio: "251125-431", tipo: "RETORNO AO CLIENTE", om: "032731", dia: "2026-08-10", finalizada: true },
    { patrimonio: "251125-079", tipo: "RETORNO AO CLIENTE", om: "033194", dia: "2026-08-10", finalizada: true },
  ]);
  e(c.entrega, null);
  e(c.retirada, null);
});

test("034292 e 34292 são a mesma OM", () => {
  ok(mesmaOm("034292", "34292"));
  ok(!mesmaOm("034292", "034293"));
  ok(!mesmaOm("", ""));
  ok(!mesmaOm(null, "1"));
});

test("o documento leva o mês, e o arquivo tem nome de arquivo", () => {
  e(documentoDoBoletim({ numero: "BM-0001", referencia: "AGOSTO/2026" }), "BM-0001 - AGOSTO/2026");
  e(documentoDoBoletim({ numero: "BM-0001", referencia: null }), "BM-0001");
  e(
    arquivoDoBoletim({
      numero: "BM-0001",
      referencia: "AGOSTO/2026",
      base: "VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4",
      cliente: "AEGEA",
    }),
    "BM-0001 - BM MANUTENÇÃO - VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4 - AGOSTO-2026",
  );
  e(arquivoDoBoletim({ numero: "BM-0002", referencia: null, base: null, cliente: "AEGEA S.A." }), "BM-0002 - BM MANUTENÇÃO - AEGEA S.A.");
});

test("o papel de cada cliente", async () => {
  const { modeloDoCliente, statusDaOm } = await import("./medicoes.ts");
  e(modeloDoCliente("RIO + SANEAMENTO BL3 S.A"), "rio_mais");
  e(modeloDoCliente("Rio+ Saneamento"), "rio_mais");
  e(modeloDoCliente("RIO MAIS SANEAMENTO"), "rio_mais");
  e(modeloDoCliente("AGUAS DO RIO 4 SPE S.A"), "aguas");
  e(modeloDoCliente("AEGEA SANEAMENTO E PARTICIPAÇÕES S.A"), "aguas");
  e(modeloDoCliente("CONSTRUTORA QUALQUER"), "acao");
  e(modeloDoCliente("RIO MAIS"), "rio_mais");
  e(statusDaOm({ faturada: true }), "FATURADO");
  e(statusDaOm({ faturada: false }), "PENDENTE");
});

test("o documento escrito à mão vence o da casa", () => {
  e(documentoDoBoletim({ numero: "BM-0007", referencia: "SETEMBRO/2026", documento: "12" }), "12");
  e(
    documentoDoBoletim({ numero: "BM-0007", referencia: "SETEMBRO/2026", documento: "  " }),
    "BM-0007 - SETEMBRO/2026",
  );
});

test("o Nº OM: a do Sisloc ou o comprovante com traço (0014)", () => {
  ok(omValida("034292"));
  ok(omValida("1170-01"));
  ok(omValida(" 2252-17 "));
  ok(!omValida("12"));
  ok(!omValida("1170-"));
  ok(!omValida("1170-0001"));
  ok(!omValida("OM 034292"));
});

test("a colagem abre o BM do mês em que se lança, não o da data da OM", () => {
  e(mesDaColagem(new Date("2026-10-08T12:00:00-03:00")), "OUTUBRO/2026");
  // 31/10 às 22h em Brasília ainda é outubro, mesmo já sendo novembro em UTC.
  e(mesDaColagem(new Date("2026-11-01T01:00:00Z")), "OUTUBRO/2026");
});
