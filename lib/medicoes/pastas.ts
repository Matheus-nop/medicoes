// A pasta da base: os boletins de um cliente numa base, do aberto ao mais
// antigo. É o mini arquivo dentro do cliente — a base é o que se procura, e o
// boletim vem dentro dela. Nada se grava: sai dos boletins e do cadastro.

import { acharBase, type Base } from "./bases.ts";
import { ordemDaReferencia } from "./arquivo.ts";
import { chaveDoDestino, type BoletimAtual } from "./medicoes.ts";

type Cadastro = Pick<Base, "cliente" | "nome" | "regional" | "apelidos">;

/**
 * A chave da pasta: a da base do cadastro quando o nome (ou um dos outros
 * nomes dela) bate — "BASE LESTE- MARICÁ" cai na pasta da "LESTE - MARICÁ" —
 * e a do próprio nome quando a base não está no cadastro.
 */
export function chaveDaPasta(b: { cliente: string; base: string | null }, bases: Cadastro[]): string {
  const c = acharBase(bases, b.cliente, b.base);
  return c ? chaveDoDestino(c.cliente, c.nome) : chaveDoDestino(b.cliente, b.base?.trim() || "Sem base");
}

export interface PastaDaBase {
  chave: string;
  /** O nome do cadastro; fora dele, o do boletim mais novo. */
  nome: string;
  cliente: string;
  regional: string;
  /** Os abertos primeiro; depois do mês mais novo ao mais antigo. */
  boletins: BoletimAtual[];
  abertos: number;
  oms: number;
  emMedicao: number;
  medido: number;
  faturado: number;
  saldo: number;
}

/** A ordem de dentro da pasta: aberto antes, e o mês e o número mais novos primeiro. */
export function ordemDaPasta(a: BoletimAtual, b: BoletimAtual): number {
  return (
    Number(b.situacao === "aberto") - Number(a.situacao === "aberto") ||
    ordemDaReferencia(b.referencia) - ordemDaReferencia(a.referencia) ||
    (b.documento ?? "").localeCompare(a.documento ?? "", undefined, { numeric: true }) ||
    b.id - a.id
  );
}

/** As pastas de uma lista de boletins: uma por base, em ordem de nome — é como se procura. */
export function pastasPorBase(boletins: BoletimAtual[], bases: Cadastro[]): PastaDaBase[] {
  const mapa = new Map<string, PastaDaBase>();
  for (const b of boletins) {
    const chave = chaveDaPasta(b, bases);
    const cadastro = acharBase(bases, b.cliente, b.base);
    const p = mapa.get(chave) ?? {
      chave,
      nome: cadastro?.nome ?? (b.base?.trim() || "Sem base"),
      cliente: cadastro?.cliente ?? b.cliente,
      regional: cadastro?.regional?.trim() ?? "",
      boletins: [],
      abertos: 0,
      oms: 0,
      emMedicao: 0,
      medido: 0,
      faturado: 0,
      saldo: 0,
    };
    const v = Number(b.valor) || 0;
    p.boletins.push(b);
    p.oms += b.oms;
    if (b.situacao === "aberto") {
      p.abertos += 1;
      p.emMedicao += v;
    } else {
      p.medido += v;
      p.faturado += b.situacao === "faturado" ? v : Number(b.faturado) || 0;
    }
    p.saldo = p.medido - p.faturado;
    mapa.set(chave, p);
  }
  return [...mapa.values()]
    .map((p) => {
      const boletins = p.boletins.sort(ordemDaPasta);
      // Fora do cadastro, a pasta tem o nome do boletim mais novo.
      return acharBase(bases, p.cliente, p.nome) ? { ...p, boletins } : { ...p, boletins, nome: boletins[0].base?.trim() || p.nome };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
