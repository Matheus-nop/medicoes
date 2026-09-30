import type { MetadataRoute } from "next";

// O app instalado na tela inicial, como o Estoque e o Roteiros — com ícone
// próprio (a prancheta do boletim com as barras de medição), para não se
// confundir com o cubo do Estoque na tela do celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Medições e Contratos · Grupo Nova Opção",
    short_name: "Medições",
    description: "Boletins de medição, contratos e faturamento.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eef1f6",
    theme_color: "#16365c",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    // Segurar o ícone abre direto as telas de todo dia.
    shortcuts: [
      {
        name: "Painel executivo",
        short_name: "Painel",
        url: "/controle",
        icons: [{ src: "/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Lançar medições",
        short_name: "Lançar",
        url: "/controle/lancar",
        icons: [{ src: "/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Medições de manutenção",
        short_name: "Manutenção",
        url: "/",
        icons: [{ src: "/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Arquivo por cliente",
        short_name: "Arquivo",
        url: "/clientes",
        icons: [{ src: "/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
