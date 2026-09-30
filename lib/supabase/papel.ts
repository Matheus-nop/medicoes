import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CABECALHO_USUARIO } from "@/lib/supabase/cabecalho";

export { ROTULO_PAPEL, type PapelReal } from "@/lib/medicoes/papeis";

import { papelLido, type PapelReal as Real } from "@/lib/medicoes/papeis";

export type Papel = Real | null;

export interface Sessao {
  papel: Papel;
  nome: string | null;
  usuarioId: string | null;
}

// Quem está logado e qual o papel dele. Usado nas páginas para decidir o que
// mostrar. A RLS já limita os DADOS; isto limita a NAVEGAÇÃO.
export async function sessaoAtual(): Promise<Sessao> {
  try {
    const supabase = await createClient();

    // O proxy ja validou o token e deixou o id no cabecalho. Perguntar de novo
    // ao servidor de auth custa uma viagem de rede em TODA navegacao, antes de
    // a tela poder ser desenhada. O `getUser()` fica como reserva, para o caso
    // de alguma rota nao passar pelo proxy.
    const doProxy = (await headers()).get(CABECALHO_USUARIO);
    const id =
      doProxy ?? (await supabase.auth.getUser()).data.user?.id ?? null;
    if (!id) return { papel: null, nome: null, usuarioId: null };

    // O papel vem de `meu_papel()`, que não passa pela RLS e devolve nulo
    // para quem não tem perfil ativo daqui. O nome vem da tabela: se a leitura
    // falhar, fica sem nome — um selo vazio no topo, e não uma porta aberta.
    const [{ data: papelCru }, { data }] = await Promise.all([
      supabase.rpc("meu_papel"),
      supabase.from("perfis").select("nome").eq("id", id).maybeSingle(),
    ]);

    return { papel: papelLido(papelCru), nome: data?.nome ?? null, usuarioId: id };
  } catch {
    return { papel: null, nome: null, usuarioId: null };
  }
}
