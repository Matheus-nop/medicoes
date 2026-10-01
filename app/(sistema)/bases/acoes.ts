"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { modeloLido } from "@/lib/medicoes/medicoes";
import { quemLanca } from "@/lib/medicoes/papeis";

export interface Resultado {
  ok: boolean;
  erro?: string;
}

export interface CamposDaBase {
  cliente: string;
  nome: string;
  responsavel: string;
  email: string;
  telefone: string;
  localObra: string;
  observacao: string;
  /** Vazio: o papel do cliente. */
  modelo: string;
}

function recado(erro: { code?: string; message: string }, oQue: string): string {
  if (erro.code === "23505") return "Já existe essa base para este cliente (o nome é o mesmo, só escrito diferente).";
  if (erro.code === "42501") return `Seu usuário não tem permissão para ${oQue} — quem lança boletim e base é ${quemLanca("boletim")}.`;
  if (erro.code === "42P01") return "Falta aplicar a migração 0010_bases.sql no Supabase.";
  return `Não foi possível ${oQue}: ${erro.message}`;
}

/** Cria (sem id) ou atualiza a base. Não mexe em boletim nenhum. */
export async function salvarBase(id: number | null, c: CamposDaBase): Promise<Resultado> {
  const t = (v: string) => v.trim() || null;
  if (!c.cliente.trim() || !c.nome.trim()) return { ok: false, erro: "Diga o cliente e o nome da base." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const campos = {
    cliente: c.cliente.trim(),
    nome: c.nome.trim().replace(/\s+/g, " "),
    responsavel: t(c.responsavel),
    email: t(c.email.toLowerCase()),
    telefone: t(c.telefone),
    local_obra: t(c.localObra),
    observacao: t(c.observacao),
    modelo: c.modelo ? modeloLido(c.modelo) : null,
    atualizado_em: new Date().toISOString(),
    atualizado_por: auth.user?.id ?? null,
  };
  const { error } = id
    ? await supabase.from("bases").update(campos).eq("id", id)
    : await supabase.from("bases").insert(campos);
  if (error) return { ok: false, erro: recado(error, "salvar a base") };
  revalidatePath("/bases");
  return { ok: true };
}

export async function apagarBase(id: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bases").delete().eq("id", id).select("id");
  if (error) return { ok: false, erro: recado(error, "apagar a base") };
  if (!data?.length) return { ok: false, erro: "Só a diretoria apaga base." };
  revalidatePath("/bases");
  return { ok: true };
}
