// Os papéis, sem servidor junto — para uma tela poder escrever "Financeiro"
// num selo sem arrastar `next/headers` para dentro do navegador.

/**
 * Os papéis de medições. Ver `supabase/migrations/0001_perfis.sql`.
 *
 * Cada time lança o que é seu (a `0011`); ler, todo mundo lê. A diretoria
 * lança tudo, e só ela reabre boletim e dá acesso.
 */
export type PapelReal = "diretoria" | "financeiro" | "faturamento" | "orcamento";

export const PAPEIS: PapelReal[] = ["diretoria", "financeiro", "faturamento", "orcamento"];

export const ROTULO_PAPEL: Record<PapelReal, string> = {
  diretoria: "Diretoria",
  financeiro: "Financeiro",
  faturamento: "Faturamento",
  orcamento: "Orçamento",
};

/**
 * O que veio do banco, quando pode ser qualquer coisa.
 *
 * Nulo quer dizer SEM ACESSO — sem perfil daqui, ou perfil desativado. Não
 * existe papel "padrão": quem tem login no Estoque ou no Roteiros tem senha
 * que vale aqui, e virar usuário de medições por isso seria abrir o dinheiro
 * da casa para o galpão inteiro.
 */
export function papelLido(cru: unknown): PapelReal | null {
  return PAPEIS.includes(cru as PapelReal) ? (cru as PapelReal) : null;
}

/**
 * Quem lança o quê. A mesma regra está nas policies restritivas da `0011` —
 * aqui ela só decide se a tela mostra o botão ou o aviso.
 */
export const QUEM_LANCA = {
  /** O boletim de manutenção: colar do Sisloc, mexer na OM, fechar e enviar, e o cadastro de bases. */
  boletim: ["orcamento", "faturamento", "diretoria"],
  /** O controle das medições: abrir período, cadastrar região, lançar medido e faturado. */
  controle: ["faturamento", "diretoria"],
  /** O recebido e o início do acompanhamento. */
  recebimento: ["financeiro", "diretoria"],
  /** O contrato e os aditivos (a 0013). Apagar é só da diretoria. */
  contrato: ["faturamento", "diretoria"],
} as const satisfies Record<string, readonly PapelReal[]>;

export type Lancamento = keyof typeof QUEM_LANCA;

export function podeLancar(papel: PapelReal | null | undefined, o: Lancamento): boolean {
  return !!papel && (QUEM_LANCA[o] as readonly PapelReal[]).includes(papel);
}

/** "o faturamento e a diretoria" — para o aviso de quem não pode. */
export function quemLanca(o: Lancamento): string {
  const nomes = QUEM_LANCA[o].map((p) => `${p === "diretoria" ? "a" : "o"} ${ROTULO_PAPEL[p].toLowerCase()}`);
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}` : nomes[0];
}
