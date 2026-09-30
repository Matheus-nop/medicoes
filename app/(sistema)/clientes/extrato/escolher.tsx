"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CAMPO, Campo } from "@/components/ui";

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
