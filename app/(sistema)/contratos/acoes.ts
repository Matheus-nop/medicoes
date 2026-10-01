"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lerNumero } from "@/lib/medicoes/controle";
import { INDICES, TIPOS_DE_ADITIVO, type Indice, type TipoDeAditivo } from "@/lib/medicoes/contratos";
import { quemLanca } from "@/lib/medicoes/papeis";

export interface Resultado {
  ok: boolean;
  erro?: string;
  id?: number;
}

/** O que a tela manda: tudo texto, como foi digitado. */
export interface CamposDoContrato {
  numero: string;
  cliente: string;
  objeto: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  valor: string;
  categorias: string[];
  indice: string;
  dataBase: string;
  avisoDias: string;
  contato: string;
  email: string;
  observacao: string;
}

export interface CamposDoAditivo {
  tipo: string;
  data: string;
  numero: string;
  novaVigenciaFim: string;
  valorDelta: string;
  percentual: string;
  descricao: string;
}

function recado(erro: { code?: string; message: string }, oQue: string): string {
  if (erro.code === "23505") return "Já existe um contrato com esse número para este cliente.";
  if (erro.code === "23514") return "Confira as datas: o fim da vigência não pode vir antes do início.";
  if (erro.code === "42501") return `Seu usuário não pode ${oQue}: quem lança contrato é ${quemLanca("contrato")}.`;
  if (erro.code === "42P01") return "Falta aplicar a migração 0013_contratos.sql no Supabase.";
  return `Não foi possível ${oQue}: ${erro.message}`;
}

const data = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null);
const texto = (v: string) => v.trim().replace(/\s+/g, " ") || null;

function refazer(id?: number) {
  revalidatePath("/contratos");
  if (id) revalidatePath(`/contratos/${id}`);
  revalidatePath("/clientes/ficha");
  // O contador do menu mora no layout.
  revalidatePath("/", "layout");
}

/** Cadastra (sem id) ou corrige o contrato. O que MUDA o contrato é aditivo. */
export async function salvarContrato(id: number | null, c: CamposDoContrato): Promise<Resultado> {
  if (!c.numero.trim() || !c.cliente.trim()) return { ok: false, erro: "Diga o número e o cliente." };
  const inicio = data(c.vigenciaInicio);
  const fim = data(c.vigenciaFim);
  if (!inicio || !fim) return { ok: false, erro: "Diga o início e o fim da vigência." };
  if (fim < inicio) return { ok: false, erro: "O fim da vigência vem antes do início." };
  const valor = c.valor.trim() ? lerNumero(c.valor) : null;
  if (c.valor.trim() && (valor === null || valor < 0)) return { ok: false, erro: `Valor que não se lê: "${c.valor}".` };
  const aviso = c.avisoDias.trim() ? Number(c.avisoDias) : 90;
  if (!Number.isInteger(aviso) || aviso < 0 || aviso > 365) {
    return { ok: false, erro: "O aviso é em dias, de 0 a 365." };
  }
  const indice = INDICES.includes(c.indice as Indice) ? c.indice : null;
  const categorias = c.categorias.filter((x) => ["manutencao", "locacao", "indenizacao"].includes(x));

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const campos = {
    numero: c.numero.trim().toUpperCase(),
    cliente: c.cliente.trim().replace(/\s+/g, " "),
    objeto: texto(c.objeto),
    vigencia_inicio: inicio,
    vigencia_fim: fim,
    valor,
    // As três marcadas é o mesmo que nenhuma: o contrato cobre tudo.
    categorias: categorias.length === 0 || categorias.length === 3 ? null : categorias,
    indice,
    data_base: data(c.dataBase),
    aviso_dias: aviso,
    contato: texto(c.contato),
    email: texto(c.email.toLowerCase()),
    observacao: c.observacao.trim() || null,
  };
  if (id) {
    const { data: feito, error } = await supabase.from("contratos").update(campos).eq("id", id).select("id");
    if (error) return { ok: false, erro: recado(error, "corrigir o contrato") };
    if (!feito?.length) return { ok: false, erro: recado({ code: "42501", message: "" }, "corrigir o contrato") };
    refazer(id);
    return { ok: true, id };
  }
  const { data: novo, error } = await supabase
    .from("contratos")
    .insert({ ...campos, criado_por: auth.user.id })
    .select("id")
    .single();
  if (error) return { ok: false, erro: recado(error, "cadastrar o contrato") };
  refazer(novo.id);
  return { ok: true, id: novo.id };
}

/** Registra um aditivo. Não se edita: o lançado por engano a diretoria apaga. */
export async function registrarAditivo(contratoId: number, a: CamposDoAditivo): Promise<Resultado> {
  if (!TIPOS_DE_ADITIVO.includes(a.tipo as TipoDeAditivo)) return { ok: false, erro: "Escolha o tipo do aditivo." };
  const tipo = a.tipo as TipoDeAditivo;
  const quando = data(a.data);
  if (!quando) return { ok: false, erro: "Diga a data do aditivo." };
  const novaVigencia = data(a.novaVigenciaFim);
  if (tipo === "prorrogacao" && !novaVigencia) return { ok: false, erro: "Diga até quando vai a nova vigência." };
  const delta = a.valorDelta.trim() ? lerNumero(a.valorDelta) : null;
  if (a.valorDelta.trim() && delta === null) return { ok: false, erro: `Valor que não se lê: "${a.valorDelta}".` };
  const pct = a.percentual.trim() ? lerNumero(a.percentual.replace("%", "")) : null;
  if (a.percentual.trim() && pct === null) return { ok: false, erro: `Percentual que não se lê: "${a.percentual}".` };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await supabase.from("contrato_aditivos").insert({
    contrato_id: contratoId,
    tipo,
    data: quando,
    numero: texto(a.numero),
    nova_vigencia_fim: novaVigencia,
    valor_delta: delta,
    // Digita-se "4,52" e guarda-se 0,0452.
    percentual: pct === null ? null : pct / 100,
    descricao: a.descricao.trim() || null,
    quem: auth.user.id,
  });
  if (error) return { ok: false, erro: recado(error, "registrar o aditivo") };
  refazer(contratoId);
  return { ok: true };
}

export async function apagarAditivo(contratoId: number, id: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data: feito, error } = await supabase.from("contrato_aditivos").delete().eq("id", id).select("id");
  if (error) return { ok: false, erro: recado(error, "apagar o aditivo") };
  if (!feito?.length) return { ok: false, erro: "Só a diretoria apaga aditivo." };
  refazer(contratoId);
  return { ok: true };
}

export async function apagarContrato(id: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data: feito, error } = await supabase.from("contratos").delete().eq("id", id).select("id");
  if (error) return { ok: false, erro: recado(error, "apagar o contrato") };
  if (!feito?.length) return { ok: false, erro: "Só a diretoria apaga contrato." };
  refazer();
  return { ok: true };
}
