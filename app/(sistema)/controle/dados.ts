import { createClient } from "@/lib/supabase/server";
import {
  CLIENTE_PADRAO,
  type Categoria,
  type Celula,
  type Periodo,
  type Regiao,
} from "@/lib/medicoes/controle";

/** Uma linha de `controle_por_periodo`: o total de um período. */
export interface TotalDoPeriodo {
  periodo_id: number;
  mes: string;
  rotulo: string;
  medido: number;
  faturado: number;
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
      celulas: Celula[];
    }
  | { ok: false; erro: string; faltaMigracao: boolean };

const n = (v: unknown) => Number(v ?? 0);

/**
 * O controle de um cliente num período — o que o painel e a grade leem.
 *
 * Sem período pedido, vale a FOTO MAIS RECENTE que tem valor: é a posição
 * atual, e é a regra da planilha ("não somar meses").
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
    .from("controle_por_periodo")
    .select("periodo_id, mes, rotulo, medido, faturado, saldo")
    .eq("cliente", cliente)
    .order("mes");
  if (e3) return { ok: false, erro: e3.message, faltaMigracao: e3.code === "42P01" };
  const serie = ((totais ?? []) as TotalDoPeriodo[])
    .map((t) => ({ ...t, medido: n(t.medido), faturado: n(t.faturado), saldo: n(t.saldo) }))
    .filter((t) => t.medido !== 0 || t.faturado !== 0);

  const pedido = periodos.find((p) => p.id === periodoPedido);
  const maisRecente = serie.length
    ? periodos.find((p) => p.id === serie[serie.length - 1].periodo_id)
    : undefined;
  const periodo =
    pedido ?? maisRecente ?? (vazioVale ? periodos[periodos.length - 1] : undefined) ?? null;

  let celulas: Celula[] = [];
  if (periodo) {
    const { data, error } = await supabase
      .from("controle_atual")
      .select("periodo_id, regiao_id, regiao, ordem, categoria, medido, faturado")
      .eq("periodo_id", periodo.id);
    if (error) return { ok: false, erro: error.message, faltaMigracao: error.code === "42P01" };
    celulas = ((data ?? []) as Celula[]).map((c) => ({
      ...c,
      categoria: c.categoria as Categoria,
      medido: n(c.medido),
      faturado: n(c.faturado),
    }));
  }

  return { ok: true, clientes, cliente, periodos, serie, periodo, regioes, celulas };
}
