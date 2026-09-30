import "server-only";

import { createClient as criarCliente } from "@supabase/supabase-js";
import { urlDoSupabase } from "./url";

/**
 * Cliente com a service role: passa por cima da RLS.
 *
 * Existe para duas coisas que a chave anônima não faz, e que precisam ser
 * feitas por alguém: **criar usuário** e **definir senha de outra pessoa**.
 * Tudo o mais (papel, ativo) sai pelo cliente normal, sob a RLS — quem manda
 * ali é a política `diretoria_gere_perfis`.
 *
 * A chave nunca chega ao navegador: o nome não tem `NEXT_PUBLIC_`, o arquivo
 * é `server-only`, e quem chama são Server Actions que conferem o papel antes.
 * Se a variável não estiver configurada, a tela de usuários avisa em vez de
 * quebrar — o resto do sistema não depende disto.
 */
export function clienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return null;

  return criarCliente(urlDoSupabase(), chave, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "medicoes" },
  });
}
