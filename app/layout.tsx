import type { Metadata, Viewport } from "next";
import { SCRIPT_TEMA } from "@/components/tema";
import { Instalar, SCRIPT_INSTALAR } from "@/components/instalar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medições e Contratos — Grupo Nova Opção",
  description: "Boletins de medição, contratos e faturamento",
  // Instalado no iPhone, o app só abre em tela cheia com estas duas.
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Medições" },
  applicationName: "Medições",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sem isto a barra do topo fica branca no Android instalado, e a marca
  // escura do sistema termina numa faixa clara.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16365c" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1a28" },
  ],
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_INSTALAR }} />
      </head>
      <body className="min-h-screen">
        {children}
        <Instalar />
      </body>
    </html>
  );
}
