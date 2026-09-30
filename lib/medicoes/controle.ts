// O controle de medições: manutenção, locação e indenização, região por
// região, mês a mês. É a planilha "CONTROLE DE MEDIÇÕES" — e não o boletim.
//
// Cada mês guarda o que aconteceu NELE — o medido e o faturado do mês —, e o
// saldo passa adiante sozinho:
//
//   Agosto:   medido 100, faturado 30             → saldo 70
//   Setembro: saldo de agosto 70, medido e faturado do mês
//             → saldo = 70 + medido − faturado
//
// O saldo anterior não se digita: vem da view `controle_posicao` (0006), que
// soma os meses de antes. A posição atual é o saldo do mês mais recente.

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

/** Uma linha de `controle_posicao`: uma base, uma categoria, um mês. */
export interface Celula {
  periodo_id: number;
  regiao_id: number;
  regiao: string;
  ordem: number;
  categoria: Categoria;
  /** O saldo que veio dos meses anteriores. Calculado, nunca digitado. */
  saldo_anterior?: number;
  /** Medido NO MÊS. */
  medido: number;
  /** Faturado NO MÊS. */
  faturado: number;
  /** O recebimento (0007): só conta do mês de início do cliente em diante. */
  acompanha?: boolean;
  /** O a receber que já vinha de antes do início (só no mês de início). */
  abertura?: number;
  recebido?: number;
  a_receber_anterior?: number;
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
  /** O saldo que veio do mês anterior. */
  anterior: number;
  medido: number;
  faturado: number;
  /** O que havia para faturar no mês: o saldo anterior mais o medido. */
  aFaturar: number;
  /** anterior + medido − faturado. É o que passa para o mês seguinte. */
  saldo: number;
  /** Faturado sobre o que havia para faturar. Null quando não havia nada. */
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

// Arredonda no centavo: a planilha soma em float e deixa 0,4800000000032.
const centavo = (v: number) => Math.round(v * 100) / 100;

export function soma(anterior: number, medido: number, faturado: number): Soma {
  const a = centavo(anterior);
  const m = centavo(medido);
  const f = centavo(faturado);
  const aFaturar = centavo(a + m);
  return {
    anterior: a,
    medido: m,
    faturado: f,
    aFaturar,
    saldo: centavo(aFaturar - f),
    fracao: aFaturar > 0 ? f / aFaturar : null,
  };
}

type Conta = { anterior: number; medido: number; faturado: number };
type PorCategoria = Record<Categoria, Conta>;

const vazia = (): PorCategoria => ({
  manutencao: { anterior: 0, medido: 0, faturado: 0 },
  locacao: { anterior: 0, medido: 0, faturado: 0 },
  indenizacao: { anterior: 0, medido: 0, faturado: 0 },
});

const fechar = (c: PorCategoria) =>
  Object.fromEntries(
    CATEGORIAS.map((k) => [k, soma(c[k].anterior, c[k].medido, c[k].faturado)]),
  ) as Record<Categoria, Soma>;

const somaDe = (c: PorCategoria) =>
  soma(
    CATEGORIAS.reduce((t, k) => t + c[k].anterior, 0),
    CATEGORIAS.reduce((t, k) => t + c[k].medido, 0),
    CATEGORIAS.reduce((t, k) => t + c[k].faturado, 0),
  );

/**
 * Um período inteiro: o total, as três categorias e cada região. As regiões
 * cadastradas sem valor entram zeradas, na ordem — região que some da tabela
 * porque não teve medição parece região que ninguém olhou.
 */
export function resumirPeriodo(celulas: Celula[], regioes: Regiao[] = []): ResumoDoPeriodo {
  const total = vazia();
  const porRegiao = new Map<string, { ordem: number; c: PorCategoria }>();
  for (const r of regioes) porRegiao.set(r.nome, { ordem: r.ordem, c: vazia() });

  for (const x of celulas) {
    const r = porRegiao.get(x.regiao) ?? { ordem: x.ordem, c: vazia() };
    for (const alvo of [r.c[x.categoria], total[x.categoria]]) {
      alvo.anterior += num(x.saldo_anterior);
      alvo.medido += num(x.medido);
      alvo.faturado += num(x.faturado);
    }
    porRegiao.set(x.regiao, r);
  }

  return {
    ...somaDe(total),
    categorias: fechar(total),
    regioes: [...porRegiao.entries()]
      .map(([regiao, { ordem, c }]) => ({ regiao, ordem, ...somaDe(c), categorias: fechar(c) }))
      .sort((a, b) => a.ordem - b.ordem || a.regiao.localeCompare(b.regiao)),
  };
}

/** Tem algum número nesta soma? (saldo que veio, medido ou faturado) */
export const temValor = (s: Pick<Soma, "anterior" | "medido" | "faturado">) =>
  s.anterior !== 0 || s.medido !== 0 || s.faturado !== 0;

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
      const r = resumirPeriodo(doPeriodo);
      if (!temValor(r)) return [];
      return [
        {
          periodo_id: p.id,
          rotulo: p.rotulo,
          mes: p.mes,
          anterior: r.anterior,
          medido: r.medido,
          faturado: r.faturado,
          aFaturar: r.aFaturar,
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
  t += `Saldo do mês anterior: ${emReais(linha.anterior)}\n`;
  t += `Medido no mês: ${emReais(linha.medido)}\nFaturado no mês: ${emReais(linha.faturado)}\n`;
  t += `*Saldo a faturar: ${emReais(linha.saldo)}* (${pct(linha.fracao)} faturado)\n`;
  const abertas = CATEGORIAS.filter((c) => temValor(linha.categorias[c]));
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

/* ── A importação da planilha ──────────────────────────────── */

const ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/**
 * A aba da planilha que é deste mês: "SET 2026" para setembro, e "JUN-JUL 2025"
 * serve a julho (o mês de um período de dois é o último). Null se não houver.
 */
export function abaDoMes(abas: string[], mes: string): string | null {
  const [ano, m] = mes.split("-");
  const abrev = ABREV[Number(m) - 1];
  const limpa = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
  return (
    abas.find((a) => limpa(a) === `${abrev} ${ano}`) ??
    abas.find((a) => new RegExp(`(^|-)${abrev}\\s+${ano}$`).test(limpa(a))) ??
    null
  );
}

/**
 * As linhas de uma aba lida do .xlsx viram o texto que a colagem já entende:
 * número com vírgula e duas casas (o Excel guarda 46857.11000000001).
 */
export function abaComoTexto(linhas: unknown[][]): string {
  return linhas
    .map((l) =>
      l
        .map((v) =>
          v === null || v === undefined
            ? ""
            : typeof v === "number"
              ? v.toFixed(2).replace(".", ",")
              : String(v),
        )
        .join("\t"),
    )
    .join("\n");
}

export interface CelulaImportada {
  regiao: string;
  categoria: Categoria;
  /** O saldo que o sistema já tem do mês anterior. */
  anterior: number;
  /** Medido NO MÊS: o da planilha menos o saldo anterior. */
  medido: number;
  faturado: number;
  /** O saldo que fica — o mesmo da planilha. */
  saldo: number;
}

/**
 * A aba da planilha no formato do sistema.
 *
 * A planilha guarda a FOTO: o medido dela já traz o saldo do mês anterior
 * dentro. O sistema guarda o mês: medido do mês = medido da planilha − saldo
 * anterior; o faturado é o mesmo. Assim o saldo que fica é exatamente o da
 * planilha.
 *
 * Quando a planilha zera uma base que tinha saldo, sem faturar ("-" no mês),
 * o medido do mês sai negativo: é o ajuste que a planilha fez calada, e a tela
 * mostra para alguém conferir.
 */
export function daPlanilhaParaOMes(
  linhas: LinhaColada[],
  saldoAnterior: (regiao: string, categoria: Categoria) => number,
): CelulaImportada[] {
  return linhas.flatMap((l) =>
    CATEGORIAS.flatMap((c) => {
      const par = l.valores[c];
      const foto = par?.medido ?? 0;
      const faturado = par?.faturado ?? 0;
      const anterior = saldoAnterior(l.regiao, c);
      if (foto === 0 && faturado === 0 && anterior === 0) return [];
      const medido = centavo(foto - anterior);
      return [
        { regiao: l.regiao, categoria: c, anterior, medido, faturado, saldo: centavo(foto - faturado) },
      ];
    }),
  );
}

/* ── O recebimento ─────────────────────────────────────────── */

export interface Recebimento {
  /** O a receber que veio do mês anterior (ou a abertura, no mês de início). */
  anterior: number;
  faturado: number;
  recebido: number;
  /** anterior + faturado − recebido. Passa para o mês seguinte. */
  aReceber: number;
  /** Recebido sobre o que havia a receber. Null quando não havia nada. */
  fracao: number | null;
}

function recebimento(anterior: number, faturado: number, recebido: number): Recebimento {
  const a = centavo(anterior);
  const f = centavo(faturado);
  const r = centavo(recebido);
  const total = centavo(a + f);
  return { anterior: a, faturado: f, recebido: r, aReceber: centavo(total - r), fracao: total > 0 ? r / total : null };
}

/**
 * O recebimento de um mês — do cliente inteiro e de cada base. Só entra a
 * célula acompanhada (do mês de início em diante); a abertura conta como a
 * receber que veio de antes.
 */
export function resumirRecebimento(celulas: Celula[]): Recebimento & {
  acompanha: boolean;
  regioes: (Recebimento & { regiao: string; ordem: number })[];
} {
  const conta = new Map<string, { ordem: number; a: number; f: number; r: number }>();
  let a = 0;
  let f = 0;
  let r = 0;
  let acompanha = false;
  for (const c of celulas) {
    if (!c.acompanha) continue;
    acompanha = true;
    const ant = num(c.a_receber_anterior) + num(c.abertura);
    const x = conta.get(c.regiao) ?? { ordem: c.ordem, a: 0, f: 0, r: 0 };
    x.a += ant;
    x.f += num(c.faturado);
    x.r += num(c.recebido);
    conta.set(c.regiao, x);
    a += ant;
    f += num(c.faturado);
    r += num(c.recebido);
  }
  return {
    ...recebimento(a, f, r),
    acompanha,
    regioes: [...conta.entries()]
      .map(([regiao, x]) => ({ regiao, ordem: x.ordem, ...recebimento(x.a, x.f, x.r) }))
      .sort((p, q) => p.ordem - q.ordem || p.regiao.localeCompare(q.regiao)),
  };
}

/* ── A idade do que está em aberto ─────────────────────────── */

export interface ParcelaEmAberto {
  mes: string;
  rotulo: string;
  valor: number;
  /** Faturado (ou recebido) a mais do que havia: valor negativo, sem idade. */
  credito?: boolean;
}

/**
 * De que mês é cada real ainda em aberto. O que sai (faturado, ou recebido)
 * abate primeiro o mais antigo — é assim que se cobra. Entrada negativa (a
 * planilha zerando um saldo) conta como saída.
 *
 * `movimentos` é uma célula (base + categoria) mês a mês, em qualquer ordem.
 */
export function idadeDaCelula(
  movimentos: { mes: string; rotulo: string; entra: number; sai: number }[],
): ParcelaEmAberto[] {
  const fila: ParcelaEmAberto[] = [];
  // O que saiu a mais do que havia (faturou mais do que mediu): fica como
  // crédito e abate o que entrar depois. Sem isso a idade somaria mais que o
  // saldo.
  let credito = 0;
  for (const m of [...movimentos].sort((a, b) => a.mes.localeCompare(b.mes))) {
    let sai = num(m.sai) + Math.max(0, -num(m.entra));
    let entra = Math.max(0, num(m.entra));
    const usa = Math.min(credito, entra);
    credito -= usa;
    entra -= usa;
    if (entra > 0.004) fila.push({ mes: m.mes, rotulo: m.rotulo, valor: entra });
    while (sai > 0.004 && fila.length) {
      const abate = Math.min(fila[0].valor, sai);
      fila[0].valor -= abate;
      sai -= abate;
      if (fila[0].valor <= 0.004) fila.shift();
    }
    if (sai > 0.004) credito += sai;
  }
  const abertas = fila.map((p) => ({ ...p, valor: centavo(p.valor) })).filter((p) => p.valor > 0);
  return credito > 0.004
    ? [...abertas, { mes: "crédito", rotulo: "Faturado a mais que o medido", valor: -centavo(credito), credito: true }]
    : abertas;
}

/**
 * A idade do saldo a faturar (medido que não virou nota) ou do a receber
 * (nota que não virou dinheiro), até um mês, de uma base ou do cliente todo.
 * Célula a célula e depois somado por mês de origem.
 */
export function idadeDoAberto(
  historia: Celula[],
  periodos: Periodo[],
  ate: string,
  tipo: "faturar" | "receber",
  regiao?: string,
): ParcelaEmAberto[] {
  const rotulo = new Map(periodos.map((p) => [p.id, p]));
  const porCelula = new Map<string, { mes: string; rotulo: string; entra: number; sai: number }[]>();
  for (const c of historia) {
    const p = rotulo.get(c.periodo_id);
    if (!p || p.mes > ate || (regiao && c.regiao !== regiao)) continue;
    if (tipo === "receber" && !c.acompanha) continue;
    const k = `${c.regiao_id}:${c.categoria}`;
    const lista = porCelula.get(k) ?? [];
    if (tipo === "faturar") {
      lista.push({ mes: p.mes, rotulo: p.rotulo, entra: num(c.medido), sai: num(c.faturado) });
    } else {
      // A abertura é o que já vinha de antes do início: fica numa parcela
      // própria, anterior ao mês ("2026-09-00"), e conta como velha.
      if (num(c.abertura)) {
        lista.push({ mes: p.mes.slice(0, 8) + "00", rotulo: `Antes de ${p.rotulo}`, entra: num(c.abertura), sai: 0 });
      }
      lista.push({ mes: p.mes, rotulo: p.rotulo, entra: num(c.faturado), sai: num(c.recebido) });
    }
    porCelula.set(k, lista);
  }
  const porMes = new Map<string, ParcelaEmAberto>();
  for (const lista of porCelula.values()) {
    for (const parcela of idadeDaCelula(lista)) {
      const x = porMes.get(parcela.mes) ?? {
        mes: parcela.mes,
        rotulo:
          parcela.credito && tipo === "receber" ? "Recebido a mais que o faturado" : parcela.rotulo,
        valor: 0,
        credito: parcela.credito,
      };
      x.valor = centavo(x.valor + parcela.valor);
      porMes.set(parcela.mes, x);
    }
  }
  // Do mais novo ao mais velho, e o crédito por último.
  return [...porMes.values()].sort(
    (a, b) => Number(Boolean(a.credito)) - Number(Boolean(b.credito)) || b.mes.localeCompare(a.mes),
  );
}

export type Faixa = "mes" | "um" | "dois" | "velho";

export const ROTULO_FAIXA: Record<Faixa, string> = {
  mes: "do mês",
  um: "1 mês",
  dois: "2 meses",
  velho: "3 meses ou mais",
};

/** Quantos meses entre a origem e a posição: 0 é do próprio mês. */
export function mesesEntre(origem: string, ate: string): number {
  const [a1, m1] = origem.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

export function faixaDaIdade(origem: string, ate: string): Faixa {
  // A abertura do recebimento ("…-00") é de antes do controle: idade velha.
  if (origem.endsWith("-00")) return "velho";
  const n = mesesEntre(origem, ate);
  return n <= 0 ? "mes" : n === 1 ? "um" : n === 2 ? "dois" : "velho";
}

/** O aberto somado por faixa de idade, na ordem do mais novo ao mais velho. */
export function porFaixa(parcelas: ParcelaEmAberto[], ate: string): Record<Faixa, number> {
  const f: Record<Faixa, number> = { mes: 0, um: 0, dois: 0, velho: 0 };
  for (const p of parcelas.filter((x) => !x.credito)) f[faixaDaIdade(p.mes, ate)] = centavo(f[faixaDaIdade(p.mes, ate)] + p.valor);
  return f;
}
