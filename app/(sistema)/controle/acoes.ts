"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS, periodoDoMes, type Categoria } from "@/lib/medicoes/controle";

export interface Resultado {
  ok: boolean;
  erro?: string;
  periodoId?: number;
  lancadas?: number;
}

function recado(erro: { code?: string; message: string }, oQue: string): string {
  if (erro.code === "42501") return `Seu usuário não tem permissão para ${oQue}.`;
  if (erro.code === "42P01") return "Falta aplicar a migração 0005_controle.sql no Supabase.";
  return `Não foi possível ${oQue}: ${erro.message}`;
}

function refazer() {
  revalidatePath("/controle");
  revalidatePath("/controle/lancar");
}

/**
 * O período de um mês. Já existindo, devolve o que existe: dois cliques em
 * "abrir outubro" não fazem dois outubros.
 */
export async function abrirPeriodo(cliente: string, anoMes: string): Promise<Resultado> {
  const c = cliente.trim();
  const p = periodoDoMes(anoMes);
  if (!c) return { ok: false, erro: "Diga de que cliente é o controle." };
  if (!p) return { ok: false, erro: "Escolha o mês." };

  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("controle_periodos")
    .select("id")
    .eq("cliente", c)
    .eq("mes", p.mes)
    .maybeSingle();
  if (existente) return { ok: true, periodoId: existente.id as number };

  const { data, error } = await supabase
    .from("controle_periodos")
    .insert({ cliente: c, mes: p.mes, rotulo: p.rotulo })
    .select("id")
    .single();
  if (error) return { ok: false, erro: recado(error, "abrir o período") };
  refazer();
  return { ok: true, periodoId: data.id as number };
}

/** Uma região nova no controle do cliente — entra no fim da lista. */
export async function criarRegiao(cliente: string, nome: string): Promise<Resultado> {
  const c = cliente.trim();
  const n = nome.trim().toUpperCase().replace(/\s+/g, " ");
  if (!c || !n) return { ok: false, erro: "Diga o nome da região." };

  const supabase = await createClient();
  const { data: ultimas } = await supabase
    .from("controle_regioes")
    .select("ordem")
    .eq("cliente", c)
    .order("ordem", { ascending: false })
    .limit(1);
  const ordem = ((ultimas?.[0]?.ordem as number | undefined) ?? 0) + 1;

  const { error } = await supabase.from("controle_regioes").insert({ cliente: c, nome: n, ordem });
  if (error) {
    if (error.code === "23505") return { ok: false, erro: `A região ${n} já existe.` };
    return { ok: false, erro: recado(error, "criar a região") };
  }
  refazer();
  return { ok: true };
}

export interface CelulaLancada {
  regiaoId: number;
  categoria: Categoria;
  medido: number;
  faturado: number;
}

/**
 * Grava o que mudou na grade. Append-only: cada célula que mudou vira uma
 * linha nova, e a antiga fica na história. A tela manda só as que mudaram.
 */
export async function lancar(periodoId: number, celulas: CelulaLancada[]): Promise<Resultado> {
  const validas = celulas.filter(
    (c) =>
      CATEGORIAS.includes(c.categoria) &&
      Number.isFinite(c.medido) &&
      Number.isFinite(c.faturado),
  );
  if (validas.length === 0) return { ok: false, erro: "Nada mudou." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { error } = await supabase.from("controle_valores").insert(
    validas.map((c) => ({
      periodo_id: periodoId,
      regiao_id: c.regiaoId,
      categoria: c.categoria,
      medido: Math.round(c.medido * 100) / 100,
      faturado: Math.round(c.faturado * 100) / 100,
      quem: auth.user!.id,
    })),
  );
  if (error) return { ok: false, erro: recado(error, "lançar os valores") };
  refazer();
  return { ok: true, lancadas: validas.length };
}
