import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TODAS, type Categoria, type Celula } from "@/lib/medicoes/controle";
import { carregarControle } from "../dados";
import { RelatorioDaBase } from "./folha";

export const dynamic = "force-dynamic";

type Busca = { cliente?: string; periodo?: string; base?: string };

/** O título é o nome do arquivo que o navegador sugere ao salvar o PDF. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}): Promise<Metadata> {
  const q = await searchParams;
  const base = !q.base || q.base === TODAS ? "TODAS AS BASES" : q.base;
  return { title: `Medições - ${q.cliente ?? "ÁGUAS DO RIO - AEGEA"} - ${base}`.replace(/\//g, "-") };
}

/**
 * O relatório de medições de uma base — ou de todas — numa posição: o que o
 * painel mostra, em papel. Sai em PDF pela janela de impressão e vai por
 * e-mail ou WhatsApp.
 */
export default async function Relatorio({ searchParams }: { searchParams: Promise<Busca> }) {
  const q = await searchParams;
  const carga = await carregarControle(q.cliente, q.periodo ? Number(q.periodo) : undefined);
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o controle</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }

  // A história inteira do cliente: é dela que sai a evolução da base.
  const supabase = await createClient();
  const { data } = await supabase
    .from("controle_posicao")
    .select("periodo_id, regiao_id, regiao, ordem, categoria, saldo_anterior, medido, faturado")
    .eq("cliente", carga.cliente);
  const historia = ((data ?? []) as Celula[]).map((c) => ({
    ...c,
    categoria: c.categoria as Categoria,
    saldo_anterior: Number(c.saldo_anterior),
    medido: Number(c.medido),
    faturado: Number(c.faturado),
  }));

  const base = q.base && carga.regioes.some((r) => r.nome === q.base) ? q.base : TODAS;
  return <RelatorioDaBase carga={carga} historia={historia} base={base} />;
}
