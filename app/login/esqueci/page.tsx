"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BotaoTema } from "@/components/tema";
import { Logo } from "@/components/logo";

export default function Esqueci() {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function pedir(form: FormData) {
    setErro(null);
    setEnviando(true);
    const email = String(form.get("email") ?? "").trim();

    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/nova-senha`,
    });

    setEnviando(false);
    // Fora do limite de envio o Supabase responde erro; qualquer outra falha
    // vira a mesma tela de sucesso, para nao dizer quem tem conta e quem nao tem.
    if (error?.status === 429) {
      setErro("Muitos pedidos seguidos. Espere alguns minutos e tente de novo.");
      return;
    }
    setEnviado(true);
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Logo altura={40} />
            <h1 className="mt-3 text-lg font-semibold tracking-tight">
              Recuperar acesso
            </h1>
          </div>
          <BotaoTema />
        </div>

        {enviado ? (
          <div className="rounded-lg border border-borda bg-superficie p-6 shadow-cartao">
            <p className="text-sm">
              Se existir conta com esse e-mail, o link para criar uma senha nova
              já foi enviado. Ele vale por uma hora.
            </p>
            <p className="mt-3 text-xs text-texto-2">
              Não chegou em alguns minutos? Veja o spam. Se ainda assim não vier,
              peça à diretoria para definir sua senha na tela de Usuários — é
              imediato e não depende de e-mail.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block text-sm font-semibold text-acento hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form
            action={pedir}
            className="rounded-lg border border-borda bg-superficie p-6 shadow-cartao"
          >
            <p className="mb-4 text-sm text-texto-2">
              Digite o e-mail da sua conta. Você recebe um link para criar uma
              senha nova.
            </p>

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
              {enviando ? "Enviando…" : "Enviar link"}
            </button>

            <Link
              href="/login"
              className="mt-4 block text-center text-xs font-medium text-texto-2 hover:text-texto"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
