// O texto de um PDF, linha a linha, como a folha mostra: os pedaços na mesma
// altura viram uma linha, da esquerda para a direita, separados por
// tabulação. É o que os leitores (`lerBoletimDeLocacao`) recebem.

import { getDocumentProxy } from "unpdf";

/** Até quantos pontos de diferença na altura ainda é a mesma linha. */
const MESMA_LINHA = 2.5;

export async function linhasDoPdf(dados: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(dados);
  const linhas: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const conteudo = await pagina.getTextContent();
    const pedacos: { s: string; x: number; y: number }[] = [];
    for (const it of conteudo.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      pedacos.push({ s: it.str, x: it.transform[4], y: it.transform[5] });
    }
    // De cima para baixo; na mesma altura, da esquerda para a direita.
    pedacos.sort((a, b) => b.y - a.y || a.x - b.x);
    const grupos: { y: number; ps: typeof pedacos }[] = [];
    for (const p of pedacos) {
      const g = grupos.find((x) => Math.abs(x.y - p.y) <= MESMA_LINHA);
      if (g) g.ps.push(p);
      else grupos.push({ y: p.y, ps: [p] });
    }
    for (const g of grupos.sort((a, b) => b.y - a.y)) {
      linhas.push(g.ps.sort((a, b) => a.x - b.x).map((p) => p.s.trim()).join("\t"));
    }
  }
  return linhas;
}
