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
  emailDaRegiao,
  faixaDoFaturado,
  historicoDaRegiao,
  lerColagemDoMes,
  lerNumero,
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
