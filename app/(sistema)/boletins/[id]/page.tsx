import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sessaoAtual } from "@/lib/supabase/papel";
import { proximoDocumento } from "@/lib/medicoes/bases";
import { Boletim } from "./boletim";
import { carregarBoletim } from "./dados";

export const dynamic = "force-dynamic";

export default async function PaginaDoBoletim({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const boletimId = Number(id);
  if (!Number.isInteger(boletimId)) notFound();

  const [carga, sessao, supabase] = await Promise.all([
    carregarBoletim(boletimId),
    sessaoAtual(),
    createClient(),
  ]);

  if (carga === null) notFound();
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o boletim</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
        {carga.faltaMigracao && (
          <p className="mt-3 text-xs text-texto-3">
            Falta aplicar a <code>0002_boletins.sql</code> no SQL Editor.
          </p>
        )}
      </div>
    );
  }

  // As OMs que já estão em OUTRO boletim, para a colagem daqui avisar antes.
  const { data: outras } = await supabase
    .from("boletim_oms")
    .select("om, boletins(numero)")
    .neq("boletim_id", boletimId);
  const jaMedidas: Record<string, string> = {};
  for (const o of (outras ?? []) as unknown as {
    om: string;
    boletins: { numero: string } | null;
  }[]) {
    jaMedidas[o.om] = o.boletins?.numero ?? "outro boletim";
  }
  // As deste boletim também contam: colar de novo a mesma lista não duplica.
  for (const i of carga.itens) jaMedidas[i.om] = carga.boletim.numero;

  // O próximo Documento Nº da base, para o boletim que ainda está sem.
  let documentoSugerido: string | null = null;
  if (!carga.boletim.documento?.trim() && carga.boletim.base) {
    const { data: daBase } = await supabase
      .from("boletins")
      .select("cliente, base, documento")
      .neq("id", boletimId);
    documentoSugerido = proximoDocumento(
      (daBase ?? []) as { cliente: string; base: string | null; documento: string | null }[],
      carga.boletim.cliente,
      carga.boletim.base,
    );
  }

  return (
    <Boletim
      boletim={carga.boletim}
      itens={carga.itens}
      andamentos={carga.andamentos}
      jaMedidas={jaMedidas}
      ehDiretoria={sessao.papel === "diretoria"}
      documentoSugerido={documentoSugerido}
    />
  );
}
