import { createClient } from "@/lib/supabase/server";
import { situacaoLida, type BoletimAtual } from "@/lib/medicoes/medicoes";
import type { Base } from "@/lib/medicoes/bases";
import { Medicoes, type SaldoLido } from "./painel";

export const dynamic = "force-dynamic";

export default async function PaginaMedicoes() {
  const supabase = await createClient();

  const [boletins, porCliente, itens, bases] = await Promise.all([
    supabase.from("boletins_atual").select("*").order("id", { ascending: false }),
    supabase.from("por_cliente").select("*"),
    // Só o número da OM e o boletim dela: é o que a colagem precisa para dizer
    // "esta já está no BM-0003" antes de alguém apertar o botão.
    supabase.from("boletim_oms").select("om, boletim_id"),
    // O cadastro de bases: a colagem mostra o que o boletim novo vai puxar.
    // Sem a 0010 ele não existe, e a colagem segue sem ele.
    supabase.from("bases").select("*"),
  ]);

  const falha = boletins.error ?? porCliente.error ?? itens.error;
  if (falha) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar as medições</p>
        <p className="mt-1 text-sm text-texto-2">{falha.message}</p>
        {falha.code === "42P01" && (
          <p className="mt-3 text-xs text-texto-3">
            Falta aplicar a <code>0002_boletins.sql</code> no SQL Editor. Ela é
            idempotente — rodar de novo não duplica nada.
          </p>
        )}
      </div>
    );
  }

  const lista = ((boletins.data ?? []) as BoletimAtual[]).map((b) => ({
    ...b,
    situacao: situacaoLida(b.situacao),
    valor: Number(b.valor),
    custo: b.custo === null ? null : Number(b.custo),
  }));

  const numeroDe = new Map(lista.map((b) => [b.id, b.numero]));
  const jaMedidas: Record<string, string> = {};
  for (const i of (itens.data ?? []) as { om: string; boletim_id: number }[]) {
    jaMedidas[i.om] = numeroDe.get(i.boletim_id) ?? "outro boletim";
  }

  return (
    <Medicoes
      boletins={lista}
      porCliente={((porCliente.data ?? []) as SaldoLido[]).map((c) => ({
        ...c,
        em_medicao: Number(c.em_medicao),
        medido: Number(c.medido),
        faturado: Number(c.faturado),
        saldo: Number(c.saldo),
      }))}
      jaMedidas={jaMedidas}
      bases={bases.error ? [] : ((bases.data ?? []) as Base[])}
    />
  );
}
