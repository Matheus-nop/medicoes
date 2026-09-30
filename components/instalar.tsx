"use client";

import { useEffect, useState } from "react";

/**
 * O navegador dispara `beforeinstallprompt` cedo — muitas vezes antes de o
 * React hidratar e conseguir ouvir. Quem perde o evento nunca mais o recebe,
 * e o convite simplesmente nao aparece.
 *
 * Este script vai no <head>, roda antes de tudo e guarda o evento numa
 * variavel global. O componente le de la ao montar; se ainda nao tiver
 * chegado, ouve normalmente.
 */
export const SCRIPT_INSTALAR = `
(function(){
  window.__conviteInstalar = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__conviteInstalar = e;
    window.dispatchEvent(new Event('convite-instalar'));
  });
  window.addEventListener('appinstalled', function () {
    window.__conviteInstalar = null;
    window.dispatchEvent(new Event('convite-instalar'));
  });
})();
`;

declare global {
  interface Window {
    __conviteInstalar: Event | null;
  }
}

/**
 * Registra o service worker e oferece a instalação.
 *
 * O registro é o que torna o app instalável; o botão é só a conveniência de
 * não precisar caçar "adicionar à tela de início" no menu do navegador.
 *
 * O convite some sozinho depois de instalado, e quem dispensar não vê de novo
 * (fica guardado no próprio aparelho). Banner de instalação que volta toda
 * visita é o tipo de coisa que faz a pessoa desinstalar.
 */
export function Instalar() {
  const [convite, setConvite] = useState<Event | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sem service worker o app continua inteiro — só perde o cache dos
        // arquivos estáticos. Não vale poluir a tela com erro por isso.
      });
    }

    let dispensado = false;
    try {
      dispensado = localStorage.getItem("instalar-dispensado") === "1";
    } catch {
      // Navegador com armazenamento bloqueado: trata como não dispensado.
    }
    if (dispensado) return;

    // Pode ter chegado antes de o React montar — o script do <head> guardou.
    const ler = () => setConvite(window.__conviteInstalar ?? null);
    ler();
    window.addEventListener("convite-instalar", ler);
    return () => window.removeEventListener("convite-instalar", ler);
  }, []);

  if (!convite) return null;

  const dispensar = () => {
    try {
      localStorage.setItem("instalar-dispensado", "1");
    } catch {
      /* sem armazenamento: some só nesta sessão */
    }
    window.__conviteInstalar = null;
    setConvite(null);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-borda bg-superficie px-4 py-3 shadow-alta">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Instalar o Estoque</p>
        <p className="text-xs text-texto-3">
          Abre direto da tela de início, sem a barra do navegador.
        </p>
      </div>
      <button
        type="button"
        onClick={dispensar}
        className="shrink-0 rounded-lg px-2 py-1 text-xs text-texto-3 hover:text-texto"
      >
        agora não
      </button>
      <button
        type="button"
        onClick={async () => {
          const p = convite as Event & { prompt: () => Promise<void> };
          await p.prompt();
          window.__conviteInstalar = null;
          setConvite(null);
        }}
        className="shrink-0 rounded-lg bg-acento px-3 py-1.5 text-xs font-semibold text-acento-texto"
      >
        Instalar
      </button>
    </div>
  );
}
