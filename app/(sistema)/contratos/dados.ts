import { createClient } from "@/lib/supabase/server";
import {
  aditivoLido,
  contratoLido,
  contratoNoCiclo,
  hojeNaCasa,
  mesLido,
  type Aditivo,
  type ContratoAtual,
  type MesDoContrato,
} from "@/lib/medicoes/contratos";
import { chaveDoCliente } from "@/lib/medicoes/medicoes";

type Cliente = Awaited<ReturnType<typeof createClient>>;

export type CargaDosContratos =
  | {
      ok: true;
      contratos: ContratoAtual[];
      clientes: string[];
      /** As regionais do controle de cada cliente, pela chave do nome. */
      regionais: Record<string, string[]>;
      aditivos: Aditivo[];
      erroCiclos: string | null;
    }
  | { ok: false; erro: string; faltaMigracao: boolean };

/**
 * Os contratos com os ciclos montados (0018): o valor, o medido e o faturado
 * do ciclo de hoje, e a projeção. Sem a 0018, os contratos voltam como a view
 * os dá — a tela não quebra por causa dela, só fica sem ciclo.
 */
export async function contratosComCiclos(
  supabase: Cliente,
  crus: Record<string, unknown>[],
  hoje = hojeNaCasa(),
): Promise<{ contratos: ContratoAtual[]; aditivos: Aditivo[]; erroCiclos: string | null }> {
  const lidos = crus.map(contratoLido);
  if (lidos.length === 0) return { contratos: lidos, aditivos: [], erroCiclos: null };
  const ids = lidos.map((c) => c.id);
  const [aditivos, meses] = await Promise.all([
    supabase.from("contrato_aditivos").select("*").in("contrato_id", ids).order("data").order("id"),
    supabase.from("contrato_meses").select("*").in("contrato_id", ids),
  ]);
  const erro = aditivos.error ?? meses.error;
  if (erro) return { contratos: lidos, aditivos: [], erroCiclos: erro.message };
  const todos = (aditivos.data ?? []).map((a) => aditivoLido(a as Record<string, unknown>));
  const porContrato = new Map<number, MesDoContrato[]>();
  for (const m of (meses.data ?? []).map((x) => mesLido(x as Record<string, unknown>))) {
    porContrato.set(m.contrato_id, [...(porContrato.get(m.contrato_id) ?? []), m]);
  }
  return {
    contratos: lidos.map((c) =>
      contratoNoCiclo(
        c,
        todos.filter((a) => a.contrato_id === c.id),
        porContrato.get(c.id) ?? [],
        hoje,
      ),
    ),
    aditivos: todos,
    erroCiclos: null,
  };
}

/**
 * Os contratos de hoje, e os nomes de cliente que a casa já usa — o do
 * controle primeiro, porque é por ele que o medido entra no contrato.
 */
export async function carregarContratos(): Promise<CargaDosContratos> {
  const supabase = await createClient();
  const [contratos, regioes, boletins] = await Promise.all([
    supabase.from("contratos_atual").select("*").order("vigencia_atual"),
    supabase.from("controle_regioes").select("cliente, nome, ordem").order("ordem"),
    supabase.from("boletins").select("cliente"),
  ]);
  if (contratos.error) {
    return { ok: false, erro: contratos.error.message, faltaMigracao: contratos.error.code === "42P01" };
  }
  const nomes = new Map<string, string>();
  const regionais: Record<string, string[]> = {};
  for (const r of (regioes.data ?? []) as { cliente: string; nome: string }[]) {
    const k = chaveDoCliente(r.cliente);
    if (!nomes.has(k)) nomes.set(k, r.cliente);
    (regionais[k] ??= []).push(r.nome);
  }
  for (const r of (boletins.data ?? []) as { cliente: string }[]) {
    const k = chaveDoCliente(r.cliente);
    if (!nomes.has(k)) nomes.set(k, r.cliente);
  }
  const comCiclos = await contratosComCiclos(supabase, (contratos.data ?? []) as Record<string, unknown>[]);
  return {
    ok: true,
    ...comCiclos,
    clientes: [...nomes.values()].sort((a, b) => a.localeCompare(b)),
    regionais,
  };
}
