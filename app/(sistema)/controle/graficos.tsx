import { emReais } from "@/lib/medicoes/dinheiro";
import type { LinhaDaRegiao } from "@/lib/medicoes/controle";
import type { TotalDoPeriodo } from "./dados";

// Gráficos em SVG desenhado aqui, sem biblioteca: são duas formas, e uma
// dependência de gráficos pesa mais que o app inteiro. As cores são os tokens
// do tema, e por isso o gráfico troca junto no escuro. O valor exato de cada
// ponto aparece ao passar o mouse (o <title> do SVG) e está na tabela ao lado.

/** "R$ 1,6M", "R$ 340k" — o eixo não tem lugar para centavo. */
function curto(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (a >= 1e3) return `R$ ${Math.round(v / 1e3).toLocaleString("pt-BR")}k`;
  return `R$ ${Math.round(v)}`;
}

/** "Set/26", "Jun-Jul/25" — o rótulo do período no eixo. */
function noEixo(rotulo: string): string {
  const m = /^(.+?)\s+(\d{4})$/.exec(rotulo);
  if (!m) return rotulo;
  const mes = m[1]
    .split("/")
    .map((x) => x.slice(0, 3))
    .join("-");
  return `${mes}/${m[2].slice(2)}`;
}

/**
 * Medido e faturado de cada foto, período a período. Não é soma: cada ponto é
 * a posição daquele mês, e a distância entre as linhas é o saldo em aberto.
 */
export function GraficoEvolucao({
  serie,
  selecionado,
}: {
  serie: TotalDoPeriodo[];
  selecionado: number | null;
}) {
  if (serie.length === 0) {
    return <p className="p-4 text-sm text-texto-3">Nenhum período com valor ainda.</p>;
  }
  const W = 640;
  const H = 260;
  const pl = 58;
  const pr = 26;
  const pt = 14;
  const pb = 30;
  const iw = W - pl - pr;
  const ih = H - pt - pb;
  const max = Math.max(...serie.flatMap((s) => [s.medido, s.faturado]), 1) * 1.08;
  const x = (i: number) => pl + (serie.length <= 1 ? iw / 2 : (iw * i) / (serie.length - 1));
  const y = (v: number) => pt + ih - (Math.max(0, v) / max) * ih;
  const linha = (f: (s: TotalDoPeriodo) => number) =>
    serie.map((s, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(f(s)).toFixed(1)}`).join(" ");
  const area =
    serie.map((s, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(s.medido).toFixed(1)}`).join(" ") +
    " " +
    [...serie]
      .map((s, i) => ({ s, i }))
      .reverse()
      .map(({ s, i }) => `L ${x(i).toFixed(1)} ${y(s.faturado).toFixed(1)}`)
      .join(" ") +
    " Z";
  const passo = serie.length > 12 ? 2 : 1;

  return (
    <div className="px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Medido e faturado por período" className="w-full">
        {[0, 1, 2, 3, 4].map((k) => {
          const yy = pt + ih - (ih * k) / 4;
          return (
            <g key={k}>
              <line x1={pl} x2={W - pr} y1={yy} y2={yy} stroke="var(--borda)" strokeWidth={1} />
              <text x={pl - 8} y={yy + 3} textAnchor="end" fontSize={10} fill="var(--texto-3)">
                {curto((max * k) / 4)}
              </text>
            </g>
          );
        })}
        {serie.map((s, i) =>
          i % passo === 0 || i === serie.length - 1 ? (
            <text
              key={s.periodo_id}
              x={x(i)}
              y={H - pb + 16}
              textAnchor="middle"
              fontSize={10}
              fill={s.periodo_id === selecionado ? "var(--texto)" : "var(--texto-3)"}
              fontWeight={s.periodo_id === selecionado ? 700 : 400}
            >
              {noEixo(s.rotulo)}
            </text>
          ) : null,
        )}
        <path d={area} fill="var(--saldo)" opacity={0.12} />
        <path d={linha((s) => s.medido)} fill="none" stroke="var(--acento)" strokeWidth={2.4} strokeLinejoin="round" />
        <path d={linha((s) => s.faturado)} fill="none" stroke="var(--disponivel)" strokeWidth={2.4} strokeLinejoin="round" />
        {serie.map((s, i) => (
          <g key={s.periodo_id}>
            {s.periodo_id === selecionado && (
              <line x1={x(i)} x2={x(i)} y1={pt} y2={pt + ih} stroke="var(--borda-forte)" strokeDasharray="3 3" />
            )}
            <circle cx={x(i)} cy={y(s.medido)} r={3} fill="var(--acento)" stroke="var(--superficie)" strokeWidth={1.5} />
            <circle cx={x(i)} cy={y(s.faturado)} r={3} fill="var(--disponivel)" stroke="var(--superficie)" strokeWidth={1.5} />
            <rect x={x(i) - iw / serie.length / 2} y={pt} width={iw / serie.length} height={ih} fill="transparent">
              <title>
                {`${s.rotulo}\nMedido: ${emReais(s.medido)}\nFaturado: ${emReais(s.faturado)}\nSaldo: ${emReais(s.saldo)}`}
              </title>
            </rect>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 px-2 pb-2 text-xs text-texto-2">
        <Legenda cor="bg-acento">Medido</Legenda>
        <Legenda cor="bg-disponivel">Faturado</Legenda>
        <Legenda cor="bg-saldo/40">Saldo em aberto</Legenda>
      </div>
    </div>
  );
}

function Legenda({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${cor}`} />
      {children}
    </span>
  );
}

/** O saldo a faturar de cada região no período, do maior para o menor. */
export function BarrasDeSaldo({ linhas }: { linhas: LinhaDaRegiao[] }) {
  if (linhas.length === 0) {
    return <p className="p-4 text-sm text-texto-3">Sem saldo em aberto neste período.</p>;
  }
  const max = Math.max(...linhas.map((l) => l.saldo));
  return (
    <ul className="space-y-2 p-4">
      {linhas.map((l) => (
        <li key={l.regiao} className="grid grid-cols-[7.5rem_1fr_5rem] items-center gap-2 text-xs">
          <span className="truncate text-right text-texto-2" title={l.regiao}>
            {l.regiao}
          </span>
          <span className="h-3.5 overflow-hidden rounded bg-superficie-3">
            <span
              className="block h-full rounded bg-saldo"
              // Largura é dado, não estilo: a única coisa que muda por linha.
              style={{ width: `${Math.max(2, (l.saldo / max) * 100)}%` }}
              title={`Medido ${emReais(l.medido)} · faturado ${emReais(l.faturado)} · saldo ${emReais(l.saldo)}`}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{curto(l.saldo)}</span>
        </li>
      ))}
    </ul>
  );
}
