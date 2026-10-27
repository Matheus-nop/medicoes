import { createClient } from "@/lib/supabase/server";
import { carregarMedicao } from "../../dados";
import { montarPlanilha } from "./planilha";

export const dynamic = "force-dynamic";

/** A planilha da AEGEA do mês, para baixar. O responsável é quem baixa. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const carga = await carregarMedicao(Number(id));
  if (!carga.ok) return new Response(carga.erro, { status: carga.naoExiste ? 404 : 500 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: perfil } = auth.user
    ? await supabase.from("perfis").select("nome").eq("id", auth.user.id).maybeSingle()
    : { data: null };
  const { buffer, nome } = await montarPlanilha(carga, perfil?.nome ?? "");
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="planilha.xlsx"; filename*=UTF-8''${encodeURIComponent(nome)}.xlsx`,
    },
  });
}
