import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { urlDoSupabase } from "./url";
import { dominioDoCookie } from "./cookies";

// Cliente Supabase para Server Components, Route Handlers e Server Actions.
// A sessao vive no cookie; a RLS filtra tudo pelo usuario autenticado.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    urlDoSupabase(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Ver a nota em client.ts: `public` é do Roteiros, `estoque` do Estoque.
      db: { schema: "medicoes" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, ...dominioDoCookie() }),
            );
          } catch {
            // Chamado de um Server Component: ignorar. O proxy ja renova a sessao.
          }
        },
      },
    },
  );
}
