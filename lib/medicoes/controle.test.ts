// Prova do controle de medições.
//
// O exemplo é a aba "SET 2026" da planilha de verdade, copiada do Excel. O
// total tem de bater com a linha do RESUMO EXECUTIVO: 1.558.887,59 medido e
// 566.982,35 faturado.

import { strictEqual as e, ok, deepStrictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CATEGORIAS,
  TODAS,
  idadeDaCelula,
  idadeDoAberto,
  porFaixa,
  resumirRecebimento,
  abaComoTexto,
  abaDaMedicao,
  abaDoMes,
  daPlanilhaParaOMes,
  doEmAbertoParaOMes,
  formatoDaAba,
  lerAbaEmAberto,
  emailDaRegiao,
  faixaDoFaturado,
  historicoDaRegiao,
  lerColagemDoMes,
  lerNumero,
  mesSeguinte,
  nomeDaAbaDaMedicao,
  periodoDoMes,
  recadoDaRegiao,
  resumirPeriodo,
  saldoPorRegiao,
  type Celula,
} from "./controle.ts";

const REGIOES = [
  "NORTE",
  "VILA KOSMOS",
  "SUL",
  "LESTE",
  "BAIXADA I",
  "BAIXADA II",
  "COMUNIDADE",
  "INTERIOR",
  "GRANDE DIÂMETRO",
  "VCG",
];

const colagem = readFileSync(
  fileURLToPath(new URL("./exemplos/controle-set-2026.tsv", import.meta.url)),
  "utf8",
);

function celulasDaColagem(): Celula[] {
  const { linhas } = lerColagemDoMes(colagem, REGIOES);
  return linhas.flatMap((l) =>
    CATEGORIAS.flatMap((c) => {
      const v = l.valores[c];
      if (!v || (v.medido === null && v.faturado === null)) return [];
      return [
        {
          periodo_id: 1,
          regiao_id: REGIOES.indexOf(l.regiao) + 1,
          regiao: l.regiao,
          ordem: REGIOES.indexOf(l.regiao) + 1,
          categoria: c,
          medido: v.medido ?? 0,
          faturado: v.faturado ?? 0,
        },
      ];
    }),
  );
}

test("número como o Excel copia", () => {
  e(lerNumero("78.537,00"), 78537);
  e(lerNumero("R$ 1.134,50"), 1134.5);
  e(lerNumero("-78.597,68"), -78597.68);
  e(lerNumero("78537.5"), 78537.5);
  e(lerNumero("1.134.750"), 1134750);
  e(lerNumero("-"), null);
  e(lerNumero(""), null);
  e(lerNumero("NORTE"), null);
});

test("a aba do mês colada: dez regiões, sem título nem total", () => {
  const { linhas, desconhecidas } = lerColagemDoMes(colagem, REGIOES);
  e(linhas.length, 10);
  e(desconhecidas.length, 0);
  const norte = linhas[0];
  e(norte.regiao, "NORTE");
  deepStrictEqual(norte.valores.manutencao, { medido: 24338, faturado: 7732 });
  deepStrictEqual(norte.valores.indenizacao, { medido: 13260, faturado: 13260 });
  // O saldo que veio junto não entra: é conta.
  const vk = linhas[1];
  deepStrictEqual(vk.valores.manutencao, { medido: 2218, faturado: null });
});

test("região que não está cadastrada volta para quem colou ver", () => {
  const { desconhecidas } = lerColagemDoMes("GRANDE RIO\t10,00\t5,00", REGIOES);
  deepStrictEqual(desconhecidas, ["GRANDE RIO"]);
});

test("acento e caixa não separam a região", () => {
  const { linhas } = lerColagemDoMes("Grande Diametro\t10,00\t5,00", REGIOES);
  e(linhas[0].regiao, "GRANDE DIÂMETRO");
});

test("o total do período bate com o RESUMO EXECUTIVO", () => {
  const r = resumirPeriodo(celulasDaColagem());
  e(r.medido, 1558887.59);
  e(r.faturado, 566982.35);
  e(r.saldo, 991905.24);
  e(r.categorias.manutencao.medido, 439433);
  e(r.categorias.locacao.saldo, 650632.24);
  e(r.categorias.indenizacao.saldo, 0);
  e(Math.round((r.fracao ?? 0) * 100), 36);
});

test("região cadastrada sem valor aparece zerada, na ordem", () => {
  const r = resumirPeriodo([], REGIOES.map((nome, i) => ({ id: i + 1, nome, ordem: i + 1 })));
  e(r.regioes.length, 10);
  e(r.regioes[0].regiao, "NORTE");
  e(r.regioes[0].fracao, null);
  e(r.medido, 0);
});

test("saldo por região: maior para menor, sem quem está zerado", () => {
  const barras = saldoPorRegiao(resumirPeriodo(celulasDaColagem()));
  e(barras[0].regiao, "VCG");
  ok(barras.every((b) => b.saldo > 0));
  ok(barras.every((b, i) => i === 0 || barras[i - 1].saldo >= b.saldo));
});

test("a faixa do faturado", () => {
  e(faixaDoFaturado(null), "vazio");
  e(faixaDoFaturado(0.96), "ok");
  e(faixaDoFaturado(0.5), "parcial");
  e(faixaDoFaturado(0.36), "pendente");
});

test("o período do mês", () => {
  deepStrictEqual(periodoDoMes("2026-10"), { mes: "2026-10-01", rotulo: "Outubro 2026" });
  e(periodoDoMes("2026-13"), null);
  e(periodoDoMes("outubro"), null);
});

test("o recado da região para o WhatsApp", () => {
  const r = resumirPeriodo(celulasDaColagem());
  const vcg = r.regioes.find((x) => x.regiao === "VCG")!;
  const t = recadoDaRegiao("ÁGUAS DO RIO / AEGEA", "Setembro 2026", vcg, "30/09/2026");
  ok(t.startsWith("*ÁGUAS DO RIO / AEGEA — Base VCG*"));
  ok(t.includes("Posição: Setembro 2026"));
  ok(t.includes("Saldo a faturar"));
  ok(t.includes("• Manutenção"));
});

test("a história da região: uma foto por período, sem somar", () => {
  const set = celulasDaColagem();
  const ago = set.map((c) => ({ ...c, periodo_id: 2, medido: c.medido / 2, faturado: 0 }));
  const periodos = [
    { id: 1, cliente: "X", mes: "2026-09-01", rotulo: "Setembro 2026" },
    { id: 2, cliente: "X", mes: "2026-08-01", rotulo: "Agosto 2026" },
    { id: 3, cliente: "X", mes: "2026-10-01", rotulo: "Outubro 2026" },
  ];
  const h = historicoDaRegiao([...set, ...ago], periodos, "VCG");
  // Outubro não tem valor: fica de fora. A ordem é a do mês.
  deepStrictEqual(h.map((f) => f.rotulo), ["Agosto 2026", "Setembro 2026"]);
  e(h[1].saldo, 513738);
  e(h[0].faturado, 0);
  const todas = historicoDaRegiao(set, periodos);
  e(todas[0].medido, 1558887.59);
});

test("o e-mail da base não leva o negrito do WhatsApp", () => {
  const r = resumirPeriodo(celulasDaColagem());
  const { assunto, corpo } = emailDaRegiao(
    "ÁGUAS DO RIO / AEGEA",
    "Setembro 2026",
    { ...r, regiao: TODAS, ordem: 0 },
    "30/09/2026",
  );
  e(assunto, "Medições ÁGUAS DO RIO / AEGEA — todas as bases — Setembro 2026");
  ok(!corpo.includes("*"));
  ok(corpo.startsWith("ÁGUAS DO RIO / AEGEA — Todas as bases"));
});

test("agosto 100 medido e 30 faturado: setembro começa com 70", () => {
  const base = { regiao_id: 1, regiao: "VCG", ordem: 1, categoria: "locacao" as const };
  const agosto = resumirPeriodo([{ ...base, periodo_id: 1, medido: 100, faturado: 30 }]);
  e(agosto.saldo, 70);
  const setembro = resumirPeriodo([{ ...base, periodo_id: 2, saldo_anterior: 70, medido: 50, faturado: 20 }]);
  e(setembro.anterior, 70);
  e(setembro.aFaturar, 120);
  e(setembro.saldo, 100);
  e(setembro.fracao, 20 / 120);
  // Base que só trouxe saldo, sem lançamento no mês, continua no total.
  const outubro = resumirPeriodo([{ ...base, periodo_id: 3, saldo_anterior: 100, medido: 0, faturado: 0 }]);
  e(outubro.saldo, 100);
  e(outubro.regioes[0].saldo, 100);
});

test("a aba do mês na planilha", () => {
  const abas = ["📊 RESUMO EXECUTIVO", "JUN-JUL 2025", "AGO 2026", "SET 2026"];
  e(abaDoMes(abas, "2026-09-01"), "SET 2026");
  e(abaDoMes(abas, "2025-07-01"), "JUN-JUL 2025");
  e(abaDoMes(abas, "2026-10-01"), null);
});

test("a medição de um mês está na aba do mês seguinte (0016)", () => {
  const abas = ["📊 RESUMO EXECUTIVO", "JUN-JUL 2025", "AGO 2026", "SET 2026", "JAN 2026"];
  e(abaDaMedicao(abas, "2026-08-01"), "SET 2026");
  e(abaDaMedicao(abas, "2026-07-01"), "AGO 2026");
  // O período de dois meses (Mai/Jun) está na aba JUN-JUL.
  e(abaDaMedicao(abas, "2025-06-01"), "JUN-JUL 2025");
  e(abaDaMedicao(abas, "2025-12-01"), "JAN 2026");
  e(abaDaMedicao(abas, "2026-09-01"), null);
  e(mesSeguinte("2025-12-01"), "2026-01-01");
  e(nomeDaAbaDaMedicao("2026-08-01"), "SET 2026");
  // A planilha de medições em aberto: o mês por extenso, com ou sem o ano.
  const emAberto = ["MEDIÇÕES FATURADAS OUTUBRO 22", "ÁGUAS DO RIO - OUTUBRO 2025", "ÁGUAS DO RIO - SETEMBRO", "ÁGUAS DO RIO - OUTUBRO"];
  e(abaDaMedicao(emAberto, "2026-09-01"), "ÁGUAS DO RIO - OUTUBRO");
  e(abaDaMedicao(emAberto, "2026-08-01"), "ÁGUAS DO RIO - SETEMBRO");
  e(abaDaMedicao(emAberto, "2025-09-01"), "ÁGUAS DO RIO - OUTUBRO 2025");
});

test("a aba lida do .xlsx vira o texto da colagem, sem o float do Excel", () => {
  const t = abaComoTexto([
    [null, "REGIÃO", "Medido", "Faturado", "Saldo"],
    [null, "NORTE", 24338, 7732, 46857.11000000001, 92934.85, null, null, "-"],
  ]);
  const { linhas } = lerColagemDoMes(t, REGIOES);
  deepStrictEqual(linhas[0].valores.manutencao, { medido: 24338, faturado: 7732 });
  deepStrictEqual(linhas[0].valores.locacao, { medido: 92934.85, faturado: null });
});

test("importar setembro: o medido do mês é o da planilha menos o saldo de agosto", () => {
  const anterior: Record<string, number> = { "VCG:locacao": 282801.67, "LESTE:indenizacao": 5000 };
  const r = daPlanilhaParaOMes(
    [
      { regiao: "VCG", valores: { locacao: { medido: 580142.67, faturado: 282801.67 } } },
      // A planilha não tem mais nada da LESTE em indenização: zerou sem faturar.
      { regiao: "LESTE", valores: {} },
    ],
    (reg, c) => anterior[`${reg}:${c}`] ?? 0,
  );
  const vcg = r.find((x) => x.regiao === "VCG")!;
  e(vcg.medido, 297341);
  e(vcg.faturado, 282801.67);
  e(vcg.saldo, 297341);
  const leste = r.find((x) => x.regiao === "LESTE")!;
  e(leste.medido, -5000);
  e(leste.saldo, 0);
});

test("idade: o faturado abate primeiro o mais antigo", () => {
  const p = idadeDaCelula([
    { mes: "2026-07-01", rotulo: "Julho 2026", entra: 100, sai: 0 },
    { mes: "2026-08-01", rotulo: "Agosto 2026", entra: 50, sai: 30 },
    { mes: "2026-09-01", rotulo: "Setembro 2026", entra: 40, sai: 90 },
  ]);
  // Julho: 100 − 30 − 70 = 0. Agosto: 50 − 20 = 30. Setembro: 40.
  deepStrictEqual(
    p.map((x) => [x.rotulo, x.valor]),
    [
      ["Agosto 2026", 30],
      ["Setembro 2026", 40],
    ],
  );
});

test("idade: medido negativo (a planilha zerando) também abate o mais antigo", () => {
  const p = idadeDaCelula([
    { mes: "2026-07-01", rotulo: "Julho 2026", entra: 100, sai: 0 },
    { mes: "2026-08-01", rotulo: "Agosto 2026", entra: -100, sai: 0 },
  ]);
  e(p.length, 0);
});

test("idade do cliente: soma as células por mês de origem, e as faixas", () => {
  const periodos = [
    { id: 1, cliente: "X", mes: "2026-06-01", rotulo: "Junho 2026" },
    { id: 2, cliente: "X", mes: "2026-08-01", rotulo: "Agosto 2026" },
    { id: 3, cliente: "X", mes: "2026-09-01", rotulo: "Setembro 2026" },
  ];
  const c = (periodo_id: number, regiao: string, medido: number, faturado: number) => ({
    periodo_id,
    regiao_id: regiao === "A" ? 1 : 2,
    regiao,
    ordem: 1,
    categoria: "locacao" as const,
    medido,
    faturado,
  });
  const historia = [c(1, "A", 100, 0), c(3, "A", 50, 20), c(2, "B", 70, 0), c(3, "B", 10, 70)];
  const idade = idadeDoAberto(historia, periodos, "2026-09-01", "faturar");
  deepStrictEqual(
    idade.map((x) => [x.rotulo, x.valor]),
    [
      ["Setembro 2026", 60],
      ["Junho 2026", 80],
    ],
  );
  deepStrictEqual(porFaixa(idade, "2026-09-01"), { mes: 60, um: 0, dois: 0, velho: 80 });
});

test("recebimento: abertura + faturado − recebido, só do início em diante", () => {
  const base = { periodo_id: 3, regiao_id: 1, regiao: "VCG", ordem: 1, categoria: "locacao" as const, medido: 0 };
  const r = resumirRecebimento([
    { ...base, faturado: 282801.67, acompanha: true, abertura: 100000, recebido: 30000, a_receber_anterior: 0 },
    { ...base, regiao: "SUL", regiao_id: 2, faturado: 999, acompanha: false },
  ]);
  e(r.acompanha, true);
  e(r.anterior, 100000);
  e(r.aReceber, 352801.67);
  e(r.regioes.length, 1);
  const idade = idadeDoAberto(
    [{ ...base, faturado: 282801.67, acompanha: true, abertura: 100000, recebido: 30000 }],
    [{ id: 3, cliente: "X", mes: "2026-09-01", rotulo: "Setembro 2026" }],
    "2026-09-01",
    "receber",
  );
  // Recebeu 30.000: abate da abertura, que é a mais antiga.
  deepStrictEqual(
    idade.map((x) => [x.rotulo, x.valor]),
    [
      ["Setembro 2026", 282801.67],
      ["Antes de Setembro 2026", 70000],
    ],
  );
  deepStrictEqual(porFaixa(idade, "2026-09-01"), { mes: 282801.67, um: 0, dois: 0, velho: 70000 });
});

test("idade: faturado a mais vira crédito, abate o medido seguinte, e o total é o saldo", () => {
  const p = idadeDaCelula([
    { mes: "2025-04-01", rotulo: "Abril 2025", entra: 100, sai: 180 },
    { mes: "2025-05-01", rotulo: "Maio 2025", entra: 50, sai: 0 },
    { mes: "2025-06-01", rotulo: "Junho 2025", entra: 60, sai: 0 },
  ]);
  // Crédito de 80 come os 50 de maio e 30 de junho: sobram 30 de junho.
  deepStrictEqual(p.map((x) => [x.rotulo, x.valor]), [["Junho 2025", 30]]);
  const negativo = idadeDaCelula([{ mes: "2025-04-01", rotulo: "Abril 2025", entra: 100, sai: 178.6 }]);
  deepStrictEqual(negativo, [
    { mes: "crédito", rotulo: "Faturado a mais que o medido", valor: -78.6, credito: true },
  ]);
});

test("a aba de medições em aberto: medido do mês, saldo da aba, faturado é o que saiu", () => {
  const T = (...c: (string | number)[]) => c.join("\t");
  const texto = [
    T("AGUAS DO RIO/AEGEA - MEDIÇÕES EM ABERTO SEM FATURAMENTO 2026"),
    T("REGIÃO", "MÊS ", "VALOR ", "VALOR FATURADO", "SALDO A FATURAR", "VALOR ", "VALOR FATURADO", "SALDO A FATURAR", "VALOR ", "VALOR FATURADO", "SALDO A FATURAR", "FATURA/NFE"),
    T("", "MEDIÇÃO", "MEDIÇÃO MANUTENÇÃO", "", "", "MEDIÇÃO LOCAÇÃO"),
    T("NORTE", "Agosto", "16.606,00", "16.606,00", "0,00", "46.857,11", "46.857,11", "0,00", "0", "0", "0", "65666"),
    T("", "Setembro", "11.006,00", "0,00", "11.006,00", "47.476,96", "0,00", "47.476,96", "0", "", ""),
    T("SUL ", "Junho", "691,67", "0", "691,67", "0", "0", "0", "0", "0", "0"),
    T("", "Setembro", "16.006,00", "", "16.006,00", "63.639,00", "", "63.639,00", "0", "0", "0"),
    T("VILA KOSMOS", "Abril a Agosto", "443,60", "443,60", "0", "25.525,00", "25.525,00", "0"),
    T("", "Setembro", "2.624,00", "0", "2.624,00", "5.105,00", "0", "5.105,00"),
    T("PARQUE NOVO", "Setembro", "10", "0", "10"),
    T("TOTAL  GERAL = ", "", "1.844.629,93"),
    T("NORTE", "Setembro", "999", "0", "999"),
  ].join("\n");
  e(formatoDaAba(texto), "em_aberto");
  const leitura = lerAbaEmAberto(texto, ["NORTE", "SUL", "VILA KOSMOS"], "2026-09-01");
  deepStrictEqual(leitura.desconhecidas, ["PARQUE NOVO"]);
  const anterior: Record<string, number> = {
    "NORTE|manutencao": 16606,
    "NORTE|locacao": 46857.11,
    "SUL|manutencao": 590.34,
    "SUL|locacao": 101.33,
    "VILA KOSMOS|manutencao": 2218,
    "VILA KOSMOS|locacao": 25525,
  };
  const { celulas: cel, compensacoes } = doEmAbertoParaOMes(leitura, (r, c) => anterior[`${r}|${c}`] ?? 0);
  const de = (r: string, c: string) => cel.find((x) => x.regiao === r && x.categoria === c)!;
  // O exemplo do time: 16 mil de saldo, 16 mil faturados, 11 mil medidos.
  deepStrictEqual(
    { medido: de("NORTE", "manutencao").medido, faturado: de("NORTE", "manutencao").faturado, saldo: de("NORTE", "manutencao").saldo },
    { medido: 11006, faturado: 16606, saldo: 11006 },
  );
  e(de("VILA KOSMOS", "locacao").faturado, 25525);
  // A SUL: o crédito de uma categoria abateu a outra. É compensação do mês
  // anterior, e setembro fica igual à planilha.
  e(de("SUL", "manutencao").medido, 16006);
  e(de("SUL", "manutencao").faturado, 0);
  e(de("SUL", "manutencao").ajuste, 0);
  e(de("SUL", "locacao").medido, 63639);
  e(de("SUL", "locacao").faturado, 0);
  deepStrictEqual(compensacoes, [
    { regiao: "SUL", categoria: "manutencao", faturado: -101.33 },
    { regiao: "SUL", categoria: "locacao", faturado: 101.33 },
  ]);
  // O saldo que fica continua o da planilha.
  e(de("SUL", "manutencao").anterior + 16006 - 0, 16697.67);
  // A linha depois do TOTAL não entra.
  e(de("NORTE", "manutencao").saldo, 11006);
});

test("a aba no formato do controle continua sendo controle", () => {
  e(formatoDaAba("REGIÃO\tMedido\tFaturado\tSaldo\nNORTE\t1\t2\t3"), "controle");
});
