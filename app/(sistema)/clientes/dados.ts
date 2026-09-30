import { createClient } from "@/lib/supabase/server";
import { fichasDosClientes, posicaoPorCliente, type FichaDoCliente } from "@/lib/medicoes/arquivo";
import { situacaoLida, type BoletimAtual } from "@/lib/medicoes/medicoes";

export type CargaDosClientes =
  | { ok: true; fichas: FichaDoCliente[]; boletins: BoletimAtual[] }
  | { ok: false; erro: string };

/** Todos os clientes: os boletins (orçamento) e a posição do controle (faturamento). */
export async function carregarClientes(): Promise<CargaDosClientes> {
  const supabase = await createClient();
  const [boletins, periodos] = await Promise.all([
    supabase.from("boletins_atual").select("*").order("id", { ascending: false }),
    supabase
      .from("controle_mes")
      .select("cliente, periodo_id, rotulo, mes, saldo_anterior, medido, faturado, saldo"),
  ]);
  const falha = boletins.error ?? periodos.error;
  if (falha) return { ok: false, erro: falha.message };

  const lista = ((boletins.data ?? []) as BoletimAtual[]).map((b) => ({
    ...b,
    situacao: situacaoLida(b.situacao),
    valor: Number(b.valor),
    faturado: Number(b.faturado ?? 0),
    custo: b.custo === null ? null : Number(b.custo),
  }));
  const posicoes = posicaoPorCliente(
    (periodos.data ?? []) as Parameters<typeof posicaoPorCliente>[0],
  );
  return { ok: true, fichas: fichasDosClientes(lista, posicoes), boletins: lista };
}
