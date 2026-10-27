import { notFound } from "next/navigation";
import { podeLancar } from "@/lib/medicoes/papeis";
import { sessaoAtual } from "@/lib/supabase/papel";
import { carregarMedicao, carregarMedicoes } from "../dados";
import { Medicao } from "./medicao";

export const dynamic = "force-dynamic";

export default async function PaginaDaMedicao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const medicaoId = Number(id);
  if (!Number.isInteger(medicaoId)) notFound();
  const [carga, sessao, lista] = await Promise.all([carregarMedicao(medicaoId), sessaoAtual(), carregarMedicoes()]);
  if (!carga.ok) {
    if (carga.naoExiste) notFound();
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar a medição</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }
  return (
    <Medicao
      carga={carga}
      clientes={lista.ok ? lista.clientes : [carga.medicao.cliente]}
      podeMexer={podeLancar(sessao.papel, "locacao")}
    />
  );
}
