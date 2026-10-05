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
  ESTILO_BOTAO,
  Painel,
  Selo,
  Vazio,
} from "@/components/ui";
import {
  ROTULO_PENDENCIA,
  diasDesde,
  haQuanto,
  ordenarAbertos,
  type BoletimAberto,
  type OmsDoAberto,
  type OrdemDosAbertos,
  type Pendencia,
  type TipoDePendencia,
} from "@/lib/medicoes/abertos";
import { daBase, ordemDaReferencia, rotuloDaReferencia } from "@/lib/medicoes/arquivo";
import { regionalDoBoletim, type Base } from "@/lib/medicoes/bases";
import { emReais } from "@/lib/medicoes/dinheiro";
import { chaveDoCliente } from "@/lib/medicoes/medicoes";
import { dataCurta, periodo } from "../../formato";

type Aberto = BoletimAberto & { pendencias: Pendencia[] };

/** "GRANDE DIÂMETRO" → "Grande Diâmetro"; sigla ("VCG") fica como está. */
function rotuloDaRegional(r: string): string {
  if (!r) return "Sem regional";
  if (/^[A-Z]{2,4}$/.test(r) && !/[AEIOU]/.test(r)) return r;
  return r
    .toLowerCase()
    .split(" ")
    .map((p) => (/^(i|ii|iii|iv)$/.test(p) ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

type FiltroDePendencia = "todos" | "atencao" | "em_dia" | TipoDePendencia;

/**
 * Os BMs em aberto, todos de uma vez: por regional, cada base num cartão, com
 * o que ela pede antes de fechar. É a conferência do mês que se lança aos
 * poucos — quem cola é a tela inicial.
 */
export function QuadroDosAbertos({
  abertos,
  oms,
  bases,
  mesCorrente,
  ordemDasRegionais,
  hoje,
}: {
  abertos: Aberto[];
  oms: Record<number, OmsDoAberto>;
  bases: Base[];
  mesCorrente: number;
  ordemDasRegionais: string[];
  /** O instante da leitura, do servidor: o "há 3 dias" não muda na hidratação. */
  hoje: string;
}) {
  const mapaDeOms = new Map(Object.entries(oms).map(([k, v]) => [Number(k), v]));
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<OrdemDosAbertos>("base");
  const [mes, setMes] = useState<string>("todos");
  const [pendencia, setPendencia] = useState<FiltroDePendencia>("todos");
  const [cliente, setCliente] = useState("");
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());

  const clientes = [...new Map(abertos.map((b) => [chaveDoCliente(b.cliente), b.cliente])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1], "pt-BR"),
  );
  const variosClientes = clientes.length > 1;

  // Cliente e busca recortam primeiro; os chips contam dentro do recorte.
  const doRecorte = abertos.filter(
    (b) => (cliente === "" || chaveDoCliente(b.cliente) === cliente) && daBase(b.base, busca),
  );
  const meses = [...new Set(doRecorte.map((b) => ordemDaReferencia(b.referencia)))].sort((a, b) =>
    a === 0 ? 1 : b === 0 ? -1 : b - a,
  );
  const doMes = doRecorte.filter((b) => mes === "todos" || ordemDaReferencia(b.referencia) === Number(mes));
  const tipos = (Object.keys(ROTULO_PENDENCIA) as TipoDePendencia[]).filter((t) =>
    doMes.some((b) => b.pendencias.some((p) => p.tipo === t)),
  );
  const passa = (b: Aberto, f: FiltroDePendencia) =>
    f === "todos"
      ? true
      : f === "atencao"
        ? b.pendencias.length > 0
        : f === "em_dia"
          ? b.pendencias.length === 0
          : b.pendencias.some((p) => p.tipo === f);
  const visiveis = doMes.filter((b) => passa(b, pendencia));

  const regionais = new Map<string, Aberto[]>();
  for (const b of visiveis) {
    const r = regionalDoBoletim(b, bases);
    regionais.set(r, [...(regionais.get(r) ?? []), b]);
  }
  const posicao = (r: string) => {
    const i = ordemDasRegionais.findIndex((o) => o.toUpperCase() === r.toUpperCase());
    return r === "" ? 1e6 : i < 0 ? 1e5 : i;
  };
  const grupos = [...regionais.entries()]
    .sort((a, b) => posicao(a[0]) - posicao(b[0]) || a[0].localeCompare(b[0]))
    .map(([regional, lista]) => ({ regional, lista: ordenarAbertos(lista, ordem, mapaDeOms) }));

  const totalOms = doMes.reduce((t, b) => t + b.oms, 0);
  const semValor = doMes.reduce((t, b) => t + (mapaDeOms.get(b.id)?.semValor ?? 0), 0);
  const pedem = doMes.filter((b) => b.pendencias.length > 0).length;
  const basesDistintas = new Set(doMes.map((b) => `${chaveDoCliente(b.cliente)}|${b.base?.trim().toUpperCase()}`)).size;

  const alternar = (r: string) =>
    setRecolhidas((s) => {
      const n = new Set(s);
      if (n.has(r)) n.delete(r);
      else n.add(r);
      return n;
    });
  const todasRecolhidas = grupos.length > 0 && grupos.every((g) => recolhidas.has(g.regional));

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="BMs em aberto"
        resumo="Os boletins que estão recebendo OMs, um por base, até o fechamento. Por regional, e cada cartão diz o que falta conferir antes de fechar. Para incluir OMs, cole do Sisloc na tela de lançamento."
        acoes={
          <Link href="/" className={ESTILO_BOTAO.contorno}>
            Colar do Sisloc
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador
          compacto
          rotulo="Em aberto"
          valor={doMes.length}
          detalhe={`${basesDistintas} base(s)${mesCorrente ? ` · lançando ${rotuloDaReferencia(mesCorrente)}` : ""}`}
          cor="bg-acento"
        />
        <CartaoIndicador
          compacto
          rotulo="OMs"
          valor={totalOms}
          detalhe={semValor ? `${semValor} sem valor` : "todas com valor"}
          cor="bg-expedicao"
        />
        <CartaoIndicador
          compacto
          rotulo="Em medição"
          valor={emReais(doMes.reduce((t, b) => t + b.valor, 0), false)}
          detalhe="ainda pode mudar até fechar"
          cor="bg-disponivel"
        />
        <CartaoIndicador
          compacto
          rotulo="Pedem atenção"
          valor={pedem}
          detalhe={pedem ? "veja o rodapé de cada cartão" : "nenhum: tudo em dia"}
          cor="bg-manutencao"
          destaque={pedem > 0}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Base" className="w-full max-w-sm">
            <div className="flex gap-2">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Parte do nome — maricá, vcg, gávea…"
                aria-label="Filtrar por base"
                className={`${CAMPO} w-full`}
              />
              {busca && (
                <Botao variante="discreto" onClick={() => setBusca("")}>
                  Limpar
                </Botao>
              )}
            </div>
          </Campo>
          {variosClientes && (
            <Campo rotulo="Cliente" className="w-full sm:w-72">
              <select value={cliente} onChange={(e) => setCliente(e.target.value)} className={`${CAMPO} w-full`}>
                <option value="">Todos os clientes</option>
                {clientes.map(([chave, nome]) => (
                  <option key={chave} value={chave}>
                    {nome}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <Campo rotulo="Ordem dentro da regional" className="w-full sm:w-56">
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as OrdemDosAbertos)}
              className={`${CAMPO} w-full`}
            >
              <option value="base">Base (A–Z)</option>
              <option value="valor">Maior valor</option>
              <option value="parado">Parado há mais tempo</option>
            </select>
          </Campo>
          {grupos.length > 1 && (
            <Botao
              variante="discreto"
              className="ml-auto"
              onClick={() => setRecolhidas(todasRecolhidas ? new Set() : new Set(grupos.map((g) => g.regional)))}
            >
              {todasRecolhidas ? "Abrir todas" : "Recolher todas"}
            </Botao>
          )}
        </div>

        {meses.length > 1 && (
          <Chips
            rotulo="Mês de referência"
            valor={mes}
            aoMudar={setMes}
            opcoes={[
              { valor: "todos", rotulo: "Todos os meses", contagem: doRecorte.length },
              ...meses.map((m) => ({
                valor: String(m),
                rotulo: rotuloDaReferencia(m),
                contagem: doRecorte.filter((b) => ordemDaReferencia(b.referencia) === m).length,
              })),
            ]}
          />
        )}

        <Chips
          rotulo="O que pedem"
          valor={pendencia}
          aoMudar={setPendencia}
          opcoes={[
            { valor: "todos" as FiltroDePendencia, rotulo: "Todos", contagem: doMes.length },
            { valor: "atencao", rotulo: "Pedem atenção", contagem: pedem },
            { valor: "em_dia", rotulo: "Em dia", contagem: doMes.length - pedem },
            ...tipos.map((t) => ({
              valor: t as FiltroDePendencia,
              rotulo: ROTULO_PENDENCIA[t],
              contagem: doMes.filter((b) => passa(b, t)).length,
            })),
          ]}
        />

        {abertos.length === 0 ? (
          <Vazio>Nenhum boletim aberto. Cole as OMs do Sisloc na tela de lançamento para abrir o do mês.</Vazio>
        ) : grupos.length === 0 ? (
          <Vazio>Nenhum boletim aberto neste recorte.</Vazio>
        ) : (
          grupos.map((g) => {
            const pedemAqui = g.lista.filter((b) => b.pendencias.length > 0).length;
            return (
              <Painel
                key={g.regional}
                titulo={rotuloDaRegional(g.regional)}
                descricao={`${g.lista.length} BM(s) aberto(s) · ${g.lista.reduce((t, b) => t + b.oms, 0)} OM(s)${
                  pedemAqui ? ` · ${pedemAqui} pede(m) atenção` : ""
                }`}
                recolhido={recolhidas.has(g.regional)}
                aoRecolher={() => alternar(g.regional)}
                acoes={
                  <span className="text-sm font-semibold tabular-nums">
                    {emReais(g.lista.reduce((t, b) => t + b.valor, 0), false)}
                  </span>
                }
              >
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {g.lista.map((b) => (
                    <CartaoDoAberto
                      key={b.id}
                      b={b}
                      oms={mapaDeOms.get(b.id)}
                      comCliente={variosClientes}
                      hoje={hoje}
                    />
                  ))}
                </div>
              </Painel>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Um BM aberto em cartão: o que tem e o que pede. Também na pasta da base. */
export function CartaoDoAberto({
  b,
  oms,
  comCliente,
  hoje,
}: {
  b: Aberto;
  oms: OmsDoAberto | undefined;
  comCliente: boolean;
  /** O instante da leitura, do servidor. */
  hoje: string;
}) {
  const agora = new Date(hoje);
  const ultima = oms?.ultimaInclusao ?? null;
  const documento = b.documento?.trim() ? `Nº ${b.documento.trim()}` : b.numero;
  return (
    <CartaoDoQuadro
      href={`/boletins/${b.id}`}
      titulo={b.base?.trim() || "Sem base"}
      subtitulo={[documento, b.referencia?.trim() || "sem mês", comCliente ? b.cliente : null]
        .filter(Boolean)
        .join(" · ")}
      selo={
        b.pendencias.length ? (
          <Selo tom="aviso">{b.pendencias.length} a ver</Selo>
        ) : (
          <Selo tom="ok">Em dia</Selo>
        )
      }
      linhas={[
        {
          rotulo: "OMs",
          valor: oms?.semValor ? `${b.oms} · ${oms.semValor} sem valor` : b.oms,
        },
        { rotulo: "Período das OMs", valor: periodo(b.primeira_om, b.ultima_om) },
        {
          rotulo: "Última OM incluída",
          valor: ultima ? `${dataCurta(ultima).slice(0, 5)} · ${haQuanto(diasDesde(ultima, agora))}` : "—",
        },
        ...(b.contato?.trim() ? [{ rotulo: "Responsável", valor: b.contato.trim() }] : []),
      ]}
      destaque={{ rotulo: "Em medição", valor: emReais(b.valor) }}
      rodape={
        b.pendencias.length ? (
          <ul className="space-y-0.5">
            {b.pendencias.map((p) => (
              <li key={p.tipo} className="font-medium text-manutencao">
                {p.texto}
              </li>
            ))}
          </ul>
        ) : undefined
      }
    />
  );
}
