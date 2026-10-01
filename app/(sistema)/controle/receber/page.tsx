import Link from "next/link";
import { Cabecalho, ESTILO_BOTAO, SoLeitura, Vazio } from "@/components/ui";
import { sessaoAtual } from "@/lib/supabase/papel";
import { podeLancar, quemLanca } from "@/lib/medicoes/papeis";
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
  const pode = podeLancar(sessao.papel, "recebimento");
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

      {!pode && (
        <SoLeitura>
          Você vê os números, mas quem lança recebimento é {quemLanca("recebimento")}.
        </SoLeitura>
      )}

      {/* O passo a passo muda com o momento: antes do início, no mês de início
          (com a abertura) e nos meses seguintes. */}
      <ol className="grid gap-2 rounded-xl border border-acento/30 bg-acento-fraco p-3 text-xs text-texto sm:grid-cols-3">
        {!inicioRecebimento ? (
          <>
            <li>
              <strong>1.</strong> Em <strong>&quot;Acompanhar a partir de&quot;</strong>, escolha o mês em que
              o financeiro começa a lançar aqui, e clique em <strong>Definir</strong>. Uma vez só por
              cliente.
            </li>
            <li>
              <strong>2.</strong> Nesse mês, em cada base, digite na <strong>Abertura</strong> o que ela
              já tinha a receber — notas emitidas e ainda não pagas.
            </li>
            <li>
              <strong>3.</strong> Digite o <strong>Recebido</strong> no mês e clique em{" "}
              <strong>Salvar</strong>. Daí em diante o a receber passa sozinho de um mês para o outro.
            </li>
          </>
        ) : periodo && periodo.mes === inicioRecebimento ? (
          <>
            <li>
              <strong>1.</strong> Este é o mês de início ({periodo.rotulo}). Em cada base, digite na{" "}
              <strong>Abertura</strong> o que já estava a receber — as notas antigas não pagas.
            </li>
            <li>
              <strong>2.</strong> O <strong>Faturado</strong> do mês vem sozinho, do lançamento do
              faturamento. Digite o <strong>Recebido</strong> — o que entrou de dinheiro no mês.
            </li>
            <li>
              <strong>3.</strong> Clique em <strong>Salvar</strong>. A receber = abertura + faturado −
              recebido, e passa para o mês seguinte.
            </li>
          </>
        ) : (
          <>
            <li>
              <strong>1.</strong> Confira o mês em <strong>Posição</strong>, no alto
              {periodo ? ` (${periodo.rotulo})` : ""}.
            </li>
            <li>
              <strong>2.</strong> O <strong>a receber do mês anterior</strong> e o{" "}
              <strong>faturado</strong> no mês vêm sozinhos. Em cada base, digite só o{" "}
              <strong>Recebido</strong> — o que entrou de dinheiro no mês.
            </li>
            <li>
              <strong>3.</strong> Clique em <strong>Salvar</strong>. A receber = anterior + faturado −
              recebido, e aparece no painel em até um minuto.
            </li>
          </>
        )}
      </ol>

      <DefinirInicio
        cliente={cliente}
        inicio={inicioRecebimento}
        rotuloDoInicio={rotuloDoInicio}
        podeLancar={pode}
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
          podeLancar={pode}
        />
      )}
    </div>
  );
}
