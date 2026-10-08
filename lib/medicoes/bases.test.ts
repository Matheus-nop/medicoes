// Prova do cadastro de bases.

import { strictEqual as e, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import { acharBase, basesDoCliente, dadosDoBoletimNovo, proximoDocumento, regionaisDosBoletins, regionalDoBoletim } from "./bases.ts";

const CLI = "AEGEA SANEAMENTO E PARTICIPAÇÕES S.A";

test("acha a base pela chave, não pela grafia", () => {
  const bases = [{ cliente: CLI, nome: "BELFORD ROXO BAIXADA I - OPERAÇÃO" }];
  e(acharBase(bases, "AEGEA SANEAMENTO E PARTICIPAÇÕES S.A.", "belford roxo baixada i operacao")?.nome, bases[0].nome);
  e(acharBase(bases, CLI, "BELFORD ROXO BAIXADA I - SERVIÇOS"), null);
  e(acharBase(bases, CLI, ""), null);
});

test("o próximo documento da base: o maior mais um, com dois dígitos", () => {
  const boletins = [
    { cliente: CLI, base: "NORTE - MÉIER", documento: "13" },
    { cliente: CLI, base: "Norte - Meier", documento: "14" },
    { cliente: CLI, base: "NORTE - MÉIER", documento: "BM-0007 - AGOSTO/2026" },
    { cliente: CLI, base: "SUL - GÁVEA", documento: "16" },
  ];
  e(proximoDocumento(boletins, CLI, "NORTE - MÉIER"), "15");
  e(proximoDocumento(boletins, CLI, "BASE NOVA"), "01");
  e(proximoDocumento([{ cliente: CLI, base: "X", documento: "8" }], CLI, "X"), "09");
});

test("o boletim novo: o cadastro manda, o último boletim completa, o modelo sai do cliente", () => {
  deepStrictEqual(
    dadosDoBoletimNovo(
      CLI,
      { responsavel: "Sra. Thaynã", email: "", telefone: null, local_obra: "Rua Oscar Soares, 1362" },
      { contato: "Fulano", email: "fiscal@cliente.com.br", telefone: "(21) 0000-0000", modelo: "acao" },
    ),
    {
      contato: "Sra. Thaynã",
      email: "fiscal@cliente.com.br",
      telefone: "(21) 0000-0000",
      local_obra: "Rua Oscar Soares, 1362",
      observacao: null,
      modelo: "acao",
    },
  );
  e(dadosDoBoletimNovo(CLI, null, null).modelo, "aguas");
  e(dadosDoBoletimNovo("RIO + SANEAMENTO BL3 S.A", { modelo: null }, null).modelo, "rio_mais");
});

test("a regional do boletim vem do cadastro, na ordem do controle", () => {
  const bases = [
    { cliente: CLI, nome: "PENHA - CAV NORTE", regional: "VCG" },
    { cliente: "AGUAS DO RIO 4 SPE S.A", nome: "BASE NORTE - MEIER", regional: "NORTE" },
    { cliente: CLI, nome: "SEM CADASTRO DE REGIONAL", regional: null },
  ];
  const boletins = [
    { cliente: CLI, base: "Penha - CAV Norte" },
    { cliente: CLI, base: "PENHA - CAV NORTE" },
    { cliente: "AGUAS DO RIO 4 SPE S.A.", base: "BASE NORTE - MEIER" },
    { cliente: CLI, base: "SEM CADASTRO DE REGIONAL" },
    { cliente: CLI, base: "BASE QUE NAO ESTA NO CADASTRO" },
  ];
  e(regionalDoBoletim(boletins[0], bases), "VCG");
  e(regionalDoBoletim(boletins[4], bases), "");
  deepStrictEqual(regionaisDosBoletins(boletins, bases, ["NORTE", "SUL", "VCG"]), [
    { regional: "NORTE", boletins: 1 },
    { regional: "VCG", boletins: 2 },
    { regional: "", boletins: 2 },
  ]);
});

test("a base se acha também pelos outros nomes dela (0017)", () => {
  const bases = [
    { cliente: "AGUAS DO RIO 1 SPE S.A", nome: "LESTE - MARICÁ", apelidos: ["BASE LESTE- MARICÁ"] },
    { cliente: "AGUAS DO RIO 1 SPE S.A", nome: "LESTE - ITABORAÍ", apelidos: [] },
    { cliente: "AGUAS DO RIO 4 SPE S.A", nome: "BASE NORTE - MEIER" },
  ];
  e(acharBase(bases, "AGUAS DO RIO 1 SPE S.A.", "Base Leste - Maricá")?.nome, "LESTE - MARICÁ");
  e(acharBase(bases, "AGUAS DO RIO 1 SPE S.A", "LESTE - MARICÁ")?.nome, "LESTE - MARICÁ");
  // O outro nome vale só para o cliente da base.
  e(acharBase(bases, "AGUAS DO RIO 4 SPE S.A", "BASE LESTE- MARICÁ"), null);
  deepStrictEqual(
    basesDoCliente(bases, "AGUAS DO RIO 1 SPE S.A.").map((b) => b.nome),
    ["LESTE - ITABORAÍ", "LESTE - MARICÁ"],
  );
});

test("o BASE da frente do Sisloc não abre base nova", () => {
  const bases = [
    { cliente: CLI, nome: "BASE SUL - ROCHA", regional: null },
    { cliente: CLI, nome: "SUL - ROCHA", regional: "SUL" },
    { cliente: CLI, nome: "COMUNIDADES - GÁVEA", regional: "COMUNIDADE" },
  ];
  e(acharBase(bases, CLI, "BASE SUL - ROCHA")?.regional, "SUL");
  e(acharBase(bases, CLI, "BASE COMUNIDADES- GÁVEA")?.nome, "COMUNIDADES - GÁVEA");
  e(acharBase(bases, CLI, "BASEADO"), null);
});
