// A colagem do Sisloc, lida pelo cabeçalho.
//
// Veio do Gestão de Estoque (`lib/estoque/sisloc.ts`), só com o que o boletim
// usa: o mapa das colunas pelo nome, a data, o dinheiro e a etapa da OM. Lá a
// mesma leitura serve ao acompanhamento da oficina; se o Sisloc mudar o nome de
// uma coluna, mude nos dois.

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export const normalizar = (s: string) =>
  semAcento(s.toUpperCase())
    .replace(/[^A-Z0-9 ,."/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Os estados em que a tela agrupa as etapas da OM. */
export type EtapaOficina =
  | "aguardando"
  | "em_execucao"
  /** A oficina terminou. Agora e o PCM que tem que gerar o retorno. */
  | "concluido"
  | "entregue"
  | "fechada"
  | "desconhecida";

export const ROTULO_ETAPA_OFICINA: Record<EtapaOficina, string> = {
  aguardando: "Aguardando",
  em_execucao: "Em execução",
  concluido: "Aguardando o PCM",
  entregue: "Entregue",
  fechada: "Fechada",
  desconhecida: "Sem etapa",
};

/**
 * A oficina ja largou a maquina?
 *
 * Vale para as tres ultimas: concluida, entregue e fechada. E a divisao que
 * conta produtividade — depois da 6 o servico saiu da bancada, mesmo que o
 * ciclo ainda nao tenha acabado.
 */
export const OFICINA_TERMINOU: EtapaOficina[] = ["concluido", "entregue", "fechada"];

// Reconhecimento pela PALAVRA primeiro, pelo numero depois. O Sisloc numera as
// etapas de 1 a 7, mas numeracao se renumera e palavra nao: "concluiu" vai
// continuar querendo dizer concluiu no dia em que a 6 virar 8.
const PALAVRAS_DA_ETAPA: [EtapaOficina, string[]][] = [
  ["entregue", ["ENTREGUE", "RETIRAD"]],
  ["fechada", ["FECHADA", "ENCERRAD"]],
  ["concluido", ["CONCLUI", "FINALIZAD"]],
  ["em_execucao", ["EXECUTANDO", "EXECUCAO", "LEVANTAMENTO", "ANDAMENTO", "REPARO"]],
  ["aguardando", ["AGUARDA", "EM PECAS", "ORCAMENT", "PROPOSTA", "APROVA", "AUTORIZA"]],
];

// As sete etapas da oficina no Sisloc, na ordem do fluxo:
//
//   1 aguarda liberacao · 2 fazendo levantamento · 3 equipamento em pecas
//   4 aguarda autorizacao · 5 executando · 6 concluiu servico · 7 entregue
//
// Tres delas sao espera (1, 3 e 4): a maquina esta na oficina e ninguem esta
// com ela na mao. Distinguir isso de "em execucao" e o que mostra se a fila
// esta travada por falta de braco ou por falta de peca e de autorizacao.
const ETAPA_POR_NUMERO: Record<string, EtapaOficina> = {
  "1": "aguardando",
  "2": "em_execucao",
  "3": "aguardando",
  "4": "aguardando",
  "5": "em_execucao",
  "6": "concluido",
  "7": "entregue",
  F: "fechada",
};

/** Em que pe esta a OM, a partir do texto da coluna de status da oficina. */
export function reconhecerEtapa(texto: string): EtapaOficina {
  const alvo = normalizar(texto);
  if (!alvo) return "desconhecida";

  for (const [etapa, palavras] of PALAVRAS_DA_ETAPA) {
    if (palavras.some((p) => alvo.includes(p))) return etapa;
  }
  const marca = alvo.match(/^([0-9F])\s*-/)?.[1];
  return (marca && ETAPA_POR_NUMERO[marca]) || "desconhecida";
}

/* ── O cabecalho ───────────────────────────────────────────── */

/**
 * O nome da coluna, reduzido ao que nao muda: sem acento, sem pontuacao, sem
 * caixa. "Dt. abertura" e "DT. ABERTURA" viram a mesma coisa, e "Patr./Num.
 * serie" vira "PATR NUM SERIE".
 */
const rotulo = (s: string) =>
  semAcento(s.toUpperCase())
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

/**
 * De que coluna sai cada campo.
 *
 * Os nomes vem da tela de manutencao do Sisloc (a colagem de referencia esta
 * em `exemplos/sisloc-manutencao.tsv`). Onde ha mais de um nome, e porque a
 * mesma informacao aparece com rotulo diferente conforme a tela de origem — o
 * primeiro que casar vale.
 */
const COLUNAS: Record<string, string[]> = {
  etapa: ["O", "STATUS OFICINA"],
  // A coluna "C" e a escada COMERCIAL, irma da "O" na mesma linha: 1 aguarda
  // levantamento · 2 elaborando proposta · 3 proposta enviada · 4 aprovada ·
  // 5 recusada. E dela que sai o passo do ORCAMENTO — a "O" fala do conserto.
  comercial: ["C", "STATUS COMERCIAL"],
  abertura: ["DT ABERTURA", "DATA DE ABERTURA"],
  om: ["NUMERO", "N OM", "OM"],
  cliente: ["CLIENTE"],
  localEntrega: ["NOME LOCAL DE ENTREGA", "LOCAL DE ENTREGA"],
  /** A cidade da OM. É o que responde "de onde veio" quando o canteiro não
   *  foi preenchido e o Sisloc repetiu o nome do cliente no lugar dele. */
  cidade: ["CIDADE"],
  equipamento: ["EQUIPAMENTO"],
  patrimonio: ["PATR NUM SERIE", "PATRIMONIO", "PATR"],
  oficina: ["RES EXECUCAO", "RESP EXECUCAO"],
  tipoOm: ["TIPO DE O M", "TIPO DE OM", "TIPO O M"],
  situacao: ["SITUACAO DE EXECUCAO", "SITUACAO"],
  // "Status patrimonio" — de quem e a maquina. LOCADO quando esta com cliente;
  // INSPECAO, vazio ou qualquer outra coisa quando esta com a gente. E o que
  // separa a corretiva de retorno do conserto do parque proprio.
  statusPatrimonio: ["STATUS PATRIMONIO", "STATUS DO PATRIMONIO"],
  // As duas vem PREENCHIDAS PELO SISLOC a partir do patrimonio dele. Vazias
  // quer dizer que a maquina nao esta no cadastro — o sinal mais confiavel de
  // que ela e de cliente, mais do que o sufixo "(CLIENTE)" digitado a mao.
  marcaPatrimonio: ["MARCA PATRIMONIO", "MARCA DO PATRIMONIO"],
  modeloPatrimonio: ["MODELO PATRIMONIO", "MODELO DO PATRIMONIO"],
  conclusao: ["DT DE CONCLUSAO", "DATA DE CONCLUSAO"],
  // "Dt. entrega", e nao "Dt. previsao entrega" nem "PREVISAO DE ENTREGA":
  // as tres existem na mesma tela, e so esta diz quando a maquina saiu.
  entrega: ["DT ENTREGA", "DATA DE ENTREGA"],
  atendente: ["ATENDENTE"],
  previsto: ["TOTAL PREVISTO"],
  gasto: ["TOTAL GASTO R", "TOTAL GASTO"],
  orcamento: ["VL ORCAMENTO", "VALOR ORCAMENTO"],
  // Onde mora a identificacao real da maquina de cliente: "Marca patrimonio" e
  // "Modelo patrimonio" vem VAZIAS para ela (nao esta no cadastro de
  // patrimonio do Sisloc), e o que se sabe do equipamento — "TOYAMA TCC450",
  // "4\" BOSCH GWS 9", "CSM RENTAL CS70" — foi digitado aqui.
  complemento: ["COMPLEMENTO"],
  previsaoEntrega: ["DT PREVISAO ENTREGA", "PREVISAO DE ENTREGA"],
  // As duas que o boletim de medicao le: quando a OM fechou no Sisloc, e
  // quando o faturamento dela foi autorizado.
  fechamento: ["DT FECHAMENTO", "DATA DE FECHAMENTO"],
  autorizacaoFaturamento: ["DT AUTORIZACAO FATUR", "DT AUTORIZACAO FATURAMENTO"],
  omRetirada: ["OM RETIRADA"],
  // Quando a maquina chegou do cliente. Vem vazia na maioria das telas; quando
  // vem, e a data que o boletim de medicao poe ao lado do recibo de retirada.
  chegada: ["DATA DE CHEGADA"],
};

export type Mapa = Partial<Record<keyof typeof COLUNAS, number>>;

/**
 * A linha e o cabecalho da tabela?
 *
 * Devolve o mapa de coluna → posicao, ou null. Exige tres colunas conhecidas:
 * uma so daria falso positivo em linha de dados que por acaso tivesse a
 * palavra "cliente", e o preco de errar aqui e ler a tabela inteira torta.
 */
export function lerCabecalho(linha: string): Mapa | null {
  const celulas = linha.split("\t").map(rotulo);
  if (celulas.length < 3) return null;

  const mapa: Mapa = {};
  for (const [campo, nomes] of Object.entries(COLUNAS)) {
    const i = celulas.findIndex((c) => c && nomes.includes(c));
    if (i >= 0) mapa[campo as keyof typeof COLUNAS] = i;
  }
  return Object.keys(mapa).length >= 3 ? mapa : null;
}

/**
 * Data e hora do Sisloc: "21/08/2026 08:34:22", ou so "21/08/2026".
 *
 * Devolve ISO com o fuso escrito (-03:00), e nao um horario solto. Solto, quem
 * le decide o fuso — o navegador usa o da maquina e o Postgres usa o da
 * sessao, e as duas leituras da MESMA colagem passariam a discordar em tres
 * horas. O Brasil nao tem mais horario de verao desde 2019, entao -03:00 vale
 * o ano inteiro.
 *
 * Sem hora, assume meio-dia: a data fica no dia certo em qualquer fuso, o que
 * meia-noite nao garante.
 */
export function lerMomento(texto: string): string {
  const t = (texto ?? "").trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return "";

  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 2000 || ano > 2100) return "";

  const temHora = m[4] !== undefined;
  const h = temHora ? Number(m[4]) : 12;
  const min = temHora ? Number(m[5]) : 0;
  const seg = temHora ? Number(m[6] ?? 0) : 0;
  if (h > 23 || min > 59 || seg > 59) return "";

  // 31/02 nao existe: o calendario reescreveria para 03/03 em silencio.
  const conferindo = new Date(Date.UTC(ano, mes - 1, dia));
  if (conferindo.getUTCDate() !== dia || conferindo.getUTCMonth() !== mes - 1) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ano}-${pad(mes)}-${pad(dia)}T${pad(h)}:${pad(min)}:${pad(seg)}-03:00`;
}

/**
 * Dinheiro do Sisloc: "1.097,20" vira 1097.2, "0,00" vira 0.
 *
 * Ponto e milhar e virgula e decimal — o contrario do que `Number()` espera, e
 * ler errado aqui nao da erro nenhum: da um numero mil vezes maior, calado.
 *
 * Devolve null para celula vazia, e ZERO para "0,00". A diferenca importa: o
 * alerta de custo procura gasto MAIOR que zero, e nao "gasto preenchido".
 */
export function lerDinheiro(texto: string): number | null {
  const t = (texto ?? "").trim();
  if (!t) return null;
  const limpo = t.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo || !/^-?\d+(\.\d+)?$/.test(limpo)) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

