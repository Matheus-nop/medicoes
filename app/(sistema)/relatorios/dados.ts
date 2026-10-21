import { createClient } from "@/lib/supabase/server";
import type { ItemDoBoletim } from "@/lib/medicoes/medicoes";
import {
  dadosLidos,
  grafiasDaOm,
  leituraDaMedicao,
  MOMENTOS,
  omDigitada,
  relatorioNovo,
  type DadosDoRelatorio,
  type DoEstoque,
  type LeituraDaOm,
  type MomentoDaFoto,
} from "@/lib/medicoes/relatorio";

export interface BoletimDaOm {
  id: number;
  numero: string;
  cliente: string;
  base: string | null;
  contato: string | null;
}

export interface CargaDoRelatorio {
  /** A OM como o boletim a escreve (com os zeros); a digitada quando não está em boletim. */
  om: string;
  /** O que se lê: a última versão gravada, ou o relatório novo preenchido pela OM. */
  dados: DadosDoRelatorio;
  gravado: { em: string; por: string; versoes: number } | null;
  item: ItemDoBoletim | null;
  boletim: BoletimDaOm | null;
  /** A foto de cada momento, assinada por uma hora (o bucket é privado). */
  urls: Record<MomentoDaFoto, string | null>;
  /** A 0021 ainda não rodou: dá para ver o relatório novo, não para gravar. */
  faltaMigracao: boolean;
  /** A OM como a medição a conhece — nula quando ela não está em boletim nenhum. */
  leitura: LeituraDaOm | null;
}

export type ItemDaMedicao = ItemDoBoletim & { boletim_id: number };

/**
 * A OM na medição: o item do boletim (pela OM com ou sem os zeros do Sisloc) e
 * o boletim dele. É de onde o relatório se preenche — a OM que se cobra.
 */
export async function acharNaMedicao(
  om: string,
): Promise<{ item: ItemDaMedicao | null; boletim: BoletimDaOm | null }> {
  const supabase = await createClient();
  const { data: itens } = await supabase.from("boletim_oms_atual").select("*").in("om", grafiasDaOm(om)).limit(1);
  const item = ((itens ?? [])[0] ?? null) as ItemDaMedicao | null;
  if (!item) return { item: null, boletim: null };
  const { data } = await supabase
    .from("boletins_atual")
    .select("id, numero, cliente, base, contato")
    .eq("id", item.boletim_id)
    .maybeSingle();
  return { item, boletim: (data as BoletimDaOm | null) ?? null };
}

/**
 * O relatório de uma OM: o gravado, ou o novo com o que o boletim, a OM e o
 * cadastro do Estoque já sabem. É a mesma leitura do formulário e do papel —
 * o que se preenche é o que sai.
 */
export async function carregarRelatorio(omCru: string): Promise<CargaDoRelatorio | null> {
  const digitada = omDigitada(decodeURIComponent(omCru));
  if (!digitada) return null;
  const grafias = grafiasDaOm(digitada);
  const supabase = await createClient();

  const [gravado, { item, boletim }] = await Promise.all([
    supabase.from("relatorios_de_manutencao_atuais").select("*").in("om", grafias).limit(1).maybeSingle(),
    acharNaMedicao(digitada),
  ]);

  const om = (gravado.data?.om as string | undefined) ?? item?.om ?? digitada;
  const faltaMigracao = Boolean(gravado.error);

  let dados: DadosDoRelatorio;
  if (gravado.data?.dados) {
    dados = dadosLidos(gravado.data.dados);
  } else {
    // O modelo da máquina vem do cadastro do Estoque (0021). Sem a função, o
    // relatório nasce sem ele — a orçamentista digita.
    let estoque: DoEstoque | null = null;
    if (item?.patrimonio) {
      const { data } = await supabase.rpc("equipamentos_do_estoque", { p_patrimonios: [item.patrimonio] });
      estoque = ((data ?? []) as DoEstoque[])[0] ?? null;
    }
    dados = relatorioNovo(item, boletim, estoque);
  }

  const urls: Record<MomentoDaFoto, string | null> = { retirada: null, manutencao: null, entrega: null };
  const caminhos = MOMENTOS.map((m) => dados.fotos[m]).filter((c): c is string => Boolean(c));
  if (caminhos.length) {
    const { data } = await supabase.storage.from("medicoes-relatorios").createSignedUrls(caminhos, 3600);
    const url = new Map((data ?? []).map((u) => [u.path, u.signedUrl]));
    for (const m of MOMENTOS) {
      const c = dados.fotos[m];
      urls[m] = c ? (url.get(c) ?? null) : null;
    }
  }

  return {
    om,
    dados,
    gravado: gravado.data?.gravado_em
      ? {
          em: gravado.data.gravado_em as string,
          por: (gravado.data.gravado_por_nome as string) ?? "sem nome",
          versoes: (gravado.data.versoes as number) ?? 1,
        }
      : null,
    item,
    boletim,
    urls,
    faltaMigracao,
    leitura: item ? leituraDaMedicao(item, boletim) : null,
  };
}
