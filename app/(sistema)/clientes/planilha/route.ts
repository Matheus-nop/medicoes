import { createClient } from "@/lib/supabase/server";
import { nomeDeArquivo, planilha } from "@/lib/medicoes/arquivo";
import { ROTULO_CATEGORIA, type Categoria } from "@/lib/medicoes/controle";
import {
  ROTULO_SITUACAO,
  chaveDoCliente,
  dataDaOm,
  documentoDoBoletim,
  situacaoLida,
  statusDaOm,
  type BoletimAtual,
  type ItemDoBoletim,
} from "@/lib/medicoes/medicoes";

export const dynamic = "force-dynamic";

const dia = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";

/**
 * A planilha de um cliente para baixar e guardar — o arquivo digital.
 *
 *   tipo=manutencao  — uma linha por OM de todos os boletins do cliente.
 *   tipo=faturamento — uma linha por mês, base e categoria do controle.
 *
 * Lê com a sessão de quem pede: a RLS decide o que sai, como na tela.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const nome = (url.searchParams.get("nome") ?? "").trim();
  const tipo = url.searchParams.get("tipo") === "faturamento" ? "faturamento" : "manutencao";
  if (!nome) return new Response("Diga o cliente.", { status: 400 });

  const supabase = await createClient();
  let conteudo: string;

  if (tipo === "manutencao") {
    const { data: todos, error } = await supabase.from("boletins_atual").select("*");
    if (error) return new Response(error.message, { status: 500 });
    const chave = chaveDoCliente(nome);
    const boletins = ((todos ?? []) as BoletimAtual[]).filter((b) => chaveDoCliente(b.cliente) === chave);
    const porId = new Map(boletins.map((b) => [b.id, b]));
    const { data: oms, error: e2 } = boletins.length
      ? await supabase
          .from("boletim_oms_atual")
          .select("*")
          .in("boletim_id", [...porId.keys()])
      : { data: [], error: null };
    if (e2) return new Response(e2.message, { status: 500 });
    const linhas = ((oms ?? []) as (ItemDoBoletim & { boletim_id: number })[])
      .map((i) => ({ i, b: porId.get(i.boletim_id)! }))
      .sort(
        (x, y) =>
          (x.b.base ?? "").localeCompare(y.b.base ?? "") || x.b.id - y.b.id || x.i.om.localeCompare(y.i.om),
      )
      .map(({ i, b }) => [
        b.cliente,
        b.base,
        b.numero,
        documentoDoBoletim(b),
        b.referencia,
        ROTULO_SITUACAO[situacaoLida(b.situacao)],
        dia(b.fechado_em),
        i.om,
        i.patrimonio,
        i.equipamento,
        dia(dataDaOm(i)),
        Number(i.valor),
        statusDaOm(i),
        i.nota_fiscal,
        i.om_retirada,
        i.recibo_entrega,
        i.observacao,
      ]);
    conteudo = planilha(
      [
        "Cliente",
        "Base",
        "Boletim",
        "Documento",
        "Mês de referência",
        "Situação do boletim",
        "Emissão",
        "OM",
        "Patrimônio",
        "Equipamento / serviço",
        "Data",
        "Valor",
        "Status",
        "Nota fiscal",
        "Recibo retirada",
        "Recibo entrega",
        "Observação",
      ],
      linhas,
    );
  } else {
    const { data, error } = await supabase
      .from("controle_atual")
      .select("cliente, mes, rotulo, regiao, ordem, categoria, medido, faturado, saldo")
      .eq("cliente", nome)
      .order("mes")
      .order("ordem");
    if (error) return new Response(error.message, { status: 500 });
    conteudo = planilha(
      ["Cliente", "Período", "Base / região", "Categoria", "Medido", "Faturado", "Saldo"],
      (
        (data ?? []) as {
          cliente: string;
          rotulo: string;
          regiao: string;
          categoria: Categoria;
          medido: number;
          faturado: number;
          saldo: number;
        }[]
      ).map((l) => [
        l.cliente,
        l.rotulo,
        l.regiao,
        ROTULO_CATEGORIA[l.categoria] ?? l.categoria,
        Number(l.medido),
        Number(l.faturado),
        Number(l.saldo),
      ]),
    );
  }

  const arquivo = `${nomeDeArquivo(nome, tipo)}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(conteudo, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${arquivo}"`,
      "cache-control": "no-store",
    },
  });
}
