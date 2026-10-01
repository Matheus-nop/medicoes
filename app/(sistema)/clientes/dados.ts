import { createClient } from "@/lib/supabase/server";
import {
  fichasDosClientes,
  posicaoPorCliente,
  type FichaDoCliente,
  type Vinculo,
} from "@/lib/medicoes/arquivo";
import { situacaoLida, type BoletimAtual } from "@/lib/medicoes/medicoes";

export type CargaDosClientes =
  | { ok: true; fichas: FichaDoCliente[]; boletins: BoletimAtual[]; vinculos: Vinculo[] }
  | { ok: false; erro: string };

/** Todos os clientes: os boletins (orçamento) e a posição do controle (faturamento). */
export async function carregarClientes(): Promise<CargaDosClientes> {
  const supabase = await createClient();
  const [boletins, periodos, vinculos] = await Promise.all([
    supabase.from("boletins_atual").select("*").order("id", { ascending: false }),
    supabase
      .from("controle_mes")
      .select("cliente, periodo_id, rotulo, mes, saldo_anterior, medido, faturado, saldo, acompanha, a_receber"),
    // Os nomes juntados (0012). Sem ela, cada nome é a sua ficha, como antes.
    supabase.from("vinculos_de_cliente").select("id, nome, cliente"),
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
  const juntos = vinculos.error ? [] : ((vinculos.data ?? []) as Vinculo[]);
  return { ok: true, fichas: fichasDosClientes(lista, posicoes, juntos), boletins: lista, vinculos: juntos };
}
