import type { PapelReal } from "./papeis.ts";

/** Rotas que não exigem login. */
export const ROTAS_PUBLICAS = ["/login", "/auth"];

/** Rotas de quem está logado mas não tem acesso — senão seria um laço. */
export const TELA_SEM_ACESSO = "/sem-acesso";

/** Rotas só da diretoria. */
export const ROTAS_DIRETORIA = ["/usuarios"];

function dentro(path: string, raiz: string): boolean {
  return path === raiz || path.startsWith(raiz + "/");
}

export function ehPublica(path: string): boolean {
  return ROTAS_PUBLICAS.some((r) => dentro(path, r));
}

/**
 * Para onde mandar esta conta, ou `null` quando ela pode ficar onde está.
 *
 * Papel nulo é SEM ACESSO, e não "operador por via das dúvidas" como no
 * Estoque: aqui o que está atrás da porta é dinheiro. Se a leitura do papel
 * falhar, a pessoa vê a tela de sem acesso e tenta de novo — e a RLS, que não
 * depende desta decisão, devolveria vazio de qualquer jeito.
 */
export function paraOndeMandar(papel: PapelReal | null, path: string): string | null {
  if (ehPublica(path)) return null;
  if (!papel) return dentro(path, TELA_SEM_ACESSO) ? null : TELA_SEM_ACESSO;
  if (dentro(path, TELA_SEM_ACESSO)) return "/";
  if (papel !== "diretoria" && ROTAS_DIRETORIA.some((r) => dentro(path, r))) return "/";
  return null;
}
