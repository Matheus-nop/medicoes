import { createClient } from "@/lib/supabase/server";
import type { ItemDoBoletim } from "@/lib/medicoes/medicoes";
import {
  dadosLidos,
  grafiasDaOm,
  juntarLeituras,
  MOMENTOS,
  omDigitada,
  preencherComLeitura,
  relatorioNovo,
  type DadosDoRelatorio,
  type DoEstoque,
  type LeituraDaOm,
  type MomentoDaFoto,
  type OmNoEstoque,
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
  /** O que o Estoque sabe da OM (0022) — o que preencheu o relatório novo fora do boletim. */
  leitura: LeituraDaOm | null;
}

/**
 * A OM nos lugares do Estoque (acompanhamento, carteira, OS, orçamento), junta.
 * Sem a 0022, nada — e o relatório abre só com o boletim.
 */
export async function lerOmNoEstoque(om: string): Promise<LeituraDaOm | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("om_nos_outros_apps", { p_om: om });
  if (error) return null;
  return juntarLeituras((data ?? []) as OmNoEstoque[]);
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

  const [gravado, itens] = await Promise.all([
    supabase.from("relatorios_de_manutencao_atuais").select("*").in("om", grafias).limit(1).maybeSingle(),
    supabase.from("boletim_oms_atual").select("*").in("om", grafias).limit(1),
  ]);

  const item = ((itens.data ?? [])[0] ?? null) as (ItemDoBoletim & { boletim_id: number }) | null;
  let boletim: BoletimDaOm | null = null;
  if (item) {
    const { data } = await supabase
      .from("boletins_atual")
      .select("id, numero, cliente, base, contato")
      .eq("id", item.boletim_id)
      .maybeSingle();
    boletim = (data as BoletimDaOm | null) ?? null;
  }

  const om = (gravado.data?.om as string | undefined) ?? item?.om ?? digitada;
  const faltaMigracao = Boolean(gravado.error);

  let dados: DadosDoRelatorio;
  let leitura: LeituraDaOm | null = null;
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
    // O que o boletim não diz — ou a OM inteira, quando ela não está em
    // boletim nenhum — vem do Estoque. Só preenche o que ficou em branco.
    leitura = await lerOmNoEstoque(om);
    if (leitura) dados = preencherComLeitura(dados, leitura).dados;
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
    leitura,
  };
}
