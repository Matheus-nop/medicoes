import { sessaoAtual, ROTULO_PAPEL } from "@/lib/supabase/papel";
import { sair } from "@/app/login/actions";
import { Casca } from "@/components/casca";
import { BotaoTema } from "@/components/tema";
import { BotaoAtualizar } from "@/components/atualizar";
import { Logo } from "@/components/logo";
import { TrocaSistema } from "@/components/troca-sistema";

export const dynamic = "force-dynamic";

export default async function LayoutSistema({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessao = await sessaoAtual();

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <Casca
      pendencias={{}}
      gestor={sessao.papel === "diretoria"}
      marca={
        <div className="flex items-center gap-3">
          <Logo altura={28} />
          <span className="hidden border-l border-white/15 pl-3 text-sm font-semibold sm:block">
            Medições e Contratos
          </span>
        </div>
      }
      direita={
        <>
          <TrocaSistema atual="medicoes" />
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs font-medium">{hoje}</p>
            <p className="text-[11px] text-marca-texto/60">
              {sessao.nome}
              {sessao.papel && ` · ${ROTULO_PAPEL[sessao.papel].toLowerCase()}`}
            </p>
          </div>
          {/* Instalado como aplicativo não há barra de navegador, e portanto
              não há F5: o botão de atualizar precisa morar aqui dentro. */}
          <BotaoAtualizar />
          <BotaoTema naBarra />
          <form action={sair}>
            <button
              type="submit"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
            >
              Sair
            </button>
          </form>
        </>
      }
    >
      {children}
    </Casca>
  );
}
