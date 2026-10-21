import Link from "next/link";
import { CAMPO, CartaoDoQuadro, Cabecalho, SoLeitura, Vazio } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { emReais } from "@/lib/medicoes/dinheiro";
import { dadosLidos, totalDosMateriais } from "@/lib/medicoes/relatorio";
import { dataCurta } from "../formato";
import { LeitorDeOm } from "./leitor";

export const dynamic = "force-dynamic";

interface NoArquivo {
  id: number;
  om: string;
  dados: unknown;
  gravado_em: string | null;
  gravado_por_nome: string;
  versoes: number;
  boletim_id: number | null;
  boletim_numero: string | null;
  cliente: string | null;
  base: string | null;
}

/**
 * Os relatórios de manutenção do Águas do Rio — o leitor, onde se cola a OM
 * do Sisloc e abre o relatório dela, e o arquivo de todos os que já se
 * gravaram.
 */
export default async function Relatorios({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const supabase = await createClient();

  const arquivo = await supabase
    .from("relatorios_de_manutencao_atuais")
    .select("id, om, dados, gravado_em, gravado_por_nome, versoes, boletim_id, boletim_numero, cliente, base")
    .order("gravado_em", { ascending: false })
    .limit(300);
  const faltaMigracao = Boolean(arquivo.error);
  const lista = (arquivo.data ?? []) as NoArquivo[];

  const termo = q.toUpperCase();
  const filtrados = q
    ? lista.filter((r) => {
        const d = dadosLidos(r.dados);
        return [r.om, d.patrimonio, d.equipamento, r.base, r.boletim_numero]
          .filter(Boolean)
          .some((x) => (x as string).toUpperCase().includes(termo));
      })
    : lista;

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Relatórios de manutenção"
        resumo="O anexo que o Águas do Rio pede para cada OM cobrada. Copie a OM no Sisloc e cole aqui: o relatório abre preenchido."
      />

      <LeitorDeOm />

      {faltaMigracao && (
        <SoLeitura>
          Falta aplicar a <code>0021_o_relatorio_de_manutencao.sql</code> no SQL Editor — até lá, o leitor abre o
          relatório, mas nada se grava.
        </SoLeitura>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">O arquivo · {lista.length}</h2>
            <p className="text-xs text-texto-3">Cada relatório gravado, o mais recente primeiro. O PDF sai sempre da última versão.</p>
          </div>
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="OM, patrimônio, base…"
              aria-label="Procurar no arquivo"
              className={`${CAMPO} w-56`}
            />
          </form>
        </div>

        {filtrados.length === 0 ? (
          <Vazio>{q ? `Nada no arquivo com “${q}”.` : "Nenhum relatório gravado ainda."}</Vazio>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((r) => {
              const d = dadosLidos(r.dados);
              return (
                <CartaoDoQuadro
                  key={r.id}
                  titulo={`OM ${r.om} · ${d.equipamento || "sem equipamento"}`}
                  subtitulo={[r.base ?? d.superintendencia, r.boletim_numero].filter(Boolean).join(" · ") || "fora de boletim"}
                  linhas={[
                    { rotulo: "Patrimônio", valor: <span className="font-mono">{d.patrimonio || "—"}</span> },
                    {
                      rotulo: "Gravado",
                      valor: `${dataCurta(r.gravado_em)} · ${r.gravado_por_nome}${r.versoes > 1 ? ` · ${r.versoes} versões` : ""}`,
                    },
                  ]}
                  destaque={{ rotulo: "Valor total da OM", valor: emReais(totalDosMateriais(d.materiais)) }}
                  rodape={
                    <>
                      <Link href={`/relatorios/om/${r.om}`} className="font-semibold text-acento underline">
                        Abrir
                      </Link>
                      <Link href={`/relatorios/om/${r.om}/folha`} className="font-semibold text-acento underline">
                        PDF
                      </Link>
                      {r.boletim_id && (
                        <Link href={`/boletins/${r.boletim_id}`} className="font-semibold text-texto-2 underline">
                          Boletim
                        </Link>
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
