// Por que "Invalid API key" nao serve como mensagem.
//
// A tela de usuarios e a unica coisa do sistema que usa a chave de servico. Ela
// so falava duas linguas: "falta a variavel" e o que o Supabase respondesse — e
// o que o Supabase responde e `Invalid API key`, tres palavras que cabem em
// quatro causas diferentes e nao apontam nenhuma.
//
// A causa que mais aconteceu aqui tem nome: a mudanca de projeto. O roteiro
// (`supabase/scripts/`) mandava trocar `NEXT_PUBLIC_SUPABASE_URL` e
// `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel e nao dizia uma palavra sobre a
// `SUPABASE_SERVICE_ROLE_KEY`. Quem seguiu o roteiro ficou com a chave do
// projeto ANTIGO apontada para a URL do novo. O sistema inteiro funciona — so
// criar usuario nao, porque so ela usa a chave.
//
// Da para descobrir isso sem ir a rede: a chave classica do Supabase e um JWT, e
// o `ref` do projeto vai escrito dentro dela. Comparar com a URL responde "essa
// chave e de outro projeto" antes de qualquer requisicao.

/** A conferencia nunca lanca: ela vira mensagem para quem esta na tela. */
export type DiagnosticoDaChave =
  | { ok: true; aviso?: string }
  | { ok: false; erro: string };

const ONDE =
  "Pegue em Supabase → Settings → API → Project API keys → service_role, " +
  "e ponha na Vercel em Settings → Environment Variables. Depois: Redeploy.";

/**
 * Qual deploy esta respondendo.
 *
 * Trocar a variavel na Vercel e continuar vendo o erro tem tres explicacoes
 * comuns, e todas sao sobre QUAL deploy esta no ar: nao houve redeploy, a
 * variavel foi salva em Preview e nao em Production, ou foi salva noutro
 * projeto. Nenhuma delas da para adivinhar de fora — mas o proprio deploy sabe
 * responder, e e de graca.
 */
export function esteDeploy(
  env: Record<string, string | undefined> = process.env,
): string {
  const ambiente = env.VERCEL_ENV;
  const commit = env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  if (!ambiente && !commit) return "";
  return (
    ` (este deploy: ${ambiente ?? "ambiente desconhecido"}` +
    `${commit ? `, commit ${commit}` : ""} — se a variável foi salva em outro ` +
    `ambiente ou não houve Redeploy, é este aqui que continua com o valor antigo)`
  );
}

/** `https://abcdefgh.supabase.co` → `abcdefgh`. */
export function projetoDaUrl(url: string): string | null {
  const m = /^https?:\/\/([a-z0-9-]+)\.supabase\.(co|in|red)/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
}

/** O miolo de um JWT, sem validar assinatura — so para ler `ref` e `role`. */
function miolo(
  chave: string,
): { ref?: string; role?: string; exp?: number; iat?: number } | null {
  const partes = chave.split(".");
  if (partes.length !== 3) return null;
  try {
    const cru = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const texto = Buffer.from(cru, "base64").toString("utf8");
    const dados = JSON.parse(texto) as Record<string, unknown>;
    return {
      ref: typeof dados.ref === "string" ? dados.ref : undefined,
      role: typeof dados.role === "string" ? dados.role : undefined,
      exp: typeof dados.exp === "number" ? dados.exp : undefined,
      iat: typeof dados.iat === "number" ? dados.iat : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * A chave de servico serve para esta URL?
 *
 * Responde antes de ir a rede, e com o nome do projeto de cada lado quando
 * discordam. `agora` entra por parametro para o teste poder envelhecer a chave.
 */
export function conferirChaveDeServico(
  url: string,
  chave: string | undefined | null,
  agora: Date = new Date(),
): DiagnosticoDaChave {
  const limpa = (chave ?? "").trim();
  if (!limpa) {
    return {
      ok: false,
      erro:
        "Falta a variável SUPABASE_SERVICE_ROLE_KEY na Vercel. Sem ela não dá " +
        `para criar usuário nem definir senha de outra pessoa. ${ONDE}`,
    };
  }

  // As chaves novas do Supabase nao sao JWT e nao carregam o projeto dentro.
  // Da para reconhecer o TIPO, que e o engano mais comum, e o resto fica com o
  // servidor.
  if (limpa.startsWith("sb_publishable_")) {
    return {
      ok: false,
      erro:
        "A SUPABASE_SERVICE_ROLE_KEY está com a chave PUBLICÁVEL " +
        `(sb_publishable_…), que não pode criar usuário. ${ONDE}`,
    };
  }
  if (limpa.startsWith("sb_secret_")) return { ok: true };

  const dentro = miolo(limpa);
  if (!dentro) {
    return {
      ok: false,
      erro:
        "A SUPABASE_SERVICE_ROLE_KEY não parece uma chave do Supabase — veio " +
        `cortada, com espaço ou com aspas em volta? ${ONDE}`,
    };
  }

  if (dentro.role && dentro.role !== "service_role") {
    return {
      ok: false,
      erro:
        `A SUPABASE_SERVICE_ROLE_KEY está com uma chave de "${dentro.role}", ` +
        `e criar usuário exige a service_role. ${ONDE}`,
    };
  }

  if (dentro.exp && dentro.exp * 1000 < agora.getTime()) {
    return {
      ok: false,
      erro: `A SUPABASE_SERVICE_ROLE_KEY expirou. ${ONDE}`,
    };
  }

  const daUrl = projetoDaUrl(url);
  if (daUrl && dentro.ref && dentro.ref !== daUrl) {
    // A data de emissão responde "a chave que estou servindo é a que você
    // acabou de colar?" sem mostrar a chave. Se ela é antiga, o valor novo não
    // chegou a este deploy — e aí o problema não é a chave, é onde ela foi
    // salva.
    const emitida = dentro.iat
      ? ` A chave em uso foi emitida em ${new Date(dentro.iat * 1000).toLocaleDateString("pt-BR")}.`
      : "";
    return {
      ok: false,
      erro:
        `A SUPABASE_SERVICE_ROLE_KEY é do projeto "${dentro.ref}", mas o app ` +
        `aponta para "${daUrl}" (NEXT_PUBLIC_SUPABASE_URL). É o que sobra de ` +
        `uma mudança de projeto: a URL e a chave anônima foram trocadas e ` +
        `esta não.${emitida} ${ONDE}${esteDeploy()}`,
    };
  }

  return { ok: true };
}

/**
 * Traduzir o que o Supabase responde, quando ele responde.
 *
 * A conferencia acima pega o caso do projeto trocado. Chave revogada, projeto
 * pausado ou chave classica desligada so aparecem na resposta — e "Invalid API
 * key" continua nao dizendo o que fazer.
 */
export function explicarErroDaChave(mensagem: string): string {
  if (/invalid api key|jwt|apikey/i.test(mensagem)) {
    return (
      `O Supabase recusou a chave ("${mensagem}"). A causa mais comum não é a ` +
      `chave: é a Vercel. Variável trocada só vale depois de um REDEPLOY — o ` +
      `deploy que está no ar continua carregando o valor antigo. Confira ` +
      `também se ela foi salva no ambiente Production (e não só em Preview). ` +
      `Se o redeploy não resolver, a chave pode ter sido revogada, o projeto ` +
      `pode estar pausado, ou as chaves clássicas podem ter sido desligadas ` +
      `nas configurações de API. ${ONDE}`
    );
  }
  return mensagem;
}
