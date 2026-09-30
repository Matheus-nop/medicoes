import Image from "next/image";
import Link from "next/link";
import { Cabecalho, ESTILO_BOTAO, Vazio } from "@/components/ui";
import { Imprimir } from "@/components/imprimir";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import { boletinsPorBase, mesesDeReferencia } from "@/lib/medicoes/arquivo";
import {
  ROTULO_SITUACAO,
  dataDaOm,
  documentoDoBoletim,
  statusDaOm,
  type BoletimAtual,
  type ItemDoBoletim,
} from "@/lib/medicoes/medicoes";
import { dataCurta } from "../../formato";
import { EscolherMes } from "./escolher";

// O papel tem as cores dele, como o boletim e o relatório: sai igual no tema
// escuro. Não leva custo nem margem — pode ir para fora de casa.

const faturadoDe = (b: BoletimAtual) => (b.situacao === "faturado" ? b.valor : b.faturado);

export function Extrato({
  nome,
  todos,
  boletins,
  oms,
  mes,
}: {
  nome: string;
  todos: BoletimAtual[];
  boletins: BoletimAtual[];
  oms: (ItemDoBoletim & { boletim_id: number })[];
  mes: string;
}) {
  const apresentados = boletins.filter((b) => b.situacao !== "aberto");
  const medido = apresentados.reduce((t, b) => t + b.valor, 0);
  const faturado = apresentados.reduce((t, b) => t + faturadoDe(b), 0);
  const emMedicao = boletins.filter((b) => b.situacao === "aberto").reduce((t, b) => t + b.valor, 0);
  const gerado = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const omsDe = (id: number) =>
    oms
      .filter((i) => i.boletim_id === id)
      .sort((a, b) => (dataDaOm(a) ?? "").localeCompare(dataDaOm(b) ?? "") || a.om.localeCompare(b.om));

  const th = "px-[1.2mm] py-[1mm] text-right font-bold";
  const th1 = "px-[1.2mm] py-[1mm] text-left font-bold";
  const td = "border-b border-[#E4E5EA] px-[1.2mm] py-[0.6mm] text-right tabular-nums whitespace-nowrap";
  const td1 = "border-b border-[#E4E5EA] px-[1.2mm] py-[0.6mm] text-left";

  return (
    <div className="space-y-4">
      <div className="space-y-3 print:hidden">
        <Cabecalho
          titulo={`Extrato de manutenção · ${nome}`}
          resumo="Os boletins do cliente por base, com as OMs de cada um. Escolha o mês e imprima ou salve em PDF."
          acoes={
            <Link href={`/clientes/ficha?nome=${encodeURIComponent(nome)}&aba=manutencao`} className={ESTILO_BOTAO.discreto}>
              Voltar ao arquivo
            </Link>
          }
        />
        <div className="flex flex-wrap items-end gap-2">
          <EscolherMes meses={mesesDeReferencia(todos)} mes={mes} />
          <div className="ml-auto">
            <Imprimir rotulo="Imprimir / PDF" />
          </div>
        </div>
      </div>

      {boletins.length === 0 ? (
        <Vazio>Nenhum boletim deste cliente{mes ? ` em ${mes}` : ""}.</Vazio>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <div
            id="folha"
            className="mx-auto w-[186mm] min-w-[186mm] bg-white p-[6mm] font-sans text-[8pt] text-[#2B2B2B] shadow-cartao [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:p-0 print:shadow-none"
          >
            <div className="flex items-center justify-between border-b-2 border-[#16365C] pb-[2mm]">
              <Image src="/logo.png" alt="Grupo Nova Opção" width={330} height={100} className="h-[11mm] w-auto" priority />
              <div className="text-right">
                <p className="text-[15pt] leading-tight font-bold text-[#16365C]">EXTRATO DE MANUTENÇÃO</p>
                <p className="text-[8.5pt] font-bold text-[#8A8A93] uppercase">
                  {nome} · {mes || "todos os meses"}
                </p>
              </div>
            </div>
            <p className="mt-[1.5mm] text-[7.5pt] text-[#8A8A93]">
              {boletins.length} boletim(ns) · {oms.length} OM(s) · gerado em {gerado}
            </p>

            <div className="mt-[3mm] grid grid-cols-4 gap-[2mm]">
              {[
                ["Em medição", emReais(emMedicao), "text-[#16365C]"],
                ["Medido", emReais(medido), "text-[#16365C]"],
                ["Faturado", emReais(faturado), "text-[#1E7B4A]"],
                [`Saldo · ${medido > 0 ? emPorcento(faturado / medido) : "—"} fat.`, emReais(medido - faturado), "text-[#C2683B]"],
              ].map(([r, v, c]) => (
                <div key={r} className="rounded border border-[#D8DBE4] bg-[#F5F7FA] px-[3mm] py-[2mm]">
                  <p className="text-[6.5pt] font-bold tracking-wide text-[#8A8A93] uppercase">{r}</p>
                  <p className={`mt-0.5 text-[12pt] leading-tight font-bold tabular-nums ${c}`}>{v}</p>
                </div>
              ))}
            </div>

            {boletinsPorBase(boletins).map((g) => (
              <section key={g.base} className="mt-[5mm]">
                <p className="border-b border-[#16365C] pb-[0.8mm] text-[9pt] font-bold text-[#16365C] uppercase">
                  {g.base}
                </p>
                {g.boletins.map((b) => {
                  const itens = omsDe(b.id);
                  return (
                    <div key={b.id} className="mt-[2.5mm] break-inside-avoid">
                      <div className="flex flex-wrap items-baseline gap-x-[3mm] text-[8pt]">
                        <span className="font-bold">{documentoDoBoletim(b)}</span>
                        <span className="text-[#8A8A93]">
                          {ROTULO_SITUACAO[b.situacao]}
                          {b.fechado_em ? ` · emitido ${dataCurta(b.fechado_em)}` : ""}
                        </span>
                        <span className="ml-auto tabular-nums">
                          valor <strong>{emReais(b.valor)}</strong>
                          {b.situacao !== "aberto" && (
                            <>
                              {" "}· faturado {emReais(faturadoDe(b))} · saldo{" "}
                              <strong className="text-[#C2683B]">{emReais(b.valor - faturadoDe(b))}</strong>
                            </>
                          )}
                        </span>
                      </div>
                      <table className="mt-[1mm] w-full border-collapse text-[7pt]">
                        <thead>
                          <tr className="bg-[#16365C] text-[6.5pt] text-white">
                            <th className={th1}>OM</th>
                            <th className={th1}>Data</th>
                            <th className={th1}>Patrimônio</th>
                            <th className={th1}>Equipamento / serviço</th>
                            <th className={th}>Valor</th>
                            <th className={th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itens.map((i) => (
                            <tr key={i.id}>
                              <td className={`${td1} whitespace-nowrap`}>{i.om}</td>
                              <td className={`${td1} whitespace-nowrap`}>{dataCurta(dataDaOm(i))}</td>
                              <td className={`${td1} whitespace-nowrap`}>{i.patrimonio ?? ""}</td>
                              <td className={td1}>{i.equipamento ?? ""}</td>
                              <td className={td}>{emReais(i.valor)}</td>
                              <td className={`${td} font-bold ${i.faturada ? "text-[#1E7B4A]" : ""}`}>
                                {b.situacao === "aberto" ? "EM MEDIÇÃO" : statusDaOm(i)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </section>
            ))}

            <p className="mt-[4mm] border-t border-[#D8DBE4] pt-[1.5mm] text-[6.5pt] text-[#8A8A93]">
              Grupo Nova Opção · Medições e Contratos. Medido é o que saiu em boletim fechado; saldo é o
              medido ainda não faturado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
