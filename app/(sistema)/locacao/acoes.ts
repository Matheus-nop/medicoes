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
  if (erro.code === "23505" && /locacao_uma_medicao/.test(erro.message)) {
    return `Não dá para ${oQue}: já existe uma medição desta superintendência no mês.`;
  }
  if (/em_medicao_aberta/.test(erro.message)) return `Não dá para ${oQue}: a medição está fechada. A diretoria reabre.`;
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
const chave = (t: string | null | undefined) => (t ?? "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

/** Para onde vão os boletins: uma medição aberta, ou a do cliente e da superintendência no mês de cada um. */
export type DestinoDosBoletins = { medicaoId: number } | { cliente: string; superintendencia: string };

type MedicaoDoDestino = { id: number; cliente: string; mes: string; superintendencia: string | null; fechada_em: string | null };

/**
 * Grava os boletins lidos. Na tela de uma medição, vão para ela — e só os do
 * mês dela. Na lista, vão para a medição do cliente e da superintendência no
 * mês do período de cada um (abre a medição se ainda não existe, com o
 * cabeçalho da anterior da mesma superintendência). Medição fechada não recebe.
 * A base se acha no cadastro pelo nome (e pelos outros nomes dela); a que não
 * está entra, com o que o nome já diz. O boletim que já estava (mesmo código
 * do Sisloc) em qualquer medição do cliente no mês é trocado pelo novo — é
 * assim que o boletim importado na superintendência errada muda de medição.
 */
export async function gravarBoletins(
  destino: DestinoDosBoletins,
  lidos: { arquivo: string; boletim: BoletimDeLocacao }[],
): Promise<Resultado & { medicoes?: number[] }> {
  if (lidos.length === 0) return { ok: false, erro: "Nenhum boletim para gravar." };
  if ("cliente" in destino) {
    if (!destino.cliente.trim()) return { ok: false, erro: "Escolha o cliente da medição." };
    if (!destino.superintendencia.trim()) {
      return { ok: false, erro: "Diga a superintendência da medição (GRANDE DIÂMETRO, VCG, BAIXADA 1…): cada uma é uma medição." };
    }
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { data: bases, error: eb } = await supabase.from("bases").select("*");
  if (eb) return { ok: false, erro: recado(eb, "ler o cadastro de bases") };
  const cadastro = (bases ?? []) as Base[];

  const campos = "id, cliente, mes, superintendencia, fechada_em";
  let fixa: MedicaoDoDestino | null = null;
  if ("medicaoId" in destino) {
    const { data, error } = await supabase.from("locacao_medicoes").select(campos).eq("id", destino.medicaoId).maybeSingle();
    if (error) return { ok: false, erro: recado(error, "abrir a medição") };
    if (!data) return { ok: false, erro: "Medição não encontrada." };
    fixa = data as MedicaoDoDestino;
    const outroMes = lidos.find((l) => mesDe(l.boletim.periodo_inicio) !== fixa!.mes);
    if (outroMes) {
      return {
        ok: false,
        erro: `O boletim de ${outroMes.boletim.base} é de outro mês (${outroMes.boletim.periodo_inicio.split("-").reverse().join("/")}). Importe-o pela lista de medições.`,
      };
    }
  }
  const cliente = fixa ? fixa.cliente : (destino as { cliente: string }).cliente.trim();
  const superintendencia = fixa ? fixa.superintendencia : (destino as { superintendencia: string }).superintendencia.trim().toUpperCase();
  const nomeDa = (m: Pick<MedicaoDoDestino, "mes" | "superintendencia">) =>
    `${m.superintendencia ?? "sem superintendência"} de ${m.mes.slice(5, 7)}/${m.mes.slice(0, 4)}`;

  // As medições do cliente no mês: a do destino, e as outras, de onde o
  // boletim reimportado sai.
  const doMes = new Map<string, MedicaoDoDestino[]>();
  const medicoesDoMes = async (mes: string): Promise<MedicaoDoDestino[] | string> => {
    if (doMes.has(mes)) return doMes.get(mes)!;
    const { data, error } = await supabase.from("locacao_medicoes").select(campos).eq("mes", mes);
    if (error) return recado(error, "abrir a medição");
    const delas = ((data ?? []) as MedicaoDoDestino[]).filter((m) => chave(m.cliente) === chave(cliente));
    doMes.set(mes, delas);
    return delas;
  };

  const medicoes = new Map<string, number>();
  const medicaoDoMes = async (mes: string): Promise<number | string> => {
    if (fixa) {
      if (fixa.fechada_em) return `A medição ${nomeDa(fixa)} está fechada: reabra para importar.`;
      return fixa.id;
    }
    if (medicoes.has(mes)) return medicoes.get(mes)!;
    const delas = await medicoesDoMes(mes);
    if (typeof delas === "string") return delas;
    const dela = delas.find((m) => chave(m.superintendencia) === chave(superintendencia));
    if (dela) {
      if (dela.fechada_em) return `A medição ${nomeDa(dela)} está fechada: reabra para importar.`;
      medicoes.set(mes, dela.id);
      return dela.id;
    }
    // O cabeçalho vem da medição anterior da mesma superintendência (ou, na
    // primeira dela, da anterior do cliente): muda pouco.
    const { data: antes } = await supabase
      .from("locacao_medicoes")
      .select("cliente, contratante, obra, contrato_juridico, contrato_sistemico, superintendencia")
      .lt("mes", mes)
      .order("mes", { ascending: false })
      .limit(60);
    const doCliente = ((antes ?? []) as Record<string, string | null>[]).filter((m) => chave(m.cliente) === chave(cliente));
    const modelo = doCliente.find((m) => chave(m.superintendencia) === chave(superintendencia)) ?? doCliente[0];
    const cabecalho = modelo
      ? { contratante: modelo.contratante, obra: modelo.obra, contrato_juridico: modelo.contrato_juridico, contrato_sistemico: modelo.contrato_sistemico }
      : {};
    const { data: nova, error: en } = await supabase
      .from("locacao_medicoes")
      .insert({ cliente, mes, superintendencia, criado_por: auth.user!.id, ...cabecalho })
      .select(campos)
      .single();
    if (en) return recado(en, "abrir a medição");
    delas.push(nova as MedicaoDoDestino);
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
      // O mesmo boletim em qualquer medição do cliente no mês sai: na desta
      // superintendência é a troca; na de outra, é ele mudando de medição.
      const delas = await medicoesDoMes(mesDe(b.periodo_inicio));
      if (typeof delas === "string") return { ok: false, erro: delas };
      const ids = [...new Set([medicaoId, ...delas.map((m) => m.id)])];
      const { data: estava, error: ee } = await supabase
        .from("locacao_boletins")
        .select("id, medicao_id")
        .in("medicao_id", ids)
        .eq("cod_docto", b.cod_docto);
      if (ee) return { ok: false, erro: recado(ee, "procurar o boletim que já estava") };
      for (const x of (estava ?? []) as { id: number; medicao_id: number }[]) {
        const onde = delas.find((m) => m.id === x.medicao_id);
        if (onde?.fechada_em) {
          return { ok: false, erro: `O boletim de ${b.base} (cód. ${b.cod_docto}) já está na medição ${nomeDa(onde)}, que está fechada.` };
        }
        const { data: saiu, error } = await supabase.from("locacao_boletins").delete().eq("id", x.id).select("id");
        if (error) return { ok: false, erro: recado(error, "trocar o boletim que já estava") };
        if (!saiu?.length) return { ok: false, erro: recado({ code: "42501", message: "" }, "trocar o boletim que já estava") };
      }
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

/**
 * Fecha a medição: daí em diante nenhum boletim do Sisloc nem BM de
 * manutenção entra ou sai, e o cabeçalho fica. Reabrir é só da diretoria —
 * a RLS (0025) confere; a tela só esconde o botão.
 */
export async function fecharMedicao(id: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { data, error } = await supabase
    .from("locacao_medicoes")
    .update({ fechada_em: new Date().toISOString(), fechada_por: auth.user.id })
    .eq("id", id)
    .is("fechada_em", null)
    .select("id");
  if (error) return { ok: false, erro: recadoDaFechada(error, "fechar a medição") };
  if (!data?.length) return { ok: false, erro: "A medição já estava fechada, ou seu usuário não pode fechá-la." };
  revalidatePath(`/locacao/${id}`);
  revalidatePath("/locacao");
  return { ok: true };
}

export async function reabrirMedicao(id: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locacao_medicoes")
    .update({ fechada_em: null, fechada_por: null })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, erro: recadoDaFechada(error, "reabrir a medição") };
  if (!data?.length) return { ok: false, erro: "Só a diretoria reabre medição fechada." };
  revalidatePath(`/locacao/${id}`);
  revalidatePath("/locacao");
  return { ok: true };
}

function recadoDaFechada(erro: { code?: string; message: string }, oQue: string): string {
  if (/fechada_em|fechada_por/.test(erro.message)) return "Falta aplicar a migração 0025_locacao_por_superintendencia.sql no Supabase.";
  return recado(erro, oQue);
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
  if (!data?.length) return { ok: false, erro: "Não deu para salvar o cabeçalho: a medição está fechada, ou seu usuário não pode mexer nela." };
  revalidatePath(`/locacao/${id}`);
  return { ok: true };
}

/** Tira um boletim da medição (o importado errado). Reimportar o certo é o mesmo que trocar. */
export async function tirarBoletim(medicaoId: number, boletimId: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("locacao_boletins").delete().eq("id", boletimId).select("id");
  if (error) return { ok: false, erro: recado(error, "tirar o boletim") };
  if (!data?.length) return { ok: false, erro: "Não deu para tirar o boletim: a medição está fechada, ou seu usuário não pode mexer nela." };
  revalidatePath(`/locacao/${medicaoId}`);
  revalidatePath("/locacao");
  return { ok: true };
}

/** O coordenador de uma linha, quando não é o da base. Vazio volta ao da base. */
export async function trocarCoordenador(medicaoId: number, itemIds: number[], coordenador: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locacao_itens")
    .update({ coordenador: coordenador.trim() || null })
    .in("id", itemIds)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "trocar o coordenador") };
  if (!data?.length) return { ok: false, erro: "Não deu para trocar o coordenador: a medição está fechada, ou seu usuário não pode mexer nela." };
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
  type OmDoBm = { boletim_id: number; om: string; om_retirada: string | null; recibo_entrega: string | null };
  const colunas = "boletim_id, om, om_retirada, recibo_entrega";
  const achadas: OmDoBm[] = [];
  for (let i = 0; i < candidatas.length; i += 150) {
    const { data, error } = await supabase.from("boletim_oms").select(colunas).in("om", candidatas.slice(i, i + 150));
    if (error) return { arquivo: arquivo.name, ok: false, erro: error.message };
    achadas.push(...((data ?? []) as OmDoBm[]));
  }
  const ids = [...new Set(achadas.map((o) => o.boletim_id))];
  if (ids.length === 0) {
    return { arquivo: arquivo.name, ok: false, erro: "As OMs deste PDF não estão em nenhum boletim do sistema. É um BM gerado aqui?" };
  }
  const { data: todas, error: et } = await supabase.from("boletim_oms").select(colunas).in("boletim_id", ids);
  if (et) return { arquivo: arquivo.name, ok: false, erro: et.message };
  const deles = boletinsDoPdf(candidatas, (todas ?? []) as OmDoBm[]);
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
  // O mesmo BM em duas medições seria cobrado duas vezes: a do VCG e a do
  // Grande Diâmetro do mesmo mês não dividem boletim.
  const { data: emOutra } = await supabase
    .from("locacao_manutencoes")
    .select("boletim_id, medicao_id")
    .in("boletim_id", bms.map((b) => b.boletim_id))
    .neq("medicao_id", medicaoId);
  if (emOutra?.length) {
    const ids = [...new Set((emOutra as { medicao_id: number }[]).map((x) => x.medicao_id))];
    const { data: outras } = await supabase.from("locacao_medicoes").select("id, mes, superintendencia").in("id", ids);
    const nomes = ((outras ?? []) as { mes: string; superintendencia: string | null }[])
      .map((m) => `${m.superintendencia ?? "sem superintendência"} de ${m.mes.slice(5, 7)}/${m.mes.slice(0, 4)}`)
      .join(", ");
    return {
      ok: false,
      erro: `${emOutra.length} BM(s) deste PDF já estão em outra medição (${nomes}). Tire de lá antes, ou deixe de fora daqui.`,
    };
  }
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
  if (!data?.length) return { ok: false, erro: "Não deu para tirar o BM: a medição está fechada, ou seu usuário não pode mexer nela." };
  revalidatePath(`/locacao/${medicaoId}`);
  return { ok: true };
}
