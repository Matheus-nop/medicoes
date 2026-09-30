import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { chaveDoCliente, type ItemDoBoletim } from "@/lib/medicoes/medicoes";
import { carregarClientes } from "../dados";
import { Extrato } from "./folha";

export const dynamic = "force-dynamic";

type Busca = { nome?: string; mes?: string };

/** O título é o nome do PDF que o navegador sugere. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}): Promise<Metadata> {
  const q = await searchParams;
  return {
    title: ["Manutenção", q.nome, q.mes].filter(Boolean).join(" - ").replace(/\//g, "-"),
  };
}

/**
 * O extrato de manutenção de um cliente: por base, boletim a boletim, com as
 * OMs de cada um — na tela e em PDF. É o que a planilha da manutenção fazia.
 */
export default async function ExtratoDoCliente({ searchParams }: { searchParams: Promise<Busca> }) {
  const q = await searchParams;
  const nome = (q.nome ?? "").trim();
  const carga = await carregarClientes();
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o cliente</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }
  const chave = chaveDoCliente(nome);
  const todos = carga.boletins.filter((b) => chaveDoCliente(b.cliente) === chave);
  const boletins = q.mes ? todos.filter((b) => (b.referencia ?? "").trim() === q.mes) : todos;

  const supabase = await createClient();
  const { data } = boletins.length
    ? await supabase
        .from("boletim_oms_atual")
        .select("*")
        .in(
          "boletim_id",
          boletins.map((b) => b.id),
        )
    : { data: [] };
  const oms = ((data ?? []) as (ItemDoBoletim & { boletim_id: number })[]).map((i) => ({
    ...i,
    valor: Number(i.valor),
  }));

  return (
    <Extrato
      nome={carga.fichas.find((f) => f.chave === chave)?.nome ?? nome}
      todos={todos}
      boletins={boletins}
      oms={oms}
      mes={q.mes ?? ""}
    />
  );
}
