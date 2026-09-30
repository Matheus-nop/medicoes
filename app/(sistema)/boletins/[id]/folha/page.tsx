import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { arquivoDoBoletim } from "@/lib/medicoes/medicoes";
import { carregarBoletim } from "../dados";
import { Folha } from "./folha";

export const dynamic = "force-dynamic";

// Uma leitura só para o título e para a página: o `cache` do React junta as
// duas chamadas do mesmo pedido.
const carregar = cache((id: number) => carregarBoletim(id));

/**
 * O título da página é o nome que o navegador sugere ao "Salvar como PDF" —
 * e é por ele que o arquivo chega no e-mail do cliente.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const boletimId = Number((await params).id);
  if (!Number.isInteger(boletimId)) return {};
  const carga = await carregar(boletimId);
  return carga?.ok ? { title: arquivoDoBoletim(carga.boletim) } : {};
}

/**
 * O boletim em papel — o que vai para o cliente, impresso ou em PDF.
 *
 * O PDF sai do próprio navegador ("Salvar como PDF" na janela de impressão):
 * é o mesmo papel, sem gerador à parte que um dia desenharia diferente.
 */
export default async function FolhaDoBoletim({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const boletimId = Number(id);
  if (!Number.isInteger(boletimId)) notFound();

  const carga = await carregar(boletimId);
  if (carga === null) notFound();
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o boletim</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }

  return <Folha boletim={carga.boletim} itens={carga.itens} />;
}
