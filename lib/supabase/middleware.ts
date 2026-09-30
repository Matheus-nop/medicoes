import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { urlDoSupabase } from "./url";
import { dominioDoCookie } from "./cookies";
import { CABECALHO_USUARIO } from "./cabecalho";
import { ehPublica, paraOndeMandar } from "@/lib/medicoes/porta";
import { papelLido } from "@/lib/medicoes/papeis";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    urlDoSupabase(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // O projeto é compartilhado: `public` é do Roteiros, `estoque` do
      // Estoque. Sem isto o `meu_papel()` lá embaixo iria procurar em `public`.
      db: { schema: "medicoes" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, ...dominioDoCookie() }),
          );
        },
      },
    },
  );

  const path = request.nextUrl.pathname;
  const publico = ehPublica(path);

  // AS DUAS PERGUNTAS SAEM JUNTAS.
  //
  // O proxy roda em TODA navegação, antes de a página começar a ser desenhada,
  // e fazia duas viagens ao Supabase em fila: "quem é você" no servidor de
  // auth e depois "qual é o seu papel" no banco. Uma esperava a outra à toa —
  // `meu_papel()` lê o `auth.uid()` do próprio token e não precisa do
  // resultado da primeira. Em fila custavam duas idas; juntas custam uma, e
  // essa ida é a primeira coisa que acontece em cada tela aberta.
  //
  // `catch` vazio de propósito: se a rota for pública ou o usuário não estiver
  // logado, esta promessa é descartada sem ninguém esperar por ela.
  const papelEmParalelo = publico
    ? null
    : Promise.resolve(supabase.rpc("meu_papel")).catch(() => ({
        data: null,
        error: { code: "", message: "falhou em paralelo" },
      }));

  // IMPORTANTE: nao rode codigo entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !publico) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Ja logado nao precisa ver a tela de login.
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Guarda por papel, em TODA rota protegida: quem tem login no grupo mas não
  // tem perfil daqui vai para `/sem-acesso`, e só a diretoria entra em
  // `/usuarios`. A decisão mora em `lib/medicoes/porta.ts`, com teste.
  if (user && !publico) {
    let { data, error } = (await papelEmParalelo) ?? { data: null, error: null };
    // A pergunta em paralelo pode ter saído com o token velho, que o
    // `getUser()` acabou de renovar: pergunta de novo, em fila.
    if (error) ({ data, error } = await supabase.rpc("meu_papel"));

    const destino = paraOndeMandar(error ? null : papelLido(data), path);
    if (destino) {
      const url = request.nextUrl.clone();
      url.pathname = destino;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Repassa o usuário já validado para as páginas, que assim não precisam
  // perguntar de novo ao servidor de auth. Ver lib/supabase/cabecalho.ts.
  //
  // `delete` antes do `set`, sempre: se o cabeçalho vier de fora, ele morre
  // aqui. Sem isso qualquer pessoa poderia mandar um id e ser acreditada.
  const cabecalhos = new Headers(request.headers);
  cabecalhos.delete(CABECALHO_USUARIO);
  if (user) cabecalhos.set(CABECALHO_USUARIO, user.id);

  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  // Os cookies que o Supabase pediu para gravar (renovação de token) estão na
  // resposta que o `setAll` montou; sem copiá-los a sessão não se renova.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    resposta.cookies.set(cookie);
  }
  return resposta;
}
