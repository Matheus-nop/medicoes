"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Aviso,
  Botao,
  Cabecalho,
  CartaoIndicador,
  Chips,
  ESTILO_BOTAO,
  Painel,
  Progresso,
  ProgressoDuplo,
  Selo,
  SoLeitura,
} from "@/components/ui";
import { ROTULO_CATEGORIA, type Categoria } from "@/lib/medicoes/controle";
import {
  CONSUMO_DE_ATENCAO,
  ROTULO_ADITIVO,
  ROTULO_SITUACAO_CONTRATO,
  TOM_SITUACAO_CONTRATO,
  alertasDoContrato,
  consumoDoContrato,
  dataDoContrato,
  diasEntre,
  mesCurtoDe,
  projecaoDoCiclo,
  proximoReajuste,
  saldoDoContrato,
  situacaoDoContrato,
  type Aditivo,
  type ContratoAtual,
} from "@/lib/medicoes/contratos";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import { quemLanca } from "@/lib/medicoes/papeis";
import { apagarAditivo, apagarContrato } from "../acoes";
import { mesCurto } from "../cartao";
import { FormularioDoAditivo, FormularioDoContrato, camposDoContrato } from "../formulario";
import { BarrasDoMes, GraficoDoConsumo } from "./graficos";

/**
 * Um contrato. Em cima a conta do ciclo de hoje — valor, faturado, medido a
 * faturar e saldo —, e embaixo o andamento em gráfico, os ciclos e o mês a
 * mês. À esquerda o que aconteceu (os aditivos) e o cadastro; à direita a
 * vigência, o ritmo e o reajuste.
 */
export function Contrato({
  contrato: c,
  aditivos,
  clientes,
  hoje,
  podeMexer,
  ehDiretoria,
}: {
  contrato: ContratoAtual;
  aditivos: (Aditivo & { quem_nome: string })[];
  clientes: string[];
  hoje: string;
  podeMexer: boolean;
  ehDiretoria: boolean;
}) {
  const router = useRouter();
  const [corrigindo, setCorrigindo] = useState(false);
  const [aditando, setAditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const s = situacaoDoContrato(c, hoje);
  const alertas = alertasDoContrato(c, hoje);
  const consumo = consumoDoContrato(c);
  const reajuste = proximoReajuste(c, hoje);
  const faltam = diasEntre(hoje, c.vigencia_atual);
  const ciclos = c.ciclos ?? [];
  const [verCiclo, setVerCiclo] = useState(String(c.ciclo?.n ?? 1));
  const visto = ciclos.find((k) => String(k.n) === verCiclo) ?? c.ciclo;
  const conta = saldoDoContrato(c);
  const k = c.ciclo;
  const varios = ciclos.length > 1;
  const somaDosAditivos = k ? k.deltas : aditivos.reduce((t, a) => t + (a.valor_delta ?? 0), 0);
  const inicioDoCiclo = k?.inicio ?? c.vigencia_inicio;
  const fimDoCiclo = k && k.n < ciclos.length ? k.fim : c.vigencia_atual;
  const duracaoDoCiclo = diasEntre(inicioDoCiclo, fimDoCiclo);
  const passadosNoCiclo = diasEntre(inicioDoCiclo, hoje);
  const p = c.projecao;
  const vermelho = consumo !== null && consumo >= CONSUMO_DE_ATENCAO;

  const fazer = (acao: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) =>
    iniciar(async () => {
      setErro(null);
      const r = await acao();
      if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
      if (depois) depois();
      else router.refresh();
    });

  const linha = (rotulo: string, valor: React.ReactNode, forte = false) => (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-texto-2">{rotulo}</dt>
      <dd className={`min-w-0 text-right break-words ${forte ? "font-semibold" : ""}`}>{valor}</dd>
    </div>
  );

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo={`${c.numero} · ${c.cliente}`}
        resumo={c.objeto ?? "Sem objeto descrito."}
        acoes={
          <>
            <Link href="/contratos" className={ESTILO_BOTAO.discreto}>
              Voltar
            </Link>
            <Link href={`/clientes/ficha?nome=${encodeURIComponent(c.cliente)}`} className={ESTILO_BOTAO.contorno}>
              Ficha do cliente
            </Link>
            <Link href={`/controle?cliente=${encodeURIComponent(c.cliente)}`} className={ESTILO_BOTAO.contorno}>
              Painel do controle
            </Link>
          </>
        }
      />

      {!podeMexer && <SoLeitura>Você vê o contrato, mas quem lança é {quemLanca("contrato")}.</SoLeitura>}
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}

      {conta && c.valor_atual !== null && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CartaoIndicador
            compacto
            rotulo={varios ? `Valor do ciclo ${k?.n}` : "Valor do contrato"}
            valor={emReais(c.valor_atual, false)}
            detalhe={k ? `${dataDoContrato(k.inicio)} a ${dataDoContrato(fimDoCiclo)}` : undefined}
            cor="bg-texto-3"
          />
          <CartaoIndicador
            compacto
            rotulo="Faturado"
            valor={emReais(conta.faturado, false)}
            detalhe={`${emPorcento(c.valor_atual > 0 ? conta.faturado / c.valor_atual : null)} do valor`}
            cor="bg-disponivel"
          />
          <CartaoIndicador
            compacto
            rotulo="Medido a faturar"
            valor={emReais(conta.aFaturar, false)}
            detalhe="medido, ainda sem nota"
            cor="bg-acento"
          />
          <CartaoIndicador
            compacto
            rotulo="Saldo do contrato"
            valor={<span className="text-saldo">{emReais(conta.saldo, false)}</span>}
            detalhe="valor menos o faturado"
            cor="bg-saldo"
            destaque={vermelho}
          >
            <ProgressoDuplo
              primeira={c.valor_atual > 0 ? conta.faturado / c.valor_atual : 0}
              segunda={c.valor_atual > 0 ? conta.aFaturar / c.valor_atual : 0}
              corSegunda={vermelho ? "bg-manutencao" : "bg-acento"}
            />
          </CartaoIndicador>
        </div>
      )}

      {visto && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Painel
            titulo={varios ? `Consumo do ciclo ${visto.n}` : "Consumo do contrato"}
            descricao="Medido e faturado acumulados contra o valor. A linha tracejada é o medido no ritmo dos últimos meses."
            acoes={
              varios ? (
                <Chips
                  rotulo="Ciclo"
                  valor={verCiclo}
                  aoMudar={setVerCiclo}
                  opcoes={ciclos.map((x) => ({ valor: String(x.n), rotulo: `Ciclo ${x.n}` }))}
                />
              ) : undefined
            }
          >
            <GraficoDoConsumo ciclo={visto} projecao={visto === k ? (p ?? null) : projecaoDoCiclo(visto)} />
          </Painel>
          <Painel titulo="Mês a mês" descricao="O medido e o faturado do controle em cada mês do ciclo.">
            <BarrasDoMes ciclo={visto} />
          </Painel>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Esquerda: o que aconteceu e o cadastro ──────────── */}
        <div className="min-w-0 space-y-4">
          {alertas.length > 0 && (
            <Painel titulo="O que ele pede">
              <ul className="space-y-1.5 p-4 text-sm">
                {alertas.map((a) => (
                  <li key={a.texto} className={a.tom === "aviso" ? "font-medium text-manutencao" : "text-texto-2"}>
                    {a.texto}
                  </li>
                ))}
              </ul>
            </Painel>
          )}

          {ciclos.length > 0 && (
            <Painel
              titulo={`Ciclos · ${ciclos.length}`}
              descricao="A assinatura abre o primeiro; cada renovação abre um novo, que começa do zero."
            >
              <ol className="divide-y divide-borda">
                {[...ciclos].reverse().map((x) => {
                  const atual = x === k;
                  const fracao = x.valor ? x.medido / x.valor : null;
                  return (
                    <li key={x.n} className={`grid gap-2 p-4 text-xs sm:grid-cols-[9rem_minmax(0,1fr)] ${atual ? "bg-acento-fraco/40" : ""}`}>
                      <div>
                        <p className="text-sm font-semibold">
                          Ciclo {x.n}{" "}
                          {atual ? <Selo tom="acento">hoje</Selo> : x.inicio > hoje ? <Selo tom="neutro">a iniciar</Selo> : null}
                        </p>
                        <p className="text-texto-3">
                          {dataDoContrato(x.inicio)} a {dataDoContrato(x.fim)}
                        </p>
                        <p className="text-texto-3">
                          {x.abertura ? x.abertura.numero || "Renovação" : "Assinatura"}
                          {x.encerradoEm ? ` · encerrado ${dataDoContrato(x.encerradoEm)}` : ""}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums sm:grid-cols-4">
                          <div>
                            <dt className="text-texto-3">Valor</dt>
                            <dd className="font-medium">{x.valor === null ? "preço unitário" : emReais(x.valor)}</dd>
                          </div>
                          <div>
                            <dt className="text-texto-3">Medido</dt>
                            <dd className="font-medium">{emReais(x.medido)}</dd>
                          </div>
                          <div>
                            <dt className="text-texto-3">Faturado</dt>
                            <dd className="font-medium">{emReais(x.faturado)}</dd>
                          </div>
                          <div>
                            <dt className="text-texto-3">{x.valor === null ? "Meses" : "Saldo"}</dt>
                            <dd className="font-semibold text-saldo">
                              {x.valor === null ? x.meses.length : emReais(x.valor - x.faturado)}
                            </dd>
                          </div>
                        </dl>
                        {x.valor !== null && x.valor > 0 && (
                          <ProgressoDuplo
                            primeira={x.faturado / x.valor}
                            segunda={Math.max(0, x.medido - x.faturado) / x.valor}
                            titulo={`${emPorcento(fracao)} medido`}
                          />
                        )}
                        {(x.incorporado > 0 || x.deltas !== 0 || x.abertura?.percentual) && (
                          <p className="mt-1 text-texto-3">
                            {[
                              x.abertura?.percentual ? `reajuste de ${emPorcento(x.abertura.percentual)} na renovação` : null,
                              x.deltas !== 0
                                ? `aditivos ${x.deltas >= 0 ? "+" : "−"} ${emReais(Math.abs(x.deltas))}`
                                : null,
                              x.incorporado > 0 ? `${emReais(x.incorporado)} do saldo anterior` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {podeMexer && !aditando && (
                <div className="border-t border-borda px-4 py-2">
                  <button type="button" onClick={() => setAditando(true)} className="text-xs font-semibold text-acento underline">
                    Registrar renovação
                  </button>
                </div>
              )}
            </Painel>
          )}

          {visto && visto.meses.length > 0 && (
            <Painel
              titulo={varios ? `Mês a mês do ciclo ${visto.n}` : "Mês a mês"}
              descricao="O medido e o faturado vêm do controle do cliente. O saldo anda quando a nota sai."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead className="border-b border-borda text-left text-texto-2">
                    <tr>
                      <th className="px-4 py-2 font-medium">Mês</th>
                      <th className="px-4 py-2 text-right font-medium">Medido</th>
                      <th className="px-4 py-2 text-right font-medium">Faturado</th>
                      <th className="px-4 py-2 text-right font-medium">Medido acumulado</th>
                      {visto.valor !== null && <th className="px-4 py-2 text-right font-medium">Saldo do contrato</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visto.meses
                      .reduce<{ mes: string; medido: number; faturado: number; acMedido: number; acFaturado: number }[]>(
                        (t, m) => [
                          ...t,
                          {
                            ...m,
                            acMedido: (t.at(-1)?.acMedido ?? 0) + m.medido,
                            acFaturado: (t.at(-1)?.acFaturado ?? 0) + m.faturado,
                          },
                        ],
                        [],
                      )
                      .reverse()
                      .map((m) => (
                        <tr key={m.mes} className="border-b border-borda/60 last:border-0">
                          <td className="px-4 py-2">{mesCurtoDe(m.mes)}</td>
                          <td className="px-4 py-2 text-right">{emReais(m.medido)}</td>
                          <td className="px-4 py-2 text-right">{emReais(m.faturado)}</td>
                          <td className="px-4 py-2 text-right text-texto-2">{emReais(m.acMedido)}</td>
                          {visto.valor !== null && (
                            <td className="px-4 py-2 text-right font-semibold text-saldo">
                              {emReais(visto.valor - m.acFaturado)}
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Painel>
          )}

          <Painel
            titulo={`Aditivos · ${aditivos.length}`}
            descricao="Renovação, prorrogação, reajuste, mudança de valor e encerramento. Não se editam: ficam como foram assinados."
            acoes={
              podeMexer && !aditando ? (
                <Botao variante="primario" onClick={() => setAditando(true)}>
                  Registrar aditivo
                </Botao>
              ) : undefined
            }
          >
            {aditando && (
              <div className="border-b border-borda bg-superficie-2">
                <FormularioDoAditivo contratoId={c.id} ultimo={ciclos.at(-1)} aoFechar={() => setAditando(false)} />
              </div>
            )}
            {aditivos.length === 0 ? (
              <p className="p-4 text-sm text-texto-3">Nenhum aditivo: o contrato está como foi assinado.</p>
            ) : (
              <ol className="grid gap-3 p-4 lg:grid-cols-2">
                {[...aditivos].reverse().map((a) => (
                  <li key={a.id} className="rounded-xl border border-borda bg-superficie p-3 shadow-cartao">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{a.numero || ROTULO_ADITIVO[a.tipo]}</p>
                        <p className="text-xs text-texto-3">
                          {dataDoContrato(a.data)} · {a.quem_nome}
                        </p>
                      </div>
                      <Selo
                        tom={
                          a.tipo === "encerramento" ? "neutro" : a.tipo === "reajuste" ? "transito" : a.tipo === "renovacao" ? "ok" : "acento"
                        }
                      >
                        {ROTULO_ADITIVO[a.tipo]}
                      </Selo>
                    </div>
                    <dl className="mt-2 space-y-0.5 text-xs tabular-nums">
                      {a.tipo === "renovacao" ? (
                        <>
                          {linha(
                            "Ciclo novo",
                            `${dataDoContrato(a.nova_vigencia_inicio ?? a.data)} a ${dataDoContrato(a.nova_vigencia_fim)}`,
                          )}
                          {linha("Valor do ciclo", a.valor_ciclo == null ? "preço unitário" : emReais(a.valor_ciclo))}
                          {a.incorpora_saldo && linha("Saldo anterior", "incorporado")}
                        </>
                      ) : (
                        a.nova_vigencia_fim && linha("Nova vigência até", dataDoContrato(a.nova_vigencia_fim))
                      )}
                      {a.percentual !== null && linha("Percentual", emPorcento(a.percentual))}
                      {a.valor_delta !== null &&
                        linha("Valor global", `${a.valor_delta >= 0 ? "+" : "−"} ${emReais(Math.abs(a.valor_delta))}`)}
                    </dl>
                    {a.descricao && <p className="mt-2 text-xs text-texto-2">{a.descricao}</p>}
                    {ehDiretoria && (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => {
                          if (!window.confirm("Apagar este aditivo? É para o lançado por engano.")) return;
                          fazer(() => apagarAditivo(c.id, a.id));
                        }}
                        className="mt-2 text-xs font-semibold text-manutencao underline"
                      >
                        Apagar (lançado por engano)
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Painel>

          <Painel
            titulo="Cadastro"
            descricao="Corrigir aqui é para o que foi digitado errado — o que mudou no contrato é aditivo."
            acoes={
              podeMexer && !corrigindo ? (
                <button type="button" onClick={() => setCorrigindo(true)} className="text-xs font-semibold text-acento underline">
                  Corrigir
                </button>
              ) : undefined
            }
          >
            {corrigindo ? (
              <FormularioDoContrato
                id={c.id}
                inicial={camposDoContrato(c)}
                clientes={clientes}
                aoFechar={() => setCorrigindo(false)}
              />
            ) : (
              <dl className="grid gap-x-8 gap-y-1 p-4 text-xs sm:grid-cols-2">
                {linha("Número", c.numero)}
                {linha("Cliente", c.cliente)}
                {linha("Vigência assinada", `${dataDoContrato(c.vigencia_inicio)} a ${dataDoContrato(c.vigencia_fim)}`)}
                {linha("Valor assinado", c.valor === null ? "preço unitário" : emReais(c.valor))}
                {linha(
                  "O medido que conta",
                  c.categorias?.length
                    ? c.categorias.map((k) => ROTULO_CATEGORIA[k as Categoria] ?? k).join(", ")
                    : "manutenção, locação e indenização",
                )}
                {linha("Avisar o vencimento com", `${c.aviso_dias} dia(s)`)}
                {linha("Gestor no cliente", c.contato ?? "—")}
                {linha("E-mail", c.email ?? "—")}
                {c.observacao && <div className="sm:col-span-2">{linha("Observação", c.observacao)}</div>}
              </dl>
            )}
            {ehDiretoria && !corrigindo && (
              <div className="border-t border-borda px-4 py-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    if (!window.confirm(`Apagar o contrato ${c.numero} e os aditivos dele? Não tem volta.`)) return;
                    fazer(() => apagarContrato(c.id), () => router.push("/contratos"));
                  }}
                  className="text-xs font-semibold text-manutencao underline"
                >
                  Apagar o contrato (cadastrado por engano)
                </button>
              </div>
            )}
          </Painel>
        </div>

        {/* ── Direita: a conta de hoje ─────────────────────────── */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Painel titulo="Vigência">
            <dl className="space-y-1.5 p-4 text-sm tabular-nums">
              <div className="flex items-center justify-between">
                <dt className="text-texto-2">Situação</dt>
                <dd>
                  <Selo tom={TOM_SITUACAO_CONTRATO[s]}>{ROTULO_SITUACAO_CONTRATO[s]}</Selo>
                </dd>
              </div>
              {varios && k && linha("Ciclo de hoje", `${k.n} de ${ciclos.length}`)}
              {linha(varios ? "Início do ciclo" : "Início", dataDoContrato(inicioDoCiclo))}
              {linha(varios ? "Fim do ciclo" : "Até", dataDoContrato(fimDoCiclo), true)}
              {fimDoCiclo !== c.vigencia_atual && linha("Já renovado até", dataDoContrato(c.vigencia_atual))}
              {!varios && c.vigencia_atual !== c.vigencia_fim && linha("Assinado até", dataDoContrato(c.vigencia_fim))}
              {c.encerrado_em && linha("Encerrado em", dataDoContrato(c.encerrado_em))}
              {s !== "encerrado" && s !== "a_iniciar" && (
                <>
                  <Progresso
                    fracao={duracaoDoCiclo > 0 ? passadosNoCiclo / duracaoDoCiclo : null}
                    cor={s === "vigente" ? "bg-acento" : "bg-manutencao"}
                  />
                  <p className="text-xs text-texto-3">
                    {faltam >= 0 ? `faltam ${faltam} dia(s) para o fim da vigência` : `vencido há ${-faltam} dia(s)`}
                  </p>
                </>
              )}
            </dl>
          </Painel>

          <Painel titulo={varios ? `Valor do ciclo ${k?.n}` : "Valor e saldo"}>
            <dl className="space-y-1.5 p-4 text-sm tabular-nums">
              {c.valor_atual === null ? (
                linha("Valor", "preço unitário")
              ) : (
                <>
                  {linha(k?.abertura ? "Valor da renovação" : "Assinado", emReais(k ? (k.valorBase ?? 0) : (c.valor ?? 0)))}
                  {somaDosAditivos !== 0 &&
                    linha("Aditivos", `${somaDosAditivos >= 0 ? "+" : "−"} ${emReais(Math.abs(somaDosAditivos))}`)}
                  {k && k.incorporado > 0 && linha("Saldo do ciclo anterior", `+ ${emReais(k.incorporado)}`)}
                  {linha(varios ? "Valor do ciclo" : "Valor de hoje", emReais(c.valor_atual), true)}
                </>
              )}
              {linha(`Medido${c.medido_ate ? ` até ${mesCurto(c.medido_ate)}` : ""}`, emReais(c.medido))}
              {conta && linha("Faturado", emReais(conta.faturado))}
              {c.valor_atual !== null && (
                <>
                  <div className="flex justify-between border-t border-borda pt-1.5">
                    <dt className="font-medium text-saldo">Saldo do contrato</dt>
                    <dd className="font-semibold text-saldo">{emReais(conta ? conta.saldo : c.valor_atual - c.medido)}</dd>
                  </div>
                  <Progresso fracao={consumo} cor={vermelho ? "bg-manutencao" : "bg-disponivel"} />
                  <p className="text-xs text-texto-3">{emPorcento(consumo)} do valor já medido</p>
                </>
              )}
              <p className="text-xs text-texto-3">
                O medido e o faturado são os do controle do cliente
                {c.categorias?.length ? `, só ${c.categorias.map((x) => ROTULO_CATEGORIA[x as Categoria] ?? x).join(" e ").toLowerCase()}` : ""}
                {conta ? ". O saldo é o valor menos o faturado: anda sozinho quando a nota sai." : ", nos meses da vigência."}
              </p>
            </dl>
          </Painel>

          {p && (
            <Painel titulo="Ritmo">
              <dl className="space-y-1.5 p-4 text-sm tabular-nums">
                {p.ritmo === null ? (
                  <p className="text-xs text-texto-3">Com menos de dois meses medidos no ciclo ainda não há ritmo.</p>
                ) : (
                  <>
                    {linha("Medido por mês", emReais(p.ritmo), true)}
                    <p className="text-xs text-texto-3">média dos últimos {p.mesesNaMedia} meses do ciclo</p>
                    {c.valor_atual !== null &&
                      linha(
                        "O valor acaba em",
                        p.acabaEm ? (
                          <span className={p.mesesAntes > 0 ? "text-manutencao" : ""}>{mesCurtoDe(p.acabaEm)}</span>
                        ) : (
                          "—"
                        ),
                      )}
                    {p.acabaEm && (
                      <p className="text-xs text-texto-3">
                        {p.mesesAntes > 0
                          ? `${p.mesesAntes} ${p.mesesAntes === 1 ? "mês" : "meses"} antes do fim${varios ? " do ciclo" : ""}: hora de falar de aditivo de valor.`
                          : "Depois do fim: o valor dá até o fim da vigência."}
                      </p>
                    )}
                  </>
                )}
              </dl>
            </Painel>
          )}

          <Painel titulo="Reajuste">
            <dl className="space-y-1.5 p-4 text-sm tabular-nums">
              {!c.indice ? (
                <p className="text-xs text-texto-3">Sem índice: o contrato não se reajusta.</p>
              ) : (
                <>
                  {linha("Índice", c.indice === "outro" ? "outro" : c.indice)}
                  {linha("Data-base", dataDoContrato(c.data_base))}
                  {linha("Último registrado", c.ultimo_reajuste ? dataDoContrato(c.ultimo_reajuste) : "nenhum")}
                  {reajuste &&
                    linha(
                      reajuste.atrasado ? "Atrasado desde" : "Próximo",
                      <span className={reajuste.atrasado ? "text-manutencao" : ""}>{dataDoContrato(reajuste.data)}</span>,
                      true,
                    )}
                </>
              )}
            </dl>
          </Painel>
        </aside>
      </div>
    </div>
  );
}
