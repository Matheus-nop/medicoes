import Link from "next/link";
import { Aviso, Cabecalho, ESTILO_BOTAO, Vazio } from "@/components/ui";
import { sessaoAtual } from "@/lib/supabase/papel";
import { carregarControle } from "../dados";
import { EscolherPeriodo } from "../vivo";
import { DefinirInicio, GradeDeRecebimento } from "./grade";

export const dynamic = "force-dynamic";

/**
 * Lançar recebimentos — o financeiro. Para cada base e categoria: o a receber
 * que veio do mês anterior e o faturado no mês (os dois calculados), e o que
 * foi recebido. O a receber passa sozinho para o mês seguinte.
 */
export default async function LancarRecebimentos({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; periodo?: string }>;
}) {
  const q = await searchParams;
  const [carga, sessao] = await Promise.all([
    carregarControle(q.cliente, q.periodo ? Number(q.periodo) : undefined, { vazioVale: true }),
    sessaoAtual(),
  ]);
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o controle</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
        {carga.faltaMigracao && (
          <p className="mt-3 text-xs text-texto-3">
            Falta aplicar a <code>0007_recebimento.sql</code> no SQL Editor.
          </p>
        )}
      </div>
    );
  }

  const { cliente, clientes, periodos, periodo, regioes, celulas, inicioRecebimento } = carga;
  const podeLancar = sessao.papel === "financeiro" || sessao.papel === "diretoria";
  const anterior = periodo ? [...periodos].reverse().find((p) => p.mes < periodo.mes) : undefined;
  const acompanha = Boolean(inicioRecebimento && periodo && periodo.mes >= inicioRecebimento);
  const rotuloDoInicio = periodos.find((p) => p.mes === inicioRecebimento)?.rotulo ?? inicioRecebimento;

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Lançar recebimentos"
        resumo={
          <>
            {cliente}
            {periodo && (
              <>
                {" "}
                · <strong>{periodo.rotulo}</strong>
              </>
            )}
            . Financeiro: o a receber que veio e o faturado no mês vêm sozinhos; lance o que foi
            recebido. O a receber passa para o mês seguinte.
          </>
        }
        acoes={
          <>
            <EscolherPeriodo clientes={clientes} cliente={cliente} periodos={periodos} periodoId={periodo?.id ?? null} />
            <Link
              href={`/controle?cliente=${encodeURIComponent(cliente)}${periodo ? `&periodo=${periodo.id}` : ""}`}
              className={ESTILO_BOTAO.contorno}
            >
              Ver o painel
            </Link>
          </>
        }
      />

      {!podeLancar && (
        <Aviso tom="erro">
          Só o financeiro e a diretoria lançam recebimento. Você vê os números, mas não altera.
        </Aviso>
      )}

      <DefinirInicio
        cliente={cliente}
        inicio={inicioRecebimento}
        rotuloDoInicio={rotuloDoInicio}
        podeLancar={podeLancar}
        sugestao={periodo?.mes.slice(0, 7) ?? ""}
      />

      {!periodo ? (
        <Vazio>Nenhum período aberto para este cliente.</Vazio>
      ) : !acompanha ? (
        <Vazio>
          {inicioRecebimento
            ? `${periodo.rotulo} é anterior ao início do acompanhamento (${rotuloDoInicio}).`
            : "Defina acima o mês de início para lançar recebimentos."}
        </Vazio>
      ) : (
        <GradeDeRecebimento
          key={`${periodo.id}:${celulas.map((c) => `${c.recebido}/${c.abertura}`).join(",")}`}
          periodo={periodo}
          anterior={anterior?.rotulo ?? null}
          ehInicio={periodo.mes === inicioRecebimento}
          regioes={regioes}
          celulas={celulas}
          podeLancar={podeLancar}
        />
      )}
    </div>
  );
}
