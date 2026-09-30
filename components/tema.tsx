"use client";

import { useSyncExternalStore } from "react";

type Tema = "claro" | "escuro" | "sistema";

// Roda antes da primeira pintura, no <head>, para a pagina nao piscar branco
// antes do tema escuro entrar. Nao pode importar nada: vira string inline.
export const SCRIPT_TEMA = `
(function(){try{
  var t=localStorage.getItem('tema');
  if(t==='claro'||t==='escuro')document.documentElement.dataset.tema=t;
}catch(e){}})();
`;

// O tema mora no <html>, nao no React: o script do <head> ja o aplicou antes
// da primeira pintura. useSyncExternalStore le esse estado externo sem efeito
// — no servidor devolve "sistema" e, ao hidratar, le o valor real.
const EVENTO = "tema:mudou";

function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  return () => window.removeEventListener(EVENTO, aoMudar);
}

function lerCliente(): Tema {
  const t = document.documentElement.dataset.tema;
  return t === "claro" || t === "escuro" ? t : "sistema";
}

const lerServidor = (): Tema => "sistema";

export function BotaoTema({ naBarra = false }: { naBarra?: boolean }) {
  const tema = useSyncExternalStore(assinar, lerCliente, lerServidor);

  function trocar() {
    // sistema -> escuro -> claro -> sistema
    const proximo: Tema =
      tema === "sistema" ? "escuro" : tema === "escuro" ? "claro" : "sistema";
    if (proximo === "sistema") {
      localStorage.removeItem("tema");
      delete document.documentElement.dataset.tema;
    } else {
      localStorage.setItem("tema", proximo);
      document.documentElement.dataset.tema = proximo;
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  const rotulo =
    tema === "sistema"
      ? "Tema do sistema"
      : tema === "escuro"
        ? "Tema escuro"
        : "Tema claro";

  return (
    <button
      type="button"
      onClick={trocar}
      title={rotulo}
      aria-label={`${rotulo}. Clique para alternar.`}
      className={
        naBarra
          ? "grid size-8 place-items-center rounded-md bg-white/10 text-marca-texto transition-colors hover:bg-white/20"
          : "grid size-8 place-items-center rounded-md border border-borda text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto"
      }
    >
      {tema === "sistema" ? <IconeSistema /> : tema === "escuro" ? <IconeLua /> : <IconeSol />}
    </button>
  );
}

const props = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IconeSol = () => (
  <svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const IconeLua = () => (
  <svg {...props}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8" />
  </svg>
);

const IconeSistema = () => (
  <svg {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
