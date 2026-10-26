import type { Metadata } from "next";
import { CATEGORIAS, ROTULO_CATEGORIA, TODAS, type Categoria } from "@/lib/medicoes/controle";
import { carregarControle } from "../dados";
import { RelatorioDaBase } from "./folha";

export const dynamic = "force-dynamic";

type Busca = { cliente?: string; periodo?: string; base?: string; tipo?: string };

/** O título é o nome do arquivo que o navegador sugere ao salvar o PDF. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}): Promise<Metadata> {
  const q = await searchParams;
  const base = !q.base || q.base === TODAS ? "TODAS AS BASES" : q.base;
  const tipo = CATEGORIAS.includes(q.tipo as Categoria) ? ` - ${ROTULO_CATEGORIA[q.tipo as Categoria].toUpperCase()}` : "";
  return { title: `Medições - ${q.cliente ?? "ÁGUAS DO RIO - AEGEA"} - ${base}${tipo}`.replace(/\//g, "-") };
}

/**
 * O relatório de medições de uma base — ou de todas —, de um tipo ou de todos,
 * numa posição: o que o painel mostra, em papel. Sai em PDF pela janela de
 * impressão e vai por e-mail ou WhatsApp.
 */
export default async function Relatorio({ searchParams }: { searchParams: Promise<Busca> }) {
  const q = await searchParams;
  // O relatório lê o cliente inteiro e recorta só o tipo: a base escolhida
  // aparece na folha, mas a lista das bases continua toda, para escolher.
  const carga = await carregarControle(q.cliente, q.periodo ? Number(q.periodo) : undefined, { tipo: q.tipo });
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o controle</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }

  const base = q.base && carga.regioes.some((r) => r.nome === q.base) ? q.base : TODAS;
  return <RelatorioDaBase carga={carga} historia={carga.historia} base={base} />;
}
