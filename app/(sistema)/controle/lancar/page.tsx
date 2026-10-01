import Link from "next/link";
import { Cabecalho, ESTILO_BOTAO, SoLeitura } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { sessaoAtual } from "@/lib/supabase/papel";
import { podeLancar, quemLanca } from "@/lib/medicoes/papeis";
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
  const [carga, sessao] = await Promise.all([
    carregarControle(q.cliente, q.periodo ? Number(q.periodo) : undefined, { vazioVale: true }),
    sessaoAtual(),
  ]);
  const pode = podeLancar(sessao.papel, "controle");

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

  // O mês anterior, só para dizer de onde veio o saldo — o valor vem da view.
  const anterior = periodo ? [...periodos].reverse().find((p) => p.mes < periodo.mes) : undefined;
  let historico: Lancamento[] = [];
  const supabase = await createClient();
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
            . Time de faturamento: o saldo do mês anterior vem sozinho; lance o que foi medido e o
            que foi faturado no mês, em cada base. O saldo é conta, passa para o mês seguinte e é o
            que aparece no painel.
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

      {!pode && (
        <SoLeitura>
          Você vê o quadro, mas quem lança as medições é {quemLanca("controle")}.
        </SoLeitura>
      )}

      {pode && periodo && regioes.length > 0 && (
        <ol className="grid gap-2 rounded-xl border border-acento/30 bg-acento-fraco p-3 text-xs text-texto sm:grid-cols-3">
          <li>
            <strong>1.</strong> Confira o mês em <strong>Posição</strong>, no alto ({periodo.rotulo}).
          </li>
          <li>
            <strong>2.</strong> Em cada base, digite o <strong>medido</strong> e o{" "}
            <strong>faturado</strong> do mês. O saldo do mês anterior já vem.
          </li>
          <li>
            <strong>3.</strong> Clique em <strong>Salvar</strong>, no alto do quadro. O painel mostra
            em até um minuto.
          </li>
        </ol>
      )}

      {periodo && regioes.length > 0 ? (
        <Grade
          // A grade renasce quando o período muda ou alguém lança: o que ela
          // mostra é o que está no banco.
          key={`${periodo.id}:${historico[0]?.id ?? 0}`}
          periodo={periodo}
          regioes={regioes}
          celulas={celulas}
          anterior={anterior?.rotulo ?? null}
          historico={historico}
          podeLancar={pode}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-borda p-6 text-center text-sm text-texto-3">
          {regioes.length === 0 ? (
            <>
              {cliente} não tem nenhuma base cadastrada — é um cliente novo, ou o nome foi
              digitado diferente?{" "}
              {clientes.filter((c) => c !== cliente).length > 0 && (
                <>
                  Os clientes com bases são:{" "}
                  {clientes
                    .filter((c) => c !== cliente)
                    .map((c, n) => (
                      <span key={c}>
                        {n > 0 && " · "}
                        <Link
                          href={`/controle/lancar?cliente=${encodeURIComponent(c)}`}
                          className="font-semibold text-acento underline"
                        >
                          {c}
                        </Link>
                      </span>
                    ))}
                  . Se é novo mesmo, cadastre as bases dele em &quot;Nova região&quot;, abaixo.
                </>
              )}
            </>
          ) : (
            "Abra o período do mês para lançar, no pé da página."
          )}
        </p>
      )}

      {/* Abrir mês e cadastrar base ficam no pé: é o que se faz uma vez. */}
      {pode && (
        <div className="grid gap-4 lg:grid-cols-2">
          <NovoPeriodo cliente={cliente} clientes={clientes} />
          <NovaRegiao cliente={cliente} />
        </div>
      )}
    </div>
  );
}
