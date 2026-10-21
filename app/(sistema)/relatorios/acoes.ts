"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sessaoAtual } from "@/lib/supabase/papel";
import { podeLancar, quemLanca } from "@/lib/medicoes/papeis";
import { omDigitada, paraGravar, type DadosDoRelatorio } from "@/lib/medicoes/relatorio";

export interface Resultado {
  ok: boolean;
  erro?: string;
}

const FALTA_A_0021 = "Falta aplicar a 0021_o_relatorio_de_manutencao.sql no SQL Editor.";

function traduzir(mensagem: string): string {
  if (/relatorio/.test(mensagem) && /(does not exist|schema cache|Could not find)/.test(mensagem)) return FALTA_A_0021;
  if (/row-level security/.test(mensagem)) return `Só ${quemLanca("boletim")} gravam o relatório.`;
  return mensagem;
}

// Gravar é uma VERSÃO nova: a última manda, e as de antes ficam. O relatório
// da OM nasce no primeiro Gravar.
export async function gravarRelatorio(om: string, dados: DadosDoRelatorio): Promise<Resultado> {
  const numero = omDigitada(om);
  if (!numero) return { ok: false, erro: "OM inválida." };
  const sessao = await sessaoAtual();
  if (!podeLancar(sessao.papel, "boletim") || !sessao.usuarioId) {
    return { ok: false, erro: `Só ${quemLanca("boletim")} gravam o relatório.` };
  }
  const supabase = await createClient();

  const { data: achado, error: e1 } = await supabase
    .from("relatorios_de_manutencao")
    .select("id")
    .eq("om", om)
    .maybeSingle();
  if (e1) return { ok: false, erro: traduzir(e1.message) };

  let id = achado?.id as number | undefined;
  if (!id) {
    const { data: novo, error: e2 } = await supabase
      .from("relatorios_de_manutencao")
      .insert({ om, modelo: "aguas", criado_por: sessao.usuarioId })
      .select("id")
      .single();
    if (e2 || !novo) return { ok: false, erro: traduzir(e2?.message ?? "Não foi possível abrir o relatório.") };
    id = novo.id as number;
  }

  const { error: e3 } = await supabase
    .from("relatorio_de_manutencao_versoes")
    .insert({ relatorio_id: id, dados: paraGravar(dados), gravado_por: sessao.usuarioId });
  if (e3) return { ok: false, erro: traduzir(e3.message) };

  revalidatePath("/relatorios");
  revalidatePath(`/relatorios/om/${om}`);
  return { ok: true };
}
