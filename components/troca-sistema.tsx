"use client";

import { enderecoDeSistema } from "@/lib/endereco";

import { useState } from "react";


/**
 * Passar de um sistema do grupo para o outro sem procurar o endereço.
 *
 * A mesma caixinha existe nos três apps, com a mesma lista e na mesma ordem —
 * quem alterna o dia inteiro não pode ter que procurar em lugar diferente em
 * cada um.
 *
 * O endereço de cada sistema vem de variável: em produção é o domínio próprio;
 * em desenvolvimento não existe, e aí o item simplesmente não aparece, em vez
 * de mandar alguém para um endereço que não abre.
 *
 * Sobre a sessão, para não prometer o que não existe: estoque, roteiros e
 * medições dividem o mesmo login (o `auth.users` é um só) e, com o cookie gravado no
 * domínio pai, a mesma sessão — entre esses dois, trocar é um link. A **frota**
 * ainda mora num projeto Supabase próprio, então ir para ela pede login de
 * novo. Unificar é a mudança da frota para o projeto compartilhado, que é outro
 * trabalho.
 */
export function TrocaSistema({
  atual,
}: {
  atual: "estoque" | "roteiros" | "frota" | "medicoes";
}) {
  const [aberto, setAberto] = useState(false);

  const sistemas = [
    { id: "roteiros", nome: "Roteiros", desc: "Planejamento e rota dos técnicos", url: enderecoDeSistema(process.env.NEXT_PUBLIC_URL_ROTEIROS) },
    { id: "estoque", nome: "Estoque", desc: "Equipamentos, expedição e galpões", url: enderecoDeSistema(process.env.NEXT_PUBLIC_URL_ESTOQUE) },
    { id: "frota", nome: "Frota", desc: "Veículos, checklist e manutenção", url: enderecoDeSistema(process.env.NEXT_PUBLIC_URL_FROTA) },
    { id: "medicoes", nome: "Medições", desc: "Boletins, contratos e faturamento", url: enderecoDeSistema(process.env.NEXT_PUBLIC_URL_MEDICOES) },
  ].filter((s) => s.id === atual || s.url);

  if (sistemas.length < 2) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
      >
        Sistemas
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" className="size-3.5" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div role="menu"
               className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-borda bg-superficie text-texto shadow-cartao">
            {sistemas.map((s) => {
              const aqui = s.id === atual;
              const conteudo = (
                <>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {s.nome}
                    {aqui && <span className="text-[10px] font-medium text-texto-3">você está aqui</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-texto-2">{s.desc}</span>
                </>
              );
              return aqui ? (
                <div key={s.id} className="border-b border-borda bg-superficie-2 px-4 py-3 last:border-b-0">
                  {conteudo}
                </div>
              ) : (
                // `target="_blank"`: instalado como app, cada um destes PWAs tem
                // `scope: /`, e navegar para outra origem faz o Chrome abrir o
                // navegador embutido dele — a barra branca com o endereço e um X
                // por cima do sistema de destino. Saindo para fora do app, o
                // outro sistema abre inteiro. No computador o efeito é uma aba
                // nova, que para trocar de sistema é o que se espera.
                <a key={s.id} href={s.url} role="menuitem" target="_blank" rel="noopener noreferrer"
                   className="flex items-start gap-2 border-b border-borda px-4 py-3 transition-colors last:border-b-0 hover:bg-superficie-2">
                  <span className="min-w-0 flex-1">{conteudo}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                       strokeLinecap="round" strokeLinejoin="round"
                       className="mt-1 size-3.5 shrink-0 text-texto-3" aria-hidden>
                    <path d="M15 3h6v6" /><path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                  <span className="sr-only">(abre em outra aba)</span>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
