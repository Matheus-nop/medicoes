"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao, CAMPO } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import { chaveDaColagem, lerColagemDoSisloc, omDigitada, type OmColada } from "@/lib/medicoes/relatorio";

const AREA = `${CAMPO} h-auto min-h-[6rem] w-full py-2 font-mono text-xs`;

/**
 * O leitor: a orçamentista copia a OM no Sisloc (a grade, com a linha dos
 * títulos) e cola aqui. Uma OM abre o relatório dela já preenchido; várias
 * viram uma lista para abrir uma de cada vez. Só o número abre o relatório
 * que já existe.
 *
 * A leitura vai para o formulário pelo `sessionStorage` da aba — nada se
 * grava até ela gravar.
 */
export function LeitorDeOm() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [oms, setOms] = useState<OmColada[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  function abrir(o: OmColada) {
    try {
      sessionStorage.setItem(chaveDaColagem(o.om), JSON.stringify(o.leitura));
    } catch {
      // Sem sessionStorage (aba anônima travada), o relatório abre e a colagem se refaz lá.
    }
    router.push(`/relatorios/om/${o.om}`);
  }

  function ler(bruto: string) {
    setErro(null);
    setOms([]);
    const limpo = bruto.trim();
    if (!limpo) return;
    // Só o número: o relatório que já existe (ou um novo, em branco).
    if (!limpo.includes("\t") && !limpo.includes("\n")) {
      const om = omDigitada(limpo);
      if (om) return router.push(`/relatorios/om/${om}`);
      return setErro("Isso não parece uma OM. Cole a linha do Sisloc com os títulos, ou digite só o número.");
    }
    const r = lerColagemDoSisloc(bruto);
    if (r.erro) return setErro(r.erro);
    if (r.oms.length === 1) return abrir(r.oms[0]);
    setOms(r.oms);
  }

  return (
    <div className="space-y-2">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          ler(texto);
        }}
      >
        <textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onPaste={(e) => {
            const colado = e.clipboardData.getData("text");
            // A colagem lê na hora: copiou no Sisloc, colou aqui, abriu.
            if (colado.includes("\t")) {
              e.preventDefault();
              setTexto(colado);
              ler(colado);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !texto.includes("\t")) {
              e.preventDefault();
              ler(texto);
            }
          }}
          placeholder="No Sisloc, selecione a OM na grade com a linha dos títulos, Ctrl+C, e cole aqui (Ctrl+V). Ou digite só o número da OM para abrir um relatório que já existe."
          aria-label="Colar a OM do Sisloc"
          aria-invalid={Boolean(erro)}
          className={`${AREA} ${erro ? "border-manutencao" : ""}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Botao type="submit" variante="primario" disabled={!texto.trim()}>
            Abrir o relatório
          </Botao>
          {texto && (
            <Botao
              type="button"
              variante="discreto"
              onClick={() => {
                setTexto("");
                setOms([]);
                setErro(null);
              }}
            >
              Limpar
            </Botao>
          )}
          {erro && <span className="text-xs text-manutencao">{erro}</span>}
        </div>
      </form>

      {oms.length > 1 && (
        <div className="rounded-xl border border-borda bg-superficie">
          <p className="border-b border-borda px-4 py-2 text-xs text-texto-3">
            A colagem trouxe {oms.length} OMs — abra uma de cada vez.
          </p>
          <ul className="divide-y divide-borda">
            {oms.map((o) => (
              <li key={o.om} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                <span className="font-mono font-semibold">OM {o.om}</span>
                <span className="min-w-0 flex-1 truncate">
                  {o.equipamento || "—"} <span className="font-mono text-xs text-texto-3">{o.patrimonio}</span>
                </span>
                {o.leitura.valor !== null && <span className="text-texto-2 tabular-nums">{emReais(o.leitura.valor)}</span>}
                <button type="button" onClick={() => abrir(o)} className="text-xs font-semibold text-acento underline">
                  Abrir
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
