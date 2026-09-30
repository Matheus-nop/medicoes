/**
 * O endereço do projeto Supabase, limpo.
 *
 * O painel mostra dois campos parecidos e vizinhos: **Project URL**
 * (`https://xxx.supabase.co`) e **RESTful endpoint**
 * (`https://xxx.supabase.co/rest/v1/`). O cliente precisa do primeiro — ele
 * monta `/auth/v1/token` e `/rest/v1/...` por conta própria.
 *
 * Com o segundo, tudo vira 404: o login chama `/rest/v1/auth/v1/token`, que não
 * existe. E o erro não se parece com configuração errada — o app diz "e-mail ou
 * senha incorretos", porque foi isso que o Supabase respondeu para uma URL que
 * não existe. Custou um dia de investigação uma vez; não custa duas.
 */
export function urlDoSupabase() {
  const bruta = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!bruta) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não está configurada. Na Vercel: Settings → " +
        "Environment Variables. O valor é o Project URL do Supabase.",
    );
  }

  let url: URL;
  try {
    url = new URL(bruta.trim());
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL não é um endereço válido: "${bruta}". ` +
        "Deve ser o Project URL, algo como https://xxxxx.supabase.co",
    );
  }

  // Só a origem interessa. `/rest/v1/`, `/auth/v1` ou barra sobrando somem aqui.
  return url.origin;
}
