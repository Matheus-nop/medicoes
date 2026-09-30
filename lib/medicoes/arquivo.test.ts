// Prova do arquivo por cliente.

import { strictEqual as e, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  boletinsPorBase,
  fichasDosClientes,
  mesesDeReferencia,
  ordemDaReferencia,
  posicaoPorCliente,
} from "./arquivo.ts";
import type { BoletimAtual } from "./medicoes.ts";

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

test("a posição do cliente é a foto mais recente com valor, sem somar", () => {
  const p = posicaoPorCliente([
    { cliente: "A", periodo_id: 1, rotulo: "Agosto 2026", mes: "2026-08-01", medido: "100", faturado: "40", saldo: "60" },
    { cliente: "A", periodo_id: 2, rotulo: "Setembro 2026", mes: "2026-09-01", medido: "150", faturado: "50", saldo: "100" },
    { cliente: "A", periodo_id: 3, rotulo: "Outubro 2026", mes: "2026-10-01", medido: "0", faturado: "0", saldo: "0" },
  ]);
  e(p.length, 1);
  e(p[0].rotulo, "Setembro 2026");
  e(p[0].saldo, 100);
});

test("a ficha junta boletim e controle pelo nome, e conta as bases", () => {
  const [f, g] = fichasDosClientes(
    [
      boletim({ id: 1, cliente: "RIO + SANEAMENTO BL3 S.A", base: "PIRAI", situacao: "enviado", valor: 1000, faturado: 400, criado_em: "2026-09-01" }),
      boletim({ id: 2, cliente: "RIO + SANEAMENTO BL3 S.A.", base: "VASSOURAS", situacao: "aberto", valor: 300, criado_em: "2026-09-10" }),
      boletim({ id: 3, cliente: "RIO + SANEAMENTO BL3 S.A", base: "pirai", situacao: "faturado", valor: 200, criado_em: "2026-08-01" }),
    ],
    [{ cliente: "ÁGUAS DO RIO / AEGEA", periodo_id: 9, rotulo: "Setembro 2026", mes: "2026-09-01", medido: 10, faturado: 0, saldo: 10 }],
  );
  e(f.nome, "RIO + SANEAMENTO BL3 S.A.");
  e(f.manutencao.boletins, 3);
  e(f.manutencao.bases, 2);
  e(f.manutencao.emMedicao, 300);
  e(f.manutencao.medido, 1200);
  e(f.manutencao.faturado, 600);
  e(f.manutencao.saldo, 600);
  e(f.faturamento, null);
  e(g.nome, "ÁGUAS DO RIO / AEGEA");
  e(g.faturamento?.saldo, 10);
  e(g.manutencao.boletins, 0);
});

test("boletins por base: sem base também aparece", () => {
  const g = boletinsPorBase([
    boletim({ id: 1, base: "PIRAI" }),
    boletim({ id: 2, base: null }),
    boletim({ id: 3, base: "PIRAI" }),
  ]);
  deepStrictEqual(g.map((x) => x.base), ["PIRAI", "Sem base"]);
  deepStrictEqual(g[0].boletins.map((b) => b.id), [3, 1]);
});

test("o mês de referência em ordem, do mais recente", () => {
  e(ordemDaReferencia("AGOSTO/2026"), 202608);
  e(ordemDaReferencia("Março / 2026"), 202603);
  e(ordemDaReferencia("sem mês"), 0);
  deepStrictEqual(
    mesesDeReferencia([
      { referencia: "JULHO/2026" },
      { referencia: "SETEMBRO/2026" },
      { referencia: null },
      { referencia: "AGOSTO/2026" },
      { referencia: "SETEMBRO/2026" },
    ]),
    ["SETEMBRO/2026", "AGOSTO/2026", "JULHO/2026"],
  );
});
