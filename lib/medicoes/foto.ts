// A foto do relatório de manutenção, do jeito que aguenta o 4G.
//
// A câmera de um celular entrega 4000×3000 e 6 MB. A foto é reduzida ANTES de
// sair do aparelho: 1280px no lado maior, JPEG 72% — 120 a 250 KB, e o papel
// do cliente continua mostrando a peça. É a mesma conta da ronda do 5S do
// Estoque (`lib/estoque/foto.ts`), copiada: os apps não se importam um do
// outro.
//
// `medidaReduzida` fica sem `window` por dentro de propósito: é a única parte
// com conta, e conta se prova com `npm test`.

/** O lado maior da foto depois de reduzida. */
export const LADO_MAIOR = 1280;

/** Qualidade do JPEG. 0.72 é onde a mancha continua nítida e o peso cai 90%. */
export const QUALIDADE = 0.72;

/**
 * A medida que a foto deve ter, mantendo a proporção.
 *
 * Foto já pequena não é ampliada: subir 640px para 1280px inventa pixel e
 * triplica o peso sem mostrar nada a mais.
 */
export function medidaReduzida(
  largura: number,
  altura: number,
  ladoMaior: number = LADO_MAIOR,
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMaior || maior === 0) {
    return { largura: Math.round(largura), altura: Math.round(altura) };
  }
  const fator = ladoMaior / maior;
  return {
    // `max(1, ...)` porque uma foto de 4000×1 reduzida daria altura 0, e canvas
    // com lado 0 não desenha nada — a foto sumiria sem erro nenhum.
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
  };
}

/** O nome do arquivo no bucket. Aleatório: não revela OM nem pessoa. */
export function nomeDeArquivo(): string {
  return `${crypto.randomUUID()}.jpg`;
}

/**
 * Reduz a foto no aparelho e devolve o JPEG.
 *
 * Devolve o arquivo original quando o navegador não tem o que é preciso —
 * melhor subir 6 MB devagar do que perder a foto. Só roda no navegador.
 */
export async function reduzirFoto(arquivo: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const { largura, altura } = medidaReduzida(bitmap.width, bitmap.height);

    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const pincel = tela.getContext("2d");
    if (!pincel) return arquivo;
    pincel.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();

    const reduzida = await new Promise<Blob | null>((resolva) =>
      tela.toBlob(resolva, "image/jpeg", QUALIDADE),
    );
    // Se por algum motivo a redução ficou MAIOR (PNG pequeno virando JPEG,
    // acontece), fica o original.
    if (!reduzida || reduzida.size >= arquivo.size) return arquivo;
    return reduzida;
  } catch {
    return arquivo;
  }
}
