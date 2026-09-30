// O arquivo por cliente: tudo o que a casa tem de um cliente num lugar só —
// os boletins de manutenção (orçamento) e o controle do painel (faturamento),
// por base. Consulta-se na tela e sai em PDF; planilha, não — é dela que a
// casa está saindo.

import { chaveDoCliente, type BoletimAtual } from "./medicoes.ts";

/** A posição atual de um cliente no controle: o mês mais recente com número. */
export interface PosicaoDoControle {
  cliente: string;
  periodo_id: number;
  rotulo: string;
  mes: string;
  /** O saldo que veio do mês anterior. */
  anterior: number;
  /** Medido e faturado NO MÊS. */
  medido: number;
  faturado: number;
  saldo: number;
  /** O a receber (0007). Null quando o recebimento não é acompanhado. */
  aReceber: number | null;
}

export interface FichaDoCliente {
  /** A chave do nome: "S.A." e "S.A" são o mesmo cliente. */
  chave: string;
  /** O nome como está escrito (o do boletim mais recente, ou o do controle). */
  nome: string;
  manutencao: {
    boletins: number;
    bases: number;
    emMedicao: number;
    medido: number;
    faturado: number;
    saldo: number;
    ultimo: string | null;
  };
  /** Null quando o cliente não tem controle lançado. */
  faturamento: PosicaoDoControle | null;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * A posição atual de cada cliente no controle, das linhas de `controle_mes`:
 * a do mês mais recente que tem algum número. O saldo já traz os meses de
 * antes — não se somam meses aqui.
 */
export function posicaoPorCliente(
  linhas: {
    cliente: string;
    periodo_id: number;
    rotulo: string;
    mes: string;
    saldo_anterior: unknown;
    medido: unknown;
    faturado: unknown;
    saldo: unknown;
    acompanha?: unknown;
    a_receber?: unknown;
  }[],
): PosicaoDoControle[] {
  const mapa = new Map<string, PosicaoDoControle>();
  for (const l of linhas) {
    const p = {
      cliente: l.cliente,
      periodo_id: l.periodo_id,
      rotulo: l.rotulo,
      mes: l.mes,
      anterior: n(l.saldo_anterior),
      medido: n(l.medido),
      faturado: n(l.faturado),
      saldo: n(l.saldo),
      aReceber: l.acompanha ? n(l.a_receber) : null,
    };
    if (p.anterior === 0 && p.medido === 0 && p.faturado === 0) continue;
    const atual = mapa.get(l.cliente);
    if (!atual || p.mes > atual.mes) mapa.set(l.cliente, p);
  }
  return [...mapa.values()];
}

/**
 * Uma ficha por cliente, juntando o boletim e o controle pelo nome. O nome do
 * boletim vem do Sisloc e o do controle é digitado: quando não batem, são duas
 * fichas — melhor que juntar dois clientes que não são o mesmo.
 */
export function fichasDosClientes(
  boletins: BoletimAtual[],
  posicoes: PosicaoDoControle[],
): FichaDoCliente[] {
  const mapa = new Map<string, FichaDoCliente & { _bases: Set<string> }>();
  const ficha = (nome: string) => {
    const chave = chaveDoCliente(nome);
    let f = mapa.get(chave);
    if (!f) {
      f = {
        chave,
        nome,
        manutencao: { boletins: 0, bases: 0, emMedicao: 0, medido: 0, faturado: 0, saldo: 0, ultimo: null },
        faturamento: null,
        _bases: new Set(),
      };
      mapa.set(chave, f);
    }
    return f;
  };

  // Do mais novo para o mais velho: o nome que fica é o do boletim mais recente.
  for (const b of [...boletins].sort((a, c) => c.criado_em.localeCompare(a.criado_em))) {
    const f = ficha(b.cliente);
    const m = f.manutencao;
    m.boletins += 1;
    f._bases.add((b.base ?? "").trim().toUpperCase());
    m.ultimo ??= b.criado_em;
    if (b.situacao === "aberto") m.emMedicao += n(b.valor);
    else {
      m.medido += n(b.valor);
      m.faturado += b.situacao === "faturado" ? n(b.valor) : n(b.faturado);
    }
    m.saldo = m.medido - m.faturado;
  }
  for (const p of posicoes) ficha(p.cliente).faturamento = p;

  return [...mapa.values()]
    .map(({ _bases, ...f }) => ({ ...f, manutencao: { ...f.manutencao, bases: _bases.size } }))
    .sort(
      (a, b) =>
        b.manutencao.saldo + (b.faturamento?.saldo ?? 0) - (a.manutencao.saldo + (a.faturamento?.saldo ?? 0)) ||
        a.nome.localeCompare(b.nome),
    );
}

/** Os boletins de um cliente agrupados por base, a base mais movimentada antes. */
export function boletinsPorBase(boletins: BoletimAtual[]): { base: string; boletins: BoletimAtual[] }[] {
  const mapa = new Map<string, BoletimAtual[]>();
  for (const b of boletins) {
    const base = b.base?.trim() || "Sem base";
    mapa.set(base, [...(mapa.get(base) ?? []), b]);
  }
  return [...mapa.entries()]
    .map(([base, lista]) => ({ base, boletins: lista.sort((a, b) => b.id - a.id) }))
    .sort((a, b) => b.boletins.length - a.boletins.length || a.base.localeCompare(b.base));
}

const MESES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARCO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

/**
 * "AGOSTO/2026" → 202608, para pôr os meses de referência em ordem. O que não
 * se lê como mês vai para o fim (0).
 */
export function ordemDaReferencia(referencia: string | null | undefined): number {
  const t = (referencia ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  const m = /([A-Z]+)\s*\/?\s*(\d{4})/.exec(t);
  if (!m) return 0;
  const mes = MESES.findIndex((x) => x.startsWith(m[1].slice(0, 3)));
  return mes < 0 ? 0 : Number(m[2]) * 100 + mes + 1;
}

/** Os meses de referência dos boletins, do mais recente ao mais antigo. */
export function mesesDeReferencia(boletins: { referencia: string | null }[]): string[] {
  const unicos = [...new Set(boletins.map((b) => b.referencia?.trim()).filter(Boolean))] as string[];
  return unicos.sort((a, b) => ordemDaReferencia(b) - ordemDaReferencia(a) || a.localeCompare(b));
}
