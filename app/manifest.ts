import type { MetadataRoute } from "next";

// O app instalado na tela inicial, como o Estoque e o Roteiros.
export default function manifest(): MetadataRoute.Manifest {
  return {
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
    ],
  };
}
