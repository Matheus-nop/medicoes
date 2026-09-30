import Image from "next/image";
import Link from "next/link";
import { Cabecalho, ESTILO_BOTAO, Vazio } from "@/components/ui";
import { Imprimir } from "@/components/imprimir";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import {
  CATEGORIAS,
  ROTULO_CATEGORIA,
  TODAS,
  historicoDaRegiao,
  resumirPeriodo,
  type Categoria,
  type Celula,
  type LinhaDaRegiao,
} from "@/lib/medicoes/controle";
import type { CargaDoControle } from "../dados";
import { EnviarRelatorio, EscolherBase, EscolherPeriodo } from "../vivo";

// O papel tem as cores dele, e não os tokens do tema: sai igual impresso no
// tema claro e no escuro, como o boletim. São as mesmas das categorias.
const COR: Record<Categoria, string> = {
  manutencao: "bg-[#2F6FB0]",
  locacao: "bg-[#B0862F]",
  indenizacao: "bg-[#9B3B52]",
};
const SALDO = "#C2683B";

/** Quantos períodos a evolução mostra: um ano e pouco cabe na folha. */
const PERIODOS_NA_FOLHA = 13;

function pct(f: number | null) {
  return f === null ? "—" : emPorcento(f);
}

function Caixa({ rotulo, valor, cor = "text-[#16365C]" }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded border border-[#D8DBE4] bg-[#F5F7FA] px-[3mm] py-[2mm]">
      <p className="text-[6.5pt] font-bold tracking-wide text-[#8A8A93] uppercase">{rotulo}</p>
      <p className={`mt-0.5 text-[13pt] leading-tight font-bold tabular-nums ${cor}`}>
        {valor}
      </p>
    </div>
  );
}

/** O saldo de cada período, em barras — a evolução que a tabela detalha. */
function BarrasDoSaldo({ fotos }: { fotos: { rotulo: string; saldo: number; faturado: number; medido: number }[] }) {
  const W = 180;
  const H = 20;
  const max = Math.max(...fotos.map((f) => f.medido), 1);
  const w = W / fotos.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 7}`} className="w-full" role="img" aria-label="Medido e faturado por período">
      {fotos.map((f, i) => {
        const hm = (Math.max(0, f.medido) / max) * H;
        const hf = (Math.max(0, f.faturado) / max) * H;
        return (
          <g key={f.rotulo}>
            <rect x={i * w + w * 0.18} y={H - hm} width={w * 0.64} height={hm} fill={SALDO} opacity={0.35} />
            <rect x={i * w + w * 0.18} y={H - hf} width={w * 0.64} height={hf} fill="#1E7B4A" />
            <text x={i * w + w / 2} y={H + 5.5} fontSize={3} textAnchor="middle" fill="#8A8A93">
              {f.rotulo.replace(/(\S{3})\S*\s+\d{2}(\d{2})/, "$1/$2").replace(/(\S{3})\S*\/(\S{3})\S*/, "$1-$2")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RelatorioDaBase({
  carga,
  historia,
  base,
}: {
  carga: Extract<CargaDoControle, { ok: true }>;
  historia: Celula[];
  base: string;
}) {
  const { cliente, clientes, periodos, serie, periodo, regioes, celulas } = carga;
  const todas = base === TODAS;
  const nomeBase = todas ? "Todas as bases" : `Base ${base}`;

  const barra = (
    <Cabecalho
      titulo="Relatório de medições"
      resumo="Escolha a base e a posição. O PDF sai do botão de imprimir, em A4, e vai anexo no e-mail."
      acoes={
        <Link
          href={`/controle?cliente=${encodeURIComponent(cliente)}${periodo ? `&periodo=${periodo.id}` : ""}`}
          className={ESTILO_BOTAO.discreto}
        >
          Voltar ao painel
        </Link>
      }
    />
  );

  if (!periodo) {
    return (
      <div className="space-y-5">
        {barra}
        <Vazio>Nenhum período lançado ainda.</Vazio>
      </div>
    );
  }

  const r = resumirPeriodo(celulas, regioes);
  const linha: LinhaDaRegiao = todas
    ? { ...r, regiao: TODAS, ordem: 0 }
    : (r.regioes.find((x) => x.regiao === base) ?? { ...resumirPeriodo([]), regiao: base, ordem: 0 });
  // A evolução até a posição escolhida — o futuro não entra no papel de agosto.
  const fotos = historicoDaRegiao(historia, periodos, todas ? undefined : base)
    .filter((f) => f.mes <= periodo.mes)
    .slice(-PERIODOS_NA_FOLHA);
  const gerado = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endereco = `/controle/relatorio?cliente=${encodeURIComponent(cliente)}&periodo=${periodo.id}&base=${encodeURIComponent(base)}`;

  // A primeira coluna é texto à esquerda; o resto é dinheiro à direita.
  const th = "px-[1.5mm] py-[1.2mm] text-right font-bold";
  const th1 = "px-[1.5mm] py-[1.2mm] text-left font-bold";
  const td = "border-b border-[#E4E5EA] px-[1.5mm] py-[0.8mm] text-right tabular-nums whitespace-nowrap";
  const td1 = "border-b border-[#E4E5EA] px-[1.5mm] py-[0.8mm] text-left whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div className="space-y-3 print:hidden">
        {barra}
        <div className="flex flex-wrap items-end gap-2">
          <EscolherPeriodo
            clientes={clientes}
            cliente={cliente}
            periodos={periodos}
            periodoId={periodo.id}
            comValor={serie.map((s) => s.periodo_id)}
          />
          <EscolherBase bases={regioes.map((x) => x.nome)} base={base} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <EnviarRelatorio cliente={cliente} rotulo={periodo.rotulo} linha={linha} endereco={endereco} />
            <Imprimir rotulo="Imprimir / PDF" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <div
          id="folha"
          className="mx-auto w-[186mm] min-w-[186mm] bg-white p-[6mm] font-sans text-[8.5pt] text-[#2B2B2B] shadow-cartao [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:p-0 print:shadow-none"
        >
          {/* ── Topo ───────────────────────────────────────── */}
          <div className="flex items-center justify-between border-b-2 border-[#16365C] pb-[2mm]">
            <Image src="/logo.png" alt="Grupo Nova Opção" width={330} height={100} className="h-[11mm] w-auto" priority />
            <div className="text-right">
              <p className="text-[15pt] leading-tight font-bold text-[#16365C]">
                RELATÓRIO DE MEDIÇÕES
              </p>
              <p className="text-[8.5pt] font-bold text-[#8A8A93] uppercase">
                {cliente} · {nomeBase}
              </p>
            </div>
          </div>
          <p className="mt-[1.5mm] text-[7.5pt] text-[#8A8A93]">
            Posição de <strong className="text-[#2B2B2B]">{periodo.rotulo}</strong> · gerado em {gerado}
          </p>

          {/* ── Os quatro números ──────────────────────────── */}
          <div className="mt-[3mm] grid grid-cols-4 gap-[2mm]">
            <Caixa rotulo="Medido" valor={emReais(linha.medido)} />
            <Caixa rotulo="Faturado" valor={emReais(linha.faturado)} cor="text-[#1E7B4A]" />
            <Caixa rotulo="Saldo a faturar" valor={emReais(linha.saldo)} cor="text-[#C2683B]" />
            <Caixa rotulo="% faturado" valor={pct(linha.fracao)} />
          </div>

          {/* ── Por categoria ──────────────────────────────── */}
          <p className="mt-[4mm] text-[8pt] font-bold text-[#16365C]">
            POR CATEGORIA
          </p>
          <table className="mt-[1mm] w-full border-collapse">
            <thead>
              <tr className="bg-[#16365C] text-[7pt] text-white">
                <th className={th1}>Categoria</th>
                <th className={th}>Medido</th>
                <th className={th}>Faturado</th>
                <th className={th}>Saldo</th>
                <th className={th}>% fat.</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIAS.map((c) => {
                const s = linha.categorias[c];
                return (
                  <tr key={c}>
                    <td className={`${td1} font-semibold`}>
                      <span className={`mr-[1.5mm] inline-block size-[2mm] rounded-full ${COR[c]}`} />
                      {ROTULO_CATEGORIA[c]}
                    </td>
                    <td className={td}>{emReais(s.medido)}</td>
                    <td className={td}>{emReais(s.faturado)}</td>
                    <td className={`${td} font-bold text-[#C2683B]`}>
                      {emReais(s.saldo)}
                    </td>
                    <td className={td}>{pct(s.fracao)}</td>
                  </tr>
                );
              })}
              <tr className="bg-[#F5F7FA] font-bold">
                <td className={td1}>TOTAL</td>
                <td className={td}>{emReais(linha.medido)}</td>
                <td className={td}>{emReais(linha.faturado)}</td>
                <td className={`${td} text-[#C2683B]`}>
                  {emReais(linha.saldo)}
                </td>
                <td className={td}>{pct(linha.fracao)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Por região (só no relatório de todas) ──────── */}
          {todas && (
            <>
              <p className="mt-[4mm] text-[8pt] font-bold text-[#16365C]">
                POR BASE — SALDO A FATURAR
              </p>
              <table className="mt-[1mm] w-full border-collapse">
                <thead>
                  <tr className="bg-[#16365C] text-[7pt] text-white">
                    <th className={th1}>Base</th>
                    {CATEGORIAS.map((c) => (
                      <th key={c} className={th}>
                        {ROTULO_CATEGORIA[c]}
                      </th>
                    ))}
                    <th className={th}>Medido</th>
                    <th className={th}>Faturado</th>
                    <th className={th}>Saldo</th>
                    <th className={th}>% fat.</th>
                  </tr>
                </thead>
                <tbody>
                  {r.regioes.map((x) => (
                    <tr key={x.regiao} className="break-inside-avoid">
                      <td className={`${td1} font-semibold`}>{x.regiao}</td>
                      {CATEGORIAS.map((c) => (
                        <td key={c} className={td}>
                          {x.categorias[c].medido || x.categorias[c].faturado ? emReais(x.categorias[c].saldo) : "—"}
                        </td>
                      ))}
                      <td className={td}>{emReais(x.medido)}</td>
                      <td className={td}>{emReais(x.faturado)}</td>
                      <td className={`${td} font-bold text-[#C2683B]`}>
                        {emReais(x.saldo)}
                      </td>
                      <td className={td}>{pct(x.fracao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── Evolução ───────────────────────────────────── */}
          {fotos.length > 0 && (
            <div className="break-inside-avoid">
              <p className="mt-[4mm] text-[8pt] font-bold text-[#16365C]">
                EVOLUÇÃO — CADA LINHA É A FOTO DAQUELE MÊS (NÃO SOMAR)
              </p>
              <div className="mt-[1mm] grid grid-cols-[1fr] gap-[2mm]">
                <BarrasDoSaldo fotos={fotos} />
                <p className="-mt-[1mm] flex gap-[4mm] text-[6.5pt] text-[#8A8A93]">
                  <span>
                    <span className="mr-1 inline-block size-[2mm] bg-[#C2683B]/35" />
                    medido
                  </span>
                  <span>
                    <span className="mr-1 inline-block size-[2mm] bg-[#1E7B4A]" />
                    faturado
                  </span>
                </p>
              </div>
              <table className="mt-[1.5mm] w-full border-collapse text-[7.5pt]">
                <thead>
                  <tr className="bg-[#16365C] text-[6.5pt] text-white">
                    <th className={th1}>Período</th>
                    {CATEGORIAS.map((c) => (
                      <th key={c} className={th}>
                        Saldo {ROTULO_CATEGORIA[c].toLowerCase()}
                      </th>
                    ))}
                    <th className={th}>Medido</th>
                    <th className={th}>Faturado</th>
                    <th className={th}>Saldo</th>
                    <th className={th}>% fat.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...fotos].reverse().map((f) => (
                    <tr key={f.periodo_id} className={f.periodo_id === periodo.id ? "bg-[#EEF3FA] font-semibold" : ""}>
                      <td className={td1}>{f.rotulo}</td>
                      {CATEGORIAS.map((c) => (
                        <td key={c} className={td}>
                          {f.categorias[c].medido || f.categorias[c].faturado ? emReais(f.categorias[c].saldo) : "—"}
                        </td>
                      ))}
                      <td className={td}>{emReais(f.medido)}</td>
                      <td className={td}>{emReais(f.faturado)}</td>
                      <td className={`${td} font-bold text-[#C2683B]`}>
                        {emReais(f.saldo)}
                      </td>
                      <td className={td}>{pct(f.fracao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-[4mm] border-t border-[#D8DBE4] pt-[1.5mm] text-[6.5pt] text-[#8A8A93]">
            Grupo Nova Opção · Medições e Contratos. Cada período é a foto do saldo em aberto
            naquele mês, acumulada — os meses não se somam.
          </p>
        </div>
      </div>
    </div>
  );
}
