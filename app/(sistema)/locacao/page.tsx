import { Cabecalho, CartaoDoQuadro, Painel, SoLeitura, Vazio } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import { CLIENTE_PADRAO } from "@/lib/medicoes/controle";
import { podeLancar, quemLanca } from "@/lib/medicoes/papeis";
import { sessaoAtual } from "@/lib/supabase/papel";
import { carregarMedicoes } from "./dados";
import { mesPorExtenso } from "./formato";
import { Importador } from "./importador";

export const dynamic = "force-dynamic";

/**
 * A medição de locação: os boletins do Sisloc de cada base, importados do
 * PDF, compondo a medição do mês do cliente — a que sai na planilha padrão da
 * AEGEA, de todas as bases e todos os contratos.
 */
export default async function MedicoesDeLocacao() {
  const [carga, sessao] = await Promise.all([carregarMedicoes(), sessaoAtual()]);
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar a locação</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
        {carga.faltaMigracao && (
          <p className="mt-3 text-xs text-texto-3">
            Falta aplicar a <code>0023_medicao_de_locacao.sql</code> no SQL Editor.
          </p>
        )}
      </div>
    );
  }
  const pode = podeLancar(sessao.papel, "locacao");
  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Medição de locação"
        resumo="Exporte do Sisloc o Boletim de medição de cada base, em PDF, e arraste aqui. O sistema lê, confere com o total do Sisloc e monta a medição do mês — e a planilha padrão da AEGEA sai pronta."
      />
      {pode ? (
        <Painel titulo="Importar os PDFs do Sisloc">
          <Importador clientes={carga.clientes} clienteInicial={carga.clientes.includes(CLIENTE_PADRAO) ? CLIENTE_PADRAO : carga.clientes[0]} />
        </Painel>
      ) : (
        <SoLeitura>Você vê as medições, mas quem importa é {quemLanca("locacao")}.</SoLeitura>
      )}
      <Painel titulo={`Medições · ${carga.medicoes.length}`} descricao="Uma por cliente e mês, com todas as bases e todos os contratos.">
        {carga.medicoes.length === 0 ? (
          <div className="p-4">
            <Vazio>Nenhuma medição ainda. A primeira nasce com o primeiro PDF gravado.</Vazio>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {carga.medicoes.map((m) => (
              <CartaoDoQuadro
                key={m.id}
                href={`/locacao/${m.id}`}
                titulo={mesPorExtenso(m.mes)}
                subtitulo={m.cliente}
                linhas={[
                  { rotulo: "Bases importadas", valor: m.boletins },
                  { rotulo: "Contrato", valor: m.contrato_juridico ?? "—" },
                ]}
                destaque={{ rotulo: "Locação (Sisloc)", valor: emReais(m.total) }}
              />
            ))}
          </div>
        )}
      </Painel>
    </div>
  );
}
