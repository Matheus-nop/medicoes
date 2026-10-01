import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hojeNaCasa, type Aditivo } from "@/lib/medicoes/contratos";
import { podeLancar } from "@/lib/medicoes/papeis";
import { sessaoAtual } from "@/lib/supabase/papel";
import { carregarContratos } from "../dados";
import { Contrato } from "./contrato";

export const dynamic = "force-dynamic";

export default async function PaginaDoContrato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contratoId = Number(id);
  if (!Number.isInteger(contratoId)) notFound();

  const supabase = await createClient();
  const [carga, aditivos, sessao] = await Promise.all([
    carregarContratos(),
    supabase.from("contrato_aditivos").select("*").eq("contrato_id", contratoId).order("data").order("id"),
    sessaoAtual(),
  ]);
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o contrato</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }
  const contrato = carga.contratos.find((c) => c.id === contratoId);
  if (!contrato) notFound();

  const lista = (aditivos.data ?? []) as Aditivo[];
  const ids = [...new Set(lista.map((a) => a.quem))];
  const { data: perfis } = ids.length
    ? await supabase.from("perfis").select("id, nome").in("id", ids)
    : { data: [] };
  const nome = new Map((perfis ?? []).map((p: { id: string; nome: string }) => [p.id, p.nome]));

  return (
    <Contrato
      contrato={contrato}
      aditivos={lista.map((a) => ({
        ...a,
        valor_delta: a.valor_delta === null ? null : Number(a.valor_delta),
        percentual: a.percentual === null ? null : Number(a.percentual),
        quem_nome: nome.get(a.quem) ?? "—",
      }))}
      clientes={carga.clientes}
      hoje={hojeNaCasa()}
      podeMexer={podeLancar(sessao.papel, "contrato")}
      ehDiretoria={sessao.papel === "diretoria"}
    />
  );
}
