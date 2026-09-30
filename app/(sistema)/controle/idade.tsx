import Link from "next/link";
import { CartaoIndicador, Painel, Progresso } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  ROTULO_FAIXA,
  faixaDaIdade,
  porFaixa,
  type Faixa,
  type ParcelaEmAberto,
  type Recebimento,
} from "@/lib/medicoes/controle";

// A cor diz a idade: verde é do mês, e vai esquentando até o vermelho do que
// passou de três meses — o que alguém já devia ter cobrado.
const COR_FAIXA: Record<Faixa, string> = {
  mes: "bg-disponivel",
  um: "bg-reservado",
  dois: "bg-saldo",
  velho: "bg-manutencao",
};
const TEXTO_FAIXA: Record<Faixa, string> = {
  mes: "text-disponivel",
  um: "text-reservado",
  dois: "text-saldo",
  velho: "text-manutencao",
};
const FAIXAS: Faixa[] = ["mes", "um", "dois", "velho"];

/**
 * A idade do que está em aberto: quanto é de cada mês. O que foi faturado (ou
 * recebido) abate primeiro o mais antigo, que é como se cobra.
 */
export function IdadeDoAberto({
  titulo,
  descricao,
  parcelas,
  ate,
}: {
  titulo: string;
  descricao: string;
  parcelas: ParcelaEmAberto[];
  ate: string;
}) {
  // O total bate com o saldo: o crédito (faturado a mais) entra negativo.
  const total = parcelas.reduce((t, p) => t + p.valor, 0);
  const faixas = porFaixa(parcelas, ate);
  const comIdade = parcelas.filter((p) => !p.credito).reduce((t, p) => t + p.valor, 0);
  return (
    <Painel titulo={titulo} descricao={descricao} acoes={<span className="text-sm font-semibold tabular-nums">{emReais(total)}</span>}>
      {comIdade <= 0 ? (
        <p className="p-4 text-sm text-texto-3">Nada em aberto.</p>
      ) : (
        <div className="space-y-4 p-4">
          {/* A barra das faixas: a largura é o dado. */}
          <div className="flex h-3 overflow-hidden rounded-full bg-superficie-3">
            {FAIXAS.map((f) =>
              faixas[f] > 0 ? (
                <span
                  key={f}
                  className={COR_FAIXA[f]}
                  style={{ width: `${(faixas[f] / comIdade) * 100}%` }}
                  title={`${ROTULO_FAIXA[f]}: ${emReais(faixas[f])}`}
                />
              ) : null,
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FAIXAS.map((f) => (
              <div key={f} className="rounded-lg border border-borda p-2">
                <p className="flex items-center gap-1.5 text-[11px] text-texto-3">
                  <span className={`size-2 rounded-full ${COR_FAIXA[f]}`} />
                  {ROTULO_FAIXA[f]}
                </p>
                <p className={`mt-0.5 text-sm font-semibold tabular-nums ${faixas[f] > 0 ? TEXTO_FAIXA[f] : "text-texto-3"}`}>
                  {emReais(faixas[f], false)}
                </p>
              </div>
            ))}
          </div>
          <ul className="divide-y divide-borda text-xs">
            {parcelas.map((p) => {
              if (p.credito) {
                return (
                  <li key={p.mes} className="flex items-center gap-2 py-1.5 text-texto-2">
                    <span className="size-2 rounded-full bg-borda-forte" />
                    <span className="flex-1">{p.rotulo}</span>
                    <span className="text-texto-3">abate o total</span>
                    <span className="w-28 text-right font-semibold tabular-nums">{emReais(p.valor)}</span>
                  </li>
                );
              }
              const f = faixaDaIdade(p.mes, ate);
              return (
                <li key={p.mes} className="flex items-center gap-2 py-1.5">
                  <span className={`size-2 rounded-full ${COR_FAIXA[f]}`} />
                  <span className="flex-1">{p.rotulo}</span>
                  <span className="text-texto-3">{ROTULO_FAIXA[f]}</span>
                  <span className="w-28 text-right font-semibold tabular-nums">{emReais(p.valor)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Painel>
  );
}

/** Os quatro números do recebimento no mês. */
export function NumerosDoRecebimento({
  r,
  anterior,
  ehInicio,
  lancar,
}: {
  r: Recebimento;
  /** No mês de início o "anterior" é a abertura informada pelo financeiro. */
  ehInicio: boolean;
  /** O rótulo do mês anterior, para o primeiro cartão. */
  anterior: string | null;
  lancar: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Recebimento · financeiro</h2>
        <Link href={lancar} className="text-xs font-semibold text-acento underline">
          Lançar recebimentos
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador
          compacto
          rotulo={ehInicio ? "A receber na abertura" : anterior ? `A receber de ${anterior}` : "A receber anterior"}
          valor={emReais(r.anterior)}
          detalhe={ehInicio ? "o que já estava em aberto no início" : "notas emitidas e ainda não pagas"}
        />
        <CartaoIndicador compacto rotulo="Faturado no mês" valor={emReais(r.faturado)} cor="bg-acento" />
        <CartaoIndicador compacto rotulo="Recebido no mês" valor={emReais(r.recebido)} cor="bg-disponivel">
          <Progresso fracao={r.fracao} cor="bg-disponivel" />
        </CartaoIndicador>
        <CartaoIndicador
          compacto
          rotulo="A receber"
          valor={<span className="text-saldo">{emReais(r.aReceber)}</span>}
          cor="bg-saldo"
          detalhe="passa para o mês seguinte"
        />
      </div>
    </div>
  );
}
