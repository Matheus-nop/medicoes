"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Botao,
  CAMPO,
  Cabecalho,
  Campo,
  CartaoDoQuadro,
  CartaoIndicador,
  Chips,
  Painel,
  Selo,
  Vazio,
} from "@/components/ui";
import { basesDosBoletins, boletinsPorBase, daBase } from "@/lib/medicoes/arquivo";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  ROTULO_SITUACAO,
  SITUACOES,
  chaveDoCliente,
  documentoDoBoletim,
  saldoPorCliente,
  type BoletimAtual,
  type SituacaoBoletim,
} from "@/lib/medicoes/medicoes";
import { ColarDoSisloc } from "./colar";
import { periodo } from "./formato";

/** Uma linha de `por_cliente`. */
export interface SaldoLido {
  cliente: string;
  boletins: number;
  oms: number;
  em_medicao: number;
  medido: number;
  faturado: number;
  saldo: number;
  ultimo_boletim: string;
}

export const TOM_SITUACAO: Record<SituacaoBoletim, "acento" | "neutro" | "transito" | "ok"> = {
  aberto: "acento",
  fechado: "neutro",
  enviado: "transito",
  faturado: "ok",
};

type Filtro = SituacaoBoletim | "todos";

/**
 * As medições: o que está sendo medido, o que foi apresentado ao cliente, o
 * que já virou fatura — e o saldo entre os dois, por cliente.
 */
export function Medicoes({
  boletins,
  porCliente,
  jaMedidas,
}: {
  boletins: BoletimAtual[];
  porCliente: SaldoLido[];
  jaMedidas: Record<string, string>;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const soma = (f: (c: SaldoLido) => number) => porCliente.reduce((t, c) => t + f(c), 0);
  const conta = (s: SituacaoBoletim, lista = boletins) => lista.filter((b) => b.situacao === s).length;
  const abertos = boletins.filter((b) => b.situacao === "aberto");
  const [base, setBase] = useState("");
  // A base filtra primeiro: a contagem das situações é a das bases escolhidas.
  const daBaseEscolhida = boletins.filter((b) => daBase(b.base, base));
  const visiveis =
    filtro === "todos" ? daBaseEscolhida : daBaseEscolhida.filter((b) => b.situacao === filtro);
  const bases = basesDosBoletins(boletins);
  const basesVisiveis = new Set(daBaseEscolhida.map((b) => b.base?.trim())).size;
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());

  // Um painel por cliente, os boletins por base dentro dele. O saldo do
  // cabeçalho é o do cliente inteiro, não só do filtro.
  // Com a base filtrada, o cabeçalho diz o saldo das bases escolhidas.
  const saldos = saldoPorCliente(base ? daBaseEscolhida : boletins);
  const clientes = [...new Set(visiveis.map((b) => chaveDoCliente(b.cliente)))]
    .map((chave) => {
      const doCliente = visiveis.filter((b) => chaveDoCliente(b.cliente) === chave);
      const saldo = saldos.find((x) => chaveDoCliente(x.cliente) === chave)!;
      return { chave, nome: saldo.cliente, saldo, boletins: doCliente, bases: boletinsPorBase(doCliente) };
    })
    .sort((a, b) => b.saldo.saldo + b.saldo.emMedicao - (a.saldo.saldo + a.saldo.emMedicao));

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Lançar medições de manutenção"
        resumo="Time de orçamento. Um boletim por cliente e base: cole as OMs do Sisloc, confira o valor, feche e mande ao cliente. O painel de medições é lançado à parte, pelo faturamento."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador
          rotulo="Em medição"
          valor={emReais(soma((c) => c.em_medicao), false)}
          detalhe={`${conta("aberto")} boletim(ns) aberto(s)`}
          cor="bg-acento"
        />
        <CartaoIndicador
          rotulo="Medido"
          valor={emReais(soma((c) => c.medido), false)}
          detalhe="fechado, enviado ou faturado"
          cor="bg-expedicao"
        />
        <CartaoIndicador
          rotulo="Faturado"
          valor={emReais(soma((c) => c.faturado), false)}
          detalhe={`${conta("faturado")} boletim(ns)`}
          cor="bg-disponivel"
        />
        <CartaoIndicador
          rotulo="Saldo a faturar"
          valor={emReais(soma((c) => c.saldo), false)}
          detalhe="medido e ainda não faturado"
          cor="bg-manutencao"
        />
      </div>

      <ColarDoSisloc abertos={abertos} jaMedidas={jaMedidas} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Base" className="w-full max-w-md">
            <div className="flex gap-2">
              <input
                value={base}
                onChange={(e) => setBase(e.target.value)}
                list="bases-dos-boletins"
                placeholder="Digite parte do nome — belford, vcg, gávea…"
                aria-label="Filtrar por base"
                className={`${CAMPO} w-full`}
              />
              {base && (
                <Botao variante="discreto" onClick={() => setBase("")}>
                  Limpar
                </Botao>
              )}
            </div>
            <datalist id="bases-dos-boletins">
              {bases.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Campo>
          {base && (
            <p className="pb-2 text-xs text-texto-3">
              {daBaseEscolhida.length} boletim(ns) em {basesVisiveis} base(s)
            </p>
          )}
        </div>

        <Chips
          rotulo="Situação do boletim"
          valor={filtro}
          aoMudar={setFiltro}
          opcoes={[
            { valor: "todos", rotulo: "Todos", contagem: daBaseEscolhida.length },
            ...SITUACOES.map((s) => ({
              valor: s,
              rotulo: ROTULO_SITUACAO[s],
              contagem: conta(s, daBaseEscolhida),
            })),
          ]}
        />

        {boletins.length === 0 ? (
          <Vazio>Nenhum boletim ainda. Cole as OMs do Sisloc acima para abrir o primeiro.</Vazio>
        ) : clientes.length === 0 ? (
          <Vazio>{base ? `Nenhum boletim com a base "${base}" nesta situação.` : "Nenhum boletim nesta situação."}</Vazio>
        ) : (
          clientes.map((c) => {
            const fechado = recolhidos.has(c.chave);
            return (
              <Painel
                key={c.chave}
                titulo={c.nome}
                descricao={`${c.boletins.length} boletim(ns) · ${c.bases.length} base(s)${
                  c.saldo.emMedicao ? ` · ${emReais(c.saldo.emMedicao)} em medição` : ""
                }`}
                recolhido={fechado}
                aoRecolher={() =>
                  setRecolhidos((r) => {
                    const n = new Set(r);
                    if (n.has(c.chave)) n.delete(c.chave);
                    else n.add(c.chave);
                    return n;
                  })
                }
                acoes={
                  <>
                    <span className="hidden text-xs text-texto-3 sm:inline">
                      medido {emReais(c.saldo.medido, false)} · faturado{" "}
                      {emReais(c.saldo.faturado, false)}
                    </span>
                    <span className="text-sm font-semibold text-saldo tabular-nums">
                      saldo {emReais(c.saldo.saldo, false)}
                    </span>
                    <Link
                      href={`/clientes/ficha?nome=${encodeURIComponent(c.nome)}`}
                      className="text-xs font-semibold text-acento underline"
                    >
                      Arquivo
                    </Link>
                  </>
                }
              >
                {/* Um quadro só por cliente: a base é o título do cartão, que é
                    o que se procura; o documento vem embaixo. */}
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {c.bases.flatMap((g) =>
                    g.boletins.map((b) => {
                      const apresentado = b.situacao !== "aberto";
                      const faturado = b.situacao === "faturado" ? b.valor : Number(b.faturado ?? 0);
                      return (
                        <CartaoDoQuadro
                          key={b.id}
                          href={`/boletins/${b.id}`}
                          titulo={g.base}
                          subtitulo={`${documentoDoBoletim(b)} · OMs de ${periodo(b.primeira_om, b.ultima_om)}`}
                          selo={<Selo tom={TOM_SITUACAO[b.situacao]}>{ROTULO_SITUACAO[b.situacao]}</Selo>}
                          linhas={[
                            { rotulo: "OMs", valor: b.oms },
                            { rotulo: "Valor", valor: emReais(b.valor) },
                            ...(apresentado ? [{ rotulo: "Faturado", valor: emReais(faturado) }] : []),
                          ]}
                          destaque={
                            apresentado ? { rotulo: "Saldo", valor: emReais(b.valor - faturado) } : undefined
                          }
                          fracao={apresentado ? (b.valor > 0 ? faturado / b.valor : null) : undefined}
                        />
                      );
                    }),
                  )}
                </div>
              </Painel>
            );
          })
        )}
      </div>
    </div>
  );
}
