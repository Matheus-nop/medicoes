import { createBrowserClient } from "@supabase/ssr";
import { urlDoSupabase } from "@/lib/supabase/url";

// Cliente Supabase para componentes client ("use client").
// As tabelas daqui moram no schema `medicoes` — o projeto Supabase é
// compartilhado com o Roteiros (`public`) e o Estoque (`estoque`). Sem esta
// linha o PostgREST procura em `public` e devolve 404 em tudo.
export function createClient() {
  return createBrowserClient(
    urlDoSupabase(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "medicoes" } },
  );
}
