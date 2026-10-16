import { CartaoDoQuadro, ProgressoDuplo, Selo } from "@/components/ui";
import {
  CONSUMO_DE_ATENCAO,
  ROTULO_SITUACAO_CONTRATO,
  TOM_SITUACAO_CONTRATO,
  alertasDoContrato,
  consumoDoContrato,
  dataDoContrato,
  diasEntre,
  saldoDoContrato,
  situacaoDoContrato,
  type ContratoAtual,
} from "@/lib/medicoes/contratos";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";

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
  const conta = saldoDoContrato(c);
  const ciclo = c.ciclos && c.ciclos.length > 1 && c.ciclo ? `Ciclo ${c.ciclo.n} · ` : "";
  // Vermelho só no que ainda corre: o encerrado já não tem o que fazer.
  const vermelho = consumo !== null && consumo >= CONSUMO_DE_ATENCAO && s !== "encerrado";
  return (
    <CartaoDoQuadro
      href={`/contratos/${c.id}`}
      titulo={c.numero}
      subtitulo={
        [comCliente ? c.cliente : null, c.regioes?.length ? c.regioes.join(", ") : null, c.objeto]
          .filter(Boolean)
          .join(" · ") || undefined
      }
      selo={<Selo tom={TOM_SITUACAO_CONTRATO[s]}>{ROTULO_SITUACAO_CONTRATO[s]}</Selo>}
      linhas={[
        {
          rotulo: "Vigência",
          valor:
            s === "encerrado"
              ? `encerrado em ${dataDoContrato(c.encerrado_em)}`
              : `${ciclo}até ${dataDoContrato(c.vigencia_atual)}${faltam >= 0 && s !== "a_iniciar" ? ` · ${faltam} dia(s)` : ""}`,
        },
        {
          rotulo: ciclo ? "Valor do ciclo" : "Valor global",
          valor:
            c.valor_atual !== null
              ? emReais(c.valor_atual)
              : c.saldo_conferido != null
                ? "não informado"
                : "por preço unitário",
        },
        ...(conta && c.ciclo?.conferido
          ? [
              { rotulo: `Saldo conferido (${mesCurto(c.ciclo.conferido.ate)})`, valor: emReais(c.ciclo.conferido.valor) },
              {
                rotulo: "Faturado depois",
                valor: emReais(
                  c.ciclo.meses.filter((m) => m.mes > c.ciclo!.conferido!.ate).reduce((t, m) => t + m.faturado, 0),
                ),
              },
              { rotulo: "Medido a faturar", valor: emReais(conta.aFaturar) },
            ]
          : conta
          ? [
              { rotulo: "Faturado", valor: emReais(conta.faturado) },
              { rotulo: "Medido a faturar", valor: emReais(conta.aFaturar) },
            ]
          : [{ rotulo: `Medido${c.medido_ate ? ` até ${mesCurto(c.medido_ate)}` : ""}`, valor: emReais(c.medido) }]),
      ]}
      destaque={(() => {
        const saldo = conta ? conta.saldo : c.valor_atual === null ? null : c.valor_atual - c.medido;
        if (saldo === null) return undefined;
        return { rotulo: saldo < 0 ? "Faturado além do valor" : "Saldo do contrato", valor: emReais(Math.abs(saldo)) };
      })()}
      fracao={consumo === null ? undefined : consumo}
      corDaBarra={vermelho ? "bg-manutencao" : "bg-disponivel"}
      barra={
        conta && c.valor_atual ? (
          // Faturado é o valor menos o saldo: conta o que saiu antes do sistema.
          <ProgressoDuplo
            primeira={(c.valor_atual - conta.saldo) / c.valor_atual}
            segunda={conta.aFaturar / c.valor_atual}
            corSegunda={vermelho ? "bg-manutencao" : "bg-acento"}
            titulo={`${emPorcento((c.valor_atual - conta.saldo) / c.valor_atual)} faturado · ${emPorcento(consumo)} consumido`}
          />
        ) : undefined
      }
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
