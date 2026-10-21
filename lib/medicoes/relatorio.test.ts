// Prova do relatório de manutenção do cliente (0021).

import { deepStrictEqual as igual, strictEqual as e } from "node:assert/strict";
import { test } from "node:test";
import {
  dadosLidos,
  faltaNoRelatorio,
  grafiasDaOm,
  leituraDaMedicao,
  leituraDoSisloc,
  preencherComLeitura,
  observacaoPadrao,
  omDigitada,
  paraGravar,
  relatorioNovo,
  tipoDeManutencao,
  totalDosMateriais,
} from "./relatorio.ts";

const OM = {
  equipamento: "CORTADORA MANUAL HUSQVARNA",
  patrimonio: "250225-258",
  tipo_om: "Corretiva de retorno",
  chegada_em: "2026-10-02T13:00:00Z",
  aberta_em: "2026-10-03T09:00:00Z",
  om_retirada: "023323",
  recibo_entrega: "015932",
  valor: 2624,
};

test("o relatório novo nasce do boletim, da OM e do cadastro", () => {
  const d = relatorioNovo(OM, { base: "PROJETO VILAS - RIO NORTE - BLOCO 4", contato: "SR. GABRIEL" }, {
    patrimonio: "250225-258",
    tipo: "CORTADORA MANUAL",
    marca: "HUSQVARNA",
    modelo: "K770",
    serie: null,
  });
  e(d.data_retirada, "2026-10-02");
  e(d.superintendencia, "PROJETO VILAS - RIO NORTE - BLOCO 4");
  e(d.responsavel, "SR. GABRIEL");
  e(d.equipamento, "CORTADORA MANUAL HUSQVARNA");
  e(d.modelo, "K770");
  e(d.tipo_manutencao, "Corretiva");
  e(d.observacao, "REFERENTE AO COMPROVANTE DE RETIRADA: 023323\n\nIMPOSTO: INCLUSO\n\nCOMPROVANTE DE ENTREGA: 015932");
  igual(d.materiais, [{ descricao: "", valor: 2624 }]);
});

test("sem a OM no boletim, o equipamento vem do cadastro", () => {
  const d = relatorioNovo(null, null, { patrimonio: "25012-158", tipo: "CORTADORA DE PISO", marca: "HUSQVARNA", modelo: "FS400", serie: null });
  e(d.equipamento, "CORTADORA DE PISO HUSQVARNA");
  e(d.patrimonio, "25012-158");
  e(d.observacao, "IMPOSTO: INCLUSO");
  igual(d.materiais, []);
});

test("o total é a soma dos materiais, e o sem valor não conta", () => {
  e(totalDosMateriais([{ descricao: "TAMPA", valor: 64 }, { descricao: "CONECTOR", valor: 139 }, { descricao: "REVISÃO", valor: null }]), 203);
  e(totalDosMateriais([]), 0);
  e(totalDosMateriais([{ descricao: "a", valor: 0.1 }, { descricao: "b", valor: 0.2 }]), 0.3);
});

test("o tipo de manutenção pelo Sisloc", () => {
  e(tipoDeManutencao("PREVENTIVA"), "Preventiva");
  e(tipoDeManutencao("Corretiva de retorno"), "Corretiva");
  e(tipoDeManutencao(null), "Corretiva");
});

test("a observação sem comprovante não inventa número", () => {
  e(observacaoPadrao(null, null), "IMPOSTO: INCLUSO");
  e(observacaoPadrao("1283-03", null), "REFERENTE AO COMPROVANTE DE RETIRADA: 1283-03\n\nIMPOSTO: INCLUSO");
});

test("o que se grava some com a linha vazia e normaliza o patrimônio", () => {
  const d = paraGravar({
    ...relatorioNovo(OM, null, null),
    patrimonio: " 250225-258 ",
    materiais: [{ descricao: " CONJUNTO DO CILINDRO ", valor: 2624 }, { descricao: "  ", valor: null }],
  });
  e(d.patrimonio, "250225-258");
  igual(d.materiais, [{ descricao: "CONJUNTO DO CILINDRO", valor: 2624 }]);
});

test("o jsonb lido aguenta o que vier", () => {
  const d = dadosLidos({ tipo_manutencao: "x", materiais: [{ descricao: "A", valor: "10" }, null], fotos: { retirada: "a.jpg", entrega: 3 }, data_retirada: "02/10/2026" });
  e(d.tipo_manutencao, "Corretiva");
  igual(d.materiais, [{ descricao: "A", valor: null }, { descricao: "", valor: null }]);
  igual(d.fotos, { retirada: "a.jpg", manutencao: null, entrega: null });
  e(d.data_retirada, null);
  e(dadosLidos(null).equipamento, "");
});

test("o que falta para o papel sair", () => {
  const ok = { ...relatorioNovo(OM, null, null), defeito: "KIT CILINDRO", diagnostico: "SUBSTITUIÇÃO", materiais: [{ descricao: "CONJUNTO", valor: 2624 }] };
  e(faltaNoRelatorio(ok), null);
  e(faltaNoRelatorio({ ...ok, defeito: " " }), "Falta o defeito aparente.");
  e(faltaNoRelatorio({ ...ok, materiais: [{ descricao: "", valor: 10 }] }), "Liste ao menos um material ou serviço.");
});

test("a OM digitada e as grafias para achar no boletim", () => {
  e(omDigitada("OM 38129"), "38129");
  e(omDigitada("12"), null);
  igual(grafiasDaOm("38129"), ["38129", "038129"]);
  igual(grafiasDaOm("038129"), ["038129", "38129"]);
});

test("a leitura da medição traz a OM e o boletim dela", () => {
  const l = leituraDaMedicao(OM, { base: "VCG - COMUNIDADES", contato: "SRA. THAYNÃ" });
  e(l.fonte, "medicao");
  e(l.valor, 2624);
  e(l.recibo_entrega, "015932");
  e(l.chegada_em, "2026-10-02");
  const { dados, preenchidos } = preencherComLeitura(relatorioNovo(null, null, null), l);
  e(dados.superintendencia, "VCG - COMUNIDADES");
  e(dados.responsavel, "SRA. THAYNÃ");
  e(dados.observacao, observacaoPadrao("023323", "015932"));
  e(preenchidos.includes("responsável"), true);
});

test("a leitura preenche só o que está em branco", () => {
  const branco = relatorioNovo(null, null, null);
  const l = leituraDoSisloc({ equipamento: "CORTADORA", patrimonio: "25012-158", tipoOm: "PREVENTIVA", abertaEm: "2026-10-02T09:00:00Z",
    chegadaEm: null, omRetirada: "023323", valor: 2624, local: "BASE NORTE - ILHA" });
  e(l.superintendencia, "BASE NORTE - ILHA");
  e(l.fonte, "sisloc");
  const { dados, preenchidos } = preencherComLeitura({ ...branco, equipamento: "JÁ ESCRITO" }, l);
  e(dados.equipamento, "JÁ ESCRITO");
  e(dados.patrimonio, "25012-158");
  e(dados.tipo_manutencao, "Preventiva");
  e(dados.data_retirada, "2026-10-02");
  e(dados.observacao, "REFERENTE AO COMPROVANTE DE RETIRADA: 023323\n\nIMPOSTO: INCLUSO");
  igual(dados.materiais, [{ descricao: "", valor: 2624 }]);
  e(preenchidos.includes("equipamento"), false);
  e(preencherComLeitura(dados, l).preenchidos.length, 0);
});
