import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // O navegador guarda a tela por vinte segundos: ir ao boletim e voltar ao
    // painel é instantâneo. Toda ação chama `revalidatePath`, então o que VOCÊ
    // faz aparece na hora; o que outra pessoa fez pode levar até vinte segundos.
    // É a mesma escolha do Estoque — ver o comentário longo em next.config.ts de lá.
    staleTimes: { dynamic: 20 },
    // O PDF do Sisloc vai à ação que lê, um por vez: o de uma base grande
    // (quatro páginas, cem linhas) passa de 1 MB quando é imagem impressa.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
