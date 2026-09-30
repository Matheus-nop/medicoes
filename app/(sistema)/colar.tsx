"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao, Painel, Selo } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  ROTULO_FONTE,
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
}: {
  /** Dentro de um boletim: só entra o cliente dele. */
  boletim?: BoletimAberto;
  /** Os boletins abertos, para a colagem da lista achar o de cada base. */
  abertos: BoletimAberto[];
  /** OM → número do boletim onde ela já está. */
  jaMedidas: Record<string, string>;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [leitura, setLeitura] = useState<LeituraDaMedicao | null>(null);
  const [aberto, setAberto] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  // Os grupos em que a pessoa pediu para levar também as OMs sem orçamento.
  const [comSemOrcamento, setComSemOrcamento] = useState<Set<string>>(new Set());

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

  // O grupo tem o que cobrar: ao menos uma OM ainda não medida com orçamento.
  // Os que não têm vão para o fim, recolhidos — numa colagem de 23 OMs com
  // uma só orçada, dezoito cartões de R$ 0,00 escondiam o único que importava.
  // O que a pessoa marcou para levar sem orçamento sobe junto.
  const temCobranca = (g: GrupoDeDestino) =>
    comSemOrcamento.has(g.chave) || g.linhas.some((l) => !jaMedidas[l.om] && l.valor > 0);

  // Função que desenha, e não componente: um componente declarado dentro de
  // outro nasce de novo a cada render e perde o estado do que está embaixo.
  function desenharGrupo(g: GrupoDeDestino, deOutraBase = false) {
    const naoMedidas = g.linhas.filter((l) => !jaMedidas[l.om]);
    const repetidas = g.linhas.length - naoMedidas.length;
    // Sem orçamento no Sisloc não há o que cobrar — a OM fica de fora, a não
    // ser que quem monta o boletim marque para levar (e ponha o valor depois).
    const semOrcamento = naoMedidas.filter((l) => l.valor === 0);
    const levaSem = comSemOrcamento.has(g.chave);
    const novas = levaSem ? naoMedidas : naoMedidas.filter((l) => l.valor > 0);
    const naOficina = novas.filter((l) => l.naOficina).length;
    const valorNovas = novas.reduce((t, l) => t + l.valor, 0);
    const destino =
      boletim ?? abertos.find((b) => chaveDoDestino(b.cliente, b.base) === g.chave) ?? null;

    return (
      <section key={g.chave} className="rounded-xl border border-borda">
        <header className="flex flex-wrap items-center gap-2 border-b border-borda px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{g.cliente}</p>
            <p className="truncate text-xs text-texto-2">
              Base: {g.base || <span className="text-texto-3">o Sisloc não diz</span>}
            </p>
            <p className="text-xs text-texto-3">
              {novas.length} nova{novas.length === 1 ? "" : "s"} · {emReais(valorNovas)}
              {repetidas > 0 && ` · ${repetidas} já medida(s)`}
              {semOrcamento.length > 0 && !levaSem && ` · ${semOrcamento.length} sem orçamento, de fora`}
              {naOficina > 0 && (
                <span className="text-manutencao"> · {naOficina} ainda na oficina</span>
              )}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
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
                {semOrcamento.length === 1
                  ? "levar a que está sem orçamento"
                  : `levar as ${semOrcamento.length} sem orçamento`}
              </label>
            )}
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
                variante={destino ? "contorno" : "primario"}
                disabled={enviando || novas.length === 0}
                onClick={() => incluir(null, g, novas)}
              >
                {destino ? "Abrir outro boletim" : "Abrir boletim"}
              </Botao>
            )}
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-xs">
            <thead className="text-texto-3">
              <tr className="border-b border-borda">
                <th className="px-3 py-2 font-medium">OM</th>
                <th className="py-2 pr-2 font-medium">Data</th>
                <th className="py-2 pr-2 font-medium">Patrimônio</th>
                <th className="py-2 pr-2 font-medium">Equipamento</th>
                <th className="py-2 pr-2 font-medium">Recibo retirada</th>
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
                    <td className="py-2 pr-2 tabular-nums">
                      {dataCurta(l.chegadaEm ?? l.abertaEm)}
                    </td>
                    <td className="py-2 pr-2 font-mono">{l.patrimonio || "—"}</td>
                    <td className="py-2 pr-2">
                      {descricaoDoEquipamento(l.equipamento, l.complemento) || "—"}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {l.omRetirada || <span className="text-texto-3">—</span>}
                    </td>
                    <td className="py-2 pr-2">
                      {l.naOficina ? (
                        <span className="text-manutencao">{rotuloDaEtapa(l.etapa)}</span>
                      ) : (
                        <span className="text-texto-3">{rotuloDaEtapa(l.etapa)}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {onde ? (
                        <Selo>já no {onde}</Selo>
                      ) : (
                        <>
                          <span className="block font-semibold tabular-nums">
                            {emReais(l.valor)}
                          </span>
                          <span
                            className={`block text-[11px] ${
                              l.fonte === "orcamento" ? "text-texto-3" : "text-manutencao"
                            }`}
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
      </section>
    );
  }

  return (
    <Painel
      titulo="Colar do Sisloc"
      descricao="A lista de OMs com a linha de títulos. Cliente, base, equipamento, recibo e valor saem das colunas."
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

        {leitura?.temCabecalho && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-texto-2">
              <span>
                {leitura.linhas.length} OM{leitura.linhas.length === 1 ? "" : "s"} lida
                {leitura.linhas.length === 1 ? "" : "s"}
                {!boletim && ` · ${grupos.length} cliente(s) e base(s) — cada par é um boletim`}
              </span>
              {leitura.ignoradas.length > 0 && (
                <span>· {leitura.ignoradas.length} linha(s) pulada(s)</span>
              )}
              <Botao variante="discreto" className="ml-auto" onClick={limpar}>
                Descartar a colagem
              </Botao>
            </div>

            {daBase.length === 0 && outrasBases.length === 0 && (
              <Aviso tom="erro">
                {boletim
                  ? `Nenhuma OM desta colagem é de ${boletim.cliente}.`
                  : "Nenhuma OM reconhecida nesta colagem."}
              </Aviso>
            )}

            {daBase.filter(temCobranca).map((g) => desenharGrupo(g))}

            {daBase.some((g) => !temCobranca(g)) && (
              <details className="rounded-xl border border-dashed border-borda">
                <summary className="cursor-pointer px-3 py-2.5 text-xs text-texto-2">
                  {daBase.filter((g) => !temCobranca(g)).length} base(s) sem nada a cobrar nesta
                  colagem — tudo sem orçamento no Sisloc ou já medido. Abra para levar alguma
                  mesmo assim.
                </summary>
                <div className="space-y-3 p-3 pt-0">
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
                {outrasBases.map((g) => desenharGrupo(g, true))}
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
