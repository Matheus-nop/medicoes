"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";
import {
  Aviso,
  Botao,
  CAMPO,
  Campo,
  CartaoIndicador,
  Painel,
  Progresso,
} from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  CATEGORIAS,
  ROTULO_CATEGORIA,
  lerNumero,
  type Categoria,
  type Celula,
  type Periodo,
  type Regiao,
} from "@/lib/medicoes/controle";
import { definirInicio, lancarRecebimentos, type RecebimentoLancado } from "../acoes";

const COR_CATEGORIA: Record<Categoria, string> = {
  manutencao: "bg-cat-manutencao",
  locacao: "bg-cat-locacao",
  indenizacao: "bg-cat-indenizacao",
};

const chave = (regiaoId: number, c: Categoria) => `${regiaoId}:${c}`;
const noCampo = (v: number | null | undefined) =>
  v ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
const valor = (t: string) => lerNumero(t) ?? 0;
const centavo = (v: number) => Math.round(v * 100) / 100;

type Par = { recebido: string; abertura: string };

/**
 * O quadro do recebimento: um cartão por base e, em cada categoria, o a
 * receber que veio (calculado), o faturado no mês (vem do faturamento) e o
 * recebido — o único campo do financeiro. No mês de início aparece também a
 * abertura: o que já estava a receber antes de o sistema acompanhar.
 */
export function GradeDeRecebimento({
  periodo,
  anterior,
  ehInicio,
  regioes,
  celulas,
  podeLancar,
}: {
  periodo: Periodo;
  anterior: string | null;
  ehInicio: boolean;
  regioes: Regiao[];
  celulas: Celula[];
  podeLancar: boolean;
}) {
  const router = useRouter();
  const porChave = useMemo(() => new Map(celulas.map((c) => [chave(c.regiao_id, c.categoria), c])), [celulas]);
  const inicial = useMemo(() => {
    const v: Record<string, Par> = {};
    for (const r of regioes)
      for (const c of CATEGORIAS) {
        const x = porChave.get(chave(r.id, c));
        v[chave(r.id, c)] = { recebido: noCampo(x?.recebido), abertura: noCampo(x?.abertura) };
      }
    return v;
  }, [regioes, porChave]);
  const [valores, setValores] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const veio = (k: string) => Number(porChave.get(k)?.a_receber_anterior ?? 0);
  const faturado = (k: string) => Number(porChave.get(k)?.faturado ?? 0);

  const conta = (ids: number[]) => {
    let a = 0;
    let f = 0;
    let r = 0;
    for (const id of ids)
      for (const c of CATEGORIAS) {
        const k = chave(id, c);
        a += veio(k) + valor(valores[k].abertura);
        f += faturado(k);
        r += valor(valores[k].recebido);
      }
    const total = centavo(a + f);
    return { a: centavo(a), f: centavo(f), r: centavo(r), aReceber: centavo(total - r), fracao: total > 0 ? r / total : null };
  };
  const total = conta(regioes.map((r) => r.id));

  const mudadas: RecebimentoLancado[] = regioes.flatMap((r) =>
    CATEGORIAS.flatMap((c) => {
      const k = chave(r.id, c);
      const a = valores[k];
      const b = inicial[k];
      if (valor(a.recebido) === valor(b.recebido) && valor(a.abertura) === valor(b.abertura)) return [];
      return [{ regiaoId: r.id, categoria: c, recebido: valor(a.recebido), abertura: valor(a.abertura) }];
    }),
  );
  const invalidas = Object.values(valores).filter(
    (p) =>
      (p.recebido.trim() && lerNumero(p.recebido) === null) ||
      (p.abertura.trim() && lerNumero(p.abertura) === null),
  ).length;

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const res = await lancarRecebimentos(periodo.id, mudadas);
      if (!res.ok) {
        setErro(res.erro ?? "Não deu certo.");
        return;
      }
      setRecado(`${res.lancadas} campo(s) lançado(s). O painel já mostra.`);
      router.refresh();
    });
  }

  const entrada = (k: string, campo: keyof Par, rotulo: string) => {
    const t = valores[k][campo];
    const ruim = t.trim() !== "" && lerNumero(t) === null;
    const mudou = valor(t) !== valor(inicial[k][campo]);
    return (
      <input
        value={t}
        onChange={(e) => setValores((v) => ({ ...v, [k]: { ...v[k], [campo]: e.target.value } }))}
        disabled={!podeLancar}
        inputMode="decimal"
        aria-label={rotulo}
        aria-invalid={ruim}
        placeholder="—"
        className={`${CAMPO} h-8 w-full min-w-0 px-2 text-right text-xs tabular-nums disabled:opacity-60 ${
          ruim ? "border-manutencao" : mudou ? "border-acento bg-acento-fraco" : ""
        }`}
      />
    );
  };

  const deOnde = ehInicio ? "Abertura" : anterior ? `A receber de ${anterior.split(" ")[0].toLowerCase()}` : "A receber anterior";

  return (
    <div className="space-y-4">
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}
      {recado && (
        <Aviso tom="ok" aoFechar={() => setRecado(null)}>
          {recado}
        </Aviso>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador
          compacto
          rotulo={ehInicio ? "A receber na abertura" : "A receber anterior"}
          valor={emReais(total.a)}
          detalhe={ehInicio ? "o que já estava em aberto antes" : "vem sozinho do mês anterior"}
        />
        <CartaoIndicador compacto rotulo="Faturado no mês" valor={emReais(total.f)} cor="bg-acento" detalhe="lançado pelo faturamento" />
        <CartaoIndicador compacto rotulo="Recebido no mês" valor={emReais(total.r)} cor="bg-disponivel">
          <Progresso fracao={total.fracao} cor="bg-disponivel" />
        </CartaoIndicador>
        <CartaoIndicador
          compacto
          rotulo="A receber"
          valor={<span className="text-saldo">{emReais(total.aReceber)}</span>}
          cor="bg-saldo"
          detalhe="passa para o mês seguinte"
        />
      </div>

      <Painel
        titulo={`Recebimentos de ${periodo.rotulo}`}
        descricao={
          ehInicio
            ? "Mês de início: informe em Abertura o que cada base já tinha a receber, e o recebido no mês."
            : `${deOnde} + faturado no mês − recebido = a receber, base a base.`
        }
        acoes={
          podeLancar ? (
            <>
              <Botao variante="discreto" onClick={() => setValores(inicial)} disabled={salvando || mudadas.length === 0}>
                Desfazer
              </Botao>
              <Botao variante="primario" onClick={salvar} disabled={salvando || mudadas.length === 0 || invalidas > 0}>
                {salvando ? "Salvando…" : mudadas.length ? `Salvar ${mudadas.length} alteração(ões)` : "Nada mudou"}
              </Botao>
            </>
          ) : undefined
        }
      >
        <div className="grid gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-3">
          {regioes.map((r) => {
            const b = conta([r.id]);
            return (
              <section key={r.id} aria-label={r.nome} className="rounded-xl border border-borda bg-superficie p-3 shadow-cartao">
                <header className="flex items-baseline gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{r.nome}</h3>
                  <span className="text-[11px] text-texto-3">a receber</span>
                  <span className="text-sm font-semibold text-saldo tabular-nums">{emReais(b.aReceber)}</span>
                </header>
                <Progresso fracao={b.fracao} cor="bg-disponivel" />
                <div className="mt-3 grid grid-cols-[minmax(0,5.5rem)_minmax(0,6rem)_minmax(0,6rem)_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
                  <span />
                  <span className="text-right text-[11px] text-texto-3">{deOnde}</span>
                  <span className="text-right text-[11px] text-texto-3">Faturado</span>
                  <span className="text-right text-[11px] text-texto-3">Recebido</span>
                  {CATEGORIAS.map((c) => {
                    const k = chave(r.id, c);
                    const v = veio(k);
                    const f = faturado(k);
                    return (
                      <Fragment key={c}>
                        <span className="flex items-center gap-1.5 truncate text-texto-2">
                          <span className={`size-2 shrink-0 rounded-full ${COR_CATEGORIA[c]}`} />
                          {ROTULO_CATEGORIA[c]}
                        </span>
                        {ehInicio ? (
                          entrada(k, "abertura", `${ROTULO_CATEGORIA[c]} abertura — ${r.nome}`)
                        ) : (
                          <span className={`truncate text-right tabular-nums ${v ? "font-medium" : "text-texto-3"}`}>
                            {v ? emReais(v) : "—"}
                          </span>
                        )}
                        <span className={`truncate text-right tabular-nums ${f ? "" : "text-texto-3"}`}>
                          {f ? emReais(f) : "—"}
                        </span>
                        {entrada(k, "recebido", `${ROTULO_CATEGORIA[c]} recebido — ${r.nome}`)}
                      </Fragment>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </Painel>
    </div>
  );
}

/** O mês em que o recebimento do cliente passa a ser acompanhado. */
export function DefinirInicio({
  cliente,
  inicio,
  rotuloDoInicio,
  podeLancar,
  sugestao,
}: {
  cliente: string;
  inicio: string | null;
  rotuloDoInicio: string | null;
  podeLancar: boolean;
  sugestao: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(!inicio);
  const [mes, setMes] = useState(inicio?.slice(0, 7) ?? sugestao);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  if (!aberto) {
    return (
      <p className="text-xs text-texto-2">
        Recebimento acompanhado desde <strong>{rotuloDoInicio}</strong>.{" "}
        {podeLancar && (
          <button type="button" onClick={() => setAberto(true)} className="font-semibold text-acento underline">
            Mudar o início
          </button>
        )}
      </p>
    );
  }
  if (!podeLancar) {
    return <p className="text-xs text-texto-2">O financeiro ainda não definiu o início do acompanhamento.</p>;
  }
  return (
    <Painel
      titulo="Início do acompanhamento"
      descricao="Antes deste mês o recebimento não conta — o histórico não tem o que foi pago. No mês de início, informe por base o que já estava a receber."
    >
      <form
        className="flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          iniciar(async () => {
            const res = await definirInicio(cliente, mes);
            if (!res.ok) {
              setErro(res.erro ?? "Não deu certo.");
              return;
            }
            setAberto(false);
            router.refresh();
          });
        }}
      >
        <Campo rotulo="Acompanhar a partir de">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={CAMPO} />
        </Campo>
        <Botao type="submit" variante="primario" disabled={salvando || !mes}>
          Definir
        </Botao>
        {inicio && (
          <Botao type="button" variante="discreto" onClick={() => setAberto(false)}>
            Cancelar
          </Botao>
        )}
        {erro && <p className="w-full text-xs text-manutencao">{erro}</p>}
      </form>
    </Painel>
  );
}
