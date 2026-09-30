import { Cabecalho, CartaoDoQuadro, Selo, Vazio } from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import { carregarClientes } from "./dados";

export const dynamic = "force-dynamic";

/**
 * O arquivo por cliente: um cartão por cliente, com o que o orçamento mediu
 * de manutenção e a posição do faturamento no painel. O cartão abre a ficha,
 * onde está tudo por base — boletins, relatórios, PDFs e planilhas.
 */
export default async function ArquivoPorCliente() {
  const carga = await carregarClientes();
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar os clientes</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Arquivo por cliente"
        resumo="Tudo de cada cliente num lugar: a manutenção medida pelo orçamento e as medições do faturamento, por base, com os PDFs e as planilhas para baixar."
      />
      {carga.fichas.length === 0 ? (
        <Vazio>Nenhum cliente ainda.</Vazio>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {carga.fichas.map((f) => {
            const m = f.manutencao;
            const p = f.faturamento;
            return (
              <CartaoDoQuadro
                key={f.chave}
                href={`/clientes/ficha?nome=${encodeURIComponent(f.nome)}`}
                titulo={f.nome}
                subtitulo={[
                  m.boletins ? `${m.boletins} boletim(ns) em ${m.bases} base(s)` : null,
                  p ? `painel: ${p.rotulo}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                selo={
                  <div className="flex flex-col items-end gap-1">
                    {m.boletins > 0 && <Selo tom="acento">manutenção</Selo>}
                    {p && <Selo tom="ok">faturamento</Selo>}
                  </div>
                }
                linhas={[
                  ...(m.boletins
                    ? [
                        { rotulo: "Manutenção medida", valor: emReais(m.medido) },
                        { rotulo: "Em medição", valor: emReais(m.emMedicao) },
                        ...(p ? [{ rotulo: "Saldo da manutenção", valor: emReais(m.saldo) }] : []),
                      ]
                    : []),
                  ...(p
                    ? [
                        { rotulo: "Painel · medido", valor: emReais(p.medido) },
                        { rotulo: "Painel · faturado", valor: emReais(p.faturado) },
                      ]
                    : []),
                ]}
                // O painel já contém a manutenção: os dois saldos não se somam.
                destaque={
                  p
                    ? { rotulo: "Saldo no painel", valor: emReais(p.saldo) }
                    : { rotulo: "Saldo da manutenção", valor: emReais(m.saldo) }
                }
              />
            );
          })}
        </div>
      )}
      <p className="text-xs text-texto-3">
        O nome do boletim vem do Sisloc e o do painel é digitado. Quando não batem (&quot;AGUAS DO RIO 4
        SPE&quot; e &quot;ÁGUAS DO RIO / AEGEA&quot;), o cliente aparece em dois cartões — juntar os dois é
        um vínculo que se faz depois, de propósito, para não somar clientes diferentes.
      </p>
    </div>
  );
}
