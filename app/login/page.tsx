"use client";

import Link from "next/link";
import { useActionState } from "react";
import { entrar } from "./actions";
import { BotaoTema } from "@/components/tema";
import { Logo } from "@/components/logo";

export default function Login() {
  const [erro, acao, enviando] = useActionState(entrar, null);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Logo altura={40} />
            <h1 className="mt-3 text-lg font-semibold tracking-tight">
              Medições e Contratos
            </h1>
          </div>
          <BotaoTema />
        </div>

        <form
          action={acao}
          className="rounded-lg border border-borda bg-superficie p-6 shadow-cartao"
        >
          <label className="block text-xs font-medium" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            className="mt-1 mb-4 h-9 w-full rounded-md border border-borda bg-fundo px-2.5 text-sm outline-none focus:border-acento"
          />

          <div className="flex items-baseline justify-between">
            <label className="block text-xs font-medium" htmlFor="senha">
              Senha
            </label>
            <Link
              href="/login/esqueci"
              className="text-xs font-medium text-acento hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 mb-5 h-9 w-full rounded-md border border-borda bg-fundo px-2.5 text-sm outline-none focus:border-acento"
          />

          {erro && (
            <p role="alert" className="mb-4 text-sm text-manutencao">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="h-9 w-full rounded-md bg-acento text-sm font-semibold text-acento-texto transition-opacity disabled:opacity-50"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
