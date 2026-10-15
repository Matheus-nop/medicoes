// Prova dos contratos: situação, reajuste e alertas.

import { strictEqual as e, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  alertasDoContrato,
  ciclosDoContrato,
  consumoDoContrato,
  contratoNoCiclo,
  projecaoDoCiclo,
  saldoDoContrato,
  sugestaoDaRenovacao,
  type Aditivo,
  type MesDoContrato,
  contratosPedindoAtencao,
  diasEntre,
  hojeNaCasa,
  proximoReajuste,
  situacaoDoContrato,
  somarAnos,
  type ContratoAtual,
} from "./contratos.ts";

const contrato = (c: Partial<ContratoAtual> = {}): ContratoAtual => ({
  id: 1,
  numero: "CT-001/2025",
  cliente: "ÁGUAS DO RIO / AEGEA",
  objeto: null,
  vigencia_inicio: "2025-04-01",
  vigencia_fim: "2026-03-31",
  valor: 1000,
  categorias: null,
  indice: "IPCA",
  data_base: "2025-04-01",
  aviso_dias: 90,
  contato: null,
  email: null,
  observacao: null,
  criado_em: "2025-04-01T00:00:00Z",
  vigencia_atual: "2027-03-31",
  valor_atual: 1000,
  ultimo_reajuste: "2026-04-01",
  encerrado_em: null,
  aditivos: 0,
  medido: 100,
  medido_ate: null,
  ...c,
});

test("datas sem fuso", () => {
  e(diasEntre("2026-10-01", "2026-12-30"), 90);
  e(diasEntre("2026-10-01", "2026-09-30"), -1);
  e(somarAnos("2024-02-29", 1), "2025-02-28");
  e(somarAnos("2025-04-01", 2), "2027-04-01");
  e(hojeNaCasa(new Date("2026-10-01T02:00:00Z")), "2026-09-30");
});

test("a situação olha a vigência de hoje, com o aviso do contrato", () => {
  e(situacaoDoContrato(contrato(), "2026-10-01"), "vigente");
  e(situacaoDoContrato(contrato(), "2027-01-01"), "vence");
  e(situacaoDoContrato(contrato({ aviso_dias: 30 }), "2027-01-01"), "vigente");
  e(situacaoDoContrato(contrato(), "2027-04-01"), "vencido");
  e(situacaoDoContrato(contrato({ vigencia_inicio: "2026-11-01" }), "2026-10-01"), "a_iniciar");
  e(situacaoDoContrato(contrato({ encerrado_em: "2026-09-15" }), "2026-10-01"), "encerrado");
  // Encerramento marcado para depois: até lá, vale a vigência.
  e(situacaoDoContrato(contrato({ encerrado_em: "2026-12-31" }), "2026-10-01"), "vigente");
});

test("o reajuste: o aniversário que ninguém registrou fica atrasado", () => {
  // Reajustado em 2026: o próximo é abril de 2027.
  deepStrictEqual(proximoReajuste(contrato(), "2026-10-01"), { data: "2027-04-01", atrasado: false, dias: 182 });
  // Nunca reajustado: o de abril de 2026 passou.
  e(proximoReajuste(contrato({ ultimo_reajuste: null }), "2026-10-01")?.data, "2026-04-01");
  e(proximoReajuste(contrato({ ultimo_reajuste: null }), "2026-10-01")?.atrasado, true);
  // Assinado na semana antes do aniversário cobre o aniversário.
  e(proximoReajuste(contrato({ ultimo_reajuste: "2026-03-25" }), "2026-10-01")?.data, "2027-04-01");
  // Sem índice não há reajuste a esperar.
  e(proximoReajuste(contrato({ indice: null }), "2026-10-01"), null);
});

test("o consumo: o medido contra o valor de hoje", () => {
  e(consumoDoContrato(contrato({ medido: 450, valor_atual: 1000 })), 0.45);
  e(consumoDoContrato(contrato({ valor_atual: null })), null);
});

test("os alertas, e quem conta no menu", () => {
  e(alertasDoContrato(contrato(), "2026-10-01").length, 0);
  deepStrictEqual(
    alertasDoContrato(contrato({ medido: 950 }), "2027-02-15").map((a) => a.texto),
    ["Vence em 44 dia(s), em 31/03/2027", "Reajuste (IPCA) em 45 dia(s), 01/04/2027", "95% do valor já medido"],
  );
  e(alertasDoContrato(contrato(), "2027-04-02")[0].texto, "Vencido há 2 dia(s), em 31/03/2027");
  e(alertasDoContrato(contrato({ encerrado_em: "2026-09-01", medido: 5000 }), "2027-04-02").length, 0);
  // O reajuste que chega é informação; o que passou sem registro pede ação.
  e(
    contratosPedindoAtencao(
      [contrato(), contrato({ ultimo_reajuste: null }), contrato({ medido: 2000 })],
      "2026-10-01",
    ),
    2,
  );
  e(contratosPedindoAtencao([contrato()], "2027-02-15"), 1);
});

/* ── Os ciclos (0018) ─────────────────────────────────────── */

const aditivo = (a: Partial<Aditivo>): Aditivo => ({
  id: 1,
  contrato_id: 1,
  tipo: "outro",
  data: "2025-01-01",
  numero: null,
  nova_vigencia_fim: null,
  nova_vigencia_inicio: null,
  valor_ciclo: null,
  incorpora_saldo: false,
  valor_delta: null,
  percentual: null,
  descricao: null,
  quem: "x",
  em: "2025-01-01T00:00:00Z",
  ...a,
});
const mes = (m: string, medido: number, faturado = 0): MesDoContrato => ({ mes: `${m}-01`, medido, faturado });
const assinado = { vigencia_inicio: "2025-04-01", vigencia_fim: "2026-03-31", valor: 1200 };

test("sem renovação há um ciclo só, com o medido e o faturado de todos os meses", () => {
  const [k, ...resto] = ciclosDoContrato(assinado, [], [mes("2025-04", 100, 80), mes("2025-05", 200, 100)]);
  e(resto.length, 0);
  e(k.valor, 1200);
  e(k.medido, 300);
  e(k.faturado, 180);
});

test("a renovação abre um ciclo que começa do zero, com o valor dela", () => {
  const renovacao = aditivo({
    id: 2,
    tipo: "renovacao",
    data: "2026-03-20",
    nova_vigencia_inicio: "2026-04-01",
    nova_vigencia_fim: "2027-03-31",
    valor_ciclo: 1500,
  });
  const ciclos = ciclosDoContrato(assinado, [renovacao], [mes("2026-03", 900, 900), mes("2026-04", 100, 0)]);
  e(ciclos.length, 2);
  e(ciclos[0].medido, 900);
  e(ciclos[1].medido, 100);
  e(ciclos[1].valor, 1500);
  e(ciclos[1].inicio, "2026-04-01");
  e(ciclos[1].abertura?.id, 2);
});

test("renovação sem início começa na data dela, e o ciclo anterior para na véspera", () => {
  const ciclos = ciclosDoContrato(
    assinado,
    [aditivo({ tipo: "renovacao", data: "2026-02-01", nova_vigencia_fim: "2027-01-31", valor_ciclo: 1000 })],
    [],
  );
  e(ciclos[1].inicio, "2026-02-01");
  e(ciclos[0].fim, "2026-01-31");
});

test("o saldo incorporado é o que sobrou do medido no ciclo anterior", () => {
  const ciclos = ciclosDoContrato(
    assinado,
    [
      aditivo({
        tipo: "renovacao",
        data: "2026-04-01",
        nova_vigencia_fim: "2027-03-31",
        valor_ciclo: 1000,
        incorpora_saldo: true,
      }),
    ],
    [mes("2025-06", 700)],
  );
  e(ciclos[1].incorporado, 500);
  e(ciclos[1].valor, 1500);
});

test("os outros aditivos caem no ciclo da data deles", () => {
  const ciclos = ciclosDoContrato(
    assinado,
    [
      aditivo({ id: 1, tipo: "valor", data: "2025-10-01", valor_delta: 300 }),
      aditivo({ id: 2, tipo: "renovacao", data: "2026-04-01", nova_vigencia_fim: "2027-03-31", valor_ciclo: 1000 }),
      aditivo({ id: 3, tipo: "prorrogacao", data: "2027-02-01", nova_vigencia_fim: "2027-06-30" }),
      aditivo({ id: 4, tipo: "valor", data: "2027-02-01", valor_delta: -100 }),
    ],
    [],
  );
  e(ciclos[0].valor, 1500);
  e(ciclos[1].valor, 900);
  e(ciclos[1].fim, "2027-06-30");
});

test("preço unitário: o ciclo não tem valor nem projeção de fim", () => {
  const [k] = ciclosDoContrato({ ...assinado, valor: null }, [], [mes("2025-04", 100), mes("2025-05", 100)]);
  e(k.valor, null);
  const p = projecaoDoCiclo(k);
  e(p.ritmo, 100);
  e(p.acabaEm, null);
});

test("a projeção usa a média dos últimos meses e diz quanto antes do fim o valor acaba", () => {
  // 1200 no ano; medindo 200/mês desde abril, acaba em setembro — 6 meses antes de março.
  const [k] = ciclosDoContrato(assinado, [], [mes("2025-04", 200), mes("2025-05", 200), mes("2025-06", 200)]);
  const p = projecaoDoCiclo(k);
  e(p.ritmo, 200);
  e(p.mesesNaMedia, 3);
  e(p.acabaEm, "2025-09-01");
  e(p.mesesAntes, 6);
});

test("o mês sem medido no meio entra como zero, e com um mês só não há ritmo", () => {
  const [k] = ciclosDoContrato(assinado, [], [mes("2025-04", 300), mes("2025-06", 300)]);
  e(projecaoDoCiclo(k).ritmo, 200);
  const [so] = ciclosDoContrato(assinado, [], [mes("2025-04", 300)]);
  e(projecaoDoCiclo(so).ritmo, null);
});

test("no ritmo que cabe no prazo não há alerta de projeção", () => {
  const c = contratoNoCiclo(
    contrato({ vigencia_inicio: "2025-04-01", vigencia_fim: "2026-03-31", valor: 1200, vigencia_atual: "2026-03-31" }),
    [],
    [mes("2025-04", 50), mes("2025-05", 50)],
    "2025-06-15",
  );
  e(c.projecao?.mesesAntes, 0);
  e(alertasDoContrato(c, "2025-06-15").some((a) => a.texto.startsWith("No ritmo")), false);
});

test("o contrato no ciclo: valor, medido e faturado do ciclo de hoje, saldo pelo faturado", () => {
  const c = contratoNoCiclo(
    contrato({ vigencia_inicio: "2025-04-01", vigencia_fim: "2026-03-31", valor: 1200, ultimo_reajuste: null }),
    [
      aditivo({
        tipo: "renovacao",
        data: "2026-04-01",
        nova_vigencia_fim: "2027-03-31",
        valor_ciclo: 2000,
        percentual: 0.05,
      }),
    ],
    [mes("2025-12", 1100, 1100), mes("2026-04", 300, 100)],
    "2026-05-10",
  );
  e(c.ciclo?.n, 2);
  e(c.valor_atual, 2000);
  e(c.medido, 300);
  e(c.faturado, 100);
  e(c.vigencia_atual, "2027-03-31");
  // A renovação com percentual conta como o reajuste do ano.
  e(c.ultimo_reajuste, "2026-04-01");
  deepStrictEqual(saldoDoContrato(c), { faturado: 100, aFaturar: 200, saldo: 1900 });
  // 1100 de 1200 no ciclo 1 não pede nada: ele já passou.
  e(alertasDoContrato(c, "2026-05-10").some((a) => /medido/.test(a.texto)), false);
});

test("80% medido avisa sem pedir ação; 90% pede", () => {
  const de = (medido: number) => alertasDoContrato(contrato({ valor_atual: 1000, medido }), "2026-06-01");
  deepStrictEqual(de(850).map((a) => a.tom), ["info"]);
  deepStrictEqual(de(920).map((a) => a.tom), ["aviso"]);
});

test("a renovação proposta é o dia seguinte, um ano, e o valor sem o incorporado", () => {
  deepStrictEqual(sugestaoDaRenovacao({ fim: "2026-03-31", valorBase: 1000, deltas: 200 }), {
    inicio: "2026-04-01",
    fim: "2027-03-31",
    valor: 1200,
  });
});
