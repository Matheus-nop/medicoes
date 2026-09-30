import Link from "next/link";
import { Cabecalho, ESTILO_BOTAO } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Celula } from "@/lib/medicoes/controle";
import { carregarControle } from "../dados";
import { EscolherPeriodo } from "../vivo";
import { Grade, NovoPeriodo, NovaRegiao, type Lancamento } from "./grade";

export const dynamic = "force-dynamic";

/**
 * Lançar as medições de um período: medido e faturado de cada região, nas
 * três categorias. É a aba do mês da planilha — e se cola dela.
 */
export default async function LancarMedicoes({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; periodo?: string }>;
}) {
  const q = await searchParams;
  const carga = await carregarControle(q.cliente, q.periodo ? Number(q.periodo) : undefined, {
    vazioVale: true,
  });

  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o controle</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
        {carga.faltaMigracao && (
          <p className="mt-3 text-xs text-texto-3">
            Falta aplicar a <code>0005_controle.sql</code> no SQL Editor.
          </p>
        )}
      </div>
    );
  }

  const { cliente, clientes, periodos, periodo, regioes, celulas } = carga;

  // O período anterior: o ponto de partida da foto nova, que é acumulada.
  const anterior = periodo ? [...periodos].reverse().find((p) => p.mes < periodo.mes) : undefined;
  let celulasAnteriores: Celula[] = [];
  let historico: Lancamento[] = [];
  const supabase = await createClient();
  if (anterior) {
    const { data } = await supabase
      .from("controle_atual")
      .select("periodo_id, regiao_id, regiao, ordem, categoria, medido, faturado")
      .eq("periodo_id", anterior.id);
    celulasAnteriores = ((data ?? []) as Celula[]).map((c) => ({
      ...c,
      medido: Number(c.medido),
      faturado: Number(c.faturado),
    }));
  }
  if (periodo) {
    // Os últimos lançamentos deste período, com o nome de quem lançou.
    const { data } = await supabase
      .from("controle_valores")
      .select("id, regiao_id, categoria, medido, faturado, quem, em")
      .eq("periodo_id", periodo.id)
      .order("id", { ascending: false })
      .limit(20);
    const brutos = (data ?? []) as (Omit<Lancamento, "quem_nome"> & { quem: string | null })[];
    const ids = [...new Set(brutos.map((b) => b.quem).filter(Boolean))] as string[];
    const { data: perfis } = ids.length
      ? await supabase.from("perfis").select("id, nome").in("id", ids)
      : { data: [] };
    const nome = new Map((perfis ?? []).map((p: { id: string; nome: string }) => [p.id, p.nome]));
    const regiao = new Map(regioes.map((r) => [r.id, r.nome]));
    historico = brutos.map((b) => ({
      ...b,
      medido: Number(b.medido),
      faturado: Number(b.faturado),
      regiao: regiao.get(b.regiao_id) ?? "—",
      quem_nome: b.quem ? (nome.get(b.quem) ?? "—") : "planilha",
    }));
  }

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Lançar medições"
        resumo={
          <>
            {cliente}
            {periodo ? (
              <>
                {" "}
                · período <strong>{periodo.rotulo}</strong>
              </>
            ) : (
              " · nenhum período aberto ainda"
            )}
            . Manutenção, locação e indenização: o medido e o faturado de cada região. O saldo é
            conta, e sai sozinho.
          </>
        }
        acoes={
          <>
            <EscolherPeriodo
              clientes={clientes}
              cliente={cliente}
              periodos={periodos}
              periodoId={periodo?.id ?? null}
            />
            <Link
              href={`/controle?cliente=${encodeURIComponent(cliente)}${periodo ? `&periodo=${periodo.id}` : ""}`}
              className={ESTILO_BOTAO.contorno}
            >
              Ver o painel
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <NovoPeriodo cliente={cliente} />
        <NovaRegiao cliente={cliente} />
      </div>

      {periodo && regioes.length > 0 ? (
        <Grade
          // A grade renasce quando o período muda ou alguém lança: o que ela
          // mostra é o que está no banco.
          key={`${periodo.id}:${historico[0]?.id ?? 0}`}
          periodo={periodo}
          regioes={regioes}
          celulas={celulas}
          anterior={anterior ? { rotulo: anterior.rotulo, celulas: celulasAnteriores } : null}
          historico={historico}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-borda p-6 text-center text-sm text-texto-3">
          {regioes.length === 0
            ? "Cadastre as regiões (ou bases) deste cliente para lançar."
            : "Abra o período do mês para lançar."}
        </p>
      )}
    </div>
  );
}
