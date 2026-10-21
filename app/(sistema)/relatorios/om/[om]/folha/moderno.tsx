import Image from "next/image";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  diaNoPapel,
  FORNECEDOR_DO_RELATORIO,
  MOMENTOS,
  totalDosMateriais,
  type DadosDoRelatorio,
  type MomentoDaFoto,
} from "@/lib/medicoes/relatorio";

/**
 * O relatório de manutenção no papel da casa — o padrão. O mesmo conteúdo do
 * modelo do Águas do Rio (`planilha.tsx`), na mesma ordem, com outra cara: a
 * faixa azul com a OM e o patrimônio, o equipamento e o valor em destaque, as
 * três seções numeradas e as fotos em cartões. Sem assinatura: o relatório
 * vai como anexo da OM, e quem confere é a base no boletim.
 *
 * A folha pinta até a borda (margem 0 na impressão) e cresce se a lista de
 * materiais for longa; o rodapé fica no fim.
 *
 * As cores são do papel, não os tokens do sistema: sai igual no tema claro e
 * no escuro.
 */

const NOME_DA_FOTO: Record<MomentoDaFoto, string> = {
  retirada: "Retirada",
  manutencao: "Em manutenção",
  entrega: "Entrega",
};

function Dado({ rotulo, children, largo }: { rotulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? "col-span-2" : ""}>
      <p className="text-[6.5pt] font-semibold tracking-[0.08em] text-[#7A8294] uppercase">{rotulo}</p>
      <p className="mt-[0.6mm] text-[8.5pt] leading-snug font-medium text-[#141B2D]">{children || "—"}</p>
    </div>
  );
}

function Secao({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-[4mm] break-inside-avoid">
      <div className="mb-[2.5mm] flex items-center gap-[2.5mm]">
        <span className="grid size-[5.5mm] place-items-center rounded-full bg-[#253F93] text-[7pt] font-bold text-white">
          {numero}
        </span>
        <h2 className="text-[9.5pt] font-bold tracking-tight text-[#253F93]">{titulo}</h2>
        <span className="h-px flex-1 bg-[#DCE1EC]" />
      </div>
      {children}
    </section>
  );
}

function Nota({ rotulo, tom, children }: { rotulo: string; tom: "defeito" | "neutro" | "diagnostico"; children: string }) {
  const cor = {
    defeito: "border-[#E5484D] bg-[#FFF5F5] text-[#B4232A]",
    neutro: "border-[#7A8294] bg-[#F6F7FA] text-[#4A5368]",
    diagnostico: "border-[#2F9E6B] bg-[#F1FAF5] text-[#1F7A50]",
  }[tom];
  return (
    <div className={`rounded-[2.5mm] border-l-[1.2mm] px-[4mm] py-[2.5mm] ${cor}`}>
      <p className="text-[6.5pt] font-semibold tracking-[0.08em] uppercase">{rotulo}</p>
      <p className="mt-[0.6mm] text-[8.5pt] leading-snug whitespace-pre-line text-[#141B2D]">{children.trim() || "—"}</p>
    </div>
  );
}

export function PapelModerno({
  om,
  dados,
  urls,
  emitidoEm,
}: {
  om: string;
  dados: DadosDoRelatorio;
  urls: Record<MomentoDaFoto, string | null>;
  /** "21/10/2026" — o dia em que se gravou; nulo é prévia. */
  emitidoEm: string | null;
}) {
  const total = totalDosMateriais(dados.materiais);
  const materiais = dados.materiais.filter((m) => m.descricao.trim() || m.valor !== null);
  // As linhas em branco da observação são do papel antigo; aqui viram uma quebra só.
  const observacao = dados.observacao.replace(/\n\s*\n/g, "\n");

  return (
    <div
      id="folha"
      className="mx-auto flex min-h-[297mm] w-[210mm] min-w-[210mm] flex-col bg-white font-sans text-[#141B2D] shadow-xl [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:shadow-none"
    >
      {/* ── A faixa do topo ───────────────────────────────── */}
      <header className="bg-[#253F93] px-[12mm] pt-[7mm] pb-[5mm] text-white">
        <div className="flex items-start justify-between">
          <div className="rounded-[2mm] bg-white px-[3mm] py-[1.8mm]">
            <Image src="/medicoes/aguas-do-rio.png" alt="Águas do Rio" width={237} height={104} priority className="h-[9mm] w-auto" />
          </div>
          <div className="text-right text-[7pt] leading-relaxed text-white/80">
            <p>Revisão 0</p>
            <p>{emitidoEm ? `Emitido em ${emitidoEm}` : "Prévia — ainda não gravado"}</p>
          </div>
        </div>
        <p className="mt-[3.5mm] text-[7.5pt] font-semibold tracking-[0.2em] text-white/70 uppercase">
          Anexo da ordem de manutenção
        </p>
        <h1 className="text-[17pt] leading-tight font-bold tracking-tight">Relatório de Manutenção de Equipamento</h1>
        <div className="mt-[4mm] flex flex-wrap gap-[2mm] text-[7.5pt] font-semibold">
          <span className="rounded-full bg-white/15 px-[3mm] py-[1mm]">OM {om}</span>
          {dados.patrimonio && <span className="rounded-full bg-white/15 px-[3mm] py-[1mm]">Patrimônio {dados.patrimonio}</span>}
          <span className="rounded-full bg-[#F2B33D] px-[3mm] py-[1mm] text-[#3A2A00]">{dados.tipo_manutencao}</span>
        </div>
      </header>

      <main className="flex-1 px-[12mm] pb-[6mm]">
        {/* ── O equipamento e o valor ──────────────────────── */}
        <div className="mt-[4mm] grid grid-cols-[1fr_auto] items-stretch gap-[4mm]">
          <div className="rounded-[2.5mm] border border-[#DCE1EC] px-[4mm] py-[3mm]">
            <p className="text-[6.5pt] font-semibold tracking-[0.08em] text-[#7A8294] uppercase">Equipamento</p>
            <p className="text-[12pt] leading-tight font-bold">{dados.equipamento || "—"}</p>
            <p className="mt-[0.5mm] text-[8pt] text-[#4A5368]">
              {[dados.modelo && `Modelo ${dados.modelo}`, dados.patrimonio && `Patrimônio ${dados.patrimonio}`]
                .filter(Boolean)
                .join(" · ") || " "}
            </p>
          </div>
          <div className="min-w-[48mm] rounded-[2.5mm] bg-[#EEF2FB] px-[4mm] py-[3mm] text-right">
            <p className="text-[6.5pt] font-semibold tracking-[0.08em] text-[#253F93] uppercase">Valor total da O.M.</p>
            <p className="text-[17pt] leading-tight font-bold text-[#253F93] tabular-nums">{emReais(total)}</p>
          </div>
        </div>

        <Secao numero="1" titulo="Identificação">
          <div className="grid grid-cols-4 gap-x-[5mm] gap-y-[3mm] rounded-[2.5mm] bg-[#F6F7FA] px-[4mm] py-[3.5mm]">
            <Dado rotulo="Fornecedor" largo>
              {FORNECEDOR_DO_RELATORIO}
            </Dado>
            <Dado rotulo="Data da retirada">{diaNoPapel(dados.data_retirada)}</Dado>
            <Dado rotulo="Responsável">{dados.responsavel}</Dado>
            <Dado rotulo="Superintendência" largo>
              {dados.superintendencia}
            </Dado>
            <Dado rotulo="Solicitante">{dados.solicitante}</Dado>
            <Dado rotulo="Tipo de manutenção">{dados.tipo_manutencao}</Dado>
          </div>
          <div className="mt-[3mm] grid grid-cols-2 gap-[4mm]">
            <Nota rotulo="Defeito aparente" tom="defeito">
              {dados.defeito}
            </Nota>
            <Nota rotulo="Observação" tom="neutro">
              {observacao}
            </Nota>
          </div>
        </Secao>

        <Secao numero="2" titulo="Registro das entregas realizadas">
          <Nota rotulo="Diagnóstico técnico" tom="diagnostico">
            {dados.diagnostico}
          </Nota>
          <div className="mt-[3mm] grid grid-cols-3 gap-[3mm]">
            {MOMENTOS.map((m, i) => (
              <figure key={m} className="overflow-hidden rounded-[2.5mm] border border-[#DCE1EC]">
                {urls[m] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada do bucket privado
                  <img src={urls[m] as string} alt={NOME_DA_FOTO[m]} className="h-[36mm] w-full object-cover" />
                ) : (
                  <div className="grid h-[36mm] place-items-center bg-[#F6F7FA] text-[7pt] text-[#7A8294]">sem foto</div>
                )}
                <figcaption className="flex items-center gap-[1.5mm] px-[2.5mm] py-[1.6mm] text-[7.5pt] font-semibold">
                  <span className="grid size-[4mm] place-items-center rounded-full bg-[#253F93] text-[6pt] text-white">
                    {i + 1}
                  </span>
                  {NOME_DA_FOTO[m]}
                </figcaption>
              </figure>
            ))}
          </div>
        </Secao>

        <Secao numero="3" titulo="Materiais e serviços substituídos">
          <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[2.5mm] border border-[#DCE1EC] text-[8pt]">
            <thead>
              <tr className="bg-[#F6F7FA] text-[6.5pt] tracking-[0.08em] text-[#7A8294] uppercase">
                <th className="w-[12mm] px-[3mm] py-[1.8mm] text-left font-semibold">Item</th>
                <th className="px-[3mm] py-[1.8mm] text-left font-semibold">Descrição</th>
                <th className="w-[32mm] px-[3mm] py-[1.8mm] text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {materiais.length === 0 && (
                <tr>
                  <td colSpan={3} className="border-t border-[#E6E9F0] px-[3mm] py-[1.8mm] text-[#7A8294]">
                    Nenhum material listado.
                  </td>
                </tr>
              )}
              {materiais.map((m, i) => (
                <tr key={i}>
                  <td className="border-t border-[#E6E9F0] px-[3mm] py-[1.8mm] text-[#7A8294] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="border-t border-[#E6E9F0] px-[3mm] py-[1.8mm] font-medium">{m.descricao}</td>
                  <td className="border-t border-[#E6E9F0] px-[3mm] py-[1.8mm] text-right tabular-nums">
                    {m.valor === null ? <span className="text-[#7A8294]">—</span> : emReais(m.valor)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#253F93] text-white">
                <td colSpan={2} className="px-[3mm] py-[2.2mm] text-[8.5pt] font-bold">
                  Valor total da ordem de manutenção
                </td>
                <td className="px-[3mm] py-[2.2mm] text-right text-[11pt] font-bold tabular-nums">{emReais(total)}</td>
              </tr>
            </tbody>
          </table>
        </Secao>
      </main>

      <footer className="flex items-center justify-between gap-4 border-t border-[#DCE1EC] px-[12mm] py-[3.5mm] text-[6.5pt] text-[#7A8294]">
        <span className="truncate">
          Relatório de manutenção · OM {om}
          {dados.superintendencia ? ` · ${dados.superintendencia}` : ""}
        </span>
        <span className="shrink-0">{FORNECEDOR_DO_RELATORIO}</span>
      </footer>
    </div>
  );
}
