import Link from "next/link";
import { CAMPO, CartaoDoQuadro, Cabecalho, Painel, SoLeitura, Vazio } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { emReais } from "@/lib/medicoes/dinheiro";
import { dadosLidos, totalDosMateriais } from "@/lib/medicoes/relatorio";
import { mesmaOm } from "@/lib/medicoes/medicoes";
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

interface SemRelatorio {
  om: string;
  equipamento: string | null;
  patrimonio: string | null;
  valor: number;
  boletim_id: number;
}

/**
 * Os relatórios de manutenção do Águas do Rio — o arquivo de todos os que já
 * se gravaram, e o leitor de OM que abre o próximo. No alto, as OMs dos BMs
 * em aberto do Águas do Rio que ainda não têm o dela: é o que falta antes de
 * o boletim sair.
 */
export default async function Relatorios({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const supabase = await createClient();

  const [arquivo, abertos] = await Promise.all([
    supabase
      .from("relatorios_de_manutencao_atuais")
      .select("id, om, dados, gravado_em, gravado_por_nome, versoes, boletim_id, boletim_numero, cliente, base")
      .order("gravado_em", { ascending: false })
      .limit(300),
    // O papel do Águas do Rio é o `aguas` e o TESTE 2 (`acao`); a Rio+ não pede relatório.
    supabase
      .from("boletins_atual")
      .select("id, numero, base")
      .eq("situacao", "aberto")
      .neq("modelo", "rio_mais"),
  ]);
  const faltaMigracao = Boolean(arquivo.error);
  const lista = (arquivo.data ?? []) as NoArquivo[];

  const bms = (abertos.data ?? []) as { id: number; numero: string; base: string | null }[];
  let semRelatorio: (SemRelatorio & { numero: string; base: string | null })[] = [];
  if (bms.length && !faltaMigracao) {
    const { data } = await supabase
      .from("boletim_oms_atual")
      .select("om, equipamento, patrimonio, valor, boletim_id")
      .in(
        "boletim_id",
        bms.map((b) => b.id),
      );
    const doBm = new Map(bms.map((b) => [b.id, b]));
    semRelatorio = ((data ?? []) as SemRelatorio[])
      .filter((i) => !lista.some((r) => mesmaOm(r.om, i.om)))
      .map((i) => ({ ...i, numero: doBm.get(i.boletim_id)?.numero ?? "", base: doBm.get(i.boletim_id)?.base ?? null }))
      .sort((a, b) => a.numero.localeCompare(b.numero) || a.om.localeCompare(b.om));
  }

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
        resumo="O anexo que o Águas do Rio pede para cada OM cobrada. Bipe ou digite a OM: o relatório abre com o que o boletim e o Estoque já sabem."
      />

      <LeitorDeOm />

      {faltaMigracao && (
        <SoLeitura>
          Falta aplicar a <code>0021_o_relatorio_de_manutencao.sql</code> no SQL Editor — até lá, o leitor abre o
          relatório novo, mas nada se grava.
        </SoLeitura>
      )}

      {semRelatorio.length > 0 && (
        <Painel
          titulo={`Sem relatório nos BMs em aberto · ${semRelatorio.length}`}
          descricao="OMs do Águas do Rio que já estão num boletim e ainda não têm o relatório."
        >
          <ul className="divide-y divide-borda">
            {semRelatorio.map((i) => (
              <li key={`${i.boletim_id}:${i.om}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                <span className="font-mono font-semibold">OM {i.om}</span>
                <span className="min-w-0 flex-1 truncate">
                  {i.equipamento ?? "—"}
                  <span className="text-xs text-texto-3">
                    {" "}
                    · <span className="font-mono">{i.patrimonio ?? "—"}</span> · {i.numero}
                    {i.base ? ` · ${i.base}` : ""}
                  </span>
                </span>
                <span className="tabular-nums text-texto-2">{emReais(i.valor)}</span>
                <Link href={`/relatorios/om/${i.om}`} className="text-xs font-semibold text-acento underline">
                  Preencher
                </Link>
              </li>
            ))}
          </ul>
        </Painel>
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
