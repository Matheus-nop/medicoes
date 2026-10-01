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

/**
 * "O nome X é o cliente Y" (0012). Junta na mesma ficha o nome do Sisloc e o
 * do controle; o boletim continua com o nome dele.
 */
export interface Vinculo {
  id?: number;
  nome: string;
  cliente: string;
}

/**
 * A chave da ficha onde um nome entra: a do cliente a que ele foi juntado, ou
 * a dele mesmo. Um nível só — o cliente de um vínculo não se junta a outro.
 */
export function chaveDaFicha(nome: string, vinculos: Vinculo[] = []): string {
  const k = chaveDoCliente(nome);
  const v = vinculos.find((x) => chaveDoCliente(x.nome) === k);
  return v ? chaveDoCliente(v.cliente) : k;
}

export interface FichaDoCliente {
  /** A chave do nome: "S.A." e "S.A" são o mesmo cliente. */
  chave: string;
  /**
   * O nome como está escrito: o do vínculo, quando há; senão o do boletim
   * mais recente, ou o do controle.
   */
  nome: string;
  /** Todos os nomes que caíram nesta ficha, um por chave. */
  nomes: string[];
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
  vinculos: Vinculo[] = [],
): FichaDoCliente[] {
  const mapa = new Map<string, FichaDoCliente & { _bases: Set<string>; _nomes: Map<string, string> }>();
  const ficha = (nome: string) => {
    const chave = chaveDaFicha(nome, vinculos);
    let f = mapa.get(chave);
    if (!f) {
      const alvo = vinculos.find((v) => chaveDoCliente(v.cliente) === chave);
      f = {
        chave,
        nome: alvo?.cliente ?? nome,
        nomes: [],
        manutencao: { boletins: 0, bases: 0, emMedicao: 0, medido: 0, faturado: 0, saldo: 0, ultimo: null },
        faturamento: null,
        _bases: new Set(),
        _nomes: new Map(),
      };
      mapa.set(chave, f);
    }
    if (!f._nomes.has(chaveDoCliente(nome))) f._nomes.set(chaveDoCliente(nome), nome);
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
    .map(({ _bases, _nomes, ...f }) => ({
      ...f,
      nomes: [..._nomes.values()],
      manutencao: { ...f.manutencao, bases: _bases.size },
    }))
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

/** "Agosto/2026" — o rótulo de uma chave de `ordemDaReferencia`. 0 é sem mês. */
export function rotuloDaReferencia(chave: number): string {
  if (!chave) return "Sem mês de referência";
  const nome = MESES[(chave % 100) - 1] ?? "";
  const mes = nome === "MARCO" ? "Março" : nome.charAt(0) + nome.slice(1).toLowerCase();
  return `${mes}/${Math.floor(chave / 100)}`;
}

/**
 * Os meses de referência que têm boletim, do mais recente ao mais antigo, com
 * quantos boletins cada um tem. "AGOSTO/2026" e "Agosto 2026" são o mesmo
 * mês — vale a chave, não a grafia. O boletim sem mês vem por último.
 */
export function mesesDosBoletins(
  boletins: { referencia: string | null }[],
): { chave: number; rotulo: string; boletins: number }[] {
  const conta = new Map<number, number>();
  for (const b of boletins) {
    const k = ordemDaReferencia(b.referencia);
    conta.set(k, (conta.get(k) ?? 0) + 1);
  }
  return [...conta.entries()]
    .sort((a, b) => (a[0] === 0 ? 1 : b[0] === 0 ? -1 : b[0] - a[0]))
    .map(([chave, n]) => ({ chave, rotulo: rotuloDaReferencia(chave), boletins: n }));
}

/** O boletim é do mês escolhido? Nulo é todos os meses. */
export function doMes(referencia: string | null | undefined, chave: number | null): boolean {
  return chave === null || ordemDaReferencia(referencia) === chave;
}

/* ── O filtro por base ─────────────────────────────────────── */

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * O boletim cuja base tem o que se digitou — sem acento, sem caixa, e cada
 * palavra em qualquer ordem: "belford 4" acha "VCG - BAIXADA I - BELFORD ROXO
 * - BLOCO 4". Vazio é tudo.
 */
export function daBase(base: string | null | undefined, termo: string): boolean {
  const palavras = semAcento(termo).split(" ").filter(Boolean);
  if (palavras.length === 0) return true;
  const alvo = semAcento(base ?? "");
  return palavras.every((p) => alvo.includes(p));
}

/** As bases dos boletins, sem repetir, em ordem alfabética — para a lista. */
export function basesDosBoletins(boletins: { base: string | null }[]): string[] {
  const vistas = new Map<string, string>();
  for (const b of boletins) {
    const nome = b.base?.trim();
    if (nome && !vistas.has(semAcento(nome))) vistas.set(semAcento(nome), nome);
  }
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
