import { Cabecalho } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { sessaoAtual } from "@/lib/supabase/papel";
import { podeLancar } from "@/lib/medicoes/papeis";
import { proximoDocumento, type Base } from "@/lib/medicoes/bases";
import { chaveDoDestino } from "@/lib/medicoes/medicoes";
import { QuadroDeBases, type BaseNoQuadro } from "./quadro";

export const dynamic = "force-dynamic";

/**
 * O cadastro de bases: o responsável, e-mail, telefone, local da obra,
 * observação e papel de cada base. O boletim novo da base nasce com eles, e
 * com o próximo Documento Nº. Editar aqui não muda boletim que já existe.
 */
export default async function CadastroDeBases({
  searchParams,
}: {
  searchParams: Promise<{ base?: string }>;
}) {
  const q = await searchParams;
  const supabase = await createClient();
  const [bases, boletins, sessao, regioes] = await Promise.all([
    supabase.from("bases").select("*").order("cliente").order("nome"),
    supabase.from("boletins").select("cliente, base, documento, criado_em"),
    sessaoAtual(),
    supabase.from("controle_regioes").select("nome, ordem").order("ordem"),
  ]);
  if (bases.error) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar as bases</p>
        <p className="mt-1 text-sm text-texto-2">{bases.error.message}</p>
        {bases.error.code === "42P01" && (
          <p className="mt-3 text-xs text-texto-3">
            Falta aplicar a <code>0010_bases.sql</code> no SQL Editor.
          </p>
        )}
      </div>
    );
  }
  const lista = (boletins.data ?? []) as {
    cliente: string;
    base: string | null;
    documento: string | null;
    criado_em: string;
  }[];
  const quadro: BaseNoQuadro[] = ((bases.data ?? []) as Base[]).map((b) => {
    const dela = lista.filter((x) => chaveDoDestino(x.cliente, x.base) === chaveDoDestino(b.cliente, b.nome));
    return {
      ...b,
      boletins: dela.length,
      ultimo: dela.map((x) => x.criado_em).sort().at(-1) ?? null,
      proximo: proximoDocumento(lista, b.cliente, b.nome),
    };
  });

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Cadastro de bases"
        resumo="Os dados de cada base que vão no papel todo mês. O boletim novo da base nasce com eles e com o próximo Documento Nº — editar aqui não muda boletim que já existe."
      />
      <QuadroDeBases
        bases={quadro}
        baseInicial={q.base ?? ""}
        podeMexer={podeLancar(sessao.papel, "boletim")}
        regionais={[
          ...new Set([
            ...((regioes.data ?? []) as { nome: string }[]).map((r) => r.nome.trim().toUpperCase()),
            ...((bases.data ?? []) as Base[]).map((b) => b.regional ?? "").filter(Boolean),
          ]),
        ]}
      />
    </div>
  );
}
