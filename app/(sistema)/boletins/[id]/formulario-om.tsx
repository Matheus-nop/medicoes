"use client";

import { useState } from "react";
import { Botao, CAMPO, Campo } from "@/components/ui";
import { dataDaOm, lerValorDigitado, type ItemDoBoletim } from "@/lib/medicoes/medicoes";
import type { CamposDaOm } from "../../acoes";

/** "2026-07-23" no fuso de quem usa, para o `<input type="date">`. */
function diaDoCampo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Uma linha do boletim, aberta para escrever.
 *
 * Serve às duas mãos do mesmo trabalho: corrigir o que a colagem trouxe (o
 * Sisloc escreveu o patrimônio torto, o comprovante achado não é o certo) e
 * incluir a OM que não veio na colagem. O automático é o ponto de partida;
 * quem monta o boletim tem a última palavra em todo campo que vai para o papel.
 */
export function FormularioDaOm({
  item,
  ocupado,
  aoSalvar,
  aoCancelar,
}: {
  /** Sem `item`, é OM nova, digitada. */
  item?: ItemDoBoletim;
  ocupado: boolean;
  aoSalvar: (campos: CamposDaOm) => void;
  aoCancelar: () => void;
}) {
  const [c, setC] = useState({
    om: item?.om ?? "",
    equipamento: item?.equipamento ?? "",
    patrimonio: item?.patrimonio ?? "",
    data: diaDoCampo(item ? dataDaOm(item) : null),
    omRetirada: item?.om_retirada ?? "",
    reciboEntrega: item?.recibo_entrega ?? "",
    valor: item ? item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
    observacao: item?.observacao ?? "",
  });
  const [problema, setProblema] = useState<string | null>(null);

  const muda = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setC((atual) => ({ ...atual, [k]: e.target.value }));

  function salvar() {
    const om = c.om.replace(/\s+/g, "");
    if (!/^\d{3,10}$/.test(om)) return setProblema("O Nº OM tem de ser o número do Sisloc, só dígitos.");
    if (!c.equipamento.trim()) return setProblema("Diga qual é o equipamento ou o serviço.");
    const valor = c.valor.trim() ? lerValorDigitado(c.valor) : 0;
    if (valor === null) return setProblema("O valor não é um número. Use 1.234,56.");
    setProblema(null);
    aoSalvar({
      om,
      equipamento: c.equipamento,
      patrimonio: c.patrimonio,
      data: c.data,
      omRetirada: c.omRetirada,
      reciboEntrega: c.reciboEntrega,
      valor,
      observacao: c.observacao,
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Nº OM" obrigatorio>
          <input value={c.om} onChange={muda("om")} inputMode="numeric" placeholder="032731" className={`${CAMPO} w-full font-mono`} />
        </Campo>
        <Campo rotulo="Descrição do equipamento / serviço" obrigatorio className="sm:col-span-2 lg:col-span-3">
          <input value={c.equipamento} onChange={muda("equipamento")} placeholder="CORTADORA MANUAL HUSQVARNA" className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Nº patrimônio">
          <input value={c.patrimonio} onChange={muda("patrimonio")} placeholder="251125-431" className={`${CAMPO} w-full font-mono`} />
        </Campo>
        <Campo rotulo="Data">
          <input type="date" value={c.data} onChange={muda("data")} className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Recibo retirada">
          <input value={c.omRetirada} onChange={muda("omRetirada")} inputMode="numeric" placeholder="032344" className={`${CAMPO} w-full font-mono`} />
        </Campo>
        <Campo rotulo="Recibo entrega">
          <input value={c.reciboEntrega} onChange={muda("reciboEntrega")} inputMode="numeric" placeholder="033923" className={`${CAMPO} w-full font-mono`} />
        </Campo>
        <Campo rotulo="Valor (OM / proposta)">
          <input value={c.valor} onChange={muda("valor")} inputMode="decimal" placeholder="2.624,00" className={`${CAMPO} w-full text-right`} />
        </Campo>
        <Campo rotulo="Observação" className="sm:col-span-2 lg:col-span-3">
          <input value={c.observacao} onChange={muda("observacao")} placeholder="Troca do carburador…" className={`${CAMPO} w-full`} />
        </Campo>
      </div>
      {problema && <p className="text-xs text-manutencao">{problema}</p>}
      <div className="flex gap-2">
        <Botao type="submit" variante="primario" disabled={ocupado}>
          {item ? "Salvar a OM" : "Incluir a OM"}
        </Botao>
        <Botao type="button" variante="discreto" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
