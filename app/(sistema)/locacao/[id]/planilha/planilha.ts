import ExcelJS from "exceljs";
import { linhasDaLocacao, linhasDaManutencao, periodoDaPlanilha, type LinhaDaPlanilha } from "@/lib/medicoes/locacao";
import type { CargaDaMedicao } from "../../dados";
import { mesPorExtenso } from "../../formato";

const ultimoDia = (mes: string) => {
  const d = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0));
  return d.toISOString().slice(0, 10);
};

/** As colunas da AEGEA, na ordem dela — e, depois do CHECK, as que a casa sugere. */
const COLUNAS: { titulo: string; chave: keyof LinhaDaPlanilha | null; largura: number; dinheiro?: boolean; sugerida?: boolean }[] = [
  { titulo: "SERVIÇO", chave: "servico", largura: 36 },
  { titulo: "PATRIMÔNIOS", chave: "patrimonio", largura: 14 },
  { titulo: "DATA DE EXECUÇÃO", chave: "execucao", largura: 24 },
  { titulo: "UND. DE MEDIDA", chave: "unidade", largura: 9 },
  { titulo: "TEMPO", chave: "tempo", largura: 8 },
  { titulo: "QTDE", chave: "qtde", largura: 7 },
  { titulo: "Valor da Unidade ", chave: "valor_unidade", largura: 13, dinheiro: true },
  { titulo: "VALOR TOTAL DA OS", chave: "valor_total", largura: 14, dinheiro: true },
  { titulo: "OS APROVADA?", chave: "aprovada", largura: 10 },
  { titulo: "PROJETO", chave: "projeto", largura: 14 },
  { titulo: "CIDADE", chave: "cidade", largura: 18 },
  { titulo: "SUPERINTENDÊNCIA", chave: "superintendencia", largura: 18 },
  { titulo: "BLOCO", chave: "bloco", largura: 10 },
  { titulo: "CHECK SERVIÇO", chave: null, largura: 12 },
  { titulo: "POSIÇÃO", chave: "posicao", largura: 9, sugerida: true },
  { titulo: "TROCA", chave: "troca", largura: 34, sugerida: true },
  { titulo: "COORDENADOR", chave: "coordenador", largura: 20, sugerida: true },
  { titulo: "BASE (SISLOC)", chave: "base", largura: 34, sugerida: true },
  { titulo: "REMESSA", chave: "remessa", largura: 11, sugerida: true },
];

const MARINHO = "FF16365C";
const CINZA = "FFF2F4F8";
const AMBAR = "FFFBF1DC";

/**
 * A planilha padrão da AEGEA — a aba "EVIDÊNCIAS - OS & Equip." —, de todas
 * as bases e todos os contratos do mês: a locação posição a posição e, no fim,
 * as linhas de MANUTENÇÃO dos boletins do mês. As colunas da AEGEA vêm como
 * ela pede; as sugeridas (posição, troca, coordenador, base, remessa) vêm
 * depois, em outra cor, para tirar se o cliente não quiser.
 */
export async function montarPlanilha(
  carga: Extract<CargaDaMedicao, { ok: true }>,
  responsavel: string,
): Promise<{ buffer: ArrayBuffer; nome: string }> {
  const { medicao: m, boletins, itens, manutencao } = carga;
  const ordenados = [...boletins].sort(
    (a, b) =>
      (a.base?.bloco ?? "").localeCompare(b.base?.bloco ?? "") ||
      (a.base?.projeto ?? "").localeCompare(b.base?.projeto ?? "") ||
      (a.base?.municipio ?? "").localeCompare(b.base?.municipio ?? "") ||
      a.base_nome.localeCompare(b.base_nome),
  );
  const linhas: LinhaDaPlanilha[] = [];
  for (const b of ordenados) {
    const seus = itens.filter((i) => i.boletim_id === b.id);
    linhas.push(
      ...linhasDaLocacao(
        {
          nome: b.base_nome,
          projeto: b.base?.projeto ?? null,
          municipio: b.base?.municipio ?? null,
          superintendencia: b.base?.superintendencia ?? null,
          bloco: b.base?.bloco ?? null,
          coordenador: b.base?.coordenador ?? null,
        },
        seus,
        // A posição recomeça em cada base: "a posição 7 da Jardim América".
        1,
      ),
    );
  }
  const fim = ultimoDia(m.mes);
  linhas.push(
    ...linhasDaManutencao(
      manutencao.map((x) => ({
        valor: x.valor,
        base: x.base
          ? {
              nome: x.base.nome,
              projeto: x.base.projeto ?? null,
              municipio: x.base.municipio ?? null,
              superintendencia: x.base.superintendencia ?? null,
              bloco: x.base.bloco ?? null,
              coordenador: x.base.coordenador ?? null,
            }
          : null,
      })),
      m.mes,
      fim,
    ),
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "Nova Opção · Medições e Contratos";
  const ws = wb.addWorksheet("EVIDÊNCIAS - OS & Equip.", { views: [{ state: "frozen", ySplit: 13 }] });
  COLUNAS.forEach((c, i) => (ws.getColumn(i + 1).width = c.largura));

  const rotulo = (celula: string, texto: string) => {
    const c = ws.getCell(celula);
    c.value = texto;
    c.font = { bold: true, size: 9, color: { argb: "FF4A5368" } };
  };
  const valor = (celula: string, texto: string | Date) => {
    const c = ws.getCell(celula);
    c.value = texto;
    c.font = { bold: true, size: 10 };
  };
  ws.mergeCells("A2:N2");
  const titulo = ws.getCell("A2");
  titulo.value = "RELATÓRIO DE EVIDÊNCIAS — LOCAÇÃO DE EQUIPAMENTOS";
  titulo.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MARINHO } };
  titulo.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 26;

  rotulo("A5", "CONTRATANTE:");
  valor("C5", m.contratante ?? "ÁGUAS DO RIO 1 E 4 SPE S.A");
  rotulo("H5", "CONTRATADA:");
  valor("I5", "NOVA OPÇÃO 2008 MÁQUINAS E SERVIÇOS LTDA");
  rotulo("A6", "OBRA/ SERVIÇO:");
  valor("C6", m.obra ?? "LOCAÇÃO DE EQUIPAMENTOS LEVES");
  rotulo("A7", "Nº CONTRATO JURÍDICO ");
  valor("C7", m.contrato_juridico ?? "");
  rotulo("H7", "Nº CONTRATO SISTÊMICO ");
  valor("I7", m.contrato_sistemico ?? "");
  rotulo("A8", "SUPERINTENDÊNCIA ");
  valor("C8", m.superintendencia ?? "");
  rotulo("I8", "PERÍODO DE EXECUÇÃO:");
  valor("J8", periodoDaPlanilha(m.mes, fim));
  rotulo("A9", "OBSERVAÇÃO:");
  valor("C9", m.observacao ?? "");
  rotulo("A10", "Responsável pelo preenchimento do Relatório:");
  valor("D10", responsavel.toUpperCase());
  rotulo("J10", "Data:");
  const hoje = new Date();
  valor("K10", new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())));
  ws.getCell("K10").numFmt = "dd/mm/yyyy";

  const reg = ws.getCell("A12");
  reg.value = "Registro das Entregas Realizadas ";
  reg.font = { bold: true, size: 11, color: { argb: MARINHO } };

  const cab = ws.getRow(13);
  COLUNAS.forEach((c, i) => {
    const x = cab.getCell(i + 1);
    x.value = c.titulo;
    x.font = { bold: true, size: 9, color: { argb: c.sugerida ? "FF5B4210" : "FFFFFFFF" } };
    x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.sugerida ? AMBAR : MARINHO } };
    x.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    x.border = { bottom: { style: "thin", color: { argb: "FFCBD3E0" } } };
  });
  cab.height = 30;

  linhas.forEach((l, n) => {
    const row = ws.getRow(14 + n);
    COLUNAS.forEach((c, i) => {
      const x = row.getCell(i + 1);
      x.value = c.chave ? (l[c.chave] as string | number) : null;
      x.font = { size: 9, ...(l.servico === "MANUTENÇÃO" ? { bold: true } : {}) };
      if (c.dinheiro) x.numFmt = '#,##0.00';
      if (c.sugerida) x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBF2" } };
      else if (n % 2) x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CINZA } };
    });
  });
  const total = ws.getRow(14 + linhas.length);
  total.getCell(7).value = "TOTAL";
  total.getCell(7).font = { bold: true, size: 10 };
  total.getCell(8).value = {
    formula: `SUM(H14:H${13 + linhas.length})`,
    result: Math.round(linhas.reduce((t, l) => t + l.valor_total, 0) * 100) / 100,
  };
  total.getCell(8).numFmt = '#,##0.00';
  total.getCell(8).font = { bold: true, size: 10 };
  ws.autoFilter = { from: { row: 13, column: 1 }, to: { row: 13 + linhas.length, column: COLUNAS.length } };

  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const nome = `Medição ${mesPorExtenso(m.mes)} Nova Opção - Locação ${m.cliente}`.replace(/[\\/:*?"<>|]/g, "-");
  return { buffer, nome };
}
