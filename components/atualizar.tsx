"use client";

// Botão de atualizar.
//
// POR QUE ELE PRECISA EXISTIR AQUI DENTRO
//
// Instalado como aplicativo, o estoque abre sem a barra do navegador: não há
// endereço, não há F5, não há o círculo de recarregar. E é um app de galpão —
// duas pessoas mexendo no mesmo saldo ao mesmo tempo —, então "será que esta
// tela ainda é verdade?" é uma pergunta que se faz o dia inteiro. Sem botão, a
// única saída era fechar e abrir o aplicativo.
//
// `router.refresh()` e não `location.reload()`: ele rebusca os dados do
// servidor e mantém a página onde está — a rolagem, o que está marcado, o
// diálogo aberto. Recarregar a página inteira jogaria fora a seleção de doze
// peças que alguém acabou de fazer.

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function BotaoAtualizar() {
  const router = useRouter();
  const [atualizando, iniciar] = useTransition();

  return (
    <button
      type="button"
      onClick={() => iniciar(() => router.refresh())}
      disabled={atualizando}
      title="Atualizar os dados desta tela"
      aria-label="Atualizar os dados desta tela"
      // Mesma pílula do botão de atualizar do roteiros: ícone sozinho no
      // celular, ícone + palavra quando há largura.
      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-semibold text-marca-texto ring-1 ring-white/15 transition-colors hover:bg-white/20 disabled:opacity-70"
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={atualizando ? "animate-spin" : undefined}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      <span className="hidden xl:inline">Atualizar</span>
    </button>
  );
}
