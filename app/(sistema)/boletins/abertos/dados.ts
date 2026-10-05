import type { createClient } from "@/lib/supabase/server";
import {
  mesEmLancamento,
  pendenciasDoAberto,
  resumirOms,
  type BoletimAberto,
  type OmsDoAberto,
  type Pendencia,
} from "@/lib/medicoes/abertos";
import type { Base } from "@/lib/medicoes/bases";

type Cliente = Awaited<ReturnType<typeof createClient>>;

export interface AbertosLidos {
  abertos: (BoletimAberto & { pendencias: Pendencia[] })[];
  oms: Map<number, OmsDoAberto>;
  bases: Base[];
  mesCorrente: number;
  erro: { message: string; code?: string } | null;
}

/**
 * Os boletins abertos com o que cada um pede. A tela dos abertos e o contador
 * do menu leem daqui, para os dois dizerem o mesmo número.
 */
export async function lerAbertos(supabase: Cliente, hoje = new Date()): Promise<AbertosLidos> {
  const [boletins, bases] = await Promise.all([
    supabase
      .from("boletins_atual")
      .select("id, numero, cliente, base, referencia, documento, contato, oms, valor, primeira_om, ultima_om, criado_em")
      .eq("situacao", "aberto"),
    // Sem a 0010 não há cadastro: a tela segue, só sem regional.
    supabase.from("bases").select("*"),
  ]);
  if (boletins.error) {
    return { abertos: [], oms: new Map(), bases: [], mesCorrente: 0, erro: boletins.error };
  }
  const lista = ((boletins.data ?? []) as BoletimAberto[]).map((b) => ({
    ...b,
    oms: Number(b.oms),
    valor: Number(b.valor),
  }));
  const ids = lista.map((b) => b.id);
  const linhas = ids.length
    ? await supabase.from("boletim_oms").select("boletim_id, incluido_em, valor").in("boletim_id", ids)
    : { data: [], error: null };
  const oms = resumirOms((linhas.data ?? []) as { boletim_id: number; incluido_em: string; valor: number }[]);
  const cadastro = bases.error ? [] : ((bases.data ?? []) as Base[]);
  const mesCorrente = mesEmLancamento(lista);
  return {
    abertos: lista.map((b) => ({
      ...b,
      pendencias: pendenciasDoAberto(b, { abertos: lista, bases: cadastro, mesCorrente, oms: oms.get(b.id), hoje }),
    })),
    oms,
    bases: cadastro,
    mesCorrente,
    erro: null,
  };
}
