"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao, CAMPO } from "@/components/ui";
import { omDigitada } from "@/lib/medicoes/relatorio";

/**
 * O leitor de OM: digitar ou bipar o número (o leitor de código de barras
 * digita e dá Enter) abre o relatório dela, já com o que o boletim e o
 * cadastro sabem.
 */
export function LeitorDeOm() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState(false);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const om = omDigitada(texto);
        if (!om) return setErro(true);
        router.push(`/relatorios/om/${om}`);
      }}
    >
      <input
        autoFocus
        inputMode="numeric"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setErro(false);
        }}
        placeholder="OM — a proposta do boletim (038129)"
        aria-label="Número da OM"
        aria-invalid={erro}
        className={`${CAMPO} w-72 max-w-full font-mono ${erro ? "border-manutencao" : ""}`}
      />
      <Botao type="submit" variante="primario">
        Abrir o relatório
      </Botao>
      {erro && <span className="text-xs text-manutencao">Isso não parece uma OM — são só os números.</span>}
    </form>
  );
}
