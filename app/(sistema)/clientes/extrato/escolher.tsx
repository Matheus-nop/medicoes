"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Botao, CAMPO, Campo } from "@/components/ui";

/** O mês de referência do extrato — vazio é todos. Muda o endereço. */
export function EscolherMes({ meses, mes }: { meses: string[]; mes: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams();
  return (
    <Campo rotulo="Mês de referência">
      <select
        value={mes}
        onChange={(e) => {
          const p = new URLSearchParams(busca.toString());
          if (e.target.value) p.set("mes", e.target.value);
          else p.delete("mes");
          router.push(`${caminho}?${p.toString()}`);
        }}
        className={CAMPO}
      >
        <option value="">Todos os meses</option>
        {meses.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
    </Campo>
  );
}

/**
 * A base do extrato — parte do nome, sem acento nem caixa (a mesma regra da
 * tela dos boletins), ou escolhida na lista. Vai para o endereço depois de uma
 * pausa na digitação, e o extrato e o PDF saem só com as bases escolhidas.
 */
export function FiltrarBase({ bases, base }: { bases: string[]; base: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams();
  const [texto, setTexto] = useState(base);
  const espera = useRef<number | undefined>(undefined);

  function levar(valor: string) {
    const p = new URLSearchParams(busca.toString());
    if (valor.trim()) p.set("base", valor.trim());
    else p.delete("base");
    router.replace(`${caminho}?${p.toString()}`);
  }

  function mudar(valor: string) {
    setTexto(valor);
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => levar(valor), 400);
  }

  return (
    <Campo rotulo="Base" className="w-full max-w-md">
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => mudar(e.target.value)}
          list="bases-do-extrato"
          placeholder="Todas — ou digite parte do nome"
          aria-label="Filtrar o extrato por base"
          className={`${CAMPO} w-full`}
        />
        {texto && (
          <Botao variante="discreto" onClick={() => mudar("")}>
            Limpar
          </Botao>
        )}
      </div>
      <datalist id="bases-do-extrato">
        {bases.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
    </Campo>
  );
}
