import { createClient } from "@/lib/supabase/server";
import { lerAbertos } from "./dados";
import { QuadroDosAbertos } from "./quadro";

export const dynamic = "force-dynamic";

export default async function PaginaDosAbertos() {
  const supabase = await createClient();
  const hoje = new Date();
  const [lido, regioes] = await Promise.all([
    lerAbertos(supabase, hoje),
    // A ordem das regiões do controle é a ordem dos painéis.
    supabase.from("controle_regioes").select("nome, ordem").order("ordem"),
  ]);

  if (lido.erro) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar os BMs em aberto</p>
        <p className="mt-1 text-sm text-texto-2">{lido.erro.message}</p>
      </div>
    );
  }

  return (
    <QuadroDosAbertos
      abertos={lido.abertos}
      oms={Object.fromEntries(lido.oms)}
      bases={lido.bases}
      mesCorrente={lido.mesCorrente}
      ordemDasRegionais={[
        ...new Set(((regioes.data ?? []) as { nome: string }[]).map((r) => r.nome.trim().toUpperCase())),
      ]}
      hoje={hoje.toISOString()}
    />
  );
}
