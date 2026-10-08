import Image from "next/image";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  FORNECEDOR,
  LINHAS_NO_PAPEL,
  dataDaOm,
  documentoDoBoletim,
  statusDaOm,
  type BoletimAtual,
  type ItemDoBoletim,
} from "@/lib/medicoes/medicoes";
import { dataCurta } from "../../../formato";

/**
 * Os papéis do padrão 2026 — o "BM Manutenção Rio Saneamento padrão 2026" e o
 * "BM Manutenção Águas do Rio padrão 2026". O mesmo desenho: quatro caixas no
 * topo (a quarta é a base, porque o cliente confere por base), os dados do
 * fornecedor e do cliente, as dezesseis linhas mesmo vazias e a faixa do total.
 *
 * O que muda entre os dois são as colunas:
 *
 *   rio_mais — STATUS de cada OM (PENDENTE ou FATURADO, de `om_faturadas`),
 *              e a contagem de pendentes e faturados no pé. Sem recibos.
 *   aguas    — Nº OM (a de entrada), PROPOSTA (a OM principal do Sisloc) e OM
 *              ENTREGA (a de retorno, digitada à mão),
 *              com os títulos que o papel do cliente usa desde setembro/2026;
 *              o TESTE 2 usa os mesmos). Sem status.
 *
 * As proporções são as das colunas B em diante de cada planilha. As cores são
 * as do modelo, não os tokens do sistema: o papel é do cliente.
 */

type Variante = "rio_mais" | "aguas";

const COLUNAS: Record<Variante, number[]> = {
  rio_mais: [8, 62, 20, 16, 14, 22, 20, 42],
  aguas: [6, 59, 20, 15, 15, 19, 19, 19, 33],
};

const CABECALHO: Record<Variante, string[]> = {
  rio_mais: [
    "ITEM",
    "DESCRIÇÃO DO EQUIPAMENTO / SERVIÇO",
    "Nº PATRIMÔNIO",
    "DATA",
    "PROPOSTA",
    "VALOR (R$)",
    "STATUS",
    "OBSERVAÇÃO",
  ],
  aguas: [
    "ITEM",
    "DESCRIÇÃO DO EQUIPAMENTO / SERVIÇO",
    "Nº PATRIMÔNIO",
    "DATA",
    "Nº OM",
    "PROPOSTA",
    "VALOR (R$)",
    "OM\nENTREGA",
    "OBSERVAÇÃO",
  ],
};

const SUBTITULO: Record<Variante, string> = {
  rio_mais: "MANUTENÇÃO DE EQUIPAMENTOS · RIO+ SANEAMENTO",
  aguas: "MANUTENÇÃO DE EQUIPAMENTOS · ÁGUAS DO RIO / AEGEA",
};

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[6.5pt] leading-tight font-bold tracking-wide text-[#8A8A93] uppercase">
      {children}
    </p>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="border-b border-[#D8DBE4] pt-0.5 pb-1">
      <Rotulo>{rotulo}</Rotulo>
      <p className="min-h-[11pt] text-[8.5pt] leading-snug text-[#2B2B2B]">{valor || " "}</p>
    </div>
  );
}

export function Papel2026({
  boletim,
  itens,
  variante,
  id = "folha",
}: {
  boletim: BoletimAtual;
  itens: ItemDoBoletim[];
  variante: Variante;
  /** Vazio no lote: o `#folha` é quem embrulha os vários papéis. */
  id?: string;
}) {
  const colunas = COLUNAS[variante];
  const soma = colunas.reduce((t, c) => t + c, 0);
  const largura = (c: number) => `${((c / soma) * 100).toFixed(2)}%`;
  const comStatus = variante === "rio_mais";
  const aberto = boletim.situacao === "aberto";
  const total = itens.reduce((t, i) => t + i.valor, 0);
  const vazias = Math.max(0, LINHAS_NO_PAPEL - itens.length);
  const contatoCliente = [boletim.contato, boletim.email].filter(Boolean).join(" — ");
  const emissao = boletim.fechado_em ? dataCurta(boletim.fechado_em) : "";
  const faturados = itens.filter((i) => i.faturada).length;
  // "SETEMBRO/2026" no boletim; o padrão 2026 escreve "SETEMBRO / 2026".
  const referencia = (boletim.referencia ?? "").replace(/\s*\/\s*/, " / ");

  const caixas: [string, string][] = [
    ["DOCUMENTO Nº", documentoDoBoletim({ ...boletim, referencia: null })],
    ["MÊS DE REFERÊNCIA", referencia],
    ["DATA DE EMISSÃO", emissao],
    ["BASE / FISCALIZAÇÃO", boletim.base ?? ""],
  ];

  return (
    <div
      id={id}
      className="mx-auto w-[277mm] min-w-[277mm] bg-white px-[4mm] pt-[3mm] pb-[2mm] font-sans text-[#2B2B2B] [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:w-[325mm] print:min-w-0 print:[zoom:0.84]"
    >
      {/* ── Topo: a marca e o título ─────────────────────── */}
      <div className="flex items-center justify-between pb-[2mm]">
        <Image
          src="/medicoes/logo-acao.png"
          alt="Ação Vendas e Serviços"
          width={263}
          height={120}
          priority
          className="h-[13mm] w-auto"
        />
        <div className="relative text-right">
          <p className="text-[21pt] leading-tight font-bold text-[#1F2647]">BOLETIM DE MEDIÇÃO</p>
          <p className="text-[10pt] font-bold text-[#8A8A93]">
            {SUBTITULO[variante]}
          </p>
          {aberto && (
            <p className="absolute top-0 right-full mr-4 border-2 border-[#C0392B] px-2 py-0.5 text-[8pt] font-bold whitespace-nowrap text-[#C0392B]">
              PRÉVIA — EM MEDIÇÃO
            </p>
          )}
        </div>
      </div>

      {/* ── As quatro caixas ─────────────────────────────── */}
      <div className="grid grid-cols-4 gap-[2mm]">
        {caixas.map(([rotulo, valor]) => (
          <div key={rotulo} className="border border-[#D8DBE4] bg-[#F3F5F8] px-[2mm] py-[1.2mm]">
            <Rotulo>{rotulo}</Rotulo>
            <p className="min-h-[13pt] text-[11pt] leading-tight font-bold text-[#16203E]">
              {valor || " "}
            </p>
          </div>
        ))}
      </div>

      {/* ── Fornecedor e cliente ─────────────────────────── */}
      <p className="mt-[3mm] text-[8pt] font-bold text-[#1F2647]">
        DADOS DO FORNECEDOR E DO CLIENTE
      </p>
      <div className="grid grid-cols-[1fr_1fr] gap-x-[6%]">
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
      <table className="mt-[3mm] w-full table-fixed border-collapse text-[8pt]">
        <colgroup>
          {colunas.map((c, n) => (
            <col key={n} style={{ width: largura(c) }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-[#1F2647] text-white">
            {CABECALHO[variante].map((c) => (
              <th
                key={c}
                className="px-1 py-[1.8mm] text-center text-[7.5pt] leading-tight font-bold whitespace-pre-line"
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
              className={`h-[5mm] break-inside-avoid ${n % 2 ? "bg-[#F7F8FB]" : "bg-white"}`}
            >
              <td className="border border-[#D8DBE4] text-center text-[#8A8A93]">{n + 1}</td>
              <td className="border border-[#D8DBE4] px-1 leading-tight">{i.equipamento ?? ""}</td>
              <td className="border border-[#D8DBE4] text-center">{i.patrimonio ?? ""}</td>
              <td className="border border-[#D8DBE4] text-center">{dataCurta(dataDaOm(i))}</td>
              {/* Nº OM é a OM de entrada; PROPOSTA, a OM principal do Sisloc. */}
              {!comStatus && (
                <td className="border border-[#D8DBE4] text-center">{i.om_retirada ?? ""}</td>
              )}
              <td className="border border-[#D8DBE4] text-center">{i.om}</td>
              <td className="border border-[#D8DBE4] px-1 text-center tabular-nums">
                {emReais(i.valor)}
              </td>
              {comStatus ? (
                <td
                  className={`border border-[#D8DBE4] text-center text-[7.5pt] font-bold ${
                    i.faturada ? "text-[#1E7B4A]" : "text-[#2B2B2B]"
                  }`}
                >
                  {statusDaOm(i)}
                </td>
              ) : (
                <td className="border border-[#D8DBE4] text-center">{i.recibo_entrega ?? ""}</td>
              )}
              <td className="border border-[#D8DBE4] px-1 text-[7pt] leading-tight">
                {i.observacao ?? ""}
              </td>
            </tr>
          ))}
          {Array.from({ length: vazias }, (_, k) => {
            const n = itens.length + k;
            return (
              <tr key={`v${k}`} className={`h-[5mm] ${n % 2 ? "bg-[#F7F8FB]" : "bg-white"}`}>
                <td className="border border-[#D8DBE4] text-center text-[#8A8A93]">{n + 1}</td>
                {colunas.slice(1).map((_, c) => (
                  <td key={c} className="border border-[#D8DBE4]" />
                ))}
              </tr>
            );
          })}
          {/* O total no corpo, e não num <tfoot>, pelo mesmo motivo do TESTE 2:
              o rodapé da tabela se repete em toda folha impressa. */}
          <tr className="h-[7mm] break-inside-avoid bg-[#16203E] text-[10.5pt] font-bold text-white">
            <td colSpan={comStatus ? 5 : 6} className="pl-2 text-left">
              TOTAL DA MEDIÇÃO
            </td>
            <td className="px-1 text-center tabular-nums whitespace-nowrap">{emReais(total)}</td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>

      <p className="mt-[2mm] flex gap-[14mm] py-[1mm] text-[8.5pt]">
        <span>
          <span className="font-bold text-[#8A8A93]">Itens lançados:</span>{" "}
          <span className="ml-2">{itens.length}</span>
        </span>
        {comStatus && (
          <>
            <span>
              <span className="font-bold text-[#8A8A93]">Pendentes:</span>{" "}
              <span className="ml-2">{itens.length - faturados}</span>
            </span>
            <span>
              <span className="font-bold text-[#8A8A93]">Faturados:</span>{" "}
              <span className="ml-2">{faturados}</span>
            </span>
          </>
        )}
      </p>

      <div className="mt-[2mm] break-inside-avoid">
        <p className="text-[8pt] font-bold text-[#1F2647]">OBSERVAÇÕES GERAIS</p>
        <p className="mt-0.5 min-h-[16mm] border border-[#D8DBE4] bg-[#F3F5F8] p-[1.5mm] text-[8.5pt] whitespace-pre-line">
          {boletim.observacao ?? ""}
        </p>
      </div>
    </div>
  );
}
