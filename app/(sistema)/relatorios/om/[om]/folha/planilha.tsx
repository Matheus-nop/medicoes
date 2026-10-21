import Image from "next/image";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  diaNoPapel,
  FORNECEDOR_DO_RELATORIO,
  LINHAS_DE_MATERIAIS,
  MOMENTOS,
  ROTULO_MOMENTO,
  totalDosMateriais,
  type DadosDoRelatorio,
  type MomentoDaFoto,
} from "@/lib/medicoes/relatorio";

/**
 * O "RELATÓRIO DE MANUTENÇÃO DE EQUIPAMENTO" do Águas do Rio, no desenho da
 * planilha que a orçamentista preenchia: as treze colunas B..N na mesma
 * proporção, as mesmas faixas azuis, o diagnóstico ao lado do rótulo, as três
 * fotos lado a lado e as 27 linhas de materiais com os tracinhos no que sobra.
 * O cliente confere onde está acostumado a conferir.
 *
 * Duas coisas saíram da planilha: a segunda linha de títulos das fotos (a de
 * cima do diagnóstico, repetida), e o "#VALUE!" onde a foto não colava.
 *
 * As cores são as do modelo, não os tokens do sistema: o papel é do cliente,
 * e sai igual no tema claro e no escuro.
 */

// As larguras das colunas B..N da planilha.
const COLUNAS = [9.29, 14.86, 5.57, 10.86, 15.14, 11.14, 7.86, 19.57, 17.43, 9.14, 12.71, 10, 29.86];
const SOMA = COLUNAS.reduce((t, c) => t + c, 0);

const BORDA = "border border-black";
const ROTULO = `${BORDA} px-[1.2mm] text-[7.5pt] font-bold text-black`;
const VALOR = `${BORDA} bg-[#F3F3F3] px-[1.2mm] text-[8pt] font-semibold text-[#000099]`;
const FAIXA = `${BORDA} bg-[#253F93] py-[0.8mm] text-center text-[9pt] font-bold text-white`;
const TITULO_FOTO = `${BORDA} bg-[#AEAAAA] py-[0.6mm] text-center text-[8pt] font-bold text-black`;

export function PapelDaPlanilha({ dados, urls }: { dados: DadosDoRelatorio; urls: Record<MomentoDaFoto, string | null> }) {
  const total = totalDosMateriais(dados.materiais);
  const materiais = dados.materiais.filter((m) => m.descricao.trim() || m.valor !== null);
  const sobra = Math.max(0, LINHAS_DE_MATERIAIS - materiais.length);

  return (
    <div
      id="folha"
      className="mx-auto w-[186mm] min-w-[186mm] bg-white font-[Calibri,Carlito,Arial,sans-serif] leading-tight text-black [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
    >
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {COLUNAS.map((c, i) => (
            <col key={i} style={{ width: `${((c / SOMA) * 100).toFixed(3)}%` }} />
          ))}
        </colgroup>
        <tbody>
          {/* ── O topo: a marca, o título e a revisão ───────────── */}
          <tr className="h-[3.7mm]">
            <td colSpan={3} rowSpan={2} className={`${BORDA} p-[1mm] text-center align-middle`}>
              <Image
                src="/medicoes/aguas-do-rio.png"
                alt="Águas do Rio"
                width={237}
                height={104}
                priority
                className="mx-auto h-[8mm] w-auto"
              />
            </td>
            <td colSpan={10} className={BORDA} />
          </tr>
          <tr className="h-[5.5mm]">
            <td colSpan={8} className={`${BORDA} text-center text-[12pt] font-bold`}>
              RELATÓRIO DE MANUTENÇÃO DE EQUIPAMENTO
            </td>
            <td className={`${BORDA} px-[1mm] text-[8pt] font-bold`}>Revisão:</td>
            <td className={`${BORDA} text-center text-[8pt] font-bold`}>0</td>
          </tr>

          {/* ── O cabeçalho ─────────────────────────────────────── */}
          <tr className="h-[5.5mm]">
            <td colSpan={2} className={ROTULO}>Fornecedor</td>
            <td colSpan={5} className={VALOR}>{FORNECEDOR_DO_RELATORIO}</td>
            <td className={ROTULO}>Data da retirada</td>
            <td className={`${VALOR} text-center`}>{diaNoPapel(dados.data_retirada)}</td>
            <td colSpan={2} className={ROTULO}>Responsável</td>
            <td colSpan={2} className={VALOR}>{dados.responsavel}</td>
          </tr>
          <tr className="h-[4.5mm]">
            <td colSpan={2} className={ROTULO}>SOLICITANTE</td>
            <td colSpan={5} className={VALOR}>{dados.solicitante}</td>
            <td className={ROTULO}>Superintendência</td>
            <td colSpan={5} className={VALOR}>{dados.superintendencia}</td>
          </tr>
          <tr className="h-[14.5mm]">
            <td colSpan={2} className={ROTULO}>Tipo de Manutenção</td>
            <td colSpan={6} className={`${VALOR} text-center`}>{dados.tipo_manutencao}</td>
            <td className={ROTULO}>Defeito Aparente</td>
            <td colSpan={4} className={`${VALOR} whitespace-pre-line`}>{dados.defeito}</td>
          </tr>
          <tr className="h-[7.4mm]">
            <td colSpan={2} className={ROTULO}>Equipamento</td>
            <td colSpan={3} className={VALOR}>{dados.equipamento}</td>
            <td className={ROTULO}>Modelo</td>
            <td colSpan={2} className={VALOR}>{dados.modelo}</td>
            <td className={ROTULO}>Nº de Patrimônio</td>
            <td colSpan={4} className={`${VALOR} text-center`}>{dados.patrimonio}</td>
          </tr>
          <tr className="h-[7.4mm]">
            <td colSpan={2} className={ROTULO}>Valor Total O.M</td>
            <td colSpan={11} className={`${VALOR} text-[10pt] font-bold text-[#FF0000]`}>{emReais(total)}</td>
          </tr>
          <tr className="h-[16.6mm]">
            <td colSpan={2} className={ROTULO}>Observação</td>
            <td colSpan={11} className={`${VALOR} whitespace-pre-line text-[#FF0000]`}>{dados.observacao}</td>
          </tr>

          {/* ── O registro: o diagnóstico e as três fotos ──────── */}
          <tr>
            <td colSpan={13} className={FAIXA}>Registro das Entregas Realizadas</td>
          </tr>
          <tr className="h-[19.7mm]">
            <td colSpan={5} className={`${ROTULO} text-center text-[9pt]`}>Diagnóstico Técnico</td>
            <td colSpan={8} className={`${VALOR} whitespace-pre-line`}>{dados.diagnostico}</td>
          </tr>
          <tr>
            {MOMENTOS.map((m, i) => (
              <td key={m} colSpan={[5, 4, 4][i]} className={TITULO_FOTO}>
                {ROTULO_MOMENTO[m]}
              </td>
            ))}
          </tr>
          <tr className="h-[40mm]">
            {MOMENTOS.map((m, i) => (
              <td key={m} colSpan={[5, 4, 4][i]} className={`${BORDA} p-[1mm] text-center align-middle`}>
                {urls[m] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada do bucket privado
                  <img src={urls[m] as string} alt={ROTULO_MOMENTO[m]} className="mx-auto max-h-[38mm] max-w-full object-contain" />
                ) : null}
              </td>
            ))}
          </tr>
          <tr className="h-[1.2mm]">
            <td colSpan={13} />
          </tr>

          {/* ── Os materiais e o total ─────────────────────────── */}
          <tr>
            <td colSpan={13} className={FAIXA}>Lista de Materiais substituidos</td>
          </tr>
          {materiais.map((m, i) => (
            <tr key={i} className="h-[3.6mm]">
              <td colSpan={9} className={`${BORDA} px-[1.2mm] text-[7.5pt] font-semibold text-[#000099]`}>
                {m.descricao}
              </td>
              <td colSpan={4} className={`${BORDA} px-[1.2mm] text-center text-[7.5pt] font-semibold text-[#000099]`}>
                {m.valor === null ? "-" : emReais(m.valor)}
              </td>
            </tr>
          ))}
          {Array.from({ length: sobra }, (_, i) => (
            <tr key={`vazia-${i}`} className="h-[3.6mm]">
              <td colSpan={9} className={`${BORDA} px-[1.2mm] text-[7.5pt] text-[#000099]`}>
                {i % 2 ? "--------" : "---------"}
              </td>
              <td colSpan={4} className={`${BORDA} text-center text-[7.5pt] text-[#000099]`}>-</td>
            </tr>
          ))}
          <tr className="h-[6mm]">
            <td colSpan={9} className={`${BORDA} px-[1.2mm] text-[10pt] font-bold`}>
              Valor total Ordem de Manutenção
            </td>
            <td colSpan={4} className={`${BORDA} text-center text-[11pt] font-bold text-[#000099]`}>
              {emReais(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
