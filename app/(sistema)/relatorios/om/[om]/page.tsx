import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho, ESTILO_BOTAO, SoLeitura } from "@/components/ui";
import { sessaoAtual } from "@/lib/supabase/papel";
import { podeLancar, quemLanca } from "@/lib/medicoes/papeis";
import { dataCurta } from "../../../formato";
import { carregarRelatorio } from "../../dados";
import { Editor } from "./editor";

export const dynamic = "force-dynamic";

/**
 * O relatório de manutenção de uma OM — o anexo que o Águas do Rio pede. Abre
 * pela OM (o leitor de `/relatorios`, ou o cartão da OM no boletim) com o que
 * já se sabe dela, e a orçamentista completa o resto.
 */
export default async function RelatorioDaOm({ params }: { params: Promise<{ om: string }> }) {
  const { om } = await params;
  const [carga, sessao] = await Promise.all([carregarRelatorio(om), sessaoAtual()]);
  if (!carga) notFound();
  const podeGravar = podeLancar(sessao.papel, "boletim") && !carga.faltaMigracao;

  return (
    <div className="space-y-4">
      <Cabecalho
        titulo={`Relatório de manutenção · OM ${carga.om}`}
        resumo={
          carga.boletim ? (
            <>
              {carga.boletim.cliente}
              {carga.boletim.base ? ` · ${carga.boletim.base}` : ""} · no{" "}
              <Link href={`/boletins/${carga.boletim.id}`} className="font-semibold text-acento underline">
                {carga.boletim.numero}
              </Link>
            </>
          ) : (
            "Esta OM não está em boletim nenhum: o cabeçalho vem só do cadastro do Estoque."
          )
        }
        acoes={
          <Link href="/relatorios" className={ESTILO_BOTAO.discreto}>
            Todos os relatórios
          </Link>
        }
      />

      {carga.faltaMigracao && (
        <SoLeitura>
          Falta aplicar a <code>0021_o_relatorio_de_manutencao.sql</code> no SQL Editor. Dá para ver o
          relatório novo, mas não para gravar nem subir foto.
        </SoLeitura>
      )}
      {!podeLancar(sessao.papel, "boletim") && (
        <SoLeitura>Quem grava o relatório é {quemLanca("boletim")}. Aqui se lê.</SoLeitura>
      )}
      {carga.gravado ? (
        <p className="text-xs text-texto-3">
          Gravado por {carga.gravado.por} em {dataCurta(carga.gravado.em)}
          {carga.gravado.versoes > 1 ? ` · ${carga.gravado.versoes} versões (a última manda)` : ""}
        </p>
      ) : (
        <p className="text-xs text-texto-3">Ainda não gravado: o que está aqui veio da OM, do boletim e do Estoque.</p>
      )}

      <Editor
        om={carga.om}
        inicial={carga.dados}
        urlsIniciais={carga.urls}
        valorNoBoletim={carga.item?.valor ?? null}
        podeGravar={podeGravar}
      />
    </div>
  );
}
