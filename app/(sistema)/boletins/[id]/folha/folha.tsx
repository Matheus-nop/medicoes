"use client";

import Image from "next/image";
import Link from "next/link";
import { Cabecalho, ESTILO_BOTAO } from "@/components/ui";
import { Imprimir } from "@/components/imprimir";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  FORNECEDOR,
  LINHAS_NO_PAPEL,
  documentoDoBoletim,
  dataDaOm,
  type BoletimAtual,
  type ItemDoBoletim,
} from "@/lib/medicoes/medicoes";
import { dataCurta } from "../../../formato";
import { Papel2026 } from "./papel-2026";

/**
 * O boletim no modelo da casa — "Boletim de medição 2026 — TESTE 2", da Ação
 * Serviços e Máquinas. É o papel do Águas do Rio / AEGEA; a Rio+ Saneamento
 * e o Águas do Rio padrão 2026 têm o deles (`papel-2026.tsx`), e o boletim diz qual (`modelo`).
 *
 * É cópia do modelo, de propósito: o mesmo cabeçalho em três caixas, os
 * mesmos rótulos, as mesmas nove colunas na mesma proporção (as larguras são
 * as das colunas B a J da planilha), as dezesseis linhas mesmo vazias, a
 * mesma faixa do total, o mesmo rodapé. O cliente já conhece esse papel, e o
 * que ele confere é o que está onde ele espera.
 *
 * O que NÃO vai: custo e margem. São da casa; a tela mostra, o papel não.
 *
 * As cores são as do modelo, e não os tokens do sistema: o papel é da Ação,
 * não da tela do sistema, e sai igual no tema claro e no escuro.
 */

// As larguras das colunas B..J da planilha, em proporção.
const COLUNAS = [5.6, 38.9, 22.9, 15, 17.3, 22.3, 16.9, 19.6, 31.3];
const TOTAL_COLUNAS = COLUNAS.reduce((t, c) => t + c, 0);
// Na impressão a folha é desenhada com 325 mm e reduzida a 84%: dá os 273 mm
// úteis do A4 deitado, e as dezesseis linhas cabem numa página só — é o
// "ajustar à página" que o Excel faz com o modelo, que também não cabe em
// tamanho real.
const largura = (c: number) => `${((c / TOTAL_COLUNAS) * 100).toFixed(2)}%`;

const CABECALHO = [
  "ITEM",
  "DESCRIÇÃO DO EQUIPAMENTO / SERVIÇO",
  "Nº PATRIMÔNIO",
  "DATA",
  "Nº OM",
  // Os mesmos títulos do padrão 2026 (PROPOSTA e OM ENTREGA): a casa usa os
  // mesmos nomes em todo papel.
  "PROPOSTA",
  "VALOR (R$)",
  "OM\nENTREGA",
  "OBSERVAÇÃO",
];

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[6.5pt] leading-tight font-bold tracking-wide text-[#8A8A93] uppercase">
      {children}
    </p>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="border-b border-[#E4E5EA] pt-0.5 pb-1">
      <Rotulo>{rotulo}</Rotulo>
      <p className="min-h-[11pt] text-[8.5pt] leading-snug text-[#2B2B2B]">{valor || " "}</p>
    </div>
  );
}

export function Folha({ boletim, itens }: { boletim: BoletimAtual; itens: ItemDoBoletim[] }) {
  const aberto = boletim.situacao === "aberto";

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Cabecalho
          titulo={`${boletim.numero} · papel`}
          resumo={
            aberto
              ? "Prévia: o boletim ainda está em medição, e o papel sai marcado como prévia e sem data de emissão."
              : 'Para PDF, escolha "Salvar como PDF" na janela de impressão. A folha é A4 deitada, como o modelo.'
          }
          acoes={
            <>
              <Link href={`/boletins/${boletim.id}`} className={ESTILO_BOTAO.discreto}>
                Voltar ao boletim
              </Link>
              <Imprimir rotulo="Imprimir / PDF" orientacao="landscape" />
            </>
          }
        />
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <PapelDoBoletim boletim={boletim} itens={itens} />
      </div>
    </div>
  );
}

/**
 * Só o papel, sem a moldura da página: o do modelo do boletim. É o mesmo na
 * folha de um boletim e no lote de uma regional (`/boletins/lote`), onde vêm
 * vários, um por página — e aí sem `id`, que a regra de impressão procura o
 * `#folha` de quem os embrulha.
 */
export function PapelDoBoletim({
  boletim,
  itens,
  id = "folha",
}: {
  boletim: BoletimAtual;
  itens: ItemDoBoletim[];
  id?: string;
}) {
  const aberto = boletim.situacao === "aberto";
  const total = itens.reduce((t, i) => t + i.valor, 0);
  const vazias = Math.max(0, LINHAS_NO_PAPEL - itens.length);
  const contatoCliente = [boletim.contato, boletim.email].filter(Boolean).join(" — ");
  const emissao = boletim.fechado_em ? dataCurta(boletim.fechado_em) : "";

  return boletim.modelo === "rio_mais" || boletim.modelo === "aguas" ? (
    <Papel2026 boletim={boletim} itens={itens} variante={boletim.modelo} id={id} />
  ) : (
    <div
      id={id}
      className="mx-auto w-[277mm] min-w-[277mm] border border-[#2B2B2B] bg-white px-[3mm] pt-[2mm] pb-[1mm] font-sans text-[#2B2B2B] [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:w-[325mm] print:min-w-0 print:[zoom:0.84]"
    >
      {/* ── Topo: a marca e o título ─────────────────────── */}
      <div className="flex items-start justify-between border-b border-[#2D3560] pb-[1.5mm]">
        <Image
          src="/medicoes/logo-acao.png"
          alt="Ação Vendas e Serviços"
          width={263}
          height={120}
          priority
          className="h-[12mm] w-auto"
        />
        <div className="relative text-right">
          <p className="text-[20pt] leading-tight font-bold text-[#2D3560]">
            BOLETIM DE MEDIÇÃO
          </p>
          <p className="text-[10pt] font-bold text-[#8A8A93]">MANUTENÇÃO DE EQUIPAMENTOS</p>
          {aberto && (
            <p className="absolute top-0 right-full mr-4 border-2 border-[#C0392B] px-2 py-0.5 text-[8pt] font-bold whitespace-nowrap text-[#C0392B]">
              PRÉVIA — EM MEDIÇÃO
            </p>
        )}
      </div>
    </div>

    {/* ── As três caixas ───────────────────────────────── */}
    <table className="mt-[2mm] w-full border-collapse text-center">
      <colgroup>
        <col style={{ width: largura(COLUNAS[0] + COLUNAS[1]) }} />
        <col style={{ width: largura(COLUNAS[2] + COLUNAS[3] + COLUNAS[4] + COLUNAS[5]) }} />
        <col />
      </colgroup>
      <tbody>
        <tr className="bg-[#F6F7F9]">
          {["DOCUMENTO Nº", "MÊS DE REFERÊNCIA", "DATA DE EMISSÃO"].map((r) => (
            <td key={r} className="border border-[#2B2B2B] py-[0.5mm]">
              <Rotulo>{r}</Rotulo>
            </td>
          ))}
        </tr>
        <tr className="bg-[#F6F7F9]">
          <td className="border border-[#2B2B2B] py-[1mm] text-[10pt] font-semibold">
            {documentoDoBoletim(boletim)}
          </td>
          <td className="border border-[#2B2B2B] py-[1mm] text-[10pt] font-semibold">
            {boletim.referencia ?? ""}
          </td>
          <td className="border border-[#2B2B2B] py-[1mm] text-[10pt] font-semibold">
            {emissao}
          </td>
        </tr>
      </tbody>
    </table>

    {/* ── Fornecedor e cliente ─────────────────────────── */}
    <p className="mt-[2.5mm] text-[8pt] font-bold text-[#2D3560]">
      DADOS DO FORNECEDOR E DO CLIENTE
    </p>
    <div className="grid grid-cols-[1fr_1fr] gap-x-[9%]">
      <div>
        <Dado rotulo="Fornecedor" valor={FORNECEDOR.nome} />
        <Dado rotulo="Contato / e-mail" valor={FORNECEDOR.contato} />
        <Dado rotulo="Telefone" valor={FORNECEDOR.telefone} />
        <Dado rotulo="Base / fiscalização" valor={boletim.base} />
      </div>
      <div>
        <Dado rotulo="Cliente" valor={boletim.cliente} />
        <Dado rotulo="Contato / e-mail" valor={contatoCliente} />
        <Dado rotulo="Telefone" valor={boletim.telefone} />
        <Dado rotulo="Local da obra" valor={boletim.local_obra} />
      </div>
    </div>

    {/* ── As OMs ───────────────────────────────────────── */}
    <table className="mt-[2.5mm] w-full table-fixed border-collapse text-[8pt]">
      <colgroup>
        {COLUNAS.map((c, n) => (
          <col key={n} style={{ width: largura(c) }} />
        ))}
      </colgroup>
      <thead>
        <tr className="bg-[#2D3560] text-white">
          {CABECALHO.map((c) => (
            <th
              key={c}
              className="px-1 py-[1.5mm] text-center text-[7pt] leading-tight font-bold whitespace-pre-line"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {itens.map((i, n) => (
          <tr
            key={i.id}
            className={`h-[5mm] break-inside-avoid ${n % 2 ? "bg-[#FAFAFB]" : "bg-white"}`}
          >
            <td className="border border-[#E4E5EA] text-center text-[#8A8A93]">{n + 1}</td>
            <td className="border border-[#E4E5EA] px-1 leading-tight">{i.equipamento ?? ""}</td>
            <td className="border border-[#E4E5EA] text-center">{i.patrimonio ?? ""}</td>
            <td className="border border-[#E4E5EA] text-center">{dataCurta(dataDaOm(i))}</td>
            {/* Nº OM é a OM de entrada; PROPOSTA, a OM principal do Sisloc. */}
            <td className="border border-[#E4E5EA] text-center">{i.om_retirada ?? ""}</td>
            <td className="border border-[#E4E5EA] text-center">{i.om}</td>
            <td className="border border-[#E4E5EA] px-1 text-right tabular-nums">
              {emReais(i.valor)}
            </td>
            <td className="border border-[#E4E5EA] text-center">{i.recibo_entrega ?? ""}</td>
            <td className="border border-[#E4E5EA] px-1 text-[7pt] leading-tight">
              {i.observacao ?? ""}
            </td>
          </tr>
        ))}
        {Array.from({ length: vazias }, (_, k) => {
          const n = itens.length + k;
          return (
            <tr key={`v${k}`} className={`h-[5mm] ${n % 2 ? "bg-[#FAFAFB]" : "bg-white"}`}>
              <td className="border border-[#E4E5EA] text-center text-[#8A8A93]">{n + 1}</td>
              {COLUNAS.slice(1).map((_, c) => (
                <td key={c} className="border border-[#E4E5EA]" />
              ))}
            </tr>
          );
        })}
        {/* O total é a última linha do corpo, e não um <tfoot>: o
            navegador repete o rodapé da tabela em toda folha, e o total
            apareceria no pé da primeira página como se fosse o fim. */}
        <tr className="h-[7mm] break-inside-avoid bg-[#1F2647] text-[10.5pt] font-bold text-white">
          <td colSpan={6} className="pr-3 text-right">
            TOTAL DA MEDIÇÃO
          </td>
          <td className="pr-1 text-right tabular-nums whitespace-nowrap">{emReais(total)}</td>
          <td colSpan={2} />
        </tr>
      </tbody>
    </table>

    <p className="mt-[2mm] border-y border-[#2B2B2B] py-[1mm] text-[8pt]">
      <span className="font-bold text-[#8A8A93]">Itens lançados:</span>
      <span className="ml-[20mm]">{itens.length}</span>
    </p>

    <div className="mt-[2mm] min-h-[16mm] border-b border-[#2B2B2B] pb-[1mm] break-inside-avoid">
      <p className="text-[8pt] font-bold text-[#2D3560]">OBSERVAÇÕES GERAIS</p>
      <p className="mt-0.5 text-[8.5pt] whitespace-pre-line">{boletim.observacao ?? ""}</p>
    </div>

    <Image
      src="/medicoes/rodape-acao.png"
      alt="Ação é uma empresa do Grupo Nova Opção · www.novaopcaoequipamentos.com.br"
      width={2143}
      height={133}
      className="mt-[1.5mm] h-auto w-[72%]"
    />
  </div>
  );
}
