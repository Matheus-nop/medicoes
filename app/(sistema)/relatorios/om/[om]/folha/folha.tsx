"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Cabecalho, ESTILO_BOTAO } from "@/components/ui";
import { Imprimir } from "@/components/imprimir";
import { faltaNoRelatorio, type DadosDoRelatorio, type MomentoDaFoto } from "@/lib/medicoes/relatorio";
import { PapelModerno } from "./moderno";
import { PapelDaPlanilha } from "./planilha";

/** Os dois papéis do relatório: o da casa (o padrão) e a cópia da planilha do Águas do Rio. */
export type PapelDoRelatorio = "moderno" | "planilha";

export function Folha({
  om,
  dados,
  urls,
  papel,
  emitidoEm,
  imprimirAoAbrir,
}: {
  om: string;
  dados: DadosDoRelatorio;
  urls: Record<MomentoDaFoto, string | null>;
  papel: PapelDoRelatorio;
  emitidoEm: string | null;
  imprimirAoAbrir: boolean;
}) {
  const falta = faltaNoRelatorio(dados);

  // "Gravar e gerar o PDF" chega aqui com ?imprimir=1: a janela de impressão
  // abre sozinha, depois que as fotos carregaram — antes, elas sairiam em branco.
  useEffect(() => {
    if (!imprimirAoAbrir) return;
    let cancelado = false;
    const fotos = Array.from(document.querySelectorAll<HTMLImageElement>("#folha img"));
    Promise.all(fotos.map((f) => (f.complete ? Promise.resolve() : f.decode().catch(() => undefined)))).then(() => {
      if (!cancelado) window.print();
    });
    return () => {
      cancelado = true;
    };
  }, [imprimirAoAbrir]);

  return (
    <div className="space-y-4">
      <div className="space-y-2 print:hidden">
        <Cabecalho
          titulo={`Relatório de manutenção · OM ${om}`}
          resumo='Para PDF, escolha "Salvar como PDF" na janela de impressão. A folha é A4 em pé.'
          acoes={
            <>
              <Link href={`/relatorios/om/${om}`} className={ESTILO_BOTAO.discreto}>
                Voltar ao formulário
              </Link>
              <Link
                href={papel === "moderno" ? `/relatorios/om/${om}/folha?papel=planilha` : `/relatorios/om/${om}/folha`}
                className={ESTILO_BOTAO.contorno}
              >
                {papel === "moderno" ? "Ver no modelo da planilha" : "Ver no modelo da casa"}
              </Link>
              <Imprimir rotulo="Imprimir / PDF" margem={papel === "moderno" ? "0" : undefined} />
            </>
          }
        />
        {falta && (
          <p className="rounded-lg border border-reservado/40 bg-reservado/10 px-3.5 py-2.5 text-sm">
            Ainda incompleto para o cliente: {falta}
          </p>
        )}
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        {papel === "moderno" ? (
          <PapelModerno om={om} dados={dados} urls={urls} emitidoEm={emitidoEm} />
        ) : (
          <PapelDaPlanilha dados={dados} urls={urls} />
        )}
      </div>
    </div>
  );
}
