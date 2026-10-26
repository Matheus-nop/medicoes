import { createClient } from "@/lib/supabase/server";
import {
  CATEGORIAS,
  CLIENTE_PADRAO,
  TODAS,
  type Categoria,
  type Celula,
  type Periodo,
  type Regiao,
} from "@/lib/medicoes/controle";

/** Uma linha de `controle_mes`: o total de um período. */
export interface TotalDoPeriodo {
  periodo_id: number;
  mes: string;
  rotulo: string;
  /** O saldo que veio do mês anterior. */
  anterior: number;
  /** Medido e faturado NO MÊS. */
  medido: number;
  faturado: number;
  /** anterior + medido: o que havia para faturar no mês. */
  aFaturar: number;
  saldo: number;
}

export type CargaDoControle =
  | {
      ok: true;
      clientes: string[];
      cliente: string;
      periodos: Periodo[];
      /** Só os períodos com algum valor, na ordem do mês. */
      serie: TotalDoPeriodo[];
      periodo: Periodo | null;
      regioes: Regiao[];
      /** As células do período escolhido. */
      celulas: Celula[];
      /** Todas as células do cliente, de todos os meses — para a idade. */
      historia: Celula[];
      /** O mês em que o recebimento começou a ser acompanhado, ou null. */
      inicioRecebimento: string | null;
      /** O recorte: uma base (região do controle) ou TODAS, e um tipo ou todos. */
      base: string;
      tipo: Categoria | null;
      /** Todas as bases do cliente, para escolher — `regioes` é só a do recorte. */
      bases: Regiao[];
    }
  | { ok: false; erro: string; faltaMigracao: boolean };

const n = (v: unknown) => Number(v ?? 0);

/**
 * O controle de um cliente num período — o que o painel e a grade leem.
 *
 * Sem período pedido, vale o mês mais recente que tem algum número (o saldo
 * que veio conta): é a posição atual.
 */
export async function carregarControle(
  clientePedido?: string,
  periodoPedido?: number,
  {
    vazioVale = false,
    base: basePedida,
    tipo: tipoPedido,
  }: { vazioVale?: boolean; base?: string; tipo?: string } = {},
): Promise<CargaDoControle> {
  const supabase = await createClient();

  const { data: todos, error: e1 } = await supabase
    .from("controle_periodos")
    .select("id, cliente, mes, rotulo")
    .order("mes");
  if (e1) return { ok: false, erro: e1.message, faltaMigracao: e1.code === "42P01" };

  const { data: regioesTodas, error: e2 } = await supabase
    .from("controle_regioes")
    .select("id, cliente, nome, ordem")
    .order("ordem");
  if (e2) return { ok: false, erro: e2.message, faltaMigracao: e2.code === "42P01" };

  const clientes = [
    ...new Set([
      ...((todos ?? []) as Periodo[]).map((p) => p.cliente),
      ...((regioesTodas ?? []) as { cliente: string }[]).map((r) => r.cliente),
    ]),
  ].sort((a, b) => (a === CLIENTE_PADRAO ? -1 : b === CLIENTE_PADRAO ? 1 : a.localeCompare(b)));

  const cliente = clientePedido?.trim() || clientes[0] || CLIENTE_PADRAO;
  const periodos = ((todos ?? []) as Periodo[]).filter((p) => p.cliente === cliente);
  const bases = ((regioesTodas ?? []) as (Regiao & { cliente: string })[])
    .filter((r) => r.cliente === cliente)
    .map(({ id, nome, ordem }) => ({ id, nome, ordem }));
  // O recorte: base que não é do cliente, ou tipo que não existe, vale "todos".
  const base = basePedida && bases.some((r) => r.nome === basePedida) ? basePedida : TODAS;
  const tipo = CATEGORIAS.includes(tipoPedido as Categoria) ? (tipoPedido as Categoria) : null;
  const recortado = base !== TODAS || tipo !== null;
  const regioes = base === TODAS ? bases : bases.filter((r) => r.nome === base);

  const { data: totais, error: e3 } = await supabase
    .from("controle_mes")
    .select("periodo_id, mes, rotulo, saldo_anterior, medido, faturado, saldo, a_faturar")
    .eq("cliente", cliente)
    .order("mes");
  if (e3) return { ok: false, erro: e3.message, faltaMigracao: e3.code === "42P01" };
  let serie = (
    (totais ?? []) as (Omit<TotalDoPeriodo, "anterior" | "aFaturar"> & {
      saldo_anterior: unknown;
      a_faturar: unknown;
    })[]
  )
    .map((t) => ({
      periodo_id: t.periodo_id,
      mes: t.mes,
      rotulo: t.rotulo,
      anterior: n(t.saldo_anterior),
      medido: n(t.medido),
      faturado: n(t.faturado),
      aFaturar: n(t.a_faturar),
      saldo: n(t.saldo),
    }))
    .filter((t) => t.anterior !== 0 || t.medido !== 0 || t.faturado !== 0);

  const pedido = periodos.find((p) => p.id === periodoPedido);
  const maisRecente = serie.length
    ? periodos.find((p) => p.id === serie[serie.length - 1].periodo_id)
    : undefined;
  const periodo =
    pedido ?? maisRecente ?? (vazioVale ? periodos[periodos.length - 1] : undefined) ?? null;

  // A história inteira do cliente numa leitura só: dela saem as células do
  // mês e a idade do que está em aberto. São umas centenas de linhas.
  const [hist, ini] = await Promise.all([
    supabase
      .from("controle_posicao")
      .select(
        "periodo_id, regiao_id, regiao, ordem, categoria, saldo_anterior, medido, faturado, acompanha, abertura, recebido, a_receber_anterior",
      )
      .eq("cliente", cliente),
    supabase.from("controle_inicio_atual").select("mes").eq("cliente", cliente).maybeSingle(),
  ]);
  if (hist.error) {
    return { ok: false, erro: hist.error.message, faltaMigracao: hist.error.code === "42P01" };
  }
  const historia = ((hist.data ?? []) as Celula[])
    .filter((c) => (base === TODAS || c.regiao === base) && (tipo === null || c.categoria === tipo))
    .map((c) => ({
    ...c,
    categoria: c.categoria as Categoria,
    saldo_anterior: n(c.saldo_anterior),
    medido: n(c.medido),
    faturado: n(c.faturado),
    acompanha: Boolean(c.acompanha),
    abertura: n(c.abertura),
    recebido: n(c.recebido),
    a_receber_anterior: n(c.a_receber_anterior),
  }));
  // Com recorte, a evolução sai das células da base e do tipo, e não do total
  // do cliente: a mesma conta da view, somada aqui.
  if (recortado) serie = serieDasCelulas(historia, periodos);
  const celulas = periodo ? historia.filter((c) => c.periodo_id === periodo.id) : [];
  // Sem a 0007 a view de início não existe: o recebimento fica desligado.
  const inicioRecebimento = ini.error ? null : ((ini.data?.mes as string | undefined) ?? null);

  return {
    ok: true,
    clientes,
    cliente,
    periodos,
    serie,
    periodo,
    regioes,
    celulas,
    historia,
    inicioRecebimento,
    base,
    tipo,
    bases,
  };
}

/** O total de cada período a partir das células — o `controle_mes` de um recorte. */
export function serieDasCelulas(celulas: Celula[], periodos: Periodo[]): TotalDoPeriodo[] {
  const por = new Map<number, { anterior: number; medido: number; faturado: number }>();
  for (const c of celulas) {
    const t = por.get(c.periodo_id) ?? { anterior: 0, medido: 0, faturado: 0 };
    t.anterior += c.saldo_anterior ?? 0;
    t.medido += c.medido;
    t.faturado += c.faturado;
    por.set(c.periodo_id, t);
  }
  return periodos
    .filter((p) => por.has(p.id))
    .map((p) => {
      const t = por.get(p.id)!;
      return {
        periodo_id: p.id,
        mes: p.mes,
        rotulo: p.rotulo,
        anterior: t.anterior,
        medido: t.medido,
        faturado: t.faturado,
        aFaturar: t.anterior + t.medido,
        saldo: t.anterior + t.medido - t.faturado,
      };
    })
    .filter((t) => t.anterior !== 0 || t.medido !== 0 || t.faturado !== 0);
}
