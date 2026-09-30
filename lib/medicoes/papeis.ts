// Os papéis, sem servidor junto — para uma tela poder escrever "Financeiro"
// num selo sem arrastar `next/headers` para dentro do navegador.

/**
 * Os papéis de medições. Ver `supabase/migrations/0001_perfis.sql`.
 *
 * Hoje só dois atos são restritos, os dois à diretoria: reabrir boletim e dar
 * acesso. O resto é de qualquer usuário ativo — apertar mais é decisão do time.
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
