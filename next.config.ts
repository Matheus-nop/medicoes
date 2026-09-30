import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // O navegador guarda a tela por vinte segundos: ir ao boletim e voltar ao
    // painel é instantâneo. Toda ação chama `revalidatePath`, então o que VOCÊ
    // faz aparece na hora; o que outra pessoa fez pode levar até vinte segundos.
    // É a mesma escolha do Estoque — ver o comentário longo em next.config.ts de lá.
    staleTimes: { dynamic: 20 },
  },
};

export default nextConfig;
