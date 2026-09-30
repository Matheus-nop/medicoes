"use client";

import { useState, type ReactNode } from "react";
import { BarraLateral } from "./navegacao";

// A casca existe porque o botao do menu mora na barra do topo e a gaveta
// mora embaixo dela: os dois precisam do mesmo estado. O conteudo do topo
// vem por prop, entao continua sendo renderizado no servidor.
export function Casca({
  marca,
  direita,
  pendencias,
  gestor,
  children,
}: {
  marca: ReactNode;
  direita: ReactNode;
  pendencias: Record<string, number>;
  gestor?: boolean;
  children: ReactNode;
}) {
  const [aberta, setAberta] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="barra-marca sticky top-0 z-30 bg-marca text-marca-texto shadow-cartao">
        <div className="flex h-[60px] items-center gap-3 px-4 sm:px-5">
          <button
            type="button"
            onClick={() => setAberta(true)}
            aria-label="Abrir menu"
            className="grid size-9 place-items-center rounded-lg bg-white/10 transition-colors hover:bg-white/20 lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="size-5"
              aria-hidden
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {marca}
          <div className="ml-auto flex items-center gap-3">{direita}</div>
        </div>
      </header>

      <div className="flex flex-1">
        <BarraLateral
          pendencias={pendencias}
          aberta={aberta}
          aoFechar={() => setAberta(false)}
          gestor={gestor}
        />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
