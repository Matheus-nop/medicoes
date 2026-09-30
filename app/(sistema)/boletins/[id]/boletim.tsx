"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Aviso,
  Botao,
  CAMPO,
  Cabecalho,
  Campo,
  CartaoIndicador,
  ESTILO_BOTAO,
  Painel,
  Selo,
} from "@/components/ui";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import {
  ACAO_SEGUINTE,
  PODE_REABRIR,
  ROTULO_FONTE,
  ROTULO_MODELO,
  ROTULO_SITUACAO,
  SEGUINTE,
  dataDaOm,
  entrouNaOficina,
  lerValorDigitado,
  resumir,
  modeloLido,
  situacaoLida,
  statusDaOm,
  type BoletimAtual,
  type Fatia,
  type ItemDoBoletim,
} from "@/lib/medicoes/medicoes";
import {
  andar,
  apagarBoletim,
  buscarComprovantes,
  desfazerFaturamento,
  editarBoletim,
  editarOm,
  faturarOm,
  incluirOmAMao,
  mudarRecibos,
  mudarValor,
  puxarDaBase,
  tirarOm,
  type CabecalhoDoBoletim,
  type CamposDaOm,
} from "../../acoes";
import { ColarDoSisloc } from "../../colar";
import { dataCurta, periodo } from "../../formato";
import { TOM_SITUACAO } from "../../painel";
import type { Andamento } from "./dados";
import { FormularioDaOm } from "./formulario-om";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Um boletim: o resultado até agora, as OMs, e o passo seguinte.
 *
 * Aberto, tudo mexe — cola mais OM, troca valor, tira a que não se cobra.
 * Fechado, a tela vira leitura: o que se vê é o que foi para o cliente.
 */
export function Boletim({
  boletim,
  itens,
  andamentos,
  jaMedidas,
  ehDiretoria,
}: {
  boletim: BoletimAtual;
  itens: ItemDoBoletim[];
  andamentos: Andamento[];
  jaMedidas: Record<string, string>;
  ehDiretoria: boolean;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [reabrindo, setReabrindo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [recado, setRecado] = useState<string | null>(null);
  const [digitando, setDigitando] = useState(false);

  const aberto = boletim.situacao === "aberto";
  const seguinte = SEGUINTE[boletim.situacao];
  const r = resumir(itens);
  const fracaoMargem = r.margem !== null && r.valor > 0 ? r.margem / r.valor : null;
  const naOficina = itens.filter((i) => entrouNaOficina(i.etapa_om)).length;
  // O papel da Rio+ não tem recibo: não se cobra o que ele não mostra.
  const comRecibo = boletim.modelo !== "rio_mais";
  const semRecibo = comRecibo
    ? itens.filter((i) => !i.om_retirada || !i.recibo_entrega).length
    : 0;
  // A OM se fatura uma a uma com o boletim já apresentado; faturado inteiro,
  // todas contam e não há o que marcar.
  const faturavel = boletim.situacao === "fechado" || boletim.situacao === "enviado";
  const faturado = itens.filter((i) => i.faturada).reduce((t, i) => t + i.valor, 0);
  const semCabecalho = [
    !boletim.base && "base / fiscalização",
    !boletim.contato && !boletim.email && "contato / e-mail",
    !boletim.local_obra && "local da obra",
  ].filter(Boolean) as string[];

  function fazer(acao: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const res = await acao();
      if (!res.ok) {
        setErro(res.erro ?? "Não deu certo.");
        return;
      }
      depois?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo={`${boletim.numero} · ${boletim.cliente}`}
        resumo={
          <>
            {boletim.base ? `${boletim.base} · ` : ""}
            {boletim.referencia ? `${boletim.referencia} · ` : ""}
            OMs de {periodo(boletim.primeira_om, boletim.ultima_om)}
            {boletim.criado_por_nome && ` · aberto por ${boletim.criado_por_nome}`}
          </>
        }
        acoes={
          <>
            <Link href="/" className={ESTILO_BOTAO.discreto}>
              Voltar
            </Link>
            <Link href={`/boletins/${boletim.id}/folha`} className={ESTILO_BOTAO.contorno}>
              {aberto ? "Prévia do papel" : "Papel / PDF"}
            </Link>
            {seguinte && (
              <Botao
                variante="primario"
                disabled={enviando || (seguinte === "fechado" && itens.length === 0)}
                onClick={() =>
                  fazer(
                    () => andar(boletim.id, seguinte, nota),
                    () => setNota(""),
                  )
                }
              >
                {ACAO_SEGUINTE[boletim.situacao]}
              </Botao>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Selo tom={TOM_SITUACAO[boletim.situacao]}>{ROTULO_SITUACAO[boletim.situacao]}</Selo>
        {boletim.situacao_em && (
          <span className="text-xs text-texto-3">
            desde {quando(boletim.situacao_em)}
            {boletim.situacao_por_nome && ` · ${boletim.situacao_por_nome}`}
          </span>
        )}
        {ehDiretoria && PODE_REABRIR.includes(boletim.situacao) && !reabrindo && (
          <Botao variante="discreto" className="ml-auto" onClick={() => setReabrindo(true)}>
            Reabrir
          </Botao>
        )}
        {aberto && itens.length === 0 && (
          <Botao
            variante="discreto"
            className="ml-auto"
            disabled={enviando}
            onClick={() => {
              if (!window.confirm(`Apagar o ${boletim.numero}, que está vazio?`)) return;
              fazer(
                () => apagarBoletim(boletim.id),
                () => router.push("/"),
              );
            }}
          >
            Apagar boletim vazio
          </Botao>
        )}
      </div>

      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}

      {reabrindo && (
        <Painel titulo="Reabrir o boletim" descricao="Fica registrado quem reabriu e por quê.">
          <form
            className="flex flex-wrap items-end gap-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              fazer(
                () => andar(boletim.id, "aberto", motivo),
                () => {
                  setReabrindo(false);
                  setMotivo("");
                },
              );
            }}
          >
            <Campo rotulo="Por que reabrir" obrigatorio className="min-w-[16rem] flex-1">
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
                placeholder="O cliente contestou a OM 034292…"
                className={`${CAMPO} w-full`}
              />
            </Campo>
            <Botao type="submit" variante="perigo" disabled={enviando || !motivo.trim()}>
              Reabrir
            </Botao>
            <Botao type="button" variante="discreto" onClick={() => setReabrindo(false)}>
              Cancelar
            </Botao>
          </form>
        </Painel>
      )}

      {seguinte && seguinte !== "fechado" && (
        <Campo rotulo={`Anotação do passo "${ACAO_SEGUINTE[boletim.situacao]}" (opcional)`}>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={
              seguinte === "enviado"
                ? "Para quem foi, por onde…"
                : "Número da nota fiscal, data do faturamento…"
            }
            className={`${CAMPO} w-full max-w-xl`}
          />
        </Campo>
      )}

      {/* ── O resultado até o momento ─────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador rotulo="OMs" valor={r.oms} detalhe={`${r.porLocal.length} base(s)/obra(s)`} />
        <CartaoIndicador
          rotulo="A cobrar"
          valor={emReais(r.valor)}
          detalhe={
            aberto
              ? undefined
              : `faturado ${emReais(faturado)} · saldo ${emReais(r.valor - faturado)}`
          }
          cor="bg-acento"
        />
        <CartaoIndicador
          rotulo="Custo"
          valor={r.custo > 0 ? emReais(r.custo) : "—"}
          detalhe="total gasto no Sisloc"
        />
        <CartaoIndicador
          rotulo="Margem"
          valor={r.margem === null ? "—" : emReais(r.margem)}
          detalhe={fracaoMargem === null ? "sem custo lançado" : `${emPorcento(fracaoMargem)} do valor`}
          destaque={r.margem !== null && r.margem < 0}
        />
      </div>

      {aberto && (r.semValor > 0 || r.valorEhCusto > 0 || naOficina > 0) && (
        <Aviso tom="erro">
          Conferir antes de fechar:
          {r.semValor > 0 && ` ${r.semValor} OM(s) com valor zero — sem orçamento no Sisloc.`}
          {r.valorEhCusto > 0 &&
            ` ${r.valorEhCusto} OM(s) com o custo do Sisloc no lugar do preço — sem orçamento, o valor veio do total previsto ou gasto.`}
          {naOficina > 0 &&
            ` ${naOficina} OM(s) entraram antes de a oficina concluir — o valor ainda pode mudar.`}
        </Aviso>
      )}

      {aberto && itens.length > 0 && (semCabecalho.length > 0 || semRecibo > 0) && (
        <p className="text-xs text-texto-2">
          Para o papel sair completo:
          {semCabecalho.length > 0 && ` falta ${semCabecalho.join(", ")} nos dados do boletim.`}
          {semRecibo > 0 &&
            ` ${semRecibo} OM(s) sem recibo de retirada ou de entrega — fica em branco no papel.`}
          {semRecibo > 0 && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => {
                setErro(null);
                setRecado(null);
                iniciar(async () => {
                  const res = await buscarComprovantes(boletim.id);
                  if (!res.ok) {
                    setErro(res.erro ?? "Não deu certo.");
                    return;
                  }
                  setRecado(
                    (res.comprovantes
                      ? `${res.comprovantes} comprovante(s) achado(s) e preenchido(s).`
                      : "Nenhum comprovante novo na OS nem no Roteiros — o retorno pode não ter sido lançado ainda.") +
                      (res.semRoteiros ? " O Roteiros não respondeu (falta aplicar a 0003?)." : ""),
                  );
                  router.refresh();
                });
              }}
              className="ml-2 font-semibold text-acento underline disabled:opacity-50"
            >
              Buscar comprovantes na OS e no Roteiros
            </button>
          )}
        </p>
      )}

      {recado && (
        <Aviso tom="ok" aoFechar={() => setRecado(null)}>
          {recado}
        </Aviso>
      )}

      {aberto && (
        <ColarDoSisloc
          boletim={{
            id: boletim.id,
            numero: boletim.numero,
            cliente: boletim.cliente,
            base: boletim.base,
          }}
          abertos={[]}
          jaMedidas={jaMedidas}
        />
      )}

      <Painel
        titulo="OMs do boletim"
        descricao={
          aberto
            ? "Preenchido do Sisloc, da OS e do Roteiros — e tudo se corrige até o boletim fechar: o valor e os recibos direto na linha, o resto em Editar."
            : undefined
        }
        acoes={
          <>
            {aberto && !digitando && (
              <Botao variante="discreto" onClick={() => setDigitando(true)}>
                Incluir OM à mão
              </Botao>
            )}
            <span className="text-sm font-semibold tabular-nums">{emReais(r.valor)}</span>
          </>
        }
      >
        {digitando && (
          <div className="border-b border-borda bg-superficie-2 p-4">
            <p className="mb-3 text-xs text-texto-2">
              Para a OM que não veio na colagem. Tudo o que está aqui vai para o papel.
            </p>
            <FormularioDaOm
              ocupado={enviando}
              aoCancelar={() => setDigitando(false)}
              aoSalvar={(c) =>
                fazer(
                  () => incluirOmAMao(boletim.id, c),
                  () => setDigitando(false),
                )
              }
            />
          </div>
        )}
        {itens.length === 0 ? (
          <p className="p-4 text-sm text-texto-3">
            Nenhuma OM ainda. Cole a lista do Sisloc acima, ou inclua à mão.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[66rem] text-left text-xs">
              <thead className="text-texto-3">
                <tr className="border-b border-borda">
                  <th className="px-4 py-2 font-medium">OM</th>
                  <th className="py-2 pr-2 font-medium">Data</th>
                  <th className="py-2 pr-2 font-medium">Patrimônio</th>
                  <th className="py-2 pr-2 font-medium">Equipamento / serviço</th>
                  {comRecibo && <th className="py-2 pr-2 font-medium">Recibo retirada</th>}
                  {comRecibo && <th className="py-2 pr-2 font-medium">Recibo entrega</th>}
                  <th className="py-2 pr-2 text-right font-medium">Custo</th>
                  <th className="py-2 pr-2 text-right font-medium">Valor</th>
                  {aberto ? (
                    <th className="py-2 pr-4" />
                  ) : (
                    <th className="py-2 pr-4 font-medium">Status</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <LinhaDaOm
                    // A chave muda quando os recibos ou o valor mudam por fora
                    // (Editar, Buscar comprovantes): a linha renasce com o que
                    // está no banco, e não com o que ela tinha na mão antes.
                    key={`${i.id}:${i.om_retirada ?? ""}:${i.recibo_entrega ?? ""}:${i.valor}`}
                    item={i}
                    aberto={aberto}
                    comRecibo={comRecibo}
                    faturavel={faturavel}
                    aoFaturar={() => {
                      const nf = window.prompt(
                        `OM ${i.om} faturada. Número da nota fiscal (opcional):`,
                        "",
                      );
                      if (nf === null) return;
                      fazer(() => faturarOm(boletim.id, i.id, nf));
                    }}
                    aoDesfazer={() => {
                      if (!window.confirm(`A OM ${i.om} volta a PENDENTE?`)) return;
                      fazer(() => desfazerFaturamento(boletim.id, i.id));
                    }}
                    ocupado={enviando}
                    aoMudarValor={(v) => fazer(() => mudarValor(boletim.id, i.id, v))}
                    aoEditar={(c) => fazer(() => editarOm(boletim.id, i.id, c, i.valor))}
                    aoMudarRecibos={(rec) => fazer(() => mudarRecibos(boletim.id, i.id, rec))}
                    aoTirar={() => {
                      if (!window.confirm(`Tirar a OM ${i.om} deste boletim?`)) return;
                      fazer(() => tirarOm(boletim.id, i.id));
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>

      {itens.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TabelaDeFatias titulo="Por base / obra" fatias={r.porLocal} total={r.valor} />
          <TabelaDeFatias titulo="Por equipamento" fatias={r.porEquipamento} total={r.valor} />
        </div>
      )}

      {aberto && (
        <Dados
          // Renasce quando os dados mudam por fora ("Puxar dados da base").
          key={[boletim.contato, boletim.email, boletim.telefone, boletim.local_obra, boletim.observacao, boletim.modelo].join("|")}
          boletim={boletim}
          ocupado={enviando}
          aoSalvar={(c) => fazer(() => editarBoletim(boletim.id, c))}
          aoPuxar={() => fazer(() => puxarDaBase(boletim.id))}
        />
      )}

      <Painel titulo="Histórico">
        <ul className="divide-y divide-borda text-sm">
          {andamentos.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-x-3 px-4 py-2">
              <span className="font-medium">{ROTULO_SITUACAO[situacaoLida(a.situacao)]}</span>
              <span className="text-texto-3">
                {quando(a.em)}
                {a.quem_nome && ` · ${a.quem_nome}`}
              </span>
              {a.observacao && <span className="w-full text-xs text-texto-2">{a.observacao}</span>}
            </li>
          ))}
          <li className="flex flex-wrap gap-x-3 px-4 py-2">
            <span className="font-medium">Aberto</span>
            <span className="text-texto-3">
              {quando(boletim.criado_em)}
              {boletim.criado_por_nome && ` · ${boletim.criado_por_nome}`}
            </span>
          </li>
        </ul>
      </Painel>
    </div>
  );
}

function LinhaDaOm({
  item,
  aberto,
  comRecibo,
  faturavel,
  aoFaturar,
  aoDesfazer,
  ocupado,
  aoMudarValor,
  aoEditar,
  aoMudarRecibos,
  aoTirar,
}: {
  item: ItemDoBoletim;
  aberto: boolean;
  comRecibo: boolean;
  faturavel: boolean;
  aoFaturar: () => void;
  aoDesfazer: () => void;
  ocupado: boolean;
  aoMudarValor: (v: number) => void;
  aoEditar: (c: CamposDaOm) => void;
  aoMudarRecibos: (r: { omRetirada: string; reciboEntrega: string }) => void;
  aoTirar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [abrindo, setAbrindo] = useState(false);
  const [invalido, setInvalido] = useState(false);

  function salvar() {
    const v = lerValorDigitado(texto);
    if (v === null) {
      setInvalido(true);
      return;
    }
    setEditando(false);
    setInvalido(false);
    if (v !== item.valor) aoMudarValor(v);
  }

  const custoPreco = item.fonte === "previsto" || item.fonte === "gasto" || item.fonte === "nenhum";
  const [retirada, setRetirada] = useState(item.om_retirada ?? "");
  const [entrega, setEntrega] = useState(item.recibo_entrega ?? "");

  // Salva ao sair do campo, e só se mudou: digitar recibo é coisa de dez
  // linhas seguidas, e um botão por linha seria vinte cliques a mais.
  function salvarRecibos() {
    if (retirada === (item.om_retirada ?? "") && entrega === (item.recibo_entrega ?? "")) return;
    aoMudarRecibos({ omRetirada: retirada, reciboEntrega: entrega });
  }

  const recibo = (
    valor: string,
    mudar: (v: string) => void,
    rotulo: string,
    atual: string | null,
  ) =>
    aberto ? (
      <input
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        onBlur={salvarRecibos}
        disabled={ocupado}
        inputMode="numeric"
        aria-label={`${rotulo} da OM ${item.om}`}
        placeholder="—"
        className={`${CAMPO} h-7 w-24 font-mono text-xs`}
      />
    ) : (
      <span className="font-mono">{atual ?? "—"}</span>
    );

  return (
    <>
      <tr className={`align-top ${abrindo ? "bg-superficie-2" : "border-b border-borda/50"}`}>
        <td className="px-4 py-2 font-mono">{item.om}</td>
        <td className="py-2 pr-2 tabular-nums">{dataCurta(dataDaOm(item))}</td>
        <td className="py-2 pr-2 font-mono">{item.patrimonio ?? "—"}</td>
        <td className="py-2 pr-2">
          {item.equipamento ?? "—"}
          {item.tipo_om && <span className="block text-[11px] text-texto-3">{item.tipo_om}</span>}
          {entrouNaOficina(item.etapa_om) && (
            <span className="block text-[11px] text-manutencao">
              entrou com a oficina em: {item.etapa_om}
            </span>
          )}
          {item.observacao && (
            <span className="block text-[11px] text-texto-2">{item.observacao}</span>
          )}
        </td>
        {comRecibo && (
          <td className="py-2 pr-2">
            {recibo(retirada, setRetirada, "Recibo de retirada", item.om_retirada)}
          </td>
        )}
        {comRecibo && (
          <td className="py-2 pr-2">
            {recibo(entrega, setEntrega, "Recibo de entrega", item.recibo_entrega)}
          </td>
        )}
        <td className="py-2 pr-2 text-right tabular-nums text-texto-2">
          {item.custo === null ? "—" : emReais(item.custo)}
        </td>
        <td className="py-2 pr-2 text-right">
          {aberto && editando ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                salvar();
              }}
            >
              <input
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setInvalido(false);
                }}
                onBlur={salvar}
                onKeyDown={(e) => e.key === "Escape" && setEditando(false)}
                autoFocus
                inputMode="decimal"
                aria-label={`Valor da OM ${item.om}`}
                aria-invalid={invalido}
                className={`${CAMPO} h-7 w-28 text-right text-xs ${invalido ? "border-manutencao" : ""}`}
              />
            </form>
          ) : (
            <button
              type="button"
              disabled={!aberto || ocupado}
              onClick={() => {
                setTexto(item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
                setEditando(true);
              }}
              className="text-right disabled:cursor-default"
            >
              <span className="block font-semibold tabular-nums">{emReais(item.valor)}</span>
              <span
                className={`block text-[11px] ${
                  custoPreco && aberto ? "text-manutencao" : "text-texto-3"
                }`}
              >
                {ROTULO_FONTE[item.fonte]}
              </span>
            </button>
          )}
        </td>
        {!aberto && (
          <td className="py-2 pr-4 whitespace-nowrap">
            <Selo tom={item.faturada ? "ok" : "neutro"}>{statusDaOm(item)}</Selo>
            {item.nota_fiscal && (
              <span className="block text-[11px] text-texto-3">NF {item.nota_fiscal}</span>
            )}
            {faturavel && (
              <button
                type="button"
                disabled={ocupado}
                onClick={item.faturada ? aoDesfazer : aoFaturar}
                className="block text-[11px] font-medium text-texto-2 underline"
              >
                {item.faturada ? "Desfazer" : "Marcar faturada"}
              </button>
            )}
          </td>
        )}
        {aberto && (
          <td className="py-2 pr-4 text-right whitespace-nowrap">
            <button
              type="button"
              onClick={() => setAbrindo((a) => !a)}
              aria-expanded={abrindo}
              className="text-[11px] font-medium text-texto-2 underline"
            >
              Editar
            </button>{" "}
            <button
              type="button"
              disabled={ocupado}
              onClick={aoTirar}
              className="text-[11px] font-medium text-manutencao underline"
            >
              Tirar
            </button>
          </td>
        )}
      </tr>
      {abrindo && (
        <tr className="border-b border-borda/50 bg-superficie-2">
          <td colSpan={9} className="px-4 pb-4">
            <FormularioDaOm
              item={item}
              ocupado={ocupado}
              aoCancelar={() => setAbrindo(false)}
              aoSalvar={(c) => {
                setAbrindo(false);
                aoEditar(c);
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function TabelaDeFatias({ titulo, fatias, total }: { titulo: string; fatias: Fatia[]; total: number }) {
  return (
    <Painel titulo={titulo}>
      <table className="w-full text-left text-xs">
        <thead className="text-texto-3">
          <tr className="border-b border-borda">
            <th className="px-4 py-2 font-medium" />
            <th className="py-2 pr-2 text-right font-medium">OMs</th>
            <th className="py-2 pr-2 text-right font-medium">Valor</th>
            <th className="py-2 pr-4 text-right font-medium">Parte</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {fatias.map((f) => (
            <tr key={f.nome} className="border-b border-borda/50">
              <td className="max-w-[16rem] truncate px-4 py-1.5" title={f.nome}>
                {f.nome}
              </td>
              <td className="py-1.5 pr-2 text-right">{f.oms}</td>
              <td className="py-1.5 pr-2 text-right font-semibold">{emReais(f.valor)}</td>
              <td className="py-1.5 pr-4 text-right text-texto-3">
                {emPorcento(total > 0 ? f.valor / total : null)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Painel>
  );
}

function Dados({
  boletim,
  ocupado,
  aoSalvar,
  aoPuxar,
}: {
  boletim: BoletimAtual;
  ocupado: boolean;
  aoSalvar: (c: CabecalhoDoBoletim) => void;
  aoPuxar: () => void;
}) {
  const inicial: CabecalhoDoBoletim = {
    referencia: boletim.referencia ?? "",
    base: boletim.base ?? "",
    contato: boletim.contato ?? "",
    email: boletim.email ?? "",
    telefone: boletim.telefone ?? "",
    localObra: boletim.local_obra ?? "",
    observacao: boletim.observacao ?? "",
    modelo: modeloLido(boletim.modelo),
    documento: boletim.documento ?? "",
  };
  const [campos, setCampos] = useState(inicial);
  const mudou = (Object.keys(inicial) as (keyof CabecalhoDoBoletim)[]).some(
    (k) => campos[k] !== inicial[k],
  );
  const campo = (
    k: keyof CabecalhoDoBoletim,
    rotulo: string,
    placeholder: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Campo rotulo={rotulo}>
      <input
        value={campos[k]}
        onChange={(e) => setCampos((c) => ({ ...c, [k]: e.target.value }))}
        placeholder={placeholder}
        className={`${CAMPO} w-full`}
        {...extra}
      />
    </Campo>
  );

  return (
    <Painel
      titulo="Dados do boletim"
      descricao="O cabeçalho do papel. O boletim novo nasce com os dados do cadastro da base."
      acoes={
        <>
          <Botao variante="discreto" onClick={aoPuxar} disabled={ocupado}>
            Puxar dados da base
          </Botao>
          <Link
            href={`/bases?base=${encodeURIComponent(boletim.base ?? "")}`}
            className="text-xs font-semibold text-acento underline"
          >
            Cadastro da base
          </Link>
        </>
      }
    >
      <form
        className="space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          aoSalvar(campos);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo rotulo="Modelo do papel">
            <select
              value={campos.modelo}
              onChange={(e) => setCampos((c) => ({ ...c, modelo: modeloLido(e.target.value) }))}
              className={`${CAMPO} w-full`}
            >
              {(Object.keys(ROTULO_MODELO) as (keyof typeof ROTULO_MODELO)[]).map((m) => (
                <option key={m} value={m}>
                  {ROTULO_MODELO[m]}
                </option>
              ))}
            </select>
          </Campo>
          {campo("documento", "Documento Nº (vazio = o da casa)", boletim.numero)}
          {campo("referencia", "Mês de referência", "AGOSTO/2026")}
          {campo("base", "Base / fiscalização", "VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4")}
          {campo("localObra", "Local da obra", "Rua Oscar Soares, 1362 - Nova Iguaçu - RJ")}
          {campo("contato", "Contato do cliente", "Sra. Thaynã")}
          {campo("email", "E-mail do cliente", "nome@cliente.com.br", { type: "email" })}
          {campo("telefone", "Telefone do cliente", "(21) 0000-0000", { inputMode: "tel" })}
        </div>
        <Campo rotulo="Observações gerais">
          <textarea
            value={campos.observacao}
            onChange={(e) => setCampos((c) => ({ ...c, observacao: e.target.value }))}
            rows={2}
            placeholder="Contrato, pedido de compra, condição de pagamento…"
            className="w-full rounded-lg border border-borda bg-superficie p-2 text-sm outline-none focus:border-acento"
          />
        </Campo>
        <Botao type="submit" disabled={ocupado || !mudou}>
          Salvar
        </Botao>
      </form>
    </Painel>
  );
}
