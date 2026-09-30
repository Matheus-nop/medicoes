// Prova da conferencia da chave de servico. Roda com `npm test`.

import { ok, strictEqual as e } from "node:assert/strict";
import { test } from "node:test";
import {
  conferirChaveDeServico,
  esteDeploy,
  explicarErroDaChave,
  projetoDaUrl,
} from "./chave.ts";

/** Um JWT de mentira, com o miolo que o Supabase poe nas chaves classicas. */
function jwt(dados: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(dados)}.assinatura`;
}

const NOVO = "https://abcdefghijklmnop.supabase.co";
const daqui = (extra: Record<string, unknown> = {}) =>
  jwt({ iss: "supabase", ref: "abcdefghijklmnop", role: "service_role", ...extra });

test("o projeto sai da URL", () => {
  e(projetoDaUrl(NOVO), "abcdefghijklmnop");
  e(projetoDaUrl("  https://ABCDEF.supabase.co/  "), "abcdef");
  e(projetoDaUrl("https://meu-banco.example.com"), null);
});

test("a chave certa passa", () => {
  const r = conferirChaveDeServico(NOVO, daqui());
  e(r.ok, true);
});

test("chave sem variável diz onde pegar", () => {
  for (const vazia of [undefined, null, "", "   "]) {
    const r = conferirChaveDeServico(NOVO, vazia);
    e(r.ok, false);
    ok(!r.ok && /Falta a variável/.test(r.erro));
    ok(!r.ok && /service_role/.test(r.erro), "diz onde pegar");
  }
});

test("o deploy se identifica, para a próxima rodada não ser às cegas", () => {
  // Trocar a variável na Vercel e continuar vendo o mesmo erro tem três
  // explicações, e todas são sobre QUAL deploy está no ar. O deploy sabe
  // responder — e responde de graça.
  const texto = esteDeploy({
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_SHA: "abc1234def5678",
  });
  ok(texto.includes("production"));
  ok(texto.includes("abc1234"), "o commit vai curto");
  ok(!texto.includes("abc1234def5678"), "e não inteiro");

  // Fora da Vercel (local, teste) não inventa nada.
  e(esteDeploy({}), "");
});

test("a chave do projeto ANTIGO é o caso que aconteceu de verdade", () => {
  // A mudança de projeto trocou URL e chave anônima na Vercel e esqueceu esta.
  // O sistema inteiro funciona menos criar usuário, e o Supabase só responde
  // "Invalid API key" — três palavras que não apontam nada.
  const antiga = jwt({ ref: "zyxwvutsrqponmlk", role: "service_role" });
  const r = conferirChaveDeServico(NOVO, antiga);
  e(r.ok, false);
  ok(!r.ok && r.erro.includes("zyxwvutsrqponmlk"), "nomeia o projeto da chave");
  ok(!r.ok && r.erro.includes("abcdefghijklmnop"), "e o projeto da URL");

  // A data de emissão responde "a chave que está no ar é a que acabei de
  // colar?" — sem mostrar a chave.
  const datada = conferirChaveDeServico(
    NOVO,
    jwt({ ref: "zyxwvutsrqponmlk", role: "service_role",
          iat: Math.floor(new Date("2026-07-08T20:36:12Z").getTime() / 1000) }),
  );
  ok(!datada.ok && /emitida em 08\/07\/2026/.test(datada.erro), datada.ok ? "" : datada.erro);
});

test("a chave anônima no lugar da de serviço tem mensagem própria", () => {
  const anon = jwt({ ref: "abcdefghijklmnop", role: "anon" });
  const r = conferirChaveDeServico(NOVO, anon);
  e(r.ok, false);
  ok(!r.ok && /anon/.test(r.erro));
});

test("as chaves novas do Supabase: a publicável é recusada, a secreta passa", () => {
  const pub = conferirChaveDeServico(NOVO, "sb_publishable_abc123");
  e(pub.ok, false);
  ok(!pub.ok && /PUBLIC/i.test(pub.erro));

  // A secreta não carrega o projeto dentro: não dá para conferir daqui, e
  // inventar um erro seria pior do que deixar o servidor responder.
  e(conferirChaveDeServico(NOVO, "sb_secret_abc123").ok, true);
});

test("chave expirada e chave cortada têm cada uma a sua frase", () => {
  const agora = new Date("2026-09-17T12:00:00Z");
  const vencida = conferirChaveDeServico(
    NOVO,
    daqui({ exp: Math.floor(new Date("2026-09-01T00:00:00Z").getTime() / 1000) }),
    agora,
  );
  e(vencida.ok, false);
  ok(!vencida.ok && /expirou/.test(vencida.erro));

  // Colada pela metade, ou com aspas em volta — acontece.
  const cortada = conferirChaveDeServico(NOVO, "eyJhbGciOiJIUzI1NiIs");
  e(cortada.ok, false);
  ok(!cortada.ok && /não parece uma chave/.test(cortada.erro));
});

test("URL de outro domínio não inventa desencontro", () => {
  // Supabase auto-hospedado: o `ref` da chave não tem com o que ser comparado.
  e(conferirChaveDeServico("https://banco.novaopcao.com.br", daqui()).ok, true);
});

test("o que o Supabase responde vira instrução", () => {
  const texto = explicarErroDaChave("Invalid API key");
  // A causa mais comum vem PRIMEIRO: a variável foi trocada na Vercel e o
  // deploy no ar continua com o valor antigo. Aconteceu aqui: a chave estava
  // certa, respondia à API de administração, e a tela continuava recusando.
  ok(/REDEPLOY/.test(texto), "manda redeployar antes de duvidar da chave");
  ok(/Production/.test(texto), "e conferir o ambiente");
  ok(/revogada|pausado|clássicas/.test(texto));
  ok(/Settings → API/.test(texto));
  // O que não é sobre chave passa inteiro.
  e(explicarErroDaChave("Password should be at least 6 characters"),
    "Password should be at least 6 characters");
});
