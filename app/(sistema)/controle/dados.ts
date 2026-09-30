import { createClient } from "@/lib/supabase/server";
import {
  CLIENTE_PADRAO,
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
  { vazioVale = false }: { vazioVale?: boolean } = {},
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
  const regioes = ((regioesTodas ?? []) as (Regiao & { cliente: string })[])
    .filter((r) => r.cliente === cliente)
    .map(({ id, nome, ordem }) => ({ id, nome, ordem }));

  const { data: totais, error: e3 } = await supabase
    .from("controle_mes")
    .select("periodo_id, mes, rotulo, saldo_anterior, medido, faturado, saldo, a_faturar")
    .eq("cliente", cliente)
    .order("mes");
  if (e3) return { ok: false, erro: e3.message, faltaMigracao: e3.code === "42P01" };
  const serie = (
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
  const historia = ((hist.data ?? []) as Celula[]).map((c) => ({
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
  };
}
