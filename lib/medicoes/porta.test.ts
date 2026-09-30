import { strictEqual as e } from "node:assert/strict";
import { test } from "node:test";
import { paraOndeMandar } from "./porta.ts";

test("sem papel não passa de /sem-acesso", () => {
  e(paraOndeMandar(null, "/"), "/sem-acesso");
  e(paraOndeMandar(null, "/boletins/3"), "/sem-acesso");
  e(paraOndeMandar(null, "/usuarios"), "/sem-acesso");
  e(paraOndeMandar(null, "/sem-acesso"), null);
});

test("login e troca de senha são de todo mundo", () => {
  e(paraOndeMandar(null, "/login"), null);
  e(paraOndeMandar(null, "/auth/nova-senha"), null);
});

test("usuários é só da diretoria", () => {
  e(paraOndeMandar("financeiro", "/usuarios"), "/");
  e(paraOndeMandar("orcamento", "/usuarios/x"), "/");
  e(paraOndeMandar("diretoria", "/usuarios"), null);
});

test("quem tem papel não fica preso em sem-acesso, e anda pelo resto", () => {
  e(paraOndeMandar("faturamento", "/sem-acesso"), "/");
  e(paraOndeMandar("faturamento", "/"), null);
  e(paraOndeMandar("orcamento", "/boletins/1/folha"), null);
  // "/usuariosx" não é "/usuarios".
  e(paraOndeMandar("financeiro", "/usuariosx"), null);
});
