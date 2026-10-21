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
