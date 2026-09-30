import "server-only";

/**
 * O domínio em que a sessão é gravada.
 *
 * Os dois sistemas do grupo dividem o mesmo `auth.users`, então a senha é a
 * mesma — mas cookie é por domínio, e sem isto a pessoa entraria duas vezes:
 * uma em `estoque.novaopcaoequipamentos.com.br` e outra em
 * `roteiros.novaopcaoequipamentos.com.br`.
 *
 * Gravando no domínio pai (`.novaopcaoequipamentos.com.br`), quem entra em um
 * já está no outro. O app de roteiros faz o mesmo, com o mesmo valor.
 *
 * Vazio (o padrão) mantém o comportamento normal — cookie preso ao host. É o
 * que vale em `localhost` e nos endereços de pré-visualização da Vercel, onde
 * um domínio pai não existe e forçá-lo faria o navegador descartar a sessão.
 */
export function dominioDoCookie() {
  const d = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  return d ? { domain: d } : {};
}
