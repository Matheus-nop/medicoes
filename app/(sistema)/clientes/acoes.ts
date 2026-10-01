"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quemLanca } from "@/lib/medicoes/papeis";

export interface Resultado {
  ok: boolean;
  erro?: string;
}

function recado(erro: { code?: string; message: string }, oQue: string): string {
  if (erro.code === "23505") return "Esse nome já está juntado a um cliente. Separe primeiro.";
  if (erro.code === "23514") return "Um nome não se junta a ele mesmo.";
  if (erro.code === "42501") return `Seu usuário não pode ${oQue}: quem junta nomes é ${quemLanca("boletim")}.`;
  if (erro.code === "42P01") return "Falta aplicar a migração 0012_nomes_do_cliente.sql no Supabase.";
  return `Não foi possível ${oQue}: ${erro.message}`;
}

function refazer() {
  revalidatePath("/clientes");
  revalidatePath("/clientes/ficha");
  revalidatePath("/clientes/extrato");
}

/** "O nome X é o cliente Y": X passa a entrar na ficha de Y. O boletim não muda. */
export async function juntarNome(nome: string, cliente: string): Promise<Resultado> {
  if (!nome.trim() || !cliente.trim()) return { ok: false, erro: "Escolha o nome a juntar." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await supabase
    .from("vinculos_de_cliente")
    .insert({ nome: nome.trim(), cliente: cliente.trim(), quem: auth.user.id });
  if (error) return { ok: false, erro: recado(error, "juntar os nomes") };
  refazer();
  return { ok: true };
}

/** Desfaz o vínculo: o nome volta a ter a ficha dele. */
export async function separarNome(id: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vinculos_de_cliente").delete().eq("id", id).select("id");
  if (error) return { ok: false, erro: recado(error, "separar o nome") };
  // A RLS no delete não dá erro: devolve zero linhas.
  if (!data?.length) return { ok: false, erro: `Seu usuário não pode separar nomes: quem separa é ${quemLanca("boletim")}.` };
  refazer();
  return { ok: true };
}
