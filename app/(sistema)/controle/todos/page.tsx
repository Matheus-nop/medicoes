import Link from "next/link";
import {
  Cabecalho,
  CartaoDoQuadro,
  CartaoIndicador,
  Painel,
  Progresso,
  Selo,
  Vazio,
} from "@/components/ui";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import { faixaDoFaturado, resumirPeriodo, type LinhaDaRegiao } from "@/lib/medicoes/controle";
import { carregarClientes } from "../../clientes/dados";
import { AbasDoPainel } from "../abas";
import { BarrasDeSaldo } from "../graficos";
import { AoVivo } from "../vivo";

export const dynamic = "force-dynamic";

const TOM_FAIXA = { ok: "ok", parcial: "transito", pendente: "aviso", vazio: "neutro" } as const;

/**
 * O painel executivo de todos os clientes: a posição atual de cada um no
 * faturamento, somada — cada cliente entra com a SUA foto mais recente, que é
 * a posição dele hoje; não se somam meses de um mesmo cliente —, e ao lado a
 * manutenção que o orçamento está medindo.
 */
export default async function TodosOsClientes() {
  const carga = await carregarClientes();
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar os clientes</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }

  const comPainel = carga.fichas.filter((f) => f.faturamento);
  const comManutencao = carga.fichas.filter((f) => f.manutencao.boletins > 0);
  const anterior = comPainel.reduce((t, f) => t + f.faturamento!.anterior, 0);
  const medido = comPainel.reduce((t, f) => t + f.faturamento!.medido, 0);
  const faturado = comPainel.reduce((t, f) => t + f.faturamento!.faturado, 0);
  const saldo = comPainel.reduce((t, f) => t + f.faturamento!.saldo, 0);
  const comRecebimento = comPainel.filter((f) => f.faturamento!.aReceber !== null);
  const aReceber = comRecebimento.reduce((t, f) => t + (f.faturamento!.aReceber ?? 0), 0);
  const fracao = anterior + medido > 0 ? faturado / (anterior + medido) : null;
  const emMedicao = comManutencao.reduce((t, f) => t + f.manutencao.emMedicao, 0);

  // O gráfico de barras fala "região"; aqui cada barra é um cliente.
  const barras: LinhaDaRegiao[] = comPainel
    .map((f) => ({
      ...resumirPeriodo([]),
      regiao: f.nome,
      ordem: 0,
      medido: f.faturamento!.medido,
      faturado: f.faturamento!.faturado,
      saldo: f.faturamento!.saldo,
    }))
    .filter((b) => b.saldo > 0.005)
    .sort((a, b) => b.saldo - a.saldo);

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Painel executivo"
        resumo="Todos os clientes, cada um na sua posição mais recente. Clique no cliente para o painel dele."
        acoes={<AoVivo />}
      />
      <AbasDoPainel atual="todos" />

      {comPainel.length === 0 && comManutencao.length === 0 ? (
        <Vazio>Nenhum cliente com medição ainda.</Vazio>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CartaoIndicador
              compacto
              rotulo="Medido no mês"
              valor={emReais(medido)}
              detalhe={`saldo anterior ${emReais(anterior, false)} · ${comPainel.length} cliente(s)`}
            />
            <CartaoIndicador compacto rotulo="Faturado no mês" valor={emReais(faturado)} cor="bg-disponivel">
              <Progresso fracao={fracao} cor="bg-disponivel" />
            </CartaoIndicador>
            <CartaoIndicador
              compacto
              rotulo="Saldo a faturar"
              valor={<span className="text-saldo">{emReais(saldo)}</span>}
              cor="bg-saldo"
              detalhe={fracao === null ? undefined : `${emPorcento(fracao)} faturado`}
            />
            <CartaoIndicador
              compacto
              rotulo={comRecebimento.length ? "A receber" : "Manutenção em medição"}
              valor={comRecebimento.length ? emReais(aReceber) : emReais(emMedicao)}
              cor={comRecebimento.length ? "bg-reservado" : "bg-acento"}
              detalhe={
                comRecebimento.length
                  ? `faturado e não pago · ${comRecebimento.length} cliente(s) acompanhado(s)`
                  : "boletins abertos no orçamento"
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Painel titulo="Faturamento por cliente" descricao="A posição atual de cada um no painel">
              {comPainel.length === 0 ? (
                <p className="p-4 text-sm text-texto-3">Nenhum cliente com medições lançadas.</p>
              ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {comPainel.map((f) => {
                    const p = f.faturamento!;
                    const fr = p.anterior + p.medido > 0 ? p.faturado / (p.anterior + p.medido) : null;
                    return (
                      <CartaoDoQuadro
                        key={f.chave}
                        href={`/controle?cliente=${encodeURIComponent(p.cliente)}`}
                        titulo={f.nome}
                        subtitulo={`posição de ${p.rotulo}`}
                        selo={<Selo tom={TOM_FAIXA[faixaDoFaturado(fr)]}>{fr === null ? "—" : emPorcento(fr)}</Selo>}
                        linhas={[
                          { rotulo: "Saldo anterior", valor: emReais(p.anterior) },
                          { rotulo: "Medido no mês", valor: emReais(p.medido) },
                          { rotulo: "Faturado no mês", valor: emReais(p.faturado) },
                          ...(p.aReceber !== null ? [{ rotulo: "A receber", valor: emReais(p.aReceber) }] : []),
                        ]}
                        destaque={{ rotulo: "Saldo", valor: emReais(p.saldo) }}
                        fracao={fr}
                      />
                    );
                  })}
                </div>
              )}
            </Painel>
            <Painel titulo="Saldo por cliente" descricao="maior → menor">
              <BarrasDeSaldo linhas={barras} />
            </Painel>
          </div>

          {comManutencao.length > 0 && (
            <Painel
              titulo="Manutenção por cliente"
              descricao="O que o orçamento mediu nos boletins — o detalhe está no arquivo do cliente"
              acoes={
                <Link href="/clientes" className="text-xs font-semibold text-acento underline">
                  Arquivo por cliente
                </Link>
              }
            >
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {comManutencao.map((f) => {
                  const m = f.manutencao;
                  const fr = m.medido > 0 ? m.faturado / m.medido : null;
                  return (
                    <CartaoDoQuadro
                      key={f.chave}
                      href={`/clientes/ficha?nome=${encodeURIComponent(f.nome)}&aba=manutencao`}
                      titulo={f.nome}
                      subtitulo={`${m.boletins} boletim(ns) · ${m.bases} base(s)`}
                      linhas={[
                        { rotulo: "Em medição", valor: emReais(m.emMedicao) },
                        { rotulo: "Medido", valor: emReais(m.medido) },
                        { rotulo: "Faturado", valor: emReais(m.faturado) },
                      ]}
                      destaque={{ rotulo: "Saldo", valor: emReais(m.saldo) }}
                      fracao={fr}
                    />
                  );
                })}
              </div>
            </Painel>
          )}
        </>
      )}
    </div>
  );
}
