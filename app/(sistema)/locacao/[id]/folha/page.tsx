import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Cabecalho, ESTILO_BOTAO } from "@/components/ui";
import { Imprimir } from "@/components/imprimir";
import { createClient } from "@/lib/supabase/server";
import { carregarMedicao } from "../../dados";
import { mesPorExtenso } from "../../formato";
import { PapelDaLocacao } from "./papel";

export const dynamic = "force-dynamic";

const carregar = cache((id: number) => carregarMedicao(id));

/** O título é o nome que o "Salvar como PDF" sugere. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const carga = await carregar(Number((await params).id));
  if (!carga.ok) return {};
  return { title: `Medição de locação - ${mesPorExtenso(carga.medicao.mes)} - Nova Opção` };
}

/** A medição de locação em papel, no padrão da casa: A4 em pé, em PDF pelo próprio navegador. */
export default async function FolhaDaLocacao({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const carga = await carregar(id);
  if (!carga.ok) {
    if (carga.naoExiste) notFound();
    return <p className="p-8 text-center text-sm text-texto-2">{carga.erro}</p>;
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: perfil } = auth.user
    ? await supabase.from("perfis").select("nome").eq("id", auth.user.id).maybeSingle()
    : { data: null };
  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Medição de locação em PDF"
        resumo="O papel da casa. O PDF sai do botão de imprimir — escolha “Salvar como PDF”."
        acoes={
          <>
            <Link href={`/locacao/${id}`} className={ESTILO_BOTAO.discreto}>
              Voltar à medição
            </Link>
            <a href={`/locacao/${id}/planilha`} className={ESTILO_BOTAO.contorno} download>
              Planilha AEGEA (.xlsx)
            </a>
            <Imprimir rotulo="Imprimir / PDF" margem="10mm" />
          </>
        }
      />
      <div className="overflow-x-auto pb-6">
        <PapelDaLocacao carga={carga} emitidoPor={perfil?.nome ?? ""} />
      </div>
    </div>
  );
}
