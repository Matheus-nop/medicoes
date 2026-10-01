// Os contratos (0013): o que vence, o que está para reajustar e quanto do
// valor já foi medido. A vigência e o valor de hoje saem da view
// `contratos_atual`; o que depende de "hoje" — a situação, o próximo
// reajuste e os alertas — sai daqui, como a idade do aberto sai de
// controle.ts.

export type Indice = "IPCA" | "IGP-M" | "INPC" | "IPC-FIPE" | "outro";
export const INDICES: Indice[] = ["IPCA", "IGP-M", "INPC", "IPC-FIPE", "outro"];

export type TipoDeAditivo = "prorrogacao" | "reajuste" | "valor" | "encerramento" | "outro";
export const TIPOS_DE_ADITIVO: TipoDeAditivo[] = ["prorrogacao", "reajuste", "valor", "encerramento", "outro"];
export const ROTULO_ADITIVO: Record<TipoDeAditivo, string> = {
  prorrogacao: "Prorrogação",
  reajuste: "Reajuste",
  valor: "Acréscimo ou supressão",
  encerramento: "Encerramento",
  outro: "Outro",
};

/** Uma linha de `contratos_atual`. Datas em "AAAA-MM-DD". */
export interface ContratoAtual {
  id: number;
  numero: string;
  cliente: string;
  objeto: string | null;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor: number | null;
  categorias: string[] | null;
  indice: Indice | null;
  data_base: string;
  aviso_dias: number;
  contato: string | null;
  email: string | null;
  observacao: string | null;
  criado_em: string;
  vigencia_atual: string;
  valor_atual: number | null;
  ultimo_reajuste: string | null;
  encerrado_em: string | null;
  aditivos: number;
  medido: number;
  medido_ate: string | null;
}

export interface Aditivo {
  id: number;
  contrato_id: number;
  tipo: TipoDeAditivo;
  data: string;
  numero: string | null;
  nova_vigencia_fim: string | null;
  valor_delta: number | null;
  percentual: number | null;
  descricao: string | null;
  quem: string;
  em: string;
}

export type SituacaoDoContrato = "a_iniciar" | "vigente" | "vence" | "vencido" | "encerrado";

export const ROTULO_SITUACAO_CONTRATO: Record<SituacaoDoContrato, string> = {
  a_iniciar: "A iniciar",
  vigente: "Vigente",
  vence: "Vence logo",
  vencido: "Vencido",
  encerrado: "Encerrado",
};

export const TOM_SITUACAO_CONTRATO = {
  a_iniciar: "neutro",
  vigente: "ok",
  vence: "aviso",
  vencido: "aviso",
  encerrado: "neutro",
} as const satisfies Record<SituacaoDoContrato, string>;

/* ── Datas, sem fuso: "AAAA-MM-DD" ────────────────────────── */

const DIA = 86_400_000;
const emMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const daMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Dias de `de` até `ate` (negativo quando `ate` já passou). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((emMs(ate) - emMs(de)) / DIA);
}

/** A mesma data, `anos` depois. 29/02 cai em 28/02 no ano que não tem. */
export function somarAnos(d: string, anos: number): string {
  const ano = +d.slice(0, 4) + anos;
  const mes = +d.slice(5, 7);
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(+d.slice(8, 10), ultimo);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Hoje no relógio da casa, e não no do servidor (que está em UTC). */
export function hojeNaCasa(agora = new Date()): string {
  return agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

/** "31/03/2027". */
export function dataDoContrato(d: string | null | undefined): string {
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—";
}

/* ── A situação ───────────────────────────────────────────── */

export function situacaoDoContrato(c: ContratoAtual, hoje: string): SituacaoDoContrato {
  if (c.encerrado_em && c.encerrado_em <= hoje) return "encerrado";
  if (c.vigencia_inicio > hoje) return "a_iniciar";
  const faltam = diasEntre(hoje, c.vigencia_atual);
  if (faltam < 0) return "vencido";
  if (faltam <= c.aviso_dias) return "vence";
  return "vigente";
}

/**
 * O próximo aniversário do reajuste e se ele já passou sem registro.
 *
 * O aniversário é a data-base mais N anos. Um reajuste registrado cobre o
 * aniversário que está a até meio ano dele — o reajuste assinado na semana
 * antes do aniversário não deixa o aniversário "atrasado". Sem índice, não há
 * reajuste a esperar.
 */
export function proximoReajuste(
  c: Pick<ContratoAtual, "indice" | "data_base" | "ultimo_reajuste">,
  hoje: string,
): { data: string; atrasado: boolean; dias: number } | null {
  if (!c.indice) return null;
  const coberto = c.ultimo_reajuste ? daMs(emMs(c.ultimo_reajuste) + 182 * DIA) : c.data_base;
  let n = 1;
  while (somarAnos(c.data_base, n) <= coberto) n += 1;
  const data = somarAnos(c.data_base, n);
  return { data, atrasado: data <= hoje, dias: diasEntre(hoje, data) };
}

/** Quanto do valor global já foi medido. Null sem valor (preço unitário). */
export function consumoDoContrato(c: Pick<ContratoAtual, "valor_atual" | "medido">): number | null {
  if (c.valor_atual === null || c.valor_atual <= 0) return null;
  return c.medido / c.valor_atual;
}

/** A partir de quanto do valor medido o contrato pede atenção. */
export const CONSUMO_DE_ATENCAO = 0.9;
/** Com quantos dias de antecedência o reajuste aparece. */
export const AVISO_DO_REAJUSTE = 60;

export interface Alerta {
  texto: string;
  /** "aviso": é preciso fazer algo. "info": é bom saber. */
  tom: "aviso" | "info";
}

/** O que o contrato pede hoje. Vazio quando não pede nada. */
export function alertasDoContrato(c: ContratoAtual, hoje: string): Alerta[] {
  const s = situacaoDoContrato(c, hoje);
  if (s === "encerrado") return [];
  const alertas: Alerta[] = [];
  const faltam = diasEntre(hoje, c.vigencia_atual);
  if (s === "vencido") {
    alertas.push({ texto: `Vencido há ${-faltam} dia(s), em ${dataDoContrato(c.vigencia_atual)}`, tom: "aviso" });
  } else if (s === "vence") {
    alertas.push({
      texto: faltam === 0 ? "Vence hoje" : `Vence em ${faltam} dia(s), em ${dataDoContrato(c.vigencia_atual)}`,
      tom: "aviso",
    });
  }
  const r = s === "vencido" ? null : proximoReajuste(c, hoje);
  if (r?.atrasado) {
    alertas.push({ texto: `Reajuste de ${dataDoContrato(r.data)} sem registro`, tom: "aviso" });
  } else if (r && r.dias <= AVISO_DO_REAJUSTE) {
    alertas.push({ texto: `Reajuste (${c.indice}) em ${r.dias} dia(s), ${dataDoContrato(r.data)}`, tom: "info" });
  }
  const consumo = consumoDoContrato(c);
  if (consumo !== null && consumo >= CONSUMO_DE_ATENCAO) {
    alertas.push({
      texto: consumo >= 1 ? "O medido já passou o valor do contrato" : `${Math.floor(consumo * 100)}% do valor já medido`,
      tom: "aviso",
    });
  }
  return alertas;
}

/** Os contratos que pedem alguma ação — o contador do menu. */
export function contratosPedindoAtencao(contratos: ContratoAtual[], hoje: string): number {
  return contratos.filter((c) => alertasDoContrato(c, hoje).some((a) => a.tom === "aviso")).length;
}

/** O número da view, quando ela devolve texto. */
export function contratoLido(cru: Record<string, unknown>): ContratoAtual {
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...(cru as unknown as ContratoAtual),
    valor: n(cru.valor),
    valor_atual: n(cru.valor_atual),
    medido: Number(cru.medido ?? 0),
    aditivos: Number(cru.aditivos ?? 0),
    aviso_dias: Number(cru.aviso_dias ?? 90),
  };
}
