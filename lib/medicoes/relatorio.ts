// O relatório de manutenção do cliente (0021): o anexo de cada OM cobrada, no
// papel do Águas do Rio — "RELATÓRIO DE MANUTENÇÃO DE EQUIPAMENTO".
//
// Aqui fica a forma do que se grava (o `jsonb` de cada versão), o que a OM do
// boletim já preenche e a conta do total — sem banco nem navegador, para se
// provar com `npm test`. O total não se grava: é a soma dos materiais.

import type { ItemDoBoletim } from "./medicoes.ts";

export type TipoDeManutencao = "Corretiva" | "Preventiva";
export const TIPOS_DE_MANUTENCAO: TipoDeManutencao[] = ["Corretiva", "Preventiva"];

/** As três fotos que o papel pede, na ordem dele. */
export type MomentoDaFoto = "retirada" | "manutencao" | "entrega";
export const MOMENTOS: MomentoDaFoto[] = ["retirada", "manutencao", "entrega"];
export const ROTULO_MOMENTO: Record<MomentoDaFoto, string> = {
  retirada: "Foto Retirada",
  manutencao: "Foto em manutenção",
  entrega: "Foto Entrega",
};

export interface Material {
  descricao: string;
  /** O valor da peça ou do serviço. Nulo: o "-" do papel (vai sem valor). */
  valor: number | null;
}

/** O que se preenche — o `dados` de cada versão. */
export interface DadosDoRelatorio {
  data_retirada: string | null;
  responsavel: string;
  solicitante: string;
  superintendencia: string;
  tipo_manutencao: TipoDeManutencao;
  defeito: string;
  equipamento: string;
  modelo: string;
  patrimonio: string;
  observacao: string;
  diagnostico: string;
  materiais: Material[];
  /** O caminho de cada foto no bucket `medicoes-relatorios`. */
  fotos: Record<MomentoDaFoto, string | null>;
}

/** Quantas linhas de materiais o papel desenha, mesmo vazias — as do modelo (17 a 43). */
export const LINHAS_DE_MATERIAIS = 27;

/** O fornecedor como o papel do cliente o escreve — o CNPJ que presta o serviço. */
export const FORNECEDOR_DO_RELATORIO = "NOVA OPÇÃO 2008 MÁQUINAS E SERVIÇOS LTDA";

/** "02/10/2026", da data gravada; vazio quando não há. */
export const diaNoPapel = (d: string | null) => (d ? d.split("-").reverse().join("/") : "");

const texto = (x: unknown) => (typeof x === "string" ? x : "");
const numero = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null);
const dia = (x: unknown): string | null => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);

/** O `dados` de uma versão, do jeito que for que tenha sido gravado. Campo estranho se ignora. */
export function dadosLidos(cru: unknown): DadosDoRelatorio {
  const d = (cru && typeof cru === "object" ? cru : {}) as Record<string, unknown>;
  const f = (d.fotos && typeof d.fotos === "object" ? d.fotos : {}) as Record<string, unknown>;
  const foto = (k: MomentoDaFoto) => (typeof f[k] === "string" && f[k] ? (f[k] as string) : null);
  return {
    data_retirada: dia(d.data_retirada),
    responsavel: texto(d.responsavel),
    solicitante: texto(d.solicitante),
    superintendencia: texto(d.superintendencia),
    tipo_manutencao: d.tipo_manutencao === "Preventiva" ? "Preventiva" : "Corretiva",
    defeito: texto(d.defeito),
    equipamento: texto(d.equipamento),
    modelo: texto(d.modelo),
    patrimonio: texto(d.patrimonio),
    observacao: texto(d.observacao),
    diagnostico: texto(d.diagnostico),
    materiais: Array.isArray(d.materiais)
      ? d.materiais
          .map((m) => (m && typeof m === "object" ? (m as Record<string, unknown>) : {}))
          .map((m) => ({ descricao: texto(m.descricao), valor: numero(m.valor) }))
      : [],
    fotos: { retirada: foto("retirada"), manutencao: foto("manutencao"), entrega: foto("entrega") },
  };
}

/** O que se grava: sem espaço nas pontas, e sem a linha de material vazia. */
export function paraGravar(d: DadosDoRelatorio): DadosDoRelatorio {
  return {
    ...d,
    responsavel: d.responsavel.trim(),
    solicitante: d.solicitante.trim(),
    superintendencia: d.superintendencia.trim(),
    defeito: d.defeito.trim(),
    equipamento: d.equipamento.trim(),
    modelo: d.modelo.trim(),
    patrimonio: d.patrimonio.trim().toUpperCase(),
    observacao: d.observacao.trim(),
    diagnostico: d.diagnostico.trim(),
    materiais: d.materiais
      .map((m) => ({ descricao: m.descricao.trim(), valor: m.valor }))
      .filter((m) => m.descricao || m.valor !== null),
  };
}

/** O Valor Total O.M do papel: a soma dos materiais. Os sem valor não contam. */
export const totalDosMateriais = (materiais: Material[]) =>
  Math.round(materiais.reduce((t, m) => t + (m.valor ?? 0), 0) * 100) / 100;

/** Preventiva quando o Sisloc diz; o resto (corretiva de retorno, revisão) é corretiva. */
export const tipoDeManutencao = (tipoOm: string | null | undefined): TipoDeManutencao =>
  /PREVENT/i.test(tipoOm ?? "") ? "Preventiva" : "Corretiva";

/** A observação do papel: os comprovantes de retirada e de entrega, e o imposto. */
export function observacaoPadrao(omRetirada: string | null, reciboEntrega: string | null): string {
  return [
    omRetirada ? `REFERENTE AO COMPROVANTE DE RETIRADA: ${omRetirada}` : null,
    "IMPOSTO: INCLUSO",
    reciboEntrega ? `COMPROVANTE DE ENTREGA: ${reciboEntrega}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** O que o cadastro do Estoque sabe da máquina (`equipamentos_do_estoque`, 0021). */
export interface DoEstoque {
  patrimonio: string;
  tipo: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
}

/**
 * O relatório novo de uma OM, com o que já se sabe dela: do boletim (a base é
 * a superintendência, o contato é o responsável), da OM (equipamento,
 * patrimônio, chegada, os comprovantes) e do cadastro do Estoque (o modelo).
 * O que não se sabe fica em branco para a orçamentista preencher.
 */
export function relatorioNovo(
  item: Pick<ItemDoBoletim, "equipamento" | "patrimonio" | "tipo_om" | "chegada_em" | "aberta_em" | "om_retirada" | "recibo_entrega" | "valor"> | null,
  boletim: { base: string | null; contato: string | null } | null,
  estoque: DoEstoque | null,
): DadosDoRelatorio {
  const chegada = item?.chegada_em ?? item?.aberta_em ?? null;
  const equipamento =
    item?.equipamento?.trim() ||
    [estoque?.tipo, estoque?.marca].filter(Boolean).join(" ").trim() ||
    "";
  return {
    data_retirada: chegada ? chegada.slice(0, 10) : null,
    responsavel: boletim?.contato?.trim() ?? "",
    solicitante: "",
    superintendencia: boletim?.base?.trim() ?? "",
    tipo_manutencao: tipoDeManutencao(item?.tipo_om),
    defeito: "",
    equipamento,
    modelo: estoque?.modelo?.trim() ?? "",
    patrimonio: item?.patrimonio?.trim() ?? estoque?.patrimonio ?? "",
    observacao: item ? observacaoPadrao(item.om_retirada, item.recibo_entrega) : "IMPOSTO: INCLUSO",
    diagnostico: "",
    // Uma linha com o valor da OM: é o que o boletim cobra, e a orçamentista
    // só reparte nas peças.
    materiais: item && item.valor > 0 ? [{ descricao: "", valor: item.valor }] : [],
    fotos: { retirada: null, manutencao: null, entrega: null },
  };
}

/** O que falta para o papel sair como o cliente confere; nulo quando nada. */
export function faltaNoRelatorio(d: DadosDoRelatorio): string | null {
  if (!d.equipamento.trim()) return "Diga qual é o equipamento.";
  if (!d.patrimonio.trim()) return "Falta o patrimônio.";
  if (!d.defeito.trim()) return "Falta o defeito aparente.";
  if (!d.diagnostico.trim()) return "Falta o diagnóstico técnico.";
  if (!d.materiais.some((m) => m.descricao.trim())) return "Liste ao menos um material ou serviço.";
  return null;
}

/** A OM digitada, só os números; nula quando não parece OM. */
export function omDigitada(texto: string): string | null {
  const d = texto.replace(/\D/g, "");
  return d.length >= 3 && d.length <= 10 ? d : null;
}

/** As grafias de uma OM digitada para achar no boletim: como veio e com os zeros do Sisloc (seis dígitos). */
export function grafiasDaOm(om: string): string[] {
  return [...new Set([om, om.padStart(6, "0"), om.replace(/^0+/, "")])].filter((x) => x.length >= 3);
}

/* ── A leitura da OM que não está em boletim (0022) ─────────── */

/** De onde veio o que a leitura trouxe. */
export type FonteDaLeitura = "acompanhamento" | "carteira" | "os" | "orcamento" | "sisloc";
export const ROTULO_FONTE_DA_LEITURA: Record<FonteDaLeitura, string> = {
  acompanhamento: "acompanhamento da oficina",
  carteira: "carteira de OMs em aberto",
  os: "OS do Estoque",
  orcamento: "orçamento de De clientes",
  sisloc: "colagem do Sisloc",
};

/** Uma linha de `om_nos_outros_apps` (0022): a OM num dos lugares do Estoque. */
export interface OmNoEstoque {
  fonte: string;
  visto_em: string | null;
  patrimonio: string | null;
  equipamento: string | null;
  modelo: string | null;
  cliente: string | null;
  tipo_om: string | null;
  aberta_em: string | null;
  chegou_em: string | null;
  defeito: string | null;
  om_entrada: string | null;
  om_retorno: string | null;
  valor: number | string | null;
}

/** O que se sabe da OM fora do boletim, junto. Vazio é `null`. */
export interface LeituraDaOm {
  equipamento: string | null;
  patrimonio: string | null;
  modelo: string | null;
  tipo_om: string | null;
  /** A chegada; sem ela, a abertura da OM. Dia, "2026-10-02". */
  chegada_em: string | null;
  om_retirada: string | null;
  recibo_entrega: string | null;
  defeito: string | null;
  /** O Vl. orçamento — o que se cobra. Nunca o custo. */
  valor: number | null;
  cliente: string | null;
  fontes: FonteDaLeitura[];
}

const FONTES: FonteDaLeitura[] = ["acompanhamento", "carteira", "os", "orcamento", "sisloc"];
const cheio = (x: string | null | undefined) => (x && x.trim() ? x.trim() : null);

/**
 * Junta o que cada lugar do Estoque sabe da OM. Cada campo vem do lugar que o
 * conhece melhor: o defeito e os números de entrada e retorno, da OS; o valor,
 * do acompanhamento (é o Vl. orçamento da colagem) e, sem ele, do orçamento;
 * a chegada, da carteira. O resto, do primeiro que tiver.
 */
export function juntarLeituras(linhas: OmNoEstoque[]): LeituraDaOm | null {
  const de = (f: FonteDaLeitura) => linhas.find((l) => l.fonte === f);
  const lidas = linhas.filter((l) => FONTES.includes(l.fonte as FonteDaLeitura));
  if (!lidas.length) return null;
  const primeiro = (ordem: FonteDaLeitura[], campo: (l: OmNoEstoque) => string | null | undefined) => {
    for (const f of ordem) {
      const v = cheio(de(f) ? campo(de(f) as OmNoEstoque) : null);
      if (v) return v;
    }
    return null;
  };
  const geral: FonteDaLeitura[] = ["os", "acompanhamento", "carteira", "orcamento"];
  const valor = ["acompanhamento", "orcamento"]
    .map((f) => Number(de(f as FonteDaLeitura)?.valor ?? NaN))
    .find((v) => Number.isFinite(v) && v > 0);
  const chegada =
    primeiro(["carteira", "orcamento"], (l) => l.chegou_em) ?? primeiro(["acompanhamento", "carteira", "os", "orcamento"], (l) => l.aberta_em);
  return {
    equipamento: primeiro(geral, (l) => l.equipamento),
    patrimonio: primeiro(geral, (l) => l.patrimonio)?.toUpperCase() ?? null,
    modelo: primeiro(geral, (l) => l.modelo),
    tipo_om: primeiro(["acompanhamento", "carteira"], (l) => l.tipo_om),
    chegada_em: chegada ? chegada.slice(0, 10) : null,
    om_retirada: primeiro(["os"], (l) => l.om_entrada),
    recibo_entrega: primeiro(["os"], (l) => l.om_retorno),
    defeito: primeiro(["os", "orcamento"], (l) => l.defeito),
    valor: valor ?? null,
    cliente: primeiro(["acompanhamento", "carteira", "os", "orcamento"], (l) => l.cliente),
    fontes: FONTES.filter((f) => de(f)),
  };
}

/** A linha colada do Sisloc (a mesma leitura do boletim), como leitura da OM. */
export function leituraDoSisloc(o: {
  equipamento: string;
  patrimonio: string;
  tipoOm: string;
  abertaEm: string | null;
  chegadaEm: string | null;
  omRetirada: string;
  valor: number;
  cliente: string;
}): LeituraDaOm {
  const chegada = o.chegadaEm ?? o.abertaEm;
  return {
    equipamento: cheio(o.equipamento),
    patrimonio: cheio(o.patrimonio)?.toUpperCase() ?? null,
    modelo: null,
    tipo_om: cheio(o.tipoOm),
    chegada_em: chegada ? chegada.slice(0, 10) : null,
    om_retirada: cheio(o.omRetirada),
    recibo_entrega: null,
    defeito: null,
    valor: o.valor > 0 ? o.valor : null,
    cliente: cheio(o.cliente),
    fontes: ["sisloc"],
  };
}

/**
 * Preenche com a leitura só o que está em branco — nunca troca o que a
 * orçamentista já escreveu. Devolve os campos que mudaram, para a tela dizer.
 */
export function preencherComLeitura(
  d: DadosDoRelatorio,
  l: LeituraDaOm,
): { dados: DadosDoRelatorio; preenchidos: string[] } {
  const novo = { ...d };
  const preenchidos: string[] = [];
  const texto = (campo: "equipamento" | "modelo" | "patrimonio" | "defeito", valor: string | null, rotulo: string) => {
    if (valor && !novo[campo].trim()) {
      novo[campo] = valor;
      preenchidos.push(rotulo);
    }
  };
  texto("equipamento", l.equipamento, "equipamento");
  texto("modelo", l.modelo, "modelo");
  texto("patrimonio", l.patrimonio, "patrimônio");
  texto("defeito", l.defeito, "defeito aparente");
  if (l.chegada_em && !novo.data_retirada) {
    novo.data_retirada = l.chegada_em;
    preenchidos.push("data da retirada");
  }
  if (l.tipo_om && tipoDeManutencao(l.tipo_om) !== novo.tipo_manutencao && novo.tipo_manutencao === "Corretiva") {
    novo.tipo_manutencao = tipoDeManutencao(l.tipo_om);
    preenchidos.push("tipo de manutenção");
  }
  // A observação padrão sem comprovante é só o imposto: com os números da OM, ganha os comprovantes.
  const semComprovante = !novo.observacao.trim() || novo.observacao.trim() === observacaoPadrao(null, null);
  if (semComprovante && (l.om_retirada || l.recibo_entrega)) {
    novo.observacao = observacaoPadrao(l.om_retirada, l.recibo_entrega);
    preenchidos.push("observação");
  }
  if (l.valor && !novo.materiais.some((m) => m.valor !== null || m.descricao.trim())) {
    novo.materiais = [{ descricao: "", valor: l.valor }];
    preenchidos.push("valor da OM");
  }
  return { dados: novo, preenchidos };
}
