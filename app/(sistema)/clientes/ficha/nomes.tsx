"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, CAMPO, Campo, Painel, Selo } from "@/components/ui";
import { juntarNome, separarNome } from "../acoes";

/**
 * Os nomes que caem nesta ficha — o do Sisloc, o do controle — e o vínculo
 * que os junta. Juntar não muda boletim nenhum: o papel continua com o nome
 * do Sisloc. Separar devolve o nome à ficha dele.
 */
export function NomesDoCliente({
  cliente,
  nomes,
  juntados,
  outros,
  podeMexer,
}: {
  /** O nome da ficha: é o cliente a que os outros se juntam. */
  cliente: string;
  /** Todos os nomes desta ficha. */
  nomes: string[];
  /** Os vínculos que apontam para esta ficha. */
  juntados: { id: number; nome: string }[];
  /** As outras fichas que podem se juntar a esta (sem vínculo próprio). */
  outros: string[];
  podeMexer: boolean;
}) {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  // Com um nome só não há o que ver: começa fechado.
  const [fechado, setFechado] = useState(nomes.length < 2);
  const [ocupado, iniciar] = useTransition();

  const fazer = (acao: () => Promise<{ ok: boolean; erro?: string }>) =>
    iniciar(async () => {
      setErro(null);
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Não deu certo.");
      else {
        setEscolhido("");
        router.refresh();
      }
    });

  const idDe = new Map(juntados.map((j) => [j.nome, j.id]));

  return (
    <Painel
      titulo="Nomes deste cliente"
      descricao="O Sisloc e o controle escrevem o cliente de jeitos diferentes. Juntar põe os boletins de outro nome nesta ficha — o papel do boletim não muda."
      recolhido={fechado}
      aoRecolher={() => setFechado((x) => !x)}
    >
      <div className="space-y-3 p-4">
        {erro && (
          <Aviso tom="erro" aoFechar={() => setErro(null)}>
            {erro}
          </Aviso>
        )}
        <ul className="flex flex-wrap gap-2 text-xs">
          {nomes.map((n) => {
            const id = idDe.get(n);
            return (
              <li key={n} className="flex items-center gap-2 rounded-lg border border-borda bg-superficie-2 px-2.5 py-1.5">
                <span className="font-medium">{n}</span>
                {id === undefined ? (
                  <Selo tom="acento">nome da ficha</Selo>
                ) : (
                  podeMexer && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => {
                        if (!window.confirm(`Separar "${n}"? Os boletins dele voltam para a ficha própria.`)) return;
                        fazer(() => separarNome(id));
                      }}
                      className="font-semibold text-manutencao underline"
                    >
                      separar
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
        {podeMexer && outros.length > 0 && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              fazer(() => juntarNome(escolhido, cliente));
            }}
          >
            <Campo rotulo="Juntar outro nome a este cliente" className="w-full max-w-md">
              <select
                value={escolhido}
                onChange={(e) => setEscolhido(e.target.value)}
                className={`${CAMPO} w-full`}
              >
                <option value="">Escolha o nome…</option>
                {outros.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Campo>
            <Botao type="submit" variante="primario" disabled={ocupado || !escolhido}>
              Juntar
            </Botao>
          </form>
        )}
      </div>
    </Painel>
  );
}
