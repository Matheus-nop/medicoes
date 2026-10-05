import Link from "next/link";
import {
  Cabecalho,
  CartaoDoQuadro,
  CartaoIndicador,
  ESTILO_BOTAO,
  Painel,
  Progresso,
  Selo,
  Vazio,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ordemDaReferencia, rotuloDaReferencia } from "@/lib/medicoes/arquivo";
import { acharBase, type Base } from "@/lib/medicoes/bases";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  ROTULO_SITUACAO,
  TOM_SITUACAO,
  chaveDoCliente,
  documentoDoBoletim,
  situacaoLida,
  type BoletimAtual,
} from "@/lib/medicoes/medicoes";
import { chaveDaPasta, pastasPorBase } from "@/lib/medicoes/pastas";
import { dataCurta, periodo } from "../../formato";
import { CartaoDoAberto } from "../abertos/quadro";
import { lerAbertos } from "../abertos/dados";

export const dynamic = "force-dynamic";

/**
 * A pasta da base: os boletins de um cliente numa base, em cima os abertos —
 * o que ainda recebe OM, com o que pede antes de fechar — e embaixo os
 * apresentados, mês a mês. Os outros nomes da base (0017) caem aqui também.
 */
export default async function PastaDaBase({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; base?: string }>;
}) {
  const q = await searchParams;
  const cliente = (q.cliente ?? "").trim();
  const nomeDaBase = (q.base ?? "").trim();
  const supabase = await createClient();
  const hoje = new Date();
  const [boletins, abertosLidos] = await Promise.all([
    supabase.from("boletins_atual").select("*"),
    lerAbertos(supabase, hoje),
  ]);
  if (boletins.error) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar a base</p>
        <p className="mt-1 text-sm text-texto-2">{boletins.error.message}</p>
      </div>
    );
  }
  const bases: Base[] = abertosLidos.bases;
  const chave = chaveDaPasta({ cliente, base: nomeDaBase }, bases);
  const daPasta = ((boletins.data ?? []) as BoletimAtual[])
    .map((b) => ({ ...b, situacao: situacaoLida(b.situacao), valor: Number(b.valor), faturado: Number(b.faturado) }))
    .filter((b) => chaveDoCliente(b.cliente) === chaveDoCliente(cliente) && chaveDaPasta(b, bases) === chave);
  const pasta = pastasPorBase(daPasta, bases)[0];
  const cadastro = acharBase(bases, cliente, nomeDaBase);
  const voltar = (
    <Link href="/" className={ESTILO_BOTAO.discreto}>
      Voltar às medições
    </Link>
  );

  if (!pasta) {
    return (
      <div className="space-y-5">
        <Cabecalho titulo={nomeDaBase || "Base"} resumo={cliente} acoes={voltar} />
        <Vazio>Nenhum boletim desta base ainda.</Vazio>
      </div>
    );
  }

  const abertos = abertosLidos.abertos.filter((b) => pasta.boletins.some((x) => x.id === b.id));
  const apresentados = pasta.boletins.filter((b) => b.situacao !== "aberto");
  const meses = [...new Set(apresentados.map((b) => ordemDaReferencia(b.referencia)))].sort((a, b) =>
    a === 0 ? 1 : b === 0 ? -1 : b - a,
  );
  const outrosNomes = [
    ...new Set(pasta.boletins.map((b) => b.base?.trim()).filter((n): n is string => !!n && n !== pasta.nome)),
  ];

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo={pasta.nome}
        resumo={[
          pasta.cliente,
          pasta.regional ? `Regional ${pasta.regional}` : "sem regional no cadastro",
          cadastro?.responsavel ? `Responsável: ${cadastro.responsavel}` : null,
          cadastro?.local_obra || null,
        ]
          .filter(Boolean)
          .join(" · ")}
        acoes={
          <>
            {voltar}
            <Link href={`/clientes/ficha?nome=${encodeURIComponent(pasta.cliente)}`} className={ESTILO_BOTAO.contorno}>
              Arquivo do cliente
            </Link>
            {apresentados.length > 0 && (
              <Link
                href={`/boletins/lote?base=${encodeURIComponent(pasta.nome)}`}
                className={ESTILO_BOTAO.contorno}
                title="Os papéis dos boletins fechados, enviados ou faturados desta base, um por página"
              >
                PDF de todos ({apresentados.length})
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador
          compacto
          rotulo="Em aberto"
          valor={emReais(pasta.emMedicao, false)}
          detalhe={`${pasta.abertos} BM(s) recebendo OM`}
          cor="bg-acento"
        />
        <CartaoIndicador
          compacto
          rotulo="Medido"
          valor={emReais(pasta.medido, false)}
          detalhe={`${apresentados.length} BM(s) apresentado(s)`}
          cor="bg-expedicao"
        />
        <CartaoIndicador compacto rotulo="Faturado" valor={emReais(pasta.faturado, false)} cor="bg-disponivel">
          <Progresso fracao={pasta.medido > 0 ? pasta.faturado / pasta.medido : null} cor="bg-disponivel" />
        </CartaoIndicador>
        <CartaoIndicador
          compacto
          rotulo="Saldo a faturar"
          valor={<span className="text-saldo">{emReais(pasta.saldo, false)}</span>}
          detalhe="medido e ainda não faturado"
          cor="bg-manutencao"
        />
      </div>

      {outrosNomes.length > 0 && (
        <p className="text-xs text-texto-3">Nesta pasta também os boletins com o nome {outrosNomes.join(", ")}.</p>
      )}

      <Painel
        titulo={`Em aberto · ${abertos.length}`}
        descricao="Recebendo OMs até o fechamento. Cada cartão diz o que pede antes de fechar."
      >
        {abertos.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {abertos.map((b) => (
              <CartaoDoAberto
                key={b.id}
                b={b}
                oms={abertosLidos.oms.get(b.id)}
                comCliente={false}
                hoje={hoje.toISOString()}
              />
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-texto-3">
            Nenhum BM aberto nesta base. A próxima colagem do Sisloc com ela abre o seguinte.
          </p>
        )}
      </Painel>

      {meses.map((m) => {
        const doMes = apresentados.filter((b) => ordemDaReferencia(b.referencia) === m);
        return (
          <Painel
            key={m}
            titulo={rotuloDaReferencia(m)}
            descricao={`${doMes.length} BM(s) · ${doMes.reduce((t, b) => t + b.oms, 0)} OM(s)`}
            acoes={
              <span className="text-sm font-semibold tabular-nums">
                {emReais(doMes.reduce((t, b) => t + b.valor, 0), false)}
              </span>
            }
          >
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {doMes.map((b) => {
                const faturado = b.situacao === "faturado" ? b.valor : b.faturado;
                return (
                  <CartaoDoQuadro
                    key={b.id}
                    titulo={documentoDoBoletim(b)}
                    subtitulo={`OMs de ${periodo(b.primeira_om, b.ultima_om)}${
                      b.fechado_em ? ` · emitido ${dataCurta(b.fechado_em)}` : ""
                    }`}
                    selo={<Selo tom={TOM_SITUACAO[b.situacao]}>{ROTULO_SITUACAO[b.situacao]}</Selo>}
                    linhas={[
                      { rotulo: "OMs", valor: b.oms },
                      { rotulo: "Valor", valor: emReais(b.valor) },
                      { rotulo: "Faturado", valor: emReais(faturado) },
                    ]}
                    destaque={{ rotulo: "Saldo", valor: emReais(b.valor - faturado) }}
                    fracao={b.valor > 0 ? faturado / b.valor : null}
                    rodape={
                      <>
                        <Link href={`/boletins/${b.id}`} className="font-semibold text-acento underline">
                          Abrir
                        </Link>
                        <Link href={`/boletins/${b.id}/folha`} className="font-semibold text-acento underline">
                          Papel / PDF
                        </Link>
                      </>
                    }
                  />
                );
              })}
            </div>
          </Painel>
        );
      })}
    </div>
  );
}
