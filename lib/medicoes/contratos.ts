// Os contratos (0013): o que vence, o que está para reajustar e quanto do
// valor já foi medido. A vigência e o valor de hoje saem da view
// `contratos_atual`; o que depende de "hoje" — a situação, o próximo
// reajuste e os alertas — sai daqui, como a idade do aberto sai de
// controle.ts.

export type Indice = "IPCA" | "IGP-M" | "INPC" | "IPC-FIPE" | "outro";
export const INDICES: Indice[] = ["IPCA", "IGP-M", "INPC", "IPC-FIPE", "outro"];

export type TipoDeAditivo = "renovacao" | "prorrogacao" | "reajuste" | "valor" | "encerramento" | "outro";
export const TIPOS_DE_ADITIVO: TipoDeAditivo[] = ["renovacao", "prorrogacao", "reajuste", "valor", "encerramento", "outro"];
export const ROTULO_ADITIVO: Record<TipoDeAditivo, string> = {
  renovacao: "Renovação",
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
  /** Com os ciclos montados (`contratoNoCiclo`): `valor_atual` e `medido` passam a ser os do ciclo de hoje. */
  faturado?: number;
  ciclos?: Ciclo[];
  ciclo?: Ciclo;
  projecao?: Projecao;
}

export interface Aditivo {
  id: number;
  contrato_id: number;
  tipo: TipoDeAditivo;
  data: string;
  numero: string | null;
  nova_vigencia_fim: string | null;
  /** Renovação (0018): onde começa o ciclo novo, o valor dele e se leva o que sobrou. */
  nova_vigencia_inicio?: string | null;
  valor_ciclo?: number | null;
  incorpora_saldo?: boolean;
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

/**
 * A conta do saldo, com o faturado (0018): o saldo do contrato é o valor menos
 * o FATURADO — anda sozinho quando a nota sai —, e o medido que ainda não
 * virou nota aparece ao lado, a caminho. Null sem o faturado ou sem valor.
 */
export function saldoDoContrato(
  c: Pick<ContratoAtual, "valor_atual" | "medido" | "faturado">,
): { faturado: number; aFaturar: number; saldo: number } | null {
  if (c.faturado === undefined || c.valor_atual === null) return null;
  return { faturado: c.faturado, aFaturar: Math.max(0, c.medido - c.faturado), saldo: c.valor_atual - c.faturado };
}

/** A partir de quanto do valor medido o contrato pede atenção. */
export const CONSUMO_DE_ATENCAO = 0.9;
/** A partir de quanto o cartão já avisa, sem pedir ação. */
export const CONSUMO_DE_AVISO = 0.8;
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
  const doCiclo = c.ciclo && c.ciclos && c.ciclos.length > 1 ? " do ciclo" : "";
  if (consumo !== null && consumo >= CONSUMO_DE_ATENCAO) {
    alertas.push({
      texto: consumo >= 1 ? `O medido já passou o valor${doCiclo || " do contrato"}` : `${Math.floor(consumo * 100)}% do valor${doCiclo} já medido`,
      tom: "aviso",
    });
  } else if (consumo !== null && consumo >= CONSUMO_DE_AVISO) {
    alertas.push({ texto: `${Math.floor(consumo * 100)}% do valor${doCiclo} já medido`, tom: "info" });
  }
  const p = c.projecao;
  if (p?.acabaEm && p.mesesAntes > 0 && (consumo ?? 0) < 1) {
    alertas.push({
      texto: `No ritmo atual o valor acaba em ${mesCurtoDe(p.acabaEm)} — ${p.mesesAntes} ${p.mesesAntes === 1 ? "mês" : "meses"} antes do fim${doCiclo}`,
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

/* ── Os ciclos (0018) ─────────────────────────────────────── */

/** Uma linha de `contrato_meses`: o controle do cliente naquele mês, nas categorias do contrato. */
export interface MesDoContrato {
  mes: string;
  medido: number;
  faturado: number;
}

/**
 * Um ciclo do contrato: do início (a assinatura ou uma renovação) ao fim, com
 * o valor dele. O consumo de um ciclo não passa para o seguinte.
 */
export interface Ciclo {
  n: number;
  inicio: string;
  fim: string;
  /** O valor com que o ciclo nasce; nulo no contrato por preço unitário. */
  valorBase: number | null;
  /** Acréscimos e supressões (e o que o reajuste soma) dentro do ciclo. */
  deltas: number;
  /** O que sobrou do ciclo anterior, quando a renovação o incorpora. */
  incorporado: number;
  valor: number | null;
  medido: number;
  faturado: number;
  meses: MesDoContrato[];
  /** A renovação que abriu o ciclo; nula no primeiro. */
  abertura: Aditivo | null;
  aditivos: Aditivo[];
  encerradoEm: string | null;
}

const mesDe = (d: string) => `${d.slice(0, 7)}-01`;
const somarDias = (d: string, n: number) => daMs(emMs(d) + n * DIA);
function somarMeses(mes: string, n: number): string {
  const total = +mes.slice(0, 4) * 12 + (+mes.slice(5, 7) - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}
/** Os meses de `de` a `ate`, os dois inclusos, em "AAAA-MM-01". */
export function mesesEntre(de: string, ate: string): string[] {
  const meses: string[] = [];
  for (let m = mesDe(de); m <= mesDe(ate) && meses.length < 600; m = somarMeses(m, 1)) meses.push(m);
  return meses;
}

/** "mar/2027". */
export function mesCurtoDe(d: string): string {
  const m = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${m[+d.slice(5, 7) - 1]}/${d.slice(0, 4)}`;
}

/**
 * Os ciclos, montados dos aditivos. A assinatura abre o primeiro; cada
 * renovação abre um novo, no período e com o valor dela. Os outros aditivos
 * caem no ciclo da data deles: a prorrogação estende o fim, o acréscimo e a
 * supressão (e o que o reajuste soma) mexem no valor, o encerramento fecha. O
 * mês do controle cai no último ciclo que começou até ele — o medido depois do
 * fim fica no último, para aparecer.
 */
export function ciclosDoContrato(
  c: { vigencia_inicio: string; vigencia_fim: string; valor: number | null },
  aditivos: Aditivo[],
  meses: MesDoContrato[],
): Ciclo[] {
  const ordem = [...aditivos].sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id);
  const renovacoes = ordem
    .filter((a) => a.tipo === "renovacao")
    .map((a) => ({ a, inicio: a.nova_vigencia_inicio ?? a.data }))
    .sort((x, y) => x.inicio.localeCompare(y.inicio) || x.a.id - y.a.id);
  const ciclos: Ciclo[] = [
    {
      n: 1, inicio: c.vigencia_inicio, fim: c.vigencia_fim, valorBase: c.valor, deltas: 0, incorporado: 0,
      valor: c.valor, medido: 0, faturado: 0, meses: [], abertura: null, aditivos: [], encerradoEm: null,
    },
  ];
  for (const { a, inicio } of renovacoes) {
    ciclos.push({
      n: ciclos.length + 1, inicio, fim: a.nova_vigencia_fim ?? inicio,
      valorBase: a.valor_ciclo ?? null, deltas: 0, incorporado: 0, valor: null,
      medido: 0, faturado: 0, meses: [], abertura: a, aditivos: [], encerradoEm: null,
    });
  }
  const doDia = (d: string) => [...ciclos].reverse().find((k) => k.inicio <= d) ?? ciclos[0];
  for (const a of ordem) {
    if (a.tipo === "renovacao") continue;
    const k = doDia(a.data);
    k.aditivos.push(a);
    if (a.nova_vigencia_fim) k.fim = a.nova_vigencia_fim;
    if (a.valor_delta) k.deltas += Number(a.valor_delta);
    if (a.tipo === "encerramento") {
      k.encerradoEm = k.encerradoEm ?? a.data;
      if (a.data < k.fim) k.fim = a.data;
    }
  }
  // O ciclo termina, no máximo, na véspera do seguinte.
  for (let i = 0; i < ciclos.length - 1; i++) {
    const vespera = somarDias(ciclos[i + 1].inicio, -1);
    if (ciclos[i].fim > vespera) ciclos[i].fim = vespera;
  }
  for (const m of [...meses].sort((a, b) => a.mes.localeCompare(b.mes))) {
    const k = [...ciclos].reverse().find((x) => mesDe(x.inicio) <= m.mes) ?? ciclos[0];
    k.meses.push(m);
    k.medido += m.medido;
    k.faturado += m.faturado;
  }
  for (let i = 0; i < ciclos.length; i++) {
    const k = ciclos[i];
    const anterior = ciclos[i - 1];
    if (k.abertura?.incorpora_saldo && anterior?.valor !== null && anterior?.valor !== undefined) {
      k.incorporado = Math.max(0, anterior.valor - anterior.medido);
    }
    k.valor = k.valorBase === null ? null : k.valorBase + k.deltas + k.incorporado;
  }
  return ciclos;
}

/** O ciclo em que hoje está; antes do primeiro, o primeiro; depois do último, o último. */
export function cicloDeHoje(ciclos: Ciclo[], hoje: string): Ciclo {
  return [...ciclos].reverse().find((k) => k.inicio <= hoje) ?? ciclos[0];
}

export interface Projecao {
  /** O medido médio por mês nos últimos meses do ciclo. */
  ritmo: number | null;
  /** Quantos meses entraram na média. */
  mesesNaMedia: number;
  /** O mês em que, no ritmo, o medido alcança o valor do ciclo. */
  acabaEm: string | null;
  /** Quantos meses antes do mês do fim do ciclo isso acontece (0 se não acontece antes). */
  mesesAntes: number;
}

/** Quantos meses o ritmo olha para trás. */
export const MESES_DO_RITMO = 6;

/**
 * O ritmo é a média do medido dos últimos meses do ciclo, contados do último
 * mês com medido para trás (o mês sem nada entra como zero). Com menos de dois
 * meses não há ritmo. A projeção é o mês em que, nesse ritmo, o medido alcança
 * o valor — é o medido que consome o contrato; a nota vem depois.
 */
export function projecaoDoCiclo(k: Ciclo): Projecao {
  const comMedido = k.meses.filter((m) => m.medido > 0);
  const vazio: Projecao = { ritmo: null, mesesNaMedia: 0, acabaEm: null, mesesAntes: 0 };
  if (comMedido.length === 0) return vazio;
  const ultimo = comMedido[comMedido.length - 1].mes;
  const primeiro = mesDe(k.inicio);
  let soma = 0;
  let n = 0;
  for (let i = 0; i < MESES_DO_RITMO; i++) {
    const mes = somarMeses(ultimo, -i);
    if (mes < primeiro) break;
    soma += k.meses.find((m) => m.mes === mes)?.medido ?? 0;
    n += 1;
  }
  if (n < 2) return { ...vazio, mesesNaMedia: n };
  const ritmo = soma / n;
  if (k.valor === null || ritmo <= 0) return { ritmo, mesesNaMedia: n, acabaEm: null, mesesAntes: 0 };
  const falta = k.valor - k.medido;
  const acabaEm = falta <= 0 ? ultimo : somarMeses(ultimo, Math.ceil(falta / ritmo));
  const fim = mesDe(k.fim);
  const antes = (+fim.slice(0, 4) * 12 + +fim.slice(5, 7)) - (+acabaEm.slice(0, 4) * 12 + +acabaEm.slice(5, 7));
  return { ritmo, mesesNaMedia: n, acabaEm, mesesAntes: Math.max(0, antes) };
}

/**
 * O que a renovação propõe: o dia seguinte ao fim do último ciclo, um ano de
 * período e o valor com que ele correu (sem o saldo incorporado, que é do
 * termo e não do preço). A tela preenche, quem lança confere com o papel.
 */
export function sugestaoDaRenovacao(ultimo: Pick<Ciclo, "fim" | "valorBase" | "deltas">): {
  inicio: string;
  fim: string;
  valor: number | null;
} {
  const inicio = somarDias(ultimo.fim, 1);
  return {
    inicio,
    fim: somarDias(somarAnos(inicio, 1), -1),
    valor: ultimo.valorBase === null ? null : ultimo.valorBase + ultimo.deltas,
  };
}

/** O último reajuste registrado — o aditivo de reajuste ou a renovação com percentual. */
function ultimoReajuste(aditivos: Aditivo[], daView: string | null): string | null {
  const datas = aditivos
    .filter((a) => a.tipo === "reajuste" || (a.tipo === "renovacao" && a.percentual !== null))
    .map((a) => a.nova_vigencia_inicio && a.tipo === "renovacao" ? a.nova_vigencia_inicio : a.data);
  return [daView, ...datas].filter((d): d is string => !!d).sort().pop() ?? null;
}

/**
 * O contrato com os ciclos: `valor_atual` e `medido` passam a ser os do ciclo
 * de hoje, e o faturado e a projeção vêm junto — é com eles que o cartão, a
 * ficha e o contador do menu falam.
 */
export function contratoNoCiclo(
  c: ContratoAtual,
  aditivos: Aditivo[],
  meses: MesDoContrato[],
  hoje: string,
): ContratoAtual {
  const ciclos = ciclosDoContrato(c, aditivos, meses);
  const ciclo = cicloDeHoje(ciclos, hoje);
  return {
    ...c,
    // A vigência é a do último ciclo: a renovação já assinada estende o contrato.
    vigencia_atual: ciclos[ciclos.length - 1].fim,
    valor_atual: ciclo.valor,
    medido: ciclo.medido,
    faturado: ciclo.faturado,
    ultimo_reajuste: ultimoReajuste(aditivos, c.ultimo_reajuste),
    ciclos,
    ciclo,
    projecao: projecaoDoCiclo(ciclo),
  };
}

/** Os números que a view e as tabelas devolvem como texto. */
export function aditivoLido(cru: Record<string, unknown>): Aditivo {
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...(cru as unknown as Aditivo),
    valor_delta: n(cru.valor_delta),
    percentual: n(cru.percentual),
    valor_ciclo: n(cru.valor_ciclo),
    nova_vigencia_inicio: (cru.nova_vigencia_inicio as string | null) ?? null,
    incorpora_saldo: Boolean(cru.incorpora_saldo),
  };
}

export function mesLido(cru: Record<string, unknown>): MesDoContrato & { contrato_id: number } {
  return {
    contrato_id: Number(cru.contrato_id),
    mes: String(cru.mes).slice(0, 10),
    medido: Number(cru.medido ?? 0),
    faturado: Number(cru.faturado ?? 0),
  };
}
