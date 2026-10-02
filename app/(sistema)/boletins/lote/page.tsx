import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, ESTILO_BOTAO, Vazio } from "@/components/ui";
import { Imprimir } from "@/components/imprimir";
import { createClient } from "@/lib/supabase/server";
import { daBase, doMes, ordemDaReferencia, rotuloDaReferencia } from "@/lib/medicoes/arquivo";
import { regionalDoBoletim, type Base } from "@/lib/medicoes/bases";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  situacaoLida,
  type BoletimAtual,
  type FonteDoValor,
  type ItemDoBoletim,
} from "@/lib/medicoes/medicoes";
import { ordenarPelaData } from "../[id]/dados";
import { PapelDoBoletim } from "../[id]/folha/folha";

export const dynamic = "force-dynamic";

type Busca = { mes?: string; regional?: string; base?: string };

/** O recorte em palavras: "VCG · Setembro/2026". */
function nomeDoRecorte(q: Busca): string {
  const mes = /^\d{6}$/.test(q.mes ?? "") ? rotuloDaReferencia(Number(q.mes)) : null;
  const regional = q.regional === undefined ? null : q.regional || "Sem regional";
  return [regional, q.base?.trim() || null, mes].filter(Boolean).join(" · ") || "Todos os boletins";
}

/** O título é o nome que o navegador sugere ao "Salvar como PDF". */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Busca> }): Promise<Metadata> {
  const q = await searchParams;
  return { title: `BM MANUTENÇÃO - ${nomeDoRecorte(q)}`.replace(/[/\\:*?"<>|·]+/g, "-").replace(/\s+/g, " ") };
}

/**
 * Os papéis de vários boletins num PDF só — os de uma regional num mês, para
 * quem precisa de todas as medições do local de uma vez. É o mesmo papel da
 * folha de cada boletim, um por página; o PDF sai do "Salvar como PDF".
 *
 * Só os apresentados (fechado, enviado, faturado): o aberto ainda é prévia,
 * e não vai para o cliente.
 */
export default async function LoteDeBoletins({ searchParams }: { searchParams: Promise<Busca> }) {
  const q = await searchParams;
  const mes = /^\d{6}$|^0$/.test(q.mes ?? "") ? Number(q.mes) : null;
  const regional = q.regional === undefined ? null : q.regional;
  const supabase = await createClient();

  const [boletins, bases] = await Promise.all([
    supabase.from("boletins_atual").select("*"),
    supabase.from("bases").select("*"),
  ]);
  if (boletins.error) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar os boletins</p>
        <p className="mt-1 text-sm text-texto-2">{boletins.error.message}</p>
      </div>
    );
  }
  const cadastro = (bases.error ? [] : (bases.data ?? [])) as Base[];
  const doRecorte = ((boletins.data ?? []) as BoletimAtual[])
    .map((b) => ({ ...b, situacao: situacaoLida(b.situacao), valor: Number(b.valor) }))
    .filter(
      (b) =>
        doMes(b.referencia, mes) &&
        (regional === null || regionalDoBoletim(b, cadastro) === regional) &&
        daBase(b.base, q.base ?? ""),
    );
  const abertos = doRecorte.filter((b) => b.situacao === "aberto").length;
  // A ordem do PDF: o mês, a base e o Documento Nº — como a pasta da regional.
  const lista = doRecorte
    .filter((b) => b.situacao !== "aberto")
    .sort(
      (a, b) =>
        ordemDaReferencia(a.referencia) - ordemDaReferencia(b.referencia) ||
        (a.base ?? "").localeCompare(b.base ?? "") ||
        (a.documento ?? "").localeCompare(b.documento ?? "", undefined, { numeric: true }) ||
        a.id - b.id,
    );

  const { data: oms } = lista.length
    ? await supabase
        .from("boletim_oms_atual")
        .select("*")
        .in(
          "boletim_id",
          lista.map((b) => b.id),
        )
    : { data: [] };
  const porBoletim = new Map<number, ItemDoBoletim[]>();
  for (const i of (oms ?? []) as (ItemDoBoletim & { boletim_id: number; fonte: string })[]) {
    const item = {
      ...i,
      valor: Number(i.valor),
      custo: i.custo === null ? null : Number(i.custo),
      fonte: i.fonte as FonteDoValor,
    };
    porBoletim.set(i.boletim_id, [...(porBoletim.get(i.boletim_id) ?? []), item]);
  }
  const total = lista.reduce((t, b) => t + b.valor, 0);
  const voltar = `/?${new URLSearchParams({
    ...(q.mes ? { mes: q.mes } : {}),
    ...(regional !== null ? { regional } : {}),
  }).toString()}`;

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Cabecalho
          titulo={`Boletins · ${nomeDoRecorte(q)}`}
          resumo={
            <>
              {lista.length} boletim(ns) · {emReais(total)} · um por página, em A4 deitado. Para o PDF,
              escolha &quot;Salvar como PDF&quot; na janela de impressão.
              {abertos > 0 && ` ${abertos} boletim(ns) ainda em medição ficam de fora: o aberto é prévia.`}
            </>
          }
          acoes={
            <>
              <Link href={voltar} className={ESTILO_BOTAO.discreto}>
                Voltar
              </Link>
              {lista.length > 0 && <Imprimir rotulo={`Imprimir / PDF (${lista.length})`} orientacao="landscape" />}
            </>
          }
        />
      </div>

      {lista.length === 0 ? (
        <Vazio>Nenhum boletim apresentado neste recorte.</Vazio>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <div id="folha" className="space-y-6 print:space-y-0">
            {lista.map((b) => (
              <div key={b.id} className="break-inside-avoid break-after-page last:break-after-auto">
                <PapelDoBoletim boletim={b} itens={ordenarPelaData(porBoletim.get(b.id) ?? [])} id="" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
