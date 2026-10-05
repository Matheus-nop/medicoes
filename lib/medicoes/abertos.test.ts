// Prova da conta dos boletins em aberto.

import { strictEqual as e, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  diasDesde,
  haQuanto,
  mesEmLancamento,
  ordenarAbertos,
  pendenciasDoAberto,
  resumirOms,
  type BoletimAberto,
} from "./abertos.ts";

const CLI = "AEGEA SANEAMENTO E PARTICIPAÇÕES S.A";
const HOJE = new Date("2026-10-05T15:00:00-03:00");

const bm = (o: Partial<BoletimAberto> & { id: number }): BoletimAberto => ({
  numero: `BM-${String(o.id).padStart(4, "0")}`,
  cliente: CLI,
  base: "LESTE - MARICÁ",
  referencia: "SETEMBRO/2026",
  documento: null,
  contato: null,
  oms: 3,
  valor: 1000,
  primeira_om: null,
  ultima_om: null,
  criado_em: "2026-10-01T10:00:00-03:00",
  ...o,
});

const BASES = [
  { cliente: CLI, nome: "LESTE - MARICÁ", regional: "LESTE", apelidos: ["BASE LESTE- MARICÁ"] },
  { cliente: CLI, nome: "NORTE - MÉIER", regional: null, apelidos: [] },
];

test("resume as OMs: a última inclusão e as que estão sem valor", () => {
  const r = resumirOms([
    { boletim_id: 1, incluido_em: "2026-10-01T10:00:00Z", valor: "120.00" },
    { boletim_id: 1, incluido_em: "2026-10-03T10:00:00Z", valor: 0 },
    { boletim_id: 1, incluido_em: "2026-10-02T10:00:00Z", valor: null },
    { boletim_id: 2, incluido_em: "2026-09-20T10:00:00Z", valor: 50 },
  ]);
  deepStrictEqual(r.get(1), { ultimaInclusao: "2026-10-03T10:00:00Z", semValor: 2 });
  deepStrictEqual(r.get(2), { ultimaInclusao: "2026-09-20T10:00:00Z", semValor: 0 });
});

test("os dias contam no calendário da casa", () => {
  // 23h em São Paulo do dia 4 já é dia 5 em UTC: continua sendo ontem.
  e(diasDesde("2026-10-05T01:30:00Z", HOJE), 1);
  e(diasDesde("2026-10-05T12:00:00Z", HOJE), 0);
  e(diasDesde(null, HOJE), null);
  e(haQuanto(0), "hoje");
  e(haQuanto(1), "ontem");
  e(haQuanto(9), "há 9 dias");
});

test("o mês em lançamento é o mais recente entre os abertos", () => {
  e(mesEmLancamento([bm({ id: 1, referencia: "AGOSTO/2026" }), bm({ id: 2 })]), 202609);
  e(mesEmLancamento([]), 0);
});

test("o aberto em dia não pede nada", () => {
  const b = bm({ id: 1 });
  deepStrictEqual(
    pendenciasDoAberto(b, {
      abertos: [b],
      bases: BASES,
      mesCorrente: 202609,
      oms: { ultimaInclusao: "2026-10-04T10:00:00Z", semValor: 0 },
      hoje: HOJE,
    }),
    [],
  );
});

test("o apelido da base conta como cadastro", () => {
  const b = bm({ id: 1, base: "BASE LESTE- MARICÁ" });
  e(
    pendenciasDoAberto(b, { abertos: [b], bases: BASES, mesCorrente: 202609, hoje: HOJE }).some(
      (p) => p.tipo === "sem_cadastro",
    ),
    false,
  );
});

test("cada pendência do aberto, na ordem de quem resolve", () => {
  const velho = bm({ id: 1, base: "NORTE - MÉIER", referencia: "AGOSTO/2026", criado_em: "2026-09-10T10:00:00Z" });
  const outro = bm({ id: 2, base: "Norte - Meier", documento: "15" });
  const tipos = pendenciasDoAberto(velho, {
    abertos: [velho, outro],
    bases: BASES,
    mesCorrente: 202609,
    oms: { ultimaInclusao: "2026-09-20T10:00:00Z", semValor: 2 },
    hoje: HOJE,
  });
  deepStrictEqual(
    tipos.map((p) => p.tipo),
    ["mes_anterior", "dois_abertos", "sem_regional", "sem_valor", "parado"],
  );
  e(tipos[1].texto.includes("15"), true);
  e(tipos[4].texto, "Nenhuma OM nova há 15 dias.");

  const vazio = bm({ id: 3, base: "BASE QUE NAO EXISTE", oms: 0, valor: 0 });
  deepStrictEqual(
    pendenciasDoAberto(vazio, { abertos: [vazio], bases: BASES, mesCorrente: 202609, hoje: HOJE }).map((p) => p.tipo),
    ["sem_cadastro", "sem_om"],
  );
  // Vazio há muito tempo é uma linha só, não "sem OM" e "parado".
  const esquecido = bm({ id: 4, oms: 0, valor: 0, criado_em: "2026-09-20T10:00:00Z" });
  deepStrictEqual(
    pendenciasDoAberto(esquecido, { abertos: [esquecido], bases: BASES, mesCorrente: 202609, hoje: HOJE }),
    [{ tipo: "sem_om", texto: "Nenhuma OM ainda (aberto há 15 dias)." }],
  );
});

test("ordena por base, por valor ou pelo mais parado", () => {
  const lista = [
    bm({ id: 1, base: "SUL", valor: 10, criado_em: "2026-10-03T00:00:00Z" }),
    bm({ id: 2, base: "LESTE", valor: 30, criado_em: "2026-10-04T00:00:00Z" }),
    bm({ id: 3, base: "NORTE", valor: 20, criado_em: "2026-10-01T00:00:00Z" }),
  ];
  const oms = resumirOms([{ boletim_id: 3, incluido_em: "2026-10-05T00:00:00Z", valor: 1 }]);
  deepStrictEqual(ordenarAbertos(lista, "base", oms).map((b) => b.id), [2, 3, 1]);
  deepStrictEqual(ordenarAbertos(lista, "valor", oms).map((b) => b.id), [2, 3, 1]);
  deepStrictEqual(ordenarAbertos(lista, "parado", oms).map((b) => b.id), [1, 2, 3]);
});
