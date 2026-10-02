"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao, Painel, Selo } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import { acharBase, dadosDoBoletimNovo, proximoDocumento, type Base } from "@/lib/medicoes/bases";
import {
  ROTULO_FONTE,
  ROTULO_MODELO,
  chaveDoCliente,
  chaveDoDestino,
  descricaoDoEquipamento,
  lerOmsDaMedicao,
  porDestino,
  rotuloDaEtapa,
  type GrupoDeDestino,
  type LeituraDaMedicao,
  type OmLida,
} from "@/lib/medicoes/medicoes";
import { incluirOms } from "./acoes";
import { dataCurta } from "./formato";

export interface BoletimAberto {
  id: number;
  numero: string;
  cliente: string;
  base: string | null;
}

/**
 * A colagem do Sisloc virando boletim.
 *
 * Duas casas: na lista de medições ela separa a colagem por cliente e base,
 * e cada par vai para o boletim aberto dele (ou abre um); dentro de um
 * boletim ela fica com as OMs daquela base e oferece, à parte, as das outras
 * bases do mesmo cliente — o nome da base no Sisloc nem sempre é escrito
 * igual, e quem monta o boletim sabe quando duas são a mesma.
 *
 * Nada é gravado ao colar. A pessoa lê, confere o valor e a fonte dele, e só
 * então aperta — boletim é papel que vai para o cliente, e colagem torta
 * gravada sem conferência vira cobrança torta.
 */
export function ColarDoSisloc({
  boletim,
  abertos,
  jaMedidas,
  bases = [],
  todos = [],
  recolhido = false,
}: {
  /** Dentro de um boletim: só entra o cliente dele. */
  boletim?: BoletimAberto;
  /** Os boletins abertos, para a colagem da lista achar o de cada base. */
  abertos: BoletimAberto[];
  /** OM → número do boletim onde ela já está. */
  jaMedidas: Record<string, string>;
  /** O cadastro de bases: o que o boletim novo vai puxar. */
  bases?: Base[];
  /** Todos os boletins (cliente, base, documento): o próximo Documento Nº. */
  todos?: { cliente: string; base: string | null; documento: string | null }[];
  /** Começa fechado — dentro do boletim que já tem OMs, colar é o de menos. */
  recolhido?: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [leitura, setLeitura] = useState<LeituraDaMedicao | null>(null);
  const [aberto, setAberto] = useState(!recolhido);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  // Os grupos em que a pessoa pediu para levar também as OMs sem orçamento.
  const [comSemOrcamento, setComSemOrcamento] = useState<Set<string>>(new Set());
  // As bases com a lista de OMs aberta. Fechadas por padrão: o que se confere
  // primeiro é o cartão — para onde vai, quanto, e o que tem de estranho.
  const [vendoOms, setVendoOms] = useState<Set<string>>(new Set());
  // O resultado do "abrir todos": um boletim por base, com o link.
  const [abertosAgora, setAbertosAgora] = useState<{ numero: string; id: number; base: string; oms: number }[]>([]);

  const grupos = useMemo(() => (leitura ? porDestino(leitura.linhas) : []), [leitura]);

  const doBoletim = boletim ? chaveDoDestino(boletim.cliente, boletim.base) : null;
  const clienteDoBoletim = boletim ? chaveDoCliente(boletim.cliente) : null;
  const daBase = doBoletim ? grupos.filter((g) => g.chave === doBoletim) : grupos;
  const outrasBases = boletim
    ? grupos.filter(
        (g) => g.chave !== doBoletim && chaveDoCliente(g.cliente) === clienteDoBoletim,
      )
    : [];
  const deOutroCliente = boletim
    ? grupos.filter((g) => chaveDoCliente(g.cliente) !== clienteDoBoletim)
    : [];

  function ler() {
    setErro(null);
    setFeito(null);
    setLeitura(lerOmsDaMedicao(texto));
  }

  function limpar() {
    setTexto("");
    setLeitura(null);
    setComSemOrcamento(new Set());
  }

  function incluir(boletimId: number | null, g: GrupoDeDestino, linhas: OmLida[]) {
    setErro(null);
    setFeito(null);
    setAbertosAgora([]);
    iniciar(async () => {
      const r = await incluirOms({ boletimId, cliente: g.cliente, base: g.base, linhas });
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível incluir.");
        return;
      }
      const ficaram = r.jaMedidas?.length
        ? ` ${r.jaMedidas.length} já estavam em outro boletim e ficaram de fora.`
        : "";
      const achados = r.comprovantes
        ? ` ${r.comprovantes} comprovante(s) de retirada ou entrega achado(s) na OS e no Roteiros.`
        : "";
      const semRoteiros = r.semRoteiros
        ? " O Roteiros não respondeu (falta aplicar a 0003?) — só a OS foi consultada."
        : "";
      setFeito(
        `${r.incluidas} OM${r.incluidas === 1 ? "" : "s"} incluída${r.incluidas === 1 ? "" : "s"}${
          r.numero ? ` no ${r.numero}, aberto agora` : ""
        }.${ficaram}${achados}${semRoteiros}`,
      );
      limpar();
      if (!boletim && r.boletimId) router.push(`/boletins/${r.boletimId}`);
      else router.refresh();
    });
  }

  // O que vai de cada grupo: as não medidas com orçamento (e as sem, se
  // alguém marcou), e o boletim que as recebe.
  const doGrupo = (g: GrupoDeDestino) => {
    const naoMedidas = g.linhas.filter((l) => !jaMedidas[l.om]);
    const levaSem = comSemOrcamento.has(g.chave);
    const novas = levaSem ? naoMedidas : naoMedidas.filter((l) => l.valor > 0);
    const destino =
      boletim ?? abertos.find((b) => chaveDoDestino(b.cliente, b.base) === g.chave) ?? null;
    return { naoMedidas, levaSem, novas, destino };
  };

  /**
   * Abre (ou completa) o boletim de cada base com o que cobrar, um depois do
   * outro, e fica na tela com a lista do que foi feito — em vez de pular para
   * o primeiro boletim e deixar os outros para trás.
   */
  function incluirTodos(lista: GrupoDeDestino[]) {
    setErro(null);
    setFeito(null);
    setAbertosAgora([]);
    iniciar(async () => {
      const feitos: { numero: string; id: number; base: string; oms: number }[] = [];
      const falhas: string[] = [];
      for (const g of lista) {
        const { novas, destino } = doGrupo(g);
        if (novas.length === 0) continue;
        const r = await incluirOms({ boletimId: destino?.id ?? null, cliente: g.cliente, base: g.base, linhas: novas });
        if (!r.ok || !r.boletimId) {
          falhas.push(`${g.base || g.cliente}: ${r.erro ?? "não deu certo"}`);
          continue;
        }
        feitos.push({
          numero: r.numero ?? destino?.numero ?? "boletim",
          id: r.boletimId,
          base: g.base || g.cliente,
          oms: r.incluidas ?? novas.length,
        });
      }
      setAbertosAgora(feitos);
      if (falhas.length) setErro(`Não entraram: ${falhas.join(" · ")}`);
      limpar();
      router.refresh();
    });
  }

  // O grupo tem o que cobrar: ao menos uma OM ainda não medida com orçamento.
  // Os que não têm vão para o fim, recolhidos — numa colagem de 23 OMs com
  // uma só orçada, dezoito cartões de R$ 0,00 escondiam o único que importava.
  // O que a pessoa marcou para levar sem orçamento sobe junto.
  const temCobranca = (g: GrupoDeDestino) =>
    comSemOrcamento.has(g.chave) || g.linhas.some((l) => !jaMedidas[l.om] && l.valor > 0);

  // Função que desenha, e não componente: um componente declarado dentro de
  // outro nasce de novo a cada render e perde o estado do que está embaixo.
  function desenharGrupo(g: GrupoDeDestino, deOutraBase = false) {
    const { naoMedidas, levaSem, novas, destino } = doGrupo(g);
    const repetidas = g.linhas.length - naoMedidas.length;
    // Sem orçamento no Sisloc não há o que cobrar — a OM fica de fora, a não
    // ser que quem monta o boletim marque para levar (e ponha o valor depois).
    const semOrcamento = naoMedidas.filter((l) => l.valor === 0);
    const naOficina = novas.filter((l) => l.naOficina).length;
    const valorNovas = novas.reduce((t, l) => t + l.valor, 0);
    const cadastro = acharBase(bases, g.cliente, g.base);
    const dados = dadosDoBoletimNovo(g.cliente, cadastro, null);
    const vendo = vendoOms.has(g.chave);

    return (
      <section
        key={g.chave}
        className={`flex flex-col rounded-xl border bg-superficie shadow-cartao ${
          vendo ? "md:col-span-2" : ""
        } ${novas.length ? "border-borda" : "border-dashed border-borda"}`}
      >
        <header className="flex items-start gap-3 p-4 pb-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold tracking-wide text-texto-3 uppercase" title={g.cliente}>
              {g.cliente}
            </p>
            <h3 className="truncate text-sm font-semibold" title={g.base}>
              {g.base || <span className="text-texto-3">base que o Sisloc não diz</span>}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-lg leading-tight font-semibold tabular-nums">{emReais(valorNovas)}</p>
            <p className="text-[11px] text-texto-3">
              {novas.length} OM{novas.length === 1 ? "" : "s"} a cobrar
            </p>
          </div>
        </header>

        {/* Para onde vai — é a pergunta que a tela tem de responder primeiro. */}
        <div className="mx-4 rounded-lg bg-superficie-2 px-3 py-2 text-xs">
          {destino ? (
            <p>
              Entra no <strong>{destino.numero}</strong>, que está aberto para esta base.
            </p>
          ) : (
            <p>
              <strong>Boletim novo</strong>
              {g.base && <> · Documento Nº {proximoDocumento(todos, g.cliente, g.base)}</>} ·{" "}
              {ROTULO_MODELO[dados.modelo]}
            </p>
          )}
          <p className="mt-0.5 text-texto-2">
            {cadastro ? (
              <>
                Responsável: {cadastro.responsavel || <span className="text-manutencao">sem responsável no cadastro</span>}
                {cadastro.local_obra && <> · {cadastro.local_obra}</>}
              </>
            ) : g.base ? (
              <span className="text-texto-3">Base nova — entra no cadastro de bases ao abrir.</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 pt-2 text-[11px]">
          {repetidas > 0 && <Selo>{repetidas} já medida(s)</Selo>}
          {semOrcamento.length > 0 && !levaSem && <Selo>{semOrcamento.length} sem orçamento, de fora</Selo>}
          {naOficina > 0 && <Selo tom="aviso">{naOficina} ainda na oficina</Selo>}
          {novas.some((l) => l.fonte !== "orcamento") && <Selo tom="aviso">valor sem orçamento</Selo>}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 p-4 pt-3">
          <button
            type="button"
            onClick={() =>
              setVendoOms((v) => {
                const n = new Set(v);
                if (n.has(g.chave)) n.delete(g.chave);
                else n.add(g.chave);
                return n;
              })
            }
            className="text-xs font-semibold text-acento underline"
            aria-expanded={vendo}
          >
            {vendo ? "Esconder as OMs" : `Ver as ${g.linhas.length} OM(s)`}
          </button>
          {semOrcamento.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-texto-2">
              <input
                type="checkbox"
                checked={levaSem}
                onChange={(e) =>
                  setComSemOrcamento((atual) => {
                    const nova = new Set(atual);
                    if (e.target.checked) nova.add(g.chave);
                    else nova.delete(g.chave);
                    return nova;
                  })
                }
                className="size-4 accent-acento"
              />
              levar {semOrcamento.length === 1 ? "a sem orçamento" : `as ${semOrcamento.length} sem orçamento`}
            </label>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {destino && (
              <Botao
                variante={deOutraBase ? "contorno" : "primario"}
                disabled={enviando || novas.length === 0}
                onClick={() => incluir(destino.id, g, novas)}
              >
                {deOutraBase ? "Incluir mesmo assim" : `Incluir no ${destino.numero}`}
              </Botao>
            )}
            {!boletim && (
              <Botao
                variante={destino ? "discreto" : "primario"}
                disabled={enviando || novas.length === 0}
                onClick={() => incluir(null, g, novas)}
              >
                {destino ? "Abrir outro" : "Abrir boletim"}
              </Botao>
            )}
          </div>
        </div>

        {vendo && (
          <div className="overflow-x-auto border-t border-borda">
            <table className="w-full min-w-[52rem] text-left text-xs">
              <thead className="text-texto-3">
                <tr className="border-b border-borda">
                  <th className="px-3 py-2 font-medium">OM</th>
                  <th className="py-2 pr-2 font-medium">Data</th>
                  <th className="py-2 pr-2 font-medium">Patrimônio</th>
                  <th className="py-2 pr-2 font-medium">Equipamento</th>
                  <th className="py-2 pr-2 font-medium">Proposta</th>
                  <th className="py-2 pr-2 font-medium">Etapa</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {g.linhas.map((l) => {
                  const onde = jaMedidas[l.om];
                  const deFora = !onde && l.valor === 0 && !levaSem;
                  return (
                    <tr
                      key={l.om}
                      className={`border-b border-borda/50 align-top ${onde || deFora ? "opacity-45" : ""}`}
                    >
                      <td className="px-3 py-2 font-mono">{l.om}</td>
                      <td className="py-2 pr-2 tabular-nums">{dataCurta(l.chegadaEm ?? l.abertaEm)}</td>
                      <td className="py-2 pr-2 font-mono">{l.patrimonio || "—"}</td>
                      <td className="py-2 pr-2">{descricaoDoEquipamento(l.equipamento, l.complemento) || "—"}</td>
                      <td className="py-2 pr-2 font-mono">
                        {l.omRetirada || <span className="text-texto-3">—</span>}
                      </td>
                      <td className="py-2 pr-2">
                        <span className={l.naOficina ? "text-manutencao" : "text-texto-3"}>
                          {rotuloDaEtapa(l.etapa)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {onde ? (
                          <Selo>já no {onde}</Selo>
                        ) : (
                          <>
                            <span className="block font-semibold tabular-nums">{emReais(l.valor)}</span>
                            <span
                              className={`block text-[11px] ${l.fonte === "orcamento" ? "text-texto-3" : "text-manutencao"}`}
                            >
                              {ROTULO_FONTE[l.fonte]}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const comCobranca = daBase.filter(temCobranca);
  const totalACobrar = comCobranca.reduce((t, g) => t + doGrupo(g).novas.reduce((s, l) => s + l.valor, 0), 0);
  const omsACobrar = comCobranca.reduce((t, g) => t + doGrupo(g).novas.length, 0);
  const jaMedidasNaColagem = leitura ? leitura.linhas.filter((l) => jaMedidas[l.om]).length : 0;
  const semOrcamentoNaColagem = leitura
    ? leitura.linhas.filter((l) => !jaMedidas[l.om] && l.valor === 0).length
    : 0;

  return (
    <Painel
      titulo={boletim ? "Colar mais OMs do Sisloc" : "Colar do Sisloc"}
      descricao={
        boletim
          ? "Só as desta base entram aqui. As de outra base vão pela tela inicial."
          : "A lista de OMs com a linha de títulos. Cliente, base, equipamento, proposta e valor saem das colunas."
      }
      recolhido={!aberto}
      aoRecolher={() => setAberto((a) => !a)}
    >
      <div className="space-y-3 p-4">
        {erro && (
          <Aviso tom="erro" aoFechar={() => setErro(null)}>
            {erro}
          </Aviso>
        )}
        {feito && (
          <Aviso tom="ok" aoFechar={() => setFeito(null)}>
            {feito}
          </Aviso>
        )}

        {!leitura && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ler();
            }}
            className="space-y-3"
          >
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required
              rows={6}
              placeholder="Cole aqui as OMs copiadas do Sisloc, começando pela linha de títulos…"
              className="w-full rounded-md border border-borda bg-fundo p-2 font-mono text-xs outline-none focus:border-acento"
            />
            <Botao type="submit" variante="primario" disabled={!texto.trim()}>
              Ler as OMs
            </Botao>
          </form>
        )}

        {leitura && !leitura.temCabecalho && (
          <div className="space-y-3">
            <Aviso tom="erro">
              Não achei a linha de títulos. Copie a lista do Sisloc junto com o cabeçalho
              (Número, Cliente, Equipamento…): sem ele não dá para saber qual coluna é o
              valor, e valor na coluna errada é cobrança errada.
            </Aviso>
            <Botao onClick={() => setLeitura(null)}>Colar de novo</Botao>
          </div>
        )}

        {abertosAgora.length > 0 && (
          <Aviso tom="ok" aoFechar={() => setAbertosAgora([])}>
            {abertosAgora.length} boletim(ns) com as OMs da colagem:{" "}
            {abertosAgora.map((a, n) => (
              <span key={a.id}>
                {n > 0 && " · "}
                <Link href={`/boletins/${a.id}`} className="font-semibold underline">
                  {a.numero}
                </Link>{" "}
                {a.base} ({a.oms})
              </span>
            ))}
          </Aviso>
        )}

        {leitura?.temCabecalho && (
          <div className="space-y-4">
            {/* ── 1. O que a colagem trouxe ─────────────────────── */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Resumo rotulo="OMs lidas" valor={String(leitura.linhas.length)} detalhe={leitura.ignoradas.length ? `${leitura.ignoradas.length} linha(s) pulada(s)` : undefined} />
              <Resumo rotulo="A cobrar" valor={emReais(totalACobrar)} detalhe={`${omsACobrar} OM(s) em ${comCobranca.length} base(s)`} forte />
              <Resumo rotulo="Já medidas" valor={String(jaMedidasNaColagem)} detalhe="estão em outro boletim" />
              <Resumo rotulo="Sem orçamento" valor={String(semOrcamentoNaColagem)} detalhe="ficam de fora, a não ser que marque" />
            </div>

            {/* ── 2. O que fazer ────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-acento/30 bg-acento-fraco px-3 py-2 text-xs">
              <span className="text-texto">
                {boletim
                  ? "Confira as OMs desta base e inclua. Nada foi gravado ainda."
                  : "Confira cada base abaixo — para onde vai, quanto, e o que tem de estranho. Nada foi gravado ainda."}
              </span>
              <div className="ml-auto flex gap-2">
                <Botao variante="discreto" onClick={limpar} disabled={enviando}>
                  Descartar
                </Botao>
                {!boletim && comCobranca.length > 1 && (
                  <Botao variante="primario" disabled={enviando} onClick={() => incluirTodos(comCobranca)}>
                    {enviando ? "Abrindo…" : `Abrir os ${comCobranca.length} boletins · ${emReais(totalACobrar)}`}
                  </Botao>
                )}
              </div>
            </div>

            {daBase.length === 0 && outrasBases.length === 0 && (
              <Aviso tom="erro">
                {boletim
                  ? `Nenhuma OM desta colagem é de ${boletim.cliente}.`
                  : "Nenhuma OM reconhecida nesta colagem."}
              </Aviso>
            )}

            {/* ── 3. Um cartão por base ─────────────────────────── */}
            <div className="grid gap-3 md:grid-cols-2">{comCobranca.map((g) => desenharGrupo(g))}</div>

            {daBase.some((g) => !temCobranca(g)) && (
              <details className="rounded-xl border border-dashed border-borda">
                <summary className="cursor-pointer px-3 py-2.5 text-xs text-texto-2">
                  {daBase.filter((g) => !temCobranca(g)).length} base(s) sem nada a cobrar nesta
                  colagem — tudo sem orçamento no Sisloc ou já medido. Abra para levar alguma
                  mesmo assim.
                </summary>
                <div className="grid gap-3 p-3 pt-0 md:grid-cols-2">
                  {daBase.filter((g) => !temCobranca(g)).map((g) => desenharGrupo(g))}
                </div>
              </details>
            )}

            {outrasBases.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-texto-2">
                  Do mesmo cliente, em outra base. O boletim é por base — inclua aqui só se
                  for a mesma base escrita de outro jeito no Sisloc.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {outrasBases.map((g) => desenharGrupo(g, true))}
                </div>
              </div>
            )}

            {deOutroCliente.length > 0 && (
              <p className="text-xs text-texto-3">
                Ficaram de fora, por serem de outro cliente:{" "}
                {deOutroCliente.map((g) => `${g.cliente} (${g.linhas.length})`).join(" · ")}.
                Elas entram pela colagem da lista de medições.
              </p>
            )}

            {leitura.ignoradas.length > 0 && (
              <details className="text-xs text-texto-3">
                <summary className="cursor-pointer">Linhas puladas</summary>
                <ul className="mt-1 space-y-0.5">
                  {leitura.ignoradas.map((i, n) => (
                    <li key={n}>
                      <strong className="text-texto-2">{i.motivo}</strong> —{" "}
                      <span className="font-mono">{i.origem.slice(0, 90)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </Painel>
  );
}

function Resumo({
  rotulo,
  valor,
  detalhe,
  forte,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  forte?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${forte ? "border-acento/40 bg-acento-fraco" : "border-borda"}`}>
      <p className="text-[11px] font-semibold tracking-wide text-texto-3 uppercase">{rotulo}</p>
      <p className={`text-lg leading-tight font-semibold tabular-nums ${forte ? "text-acento" : ""}`}>{valor}</p>
      {detalhe && <p className="text-[11px] text-texto-3">{detalhe}</p>}
    </div>
  );
}
