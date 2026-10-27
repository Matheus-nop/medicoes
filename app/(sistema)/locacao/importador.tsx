"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Aviso, Botao, CAMPO, Campo, Selo } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  bateComOSisloc,
  cobravel,
  posicoesDoBoletim,
  totalLido,
} from "@/lib/medicoes/locacao";
import { gravarBoletins, lerPdf, type PdfLido } from "./acoes";
import { mesPorExtenso } from "./formato";

/**
 * Arrastar os PDFs do Sisloc: cada um é lido no servidor, um por vez, e
 * aparece aqui com o que se leu e se bate com o total do Sisloc. Nada se grava
 * até "Gravar" — como a colagem dos boletins de manutenção.
 */
export function Importador({
  clientes,
  clienteInicial,
  aoGravar,
}: {
  clientes: string[];
  clienteInicial: string;
  /** Para onde ir depois: a medição gravada, por padrão. */
  aoGravar?: "ficar";
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [cliente, setCliente] = useState(clienteInicial);
  const [lidos, setLidos] = useState<PdfLido[]>([]);
  const [lendo, setLendo] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, iniciar] = useTransition();

  const ler = async (arquivos: File[]) => {
    const pdfs = arquivos.filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    if (pdfs.length === 0) return setErro("Só PDF: o Boletim de medição exportado do Sisloc.");
    setErro(null);
    setLendo(pdfs.length);
    for (const f of pdfs) {
      const dados = new FormData();
      dados.set("pdf", f);
      const r = await lerPdf(dados);
      // O mesmo boletim arrastado de novo troca o de antes na lista.
      setLidos((x) => [
        ...x.filter((y) => !(y.ok && r.ok && y.boletim.cod_docto && y.boletim.cod_docto === r.boletim.cod_docto) && y.arquivo !== r.arquivo),
        r,
      ]);
      setLendo((n) => n - 1);
    }
  };

  const bons = lidos.filter((l): l is Extract<PdfLido, { ok: true }> => l.ok);

  return (
    <div className="space-y-3 p-4">
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_1fr]">
        <Campo rotulo="Cliente da medição">
          <select value={cliente} onChange={(e) => setCliente(e.target.value)} className={`${CAMPO} w-full`}>
            {clientes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            void ler([...e.dataTransfer.files]);
          }}
          className={`rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
            arrastando ? "border-acento bg-acento-fraco" : "border-borda-forte bg-superficie-2 hover:border-acento/60"
          }`}
        >
          <span className="block font-semibold text-acento">Arraste aqui os boletins de medição do Sisloc</span>
          <span className="text-xs text-texto-3">
            ou clique para escolher · um ou vários PDFs de uma vez · um por base
          </span>
        </button>
        <input
          ref={entrada}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void ler([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>

      {lendo > 0 && <p className="text-sm text-texto-2">Lendo {lendo} PDF(s)…</p>}

      {lidos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lidos.map((l) => {
            if (!l.ok) {
              return (
                <div key={l.arquivo} className="rounded-xl border border-manutencao/40 bg-superficie p-3 text-sm shadow-cartao">
                  <p className="truncate font-semibold" title={l.arquivo}>
                    {l.arquivo}
                  </p>
                  <p className="mt-1 text-xs text-manutencao">{l.erro}</p>
                </div>
              );
            }
            const b = l.boletim;
            const p = posicoesDoBoletim(b.itens);
            const trocas = p.filter((x) => x.itens.length > 1).length;
            const bate = bateComOSisloc(b);
            return (
              <div key={l.arquivo} className="rounded-xl border border-borda bg-superficie p-3 text-sm shadow-cartao">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold" title={b.base}>
                      {b.base}
                    </p>
                    <p className="text-xs text-texto-3">
                      {mesPorExtenso(b.periodo_inicio)} · cód. {b.cod_docto ?? "—"} · {b.fichas.length} ficha(s)
                    </p>
                  </div>
                  {bate === false ? (
                    <Selo tom="aviso">Não bate</Selo>
                  ) : (
                    <Selo tom="ok">Bate com o Sisloc</Selo>
                  )}
                </div>
                <dl className="mt-2 space-y-0.5 text-xs tabular-nums">
                  <div className="flex justify-between">
                    <dt className="text-texto-2">Equipamentos cobrados</dt>
                    <dd>
                      {b.itens.filter(cobravel).length} em {p.length} posições{trocas ? ` · ${trocas} troca(s)` : ""}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-texto-2">Lido</dt>
                    <dd>{emReais(totalLido(b.itens))}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-texto-2">Sisloc</dt>
                    <dd>{b.total_sisloc === null ? "—" : emReais(b.total_sisloc)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setLidos((x) => x.filter((y) => y !== l))}
                  className="mt-2 text-xs font-semibold text-texto-3 underline"
                >
                  Tirar da lista
                </button>
              </div>
            );
          })}
        </div>
      )}

      {bons.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Botao
            variante="primario"
            disabled={gravando || lendo > 0}
            onClick={() =>
              iniciar(async () => {
                setErro(null);
                const r = await gravarBoletins(
                  cliente,
                  bons.map((b) => ({ arquivo: b.arquivo, boletim: b.boletim })),
                );
                if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
                setLidos([]);
                if (aoGravar !== "ficar" && r.medicoes?.length === 1) router.push(`/locacao/${r.medicoes[0]}`);
                else router.refresh();
              })
            }
          >
            {gravando ? "Gravando…" : `Gravar ${bons.length} boletim(ns) na medição`}
          </Botao>
          <span className="text-xs text-texto-3">
            Cada um vai para a medição do mês dele. O boletim que já estava (mesmo código do Sisloc) é trocado.
          </span>
        </div>
      )}
    </div>
  );
}
