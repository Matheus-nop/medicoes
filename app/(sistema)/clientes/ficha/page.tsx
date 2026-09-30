import Link from "next/link";
import {
  AbasDeLink,
  Cabecalho,
  CartaoDoQuadro,
  CartaoIndicador,
  ESTILO_BOTAO,
  Painel,
  Progresso,
  Selo,
  Vazio,
} from "@/components/ui";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import { boletinsPorBase, type FichaDoCliente } from "@/lib/medicoes/arquivo";
import {
  CATEGORIAS,
  ROTULO_CATEGORIA,
  TODAS,
  faixaDoFaturado,
  resumirPeriodo,
} from "@/lib/medicoes/controle";
import {
  ROTULO_SITUACAO,
  chaveDoCliente,
  documentoDoBoletim,
  type BoletimAtual,
} from "@/lib/medicoes/medicoes";
import { TOM_SITUACAO } from "../../painel";
import { carregarControle } from "../../controle/dados";
import { dataCurta, periodo as periodoDasOms } from "../../formato";
import { carregarClientes } from "../dados";

export const dynamic = "force-dynamic";

type Aba = "manutencao" | "faturamento";

const TOM_FAIXA = { ok: "ok", parcial: "transito", pendente: "aviso", vazio: "neutro" } as const;

/**
 * A ficha de um cliente: a manutenção (os boletins do orçamento, por base) e o
 * faturamento (as medições do painel, por base e mês). Cada boletim abre o
 * papel dele; cada mês abre o relatório — o arquivo digital, que se imprime em
 * PDF quando precisar. Tudo na tela ou em PDF — planilha, não.
 */
export default async function FichaDoCliente({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string; aba?: string }>;
}) {
  const q = await searchParams;
  const nome = (q.nome ?? "").trim();
  const carga = await carregarClientes();
  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o cliente</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
      </div>
    );
  }
  const chave = chaveDoCliente(nome);
  const ficha = carga.fichas.find((f) => f.chave === chave);
  if (!ficha) {
    return (
      <div className="space-y-5">
        <Cabecalho titulo={nome || "Cliente"} />
        <Vazio>
          Nada deste cliente ainda. <Link href="/clientes" className="text-acento underline">Voltar ao arquivo</Link>
        </Vazio>
      </div>
    );
  }

  const boletins = carga.boletins.filter((b) => chaveDoCliente(b.cliente) === chave);
  const temManutencao = boletins.length > 0;
  const temFaturamento = ficha.faturamento !== null;
  const aba: Aba =
    q.aba === "faturamento" && temFaturamento
      ? "faturamento"
      : q.aba === "manutencao" || !temFaturamento
        ? "manutencao"
        : temManutencao
          ? "manutencao"
          : "faturamento";
  const aqui = (a: Aba) => `/clientes/ficha?nome=${encodeURIComponent(ficha.nome)}&aba=${a}`;
  const extrato = `/clientes/extrato?nome=${encodeURIComponent(ficha.nome)}`;

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo={ficha.nome}
        resumo="O arquivo do cliente: cada boletim com o seu papel, cada mês com o seu relatório — na tela, ou em PDF quando precisar."
        acoes={
          <>
            <Link href="/clientes" className={ESTILO_BOTAO.discreto}>
              Todos os clientes
            </Link>
            {temManutencao && (
              <Link href={extrato} className={ESTILO_BOTAO.contorno}>
                Extrato da manutenção (PDF)
              </Link>
            )}
            {temFaturamento && (
              <Link
                href={`/controle/relatorio?cliente=${encodeURIComponent(ficha.faturamento!.cliente)}&base=${TODAS}`}
                className={ESTILO_BOTAO.contorno}
              >
                Relatório do faturamento (PDF)
              </Link>
            )}
          </>
        }
      />

      <AbasDeLink
        rotulo="Parte do arquivo"
        atual={aqui(aba)}
        opcoes={[
          ...(temManutencao
            ? [{ href: aqui("manutencao"), rotulo: "Manutenção · orçamento", contagem: boletins.length }]
            : []),
          ...(temFaturamento ? [{ href: aqui("faturamento"), rotulo: "Faturamento · painel" }] : []),
        ]}
      />

      {aba === "manutencao" ? (
        <Manutencao ficha={ficha} boletins={boletins} />
      ) : (
        <Faturamento cliente={ficha.faturamento!.cliente} />
      )}
    </div>
  );
}

function Manutencao({
  ficha,
  boletins,
}: {
  ficha: FichaDoCliente;
  boletins: BoletimAtual[];
}) {
  const m = ficha.manutencao;
  const fracao = m.medido > 0 ? m.faturado / m.medido : null;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador compacto rotulo="Em medição" valor={emReais(m.emMedicao)} cor="bg-acento" detalhe="boletins abertos" />
        <CartaoIndicador compacto rotulo="Medido" valor={emReais(m.medido)} detalhe={`${m.boletins} boletim(ns) · ${m.bases} base(s)`} />
        <CartaoIndicador compacto rotulo="Faturado" valor={emReais(m.faturado)} cor="bg-disponivel">
          <Progresso fracao={fracao} cor="bg-disponivel" />
        </CartaoIndicador>
        <CartaoIndicador compacto rotulo="Saldo" valor={<span className="text-saldo">{emReais(m.saldo)}</span>} cor="bg-saldo" />
      </div>

      {boletinsPorBase(boletins).map((g) => {
        const valor = g.boletins.filter((b) => b.situacao !== "aberto").reduce((t, b) => t + b.valor, 0);
        return (
          <Painel
            key={g.base}
            titulo={g.base}
            descricao={`${g.boletins.length} boletim(ns) · medido ${emReais(valor)}`}
          >
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {g.boletins.map((b) => {
                const apresentado = b.situacao !== "aberto";
                const faturado = b.situacao === "faturado" ? b.valor : b.faturado;
                return (
                  <CartaoDoQuadro
                    key={b.id}
                    titulo={documentoDoBoletim(b)}
                    subtitulo={`OMs de ${periodoDasOms(b.primeira_om, b.ultima_om)}${
                      b.fechado_em ? ` · emitido ${dataCurta(b.fechado_em)}` : ""
                    }`}
                    selo={<Selo tom={TOM_SITUACAO[b.situacao]}>{ROTULO_SITUACAO[b.situacao]}</Selo>}
                    linhas={[
                      { rotulo: "OMs", valor: `${b.oms}${b.oms_faturadas ? ` (${b.oms_faturadas} faturada(s))` : ""}` },
                      { rotulo: "Valor", valor: emReais(b.valor) },
                      ...(apresentado ? [{ rotulo: "Faturado", valor: emReais(faturado) }] : []),
                    ]}
                    destaque={apresentado ? { rotulo: "Saldo", valor: emReais(b.valor - faturado) } : undefined}
                    fracao={apresentado ? (b.valor > 0 ? faturado / b.valor : null) : undefined}
                    rodape={
                      <>
                        <Link href={`/boletins/${b.id}`} className="font-semibold text-acento underline">
                          Abrir
                        </Link>
                        <Link href={`/boletins/${b.id}/folha`} className="font-semibold text-acento underline">
                          {apresentado ? "Papel / PDF" : "Prévia do papel"}
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

async function Faturamento({ cliente }: { cliente: string }) {
  const carga = await carregarControle(cliente);
  if (!carga.ok || !carga.periodo) {
    return <Vazio>{carga.ok ? "Nenhum período com valor ainda." : carga.erro}</Vazio>;
  }
  const { periodo, serie, regioes, celulas } = carga;
  const r = resumirPeriodo(celulas, regioes);
  const relatorio = (periodoId: number, base: string) =>
    `/controle/relatorio?cliente=${encodeURIComponent(cliente)}&periodo=${periodoId}&base=${encodeURIComponent(base)}`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador compacto rotulo="Medido" valor={emReais(r.medido)} detalhe={`posição de ${periodo.rotulo}`} />
        <CartaoIndicador compacto rotulo="Faturado" valor={emReais(r.faturado)} cor="bg-disponivel">
          <Progresso fracao={r.fracao} cor="bg-disponivel" />
        </CartaoIndicador>
        <CartaoIndicador compacto rotulo="Saldo a faturar" valor={<span className="text-saldo">{emReais(r.saldo)}</span>} cor="bg-saldo" />
        <CartaoIndicador
          compacto
          rotulo="% faturado"
          valor={r.fracao === null ? "—" : emPorcento(r.fracao)}
          detalhe={`${serie.length} mês(es) no arquivo`}
        />
      </div>

      <Painel
        titulo={`Bases em ${periodo.rotulo}`}
        descricao="O saldo de cada base, por categoria. O relatório da base sai em PDF."
        acoes={
          <Link href={relatorio(periodo.id, TODAS)} className="text-xs font-semibold text-acento underline">
            Relatório de todas as bases
          </Link>
        }
      >
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {r.regioes.map((x) => (
            <CartaoDoQuadro
              key={x.regiao}
              titulo={x.regiao}
              selo={
                <Selo tom={TOM_FAIXA[faixaDoFaturado(x.fracao)]}>
                  {x.fracao === null ? "—" : emPorcento(x.fracao)}
                </Selo>
              }
              linhas={CATEGORIAS.filter((c) => x.categorias[c].medido || x.categorias[c].faturado).map((c) => ({
                rotulo: ROTULO_CATEGORIA[c],
                valor: emReais(x.categorias[c].saldo),
              }))}
              destaque={{ rotulo: "Saldo", valor: emReais(x.saldo) }}
              fracao={x.fracao}
              rodape={
                <Link href={relatorio(periodo.id, x.regiao)} className="font-semibold text-acento underline">
                  Relatório / PDF
                </Link>
              }
            />
          ))}
        </div>
      </Painel>

      <Painel
        titulo="Mês a mês"
        descricao="O arquivo dos fechamentos: cada mês abre o relatório daquela foto, pronto para PDF."
      >
        <div className="grid gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {[...serie].reverse().map((s) => {
            const fracao = s.medido > 0 ? s.faturado / s.medido : null;
            return (
              <Link
                key={s.periodo_id}
                href={relatorio(s.periodo_id, TODAS)}
                className={`rounded-lg border p-3 transition-colors hover:border-acento/50 hover:bg-superficie-2 ${
                  s.periodo_id === periodo.id ? "border-acento bg-acento-fraco" : "border-borda bg-superficie"
                }`}
              >
                <p className="text-xs font-semibold">{s.rotulo}</p>
                <p className="mt-1 text-sm font-semibold text-saldo tabular-nums">{emReais(s.saldo, false)}</p>
                <p className="text-[11px] text-texto-3">
                  {fracao === null ? "—" : `${emPorcento(fracao)} faturado`}
                </p>
                <Progresso fracao={fracao} cor="bg-disponivel" />
              </Link>
            );
          })}
        </div>
      </Painel>
    </div>
  );
}
