// A medição de locação (0023): o "Boletim de medição" do Sisloc de cada base,
// lido do PDF, compondo a medição do mês do cliente — a que vai na planilha
// padrão da AEGEA ("EVIDÊNCIAS - OS & Equip.").
//
// Aqui fica a leitura das linhas do PDF, a troca de equipamento (a posição) e
// as conferências — sem banco nem navegador, para se provar com `npm test`.
// O PDF vira linhas no servidor (`lib/medicoes/pdf.ts`): cada linha é o texto
// da folha numa mesma altura, com os pedaços separados por tabulação.

import { lerNumero } from "./controle.ts";

/** Uma linha do boletim do Sisloc: um equipamento (ou acessório) de uma remessa. */
export interface ItemDeLocacao {
  /** "002565-01": a ficha (002565) e a remessa dela. */
  remessa: string;
  remessa_data: string | null;
  nf_remessa: string | null;
  /** O título que o Sisloc põe em cima do item, quando é de um kit ("CORTADORA DE PISO HUSQVARNA"). */
  grupo: string | null;
  qtde: number;
  /** O nome sem o patrimônio. */
  equipamento: string;
  patrimonio: string | null;
  /** "AAAA-MM-DD". */
  inicio: string;
  fim: string;
  dias: number;
  /** O "Subs." do Sisloc: este equipamento saiu, trocado por outro. */
  substituido: boolean;
  valor_base: number;
  valor_total: number;
}

export interface BoletimDeLocacao {
  fichas: string[];
  cliente: string;
  /** O "Entrega" inteiro, com o endereço. */
  entrega: string;
  /** O nome da base: o Entrega sem o endereço. */
  base: string;
  cod_docto: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  itens: ItemDeLocacao[];
  /** O "TOTAL GERAL" do Sisloc, com o arredondamento. */
  total_sisloc: number | null;
}

export type LeituraDeLocacao = { ok: true; boletim: BoletimDeLocacao } | { ok: false; erro: string };

const DATA = /(\d{2})\/(\d{2})\/(\d{4})/;
const iso = (d: string, m: string, a: string) => `${a}-${m}-${d}`;

/**
 * "01/09" no período "01/09/2026 - 30/09/2026": o ano é o do período — e, se
 * o período vira o ano, o do lado em que a data cai.
 */
function dataNoPeriodo(diaMes: string, inicio: string, fim: string): string {
  const [d, m] = diaMes.split("/");
  const noInicio = `${inicio.slice(0, 4)}-${m}-${d}`;
  if (noInicio >= inicio && noInicio <= fim) return noInicio;
  return `${fim.slice(0, 4)}-${m}-${d}`;
}

/** O patrimônio vem entre parênteses no fim do nome: "MARTELO ROMPEDOR 30KG (251214-929)". */
export function separarPatrimonio(texto: string): { equipamento: string; patrimonio: string | null } {
  const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(texto.trim());
  if (!m || !/\d/.test(m[2])) return { equipamento: texto.trim().replace(/\s+/g, " "), patrimonio: null };
  return { equipamento: m[1].trim().replace(/\s+/g, " "), patrimonio: m[2].trim().toUpperCase() };
}

const ENDERECO = /\s+-\s+(RUA|R\.|AV\.?|AVENIDA|RODOVIA|ROD\.?|ESTRADA|EST\.?|TRAVESSA|TV\.?|PRAÇA|PRACA|ALAMEDA|LARGO|VIA|BECO)\b/i;

/** O nome da base: o Entrega até o endereço — "VCG RIO BONITO LAGOS BLOCO 1". */
export function nomeDaBase(entrega: string): string {
  const t = entrega.replace(/\s+/g, " ").trim();
  const bloco = /^(.*?\bBLOCO\s*\d+)\b/i.exec(t);
  const end = ENDERECO.exec(t);
  if (end && (!bloco || end.index <= bloco[1].length)) return t.slice(0, end.index).trim();
  if (bloco) return bloco[1].trim();
  return t.split(" - ")[0].trim();
}

/**
 * O que o nome da base já diz sobre ela, quando vem separado por traços:
 * "VCG - RIO DE JANEIRO - COMUNIDADES - BLOCO 4" é o projeto VCG, o município
 * Rio de Janeiro, a superintendência Comunidades e o Bloco 4. Sem os traços,
 * diz só o projeto (a primeira palavra) e o bloco — o resto se completa no
 * cadastro.
 */
export function sugestaoDaBase(nome: string): {
  projeto: string | null;
  municipio: string | null;
  superintendencia: string | null;
  bloco: string | null;
} {
  const partes = nome.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  const bloco = /\bBLOCO\s*(\d+)\b/i.exec(nome);
  const blocoNome = bloco ? `BLOCO ${bloco[1]}` : null;
  if (partes.length >= 4) {
    return { projeto: partes[0], municipio: partes[1], superintendencia: partes[2], bloco: blocoNome };
  }
  return { projeto: nome.split(/\s+/)[0] || null, municipio: null, superintendencia: null, bloco: blocoNome };
}

/**
 * Lê as linhas do PDF do "Boletim de medição" do Sisloc.
 *
 * O cabeçalho se repete a cada página (Contato, Entrega, os títulos) e a
 * remessa que atravessa a página aparece de novo no topo da seguinte: nada
 * disso duplica. O nome comprido quebra em duas linhas ("…MARTELO 20 A" /
 * "30KG") e volta a ser um só; o título de kit ("CORTADORA DE PISO
 * HUSQVARNA"), sem quantidade, fica no item logo abaixo dele.
 */
export function lerBoletimDeLocacao(linhas: string[]): LeituraDeLocacao {
  const partes = linhas.map((l) => l.split("\t").map((p) => p.trim()).filter(Boolean));
  const texto = partes.map((p) => p.join(" "));

  const periodo = texto.map((t) => /Medi[cç][aã]o[^:]*:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i.exec(t)).find(Boolean);
  if (!periodo) {
    return { ok: false, erro: "Não parece um Boletim de medição do Sisloc: falta o Período Faturamento." };
  }
  const [, pi, pf] = periodo;
  const periodo_inicio = iso(...(DATA.exec(pi)!.slice(1, 4) as [string, string, string]));
  const periodo_fim = iso(...(DATA.exec(pf)!.slice(1, 4) as [string, string, string]));

  // As fichas e o Entrega podem quebrar linha: a continuação é a linha
  // seguinte sem rótulo.
  const continuar = (i: number, rotulo: RegExp) => {
    let t = texto[i].replace(rotulo, "").trim();
    for (let j = i + 1; j < texto.length; j++) {
      if (/:\s*/.test(texto[j]) && /^[A-ZÀ-Ü][A-Za-zÀ-ü./ ]{1,20}:/.test(texto[j])) break;
      if (/^(QTDE|Remessa:)/i.test(texto[j])) break;
      t += ` ${texto[j]}`;
    }
    return t.replace(/\s+/g, " ").trim();
  };
  const iFicha = texto.findIndex((t) => /^Ficha\s*:/i.test(t));
  const fichas = iFicha < 0 ? [] : [...continuar(iFicha, /^Ficha\s*:/i).matchAll(/\d{6,}\/\d{2}/g)].map((m) => m[0]);
  const iEntrega = texto.findIndex((t) => /^Entrega\s*:/i.test(t));
  if (iEntrega < 0) return { ok: false, erro: "O boletim não diz a base: falta o campo Entrega." };
  const entrega = continuar(iEntrega, /^Entrega\s*:/i);
  const cliente = (texto.find((t) => /^Cliente\s*:/i.test(t)) ?? "").replace(/^Cliente\s*:/i, "").trim();
  const cod = texto.map((t) => /C[oó]d\.?\s*docto\s*:\s*(\d+)/i.exec(t)).find(Boolean);
  const geral = texto.map((t) => /TOTAL GERAL\s*:\s*(-?[\d.]+,\d{2})/i.exec(t)).find(Boolean);

  const itens: ItemDeLocacao[] = [];
  let remessa: { numero: string; data: string | null; nf: string | null } | null = null;
  let grupo: string | null = null;
  let anteriorEhItem = false;
  for (const p of partes) {
    const t = p.join(" ");
    const r = /^Remessa:\s*(\d{6}-\d{2})/i.exec(t);
    if (r) {
      const data = /Data:\s*(\d{2}\/\d{2}\/\d{4})/i.exec(t);
      const nf = /NF Remessa:\s*(\d+)/i.exec(t);
      remessa = {
        numero: r[1],
        data: data ? iso(...(DATA.exec(data[1])!.slice(1, 4) as [string, string, string])) : null,
        nf: nf ? nf[1] : null,
      };
      grupo = null;
      anteriorEhItem = false;
      continue;
    }
    if (!remessa) continue;
    if (/^(Total Remessa|Total Loca|TOTAL GERAL|ARREDONDAMENTO|QTDE\b|Contato\s*:|Entrega\s*:|NOVA OP|Boletim de medi|P[AÁ]G\.)/i.test(t)) {
      anteriorEhItem = false;
      continue;
    }
    // O item: QTDE, nome, "dd/mm dd/mm", "30 D", Sim/Não, VL base, total.
    const m =
      /^(\d+(?:,\d+)?)\s+(.+?)\s+(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(\d+)\s*D\s+(Sim|N[aã]o)\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})$/i.exec(
        t,
      );
    if (m) {
      const { equipamento, patrimonio } = separarPatrimonio(m[2]);
      itens.push({
        remessa: remessa.numero,
        remessa_data: remessa.data,
        nf_remessa: remessa.nf,
        grupo,
        qtde: lerNumero(m[1]) ?? 1,
        equipamento,
        patrimonio,
        inicio: dataNoPeriodo(m[3], periodo_inicio, periodo_fim),
        fim: dataNoPeriodo(m[4], periodo_inicio, periodo_fim),
        dias: Number(m[5]),
        substituido: /^sim$/i.test(m[6]),
        valor_base: lerNumero(m[7]) ?? 0,
        valor_total: lerNumero(m[8]) ?? 0,
      });
      grupo = null;
      anteriorEhItem = true;
      continue;
    }
    // Sem quantidade: ou é o resto do nome do item de cima, ou o título do kit.
    if (p.length === 1 && /^[A-ZÀ-Ü0-9]/.test(t)) {
      const ultimo = itens[itens.length - 1];
      if (anteriorEhItem && ultimo && !ultimo.patrimonio && t.length <= 15) {
        ultimo.equipamento = `${ultimo.equipamento} ${t}`;
      } else {
        grupo = t.replace(/\s+/g, " ");
      }
      anteriorEhItem = false;
    }
  }
  if (itens.length === 0) return { ok: false, erro: "Nenhum equipamento lido no boletim." };

  return {
    ok: true,
    boletim: {
      fichas,
      cliente,
      entrega,
      base: nomeDaBase(entrega),
      cod_docto: cod ? cod[1] : null,
      periodo_inicio,
      periodo_fim,
      itens,
      total_sisloc: geral ? lerNumero(geral[1]) : null,
    },
  };
}

/* ── O que se cobra, e a troca ────────────────────────────── */

/** O que entra na planilha: equipamento com patrimônio e valor. Acessório a R$ 0,00 fica de fora. */
export function cobravel(i: Pick<ItemDeLocacao, "patrimonio" | "valor_base" | "valor_total">): boolean {
  return !!i.patrimonio && (i.valor_base > 0 || i.valor_total > 0);
}

export const fichaDaRemessa = (remessa: string) => remessa.split("-")[0];

const somarDia = (d: string, n: number) => {
  const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
};

/**
 * A posição: a vaga de um equipamento na frente de trabalho. Sem troca, é um
 * item só; com troca, é a corrente do que saiu ao que entrou no lugar — a
 * bomba que ficou de 01 a 07/08 e a que entrou no dia 08 são UMA posição de
 * 31 dias, e não duas bombas.
 */
export interface Posicao<T extends ItemDeLocacao = ItemDeLocacao> {
  itens: T[];
  dias: number;
  valor_total: number;
  /** O equipamento saiu trocado e a substituta não está neste boletim. */
  semSubstituta: boolean;
}

/**
 * Monta as posições do boletim. A troca é o item marcado "Subs." no Sisloc:
 * a substituta é o da mesma ficha, do mesmo kit (o título) ou do mesmo tipo,
 * que entra no dia seguinte ao fim dele — ou no mesmo dia. Só os itens
 * cobráveis entram.
 */
export function posicoesDoBoletim<T extends ItemDeLocacao>(itens: T[]): Posicao<T>[] {
  const cobraveis = itens.filter(cobravel);
  const chave = (i: T) => `${fichaDaRemessa(i.remessa)}|${(i.grupo ?? i.equipamento).toUpperCase()}`;
  const tipo = (i: T) => `${fichaDaRemessa(i.remessa)}|${i.equipamento.toUpperCase()}`;
  const usado = new Set<T>();
  const seguinte = (i: T): T | undefined => {
    const candidatos = cobraveis.filter(
      (x) =>
        x !== i &&
        !usado.has(x) &&
        (x.inicio === somarDia(i.fim, 1) || x.inicio === i.fim) &&
        (chave(x) === chave(i) || tipo(x) === tipo(i) || (i.grupo !== null && x.grupo === i.grupo)),
    );
    return candidatos.sort((a, b) => a.remessa.localeCompare(b.remessa))[0];
  };
  // Quem foi substituta de alguém não começa posição.
  const substitutas = new Set<T>();
  const cadeias = new Map<T, T[]>();
  for (const i of [...cobraveis].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.remessa.localeCompare(b.remessa))) {
    if (!i.substituido || substitutas.has(i)) continue;
    const corrente = [i];
    let atual = i;
    while (atual.substituido) {
      const prox = seguinte(atual);
      if (!prox) break;
      usado.add(prox);
      substitutas.add(prox);
      corrente.push(prox);
      atual = prox;
    }
    cadeias.set(i, corrente);
  }
  const posicoes: Posicao<T>[] = [];
  for (const i of cobraveis) {
    if (substitutas.has(i)) continue;
    const corrente = cadeias.get(i) ?? [i];
    const ultimo = corrente[corrente.length - 1];
    posicoes.push({
      itens: corrente,
      dias: corrente.reduce((t, x) => t + x.dias, 0),
      valor_total: Math.round(corrente.reduce((t, x) => t + x.valor_total, 0) * 100) / 100,
      semSubstituta: ultimo.substituido,
    });
  }
  return posicoes;
}

/** A soma do boletim, contra o TOTAL GERAL do Sisloc — que arredonda por item na nota. */
export function totalLido(itens: Pick<ItemDeLocacao, "valor_total">[]): number {
  return Math.round(itens.reduce((t, i) => t + i.valor_total, 0) * 100) / 100;
}

/** Até quanto a soma pode diferir do Sisloc: o arredondamento por item na nota. */
export const FOLGA_DO_SISLOC = 0.05;

export function bateComOSisloc(b: Pick<BoletimDeLocacao, "itens" | "total_sisloc">): boolean | null {
  if (b.total_sisloc === null) return null;
  return Math.abs(totalLido(b.itens) - b.total_sisloc) <= FOLGA_DO_SISLOC;
}

/** "01/09/2026 a 30/09/2026" — a DATA DE EXECUÇÃO da planilha da AEGEA. */
export function periodoDaPlanilha(inicio: string, fim: string): string {
  const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  return `${br(inicio)} a ${br(fim)}`;
}

/**
 * Patrimônio cobrado em duas bases no mesmo período — o erro que a digitação
 * fazia (o 250114-745 martelo numa base e gerador noutra). Devolve o
 * patrimônio e as bases onde aparece.
 */
export function patrimoniosRepetidos(
  linhas: { patrimonio: string | null; base: string; inicio: string; fim: string }[],
): { patrimonio: string; bases: string[] }[] {
  const por = new Map<string, { base: string; inicio: string; fim: string }[]>();
  for (const l of linhas) {
    if (!l.patrimonio) continue;
    por.set(l.patrimonio, [...(por.get(l.patrimonio) ?? []), l]);
  }
  const repetidos: { patrimonio: string; bases: string[] }[] = [];
  for (const [patrimonio, ls] of por) {
    const sobrepoe = ls.some((a, i) => ls.some((b, j) => j > i && a.inicio <= b.fim && b.inicio <= a.fim));
    if (sobrepoe) repetidos.push({ patrimonio, bases: [...new Set(ls.map((l) => l.base))] });
  }
  return repetidos.sort((a, b) => a.patrimonio.localeCompare(b.patrimonio));
}

/* ── A planilha da AEGEA ──────────────────────────────────── */

/** O que a base diz para a planilha (0023). */
export interface BaseDaPlanilha {
  nome: string;
  projeto: string | null;
  municipio: string | null;
  superintendencia: string | null;
  bloco: string | null;
  coordenador: string | null;
}

/** Uma linha da aba "EVIDÊNCIAS - OS & Equip.", e as colunas que a casa acrescenta no fim. */
export interface LinhaDaPlanilha {
  servico: string;
  patrimonio: string;
  execucao: string;
  unidade: string;
  tempo: number;
  qtde: number;
  valor_unidade: number;
  valor_total: number;
  aprovada: string;
  projeto: string;
  cidade: string;
  superintendencia: string;
  bloco: string;
  /** As colunas sugeridas: a posição (2, 2.1, 2.2), a troca, o coordenador, a base e a remessa do Sisloc. */
  posicao: string;
  troca: string;
  coordenador: string;
  base: string;
  remessa: string;
}

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/**
 * As linhas da locação de uma base, posição a posição. Sem troca, a posição é
 * uma linha só ("7"); com troca, cada equipamento é uma linha ("7.1", "7.2")
 * e a coluna TROCA diz quem substituiu quem — dez bombas com dez trocas
 * continuam sendo dez posições.
 */
export function linhasDaLocacao<T extends ItemDeLocacao & { coordenador?: string | null }>(
  base: BaseDaPlanilha,
  itens: T[],
  primeiraPosicao = 1,
): LinhaDaPlanilha[] {
  const linhas: LinhaDaPlanilha[] = [];
  posicoesDoBoletim(itens).forEach((p, n) => {
    const numero = primeiraPosicao + n;
    p.itens.forEach((i, k) => {
      const antes = p.itens[k - 1];
      const depois = p.itens[k + 1];
      const troca = [
        antes ? `substituiu ${antes.patrimonio} em ${br(i.inicio)}` : null,
        depois ? `trocado por ${depois.patrimonio} em ${br(depois.inicio)}` : null,
        !depois && i.substituido ? `saiu em ${br(i.fim)}, sem substituto no boletim` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      linhas.push({
        servico: i.equipamento,
        patrimonio: i.patrimonio ?? "-",
        execucao: periodoDaPlanilha(i.inicio, i.fim),
        unidade: "UND",
        tempo: i.dias,
        qtde: 1,
        valor_unidade: i.valor_base,
        valor_total: i.valor_total,
        aprovada: "SIM",
        projeto: base.projeto ?? "",
        cidade: base.municipio ?? "",
        superintendencia: base.superintendencia ?? "",
        bloco: base.bloco ?? "",
        posicao: p.itens.length > 1 ? `${numero}.${k + 1}` : String(numero),
        troca,
        coordenador: i.coordenador || base.coordenador || "",
        base: base.nome,
        remessa: i.remessa,
      });
    });
  });
  return linhas;
}

/**
 * As linhas de MANUTENÇÃO do fim da planilha: o valor dos boletins de
 * manutenção do mês, somado por projeto, município, superintendência e bloco
 * — o que a planilha de setembro trazia digitado. A base sem esses campos no
 * cadastro soma numa linha sem eles, e a tela avisa.
 */
export function linhasDaManutencao(
  boletins: { valor: number; base: BaseDaPlanilha | null }[],
  inicio: string,
  fim: string,
): LinhaDaPlanilha[] {
  const grupos = new Map<string, { base: BaseDaPlanilha | null; valor: number }>();
  for (const b of boletins) {
    if (!b.valor) continue;
    const k = [b.base?.projeto, b.base?.municipio, b.base?.superintendencia, b.base?.bloco].map((x) => x ?? "").join("|");
    const g = grupos.get(k) ?? { base: b.base, valor: 0 };
    g.valor += b.valor;
    grupos.set(k, g);
  }
  const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86_400_000) + 1;
  return [...grupos.values()]
    .sort((a, b) => (a.base?.bloco ?? "").localeCompare(b.base?.bloco ?? "") || (a.base?.projeto ?? "").localeCompare(b.base?.projeto ?? ""))
    .map((g) => ({
      servico: "MANUTENÇÃO",
      patrimonio: "-",
      execucao: periodoDaPlanilha(inicio, fim),
      unidade: "UND",
      tempo: dias,
      qtde: 1,
      valor_unidade: 0,
      valor_total: Math.round(g.valor * 100) / 100,
      aprovada: "SIM",
      projeto: g.base?.projeto ?? "",
      cidade: g.base?.municipio ?? "",
      superintendencia: g.base?.superintendencia ?? "",
      bloco: g.base?.bloco ?? "",
      posicao: "",
      troca: "",
      coordenador: g.base?.coordenador ?? "",
      base: "",
      remessa: "",
    }));
}

/** O que falta na base para a linha da planilha sair completa. */
export function faltaNaBase(b: BaseDaPlanilha | null): string[] {
  if (!b) return ["cadastro"];
  return [
    !b.projeto && "projeto",
    !b.municipio && "município",
    !b.superintendencia && "superintendência",
    !b.bloco && "bloco",
    !b.coordenador && "coordenador",
  ].filter((x): x is string => !!x);
}
