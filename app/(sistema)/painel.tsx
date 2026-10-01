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
  SoLeitura,
  Vazio,
} from "@/components/ui";
import { basesDosBoletins, boletinsPorBase, daBase, doMes, mesesDosBoletins } from "@/lib/medicoes/arquivo";
import type { Base } from "@/lib/medicoes/bases";
import { quemLanca } from "@/lib/medicoes/papeis";
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
  bases = [],
  podeMexer = true,
  mesInicial = null,
}: {
  boletins: BoletimAtual[];
  porCliente: SaldoLido[];
  jaMedidas: Record<string, string>;
  /** O cadastro de bases, para a colagem mostrar o que o boletim novo puxa. */
  bases?: Base[];
  /** O papel é do time que lança boletim (a 0011). Quem não é, só lê. */
  podeMexer?: boolean;
  /** O mês que veio no endereço (`?mes=202608`): voltar do boletim não perde o filtro. */
  mesInicial?: number | null;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const soma = (f: (c: SaldoLido) => number) => porCliente.reduce((t, c) => t + f(c), 0);
  const conta = (s: SituacaoBoletim, lista = boletins) => lista.filter((b) => b.situacao === s).length;
  const abertos = boletins.filter((b) => b.situacao === "aberto");
  const [base, setBase] = useState("");
  // O mês de referência do boletim (o "AGOSTO/2026" do papel). Nulo: todos.
  const [mes, setMesNoEstado] = useState<number | null>(mesInicial);
  const setMes = (m: number | null) => {
    setMesNoEstado(m);
    const url = new URL(window.location.href);
    if (m === null) url.searchParams.delete("mes");
    else url.searchParams.set("mes", String(m));
    window.history.replaceState(null, "", url);
  };
  const meses = mesesDosBoletins(boletins);
  // Mês e base filtram primeiro: a contagem das situações e os números do
  // topo são os do recorte escolhido.
  const daBaseEscolhida = boletins.filter((b) => doMes(b.referencia, mes) && daBase(b.base, base));
  const recortado = mes !== null || base !== "";
  const visiveis =
    filtro === "todos" ? daBaseEscolhida : daBaseEscolhida.filter((b) => b.situacao === filtro);
  const nomesDasBases = basesDosBoletins(boletins);
  const basesVisiveis = new Set(daBaseEscolhida.map((b) => b.base?.trim())).size;
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());

  // Um painel por cliente, os boletins por base dentro dele. O saldo do
  // cabeçalho é o do cliente inteiro, não só do filtro.
  // Com mês ou base filtrados, o cabeçalho diz o saldo do recorte.
  const saldos = saldoPorCliente(recortado ? daBaseEscolhida : boletins);
  // Sem recorte, o topo vem da view (`por_cliente`); com recorte, da mesma
  // conta feita só com os boletins escolhidos.
  const doRecorte = saldoPorCliente(daBaseEscolhida);
  const topo = recortado
    ? {
        emMedicao: doRecorte.reduce((t, c) => t + c.emMedicao, 0),
        medido: doRecorte.reduce((t, c) => t + c.medido, 0),
        faturado: doRecorte.reduce((t, c) => t + c.faturado, 0),
        saldo: doRecorte.reduce((t, c) => t + c.saldo, 0),
      }
    : {
        emMedicao: soma((c) => c.em_medicao),
        medido: soma((c) => c.medido),
        faturado: soma((c) => c.faturado),
        saldo: soma((c) => c.saldo),
      };
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
          valor={emReais(topo.emMedicao, false)}
          detalhe={`${conta("aberto", daBaseEscolhida)} boletim(ns) aberto(s)`}
          cor="bg-acento"
        />
        <CartaoIndicador
          rotulo="Medido"
          valor={emReais(topo.medido, false)}
          detalhe="fechado, enviado ou faturado"
          cor="bg-expedicao"
        />
        <CartaoIndicador
          rotulo="Faturado"
          valor={emReais(topo.faturado, false)}
          detalhe={`${conta("faturado", daBaseEscolhida)} boletim(ns)`}
          cor="bg-disponivel"
        />
        <CartaoIndicador
          rotulo="Saldo a faturar"
          valor={emReais(topo.saldo, false)}
          detalhe="medido e ainda não faturado"
          cor="bg-manutencao"
        />
      </div>

      {podeMexer ? (
        <ColarDoSisloc abertos={abertos} jaMedidas={jaMedidas} bases={bases} todos={boletins} />
      ) : (
        <SoLeitura>
          Você vê os boletins, mas quem cola do Sisloc e lança é {quemLanca("boletim")}.
        </SoLeitura>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Mês de referência" className="w-full sm:w-56">
            <select
              value={mes ?? ""}
              onChange={(e) => setMes(e.target.value === "" ? null : Number(e.target.value))}
              className={`${CAMPO} w-full`}
            >
              <option value="">Todos os meses</option>
              {meses.map((m) => (
                <option key={m.chave} value={m.chave}>
                  {m.rotulo} ({m.boletins})
                </option>
              ))}
            </select>
          </Campo>
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
              {nomesDasBases.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Campo>
          {recortado && (
            <p className="pb-2 text-xs text-texto-3">
              {daBaseEscolhida.length} boletim(ns) em {basesVisiveis} base(s) · os números do topo
              são deste recorte
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
          <Vazio>
            {recortado
              ? `Nenhum boletim ${mes !== null ? `de ${meses.find((m) => m.chave === mes)?.rotulo ?? "este mês"}` : ""}${
                  base ? ` com a base "${base}"` : ""
                } nesta situação.`
              : "Nenhum boletim nesta situação."}
          </Vazio>
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
