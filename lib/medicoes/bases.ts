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
  /** A regional do controle onde a base fica — Norte, VCG… (0015). */
  regional?: string | null;
  /** Os outros nomes com que a base aparece na colagem do Sisloc (0017). */
  apelidos?: string[] | null;
  atualizado_em?: string;
}

/**
 * As regionais dos boletins, na ordem das regiões do controle, com quantos
 * boletins cada uma tem. O boletim cuja base não tem regional no cadastro
 * conta em "" (sem regional), que vem por último.
 */
export function regionaisDosBoletins(
  boletins: { cliente: string; base: string | null }[],
  bases: Pick<Base, "cliente" | "nome" | "regional">[],
  ordem: string[] = [],
): { regional: string; boletins: number }[] {
  const conta = new Map<string, number>();
  for (const b of boletins) {
    const r = regionalDoBoletim(b, bases);
    conta.set(r, (conta.get(r) ?? 0) + 1);
  }
  const posicao = (r: string) => {
    const i = ordem.findIndex((o) => o.toUpperCase() === r.toUpperCase());
    return r === "" ? 1e6 : i < 0 ? 1e5 : i;
  };
  return [...conta.entries()]
    .sort((a, b) => posicao(a[0]) - posicao(b[0]) || a[0].localeCompare(b[0]))
    .map(([regional, n]) => ({ regional, boletins: n }));
}

/** A regional do boletim, pela base dele no cadastro. "" quando não tem. */
export function regionalDoBoletim(
  b: { cliente: string; base: string | null },
  bases: Pick<Base, "cliente" | "nome" | "regional">[],
): string {
  return acharBase(bases, b.cliente, b.base)?.regional?.trim() ?? "";
}

/**
 * A base do cadastro para este cliente e base — pela chave, não pela grafia,
 * e pelo nome ou por qualquer um dos outros nomes dela ("BASE LESTE- MARICÁ"
 * acha a "LESTE - MARICÁ" depois que alguém disse que são a mesma).
 */
export function acharBase<T extends Pick<Base, "cliente" | "nome"> & { apelidos?: string[] | null }>(
  bases: T[],
  cliente: string,
  base: string | null | undefined,
): T | null {
  if (!base?.trim()) return null;
  const alvo = chaveDoDestino(cliente, base);
  return (
    bases.find((b) => chaveDoDestino(b.cliente, b.nome) === alvo) ??
    bases.find((b) => (b.apelidos ?? []).some((a) => chaveDoDestino(b.cliente, a) === alvo)) ??
    null
  );
}

/** As bases do cadastro de um cliente, em ordem — a lista para escolher a base certa. */
export function basesDoCliente<T extends Pick<Base, "cliente" | "nome">>(bases: T[], cliente: string): T[] {
  const k = chaveDoDestino(cliente, "");
  return bases
    .filter((b) => chaveDoDestino(b.cliente, "") === k)
    .sort((a, b) => a.nome.localeCompare(b.nome));
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
