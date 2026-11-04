"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { acharBase, type Base } from "@/lib/medicoes/bases";
import {
  boletinsDoPdf,
  lerBoletimDeLocacao,
  omsNoTexto,
  sugestaoDaBase,
  type BoletimDeLocacao,
} from "@/lib/medicoes/locacao";
import { documentoDoBoletim } from "@/lib/medicoes/medicoes";
import { linhasDoPdf } from "@/lib/medicoes/pdf";
import { quemLanca } from "@/lib/medicoes/papeis";

export interface Resultado {
  ok: boolean;
  erro?: string;
  id?: number;
}

function recado(erro: { code?: string; message: string }, oQue: string): string {
  if (erro.code === "42501") return `Seu usuário não pode ${oQue}: quem lança a locação é ${quemLanca("locacao")}.`;
  if (erro.code === "42P01" || /locacao_/.test(erro.message)) {
    return "Falta aplicar a migração 0023_medicao_de_locacao.sql no Supabase.";
  }
  return `Não foi possível ${oQue}: ${erro.message}`;
}

/** Um PDF lido, ainda sem gravar: a tela mostra e confere antes. */
export type PdfLido = { arquivo: string } & ({ ok: true; boletim: BoletimDeLocacao } | { ok: false; erro: string });

/** Lê um PDF do Sisloc. Não grava nada. */
export async function lerPdf(dados: FormData): Promise<PdfLido> {
  const arquivo = dados.get("pdf");
  if (!(arquivo instanceof File)) return { arquivo: "", ok: false, erro: "Nenhum arquivo." };
  try {
    const linhas = await linhasDoPdf(new Uint8Array(await arquivo.arrayBuffer()));
    return { arquivo: arquivo.name, ...lerBoletimDeLocacao(linhas) };
  } catch (e) {
    return { arquivo: arquivo.name, ok: false, erro: `Não deu para abrir o PDF: ${(e as Error).message}` };
  }
}

const mesDe = (d: string) => `${d.slice(0, 7)}-01`;

/**
 * Grava os boletins lidos na medição do mês do período deles (abre a medição
 * se ainda não existe, com o cabeçalho da anterior). A base se acha no
 * cadastro pelo nome (e pelos outros nomes dela); a que não está entra, com o
 * que o nome já diz. O boletim que já estava (mesmo código do Sisloc) é
 * trocado pelo novo.
 */
export async function gravarBoletins(
  cliente: string,
  lidos: { arquivo: string; boletim: BoletimDeLocacao }[],
): Promise<Resultado & { medicoes?: number[] }> {
  if (!cliente.trim()) return { ok: false, erro: "Escolha o cliente da medição." };
  if (lidos.length === 0) return { ok: false, erro: "Nenhum boletim para gravar." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { data: bases, error: eb } = await supabase.from("bases").select("*");
  if (eb) return { ok: false, erro: recado(eb, "ler o cadastro de bases") };
  const cadastro = (bases ?? []) as Base[];

  const medicoes = new Map<string, number>();
  const medicaoDoMes = async (mes: string): Promise<number | string> => {
    if (medicoes.has(mes)) return medicoes.get(mes)!;
    const { data: achada, error } = await supabase
      .from("locacao_medicoes")
      .select("id, cliente")
      .eq("mes", mes);
    if (error) return recado(error, "abrir a medição");
    const dele = (achada ?? []).find((m) => m.cliente.trim().toUpperCase() === cliente.trim().toUpperCase());
    if (dele) {
      medicoes.set(mes, dele.id);
      return dele.id;
    }
    // O cabeçalho da medição anterior do cliente vem junto: muda pouco.
    const { data: anterior } = await supabase
      .from("locacao_medicoes")
      .select("contratante, obra, contrato_juridico, contrato_sistemico, superintendencia")
      .eq("cliente", cliente.trim())
      .lt("mes", mes)
      .order("mes", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: nova, error: en } = await supabase
      .from("locacao_medicoes")
      .insert({ cliente: cliente.trim(), mes, criado_por: auth.user!.id, ...(anterior ?? {}) })
      .select("id")
      .single();
    if (en) return recado(en, "abrir a medição");
    medicoes.set(mes, nova.id);
    return nova.id;
  };

  for (const { arquivo, boletim: b } of lidos) {
    const medicaoId = await medicaoDoMes(mesDe(b.periodo_inicio));
    if (typeof medicaoId === "string") return { ok: false, erro: medicaoId };

    let base = acharBase(cadastro, cliente, b.base);
    if (!base) {
      const s = sugestaoDaBase(b.base);
      const { data: criada, error } = await supabase
        .from("bases")
        .insert({
          cliente: cliente.trim(),
          nome: b.base,
          local_obra: b.entrega.slice(b.base.length).replace(/^\s*-\s*/, "") || null,
          projeto: s.projeto,
          municipio: s.municipio,
          superintendencia: s.superintendencia,
          bloco: s.bloco,
          atualizado_por: auth.user.id,
        })
        .select("*")
        .single();
      if (error) return { ok: false, erro: recado(error, `cadastrar a base ${b.base}`) };
      base = criada as Base;
      cadastro.push(base);
    }

    if (b.cod_docto) {
      const { error } = await supabase
        .from("locacao_boletins")
        .delete()
        .eq("medicao_id", medicaoId)
        .eq("cod_docto", b.cod_docto);
      if (error) return { ok: false, erro: recado(error, "trocar o boletim que já estava") };
    }
    const { data: bol, error: e1 } = await supabase
      .from("locacao_boletins")
      .insert({
        medicao_id: medicaoId,
        base_id: base.id,
        base_nome: b.base,
        entrega: b.entrega,
        cliente_sisloc: b.cliente || null,
        cod_docto: b.cod_docto,
        fichas: b.fichas,
        periodo_inicio: b.periodo_inicio,
        periodo_fim: b.periodo_fim,
        total_sisloc: b.total_sisloc,
        arquivo,
        importado_por: auth.user.id,
      })
      .select("id")
      .single();
    if (e1) return { ok: false, erro: recado(e1, `gravar o boletim de ${b.base}`) };
    const { error: e2 } = await supabase.from("locacao_itens").insert(
      b.itens.map((i, ordem) => ({ boletim_id: bol.id, ordem, ...i })),
    );
    if (e2) {
      await supabase.from("locacao_boletins").delete().eq("id", bol.id);
      return { ok: false, erro: recado(e2, `gravar as linhas de ${b.base}`) };
    }
  }

  revalidatePath("/locacao", "layout");
  revalidatePath("/bases");
  return { ok: true, medicoes: [...medicoes.values()] };
}

/** O cabeçalho da planilha da AEGEA. */
export interface CabecalhoDaMedicao {
  contratante: string;
  obra: string;
  contratoJuridico: string;
  contratoSistemico: string;
  superintendencia: string;
  observacao: string;
}

export async function salvarCabecalho(id: number, c: CabecalhoDaMedicao): Promise<Resultado> {
  const t = (v: string) => v.trim().replace(/\s+/g, " ") || null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locacao_medicoes")
    .update({
      contratante: t(c.contratante),
      obra: t(c.obra),
      contrato_juridico: t(c.contratoJuridico),
      contrato_sistemico: t(c.contratoSistemico),
      superintendencia: t(c.superintendencia),
      observacao: c.observacao.trim() || null,
    })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "salvar o cabeçalho") };
  if (!data?.length) return { ok: false, erro: recado({ code: "42501", message: "" }, "salvar o cabeçalho") };
  revalidatePath(`/locacao/${id}`);
  return { ok: true };
}

/** Tira um boletim da medição (o importado errado). Reimportar o certo é o mesmo que trocar. */
export async function tirarBoletim(medicaoId: number, boletimId: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("locacao_boletins").delete().eq("id", boletimId).select("id");
  if (error) return { ok: false, erro: recado(error, "tirar o boletim") };
  if (!data?.length) return { ok: false, erro: recado({ code: "42501", message: "" }, "tirar o boletim") };
  revalidatePath(`/locacao/${medicaoId}`);
  revalidatePath("/locacao");
  return { ok: true };
}

/** O coordenador de uma linha, quando não é o da base. Vazio volta ao da base. */
export async function trocarCoordenador(medicaoId: number, itemIds: number[], coordenador: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("locacao_itens")
    .update({ coordenador: coordenador.trim() || null })
    .in("id", itemIds);
  if (error) return { ok: false, erro: recado(error, "trocar o coordenador") };
  revalidatePath(`/locacao/${medicaoId}`);
  return { ok: true };
}

/* ── Os BMs de manutenção (0024) ─────────────────────────── */

/** Um BM que o PDF mostrou, para a tela conferir antes de incluir. */
export interface BmLido {
  boletim_id: number;
  documento: string;
  base: string | null;
  referencia: string | null;
  situacao: string;
  oms: number;
  achadas: number;
  valor: number;
}

export type PdfDeBm = { arquivo: string } & ({ ok: true; bms: BmLido[] } | { ok: false; erro: string });

/**
 * Lê o PDF de um BM de manutenção gerado aqui (o papel de um boletim, ou o
 * "PDF de todos"): acha as OMs impressas e devolve os boletins delas. Não
 * grava nada; as linhas vêm do boletim, e não do PDF.
 */
export async function lerBmDoPdf(dados: FormData): Promise<PdfDeBm> {
  const arquivo = dados.get("pdf");
  if (!(arquivo instanceof File)) return { arquivo: "", ok: false, erro: "Nenhum arquivo." };
  let candidatas: string[];
  try {
    candidatas = omsNoTexto(await linhasDoPdf(new Uint8Array(await arquivo.arrayBuffer())));
  } catch (e) {
    return { arquivo: arquivo.name, ok: false, erro: `Não deu para abrir o PDF: ${(e as Error).message}` };
  }
  if (candidatas.length === 0) return { arquivo: arquivo.name, ok: false, erro: "Nenhuma OM no PDF." };

  const supabase = await createClient();
  const achadas: { boletim_id: number; om: string }[] = [];
  for (let i = 0; i < candidatas.length; i += 150) {
    const { data, error } = await supabase.from("boletim_oms").select("boletim_id, om").in("om", candidatas.slice(i, i + 150));
    if (error) return { arquivo: arquivo.name, ok: false, erro: error.message };
    achadas.push(...((data ?? []) as { boletim_id: number; om: string }[]));
  }
  const ids = [...new Set(achadas.map((o) => o.boletim_id))];
  if (ids.length === 0) {
    return { arquivo: arquivo.name, ok: false, erro: "As OMs deste PDF não estão em nenhum boletim do sistema. É um BM gerado aqui?" };
  }
  const { data: todas, error: et } = await supabase.from("boletim_oms").select("boletim_id, om").in("boletim_id", ids);
  if (et) return { arquivo: arquivo.name, ok: false, erro: et.message };
  const deles = boletinsDoPdf(candidatas, (todas ?? []) as { boletim_id: number; om: string }[]);
  if (deles.length === 0) {
    return { arquivo: arquivo.name, ok: false, erro: "O PDF tem OMs soltas de vários boletins, mas nenhum BM inteiro." };
  }
  const { data: info, error: ei } = await supabase
    .from("boletins_atual")
    .select("id, numero, referencia, documento, base, situacao, valor")
    .in("id", deles.map((d) => d.boletim_id));
  if (ei) return { arquivo: arquivo.name, ok: false, erro: ei.message };
  const porId = new Map(((info ?? []) as { id: number; numero: string; referencia: string | null; documento: string | null; base: string | null; situacao: string; valor: unknown }[]).map((b) => [b.id, b]));
  return {
    arquivo: arquivo.name,
    ok: true,
    bms: deles.flatMap((d) => {
      const b = porId.get(d.boletim_id);
      if (!b) return [];
      return [
        {
          boletim_id: d.boletim_id,
          documento: documentoDoBoletim(b),
          base: b.base,
          referencia: b.referencia,
          situacao: b.situacao,
          oms: d.total,
          achadas: d.achadas,
          valor: Number(b.valor ?? 0),
        },
      ];
    }),
  };
}

/** Inclui os BMs na medição. O que já estava não duplica. */
export async function incluirBms(medicaoId: number, bms: { boletim_id: number; arquivo: string }[]): Promise<Resultado> {
  if (bms.length === 0) return { ok: false, erro: "Nenhum BM para incluir." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await supabase.from("locacao_manutencoes").upsert(
    bms.map((b) => ({ medicao_id: medicaoId, boletim_id: b.boletim_id, arquivo: b.arquivo, incluido_por: auth.user!.id })),
    { onConflict: "medicao_id,boletim_id", ignoreDuplicates: true },
  );
  if (error) {
    if (error.code === "42P01" || /locacao_manutencoes/.test(error.message)) {
      return { ok: false, erro: "Falta aplicar a migração 0024_manutencao_na_locacao.sql no Supabase." };
    }
    return { ok: false, erro: recado(error, "incluir os BMs") };
  }
  revalidatePath(`/locacao/${medicaoId}`);
  return { ok: true };
}

export async function tirarBm(medicaoId: number, boletimId: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locacao_manutencoes")
    .delete()
    .eq("medicao_id", medicaoId)
    .eq("boletim_id", boletimId)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "tirar o BM") };
  if (!data?.length) return { ok: false, erro: recado({ code: "42501", message: "" }, "tirar o BM") };
  revalidatePath(`/locacao/${medicaoId}`);
  return { ok: true };
}
