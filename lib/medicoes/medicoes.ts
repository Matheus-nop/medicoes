// O boletim de medição de manutenção.
//
// Espelha supabase/migrations/0002_boletins.sql. Se a view mudar, mude aqui
// junto.
//
// ── O que é ──────────────────────────────────────────────────────────
//
// A manutenção que se cobra do cliente vira OM no Sisloc. No fim do período
// alguém junta essas OMs numa planilha — patrimônio, equipamento, obra, custo,
// valor — e manda para o cliente conferir e aprovar a cobrança. Isso é o
// boletim de medição (BM), e esta é a versão dele que se monta COLANDO a lista
// do Sisloc, e não digitando.
//
// ── A unidade ────────────────────────────────────────────────────────
//
// A OM. Uma OM entra em UM boletim, nunca em dois: cobrar a mesma manutenção
// duas vezes é o erro que mais custa caro aqui (dinheiro devolvido e cliente
// desconfiado), e é por isso que o banco tem `unique (om)` e esta leitura
// avisa antes de gravar.
//
// ── O que NÃO é coluna ───────────────────────────────────────────────
//
// A situação do boletim (aberto, fechado, enviado, faturado) é o último
// andamento, como a situação do equipamento é a última movimentação. O total,
// o custo, a margem e o período saem da view. O VALOR de cada OM é gravado —
// não é conta, é decisão de quanto se cobra, e muda enquanto o boletim está
// aberto.

import {
  OFICINA_TERMINOU,
  ROTULO_ETAPA_OFICINA,
  lerCabecalho,
  lerDinheiro,
  lerMomento,
  normalizar,
  reconhecerEtapa,
  type EtapaOficina,
  type Mapa,
} from "./sisloc.ts";

/** O fuso de quem usa. Todo corte de dia e de mês passa por ele. */
export const FUSO = "America/Sao_Paulo";

/* ── Os passos do boletim ──────────────────────────────────── */

/**
 * aberto → fechado → enviado → faturado
 *
 * `aberto` é o único passo em que as OMs entram, saem e mudam de valor.
 * Fechar congela — e é do fechado que sai o papel que vai para o cliente.
 * Reabrir existe (o cliente contesta uma OM, o valor estava errado), mas é da
 * diretoria: boletim que já foi mandado e muda sem ninguém responder por isso é
 * o cliente recebendo duas versões do mesmo número.
 */
export type SituacaoBoletim = "aberto" | "fechado" | "enviado" | "faturado";

export const SITUACOES: SituacaoBoletim[] = ["aberto", "fechado", "enviado", "faturado"];

export const ROTULO_SITUACAO: Record<SituacaoBoletim, string> = {
  aberto: "Em medição",
  fechado: "Fechado",
  enviado: "Enviado ao cliente",
  faturado: "Faturado",
};

/** O botão que leva ao passo seguinte, no vocabulário de quem aperta. */
export const ACAO_SEGUINTE: Record<SituacaoBoletim, string | null> = {
  aberto: "Fechar o boletim",
  fechado: "Marcar como enviado",
  enviado: "Marcar como faturado",
  faturado: null,
};

export const SEGUINTE: Record<SituacaoBoletim, SituacaoBoletim | null> = {
  aberto: "fechado",
  fechado: "enviado",
  enviado: "faturado",
  faturado: null,
};

/** Só a diretoria reabre, e só o que ainda não foi faturado. */
export const PODE_REABRIR: SituacaoBoletim[] = ["fechado", "enviado"];

export function situacaoLida(cru: unknown): SituacaoBoletim {
  return SITUACOES.includes(cru as SituacaoBoletim) ? (cru as SituacaoBoletim) : "aberto";
}

/* ── O cliente ─────────────────────────────────────────────── */

/**
 * O mesmo cliente escrito de dois jeitos.
 *
 * O Sisloc tem "AEGEA SANEAMENTO E PARTICIPACOES S.A." numa OM e "... S.A"
 * na outra, e as duas são a mesma empresa. Sem acento, sem pontuação e sem
 * espaço dobrado, as duas viram a mesma chave — sem isso a colagem abriria
 * dois boletins para o mesmo cliente.
 */
export function chaveDoCliente(nome: string): string {
  // O ponto some sem deixar espaço — "S.A." e "SA" são a mesma sigla —, e o
  // resto da pontuação vira espaço, para "LTDA-EPP" não virar "LTDAEPP".
  return normalizar(nome)
    .replace(/\./g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const mesmoCliente = (a: string, b: string) => chaveDoCliente(a) === chaveDoCliente(b);

/* ── O valor ───────────────────────────────────────────────── */

/** De onde veio o valor cobrado. `manual` é o que alguém digitou por cima. */
export type FonteDoValor = "orcamento" | "previsto" | "gasto" | "nenhum" | "manual";

export const ROTULO_FONTE: Record<FonteDoValor, string> = {
  orcamento: "Vl. orçamento",
  // As duas abaixo são de boletim montado antes da regra do orçamento: o
  // valor veio do custo. Continuam rotuladas para quem abrir um desses.
  previsto: "Total previsto (custo)",
  gasto: "Total gasto (custo)",
  nenhum: "sem orçamento no Sisloc",
  manual: "digitado",
};

/**
 * O valor que a OM traz para o boletim: o "Vl. orçamento", e só ele.
 *
 * O orçamento é o preço combinado com o cliente, e nas corretivas que se
 * cobram ele vem preenchido. A primeira versão desta função caía no "Total
 * previsto" quando o orçamento vinha zerado — e isso é CUSTO, não preço:
 * cobraria do cliente o que a peça custou para a casa. Sem orçamento, a OM
 * fica com zero e a tela avisa; quem monta o boletim decide se ela entra.
 *
 * Zero conta como ausente: "0,00" no orçamento é o Sisloc dizendo que não há
 * orçamento, e não que o conserto sai de graça. O custo ("Total previsto" e
 * "Total gasto") continua lido, mas vai para a coluna de custo, e só na tela.
 */
export function valorSugerido(orcamento: number | null): {
  valor: number;
  fonte: Exclude<FonteDoValor, "manual">;
} {
  if (orcamento && orcamento > 0) return { valor: orcamento, fonte: "orcamento" };
  return { valor: 0, fonte: "nenhum" };
}

/* ── A base ───────────────────────────────────────────────── */

/**
 * A OBRA, QUANDO ELA É MESMO UMA OBRA.
 *
 * "Nome local de entrega" nem sempre traz uma obra. Quando ninguém preencheu
 * o canteiro, o Sisloc repete ali o nome do cliente — nas cinco OMs mais
 * antigas da AEGEA as duas colunas são a mesma coisa, letra por letra.
 *
 * Repetir isso no cartão não informa nada: dá "AEGEA SANEAMENTO E
 * PARTICIPACOES S.A." em cima e "de AEGEA SANEAMENTO E PARTICIPACOES S.A."
 * logo abaixo, e quem olha procura a diferença entre as duas linhas até
 * descobrir que não há. Onde o Sisloc não sabe a obra, aqui também não se
 * sabe — e não saber se escreve não escrevendo.
 */
export function localDeVerdade(
  local: string,
  cliente: string,
  cidade = "",
): string {
  const l = local.trim();
  if (l && normalizar(l) !== normalizar(cliente)) return l;

  // A CIDADE É A RESPOSTA QUANDO O CANTEIRO NÃO FOI PREENCHIDO.
  //
  // A grade tem uma coluna "Cidade" que a leitura ignorava, e ela está
  // preenchida em TODA linha: MARICÁ, ITABORAÍ, SÃO GONÇALO, DUQUE DE
  // CAXIAS, FRUTAL. Nas cinco OMs em que o local repete o cliente, é ela
  // que diz de onde a máquina veio — menos preciso que o canteiro, e
  // infinitamente mais útil que nada.
  const c = cidade.trim();
  if (c && normalizar(c) !== normalizar(cliente)) return c;

  return "";
}

/* ── A colagem ─────────────────────────────────────────────── */

const PATRIMONIO = /\b(\d{4,8}-\d{2,4})\b/;

/** Uma OM da colagem, pronta para entrar num boletim. */
export interface OmLida {
  om: string;
  cliente: string;
  /**
   * "Nome local de entrega" — é onde mora a base e a obra, juntas: "BASE
   * NORTE - ILHA", "L 471 - RUA ESCULAPIO". Vazio quando o Sisloc só repetiu
   * o nome do cliente ali; aí vale a cidade (ver `localDeVerdade`).
   */
  local: string;
  cidade: string;
  equipamento: string;
  /** O patrimônio limpo. "260615-171 SN: 168F..." vira "260615-171". */
  patrimonio: string;
  tipoOm: string;
  abertaEm: string | null;
  concluidaEm: string | null;
  entregueEm: string | null;
  previsto: number | null;
  gasto: number | null;
  orcamento: number | null;
  /** O ponto de partida do valor cobrado. Ver `valorSugerido`. */
  valor: number;
  fonte: Exclude<FonteDoValor, "manual">;
  complemento: string;
  /**
   * "OM RETIRADA" — o recibo de quando a máquina saiu da obra. É a coluna
   * "RECIBO RETIRADA" do boletim. Vem vazia na maioria das telas do Sisloc,
   * e então se digita no boletim.
   */
  omRetirada: string;
  /** "DATA DE CHEGADA" — quando a máquina chegou. Vazia quase sempre. */
  chegadaEm: string | null;
  /** Coluna "O", crua: "7 - Equipamento entregue". */
  etapaBruta: string;
  etapa: EtapaOficina;
  /**
   * A oficina ainda não largou a máquina (etapa antes da 6). Cobrar OM
   * que não terminou é cobrar serviço que ainda pode mudar de preço — entra,
   * mas com aviso.
   */
  naOficina: boolean;
  origem: string;
}

export interface LeituraDaMedicao {
  linhas: OmLida[];
  ignoradas: { origem: string; motivo: string }[];
  /** Sem cabeçalho não há leitura: são 38 colunas, e valor na coluna errada
   *  é cobrança errada. */
  temCabecalho: boolean;
}

/**
 * Lê a lista de OMs colada do Sisloc, com a linha de títulos.
 *
 * Exige o cabeçalho, como a leitura do orçamento: aqui cada coluna errada é
 * dinheiro errado num papel que vai para o cliente, e "adivinhar pelo
 * conteúdo" — o plano B das outras leituras — trocaria custo por preço sem
 * dar erro nenhum.
 *
 * Não filtra por dono da máquina: a corretiva de retorno (máquina nossa que
 * quebrou na obra) e o conserto de máquina do cliente se cobram do mesmo
 * jeito, no mesmo boletim.
 */
export function lerOmsDaMedicao(bruto: string): LeituraDaMedicao {
  const cruas = bruto.split(/\r?\n/);

  let mapa: Mapa | null = null;
  let primeira = 0;
  for (let i = 0; i < cruas.length; i++) {
    const m = lerCabecalho(cruas[i]);
    if (m && m.om !== undefined && m.cliente !== undefined) {
      mapa = m;
      primeira = i + 1;
      break;
    }
  }
  if (!mapa) return { linhas: [], ignoradas: [], temCabecalho: false };

  const linhas: OmLida[] = [];
  const ignoradas: LeituraDaMedicao["ignoradas"] = [];
  const vistas = new Set<string>();

  for (let i = primeira; i < cruas.length; i++) {
    const original = cruas[i];
    if (original.trim().length < 10) continue;

    // Sem `trim` antes de partir: as primeiras colunas podem vir vazias, e
    // aparar a linha deslocaria todas as outras uma casa para a esquerda.
    const colunas = original.split("\t");
    const em = (campo: keyof Mapa) => {
      const n = mapa[campo];
      return n === undefined ? "" : (colunas[n] ?? "").trim();
    };

    const om = em("om").replace(/\s+/g, "");
    if (!/^\d{3,10}$/.test(om)) {
      ignoradas.push({ origem: original.trim(), motivo: "sem número de OM" });
      continue;
    }
    if (vistas.has(om)) {
      ignoradas.push({ origem: original.trim(), motivo: `OM ${om} repetida na colagem` });
      continue;
    }
    const cliente = em("cliente");
    if (!cliente) {
      ignoradas.push({ origem: original.trim(), motivo: `OM ${om} sem cliente` });
      continue;
    }
    vistas.add(om);

    const orcamento = lerDinheiro(em("orcamento"));
    const previsto = lerDinheiro(em("previsto"));
    const gasto = lerDinheiro(em("gasto"));
    const sugerido = valorSugerido(orcamento);
    const patrimonioCru = em("patrimonio");
    const cidade = em("cidade");

    const etapaBruta = em("etapa");
    const etapa = reconhecerEtapa(etapaBruta);

    linhas.push({
      om,
      cliente,
      local: localDeVerdade(em("localEntrega"), cliente, cidade),
      cidade,
      equipamento: em("equipamento"),
      patrimonio: (patrimonioCru.match(PATRIMONIO)?.[1] ?? patrimonioCru).toUpperCase(),
      tipoOm: em("tipoOm"),
      abertaEm: lerMomento(em("abertura")) || null,
      concluidaEm: lerMomento(em("conclusao")) || null,
      entregueEm: lerMomento(em("entrega")) || null,
      previsto,
      gasto,
      orcamento,
      valor: sugerido.valor,
      fonte: sugerido.fonte,
      complemento: em("complemento"),
      omRetirada: em("omRetirada").replace(/\s+/g, ""),
      chegadaEm: lerMomento(em("chegada")) || null,
      etapaBruta,
      etapa,
      naOficina: etapa !== "desconhecida" && !OFICINA_TERMINOU.includes(etapa),
      origem: original.trim(),
    });
  }

  return { linhas, ignoradas, temCabecalho: true };
}

/* ── A colagem separada por destino ────────────────────────── */

/**
 * O destino de um boletim: um cliente numa base.
 *
 * O boletim da casa é por BASE, e não por cliente — o antigo "BM MANUTENÇÃO
 * VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4 - AGOSTO" é da AEGEA, mas só daquela
 * base, porque é a fiscalização de cada base que confere e aprova o que é
 * dela. A base é o "Nome local de entrega" do Sisloc.
 */
export interface GrupoDeDestino {
  cliente: string;
  /** A base como o Sisloc escreve. Vazia quando o Sisloc não diz. */
  base: string;
  chave: string;
  linhas: OmLida[];
  valor: number;
}

/** A chave de cliente + base. Mesma normalização do cliente nas duas partes. */
export const chaveDoDestino = (cliente: string, base: string | null | undefined) =>
  `${chaveDoCliente(cliente)}|${chaveDoCliente(base ?? "")}`;

/**
 * Uma colagem pode trazer cinco clientes em doze bases; cada par tem o seu
 * boletim.
 *
 * O nome que fica é o da primeira OM do grupo — as grafias só diferem em
 * pontuação, e escolher "a mais completa" seria regra que ninguém lembra.
 * Ordem: cliente, e dentro dele o que vale mais primeiro.
 */
export function porDestino(linhas: OmLida[]): GrupoDeDestino[] {
  const grupos = new Map<string, GrupoDeDestino>();
  for (const l of linhas) {
    const chave = chaveDoDestino(l.cliente, l.local);
    const g = grupos.get(chave) ?? {
      cliente: l.cliente,
      base: l.local,
      chave,
      linhas: [],
      valor: 0,
    };
    g.linhas.push(l);
    g.valor += l.valor;
    grupos.set(chave, g);
  }
  return [...grupos.values()].sort(
    (a, b) =>
      a.cliente.localeCompare(b.cliente) || b.valor - a.valor || a.base.localeCompare(b.base),
  );
}

/* ── O que vai no papel ────────────────────────────────────── */

/**
 * O fornecedor que assina o boletim. Não é a Nova Opção: a manutenção é
 * faturada pela Ação, empresa do grupo — é o que o modelo da casa traz.
 */
export const FORNECEDOR = {
  nome: "AÇÃO SERVIÇOS E MÁQUINAS LTDA-ME",
  contato: "Setor de Orçamento — orcamento@novaopcaoequipamentos.com.br",
  telefone: "(21) 3773-4358",
} as const;

/** As linhas que o papel desenha mesmo vazias — as dezesseis do modelo. */
export const LINHAS_NO_PAPEL = 16;

const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO",
  "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

/**
 * "AGOSTO/2026": o mês do serviço, que é o que o boletim mede.
 *
 * Sai da OM mais recente, e não da data de hoje: o boletim de agosto se emite
 * em setembro (o antigo tem data 02/09 e diz AGOSTO). Sem data nenhuma, o mês
 * passado — é o que se está medindo quando se abre o boletim no começo do mês.
 */
export function mesDeReferencia(datas: (string | null)[], hoje = new Date()): string {
  const validas = datas
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()));
  let ano: number;
  let mes: number;
  if (validas.length) {
    const ultima = new Date(Math.max(...validas.map((d) => d.getTime())));
    // O mês no fuso de quem usa: 31/08 às 22h em Brasília já é setembro em UTC.
    const [a, m] = ultima
      .toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
      .split("-")
      .map(Number);
    ano = a;
    mes = m - 1;
  } else {
    const [a, m] = hoje
      .toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
      .split("-")
      .map(Number);
    ano = m === 1 ? a - 1 : a;
    mes = m === 1 ? 11 : m - 2;
  }
  return `${MESES[mes]}/${ano}`;
}

/**
 * A descrição da linha do boletim.
 *
 * Máquina de cliente chega como "CORTADORA DE PISO (CLIENTE)", e o que a
 * identifica — "TOYAMA TCC450-H" — está no Complemento. As duas juntas; a
 * nossa, que não tem complemento, fica como veio.
 */
export function descricaoDoEquipamento(equipamento: string, complemento: string): string {
  const e = equipamento.trim();
  const c = complemento.trim();
  if (!c || normalizar(e).includes(normalizar(c))) return e;
  return e ? `${e} — ${c}` : c;
}

/** "Em execução" para a OM que ainda não saiu da oficina. */
export const rotuloDaEtapa = (etapa: EtapaOficina) => ROTULO_ETAPA_OFICINA[etapa];

/* ── O resumo do boletim ───────────────────────────────────── */

/** O que a tela e o papel precisam de cada OM do boletim. */
export interface ItemDoBoletim {
  id: number;
  om: string;
  patrimonio: string | null;
  equipamento: string | null;
  local: string | null;
  cidade: string | null;
  tipo_om: string | null;
  aberta_em: string | null;
  concluida_em: string | null;
  custo: number | null;
  valor: number;
  fonte: FonteDoValor;
  observacao: string | null;
  complemento: string | null;
  /** "RECIBO RETIRADA": vem do "OM RETIRADA" do Sisloc, ou se digita. */
  om_retirada: string | null;
  /** "RECIBO ENTREGA": não há coluna no Sisloc para ele — se digita. */
  recibo_entrega: string | null;
  chegada_em: string | null;
  /** A coluna "O" do Sisloc no instante da colagem. */
  etapa_om: string | null;
}

/**
 * A data da linha do boletim: a chegada da máquina quando o Sisloc diz, e a
 * abertura da OM quando não — é quando a máquina entrou para o conserto.
 */
export const dataDaOm = (i: Pick<ItemDoBoletim, "chegada_em" | "aberta_em">) =>
  i.chegada_em ?? i.aberta_em;

export interface Fatia {
  nome: string;
  oms: number;
  valor: number;
  custo: number;
}

export interface ResumoDoBoletim {
  oms: number;
  valor: number;
  custo: number;
  /** Valor menos custo. Null quando não há custo nenhum lançado. */
  margem: number | null;
  /** OM com valor zero: entrou no boletim e não cobra nada. É o que se
   *  confere antes de fechar. */
  semValor: number;
  /** OM cujo valor é o custo repassado — ninguém pôs preço ainda. */
  valorEhCusto: number;
  porLocal: Fatia[];
  porEquipamento: Fatia[];
}

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function fatiar(itens: ItemDoBoletim[], chave: (i: ItemDoBoletim) => string): Fatia[] {
  const mapa = new Map<string, Fatia>();
  for (const i of itens) {
    const nome = chave(i) || "Sem informação";
    const f = mapa.get(nome) ?? { nome, oms: 0, valor: 0, custo: 0 };
    f.oms += 1;
    f.valor += n(i.valor);
    f.custo += n(i.custo);
    mapa.set(nome, f);
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));
}

/**
 * O resultado executivo até o momento: quanto o boletim cobra, quanto custou,
 * onde está o dinheiro (base/obra) e em que máquina.
 *
 * É a mesma conta da view `medicao_boletins_atual` para o total e o custo — a
 * view serve a lista, esta serve a tela e o papel de um boletim só, que
 * precisam das fatias.
 */
export function resumir(itens: ItemDoBoletim[]): ResumoDoBoletim {
  const valor = itens.reduce((t, i) => t + n(i.valor), 0);
  const temCusto = itens.some((i) => i.custo !== null);
  const custo = itens.reduce((t, i) => t + n(i.custo), 0);
  return {
    oms: itens.length,
    valor,
    custo,
    margem: temCusto ? valor - custo : null,
    semValor: itens.filter((i) => n(i.valor) === 0).length,
    valorEhCusto: itens.filter((i) => i.fonte === "previsto" || i.fonte === "gasto").length,
    porLocal: fatiar(itens, (i) => i.local ?? i.cidade ?? ""),
    porEquipamento: fatiar(itens, (i) => i.equipamento ?? ""),
  };
}

/* ── O painel por cliente ──────────────────────────────────── */

/** Uma linha de `medicao_boletins_atual`. */
export interface BoletimAtual {
  id: number;
  numero: string;
  cliente: string;
  referencia: string | null;
  observacao: string | null;
  criado_em: string;
  criado_por_nome: string | null;
  situacao: SituacaoBoletim;
  situacao_em: string | null;
  situacao_por_nome: string | null;
  oms: number;
  valor: number;
  custo: number | null;
  primeira_om: string | null;
  ultima_om: string | null;
  /** A base / fiscalização do cliente — um boletim por base. */
  base: string | null;
  /** "CONTATO / E-MAIL" e "TELEFONE" do cliente, e o endereço da obra. */
  contato: string | null;
  email: string | null;
  telefone: string | null;
  local_obra: string | null;
  /** Quando fechou pela última vez. É a DATA DE EMISSÃO do papel. */
  fechado_em: string | null;
}

export interface SaldoDoCliente {
  cliente: string;
  boletins: number;
  /** Em medição: boletim aberto, o valor ainda pode mudar. */
  emMedicao: number;
  /** Medido: fechado, enviado ou faturado — o que já foi apresentado. */
  medido: number;
  faturado: number;
  /** Medido e ainda não faturado. É o número que se cobra do financeiro. */
  saldo: number;
  oms: number;
}

/**
 * Medido, faturado e saldo por cliente — o painel que hoje sai da planilha.
 *
 * `medido` é o que saiu de casa num boletim fechado; o aberto fica de fora e
 * aparece à parte, porque número que ainda muda não se soma com número que o
 * cliente já recebeu.
 */
export function saldoPorCliente(boletins: BoletimAtual[]): SaldoDoCliente[] {
  const mapa = new Map<string, SaldoDoCliente>();
  for (const b of boletins) {
    const chave = chaveDoCliente(b.cliente);
    const s = mapa.get(chave) ?? {
      cliente: b.cliente,
      boletins: 0,
      emMedicao: 0,
      medido: 0,
      faturado: 0,
      saldo: 0,
      oms: 0,
    };
    s.boletins += 1;
    s.oms += b.oms;
    const v = n(b.valor);
    if (b.situacao === "aberto") s.emMedicao += v;
    else s.medido += v;
    if (b.situacao === "faturado") s.faturado += v;
    s.saldo = s.medido - s.faturado;
    mapa.set(chave, s);
  }
  return [...mapa.values()].sort(
    (a, b) => b.medido + b.emMedicao - (a.medido + a.emMedicao) || a.cliente.localeCompare(b.cliente),
  );
}

/* ── O valor digitado ──────────────────────────────────────── */

/**
 * O valor que alguém digitou na tela, e não o que veio do Sisloc.
 *
 * `lerDinheiro` assume o ponto como milhar, que é certo para a colagem e
 * errado para quem digita "1097.20" no teclado numérico: sairia 109.720, cem
 * vezes mais, calado. Aqui a vírgula manda quando existe; sem vírgula, um ponto
 * só com até duas casas depois é decimal. Devolve null para o que não é número.
 */
export function lerValorDigitado(texto: string): number | null {
  const t = texto.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!t) return null;
  let limpo: string;
  if (t.includes(",")) limpo = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d+\.\d{1,2}$/.test(t)) limpo = t;
  else limpo = t.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/**
 * A OM entrou no boletim antes de a oficina largar a máquina?
 *
 * Lê o retrato da coluna "O" gravado na colagem. Sem etapa (colagem de tela
 * que não traz a coluna), não acusa — dúvida não vira aviso vermelho.
 */
export function entrouNaOficina(etapaBruta: string | null | undefined): boolean {
  const etapa = reconhecerEtapa(etapaBruta ?? "");
  return etapa !== "desconhecida" && !OFICINA_TERMINOU.includes(etapa);
}

/* ── Os comprovantes: retirada e entrega ───────────────────── */

/**
 * A OM do Sisloc tem três momentos, e cada um tem o seu número: a ENTRADA (a
 * máquina saiu da obra — o recibo de retirada), a CORRETIVA (o conserto — é a
 * OM que se cobra) e o RETORNO (a máquina voltou ao cliente — o comprovante de
 * entrega). É o que `ordens_servico` guarda desde a 0007, e é o que o boletim
 * pede nas colunas RECIBO RETIRADA e RECIBO ENTREGA.
 *
 * Duas fontes, nesta ordem:
 *
 *   1. A OS do estoque cuja `om_corretiva` é a própria OM cobrada. É ligação
 *      exata — o PCM digitou os três números no mesmo cartão —, e por isso
 *      vence qualquer outra.
 *   2. As demandas do app de Roteiros do mesmo patrimônio. O PCM lança o
 *      retorno com a OM nova (ver a 0052), e é esse número que vai na demanda
 *      de RETORNO AO CLIENTE. Aqui a ligação é pela data: a retirada mais
 *      recente ANTES da OM abrir, e a primeira entrega FINALIZADA depois.
 *
 * Nenhuma das duas sobrescreve o que já está preenchido: o "OM RETIRADA" do
 * Sisloc e o que alguém digitou valem mais que um palpite pela data.
 */
export interface OsComOms {
  patrimonio: string | null;
  om_entrada: string | null;
  om_corretiva: string | null;
  om_retorno: string | null;
}

export interface DemandaDoRoteiros {
  patrimonio: string;
  tipo: string;
  om: string;
  /** O dia da demanda — o finalizado, quando houve; o planejado, quando não. */
  dia: string;
  finalizada: boolean;
}

export type OrigemDoComprovante = "os" | "roteiros";

export interface Comprovantes {
  retirada: string | null;
  entrega: string | null;
  deOnde: { retirada: OrigemDoComprovante | null; entrega: OrigemDoComprovante | null };
}

/** "034292" e "34292" são a mesma OM: o Sisloc mostra os zeros, gente digita sem. */
export const mesmaOm = (a: string | null | undefined, b: string | null | undefined) => {
  const limpa = (x: string) => x.replace(/\D/g, "").replace(/^0+/, "");
  return Boolean(a && b && limpa(a) && limpa(a) === limpa(b));
};

const patrimonioComparavel = (p: string | null | undefined) =>
  (p ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");

const TIPOS_DE_RETIRADA = ["RETIRADA", "MANUTENCAO", "TROCA", "DEVOLUCAO"];
const TIPOS_DE_ENTREGA = ["RETORNO AO CLIENTE", "RETORNO"];

const DIA = 24 * 3600 * 1000;

/**
 * Os dois comprovantes de uma OM, das duas fontes.
 *
 * Janelas: a retirada até 45 dias antes da OM abrir (e até 2 dias depois — o
 * PCM às vezes abre a OM antes de o técnico finalizar a retirada no app); a
 * entrega até 120 dias depois. Fora disso é outra passagem da máquina pela
 * oficina, e o número seria de outro conserto.
 */
export function acharComprovantes(
  om: { om: string; patrimonio: string | null; abertaEm: string | null; entregueEm?: string | null },
  ordens: OsComOms[],
  demandas: DemandaDoRoteiros[],
): Comprovantes {
  const r: Comprovantes = { retirada: null, entrega: null, deOnde: { retirada: null, entrega: null } };

  const os = ordens.find((o) => mesmaOm(o.om_corretiva, om.om));
  if (os?.om_entrada && !mesmaOm(os.om_entrada, om.om)) {
    r.retirada = os.om_entrada.trim();
    r.deOnde.retirada = "os";
  }
  if (os?.om_retorno && !mesmaOm(os.om_retorno, om.om)) {
    r.entrega = os.om_retorno.trim();
    r.deOnde.entrega = "os";
  }
  if ((r.retirada && r.entrega) || !om.abertaEm) return r;

  const pat = patrimonioComparavel(om.patrimonio);
  const abertura = new Date(om.abertaEm).getTime();
  if (!pat || Number.isNaN(abertura)) return r;

  const daMaquina = demandas
    .filter((d) => patrimonioComparavel(d.patrimonio) === pat && d.om && !mesmaOm(d.om, om.om))
    .map((d) => ({ ...d, quando: new Date(d.dia).getTime(), tipoLimpo: normalizar(d.tipo) }))
    .filter((d) => !Number.isNaN(d.quando));

  if (!r.retirada) {
    const retirada = daMaquina
      .filter(
        (d) =>
          TIPOS_DE_RETIRADA.includes(d.tipoLimpo) &&
          d.quando >= abertura - 45 * DIA &&
          d.quando <= abertura + 2 * DIA,
      )
      .sort((a, b) => b.quando - a.quando)[0];
    if (retirada) {
      r.retirada = retirada.om.trim();
      r.deOnde.retirada = "roteiros";
    }
  }

  if (!r.entrega) {
    // Com a "Dt. entrega" do Sisloc, a mais perto dela; sem, a primeira depois.
    const alvo = om.entregueEm ? new Date(om.entregueEm).getTime() : NaN;
    const entrega = daMaquina
      .filter(
        (d) =>
          TIPOS_DE_ENTREGA.includes(d.tipoLimpo) &&
          d.finalizada &&
          d.quando >= abertura - DIA &&
          d.quando <= abertura + 120 * DIA,
      )
      .sort((a, b) =>
        Number.isNaN(alvo)
          ? a.quando - b.quando
          : Math.abs(a.quando - alvo) - Math.abs(b.quando - alvo),
      )[0];
    if (entrega) {
      r.entrega = entrega.om.trim();
      r.deOnde.entrega = "roteiros";
    }
  }

  return r;
}

/* ── O nome do documento ───────────────────────────────────── */

/**
 * "BM-0001 - AGOSTO/2026": o número da casa com o mês de referência, como o
 * antigo dizia "Nº 01 - AGOSTO / 2026". É o DOCUMENTO Nº do papel.
 */
export function documentoDoBoletim(b: { numero: string; referencia: string | null }): string {
  return b.referencia?.trim() ? `${b.numero} - ${b.referencia.trim()}` : b.numero;
}

/**
 * O nome do arquivo do PDF, no jeito do antigo ("01_BM MANUTENÇÃO VCG - NOVA
 * IGUAÇU - BAIXADA 2 - BLOCO 4 - AGOSTO"). O navegador sugere o título da
 * página ao salvar como PDF, e barra vira hífen porque barra não entra em nome
 * de arquivo.
 */
export function arquivoDoBoletim(b: {
  numero: string;
  referencia: string | null;
  base: string | null;
  cliente: string;
}): string {
  const partes = [b.numero, "BM MANUTENÇÃO", b.base?.trim() || b.cliente, b.referencia?.trim()];
  return partes
    .filter(Boolean)
    .join(" - ")
    .replace(/[/\\:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");
}
