import { sair } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { ESTILO_BOTAO } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Logado no grupo, sem acesso a medições.
 *
 * O login é o mesmo dos três apps: quem usa o Estoque ou o Roteiros entra aqui
 * com a mesma senha — e cai nesta tela, porque ter login não é ter acesso.
 * Mora fora da casca de propósito: menu para quem não pode abrir nada é
 * promessa que a tela não cumpre.
 */
export default function SemAcesso() {
  return (
    <main className="grid min-h-screen place-items-center bg-fundo px-4">
      <div className="w-full max-w-md rounded-xl border border-borda bg-superficie p-8 text-center shadow-cartao">
        <div className="mb-4 flex justify-center rounded-lg bg-marca py-3">
          <Logo altura={30} />
        </div>
        <h1 className="text-lg font-semibold">Sem acesso a Medições e Contratos</h1>
        <p className="mt-2 text-sm text-texto-2">
          Seu login do grupo funciona aqui, mas este app é do faturamento, do orçamento, do
          financeiro e da diretoria. Peça acesso à diretoria — ela libera pela tela de Usuários,
          e a senha continua a mesma.
        </p>
        <form action={sair} className="mt-6">
          <button type="submit" className={ESTILO_BOTAO.contorno}>
            Entrar com outra conta
          </button>
        </form>
      </div>
    </main>
  );
}
