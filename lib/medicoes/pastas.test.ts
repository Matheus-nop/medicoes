// Prova das pastas por base.

import { strictEqual as e, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import { chaveDaPasta, pastasPorBase } from "./pastas.ts";
import type { BoletimAtual } from "./medicoes.ts";

const CLI = "AEGEA SANEAMENTO E PARTICIPAÇÕES S.A";
const BASES = [{ cliente: CLI, nome: "LESTE - MARICÁ", regional: "LESTE", apelidos: ["BASE LESTE- MARICÁ"] }];

const bm = (o: Partial<BoletimAtual> & { id: number }): BoletimAtual =>
  ({
    numero: `BM-${o.id}`,
    cliente: CLI,
    base: "LESTE - MARICÁ",
    referencia: "SETEMBRO/2026",
    documento: null,
    situacao: "fechado",
    oms: 2,
    valor: 100,
    faturado: 0,
    ...o,
  }) as BoletimAtual;

test("o outro nome da base cai na mesma pasta", () => {
  e(chaveDaPasta(bm({ id: 1, base: "BASE LESTE- MARICÁ" }), BASES), chaveDaPasta(bm({ id: 2 }), BASES));
  e(chaveDaPasta(bm({ id: 1, base: "Norte - Méier" }), BASES) === chaveDaPasta(bm({ id: 2 }), BASES), false);
});

test("a pasta soma a base e põe o aberto primeiro, depois o mês mais novo", () => {
  const [leste, norte] = pastasPorBase(
    [
      bm({ id: 1, referencia: "JULHO/2026", documento: "08", situacao: "faturado", valor: 300 }),
      bm({ id: 2, referencia: "AGOSTO/2026", documento: "09", valor: 200, faturado: 50 }),
      bm({ id: 3, base: "BASE LESTE- MARICÁ", referencia: "SETEMBRO/2026", documento: "10", situacao: "aberto", valor: 80 }),
      bm({ id: 4, base: "NORTE - MÉIER", oms: 1 }),
    ],
    BASES,
  );
  e(leste.nome, "LESTE - MARICÁ");
  e(leste.regional, "LESTE");
  deepStrictEqual(leste.boletins.map((b) => b.id), [3, 2, 1]);
  deepStrictEqual(
    { abertos: leste.abertos, emMedicao: leste.emMedicao, medido: leste.medido, faturado: leste.faturado, saldo: leste.saldo, oms: leste.oms },
    { abertos: 1, emMedicao: 80, medido: 500, faturado: 350, saldo: 150, oms: 6 },
  );
  e(norte.nome, "NORTE - MÉIER");
  e(norte.regional, "");
});
