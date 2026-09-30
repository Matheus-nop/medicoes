import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: "proxy" substitui o antigo "middleware". Roda no runtime Node
// (nao no Edge), entao o cliente Supabase (@supabase/ssr) funciona aqui.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // `manifest.webmanifest` e `sw.js` ficam de fora: o navegador busca os dois
    // ANTES de qualquer login, e o proxy respondia com um 307 para /login. Sem
    // manifesto o Chrome nao considera o app instalavel, e registro de service
    // worker que cai em redirecionamento e erro fatal pela especificacao —
    // entao o convite de instalar nunca aparecia.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
