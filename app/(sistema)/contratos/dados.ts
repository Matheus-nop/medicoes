import { createClient } from "@/lib/supabase/server";
import { contratoLido, type ContratoAtual } from "@/lib/medicoes/contratos";
import { chaveDoCliente } from "@/lib/medicoes/medicoes";

export type CargaDosContratos =
  | { ok: true; contratos: ContratoAtual[]; clientes: string[] }
  | { ok: false; erro: string; faltaMigracao: boolean };

/**
 * Os contratos de hoje, e os nomes de cliente que a casa já usa — o do
 * controle primeiro, porque é por ele que o medido entra no contrato.
 */
export async function carregarContratos(): Promise<CargaDosContratos> {
  const supabase = await createClient();
  const [contratos, regioes, boletins] = await Promise.all([
    supabase.from("contratos_atual").select("*").order("vigencia_atual"),
    supabase.from("controle_regioes").select("cliente"),
    supabase.from("boletins").select("cliente"),
  ]);
  if (contratos.error) {
    return { ok: false, erro: contratos.error.message, faltaMigracao: contratos.error.code === "42P01" };
  }
  const nomes = new Map<string, string>();
  for (const r of [...(regioes.data ?? []), ...(boletins.data ?? [])] as { cliente: string }[]) {
    const k = chaveDoCliente(r.cliente);
    if (!nomes.has(k)) nomes.set(k, r.cliente);
  }
  return {
    ok: true,
    contratos: (contratos.data ?? []).map((c) => contratoLido(c as Record<string, unknown>)),
    clientes: [...nomes.values()].sort((a, b) => a.localeCompare(b)),
  };
}
