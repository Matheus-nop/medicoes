import { sair } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { ESTILO_BOTAO } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Logado no grupo, sem acesso a medições.
 *
 * O login é o mesmo dos três apps: quem usa o Estoque ou o Roteiros entra aqui
 * com a mesma senha — e cai nesta tela, porque ter login não é ter acesso.
 * Mora fora da casca de propósito: menu para quem não pode abrir nada é
 * promessa que a tela não cumpre.
 *
 * E ela diz POR QUE está sem acesso. São duas causas com a mesma cara — não há
 * perfil daqui, ou o app não conseguiu nem perguntar (o schema `medicoes` fora
 * do "Exposed schemas" do Supabase) —, e a primeira implantação mostrou que,
 * sem dizer qual, quem está do lado de fora não tem como saber o que corrigir.
 */
export default async function SemAcesso() {
  const supabase = await createClient();
  const [{ data: sessao }, { error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("meu_papel"),
  ]);
  const email = sessao.user?.email ?? null;

  return (
    <main className="grid min-h-screen place-items-center bg-fundo px-4">
      <div className="w-full max-w-md rounded-xl border border-borda bg-superficie p-8 text-center shadow-cartao">
        <div className="barra-marca mb-4 flex justify-center rounded-lg bg-marca py-3">
          <Logo altura={30} />
        </div>
        <h1 className="text-lg font-semibold">Sem acesso a Medições e Contratos</h1>

        {error ? (
          <div className="mt-2 space-y-2 text-sm text-texto-2">
            <p>
              O app não conseguiu perguntar ao banco qual é o seu papel. Isso não é falta de
              acesso seu: é configuração.
            </p>
            <p className="rounded-lg border border-manutencao/40 bg-manutencao/10 px-3 py-2 text-left text-xs text-manutencao">
              {error.message}
            </p>
            <p className="text-xs text-texto-3">
              A causa mais comum: o schema <code>medicoes</code> fora da lista em Supabase →
              Settings → API → Exposed schemas. Se ele já está lá, confira se as migrações
              0000 a 0003 foram aplicadas.
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-texto-2">
            <p>
              Seu login do grupo funciona aqui, mas este app é do faturamento, do orçamento, do
              financeiro e da diretoria. Peça acesso à diretoria — ela libera pela tela de
              Usuários, e a senha continua a mesma.
            </p>
            {email && (
              <p className="text-xs text-texto-3">
                Você entrou como <strong className="text-texto-2">{email}</strong>. Se é você
                quem deveria ser a primeira diretoria, o insert da migração 0001 tem de usar
                exatamente este e-mail.
              </p>
            )}
          </div>
        )}

        <form action={sair} className="mt-6">
          <button type="submit" className={ESTILO_BOTAO.contorno}>
            Entrar com outra conta
          </button>
        </form>
      </div>
    </main>
  );
}
