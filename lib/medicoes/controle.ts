// O controle de medições: manutenção, locação e indenização, região por
// região, mês a mês. É a planilha "CONTROLE DE MEDIÇÕES" — e não o boletim.
//
// A regra que a planilha escrevia no topo continua valendo: cada período é a
// FOTO do saldo em aberto naquele mês, acumulada. NÃO se somam períodos. A
// posição atual é a foto mais recente, e toda conta aqui é de UM período.
//
// A mesma conta vive na view `controle_por_periodo` (0005).

import { emReais } from "./dinheiro.ts";

export type Categoria = "manutencao" | "locacao" | "indenizacao";

export const CATEGORIAS: Categoria[] = ["manutencao", "locacao", "indenizacao"];

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  manutencao: "Manutenção",
  locacao: "Locação",
  indenizacao: "Indenização",
};

/** O cliente da planilha de hoje. O controle nasce por ele. */
export const CLIENTE_PADRAO = "ÁGUAS DO RIO / AEGEA";

/** Uma linha de `controle_atual`: o valor que vale numa célula. */
export interface Celula {
  periodo_id: number;
  regiao_id: number;
  regiao: string;
  ordem: number;
  categoria: Categoria;
  medido: number;
  faturado: number;
}

export interface Regiao {
  id: number;
  nome: string;
  ordem: number;
}

export interface Periodo {
  id: number;
  cliente: string;
  mes: string;
  rotulo: string;
}

export interface Soma {
  medido: number;
  faturado: number;
  saldo: number;
  /** Faturado sobre medido. Null quando nada foi medido. */
  fracao: number | null;
}

export interface LinhaDaRegiao extends Soma {
  regiao: string;
  ordem: number;
  categorias: Record<Categoria, Soma>;
}

export interface ResumoDoPeriodo extends Soma {
  categorias: Record<Categoria, Soma>;
  regioes: LinhaDaRegiao[];
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

function soma(medido: number, faturado: number): Soma {
  // Arredonda no centavo: a planilha soma em float e deixa 0,4800000000032.
  const m = Math.round(medido * 100) / 100;
  const f = Math.round(faturado * 100) / 100;
  return { medido: m, faturado: f, saldo: Math.round((m - f) * 100) / 100, fracao: m > 0 ? f / m : null };
}

const vazia = (): Record<Categoria, { medido: number; faturado: number }> => ({
  manutencao: { medido: 0, faturado: 0 },
  locacao: { medido: 0, faturado: 0 },
  indenizacao: { medido: 0, faturado: 0 },
});

const fechar = (c: Record<Categoria, { medido: number; faturado: number }>) =>
  Object.fromEntries(CATEGORIAS.map((k) => [k, soma(c[k].medido, c[k].faturado)])) as Record<
    Categoria,
    Soma
  >;

/**
 * Um período inteiro: o total, as três categorias e cada região. As regiões
 * cadastradas sem valor entram zeradas, na ordem da planilha — região que some
 * da tabela porque não teve medição parece região que ninguém olhou.
 */
export function resumirPeriodo(celulas: Celula[], regioes: Regiao[] = []): ResumoDoPeriodo {
  const total = vazia();
  const porRegiao = new Map<string, { ordem: number; c: ReturnType<typeof vazia> }>();
  for (const r of regioes) porRegiao.set(r.nome, { ordem: r.ordem, c: vazia() });

  for (const x of celulas) {
    const r = porRegiao.get(x.regiao) ?? { ordem: x.ordem, c: vazia() };
    r.c[x.categoria].medido += num(x.medido);
    r.c[x.categoria].faturado += num(x.faturado);
    porRegiao.set(x.regiao, r);
    total[x.categoria].medido += num(x.medido);
    total[x.categoria].faturado += num(x.faturado);
  }

  const somaDe = (c: ReturnType<typeof vazia>) =>
    soma(
      CATEGORIAS.reduce((t, k) => t + c[k].medido, 0),
      CATEGORIAS.reduce((t, k) => t + c[k].faturado, 0),
    );

  return {
    ...somaDe(total),
    categorias: fechar(total),
    regioes: [...porRegiao.entries()]
      .map(([regiao, { ordem, c }]) => ({ regiao, ordem, ...somaDe(c), categorias: fechar(c) }))
      .sort((a, b) => a.ordem - b.ordem || a.regiao.localeCompare(b.regiao)),
  };
}

/** "Maior → menor": só quem tem saldo em aberto, para o gráfico de barras. */
export function saldoPorRegiao(r: ResumoDoPeriodo): LinhaDaRegiao[] {
  return r.regioes.filter((x) => x.saldo > 0.005).sort((a, b) => b.saldo - a.saldo);
}

/** A cor do % faturado, como a planilha pintava: verde, âmbar, vermelho. */
export function faixaDoFaturado(fracao: number | null): "ok" | "parcial" | "pendente" | "vazio" {
  if (fracao === null) return "vazio";
  if (fracao >= 0.95) return "ok";
  if (fracao >= 0.5) return "parcial";
  return "pendente";
}

/* ── O período ─────────────────────────────────────────────── */

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2026-09" → { mes: "2026-09-01", rotulo: "Setembro 2026" }. */
export function periodoDoMes(anoMes: string): { mes: string; rotulo: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(anoMes.trim());
  if (!m) return null;
  const n = Number(m[2]);
  if (n < 1 || n > 12) return null;
  return { mes: `${m[1]}-${m[2]}-01`, rotulo: `${MESES[n - 1]} ${m[1]}` };
}

/* ── A colagem de uma aba do mês ───────────────────────────── */

/**
 * Número como o Excel copia em pt-BR ("78.537,00", "R$ 1.134,50", "-78.597,68")
 * — e como ele copia quando a célula não tem formato ("78537.5"). "-" e vazio
 * são nada.
 */
export function lerNumero(texto: string | undefined): number | null {
  let t = (texto ?? "").replace(/R\$|\s| /g, "").trim();
  if (!t || t === "-" || t === "–") return null;
  const negativo = /^\(.*\)$/.test(t) || t.startsWith("-");
  t = t.replace(/[()\-]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(t)) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return negativo ? -n : n;
}

export interface LinhaColada {
  regiao: string;
  valores: Partial<Record<Categoria, { medido: number | null; faturado: number | null }>>;
}

export interface LeituraDaColagem {
  linhas: LinhaColada[];
  /** Linhas com cara de região que não bate com nenhuma cadastrada. */
  desconhecidas: string[];
}

const chave = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * A aba do mês copiada do Excel — REGIÃO, e depois Medido, Faturado e Saldo de
 * manutenção, locação e indenização, na ordem da planilha. O saldo e os totais
 * que vêm junto se ignoram: são conta, e a conta é daqui.
 *
 * Linha de título, de total ("▶ TOTAL DO MÊS") e de região desconhecida não
 * entram. A desconhecida volta na resposta, para quem colou ver.
 */
export function lerColagemDoMes(texto: string, regioes: string[]): LeituraDaColagem {
  const conhecidas = new Map(regioes.map((r) => [chave(r), r]));
  const linhas: LinhaColada[] = [];
  const desconhecidas: string[] = [];

  for (const bruta of texto.split(/\r?\n/)) {
    const cel = bruta.split("\t");
    // Colou a partir da coluna A (vazia na planilha)? Pula a primeira.
    while (cel.length && !cel[0].trim() && cel.length > 7) cel.shift();
    const nome = (cel[0] ?? "").trim();
    if (!nome) continue;
    const k = chave(nome);
    if (k.includes("TOTAL") || k === "REGIAO" || k.startsWith("MEDICOES")) continue;
    const numeros = cel.slice(1, 10).map(lerNumero);
    if (numeros.every((n) => n === null) && !conhecidas.has(k)) continue;
    const regiao = conhecidas.get(k);
    if (!regiao) {
      desconhecidas.push(nome);
      continue;
    }
    const par = (i: number) => ({ medido: numeros[i] ?? null, faturado: numeros[i + 1] ?? null });
    linhas.push({
      regiao,
      valores: { manutencao: par(0), locacao: par(3), indenizacao: par(6) },
    });
  }
  return { linhas, desconhecidas };
}

/* ── A história de uma região ──────────────────────────────── */

/** O valor de "todas as bases" no seletor do relatório. */
export const TODAS = "todas";

export interface FotoDaRegiao extends Soma {
  periodo_id: number;
  rotulo: string;
  mes: string;
  categorias: Record<Categoria, Soma>;
}

/**
 * A região período a período — a aba "HISTÓRICO REGIÕES" da planilha. Cada
 * linha é uma foto, e por isso a tabela se lê de cima a baixo, sem somar.
 * Período sem valor nenhum fica de fora. Sem `regiao`, é o cliente inteiro.
 */
export function historicoDaRegiao(
  celulas: Celula[],
  periodos: Periodo[],
  regiao?: string,
): FotoDaRegiao[] {
  const minhas = regiao ? celulas.filter((c) => c.regiao === regiao) : celulas;
  return [...periodos]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .flatMap((p) => {
      const doPeriodo = minhas.filter((c) => c.periodo_id === p.id);
      if (!doPeriodo.some((c) => num(c.medido) !== 0 || num(c.faturado) !== 0)) return [];
      const r = resumirPeriodo(doPeriodo);
      return [
        {
          periodo_id: p.id,
          rotulo: p.rotulo,
          mes: p.mes,
          medido: r.medido,
          faturado: r.faturado,
          saldo: r.saldo,
          fracao: r.fracao,
          categorias: r.categorias,
        },
      ];
    });
}

/* ── O recado da região ────────────────────────────────────── */

/**
 * O resumo de uma região para colar no WhatsApp ou no e-mail — o botão
 * "copiar" do relatório por base do painel.
 */
export function recadoDaRegiao(
  cliente: string,
  rotulo: string,
  linha: LinhaDaRegiao,
  hoje: string,
): string {
  const pct = (f: number | null) => (f === null ? "0%" : `${Math.round(f * 100)}%`);
  const quem = linha.regiao === TODAS ? "Todas as bases" : `Base ${linha.regiao}`;
  let t = `*${cliente} — ${quem}*\nPosição: ${rotulo}\n\n`;
  t += `Medido: ${emReais(linha.medido)}\nFaturado: ${emReais(linha.faturado)}\n`;
  t += `*Saldo a faturar: ${emReais(linha.saldo)}* (${pct(linha.fracao)} faturado)\n`;
  const abertas = CATEGORIAS.filter((c) => linha.categorias[c].medido > 0);
  if (abertas.length) {
    t += "\nPor categoria:\n";
    for (const c of abertas) {
      const s = linha.categorias[c];
      t += `• ${ROTULO_CATEGORIA[c]}: saldo ${emReais(s.saldo)} (${pct(s.fracao)} fat.)\n`;
    }
  }
  t += `\nGerado em ${hoje} · Grupo Nova Opção`;
  return t;
}

/** O resumo como e-mail: sem os asteriscos do WhatsApp. */
export function emailDaRegiao(
  cliente: string,
  rotulo: string,
  linha: LinhaDaRegiao,
  hoje: string,
): { assunto: string; corpo: string } {
  const quem = linha.regiao === TODAS ? "todas as bases" : `base ${linha.regiao}`;
  return {
    assunto: `Medições ${cliente} — ${quem} — ${rotulo}`,
    corpo: recadoDaRegiao(cliente, rotulo, linha, hoje).replace(/\*/g, ""),
  };
}
