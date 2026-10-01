import { Cabecalho } from "@/components/ui";
import { hojeNaCasa } from "@/lib/medicoes/contratos";
import { podeLancar } from "@/lib/medicoes/papeis";
import { sessaoAtual } from "@/lib/supabase/papel";
import { carregarContratos } from "./dados";
import { QuadroDeContratos } from "./quadro";

export const dynamic = "force-dynamic";

/**
 * Os contratos: o que vence, o que está para reajustar e quanto do valor já
 * foi medido — sem abrir a pasta. Um cartão por contrato, agrupados por
 * cliente; o que pede ação vem antes.
 */
export default async function Contratos() {
  const [carga, sessao] = await Promise.all([carregarContratos(), sessaoAtual()]);
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar os contratos</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
        {carga.faltaMigracao && (
          <p className="mt-3 text-xs text-texto-3">
            Falta aplicar a <code>0013_contratos.sql</code> no SQL Editor.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Contratos"
        resumo="Com quem, até quando, quanto e por qual índice — e quanto do valor já foi medido no controle. O que vence, o que está para reajustar e o que passou do valor aparecem primeiro."
      />
      <QuadroDeContratos
        contratos={carga.contratos}
        clientes={carga.clientes}
        hoje={hojeNaCasa()}
        podeMexer={podeLancar(sessao.papel, "contrato")}
      />
    </div>
  );
}
