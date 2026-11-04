"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Aviso, Botao, Painel, Selo } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import { ROTULO_SITUACAO, TOM_SITUACAO, situacaoLida } from "@/lib/medicoes/medicoes";
import type { CargaDaMedicao } from "../dados";
import { incluirBms, lerBmDoPdf, tirarBm, type BmLido, type PdfDeBm } from "../acoes";

type Carga = Extract<CargaDaMedicao, { ok: true }>;

/**
 * A manutenção da área, embaixo da locação: a faturista exporta o PDF dos BMs
 * de manutenção (gerados aqui) e arrasta. O PDF só diz QUAIS boletins são —
 * pelas OMs impressas —, e o valor vem do boletim: uma linha por BM, com o
 * total cobrado.
 * Sem nenhum BM incluído, a planilha soma os boletins apresentados no mês.
 */
export function ManutencaoDaArea({ carga, podeMexer }: { carga: Carga; podeMexer: boolean }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const { medicao: m, bms, manutencao } = carga;
  const [lidos, setLidos] = useState<PdfDeBm[]>([]);
  const [lendo, setLendo] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [aberto, setAberto] = useState(bms.length === 0);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const jaTem = new Set(bms.map((b) => b.boletim_id));
  const novos = new Map<number, BmLido & { arquivo: string }>();
  for (const l of lidos) if (l.ok) for (const b of l.bms) if (!jaTem.has(b.boletim_id)) novos.set(b.boletim_id, { ...b, arquivo: l.arquivo });
  const total = bms.reduce((t, b) => t + b.oms.reduce((s, o) => s + o.valor, 0), 0);
  const automatico = manutencao.reduce((t, x) => t + x.valor, 0);

  const ler = async (arquivos: File[]) => {
    const pdfs = arquivos.filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    if (pdfs.length === 0) return setErro("Só PDF: o papel do BM de manutenção, exportado daqui.");
    setErro(null);
    setLendo(pdfs.length);
    for (const f of pdfs) {
      const dados = new FormData();
      dados.set("pdf", f);
      const r = await lerBmDoPdf(dados);
      setLidos((x) => [...x.filter((y) => y.arquivo !== r.arquivo), r]);
      setLendo((n) => n - 1);
    }
  };

  return (
    <Painel
      titulo={`Manutenção da área · ${bms.length ? `${bms.length} BM(s)` : "automática"}`}
      descricao={
        bms.length
          ? `Os BMs incluídos, uma linha por BM com o total dele, embaixo da locação · ${emReais(total)}`
          : `Nenhum BM incluído: a planilha soma os ${manutencao.length} boletim(ns) apresentados no mês (${emReais(automatico)}). Arraste os PDFs dos BMs da área para escolher quais entram.`
      }
      recolhido={!aberto}
      aoRecolher={() => setAberto((x) => !x)}
    >
      <div className="space-y-3 p-4">
        {erro && (
          <Aviso tom="erro" aoFechar={() => setErro(null)}>
            {erro}
          </Aviso>
        )}
        {podeMexer && (
          <>
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
              className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition-colors ${
                arrastando ? "border-acento bg-acento-fraco" : "border-borda-forte bg-superficie-2 hover:border-acento/60"
              }`}
            >
              <span className="block font-semibold text-acento">Arraste aqui os PDFs dos BMs de manutenção</span>
              <span className="text-xs text-texto-3">
                o papel do boletim, ou o “PDF de todos” da regional · o sistema acha o BM pelas OMs e traz o total dele
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
          </>
        )}
        {lendo > 0 && <p className="text-sm text-texto-2">Lendo {lendo} PDF(s)…</p>}
        {lidos
          .filter((l): l is Extract<PdfDeBm, { ok: false }> => !l.ok)
          .map((l) => (
            <p key={l.arquivo} className="text-sm text-manutencao">
              <strong>{l.arquivo}</strong>: {l.erro}
            </p>
          ))}

        {novos.size > 0 && (
          <div className="space-y-2 rounded-xl border border-acento/40 bg-acento-fraco/40 p-3">
            <p className="text-sm font-semibold">Encontrados nos PDFs</p>
            <ul className="space-y-1 text-sm">
              {[...novos.values()].map((b) => {
                const s = situacaoLida(b.situacao);
                return (
                  <li key={b.boletim_id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{b.documento}</span>
                    <span className="text-texto-2">{b.base ?? "Sem base"}</span>
                    <Selo tom={TOM_SITUACAO[s]}>{ROTULO_SITUACAO[s]}</Selo>
                    <span className="text-xs text-texto-3">
                      {b.achadas} de {b.oms} OM(s) no PDF
                    </span>
                    <span className="ml-auto font-semibold tabular-nums">{emReais(b.valor)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Botao
                variante="primario"
                disabled={ocupado || lendo > 0}
                onClick={() =>
                  iniciar(async () => {
                    setErro(null);
                    const r = await incluirBms(
                      m.id,
                      [...novos.values()].map((b) => ({ boletim_id: b.boletim_id, arquivo: b.arquivo })),
                    );
                    if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
                    setLidos([]);
                    router.refresh();
                  })
                }
              >
                {ocupado ? "Incluindo…" : `Incluir ${novos.size} BM(s) na medição`}
              </Botao>
              <span className="text-xs text-texto-3">O valor vem do boletim: o que mudar nele aparece aqui.</span>
            </div>
          </div>
        )}

        {bms.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-borda text-texto-3">
                <tr>
                  <th className="py-2 pr-3 font-medium">BM</th>
                  <th className="py-2 pr-3 font-medium">Base</th>
                  <th className="py-2 pr-3 font-medium">Situação</th>
                  <th className="py-2 pr-3 text-right font-medium">OMs</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {bms.map((b) => {
                  const s = situacaoLida(b.situacao);
                  return (
                    <tr key={b.boletim_id} className="border-b border-borda/50">
                      <td className="py-1.5 pr-3 font-medium">{b.documento}</td>
                      <td className="py-1.5 pr-3">
                        {b.base_nome}
                        {!b.base?.municipio && (
                          <Link href={`/bases?base=${encodeURIComponent(b.base_nome)}`} className="ml-2 text-manutencao underline">
                            completar no cadastro de bases
                          </Link>
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        <Selo tom={TOM_SITUACAO[s]}>{ROTULO_SITUACAO[s]}</Selo>
                      </td>
                      <td className="py-1.5 pr-3 text-right">{b.oms.length}</td>
                      <td className="py-1.5 pr-3 text-right">{emReais(b.oms.reduce((t, o) => t + o.valor, 0))}</td>
                      <td className="py-1.5 text-right">
                        {podeMexer && (
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() =>
                              iniciar(async () => {
                                const r = await tirarBm(m.id, b.boletim_id);
                                if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
                                router.refresh();
                              })
                            }
                            className="font-semibold text-manutencao underline"
                          >
                            Tirar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Painel>
  );
}
