// Prova do arquivo por cliente.

import { strictEqual as e, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  basesDosBoletins,
  boletinsPorBase,
  chaveDaFicha,
  daBase,
  doMes,
  mesesDosBoletins,
  rotuloDaReferencia,
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

test("a posição do cliente é o mês mais recente com número", () => {
  const p = posicaoPorCliente([
    { cliente: "A", periodo_id: 1, rotulo: "Agosto 2026", mes: "2026-08-01", saldo_anterior: "0", medido: "100", faturado: "40", saldo: "60" },
    { cliente: "A", periodo_id: 2, rotulo: "Setembro 2026", mes: "2026-09-01", saldo_anterior: "60", medido: "90", faturado: "50", saldo: "100" },
    { cliente: "A", periodo_id: 3, rotulo: "Outubro 2026", mes: "2026-10-01", saldo_anterior: "0", medido: "0", faturado: "0", saldo: "0" },
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
    [{ cliente: "ÁGUAS DO RIO / AEGEA", periodo_id: 9, rotulo: "Setembro 2026", mes: "2026-09-01", anterior: 0, medido: 10, faturado: 0, saldo: 10, aReceber: null }],
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

test("o vínculo junta o nome do Sisloc à ficha do controle", () => {
  const vinculos = [
    { nome: "AGUAS DO RIO 4 SPE S.A", cliente: "ÁGUAS DO RIO / AEGEA" },
    { nome: "AEGEA SANEAMENTO E PARTICIPAÇÕES S.A", cliente: "Águas do Rio / Aegea" },
  ];
  e(chaveDaFicha("AGUAS DO RIO 4 SPE S.A.", vinculos), chaveDaFicha("ÁGUAS DO RIO / AEGEA"));
  e(chaveDaFicha("RIO + SANEAMENTO BL3 S.A", vinculos), chaveDaFicha("RIO + SANEAMENTO BL3 S.A"));
  const fichas = fichasDosClientes(
    [
      boletim({ id: 1, cliente: "AGUAS DO RIO 4 SPE S.A", situacao: "enviado", valor: 1000, criado_em: "2026-09-01" }),
      boletim({ id: 2, cliente: "AEGEA SANEAMENTO E PARTICIPAÇÕES S.A", situacao: "enviado", valor: 500, criado_em: "2026-09-02" }),
      boletim({ id: 3, cliente: "RIO + SANEAMENTO BL3 S.A", situacao: "enviado", valor: 50, criado_em: "2026-09-03" }),
    ],
    [{ cliente: "ÁGUAS DO RIO / AEGEA", periodo_id: 9, rotulo: "Setembro 2026", mes: "2026-09-01", anterior: 0, medido: 10, faturado: 0, saldo: 10, aReceber: null }],
    vinculos,
  );
  e(fichas.length, 2);
  const f = fichas.find((x) => x.faturamento)!;
  e(f.nome, "ÁGUAS DO RIO / AEGEA");
  e(f.manutencao.boletins, 2);
  e(f.manutencao.medido, 1500);
  deepStrictEqual(f.nomes.sort(), ["AEGEA SANEAMENTO E PARTICIPAÇÕES S.A", "AGUAS DO RIO 4 SPE S.A", "ÁGUAS DO RIO / AEGEA"]);
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

test("o filtro por base: sem acento, sem caixa, palavras em qualquer ordem", () => {
  const base = "VCG - BAIXADA I - BELFORD ROXO - BLOCO 4";
  e(daBase(base, ""), true);
  e(daBase(base, "belford 4"), true);
  e(daBase(base, "bloco belford"), true);
  e(daBase(base, "baixada ii"), false);
  e(daBase("CAMPO GRANDE — GSO", "campo grande"), true);
  e(daBase("SÃO GONÇALO", "sao goncalo"), true);
  e(daBase(null, "vcg"), false);
});

test("as bases da lista, sem repetir", () => {
  deepStrictEqual(
    basesDosBoletins([{ base: "SUL - GÁVEA" }, { base: "sul - gávea " }, { base: null }, { base: "NORTE - MÉIER" }]),
    ["NORTE - MÉIER", "SUL - GÁVEA"],
  );
});

test("o filtro por mês junta as grafias do mesmo mês", () => {
  const bs = [
    { referencia: "AGOSTO/2026" },
    { referencia: "Agosto 2026" },
    { referencia: "SETEMBRO/2026" },
    { referencia: null },
    { referencia: "MARÇO/2026" },
  ];
  deepStrictEqual(mesesDosBoletins(bs), [
    { chave: 202609, rotulo: "Setembro/2026", boletins: 1 },
    { chave: 202608, rotulo: "Agosto/2026", boletins: 2 },
    { chave: 202603, rotulo: "Março/2026", boletins: 1 },
    { chave: 0, rotulo: "Sem mês de referência", boletins: 1 },
  ]);
  e(doMes("agosto / 2026", 202608), true);
  e(doMes("SETEMBRO/2026", 202608), false);
  e(doMes(null, 0), true);
  e(doMes("qualquer", null), true);
  e(rotuloDaReferencia(202601), "Janeiro/2026");
});
