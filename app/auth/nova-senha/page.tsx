"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BotaoTema } from "@/components/tema";
import { Logo } from "@/components/logo";

type Estado = "conferindo" | "pronto" | "link_invalido";

export default function NovaSenha() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("conferindo");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // O link do e-mail chega de duas formas, conforme o fluxo do projeto:
  // `?code=` (PKCE, o padrao do @supabase/ssr) ou `#access_token=` (implicito).
  // O cliente do navegador resolve o segundo sozinho; o primeiro e trocado aqui.
  useEffect(() => {
    const supabase = createClient();

    async function conferir() {
      const codigo = new URLSearchParams(location.search).get("code");
      if (codigo) {
        const { error } = await supabase.auth.exchangeCodeForSession(codigo);
        if (error) return setEstado("link_invalido");
        return setEstado("pronto");
      }

      const { data } = await supabase.auth.getSession();
      setEstado(data.session ? "pronto" : "link_invalido");
    }

    conferir();
  }, []);

  async function salvar(form: FormData) {
    const senha = String(form.get("senha") ?? "");
    const repetida = String(form.get("repetida") ?? "");

    if (senha.length < 8) return setErro("A senha precisa de pelo menos 8 caracteres.");
    if (senha !== repetida) return setErro("As duas senhas não são iguais.");

    setErro(null);
    setSalvando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) return setErro("Não foi possível salvar. Peça um link novo.");
    router.replace("/");
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Logo altura={40} />
            <h1 className="mt-3 text-lg font-semibold tracking-tight">Nova senha</h1>
          </div>
          <BotaoTema />
        </div>

        {estado === "conferindo" && (
          <div className="rounded-lg border border-borda bg-superficie p-6 text-sm text-texto-2 shadow-cartao">
            Conferindo o link…
          </div>
        )}

        {estado === "link_invalido" && (
          <div className="rounded-lg border border-borda bg-superficie p-6 shadow-cartao">
            <p className="text-sm">
              Este link não vale mais. Eles expiram em uma hora e só podem ser
              usados uma vez.
            </p>
            <Link
              href="/login/esqueci"
              className="mt-5 inline-block text-sm font-semibold text-acento hover:underline"
            >
              Pedir um link novo
            </Link>
          </div>
        )}

        {estado === "pronto" && (
          <form
            action={salvar}
            className="rounded-lg border border-borda bg-superficie p-6 shadow-cartao"
          >
            <label className="block text-xs font-medium" htmlFor="senha">
              Nova senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              autoFocus
              className="mt-1 mb-4 h-9 w-full rounded-md border border-borda bg-fundo px-2.5 text-sm outline-none focus:border-acento"
            />

            <label className="block text-xs font-medium" htmlFor="repetida">
              Repita a senha
            </label>
            <input
              id="repetida"
              name="repetida"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 mb-5 h-9 w-full rounded-md border border-borda bg-fundo px-2.5 text-sm outline-none focus:border-acento"
            />

            {erro && (
              <p role="alert" className="mb-4 text-sm text-manutencao">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="h-9 w-full rounded-md bg-acento text-sm font-semibold text-acento-texto transition-opacity disabled:opacity-50"
            >
              {salvando ? "Salvando…" : "Salvar e entrar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
