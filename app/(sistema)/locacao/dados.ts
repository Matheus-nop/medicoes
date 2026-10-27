import { createClient } from "@/lib/supabase/server";
import { chaveDaFicha, ordemDaReferencia, type Vinculo } from "@/lib/medicoes/arquivo";
import { acharBase, type Base } from "@/lib/medicoes/bases";
import { CLIENTE_PADRAO } from "@/lib/medicoes/controle";
import type { BaseDaPlanilha, ItemDeLocacao } from "@/lib/medicoes/locacao";
import { chaveDoCliente } from "@/lib/medicoes/medicoes";

type Cliente = Awaited<ReturnType<typeof createClient>>;

export interface MedicaoDeLocacao {
  id: number;
  cliente: string;
  mes: string;
  contratante: string | null;
  obra: string | null;
  contrato_juridico: string | null;
  contrato_sistemico: string | null;
  superintendencia: string | null;
  observacao: string | null;
  criado_em: string;
}

export interface BoletimImportado {
  id: number;
  medicao_id: number;
  base_id: number | null;
  base_nome: string;
  entrega: string;
  cod_docto: string | null;
  fichas: string[];
  periodo_inicio: string;
  periodo_fim: string;
  total_sisloc: number | null;
  arquivo: string | null;
  importado_em: string;
  importado_por_nome: string;
}

export type ItemGravado = ItemDeLocacao & { id: number; boletim_id: number; ordem: number; coordenador: string | null };

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * Lê tudo, de mil em mil: o Supabase devolve no máximo mil linhas por vez, e
 * um mês do VCG passa disso com os acessórios.
 */
async function lerTudo<T>(pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const tudo: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await pagina(de, de + 999);
    if (error) throw new Error(error.message);
    tudo.push(...(data ?? []));
    if (!data || data.length < 1000) return tudo;
  }
}

export type CargaDaLista =
  | {
      ok: true;
      medicoes: (MedicaoDeLocacao & { boletins: number; total: number })[];
      clientes: string[];
    }
  | { ok: false; erro: string; faltaMigracao: boolean };

/** As medições de locação, da mais nova para a mais antiga, e os clientes que a casa já usa. */
export async function carregarMedicoes(): Promise<CargaDaLista> {
  const supabase = await createClient();
  const [medicoes, boletins, regioes] = await Promise.all([
    supabase.from("locacao_medicoes").select("*").order("mes", { ascending: false }),
    supabase.from("locacao_boletins").select("medicao_id, total_sisloc"),
    supabase.from("controle_regioes").select("cliente"),
  ]);
  const erro = medicoes.error ?? boletins.error;
  if (erro) return { ok: false, erro: erro.message, faltaMigracao: erro.code === "42P01" };
  const por = new Map<number, { boletins: number; total: number }>();
  for (const b of (boletins.data ?? []) as { medicao_id: number; total_sisloc: unknown }[]) {
    const t = por.get(b.medicao_id) ?? { boletins: 0, total: 0 };
    t.boletins += 1;
    t.total += Number(b.total_sisloc ?? 0);
    por.set(b.medicao_id, t);
  }
  const clientes = [
    ...new Set([CLIENTE_PADRAO, ...((regioes.data ?? []) as { cliente: string }[]).map((r) => r.cliente)]),
  ];
  return {
    ok: true,
    medicoes: ((medicoes.data ?? []) as MedicaoDeLocacao[]).map((m) => ({ ...m, ...(por.get(m.id) ?? { boletins: 0, total: 0 }) })),
    clientes,
  };
}

export type CargaDaMedicao =
  | {
      ok: true;
      medicao: MedicaoDeLocacao;
      boletins: (BoletimImportado & { base: (Base & BaseDaPlanilha) | null })[];
      itens: ItemGravado[];
      /** As bases que vieram no mês anterior e não neste. */
      faltando: string[];
      /** Os boletins de manutenção apresentados no mês, com a base do cadastro. */
      manutencao: { valor: number; base: (Base & BaseDaPlanilha) | null; nome: string }[];
      bases: Base[];
    }
  | { ok: false; erro: string; naoExiste?: boolean };

export async function carregarMedicao(id: number): Promise<CargaDaMedicao> {
  const supabase: Cliente = await createClient();
  const { data: medicao, error } = await supabase.from("locacao_medicoes").select("*").eq("id", id).maybeSingle();
  if (error) return { ok: false, erro: error.message };
  if (!medicao) return { ok: false, erro: "Medição não encontrada.", naoExiste: true };
  const m = medicao as MedicaoDeLocacao;

  const [boletins, bases, anterior, manut, vinc] = await Promise.all([
    supabase.from("locacao_boletins").select("*").eq("medicao_id", id).order("base_nome"),
    supabase.from("bases").select("*"),
    supabase
      .from("locacao_medicoes")
      .select("id, cliente")
      .lt("mes", m.mes)
      .order("mes", { ascending: false })
      .limit(5),
    supabase.from("boletins_atual").select("cliente, base, referencia, valor, situacao"),
    // O boletim tem o nome do Sisloc, e a medição o do controle: o vínculo (0012) junta.
    supabase.from("vinculos_de_cliente").select("nome, cliente"),
  ]);
  const vinculos = (vinc.error ? [] : (vinc.data ?? [])) as Vinculo[];
  const chaveDoMeu = chaveDaFicha(m.cliente, vinculos);
  if (boletins.error) return { ok: false, erro: boletins.error.message };
  const cadastro = (bases.data ?? []) as Base[];
  const daBase = (nome: string, cliente = m.cliente) => acharBase(cadastro, cliente, nome) as (Base & BaseDaPlanilha) | null;

  const lista = (boletins.data ?? []) as BoletimImportado[];
  const quem = [...new Set(lista.map((b) => (b as unknown as { importado_por: string }).importado_por))];
  const { data: perfis } = quem.length ? await supabase.from("perfis").select("id, nome").in("id", quem) : { data: [] };
  const nome = new Map((perfis ?? []).map((p: { id: string; nome: string }) => [p.id, p.nome]));

  const ids = lista.map((b) => b.id);
  let itens: ItemGravado[] = [];
  try {
    itens = ids.length
      ? (
          await lerTudo((de, ate) =>
            supabase.from("locacao_itens").select("*").in("boletim_id", ids).order("boletim_id").order("ordem").range(de, ate),
          )
        ).map((i) => {
          const x = i as Record<string, unknown>;
          return {
            ...(x as unknown as ItemGravado),
            qtde: Number(x.qtde),
            valor_base: Number(x.valor_base),
            valor_total: Number(x.valor_total),
          };
        })
      : [];
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  // O mês anterior do mesmo cliente: as bases que vieram lá e não aqui.
  let faltando: string[] = [];
  const doCliente = ((anterior.data ?? []) as { id: number; cliente: string }[]).find(
    (x) => chaveDoCliente(x.cliente) === chaveDoCliente(m.cliente),
  );
  if (doCliente) {
    const { data: antes } = await supabase.from("locacao_boletins").select("base_nome").eq("medicao_id", doCliente.id);
    const aqui = new Set(lista.map((b) => chaveDoCliente(b.base_nome)));
    faltando = [...new Set(((antes ?? []) as { base_nome: string }[]).map((b) => b.base_nome))].filter(
      (b) => !aqui.has(chaveDoCliente(b)),
    );
  }

  const ref = Number(m.mes.slice(0, 4)) * 100 + Number(m.mes.slice(5, 7));
  const manutencao = ((manut.data ?? []) as { cliente: string; base: string | null; referencia: string | null; valor: unknown; situacao: string }[])
    .filter(
      (b) =>
        chaveDaFicha(b.cliente, vinculos) === chaveDoMeu &&
        ordemDaReferencia(b.referencia) === ref &&
        b.situacao !== "aberto",
    )
    .map((b) => ({ valor: Number(b.valor ?? 0), base: daBase(b.base ?? "", b.cliente), nome: b.base ?? "Sem base" }));

  return {
    ok: true,
    medicao: m,
    boletins: lista.map((b) => ({
      ...b,
      total_sisloc: n(b.total_sisloc),
      importado_por_nome: nome.get((b as unknown as { importado_por: string }).importado_por) ?? "—",
      base: (b.base_id ? (cadastro.find((x) => x.id === b.base_id) as (Base & BaseDaPlanilha) | undefined) : null) ?? daBase(b.base_nome),
    })),
    itens,
    faltando,
    manutencao,
    bases: cadastro,
  };
}
