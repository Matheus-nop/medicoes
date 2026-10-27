import ExcelJS from "exceljs";
import { linhasDaLocacao, linhasDaManutencao, periodoDaPlanilha, type LinhaDaPlanilha } from "@/lib/medicoes/locacao";
import { MOLDE_AEGEA_BASE64 } from "@/lib/medicoes/molde-aegea";
import type { CargaDaMedicao } from "../../dados";
import { mesPorExtenso } from "../../formato";

const ultimoDia = (mes: string) => {
  const d = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0));
  return d.toISOString().slice(0, 10);
};

/**
 * A planilha da AEGEA no modelo DELES: o arquivo deles como molde, com as
 * mesmas abas, células, cores e fórmula do TOTAL — de todas as bases e todos
 * os contratos do mês, uma linha por equipamento e, no fim, as linhas de
 * MANUTENÇÃO dos boletins do mês. Depois do CHECK SERVIÇO, as colunas da
 * casa: POSIÇÃO, TROCA, COORDENADOR, BASE (SISLOC) e REMESSA.
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
  await wb.xlsx.load(Buffer.from(MOLDE_AEGEA_BASE64, "base64") as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("EVIDÊNCIAS - OS & Equip.");
  if (!ws) throw new Error("O molde da AEGEA não tem a aba de evidências.");

  // O cabeçalho, nas células do modelo deles.
  ws.getCell("C5").value = m.contratante ?? "ÁGUAS DO RIO 1 E 4 SPE S.A";
  ws.getCell("I5").value = "NOVA OPÇÃO 2008 MÁQUINAS E SERVIÇOS LTDA";
  ws.getCell("C6").value = m.obra ?? "LOCAÇÃO DE EQUIPAMENTOS LEVES";
  ws.getCell("C7").value = m.contrato_juridico ?? "";
  ws.getCell("I7").value = m.contrato_sistemico ?? "";
  ws.getCell("C8").value = m.superintendencia ?? "";
  ws.getCell("J8").value = periodoDaPlanilha(m.mes, fim);
  ws.getCell("C9").value = m.observacao ?? "";
  ws.getCell("D10").value = responsavel.toUpperCase();
  const hoje = new Date();
  ws.getCell("K10").value = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));

  // As colunas da casa, depois do CHECK SERVIÇO: no mesmo feitio das deles,
  // para o cliente ler a troca sem perguntar. Quem não quiser apaga.
  const NOSSAS = [
    { titulo: "POSIÇÃO", largura: 9 },
    { titulo: "TROCA", largura: 36 },
    { titulo: "COORDENADOR", largura: 22 },
    { titulo: "BASE (SISLOC)", largura: 40 },
    { titulo: "REMESSA", largura: 12 },
  ];
  const tituloDeles = { ...ws.getRow(13).getCell(13).style };
  NOSSAS.forEach((c, i) => {
    const x = ws.getRow(13).getCell(15 + i);
    x.style = { ...tituloDeles };
    x.value = c.titulo;
    ws.getColumn(15 + i).width = c.largura;
  });

  // A linha 14 dá o formato de cada linha; a 15, o do TOTAL.
  const COLUNAS = 14;
  const estiloDaLinha = Array.from({ length: COLUNAS }, (_, c) => ({ ...ws.getRow(14).getCell(c + 1).style }));
  const estiloDoTotal = Array.from({ length: COLUNAS }, (_, c) => ({ ...ws.getRow(15).getCell(c + 1).style }));
  const alturaDoTotal = ws.getRow(15).height;
  for (let c = 1; c <= COLUNAS; c++) ws.getRow(15).getCell(c).value = null;

  linhas.forEach((l, n) => {
    const row = ws.getRow(14 + n);
    const valores: (string | number | null)[] = [
      l.servico,
      l.patrimonio,
      l.execucao,
      l.unidade,
      l.tempo,
      l.qtde,
      l.valor_unidade,
      l.valor_total,
      l.aprovada,
      l.projeto,
      l.cidade,
      l.superintendencia,
      l.bloco,
      null,
    ];
    valores.forEach((v, c) => {
      const x = row.getCell(c + 1);
      x.style = { ...estiloDaLinha[c] };
      x.value = v;
    });
    [l.posicao, l.troca, l.coordenador, l.base, l.remessa].forEach((v, i) => {
      const x = row.getCell(15 + i);
      x.style = { ...estiloDaLinha[12] };
      x.value = v || null;
    });
  });
  const ultima = 13 + linhas.length;
  const total = ws.getRow(ultima + 1);
  for (let c = 1; c <= COLUNAS; c++) {
    total.getCell(c).style = { ...estiloDoTotal[c - 1] };
    total.getCell(c).value = null;
  }
  total.height = alturaDoTotal;
  total.getCell(7).value = "TOTAL";
  total.getCell(8).value = {
    formula: `SUM(H14:H${ultima})`,
    result: Math.round(linhas.reduce((t, l) => t + l.valor_total, 0) * 100) / 100,
  };
  ws.autoFilter = `A13:${String.fromCharCode(64 + COLUNAS + NOSSAS.length)}${ultima}`;

  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const nome = `Medição ${mesPorExtenso(m.mes)} Nova Opção - Locação ${m.cliente}`.replace(/[\\/:*?"<>|]/g, "-");
  return { buffer, nome };
}
