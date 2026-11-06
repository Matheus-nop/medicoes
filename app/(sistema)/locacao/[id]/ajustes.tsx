"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, CAMPO, Campo, Painel, Selo } from "@/components/ui";
import { lerNumero } from "@/lib/medicoes/controle";
import { emReais } from "@/lib/medicoes/dinheiro";
import { contaDosAjustes, type AjusteDaMedicao } from "@/lib/medicoes/locacao";
import { lancarAjuste, tirarAjuste } from "../acoes";

/**
 * Os descontos e acréscimos da medição: vários de cada, com descrição, em R$
 * ou em percentual sobre o subtotal (locação + manutenção). Saem no PDF e na
 * planilha, depois da manutenção, e o total da medição já vem com eles.
 */
export function DescontosEAcrescimos({
  medicaoId,
  subtotal,
  ajustes,
  podeMexer,
}: {
  medicaoId: number;
  subtotal: number;
  ajustes: (AjusteDaMedicao & { id: number })[];
  podeMexer: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(ajustes.length > 0);
  const [tipo, setTipo] = useState<AjusteDaMedicao["tipo"]>("desconto");
  const [forma, setForma] = useState<AjusteDaMedicao["forma"]>("valor");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const conta = contaDosAjustes(subtotal, ajustes);
  const lido = lerNumero(valor);
  const previa = lido && lido > 0 ? (forma === "percentual" ? Math.round(subtotal * lido) / 100 : lido) : null;

  return (
    <Painel
      titulo={`Descontos e acréscimos${ajustes.length ? ` · ${ajustes.length}` : ""}`}
      descricao={
        ajustes.length
          ? `Subtotal ${emReais(subtotal)} − descontos ${emReais(conta.descontos)} + acréscimos ${emReais(conta.acrescimos)} = ${emReais(conta.total)}`
          : "Nenhum. O percentual é sobre o subtotal da medição (locação + manutenção)."
      }
      recolhido={!aberto}
      aoRecolher={() => setAberto((x) => !x)}
    >
      <div className="space-y-3 p-4">
        {erro && (
          <Aviso tom="erro" aoFechar={() => setErro(null)}>
            {erro}
          </Aviso>
        )}

        {ajustes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="border-b border-borda text-texto-3">
                <tr>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 font-medium">Descrição</th>
                  <th className="py-2 pr-3 text-right font-medium">Lançado</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {conta.linhas.map((a) => (
                  <tr key={a.id} className="border-b border-borda/50">
                    <td className="py-1.5 pr-3">
                      <Selo tom={a.tipo === "desconto" ? "aviso" : "ok"}>{a.tipo === "desconto" ? "Desconto" : "Acréscimo"}</Selo>
                    </td>
                    <td className="py-1.5 pr-3">{a.descricao}</td>
                    <td className="py-1.5 pr-3 text-right text-texto-3">
                      {a.forma === "percentual" ? `${String(a.valor).replace(".", ",")}% do subtotal` : "em R$"}
                    </td>
                    <td className={`py-1.5 pr-3 text-right font-semibold ${a.tipo === "desconto" ? "text-manutencao" : ""}`}>
                      {a.tipo === "desconto" ? "− " : "+ "}
                      {emReais(a.calculado)}
                    </td>
                    <td className="py-1.5 text-right">
                      {podeMexer && (
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() =>
                            iniciar(async () => {
                              setErro(null);
                              const r = await tirarAjuste(medicaoId, a.id);
                              if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
                              router.refresh();
                            })
                          }
                          className="font-semibold text-manutencao underline"
                        >
                          Tirar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3" colSpan={3}>
                    Total da medição
                  </td>
                  <td className="py-2 pr-3 text-right">{emReais(conta.total)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {podeMexer && (
          <form
            className="grid grid-cols-1 gap-3 rounded-xl border border-borda bg-superficie-2 p-3 sm:grid-cols-[9rem_minmax(0,1fr)_7rem_9rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              iniciar(async () => {
                setErro(null);
                const r = await lancarAjuste(medicaoId, { tipo, forma, descricao, valor: lido ?? 0 });
                if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
                setDescricao("");
                setValor("");
                router.refresh();
              });
            }}
          >
            <Campo rotulo="Tipo">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as AjusteDaMedicao["tipo"])} className={`${CAMPO} w-full`}>
                <option value="desconto">Desconto</option>
                <option value="acrescimo">Acréscimo</option>
              </select>
            </Campo>
            <Campo rotulo="Descrição">
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Dias parados por chuva, frete extra…"
                className={`${CAMPO} w-full`}
              />
            </Campo>
            <Campo rotulo="Em">
              <select value={forma} onChange={(e) => setForma(e.target.value as AjusteDaMedicao["forma"])} className={`${CAMPO} w-full`}>
                <option value="valor">R$</option>
                <option value="percentual">%</option>
              </select>
            </Campo>
            <Campo rotulo={forma === "percentual" ? "Percentual" : "Valor"}>
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder={forma === "percentual" ? "5" : "150,00"}
                className={`${CAMPO} w-full text-right`}
              />
            </Campo>
            <Botao variante="primario" type="submit" disabled={ocupado || !descricao.trim() || !previa}>
              Lançar
            </Botao>
            {previa !== null && (
              <p className="text-xs text-texto-3 sm:col-span-5">
                {tipo === "desconto" ? "Tira" : "Soma"} {emReais(previa)}
                {forma === "percentual" ? ` (${valor}% de ${emReais(subtotal)})` : ""} do total da medição.
              </p>
            )}
          </form>
        )}
      </div>
    </Painel>
  );
}
