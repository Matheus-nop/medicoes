import Link from "next/link";
import {
  Aviso,
  Cabecalho,
  CartaoIndicador,
  ESTILO_BOTAO,
  Painel,
  Progresso,
  Selo,
  Vazio,
} from "@/components/ui";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import {
  CATEGORIAS,
  ROTULO_CATEGORIA,
  TODAS,
  idadeDoAberto,
  resumirRecebimento,
  faixaDoFaturado,
  resumirPeriodo,
  saldoPorRegiao,
  temValor,
  type Categoria,
  type Soma,
} from "@/lib/medicoes/controle";
import { AbasDoPainel } from "./abas";
import { IdadeDoAberto, NumerosDoRecebimento } from "./idade";
import type { CargaDoControle } from "./dados";
import { BarrasDeSaldo, GraficoEvolucao } from "./graficos";
import { AoVivo, EscolherPeriodo, RecadoDaBase } from "./vivo";

const COR: Record<Categoria, string> = {
  manutencao: "bg-cat-manutencao",
  locacao: "bg-cat-locacao",
  indenizacao: "bg-cat-indenizacao",
};

const TOM_FAIXA = {
  ok: "ok",
  parcial: "transito",
  pendente: "aviso",
  vazio: "neutro",
} as const;

const ROTULO_FAIXA = {
  ok: "faturado",
  parcial: "parcial",
  pendente: "pendente",
  vazio: "vazio",
} as const;

function PorCento({ fracao }: { fracao: number | null }) {
  const faixa = faixaDoFaturado(fracao);
  return <Selo tom={TOM_FAIXA[faixa]}>{fracao === null ? "—" : emPorcento(fracao)}</Selo>;
}

/** O painel, com os dados já lidos — a página lê, esta desenha. */
export function VisaoDoControle({ carga }: { carga: Extract<CargaDoControle, { ok: true }> }) {
  const { cliente, clientes, periodos, serie, periodo, regioes, celulas, historia, inicioRecebimento } =
    carga;
  const r = resumirPeriodo(celulas, regioes);
  const lancar = `/controle/lancar?cliente=${encodeURIComponent(cliente)}${
    periodo ? `&periodo=${periodo.id}` : ""
  }`;
  // A foto anterior, para dizer se o saldo subiu ou desceu desde lá.
  const i = serie.findIndex((x) => x.periodo_id === periodo?.id);
  const antes = i > 0 ? serie[i - 1] : null;
  const variacao = (agora: number, antigo: number) => {
    const d = agora - antigo;
    if (Math.abs(d) < 0.005) return `igual a ${antes!.rotulo}`;
    return `${d > 0 ? "▲" : "▼"} ${emReais(Math.abs(d))} vs ${antes!.rotulo}`;
  };
  const receber = `/controle/receber?cliente=${encodeURIComponent(cliente)}${
    periodo ? `&periodo=${periodo.id}` : ""
  }`;
  const rec = resumirRecebimento(celulas);
  const acompanha = Boolean(inicioRecebimento && periodo && periodo.mes >= inicioRecebimento);
  const relatorio = (base: string) =>
    `/controle/relatorio?cliente=${encodeURIComponent(cliente)}${
      periodo ? `&periodo=${periodo.id}` : ""
    }&base=${encodeURIComponent(base)}`;

  if (!periodo) {
    return (
      <div className="space-y-5">
        <Cabecalho titulo="Painel executivo" resumo={cliente} />
        <Vazio>
          Nenhum período lançado ainda. Para trazer o histórico da planilha, rode{" "}
          <code>supabase/scripts/semear-controle-aguas-do-rio.sql</code> no SQL Editor — ou{" "}
          <Link href={lancar} className="font-semibold text-acento underline">
            lance o primeiro mês
          </Link>
          .
        </Vazio>
      </div>
    );
  }

  const cartaoDaCategoria = (c: Categoria, s: Soma) => (
    <div key={c} className="rounded-xl border border-borda bg-superficie p-4 shadow-cartao">
      <div className="flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${COR[c]}`} />
        <h3 className="text-sm font-semibold">{ROTULO_CATEGORIA[c]}</h3>
        <span className="ml-auto text-sm font-semibold tabular-nums">
          {s.fracao === null ? "—" : emPorcento(s.fracao)}
        </span>
      </div>
      <dl className="mt-3 space-y-1 text-sm tabular-nums">
        <div className="flex justify-between">
          <dt className="text-texto-2">Saldo anterior</dt>
          <dd className="font-medium">{emReais(s.anterior)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-2">Medido no mês</dt>
          <dd className="font-medium">{emReais(s.medido)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-texto-2">Faturado no mês</dt>
          <dd className="font-medium">{emReais(s.faturado)}</dd>
        </div>
        <div className="flex justify-between border-t border-borda pt-1">
          <dt className="font-medium text-saldo">Saldo</dt>
          <dd className="font-semibold text-saldo">{emReais(s.saldo)}</dd>
        </div>
      </dl>
      <Progresso fracao={s.fracao} cor={COR[c]} />
    </div>
  );

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Painel executivo"
        resumo={
          <>
            {cliente} · posição de <strong>{periodo.rotulo}</strong>. Saldo anterior + medido no
            mês − faturado no mês = saldo, que passa para o mês seguinte.
          </>
        }
        acoes={
          <>
            <AoVivo />
            <EscolherPeriodo
              clientes={clientes}
              cliente={cliente}
              periodos={periodos}
              periodoId={periodo.id}
              comValor={serie.map((s) => s.periodo_id)}
            />
            <Link href={relatorio(TODAS)} className={ESTILO_BOTAO.contorno}>
              Relatório / PDF
            </Link>
            <Link href={lancar} className={ESTILO_BOTAO.primario}>
              Lançar medições
            </Link>
          </>
        }
      />
      <AbasDoPainel atual="cliente" />

      {/* O mês aberto e ainda sem lançamento: o painel é leitura, e o atalho
          leva para onde se lança. */}
      {celulas.every((c) => !c.medido && !c.faturado) && (
        <Aviso tom="ok">
          {periodo.rotulo} está aberto e ainda sem lançamento — por enquanto o painel mostra só o
          saldo que veio do mês anterior. O painel é só leitura:{" "}
          <Link href={lancar} className="font-semibold underline">
            lançar as medições de {periodo.rotulo}
          </Link>
          .
        </Aviso>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador
          compacto
          rotulo={antes ? `Saldo de ${antes.rotulo}` : "Saldo anterior"}
          valor={emReais(r.anterior)}
          detalhe="veio do mês anterior"
        />
        <CartaoIndicador
          compacto
          rotulo="Medido no mês"
          valor={emReais(r.medido)}
          cor="bg-acento"
          detalhe={antes ? variacao(r.medido, antes.medido) : undefined}
        />
        <CartaoIndicador
          compacto
          rotulo="Faturado no mês"
          valor={emReais(r.faturado)}
          cor="bg-disponivel"
          detalhe={r.fracao === null ? undefined : `${emPorcento(r.fracao)} do que havia a faturar`}
        >
          <Progresso fracao={r.fracao} cor="bg-disponivel" />
        </CartaoIndicador>
        <CartaoIndicador
          compacto
          rotulo="Saldo a faturar"
          valor={<span className="text-saldo">{emReais(r.saldo)}</span>}
          cor="bg-saldo"
          detalhe={antes ? variacao(r.saldo, antes.saldo) : "passa para o mês seguinte"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {CATEGORIAS.map((c) => cartaoDaCategoria(c, r.categorias[c]))}
      </div>

      {/* ── Recebimento e idade do que está em aberto ─────── */}
      {acompanha ? (
        <NumerosDoRecebimento
          r={rec}
          anterior={antes?.rotulo ?? null}
          ehInicio={periodo.mes === inicioRecebimento}
          lancar={receber}
        />
      ) : (
        <Aviso tom="ok">
          O recebimento de {cliente} ainda não é acompanhado aqui.{" "}
          <Link href={receber} className="font-semibold underline">
            Lançar recebimentos
          </Link>{" "}
          — o financeiro escolhe o mês de início e informa o que já estava a receber.
        </Aviso>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <IdadeDoAberto
          titulo="Idade do saldo a faturar"
          descricao="De que mês é o medido que ainda não virou nota"
          parcelas={idadeDoAberto(historia, periodos, periodo.mes, "faturar")}
          ate={periodo.mes}
        />
        {acompanha && (
          <IdadeDoAberto
            titulo="Idade do a receber"
            descricao="De que mês é a nota que ainda não virou dinheiro"
            parcelas={idadeDoAberto(historia, periodos, periodo.mes, "receber")}
            ate={periodo.mes}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Evolução" descricao="Medido e faturado de cada mês, e o saldo que ficou">
          <GraficoEvolucao serie={serie} selecionado={periodo.id} />
        </Painel>
        <Painel titulo="Saldo a faturar por região" descricao={`${periodo.rotulo} · maior → menor`}>
          <BarrasDeSaldo linhas={saldoPorRegiao(r)} />
        </Painel>
      </div>

      <Painel
        titulo="Por região"
        descricao={`Saldo de cada categoria em ${periodo.rotulo} — clique na região para o relatório dela`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] text-left text-xs tabular-nums">
            <thead className="text-texto-3">
              <tr className="border-b border-borda">
                <th className="px-4 py-2 font-medium">Região</th>
                {CATEGORIAS.map((c) => (
                  <th key={c} className="py-2 pr-3 text-right font-medium">
                    <span className={`mr-1 inline-block size-2 rounded-full ${COR[c]}`} />
                    {ROTULO_CATEGORIA[c]}
                  </th>
                ))}
                <th className="py-2 pr-3 text-right font-medium">Saldo ant.</th>
                <th className="py-2 pr-3 text-right font-medium">Medido</th>
                <th className="py-2 pr-3 text-right font-medium">Faturado</th>
                <th className="py-2 pr-3 text-right font-medium">Saldo</th>
                <th className="py-2 pr-4 text-right font-medium">% fat.</th>
              </tr>
            </thead>
            <tbody>
              {r.regioes.map((l) => (
                <tr key={l.regiao} className="border-b border-borda/50">
                  <td className="px-4 py-2 font-medium">
                    <Link href={relatorio(l.regiao)} className="hover:text-acento hover:underline">
                      {l.regiao}
                    </Link>
                  </td>
                  {CATEGORIAS.map((c) => (
                    <td key={c} className="py-2 pr-3 text-right text-texto-2">
                      {temValor(l.categorias[c])
                        ? emReais(l.categorias[c].saldo)
                        : "—"}
                    </td>
                  ))}
                  <td className="py-2 pr-3 text-right text-texto-2">{emReais(l.anterior)}</td>
                  <td className="py-2 pr-3 text-right">{emReais(l.medido)}</td>
                  <td className="py-2 pr-3 text-right">{emReais(l.faturado)}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-saldo">{emReais(l.saldo)}</td>
                  <td className="py-2 pr-4 text-right">
                    <PorCento fracao={l.fracao} />
                  </td>
                </tr>
              ))}
              <tr className="bg-superficie-2 font-semibold">
                <td className="px-4 py-2">TOTAL</td>
                {CATEGORIAS.map((c) => (
                  <td key={c} className="py-2 pr-3 text-right">
                    {emReais(r.categorias[c].saldo)}
                  </td>
                ))}
                <td className="py-2 pr-3 text-right">{emReais(r.anterior)}</td>
                <td className="py-2 pr-3 text-right">{emReais(r.medido)}</td>
                <td className="py-2 pr-3 text-right">{emReais(r.faturado)}</td>
                <td className="py-2 pr-3 text-right text-saldo">{emReais(r.saldo)}</td>
                <td className="py-2 pr-4 text-right">
                  <PorCento fracao={r.fracao} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Painel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel
          titulo="Relatório por base"
          descricao="O resumo de uma região, pronto para mandar"
          acoes={
            <Link href={relatorio(TODAS)} className="text-xs font-semibold text-acento underline">
              Relatório completo em PDF
            </Link>
          }
        >
          <RecadoDaBase cliente={cliente} rotulo={periodo.rotulo} regioes={r.regioes} periodoId={periodo.id} />
        </Painel>
      </div>


        <Painel titulo="Histórico" descricao="Mês a mês: o saldo de cada um é o anterior do seguinte">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="text-texto-3">
                <tr className="border-b border-borda">
                  <th className="px-4 py-2 font-medium">Período</th>
                  <th className="py-2 pr-3 text-right font-medium">Saldo ant.</th>
                  <th className="py-2 pr-3 text-right font-medium">Medido</th>
                  <th className="py-2 pr-3 text-right font-medium">Faturado</th>
                  <th className="py-2 pr-3 text-right font-medium">Saldo</th>
                  <th className="py-2 pr-4 text-right font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {[...serie].reverse().map((s) => {
                  const fracao = s.aFaturar > 0 ? s.faturado / s.aFaturar : null;
                  const faixa = faixaDoFaturado(fracao);
                  const atual = s.periodo_id === periodo.id;
                  return (
                    <tr
                      key={s.periodo_id}
                      className={`border-b border-borda/50 ${atual ? "bg-acento-fraco" : ""}`}
                    >
                      <td className="px-4 py-1.5">
                        <Link
                          href={`/controle?cliente=${encodeURIComponent(cliente)}&periodo=${s.periodo_id}`}
                          className="font-medium hover:underline"
                        >
                          {s.rotulo}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3 text-right text-texto-2">{emReais(s.anterior)}</td>
                      <td className="py-1.5 pr-3 text-right">{emReais(s.medido)}</td>
                      <td className="py-1.5 pr-3 text-right">{emReais(s.faturado)}</td>
                      <td className="py-1.5 pr-3 text-right font-semibold text-saldo">
                        {emReais(s.saldo)}
                      </td>
                      <td className="py-1.5 pr-4 text-right">
                        <Selo tom={TOM_FAIXA[faixa]}>
                          {ROTULO_FAIXA[faixa]} · {fracao === null ? "—" : emPorcento(fracao)}
                        </Selo>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>
    </div>
  );
}
