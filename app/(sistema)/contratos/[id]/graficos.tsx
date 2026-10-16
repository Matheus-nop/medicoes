import { emReais } from "@/lib/medicoes/dinheiro";
import { mesCurtoDe, mesesEntre, type Ciclo, type Projecao } from "@/lib/medicoes/contratos";

// Os gráficos do contrato, no mesmo feitio dos do controle: SVG desenhado
// aqui, as cores do tema, o número exato no <title> de cada mês.

/** "R$ 1,6M", "R$ 340k" — o eixo não tem lugar para centavo. */
function curto(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (a >= 1e3) return `R$ ${Math.round(v / 1e3).toLocaleString("pt-BR")}k`;
  return `R$ ${Math.round(v)}`;
}

/** "mar/27" no eixo. */
const noEixo = (m: string) => mesCurtoDe(m).replace(/\/(\d{2})(\d{2})$/, "/$2");

function Legenda({ cor, tracejada, children }: { cor: string; tracejada?: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={tracejada ? `h-0 w-3 border-t-2 border-dashed ${cor}` : `size-2.5 rounded-sm ${cor}`} />
      {children}
    </span>
  );
}

const W = 640;
const H = 250;
const PL = 58;
const PR = 20;
const PT = 14;
const PB = 30;
const IW = W - PL - PR;
const IH = H - PT - PB;

function Grade({ max }: { max: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((k) => {
        const yy = PT + IH - (IH * k) / 4;
        return (
          <g key={k}>
            <line x1={PL} x2={W - PR} y1={yy} y2={yy} stroke="var(--borda)" strokeWidth={1} />
            <text x={PL - 8} y={yy + 3} textAnchor="end" fontSize={10} fill="var(--texto-3)">
              {curto((max * k) / 4)}
            </text>
          </g>
        );
      })}
    </>
  );
}

/**
 * O consumo do ciclo: medido e faturado acumulados contra o valor, e a
 * projeção do medido no ritmo dos últimos meses até o fim do ciclo. Onde a
 * linha tracejada cruza o valor é onde o contrato acaba.
 */
export function GraficoDoConsumo({ ciclo, projecao }: { ciclo: Ciclo; projecao: Projecao | null }) {
  const comDado = ciclo.meses.filter((m) => m.medido || m.faturado);
  const ultimoDado = comDado.length ? comDado[comDado.length - 1].mes : null;
  const ate = ultimoDado && ultimoDado > ciclo.fim ? ultimoDado : ciclo.fim;
  const meses = mesesEntre(ciclo.inicio, ate);
  if (meses.length === 0) return null;
  const doMes = new Map(ciclo.meses.map((m) => [m.mes, m]));
  const serie = meses.reduce<{ mes: string; medido: number; faturado: number; noMes?: (typeof ciclo.meses)[number] }[]>(
    (t, mes) => {
      const m = doMes.get(mes);
      const antes = t[t.length - 1];
      // O faturado antes do sistema entra no começo das duas linhas: elas medem
      // o consumo contra o teto, e esse dinheiro já saiu dele.
      const base = antes ?? { medido: ciclo.antes, faturado: ciclo.antes };
      return [...t, { mes, medido: base.medido + (m?.medido ?? 0), faturado: base.faturado + (m?.faturado ?? 0), noMes: m }];
    },
    [],
  );
  const corte = ultimoDado ? meses.indexOf(ultimoDado) : -1;
  const real = serie.slice(0, corte + 1);
  // A projeção sai do último mês com medido e anda no ritmo até o fim do eixo.
  const ritmo = projecao?.ritmo ?? null;
  const projetada =
    ritmo && corte >= 0 && corte < meses.length - 1
      ? serie.slice(corte).map((s, i) => ({ mes: s.mes, i: corte + i, v: serie[corte].medido + ritmo * i }))
      : [];
  const max =
    Math.max(ciclo.teto ?? 0, ...serie.map((s) => s.medido), ...projetada.map((p) => p.v), 1) * 1.08;
  const x = (i: number) => PL + (meses.length <= 1 ? IW / 2 : (IW * i) / (meses.length - 1));
  const y = (v: number) => PT + IH - (Math.min(max, Math.max(0, v)) / max) * IH;
  const linha = (pts: { i: number; v: number }[]) =>
    pts.map((p, k) => `${k ? "L" : "M"} ${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const passo = Math.ceil(meses.length / 12);

  return (
    <div className="px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Consumo do valor do ciclo" className="w-full">
        <Grade max={max} />
        {meses.map((m, i) =>
          i % passo === 0 || i === meses.length - 1 ? (
            <text key={m} x={x(i)} y={H - PB + 16} textAnchor="middle" fontSize={10} fill="var(--texto-3)">
              {noEixo(m)}
            </text>
          ) : null,
        )}
        {ciclo.teto !== null && (
          <>
            <line x1={PL} x2={W - PR} y1={y(ciclo.teto)} y2={y(ciclo.teto)} stroke="var(--saldo)" strokeWidth={1.6} />
            <text x={W - PR} y={y(ciclo.teto) - 5} textAnchor="end" fontSize={10} fontWeight={600} fill="var(--saldo)">
              {ciclo.valor !== null ? "valor global" : "saldo informado + faturado"} · {curto(ciclo.teto)}
            </text>
          </>
        )}
        {projetada.length > 1 && (
          <path
            d={linha(projetada)}
            fill="none"
            stroke="var(--acento)"
            strokeWidth={1.6}
            strokeDasharray="5 4"
            opacity={0.8}
          />
        )}
        {real.length > 0 && (
          <>
            <path
              d={linha(real.map((s, i) => ({ i, v: s.medido })))}
              fill="none"
              stroke="var(--acento)"
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
            <path
              d={linha(real.map((s, i) => ({ i, v: s.faturado })))}
              fill="none"
              stroke="var(--disponivel)"
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
          </>
        )}
        {serie.map((s, i) => (
          <g key={s.mes}>
            {i <= corte && (
              <>
                <circle cx={x(i)} cy={y(s.medido)} r={2.6} fill="var(--acento)" stroke="var(--superficie)" strokeWidth={1.2} />
                <circle cx={x(i)} cy={y(s.faturado)} r={2.6} fill="var(--disponivel)" stroke="var(--superficie)" strokeWidth={1.2} />
              </>
            )}
            <rect x={x(i) - IW / meses.length / 2} y={PT} width={IW / meses.length} height={IH} fill="transparent">
              <title>
                {i <= corte
                  ? `${mesCurtoDe(s.mes)}\nMedido no mês: ${emReais(s.noMes?.medido ?? 0)}\nFaturado no mês: ${emReais(
                      s.noMes?.faturado ?? 0,
                    )}\nMedido acumulado: ${emReais(s.medido)}\nFaturado acumulado: ${emReais(s.faturado)}${
                      ciclo.teto !== null ? `\nSaldo do contrato: ${emReais(ciclo.teto - s.faturado)}` : ""
                    }`
                  : `${mesCurtoDe(s.mes)}${ritmo ? `\nNo ritmo: ${emReais(serie[corte].medido + ritmo * (i - corte))} medido` : ""}`}
              </title>
            </rect>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 px-2 pb-2 text-xs text-texto-2">
        <Legenda cor="bg-acento">Medido acumulado</Legenda>
        <Legenda cor="bg-disponivel">Faturado acumulado</Legenda>
        {ciclo.teto !== null && (
          <Legenda cor="bg-saldo">{ciclo.valor !== null ? "Valor global" : "Saldo informado + faturado no sistema"}</Legenda>
        )}
        {projetada.length > 1 && (
          <Legenda cor="border-acento" tracejada>
            No ritmo dos últimos {projecao?.mesesNaMedia} meses
          </Legenda>
        )}
      </div>
    </div>
  );
}

/** Medido e faturado de cada mês do ciclo, lado a lado. */
export function BarrasDoMes({ ciclo }: { ciclo: Ciclo }) {
  const comDado = ciclo.meses.filter((m) => m.medido || m.faturado);
  if (comDado.length === 0) return <p className="p-4 text-sm text-texto-3">Nenhum mês com medido neste ciclo ainda.</p>;
  const meses = mesesEntre(ciclo.inicio, comDado[comDado.length - 1].mes);
  const doMes = new Map(ciclo.meses.map((m) => [m.mes, m]));
  const max = Math.max(...ciclo.meses.flatMap((m) => [m.medido, m.faturado]), 1) * 1.1;
  const largura = IW / meses.length;
  const barra = Math.max(2, Math.min(14, largura * 0.36));
  const y = (v: number) => PT + IH - (Math.max(0, v) / max) * IH;
  const passo = Math.ceil(meses.length / 12);

  return (
    <div className="px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Medido e faturado por mês" className="w-full">
        <Grade max={max} />
        {meses.map((mes, i) => {
          const m = doMes.get(mes);
          const cx = PL + largura * (i + 0.5);
          return (
            <g key={mes}>
              <rect x={cx - barra} y={y(m?.medido ?? 0)} width={barra} height={PT + IH - y(m?.medido ?? 0)} rx={1.5} fill="var(--acento)" />
              <rect x={cx} y={y(m?.faturado ?? 0)} width={barra} height={PT + IH - y(m?.faturado ?? 0)} rx={1.5} fill="var(--disponivel)" />
              {(i % passo === 0 || i === meses.length - 1) && (
                <text x={cx} y={H - PB + 16} textAnchor="middle" fontSize={10} fill="var(--texto-3)">
                  {noEixo(mes)}
                </text>
              )}
              <rect x={cx - largura / 2} y={PT} width={largura} height={IH} fill="transparent">
                <title>{`${mesCurtoDe(mes)}\nMedido: ${emReais(m?.medido ?? 0)}\nFaturado: ${emReais(m?.faturado ?? 0)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-4 px-2 pb-2 text-xs text-texto-2">
        <Legenda cor="bg-acento">Medido no mês</Legenda>
        <Legenda cor="bg-disponivel">Faturado no mês</Legenda>
      </div>
    </div>
  );
}
