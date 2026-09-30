import { createClient } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { sessaoAtual } from "@/lib/supabase/papel";
import { papelLido } from "@/lib/medicoes/papeis";
import { Usuarios, type Pessoa } from "./usuarios";

export const dynamic = "force-dynamic";

export default async function PaginaUsuarios() {
  const [sessao, supabase] = await Promise.all([sessaoAtual(), createClient()]);

  const { data: perfis, error } = await supabase
    .from("perfis")
    .select("id, nome, papel, ativo, criado_em")
    .order("nome");

  if (error) {
    return (
      <div className="rounded-xl border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar os usuários</p>
        <p className="mt-1 text-sm text-texto-2">{error.message}</p>
      </div>
    );
  }

  // O e-mail e a data do último acesso moram em `auth.users`, que a chave
  // anônima não lê. Sem a service role a tela funciona do mesmo jeito, só sem
  // essas duas colunas — e avisa o porquê.
  const admin = clienteAdmin();
  const contas = new Map<string, { email?: string; ultimoAcesso?: string | null }>();
  if (admin) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of data?.users ?? []) {
      contas.set(u.id, { email: u.email, ultimoAcesso: u.last_sign_in_at ?? null });
    }
  }

  const pessoas: Pessoa[] = (perfis ?? []).map((p) => ({
    id: p.id as string,
    nome: (p.nome as string) ?? "",
    // A tabela só aceita os quatro papéis (check); o `??` é para o tipo.
    papel: papelLido(p.papel) ?? "orcamento",
    ativo: Boolean(p.ativo),
    email: contas.get(p.id as string)?.email ?? null,
    ultimoAcesso: contas.get(p.id as string)?.ultimoAcesso ?? null,
  }));

  return <Usuarios pessoas={pessoas} eu={sessao.usuarioId} temChaveAdmin={Boolean(admin)} />;
}
