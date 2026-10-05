import { sessaoAtual, ROTULO_PAPEL } from "@/lib/supabase/papel";
import { createClient } from "@/lib/supabase/server";
import { contratoLido, contratosPedindoAtencao, hojeNaCasa } from "@/lib/medicoes/contratos";
import { sair } from "@/app/login/actions";
import { lerAbertos } from "./boletins/abertos/dados";
import { Casca } from "@/components/casca";
import { BotaoTema } from "@/components/tema";
import { BotaoAtualizar } from "@/components/atualizar";
import { Logo } from "@/components/logo";
import { TrocaSistema } from "@/components/troca-sistema";

export const dynamic = "force-dynamic";

/**
 * Quantos contratos pedem ação — o contador do menu. Sem a 0013, ou sem
 * login, é zero: o menu não pode quebrar por causa dele.
 */
async function contratosDoMenu(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("contratos_atual").select("*");
    if (error || !data) return 0;
    return contratosPedindoAtencao(
      data.map((c) => contratoLido(c as Record<string, unknown>)),
      hojeNaCasa(),
    );
  } catch {
    return 0;
  }
}

/** Quantos BMs abertos pedem atenção. Se a leitura falhar, zero. */
async function abertosDoMenu(): Promise<number> {
  try {
    const { abertos } = await lerAbertos(await createClient());
    return abertos.filter((b) => b.pendencias.length > 0).length;
  } catch {
    return 0;
  }
}

export default async function LayoutSistema({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [sessao, contratos, abertos] = await Promise.all([
    sessaoAtual(),
    contratosDoMenu(),
    abertosDoMenu(),
  ]);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <Casca
      pendencias={{ "/contratos": contratos, "/boletins/abertos": abertos }}
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
