import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { carregarRelatorio } from "../../../dados";
import { Folha } from "./folha";

export const dynamic = "force-dynamic";

// Uma leitura só para o título e para a página.
const carregar = cache((om: string) => carregarRelatorio(om));

/** O título é o nome que o "Salvar como PDF" sugere — o do arquivo que vai ao cliente. */
export async function generateMetadata({ params }: { params: Promise<{ om: string }> }): Promise<Metadata> {
  const carga = await carregar((await params).om);
  if (!carga) return {};
  const patrimonio = carga.dados.patrimonio.trim();
  return { title: `Relatório de manutenção - OM ${carga.om}${patrimonio ? ` - ${patrimonio}` : ""}` };
}

/** O relatório em papel: A4 em pé, impresso ou em PDF pelo próprio navegador. */
export default async function FolhaDoRelatorio({
  params,
  searchParams,
}: {
  params: Promise<{ om: string }>;
  searchParams: Promise<{ imprimir?: string }>;
}) {
  const [{ om }, { imprimir }] = await Promise.all([params, searchParams]);
  const carga = await carregar(om);
  if (!carga) notFound();
  return <Folha om={carga.om} dados={carga.dados} urls={carga.urls} imprimirAoAbrir={imprimir === "1"} />;
}
