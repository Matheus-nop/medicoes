// Os boletins em aberto: o mês se lança aos poucos, um BM por base, e eles
// ficam abertos até o fechamento. São muitos ao mesmo tempo — esta é a conta
// do que cada um pede antes de fechar. Nada disto se grava: sai do boletim,
// das OMs dele e do cadastro de bases, na hora.

import { acharBase, type Base } from "./bases.ts";
import { ordemDaReferencia, rotuloDaReferencia } from "./arquivo.ts";
import { FUSO, chaveDoDestino } from "./medicoes.ts";

/** O que a tela precisa de um boletim aberto. */
export interface BoletimAberto {
  id: number;
  numero: string;
  cliente: string;
  base: string | null;
  referencia: string | null;
  documento: string | null;
  contato: string | null;
  oms: number;
  valor: number;
  primeira_om: string | null;
  ultima_om: string | null;
  criado_em: string;
}

/** O que se lê das OMs de um boletim aberto: quando entrou a última e quantas estão sem valor. */
export interface OmsDoAberto {
  ultimaInclusao: string | null;
  semValor: number;
}

/** As OMs dos boletins abertos, uma linha por OM, resumidas por boletim. */
export function resumirOms(
  linhas: { boletim_id: number; incluido_em: string | null; valor: number | string | null }[],
): Map<number, OmsDoAberto> {
  const mapa = new Map<number, OmsDoAberto>();
  for (const l of linhas) {
    const r = mapa.get(l.boletim_id) ?? { ultimaInclusao: null, semValor: 0 };
    if (l.incluido_em && (!r.ultimaInclusao || l.incluido_em > r.ultimaInclusao)) r.ultimaInclusao = l.incluido_em;
    if (!(Number(l.valor) > 0)) r.semValor += 1;
    mapa.set(l.boletim_id, r);
  }
  return mapa;
}

/** O dia, no fuso da casa ("2026-10-05"). */
const diaNaCasa = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: FUSO });

/** Quantos dias inteiros, no calendário da casa, entre a data e hoje. */
export function diasDesde(iso: string | null | undefined, hoje: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const a = Date.parse(diaNaCasa(d));
  const b = Date.parse(diaNaCasa(hoje));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** "hoje", "ontem", "há 5 dias". */
export function haQuanto(dias: number | null): string {
  if (dias === null) return "—";
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/** Sem OM nova há tanto tempo, o boletim pode ter sido esquecido. */
export const DIAS_PARADO = 7;

export type TipoDePendencia =
  | "mes_anterior"
  | "dois_abertos"
  | "sem_cadastro"
  | "sem_regional"
  | "sem_om"
  | "sem_valor"
  | "parado";

export interface Pendencia {
  tipo: TipoDePendencia;
  texto: string;
}

export const ROTULO_PENDENCIA: Record<TipoDePendencia, string> = {
  mes_anterior: "De mês anterior",
  dois_abertos: "Base com dois abertos",
  sem_cadastro: "Fora do cadastro",
  sem_regional: "Sem regional",
  sem_om: "Sem OM",
  sem_valor: "OM sem valor",
  parado: `Parado há ${DIAS_PARADO}+ dias`,
};

/**
 * O mês que está sendo lançado: o mais recente entre os abertos. Quem abriu
 * setembro já passou de agosto — o agosto que sobrou aberto pede fechamento.
 */
export function mesEmLancamento(abertos: { referencia: string | null }[]): number {
  return abertos.reduce((m, b) => Math.max(m, ordemDaReferencia(b.referencia)), 0);
}

/**
 * O que um boletim aberto pede antes de fechar. Nenhuma é erro: é o que se
 * olha. A ordem é a de quem vai resolver — primeiro o que muda o destino
 * (mês, base, cadastro), depois o conteúdo (OMs, valores, parado).
 */
export function pendenciasDoAberto(
  b: BoletimAberto,
  ctx: {
    abertos: BoletimAberto[];
    bases: Pick<Base, "cliente" | "nome" | "regional" | "apelidos">[];
    mesCorrente: number;
    oms?: OmsDoAberto;
    hoje: Date;
  },
): Pendencia[] {
  const p: Pendencia[] = [];
  const mes = ordemDaReferencia(b.referencia);
  if (mes && ctx.mesCorrente && mes < ctx.mesCorrente) {
    p.push({
      tipo: "mes_anterior",
      texto: `É de ${rotuloDaReferencia(mes)} e já se lança ${rotuloDaReferencia(ctx.mesCorrente)}: falta fechar?`,
    });
  }
  const chave = chaveDoDestino(b.cliente, b.base);
  const irmaos = ctx.abertos.filter((o) => o.id !== b.id && chaveDoDestino(o.cliente, o.base) === chave);
  if (irmaos.length) {
    p.push({
      tipo: "dois_abertos",
      texto: `A base tem outro aberto (${irmaos.map((o) => o.documento?.trim() || o.numero).join(", ")}): a colagem vai para um só.`,
    });
  }
  const cadastro = acharBase(ctx.bases, b.cliente, b.base);
  if (!cadastro) {
    p.push({ tipo: "sem_cadastro", texto: "A base não está no cadastro: confira o nome." });
  } else if (!cadastro.regional?.trim()) {
    p.push({ tipo: "sem_regional", texto: "A base não tem regional no cadastro." });
  }
  const dias = diasDesde(ctx.oms?.ultimaInclusao ?? b.criado_em, ctx.hoje);
  if (b.oms === 0) {
    // Vazio já diz que está parado: uma linha só, com o tempo junto.
    p.push({ tipo: "sem_om", texto: `Nenhuma OM ainda${dias ? ` (aberto ${haQuanto(dias)})` : ""}.` });
    return p;
  }
  if (ctx.oms && ctx.oms.semValor > 0) {
    p.push({ tipo: "sem_valor", texto: `${ctx.oms.semValor} OM(s) sem valor.` });
  }
  if (dias !== null && dias >= DIAS_PARADO) {
    p.push({ tipo: "parado", texto: `Nenhuma OM nova ${haQuanto(dias)}.` });
  }
  return p;
}

/** As formas de pôr em ordem os abertos de uma regional. */
export type OrdemDosAbertos = "base" | "valor" | "parado";

export function ordenarAbertos<T extends BoletimAberto>(
  lista: T[],
  ordem: OrdemDosAbertos,
  oms: Map<number, OmsDoAberto>,
): T[] {
  const ultima = (b: T) => oms.get(b.id)?.ultimaInclusao ?? b.criado_em;
  const porBase = (a: T, b: T) =>
    (a.base ?? "").localeCompare(b.base ?? "", "pt-BR") || a.cliente.localeCompare(b.cliente, "pt-BR");
  return [...lista].sort((a, b) =>
    ordem === "valor"
      ? b.valor - a.valor || porBase(a, b)
      : ordem === "parado"
        ? ultima(a).localeCompare(ultima(b)) || porBase(a, b)
        : porBase(a, b),
  );
}
