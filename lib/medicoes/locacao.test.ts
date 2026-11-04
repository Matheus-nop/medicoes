// Prova da medição de locação: a leitura do boletim do Sisloc, a troca e as
// conferências. As linhas imitam o que `linhasDoPdf` tira do PDF: os pedaços
// de uma altura, separados por tabulação.

import { strictEqual as e, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  bateComOSisloc,
  boletinsDoPdf,
  linhasDosBms,
  omsNoTexto,
  cobravel,
  faltaNaBase,
  lerBoletimDeLocacao,
  linhasDaLocacao,
  linhasDaManutencao,
  nomeDaBase,
  patrimoniosRepetidos,
  periodoDaPlanilha,
  posicoesDoBoletim,
  separarPatrimonio,
  sugestaoDaBase,
  totalLido,
} from "./locacao.ts";

const L = (...p: string[]) => p.join("\t");
const item = (q: string, nome: string, de: string, ate: string, dias: string, subs: string, base: string, total: string) =>
  L(q, nome, `${de} ${ate}`, dias, subs, base, total);

const BOLETIM = [
  L("29/08/2026 13:31:02"),
  L("NOVA OPÇÃO", "CLARA CARVALHO"),
  L("Boletim de medição"),
  L("PÁG.: 1"),
  L("Ficha :000001220/25, 000001255/25,"),
  L("000002565/25"),
  L("Cliente :", "AEGEA SANEAMENTO E PARTICIPACOES S.A."),
  L("Entrega :VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4 - RODOVIA PRESIDENTE DUTRA, 478 - JARDIM AMÉRICA - RIO DE"),
  L("JANEIRO - RJ - 21240-002"),
  L("Vendedor :", "FULANA"),
  L("Período Faturamento :", "Medição Mensal : 01/08/2026 - 31/08/2026"),
  L("Fatura de Locação - Nova", "Número:", "não emitida", "Cód. docto:", "36962", "Vencimento :", "28/09/2026"),
  L("QTDE", "Equipamento", "Período", "Tempo", "Subs.", "VL Base", "Valor Total"),
  L("Remessa:", "001257-01", "Data:", "01/07/2025", "NF Remessa:", "004607"),
  item("1", "MARTELO ROMPEDOR 30KG (250114-684)", "01/08", "31/08", "31 D", "Não", "450,00", "450,00"),
  item("6", "TALHADEIRA SEXTAVADA 28MM P/ MARTELO 20 A", "01/08", "31/08", "31 D", "Não", "0,00", "0,00"),
  L("30KG"),
  L("Total Remessa [001257-01] :", "450,00"),
  L("Remessa:", "002565-01", "Data:", "01/11/2025", "NF Remessa:", "005339"),
  L("CORTADORA DE PISO HUSQVARNA"),
  item("1", "CORTADORA PISO HUSQVARNA (25012-169)", "01/08", "20/08", "20 D", "Sim", "400,00", "258,06"),
  item("1", "BOMBA DE MANGOTE 3\" (25025-826)", "01/08", "31/08", "31 D", "Não", "100,00", "100,00"),
  L("Contato :", "Telefone :"),
  L("Entrega :VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4 - RODOVIA PRESIDENTE DUTRA, 478"),
  L("Remessa:", "002565-01", "Data:", "01/11/2025", "NF Remessa:", "005339"),
  item("1", "GRUPO GERADOR 3,5KVA MONOF. (250115-574)", "01/08", "31/08", "31 D", "Não", "300,00", "300,00"),
  L("Total Remessa [002565-01] :", "658,06"),
  L("Remessa:", "002565-03", "Data:", "08/04/2026 07:55", "NF Remessa:"),
  item("1", "BOMBA DE MANGOTE 3\" (25025-268)", "01/08", "07/08", "7D", "Sim", "100,00", "22,58"),
  L("Remessa:", "002565-11", "Data:", "07/08/2026 15:40", "NF Remessa:"),
  item("1", "BOMBA DE MANGOTE 3\" (25025-832)", "08/08", "31/08", "24 D", "Não", "100,00", "77,42"),
  L("Remessa:", "002565-13", "Data:", "20/08/2026 14:45", "NF Remessa:"),
  L("CORTADORA DE PISO HUSQVARNA"),
  item("1", "CORTADORA PISO WOLKAN (22042-063)", "21/08", "31/08", "11 D", "Não", "400,00", "141,94"),
  L("Total Locação:", "1.350,00"),
  L("TOTAL GERAL :", "1.350,00"),
];

const lido = () => {
  const r = lerBoletimDeLocacao(BOLETIM);
  if (!r.ok) throw new Error(r.erro);
  return r.boletim;
};

test("lê o cabeçalho: base sem endereço, fichas em duas linhas, período e código", () => {
  const b = lido();
  e(b.base, "VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4");
  deepStrictEqual(b.fichas, ["000001220/25", "000001255/25", "000002565/25"]);
  e(b.periodo_inicio, "2026-08-01");
  e(b.periodo_fim, "2026-08-31");
  e(b.cod_docto, "36962");
  e(b.total_sisloc, 1350);
});

test("lê os itens: o nome que quebra de linha volta inteiro, e a remessa repetida na página não duplica", () => {
  const b = lido();
  e(b.itens.length, 8);
  e(b.itens[1].equipamento, "TALHADEIRA SEXTAVADA 28MM P/ MARTELO 20 A 30KG");
  e(b.itens.filter((i) => i.remessa === "002565-01").length, 3);
  const bomba = b.itens.find((i) => i.patrimonio === "25025-268")!;
  e(bomba.dias, 7);
  e(bomba.substituido, true);
  e(bomba.fim, "2026-08-07");
  e(bomba.remessa_data, "2026-04-08");
});

test("o título do kit fica no item de baixo, e não no resto da remessa", () => {
  const b = lido();
  e(b.itens.find((i) => i.patrimonio === "25012-169")!.grupo, "CORTADORA DE PISO HUSQVARNA");
  e(b.itens.find((i) => i.patrimonio === "25025-826")!.grupo, null);
});

test("acessório a R$ 0,00 não se cobra; o total lido bate com o Sisloc", () => {
  const b = lido();
  e(b.itens.filter(cobravel).length, 7);
  e(totalLido(b.itens), 1350);
  e(bateComOSisloc(b), true);
});

test("a troca vira uma posição: a que saiu (Subs.) e a que entrou no dia seguinte, mesmo de outra marca no mesmo kit", () => {
  const p = posicoesDoBoletim(lido().itens);
  e(p.length, 5);
  const bomba = p.find((x) => x.itens[0].patrimonio === "25025-268")!;
  deepStrictEqual(bomba.itens.map((i) => i.patrimonio), ["25025-268", "25025-832"]);
  e(bomba.dias, 31);
  e(bomba.valor_total, 100);
  const cortadora = p.find((x) => x.itens[0].patrimonio === "25012-169")!;
  deepStrictEqual(cortadora.itens.map((i) => i.patrimonio), ["25012-169", "22042-063"]);
  e(cortadora.dias, 31);
});

test("a que saiu sem substituta no boletim fica marcada", () => {
  const sem = lido().itens.filter((i) => i.patrimonio !== "25025-832");
  const p = posicoesDoBoletim(sem).find((x) => x.itens[0].patrimonio === "25025-268")!;
  e(p.itens.length, 1);
  e(p.semSubstituta, true);
});

test("o que não é boletim do Sisloc não passa", () => {
  const r = lerBoletimDeLocacao(["qualquer coisa", "outra"]);
  e(r.ok, false);
});

test("o nome da base é o Entrega até o endereço", () => {
  e(nomeDaBase("VCG RIO BONITO LAGOS BLOCO 1 - RUA CAMILO MARTINS GOMES, 33 - MANGUEIRINHA"), "VCG RIO BONITO LAGOS BLOCO 1");
  e(nomeDaBase("SETORIZADA LESTE - AV. PRESIDENTE KENNEDY, 10 - SÃO GONÇALO"), "SETORIZADA LESTE");
});

test("o nome com traços já diz projeto, município, superintendência e bloco", () => {
  deepStrictEqual(sugestaoDaBase("VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4"), {
    projeto: "VCG",
    municipio: "RIO DE JANEIRO",
    superintendencia: "COMUNIDADES",
    bloco: "BLOCO 4",
  });
  deepStrictEqual(sugestaoDaBase("VCG RIO BONITO LAGOS BLOCO 1"), {
    projeto: "VCG",
    municipio: null,
    superintendencia: null,
    bloco: "BLOCO 1",
  });
});

test("patrimônio: entre parênteses no fim, e só se tiver número", () => {
  deepStrictEqual(separarPatrimonio("MARTELO ROMPEDOR 30KG (251214-929)"), {
    equipamento: "MARTELO ROMPEDOR 30KG",
    patrimonio: "251214-929",
  });
  e(separarPatrimonio("ÓLEO 2T (PRO)").patrimonio, null);
});

test("patrimônio em duas bases no mesmo período é repetido; em meses que não se cruzam, não", () => {
  const r = patrimoniosRepetidos([
    { patrimonio: "250114-745", base: "NORTE", inicio: "2026-09-01", fim: "2026-09-30" },
    { patrimonio: "250114-745", base: "BELFORD ROXO", inicio: "2026-09-01", fim: "2026-09-30" },
    { patrimonio: "24095-066", base: "SUL", inicio: "2026-09-01", fim: "2026-09-15" },
    { patrimonio: "24095-066", base: "LESTE", inicio: "2026-09-16", fim: "2026-09-30" },
  ]);
  deepStrictEqual(r, [{ patrimonio: "250114-745", bases: ["NORTE", "BELFORD ROXO"] }]);
});

test("a data de execução no formato da planilha", () => {
  e(periodoDaPlanilha("2026-09-01", "2026-09-30"), "01/09/2026 a 30/09/2026");
});

/* ── A planilha ───────────────────────────────────────────── */

const BASE = {
  nome: "VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4",
  projeto: "VCG",
  municipio: "RIO DE JANEIRO",
  superintendencia: "COMUNIDADES",
  bloco: "BLOCO 4",
  coordenador: "Fulano",
};

test("a planilha: uma linha por equipamento cobrado, a troca numerada dentro da posição", () => {
  const linhas = linhasDaLocacao(BASE, lido().itens);
  e(linhas.length, 7);
  const bombas = linhas.filter((l) => l.patrimonio === "25025-268" || l.patrimonio === "25025-832");
  e(bombas[0].posicao.endsWith(".1"), true);
  e(bombas[1].posicao.endsWith(".2"), true);
  e(bombas[0].troca, "trocado por 25025-832 em 08/08");
  e(bombas[1].troca, "substituiu 25025-268 em 08/08");
  e(bombas[0].execucao, "01/08/2026 a 07/08/2026");
  e(bombas[0].cidade, "RIO DE JANEIRO");
  e(bombas[0].coordenador, "Fulano");
  e(linhas.find((l) => l.patrimonio === "250114-684")!.posicao.includes("."), false);
});

test("a manutenção soma por projeto, município, superintendência e bloco", () => {
  const outra = { ...BASE, nome: "OUTRA", coordenador: null };
  const m = linhasDaManutencao(
    [
      { valor: 1000, base: BASE },
      { valor: 500, base: outra },
      { valor: 200, base: { ...BASE, bloco: "BLOCO 1" } },
      { valor: 0, base: BASE },
    ],
    "2026-09-01",
    "2026-09-30",
  );
  e(m.length, 2);
  e(m.find((l) => l.bloco === "BLOCO 4")!.valor_total, 1500);
  e(m[0].tempo, 30);
  e(m[0].servico, "MANUTENÇÃO");
});

test("o que falta na base para a planilha sair completa", () => {
  deepStrictEqual(faltaNaBase({ ...BASE, municipio: null, coordenador: null }), ["município", "coordenador"]);
  deepStrictEqual(faltaNaBase(null), ["cadastro"]);
});

/* ── Os BMs de manutenção ─────────────────────────────────── */

test("as OMs no texto do PDF: os números soltos, sem data, valor, CEP com traço nem comprovante", () => {
  const achadas = omsNoTexto([
    "BM-0003 - SETEMBRO/2026\tBASE NORTE",
    "034292\t24068-186\tCORTADORA\t12/09/2026\tR$ 1.250,00",
    "1170-01\t034301\t034302",
    "21240-002",
  ]);
  deepStrictEqual(achadas.sort(), ["034292", "034301", "034302"]);
});

test("o PDF é dos boletins com a maior parte das OMs nele; o de todos traz vários", () => {
  const oms = [
    { boletim_id: 1, om: "034292" },
    { boletim_id: 1, om: "034301" },
    { boletim_id: 2, om: "034302" },
    { boletim_id: 2, om: "034303" },
    { boletim_id: 3, om: "034400" },
    { boletim_id: 3, om: "034401" },
    { boletim_id: 3, om: "034402" },
  ];
  deepStrictEqual(
    boletinsDoPdf(["034292", "034301", "034302", "034303", "034400"], oms).map((b) => b.boletim_id),
    [1, 2],
  );
});

test("uma linha de MANUTENÇÃO por BM, com o total dele, a base do BM e o documento na coluna da remessa", () => {
  const base = { nome: "BASE NORTE - ILHA", projeto: "SETORIZADA", municipio: "RIO DE JANEIRO", superintendencia: "NORTE", bloco: "BLOCO 4", coordenador: "Fulano" };
  const l = linhasDosBms(
    [
      {
        documento: "BM-0003 - SETEMBRO/2026",
        base_nome: "BASE NORTE - ILHA",
        base,
        oms: [
          { om: "034292", patrimonio: "24068-186", equipamento: "CORTADORA", data: "2026-09-12T10:00:00Z", valor: 1250 },
          { om: "034301", patrimonio: "251214-929", equipamento: "MARTELO", data: "2026-09-15T10:00:00Z", valor: 980.5 },
        ],
      },
      { documento: "BM-0007 - SETEMBRO/2026", base_nome: "OUTRA", base: null, oms: [{ om: "034400", patrimonio: null, equipamento: null, data: null, valor: 300 }] },
    ],
    "2026-09-01",
    "2026-09-30",
  );
  e(l.length, 2);
  e(l[0].servico, "MANUTENÇÃO");
  e(l[0].valor_total, 2230.5);
  e(l[0].execucao, "01/09/2026 a 30/09/2026");
  e(l[0].tempo, 30);
  e(l[0].superintendencia, "NORTE");
  e(l[0].remessa, "BM-0003 - SETEMBRO/2026");
  e(l[1].projeto, "");
});

test("o número que é a OM de entrada de uma OM impressa não traz o BM antigo de uma OM só", () => {
  // A bomba entrou na 031733 (BM 01, de julho) e foi cobrada na 033091 (BM 12):
  // o papel do BM 12 imprime as duas.
  const oms = [
    { boletim_id: 12, om: "033091", om_retirada: "031733", recibo_entrega: null },
    { boletim_id: 1, om: "031733", om_retirada: null, recibo_entrega: null },
  ];
  deepStrictEqual(
    boletinsDoPdf(["033091", "031733"], oms).map((b) => b.boletim_id),
    [12],
  );
  // Sem a 033091 no texto, a 031733 é a do BM 01 mesmo.
  deepStrictEqual(
    boletinsDoPdf(["031733"], oms).map((b) => b.boletim_id),
    [1],
  );
});

test("o patrimônio que quebra de linha com o resto do nome se separa, e a linha com valor sempre se cobra", () => {
  const r = lerBoletimDeLocacao([
    L("Período Faturamento :", "Medição Mensal : 01/10/2026 - 31/10/2026"),
    L("Entrega :GRANDE DIÂMETRO - CENTRO SUL - RUA X, 1"),
    L("Remessa:", "001300-01", "Data:", "01/07/2025", "NF Remessa:", "004607"),
    item("1", "GRUPO GERADOR 9KVA MONOF. PARTIDA", "01/10", "31/10", "31 D", "Não", "350,00", "350,00"),
    L("ELÉTRICA (24093-207)"),
    item("1", "MARTELO ROMPEDOR 30KG (240914-609)", "01/10", "31/10", "31 D", "Não", "450,00", "450,00"),
    item("1", "TAXA DE MOBILIZAÇÃO", "01/10", "31/10", "31 D", "Não", "175,00", "175,00"),
    L("TOTAL GERAL :", "975,00"),
  ]);
  if (!r.ok) throw new Error(r.erro);
  const [gerador, martelo, taxa] = r.boletim.itens;
  e(gerador.patrimonio, "24093-207");
  e(gerador.equipamento, "GRUPO GERADOR 9KVA MONOF. PARTIDA ELÉTRICA");
  e(martelo.grupo, null);
  e(taxa.patrimonio, null);
  e(r.boletim.itens.filter(cobravel).length, 3);
  e(posicoesDoBoletim(r.boletim.itens).reduce((t, p) => t + p.valor_total, 0), 975);
});

test("o patrimônio que quebra no meio, num nome que já tem parênteses, volta inteiro", () => {
  const r = lerBoletimDeLocacao([
    L("Período Faturamento :", "Medição Mensal : 01/10/2026 - 31/10/2026"),
    L("Entrega :GRANDE DIÂMETRO - CENTRO SUL - AVENIDA REPORTER NESTOR MOREIRA, 40"),
    L("Remessa:", "002354-10", "Data:", "23/09/2025 16:05", "NF Remessa:"),
    item("1", "BOMBA SUBMERSÍVEL SPV 4\" (ÁGUA SUJA) (16016-", "01/10", "31/10", "31 D", "Não", "455,00", "455,00"),
    L("151)"),
    L("Total Remessa [002354-10] :", "455,00"),
    L("Remessa:", "002354-11", "Data:", "04/02/2026 15:57", "NF Remessa:"),
    item("1", "BOMBA SUBMERSÍVEL HIDROSUL 4\" (ÁGUA SUJA)", "01/10", "31/10", "31 D", "Não", "520,00", "520,00"),
    L("(26016-192)"),
    L("TOTAL GERAL :", "975,00"),
  ]);
  if (!r.ok) throw new Error(r.erro);
  const [spv, hidrosul] = r.boletim.itens;
  e(spv.patrimonio, "16016-151");
  e(spv.equipamento, "BOMBA SUBMERSÍVEL SPV 4\" (ÁGUA SUJA)");
  e(hidrosul.patrimonio, "26016-192");
  e(hidrosul.equipamento, "BOMBA SUBMERSÍVEL HIDROSUL 4\" (ÁGUA SUJA)");
  e(posicoesDoBoletim(r.boletim.itens).length, 2);
  // o que já foi gravado com o nome inteiro se lê de novo do nome
  deepStrictEqual(separarPatrimonio("BOMBA SUBMERSÍVEL SPV 4\" (ÁGUA SUJA) (16016- 151)"), {
    equipamento: "BOMBA SUBMERSÍVEL SPV 4\" (ÁGUA SUJA)",
    patrimonio: "16016-151",
  });
});
