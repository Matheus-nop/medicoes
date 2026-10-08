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
  ESTILO_BOTAO,
  Painel,
  Progresso,
  Selo,
  SoLeitura,
} from "@/components/ui";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import {
  ACAO_SEGUINTE,
  PODE_REABRIR,
  ROTULO_FONTE,
  ROTULO_MODELO,
  ROTULO_SITUACAO,
  SEGUINTE,
  SITUACOES,
  dataDaOm,
  documentoDoBoletim,
  entrouNaOficina,
  lerValorDigitado,
  modeloLido,
  resumir,
  situacaoLida,
  statusDaOm,
  type BoletimAtual,
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
import { quemLanca } from "@/lib/medicoes/papeis";
import { ColarDoSisloc } from "../../colar";
import { dataCurta, periodo } from "../../formato";
import { TOM_SITUACAO } from "@/lib/medicoes/medicoes";
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

/** Os campos do cabeçalho, do jeito que o formulário e a ação esperam. */
const cabecalhoDe = (b: BoletimAtual): CabecalhoDoBoletim => ({
  referencia: b.referencia ?? "",
  base: b.base ?? "",
  contato: b.contato ?? "",
  email: b.email ?? "",
  telefone: b.telefone ?? "",
  localObra: b.local_obra ?? "",
  observacao: b.observacao ?? "",
  modelo: modeloLido(b.modelo),
  documento: b.documento ?? "",
});

/**
 * Um boletim, em duas colunas.
 *
 * À esquerda, o trabalho: as OMs em cartões — valor e recibos se corrigem no
 * próprio cartão enquanto o boletim está aberto —, e a colagem de mais OMs,
 * recolhida. À direita, o que se confere: o andamento, quanto cobra, o que
 * falta antes de fechar, o cabeçalho do papel (em leitura; "Editar" abre) e a
 * história. Fechado, tudo vira leitura: o que se vê é o que foi para o cliente.
 */
export function Boletim({
  boletim,
  itens,
  andamentos,
  jaMedidas,
  ehDiretoria,
  podeMexer,
  documentoSugerido,
}: {
  boletim: BoletimAtual;
  itens: ItemDoBoletim[];
  andamentos: Andamento[];
  jaMedidas: Record<string, string>;
  ehDiretoria: boolean;
  /** O papel é do time que lança boletim (a 0011). Quem não é, só lê. */
  podeMexer: boolean;
  /** O próximo Documento Nº da base, para o boletim que está sem. */
  documentoSugerido: string | null;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [reabrindo, setReabrindo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [digitando, setDigitando] = useState(false);
  const [editandoCabecalho, setEditandoCabecalho] = useState(false);

  const aberto = boletim.situacao === "aberto";
  // Aberto E do time: é o que libera colar, corrigir e fechar.
  const mexe = aberto && podeMexer;
  const seguinte = SEGUINTE[boletim.situacao];
  const r = resumir(itens);
  const fracaoMargem = r.margem !== null && r.valor > 0 ? r.margem / r.valor : null;
  const naOficina = itens.filter((i) => entrouNaOficina(i.etapa_om)).length;
  // O papel da Rio+ não tem recibo: não se cobra o que ele não mostra.
  const comRecibo = boletim.modelo !== "rio_mais";
  const semRecibo = comRecibo ? itens.filter((i) => !i.om_retirada || !i.recibo_entrega).length : 0;
  // A OM se fatura uma a uma com o boletim já apresentado; faturado inteiro,
  // todas contam e não há o que marcar.
  const faturavel = boletim.situacao === "fechado" || boletim.situacao === "enviado";
  const faturado = itens.filter((i) => i.faturada).reduce((t, i) => t + i.valor, 0);

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

  function buscar() {
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
  }

  // O que conferir antes de fechar: cada item diz se está ok ou o que falta.
  const conferir: { ok: boolean; texto: string; acao?: React.ReactNode }[] = [
    { ok: itens.length > 0, texto: itens.length ? `${itens.length} OM(s) no boletim` : "Nenhuma OM ainda" },
    {
      ok: r.semValor === 0,
      texto: r.semValor ? `${r.semValor} OM(s) com valor zero` : "Toda OM tem valor",
    },
    {
      ok: r.valorEhCusto === 0,
      texto: r.valorEhCusto
        ? `${r.valorEhCusto} OM(s) com o custo no lugar do preço`
        : "Os valores vêm do orçamento",
    },
    {
      ok: naOficina === 0,
      texto: naOficina ? `${naOficina} OM(s) entraram com a oficina trabalhando` : "Nenhuma OM ainda na oficina",
    },
    ...(comRecibo
      ? [
          {
            ok: semRecibo === 0,
            texto: semRecibo ? `${semRecibo} OM(s) sem proposta ou OM entrega` : "Proposta e OM entrega preenchidas",
            acao:
              semRecibo > 0 && mexe ? (
                <button type="button" onClick={buscar} disabled={enviando} className="font-semibold text-acento underline">
                  Buscar na OS e no Roteiros
                </button>
              ) : undefined,
          },
        ]
      : []),
    {
      ok: Boolean(boletim.base && (boletim.contato || boletim.email) && boletim.local_obra),
      texto:
        boletim.base && (boletim.contato || boletim.email) && boletim.local_obra
          ? "Cabeçalho do papel completo"
          : "Cabeçalho do papel incompleto",
    },
  ];
  const pendencias = conferir.filter((c) => !c.ok).length;

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo={`${boletim.numero} · ${boletim.base ?? boletim.cliente}`}
        resumo={
          <>
            {boletim.cliente}
            {boletim.referencia ? ` · ${boletim.referencia}` : ""} · OMs de{" "}
            {periodo(boletim.primeira_om, boletim.ultima_om)}
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
            {seguinte && podeMexer && (
              <Botao
                variante="primario"
                disabled={enviando || (seguinte === "fechado" && itens.length === 0)}
                onClick={() => fazer(() => andar(boletim.id, seguinte, nota), () => setNota(""))}
              >
                {ACAO_SEGUINTE[boletim.situacao]}
              </Botao>
            )}
          </>
        }
      />

      {!podeMexer && (
        <SoLeitura>Você vê o boletim, mas quem lança é {quemLanca("boletim")}.</SoLeitura>
      )}
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}
      {recado && (
        <Aviso tom="ok" aoFechar={() => setRecado(null)}>
          {recado}
        </Aviso>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Esquerda: o trabalho ─────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          {mexe && (
            <ColarDoSisloc
              boletim={{ id: boletim.id, numero: boletim.numero, cliente: boletim.cliente, base: boletim.base }}
              abertos={[]}
              jaMedidas={jaMedidas}
              recolhido={itens.length > 0}
            />
          )}

          <Painel
            titulo={`OMs do boletim · ${itens.length}`}
            descricao={
              mexe
                ? "O valor, a proposta e a OM entrega se corrigem no próprio cartão; o resto em Editar."
                : faturavel
                  ? "Marque cada OM faturada — é o STATUS do papel e o faturado do painel."
                  : undefined
            }
            acoes={
              mexe && !digitando ? (
                <Botao variante="discreto" onClick={() => setDigitando(true)}>
                  Incluir OM à mão
                </Botao>
              ) : undefined
            }
          >
            {digitando && (
              <div className="border-b border-borda bg-superficie-2 p-4">
                <p className="mb-3 text-xs text-texto-2">Para a OM que não veio na colagem. Tudo aqui vai para o papel.</p>
                <FormularioDaOm
                  ocupado={enviando}
                  aoCancelar={() => setDigitando(false)}
                  aoSalvar={(c) => fazer(() => incluirOmAMao(boletim.id, c), () => setDigitando(false))}
                />
              </div>
            )}
            {itens.length === 0 ? (
              <p className="p-4 text-sm text-texto-3">Nenhuma OM ainda. Cole a lista do Sisloc acima, ou inclua à mão.</p>
            ) : (
              <div className="grid gap-3 p-4 lg:grid-cols-2">
                {itens.map((i) => (
                  <CartaoDaOm
                    // Renasce quando o valor ou os recibos mudam por fora.
                    key={`${i.id}:${i.om_retirada ?? ""}:${i.recibo_entrega ?? ""}:${i.valor}`}
                    item={i}
                    aberto={mexe}
                    comRecibo={comRecibo}
                    faturavel={faturavel}
                    ocupado={enviando}
                    aoMudarValor={(v) => fazer(() => mudarValor(boletim.id, i.id, v))}
                    aoEditar={(c) => fazer(() => editarOm(boletim.id, i.id, c, i.valor))}
                    aoMudarRecibos={(rec) => fazer(() => mudarRecibos(boletim.id, i.id, rec))}
                    aoTirar={() => {
                      if (!window.confirm(`Tirar a OM ${i.om} deste boletim?`)) return;
                      fazer(() => tirarOm(boletim.id, i.id));
                    }}
                    aoFaturar={() => {
                      const nf = window.prompt(`OM ${i.om} faturada. Número da nota fiscal (opcional):`, "");
                      if (nf === null) return;
                      fazer(() => faturarOm(boletim.id, i.id, nf));
                    }}
                    aoDesfazer={() => {
                      if (!window.confirm(`A OM ${i.om} volta a PENDENTE?`)) return;
                      fazer(() => desfazerFaturamento(boletim.id, i.id));
                    }}
                  />
                ))}
              </div>
            )}
          </Painel>
        </div>

        {/* ── Direita: o que se confere ───────────────────────── */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Painel titulo="Andamento">
            <div className="space-y-3 p-4">
              <ol className="flex items-center gap-1 text-[11px]">
                {SITUACOES.map((s, n) => {
                  const atual = SITUACOES.indexOf(boletim.situacao);
                  const feito = n < atual;
                  const agora = n === atual;
                  return (
                    <li key={s} className="flex flex-1 flex-col items-center gap-1 text-center">
                      <span
                        className={`h-1.5 w-full rounded-full ${feito || agora ? "bg-acento" : "bg-superficie-3"}`}
                      />
                      <span className={agora ? "font-semibold text-texto" : feito ? "text-texto-2" : "text-texto-3"}>
                        {ROTULO_SITUACAO[s]}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="flex flex-wrap items-center gap-2 text-xs text-texto-3">
                <Selo tom={TOM_SITUACAO[boletim.situacao]}>{ROTULO_SITUACAO[boletim.situacao]}</Selo>
                {boletim.situacao_em && (
                  <span>
                    desde {quando(boletim.situacao_em)}
                    {boletim.situacao_por_nome && ` · ${boletim.situacao_por_nome}`}
                  </span>
                )}
              </div>
              {seguinte && seguinte !== "fechado" && (
                <Campo rotulo={`Anotação do passo "${ACAO_SEGUINTE[boletim.situacao]}" (opcional)`}>
                  <input
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder={seguinte === "enviado" ? "para quem foi, por onde" : "nº da nota fiscal, data"}
                    className={`${CAMPO} w-full`}
                  />
                </Campo>
              )}
              <div className="flex flex-wrap gap-2">
                {ehDiretoria && PODE_REABRIR.includes(boletim.situacao) && !reabrindo && (
                  <Botao variante="discreto" onClick={() => setReabrindo(true)}>
                    Reabrir
                  </Botao>
                )}
                {mexe && itens.length === 0 && (
                  <Botao
                    variante="discreto"
                    disabled={enviando}
                    onClick={() => {
                      if (!window.confirm(`Apagar o ${boletim.numero}, que está vazio?`)) return;
                      fazer(() => apagarBoletim(boletim.id), () => router.push("/"));
                    }}
                  >
                    Apagar boletim vazio
                  </Botao>
                )}
              </div>
              {reabrindo && (
                <form
                  className="space-y-2"
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
                  <Campo rotulo="Por que reabrir" obrigatorio>
                    <input
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      required
                      placeholder="o cliente contestou a OM…"
                      className={`${CAMPO} w-full`}
                    />
                  </Campo>
                  <div className="flex gap-2">
                    <Botao type="submit" variante="perigo" disabled={enviando || !motivo.trim()}>
                      Reabrir
                    </Botao>
                    <Botao type="button" variante="discreto" onClick={() => setReabrindo(false)}>
                      Cancelar
                    </Botao>
                  </div>
                </form>
              )}
            </div>
          </Painel>

          <Painel titulo="Quanto cobra">
            <dl className="space-y-1.5 p-4 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt className="text-texto-2">A cobrar</dt>
                <dd className="text-lg font-semibold">{emReais(r.valor)}</dd>
              </div>
              {!aberto && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-texto-2">Faturado</dt>
                    <dd>{emReais(faturado)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-saldo">Saldo</dt>
                    <dd className="font-semibold text-saldo">{emReais(r.valor - faturado)}</dd>
                  </div>
                  <Progresso fracao={r.valor > 0 ? faturado / r.valor : null} cor="bg-disponivel" />
                </>
              )}
              {/* Custo e margem são da casa: a tela mostra, o papel não. */}
              <div className="flex justify-between border-t border-borda pt-1.5 text-xs text-texto-3">
                <dt>Custo no Sisloc</dt>
                <dd>{r.custo > 0 ? emReais(r.custo) : "—"}</dd>
              </div>
              <div className="flex justify-between text-xs text-texto-3">
                <dt>Margem</dt>
                <dd className={r.margem !== null && r.margem < 0 ? "font-semibold text-manutencao" : ""}>
                  {r.margem === null ? "sem custo lançado" : `${emReais(r.margem)} · ${emPorcento(fracaoMargem)}`}
                </dd>
              </div>
            </dl>
          </Painel>

          {aberto && (
            <Painel
              titulo="Antes de fechar"
              descricao={pendencias ? `${pendencias} ponto(s) para conferir` : "Tudo certo para fechar"}
            >
              <ul className="space-y-1.5 p-4 text-xs">
                {conferir.map((c) => (
                  <li key={c.texto} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                        c.ok ? "bg-disponivel" : "bg-reservado"
                      }`}
                      aria-hidden
                    >
                      {c.ok ? "✓" : "!"}
                    </span>
                    <span className={c.ok ? "text-texto-2" : "text-texto"}>
                      {c.texto}
                      {c.acao && <span className="block">{c.acao}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Painel>
          )}

          <CabecalhoDoPapel
            boletim={boletim}
            aberto={mexe}
            ocupado={enviando}
            editando={editandoCabecalho}
            documentoSugerido={documentoSugerido}
            aoEditar={setEditandoCabecalho}
            aoSalvar={(c) => fazer(() => editarBoletim(boletim.id, c), () => setEditandoCabecalho(false))}
            aoPuxar={() => fazer(() => puxarDaBase(boletim.id))}
          />

          <Painel titulo="Histórico">
            <ul className="divide-y divide-borda text-xs">
              {andamentos.map((a) => (
                <li key={a.id} className="px-4 py-2">
                  <span className="font-medium">{ROTULO_SITUACAO[situacaoLida(a.situacao)]}</span>{" "}
                  <span className="text-texto-3">
                    {quando(a.em)}
                    {a.quem_nome && ` · ${a.quem_nome}`}
                  </span>
                  {a.observacao && <span className="block text-texto-2">{a.observacao}</span>}
                </li>
              ))}
              <li className="px-4 py-2">
                <span className="font-medium">Aberto</span>{" "}
                <span className="text-texto-3">
                  {quando(boletim.criado_em)}
                  {boletim.criado_por_nome && ` · ${boletim.criado_por_nome}`}
                </span>
              </li>
            </ul>
          </Painel>
        </aside>
      </div>
    </div>
  );
}

/** Uma OM do boletim, em cartão. Aberto, o valor e os recibos se corrigem aqui. */
function CartaoDaOm({
  item,
  aberto,
  comRecibo,
  faturavel,
  ocupado,
  aoMudarValor,
  aoEditar,
  aoMudarRecibos,
  aoTirar,
  aoFaturar,
  aoDesfazer,
}: {
  item: ItemDoBoletim;
  aberto: boolean;
  comRecibo: boolean;
  faturavel: boolean;
  ocupado: boolean;
  aoMudarValor: (v: number) => void;
  aoEditar: (c: CamposDaOm) => void;
  aoMudarRecibos: (r: { omRetirada: string; reciboEntrega: string }) => void;
  aoTirar: () => void;
  aoFaturar: () => void;
  aoDesfazer: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [editandoValor, setEditandoValor] = useState(false);
  const [texto, setTexto] = useState("");
  const [invalido, setInvalido] = useState(false);
  const [retirada, setRetirada] = useState(item.om_retirada ?? "");
  const [entrega, setEntrega] = useState(item.recibo_entrega ?? "");
  const naOficina = entrouNaOficina(item.etapa_om);
  const custoNoPreco = item.fonte === "previsto" || item.fonte === "gasto" || item.fonte === "nenhum";

  function salvarValor() {
    const v = lerValorDigitado(texto);
    if (v === null) {
      setInvalido(true);
      return;
    }
    setEditandoValor(false);
    setInvalido(false);
    if (v !== item.valor) aoMudarValor(v);
  }

  // Salva ao sair do campo, e só se mudou: recibo se digita em sequência.
  function salvarRecibos() {
    if (retirada === (item.om_retirada ?? "") && entrega === (item.recibo_entrega ?? "")) return;
    aoMudarRecibos({ omRetirada: retirada, reciboEntrega: entrega });
  }

  if (editando) {
    return (
      <section className="rounded-xl border border-acento bg-superficie p-4 shadow-cartao lg:col-span-2">
        <p className="mb-3 text-sm font-semibold">Editar a OM {item.om}</p>
        <FormularioDaOm
          item={item}
          ocupado={ocupado}
          aoCancelar={() => setEditando(false)}
          aoSalvar={(c) => {
            setEditando(false);
            aoEditar(c);
          }}
        />
      </section>
    );
  }

  const recibo = (valor: string, mudar: (v: string) => void, rotulo: string) =>
    aberto ? (
      <input
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        onBlur={salvarRecibos}
        disabled={ocupado}
        aria-label={`${rotulo} da OM ${item.om}`}
        placeholder="—"
        className={`${CAMPO} h-8 w-full font-mono text-xs ${valor ? "" : "border-reservado/60"}`}
      />
    ) : (
      <p className="font-mono text-xs">{valor || "—"}</p>
    );

  return (
    <section
      className={`flex flex-col rounded-xl border bg-superficie p-4 shadow-cartao ${
        naOficina && aberto ? "border-manutencao/40" : "border-borda"
      }`}
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {/* No papel com recibos o número que se procura é o da proposta;
                a OM vai para baixo, junto da OM entrega. */}
            {comRecibo && aberto ? (
              // Aberto, a proposta se digita no próprio número do topo.
              <label className="flex min-w-0 items-baseline gap-1.5">
                <span className="font-mono text-sm font-semibold">Proposta</span>
                <input
                  value={retirada}
                  onChange={(e) => setRetirada(e.target.value)}
                  onBlur={salvarRecibos}
                  disabled={ocupado}
                  aria-label={`Proposta da OM ${item.om}`}
                  placeholder="digite"
                  className={`${CAMPO} h-7 w-28 min-w-[5.5rem] shrink px-2 font-mono text-sm font-semibold ${retirada ? "" : "border-reservado/60"}`}
                />
              </label>
            ) : (
              <span className="font-mono text-sm font-semibold">
                {comRecibo && retirada.trim() ? `Proposta ${retirada.trim()}` : `OM ${item.om}`}
              </span>
            )}
            <span className="text-xs text-texto-3">{dataCurta(dataDaOm(item))}</span>
          </p>
          <p className="truncate text-sm" title={item.equipamento ?? ""}>
            {item.equipamento ?? "—"}
          </p>
          <p className="text-xs text-texto-3">
            patrimônio <span className="font-mono">{item.patrimonio ?? "—"}</span>
            {item.tipo_om && ` · ${item.tipo_om}`}
          </p>
        </div>
        <div className="text-right">
          {aberto && editandoValor ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                salvarValor();
              }}
            >
              <input
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setInvalido(false);
                }}
                onBlur={salvarValor}
                onKeyDown={(e) => e.key === "Escape" && setEditandoValor(false)}
                autoFocus
                inputMode="decimal"
                aria-label={`Valor da OM ${item.om}`}
                aria-invalid={invalido}
                className={`${CAMPO} h-8 w-28 text-right text-sm ${invalido ? "border-manutencao" : ""}`}
              />
            </form>
          ) : (
            <button
              type="button"
              disabled={!aberto || ocupado}
              onClick={() => {
                setTexto(item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
                setEditandoValor(true);
              }}
              title={aberto ? "Clique para mudar o valor" : undefined}
              className={`text-right ${aberto ? "rounded-md px-1 hover:bg-superficie-2" : "cursor-default"}`}
            >
              <span className="block text-base font-semibold tabular-nums">{emReais(item.valor)}</span>
              <span className={`block text-[11px] ${custoNoPreco && aberto ? "text-manutencao" : "text-texto-3"}`}>
                {ROTULO_FONTE[item.fonte]}
              </span>
            </button>
          )}
          {item.custo !== null && <p className="text-[11px] text-texto-3">custo {emReais(item.custo)}</p>}
        </div>
      </header>

      {(naOficina || item.observacao) && (
        <p className="mt-2 text-xs">
          {naOficina && <span className="block text-manutencao">entrou com a oficina em: {item.etapa_om}</span>}
          {item.observacao && <span className="block text-texto-2">{item.observacao}</span>}
        </p>
      )}

      {comRecibo && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="mb-0.5 text-[11px] text-texto-3">Nº OM</p>
            <p className={`font-mono text-xs ${aberto ? "flex h-8 items-center" : ""}`}>{item.om}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[11px] text-texto-3">OM entrega</p>
            {recibo(entrega, setEntrega, "OM entrega")}
          </div>
        </div>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-3 pt-3 text-xs">
        {!aberto && (
          <Selo tom={item.faturada ? "ok" : "neutro"}>
            {statusDaOm(item)}
            {item.nota_fiscal ? ` · NF ${item.nota_fiscal}` : ""}
          </Selo>
        )}
        {faturavel && (
          <button
            type="button"
            disabled={ocupado}
            onClick={item.faturada ? aoDesfazer : aoFaturar}
            className="font-semibold text-acento underline"
          >
            {item.faturada ? "Desfazer" : "Marcar faturada"}
          </button>
        )}
        {aberto && (
          <span className="ml-auto flex gap-3">
            <button type="button" onClick={() => setEditando(true)} className="font-semibold text-texto-2 underline">
              Editar
            </button>
            <button type="button" disabled={ocupado} onClick={aoTirar} className="font-semibold text-manutencao underline">
              Tirar
            </button>
          </span>
        )}
      </footer>
    </section>
  );
}

/**
 * O cabeçalho do papel. Em leitura por padrão — o que está vazio aparece
 * marcado, e não com um exemplo cinza que parece preenchido. "Editar" abre o
 * formulário; "Puxar da base" traz o cadastro.
 */
function CabecalhoDoPapel({
  boletim,
  aberto,
  ocupado,
  editando,
  documentoSugerido,
  aoEditar,
  aoSalvar,
  aoPuxar,
}: {
  boletim: BoletimAtual;
  aberto: boolean;
  ocupado: boolean;
  editando: boolean;
  documentoSugerido: string | null;
  aoEditar: (v: boolean) => void;
  aoSalvar: (c: CabecalhoDoBoletim) => void;
  aoPuxar: () => void;
}) {
  const [campos, setCampos] = useState(() => cabecalhoDe(boletim));

  const linha = (rotulo: string, valor: string | null, obrigatorio = false) => (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-texto-3">{rotulo}</dt>
      <dd
        className={`min-w-0 text-right break-words ${valor ? "" : obrigatorio ? "text-reservado" : "text-texto-3"}`}
      >
        {valor || (obrigatorio ? "falta" : "—")}
      </dd>
    </div>
  );

  if (!editando) {
    return (
      <Painel
        titulo="Cabeçalho do papel"
        acoes={
          aberto ? (
            <>
              <button type="button" onClick={aoPuxar} disabled={ocupado} className="text-xs font-semibold text-acento underline">
                Puxar da base
              </button>
              <button
                type="button"
                onClick={() => {
                  setCampos(cabecalhoDe(boletim));
                  aoEditar(true);
                }}
                className="text-xs font-semibold text-acento underline"
              >
                Editar
              </button>
            </>
          ) : undefined
        }
      >
        <dl className="space-y-1 p-4 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-texto-3">Documento Nº</dt>
            <dd className="text-right">
              {boletim.documento?.trim() ? (
                documentoDoBoletim(boletim)
              ) : (
                <>
                  <span className="text-texto-3">{documentoDoBoletim(boletim)} (da casa)</span>
                  {aberto && documentoSugerido && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => aoSalvar({ ...cabecalhoDe(boletim), documento: documentoSugerido })}
                      className="ml-2 font-semibold text-acento underline"
                    >
                      usar nº {documentoSugerido} da base
                    </button>
                  )}
                </>
              )}
            </dd>
          </div>
          {linha("Mês de referência", boletim.referencia, true)}
          {linha("Base", boletim.base, true)}
          {linha("Responsável", boletim.contato, true)}
          {linha("E-mail", boletim.email)}
          {linha("Telefone", boletim.telefone)}
          {linha("Local da obra", boletim.local_obra, true)}
          {linha("Papel", ROTULO_MODELO[modeloLido(boletim.modelo)])}
          {linha("Observações", boletim.observacao)}
        </dl>
        <p className="border-t border-borda px-4 py-2 text-[11px] text-texto-3">
          O boletim novo nasce com o cadastro da base.{" "}
          <Link href={`/bases?base=${encodeURIComponent(boletim.base ?? "")}`} className="underline">
            Abrir o cadastro
          </Link>
        </p>
      </Painel>
    );
  }

  const campo = (k: keyof CabecalhoDoBoletim, rotulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Campo rotulo={rotulo}>
      <input
        value={campos[k]}
        onChange={(e) => setCampos((c) => ({ ...c, [k]: e.target.value }))}
        className={`${CAMPO} w-full`}
        {...extra}
      />
    </Campo>
  );

  return (
    <Painel titulo="Cabeçalho do papel" descricao="O que vai nas caixas do topo e nos dados do cliente.">
      <form
        className="space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          aoSalvar(campos);
        }}
      >
        <Campo rotulo="Papel">
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
        {campo("documento", `Documento Nº${documentoSugerido ? ` (próximo da base: ${documentoSugerido})` : ""}`)}
        {campo("referencia", "Mês de referência (ex.: SETEMBRO/2026)")}
        {campo("base", "Base / fiscalização")}
        {campo("contato", "Responsável (contato do cliente)")}
        {campo("email", "E-mail do cliente", { type: "email" })}
        {campo("telefone", "Telefone do cliente", { inputMode: "tel" })}
        {campo("localObra", "Local da obra")}
        <Campo rotulo="Observações gerais">
          <textarea
            value={campos.observacao}
            onChange={(e) => setCampos((c) => ({ ...c, observacao: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-borda bg-superficie p-2 text-sm outline-none focus:border-acento"
          />
        </Campo>
        <div className="flex gap-2">
          <Botao type="submit" variante="primario" disabled={ocupado}>
            Salvar
          </Botao>
          <Botao type="button" variante="discreto" onClick={() => aoEditar(false)}>
            Cancelar
          </Botao>
        </div>
      </form>
    </Painel>
  );
}
