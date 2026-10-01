import { CartaoDoQuadro, Selo } from "@/components/ui";
import {
  ROTULO_SITUACAO_CONTRATO,
  TOM_SITUACAO_CONTRATO,
  alertasDoContrato,
  consumoDoContrato,
  dataDoContrato,
  diasEntre,
  situacaoDoContrato,
  type ContratoAtual,
} from "@/lib/medicoes/contratos";
import { emReais } from "@/lib/medicoes/dinheiro";

/** "set/2026" — o último mês do controle que entrou no medido. */
export function mesCurto(d: string | null): string {
  if (!d) return "";
  const m = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${m[+d.slice(5, 7) - 1]}/${d.slice(0, 4)}`;
}

/**
 * Um contrato em cartão: a vigência de hoje, o valor, o medido contra ele e o
 * que ele pede. O mesmo cartão no quadro de contratos e na ficha do cliente.
 */
export function CartaoDoContrato({
  c,
  hoje,
  comCliente = true,
}: {
  c: ContratoAtual;
  hoje: string;
  /** Na ficha do cliente o nome dele já está no topo. */
  comCliente?: boolean;
}) {
  const s = situacaoDoContrato(c, hoje);
  const faltam = diasEntre(hoje, c.vigencia_atual);
  const consumo = consumoDoContrato(c);
  const alertas = alertasDoContrato(c, hoje);
  return (
    <CartaoDoQuadro
      href={`/contratos/${c.id}`}
      titulo={c.numero}
      subtitulo={[comCliente ? c.cliente : null, c.objeto].filter(Boolean).join(" · ") || undefined}
      selo={<Selo tom={TOM_SITUACAO_CONTRATO[s]}>{ROTULO_SITUACAO_CONTRATO[s]}</Selo>}
      linhas={[
        {
          rotulo: "Vigência",
          valor:
            s === "encerrado"
              ? `encerrado em ${dataDoContrato(c.encerrado_em)}`
              : `até ${dataDoContrato(c.vigencia_atual)}${faltam >= 0 && s !== "a_iniciar" ? ` · ${faltam} dia(s)` : ""}`,
        },
        { rotulo: "Valor", valor: c.valor_atual === null ? "por preço unitário" : emReais(c.valor_atual) },
        {
          rotulo: `Medido${c.medido_ate ? ` até ${mesCurto(c.medido_ate)}` : ""}`,
          valor: emReais(c.medido),
        },
      ]}
      destaque={
        c.valor_atual === null ? undefined : { rotulo: "Saldo do contrato", valor: emReais(c.valor_atual - c.medido) }
      }
      fracao={consumo === null ? undefined : consumo}
      // Vermelho só no que ainda corre: o encerrado já não tem o que fazer.
      corDaBarra={consumo !== null && consumo >= 0.9 && s !== "encerrado" ? "bg-manutencao" : "bg-disponivel"}
      rodape={
        alertas.length ? (
          <ul className="space-y-0.5">
            {alertas.map((a) => (
              <li key={a.texto} className={a.tom === "aviso" ? "font-medium text-manutencao" : "text-texto-2"}>
                {a.texto}
              </li>
            ))}
          </ul>
        ) : undefined
      }
    />
  );
}
