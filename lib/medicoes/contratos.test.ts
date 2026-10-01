// Prova dos contratos: situação, reajuste e alertas.

import { strictEqual as e, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  alertasDoContrato,
  consumoDoContrato,
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
