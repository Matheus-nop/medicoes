"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, Cabecalho, ESTILO_BOTAO, Painel, Progresso, Selo, SoLeitura } from "@/components/ui";
import { ROTULO_CATEGORIA, type Categoria } from "@/lib/medicoes/controle";
import {
  ROTULO_ADITIVO,
  ROTULO_SITUACAO_CONTRATO,
  TOM_SITUACAO_CONTRATO,
  alertasDoContrato,
  consumoDoContrato,
  dataDoContrato,
  diasEntre,
  proximoReajuste,
  situacaoDoContrato,
  type Aditivo,
  type ContratoAtual,
} from "@/lib/medicoes/contratos";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import { quemLanca } from "@/lib/medicoes/papeis";
import { apagarAditivo, apagarContrato } from "../acoes";
import { mesCurto } from "../cartao";
import { FormularioDoAditivo, FormularioDoContrato, camposDoContrato } from "../formulario";

/**
 * Um contrato. À esquerda o que aconteceu com ele (os aditivos) e o cadastro;
 * à direita a conta de hoje: vigência, valor contra o medido, reajuste.
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
  const duracao = diasEntre(c.vigencia_inicio, c.vigencia_atual);
  const passados = diasEntre(c.vigencia_inicio, hoje);
  const faltam = diasEntre(hoje, c.vigencia_atual);
  const somaDosAditivos = aditivos.reduce((t, a) => t + (a.valor_delta ?? 0), 0);

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

          <Painel
            titulo={`Aditivos · ${aditivos.length}`}
            descricao="Prorrogação, reajuste, mudança de valor e encerramento. Não se editam: ficam como foram assinados."
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
                <FormularioDoAditivo contratoId={c.id} aoFechar={() => setAditando(false)} />
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
                      <Selo tom={a.tipo === "encerramento" ? "neutro" : a.tipo === "reajuste" ? "transito" : "acento"}>
                        {ROTULO_ADITIVO[a.tipo]}
                      </Selo>
                    </div>
                    <dl className="mt-2 space-y-0.5 text-xs tabular-nums">
                      {a.nova_vigencia_fim && linha("Nova vigência até", dataDoContrato(a.nova_vigencia_fim))}
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
              {linha("Início", dataDoContrato(c.vigencia_inicio))}
              {linha("Até", dataDoContrato(c.vigencia_atual), true)}
              {c.vigencia_atual !== c.vigencia_fim && linha("Assinado até", dataDoContrato(c.vigencia_fim))}
              {c.encerrado_em && linha("Encerrado em", dataDoContrato(c.encerrado_em))}
              {s !== "encerrado" && s !== "a_iniciar" && (
                <>
                  <Progresso fracao={duracao > 0 ? passados / duracao : null} cor={s === "vigente" ? "bg-acento" : "bg-manutencao"} />
                  <p className="text-xs text-texto-3">
                    {faltam >= 0 ? `faltam ${faltam} dia(s) de ${duracao}` : `vencido há ${-faltam} dia(s)`}
                  </p>
                </>
              )}
            </dl>
          </Painel>

          <Painel titulo="Valor e medido">
            <dl className="space-y-1.5 p-4 text-sm tabular-nums">
              {c.valor_atual === null ? (
                linha("Valor", "preço unitário")
              ) : (
                <>
                  {linha("Assinado", emReais(c.valor ?? 0))}
                  {somaDosAditivos !== 0 &&
                    linha("Aditivos", `${somaDosAditivos >= 0 ? "+" : "−"} ${emReais(Math.abs(somaDosAditivos))}`)}
                  {linha("Valor de hoje", emReais(c.valor_atual), true)}
                </>
              )}
              {linha(`Medido${c.medido_ate ? ` até ${mesCurto(c.medido_ate)}` : ""}`, emReais(c.medido))}
              {c.valor_atual !== null && (
                <>
                  <div className="flex justify-between border-t border-borda pt-1.5">
                    <dt className="font-medium text-saldo">Saldo do contrato</dt>
                    <dd className="font-semibold text-saldo">{emReais(c.valor_atual - c.medido)}</dd>
                  </div>
                  <Progresso fracao={consumo} cor={consumo !== null && consumo >= 0.9 ? "bg-manutencao" : "bg-disponivel"} />
                  <p className="text-xs text-texto-3">{emPorcento(consumo)} do valor já medido</p>
                </>
              )}
              <p className="text-xs text-texto-3">
                O medido é o do controle do cliente, nos meses da vigência
                {c.categorias?.length ? `, só ${c.categorias.map((k) => ROTULO_CATEGORIA[k as Categoria] ?? k).join(" e ").toLowerCase()}` : ""}.
              </p>
            </dl>
          </Painel>

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
