import { createClient } from "@/lib/supabase/server";
import {
  dataDaOm,
  situacaoLida,
  type BoletimAtual,
  type FonteDoValor,
  type ItemDoBoletim,
} from "@/lib/medicoes/medicoes";

export interface Andamento {
  id: number;
  situacao: string;
  em: string;
  observacao: string | null;
  quem_nome: string | null;
}

export type Carga =
  | { ok: true; boletim: BoletimAtual; itens: ItemDoBoletim[]; andamentos: Andamento[] }
  | { ok: false; erro: string; faltaMigracao: boolean }
  | null;

/**
 * O boletim, as OMs dele e a história — o que a tela e o papel leem.
 *
 * Mora num lugar só porque o papel que vai ao cliente e a tela que a diretoria
 * confere não podem ler de fontes diferentes: se divergissem, o errado seria o
 * papel, que é justamente o que o cliente lê.
 */
export async function carregarBoletim(id: number): Promise<Carga> {
  const supabase = await createClient();

  const [boletim, itens, andamentos] = await Promise.all([
    supabase.from("boletins_atual").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("boletim_oms_atual")
      .select("*")
      .eq("boletim_id", id)
      // A ordem do papel: pela data da linha, que é a chegada ou a abertura.
      .order("aberta_em", { ascending: true, nullsFirst: false })
      .order("om"),
    supabase
      .from("boletim_andamentos")
      .select("id, situacao, em, observacao, quem")
      .eq("boletim_id", id)
      .order("id", { ascending: false }),
  ]);

  const falha = boletim.error ?? itens.error ?? andamentos.error;
  if (falha) return { ok: false, erro: falha.message, faltaMigracao: falha.code === "42P01" };
  if (!boletim.data) return null;

  // O andamento aponta para `auth.users`, não para `perfis`: o PostgREST não
  // embute, e o nome vem numa leitura à parte.
  const brutos = (andamentos.data ?? []) as {
    id: number;
    situacao: string;
    em: string;
    observacao: string | null;
    quem: string;
  }[];
  const ids = [...new Set(brutos.map((a) => a.quem))];
  const { data: perfis } = ids.length
    ? await supabase.from("perfis").select("id, nome").in("id", ids)
    : { data: [] };
  const nome = new Map((perfis ?? []).map((p: { id: string; nome: string }) => [p.id, p.nome]));

  const b = boletim.data as BoletimAtual;
  return {
    ok: true,
    boletim: {
      ...b,
      situacao: situacaoLida(b.situacao),
      valor: Number(b.valor),
      custo: b.custo === null ? null : Number(b.custo),
    },
    // A ordem do papel é a da DATA que ele mostra — a chegada, ou a abertura
    // quando não há chegada. Digitada ou corrigida, a linha vai para o lugar dela.
    itens: ordenarPelaData(
      ((itens.data ?? []) as (ItemDoBoletim & { fonte: string })[]).map((i) => ({
        ...i,
        valor: Number(i.valor),
        custo: i.custo === null ? null : Number(i.custo),
        fonte: i.fonte as FonteDoValor,
      })),
    ),
    andamentos: brutos.map((a) => ({
      id: a.id,
      situacao: a.situacao,
      em: a.em,
      observacao: a.observacao,
      quem_nome: nome.get(a.quem) ?? null,
    })),
  };
}

function ordenarPelaData(itens: ItemDoBoletim[]): ItemDoBoletim[] {
  const quando = (i: ItemDoBoletim) => {
    const d = dataDaOm(i);
    return d ? new Date(d).getTime() : Number.POSITIVE_INFINITY;
  };
  return [...itens].sort((a, b) => quando(a) - quando(b) || a.om.localeCompare(b.om));
}
