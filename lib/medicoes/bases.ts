// O cadastro de bases: os dados que se repetem todo mês no papel de cada base
// — responsável, e-mail, telefone, local da obra, observação, modelo — e o
// próximo Documento Nº. O boletim novo nasce com eles.

import { chaveDoDestino, modeloDoCliente, type ModeloDoPapel } from "./medicoes.ts";

export interface Base {
  id: number;
  cliente: string;
  nome: string;
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  local_obra: string | null;
  observacao: string | null;
  modelo: ModeloDoPapel | null;
  atualizado_em?: string;
}

/** A base do cadastro para este cliente e base — pela chave, não pela grafia. */
export function acharBase<T extends Pick<Base, "cliente" | "nome">>(
  bases: T[],
  cliente: string,
  base: string | null | undefined,
): T | null {
  if (!base?.trim()) return null;
  const alvo = chaveDoDestino(cliente, base);
  return bases.find((b) => chaveDoDestino(b.cliente, b.nome) === alvo) ?? null;
}

/**
 * O próximo Documento Nº da base: o maior número que ela já usou, mais um,
 * com dois dígitos ("08" → "09"). Base sem boletim começa em "01". Documento
 * que não é número (o "BM-0007 - AGOSTO/2026" da casa) não conta.
 */
export function proximoDocumento(
  boletins: { cliente: string; base: string | null; documento: string | null }[],
  cliente: string,
  base: string | null | undefined,
): string {
  const alvo = chaveDoDestino(cliente, base);
  const usados = boletins
    .filter((b) => chaveDoDestino(b.cliente, b.base) === alvo)
    .map((b) => (b.documento ?? "").trim())
    .filter((d) => /^\d{1,4}$/.test(d))
    .map(Number);
  const proximo = (usados.length ? Math.max(...usados) : 0) + 1;
  return String(proximo).padStart(2, "0");
}

export interface DadosDaBase {
  contato: string | null;
  email: string | null;
  telefone: string | null;
  local_obra: string | null;
  observacao: string | null;
  modelo: ModeloDoPapel;
}

/**
 * Os dados do boletim novo: o cadastro da base manda; no que ele não diz, vale
 * o último boletim da mesma base; e o modelo, na falta dos dois, sai do nome
 * do cliente.
 */
export function dadosDoBoletimNovo(
  cliente: string,
  base: Partial<Base> | null,
  anterior: Partial<DadosDaBase> | null,
): DadosDaBase {
  const um = <T>(a: T | null | undefined, b: T | null | undefined) =>
    (typeof a === "string" ? a.trim() || null : a) ?? (typeof b === "string" ? b.trim() || null : b) ?? null;
  return {
    contato: um(base?.responsavel, anterior?.contato),
    email: um(base?.email, anterior?.email),
    telefone: um(base?.telefone, anterior?.telefone),
    local_obra: um(base?.local_obra, anterior?.local_obra),
    observacao: um(base?.observacao, anterior?.observacao),
    modelo: base?.modelo ?? anterior?.modelo ?? modeloDoCliente(cliente),
  };
}
