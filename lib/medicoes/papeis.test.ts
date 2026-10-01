import { test } from "node:test";
import assert from "node:assert/strict";
import { podeLancar, quemLanca } from "./papeis.ts";

test("cada time lança o que é seu, e a diretoria lança tudo", () => {
  assert.equal(podeLancar("orcamento", "boletim"), true);
  assert.equal(podeLancar("orcamento", "controle"), false);
  assert.equal(podeLancar("faturamento", "controle"), true);
  assert.equal(podeLancar("faturamento", "recebimento"), false);
  assert.equal(podeLancar("financeiro", "boletim"), false);
  assert.equal(podeLancar("financeiro", "recebimento"), true);
  assert.equal(podeLancar("faturamento", "contrato"), true);
  assert.equal(podeLancar("orcamento", "contrato"), false);
  for (const o of ["boletim", "controle", "recebimento", "contrato"] as const) {
    assert.equal(podeLancar("diretoria", o), true);
    assert.equal(podeLancar(null, o), false);
  }
});

test("o aviso diz quem lança", () => {
  assert.equal(quemLanca("controle"), "o faturamento e a diretoria");
  assert.equal(quemLanca("boletim"), "o orçamento, o faturamento e a diretoria");
});
