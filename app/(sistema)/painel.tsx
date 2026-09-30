"use client";

import Link from "next/link";
import { useState } from "react";
import { Cabecalho, CartaoIndicador, Chips, Painel, Selo, Vazio } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  ROTULO_SITUACAO,
  SITUACOES,
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
  const conta = (s: SituacaoBoletim) => boletins.filter((b) => b.situacao === s).length;
  const abertos = boletins.filter((b) => b.situacao === "aberto");
  const visiveis = filtro === "todos" ? boletins : boletins.filter((b) => b.situacao === filtro);
  const clientes = [...porCliente].sort(
    (a, b) => b.saldo + b.em_medicao - (a.saldo + a.em_medicao) || a.cliente.localeCompare(b.cliente),
  );

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

      <Painel titulo="Por cliente" descricao="Medido, faturado e o saldo entre os dois.">
        {clientes.length === 0 ? (
          <p className="p-4 text-sm text-texto-3">
            Nenhum boletim ainda. Cole as OMs do Sisloc acima para abrir o primeiro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-xs text-texto-3">
                <tr className="border-b border-borda">
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="py-2 pr-3 text-right font-medium">Boletins</th>
                  <th className="py-2 pr-3 text-right font-medium">OMs</th>
                  <th className="py-2 pr-3 text-right font-medium">Em medição</th>
                  <th className="py-2 pr-3 text-right font-medium">Medido</th>
                  <th className="py-2 pr-3 text-right font-medium">Faturado</th>
                  <th className="py-2 pr-4 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {clientes.map((c) => (
                  <tr key={c.cliente} className="border-b border-borda/50">
                    <td className="max-w-[18rem] truncate px-4 py-2" title={c.cliente}>
                      {c.cliente}
                    </td>
                    <td className="py-2 pr-3 text-right">{c.boletins}</td>
                    <td className="py-2 pr-3 text-right">{c.oms}</td>
                    <td className="py-2 pr-3 text-right text-texto-2">{emReais(c.em_medicao)}</td>
                    <td className="py-2 pr-3 text-right">{emReais(c.medido)}</td>
                    <td className="py-2 pr-3 text-right">{emReais(c.faturado)}</td>
                    <td
                      className={`py-2 pr-4 text-right font-semibold ${
                        c.saldo > 0 ? "text-manutencao" : ""
                      }`}
                    >
                      {emReais(c.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>

      <div className="space-y-3">
        <Chips
          rotulo="Situação do boletim"
          valor={filtro}
          aoMudar={setFiltro}
          opcoes={[
            { valor: "todos", rotulo: "Todos", contagem: boletins.length },
            ...SITUACOES.map((s) => ({ valor: s, rotulo: ROTULO_SITUACAO[s], contagem: conta(s) })),
          ]}
        />

        {visiveis.length === 0 ? (
          <Vazio>Nenhum boletim nesta situação.</Vazio>
        ) : (
          <Painel>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="text-xs text-texto-3">
                  <tr className="border-b border-borda">
                    <th className="px-4 py-2 font-medium">Boletim</th>
                    <th className="py-2 pr-3 font-medium">Cliente / base</th>
                    <th className="py-2 pr-3 font-medium">Período das OMs</th>
                    <th className="py-2 pr-3 text-right font-medium">OMs</th>
                    <th className="py-2 pr-3 text-right font-medium">Valor</th>
                    <th className="py-2 pr-4 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((b) => (
                    <tr key={b.id} className="border-b border-borda/50 hover:bg-superficie-2">
                      <td className="px-4 py-2">
                        <Link href={`/boletins/${b.id}`} className="font-semibold text-acento">
                          {b.numero}
                        </Link>
                        {b.referencia && (
                          <span className="block text-xs text-texto-3">{b.referencia}</span>
                        )}
                      </td>
                      <td className="max-w-[18rem] py-2 pr-3">
                        <span className="block truncate" title={b.cliente}>
                          {b.cliente}
                        </span>
                        {b.base && (
                          <span className="block truncate text-xs text-texto-3" title={b.base}>
                            {b.base}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-texto-2">
                        {periodo(b.primeira_om, b.ultima_om)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{b.oms}</td>
                      <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                        {emReais(b.valor)}
                      </td>
                      <td className="py-2 pr-4">
                        <Selo tom={TOM_SITUACAO[b.situacao]}>{ROTULO_SITUACAO[b.situacao]}</Selo>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Painel>
        )}
      </div>
    </div>
  );
}
