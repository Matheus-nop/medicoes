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
  soma,
  type Categoria,
  type Celula,
  type Periodo,
  type Regiao,
} from "@/lib/medicoes/controle";
import { abrirPeriodo, criarRegiao, lancar, type CelulaLancada } from "../acoes";

/** Uma linha de `controle_valores`, para o histórico da grade. */
export interface Lancamento {
  id: number;
  regiao_id: number;
  regiao: string;
  categoria: string;
  medido: number;
  faturado: number;
  em: string;
  quem_nome: string;
}

type Par = { medido: string; faturado: string };
type Valores = Record<string, Par>;

const chave = (regiaoId: number, c: Categoria) => `${regiaoId}:${c}`;

const COR_CATEGORIA: Record<Categoria, string> = {
  manutencao: "bg-cat-manutencao",
  locacao: "bg-cat-locacao",
  indenizacao: "bg-cat-indenizacao",
};

/** Como o campo mostra o número: "78.537,00"; zero é vazio. */
const noCampo = (v: number | null | undefined) =>
  v ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

const valor = (t: string) => lerNumero(t) ?? 0;

function dasCelulas(regioes: Regiao[], celulas: Celula[]): Valores {
  const v: Valores = {};
  for (const r of regioes) for (const c of CATEGORIAS) v[chave(r.id, c)] = { medido: "", faturado: "" };
  for (const x of celulas) {
    v[chave(x.regiao_id, x.categoria)] = { medido: noCampo(x.medido), faturado: noCampo(x.faturado) };
  }
  return v;
}

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * O quadro do mês: um cartão por base e, em cada categoria, o saldo que veio
 * do mês anterior (calculado, só leitura) e os dois campos do mês — medido e
 * faturado. O saldo do cartão é anterior + medido − faturado, e é ele que
 * passa para o mês seguinte.
 *
 * Salva só o que mudou — cada campo alterado é um lançamento novo, e o anterior
 * fica no histórico (a tabela é append-only).
 */
export function Grade({
  periodo,
  anterior,
  regioes,
  celulas,
  historico,
}: {
  periodo: Periodo;
  /** O rótulo do mês anterior ("Agosto 2026"), para dizer de onde veio o saldo. */
  anterior: string | null;
  regioes: Regiao[];
  celulas: Celula[];
  historico: Lancamento[];
}) {
  const router = useRouter();
  const inicial = useMemo(() => dasCelulas(regioes, celulas), [regioes, celulas]);
  const [valores, setValores] = useState<Valores>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  // O saldo que veio: é da view, não se digita.
  const veio = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of celulas) m.set(chave(x.regiao_id, x.categoria), Number(x.saldo_anterior ?? 0));
    return m;
  }, [celulas]);
  const veioDe = (k: string) => veio.get(k) ?? 0;

  const mudadas: CelulaLancada[] = regioes.flatMap((r) =>
    CATEGORIAS.flatMap((c) => {
      const k = chave(r.id, c);
      const a = valores[k];
      const b = inicial[k];
      if (valor(a.medido) === valor(b.medido) && valor(a.faturado) === valor(b.faturado)) return [];
      return [{ regiaoId: r.id, categoria: c, medido: valor(a.medido), faturado: valor(a.faturado) }];
    }),
  );
  const invalidas = Object.values(valores).filter(
    (p) =>
      (p.medido.trim() && lerNumero(p.medido) === null) ||
      (p.faturado.trim() && lerNumero(p.faturado) === null),
  ).length;

  // A conta viva de uma base, ou do mês inteiro, com o que está digitado.
  const conta = (ids: number[], cats: Categoria[] = CATEGORIAS) => {
    let a = 0;
    let m = 0;
    let f = 0;
    for (const id of ids) {
      for (const c of cats) {
        const k = chave(id, c);
        a += veioDe(k);
        m += valor(valores[k].medido);
        f += valor(valores[k].faturado);
      }
    }
    return soma(a, m, f);
  };
  const todas = regioes.map((r) => r.id);
  const total = conta(todas);

  function mudar(k: string, campo: keyof Par, texto: string) {
    setValores((v) => ({ ...v, [k]: { ...v[k], [campo]: texto } }));
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const res = await lancar(periodo.id, mudadas);
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
        onChange={(e) => mudar(k, campo, e.target.value)}
        inputMode="decimal"
        aria-label={rotulo}
        aria-invalid={ruim}
        placeholder="—"
        className={`${CAMPO} h-8 w-full min-w-0 px-2 text-right text-xs tabular-nums ${
          ruim ? "border-manutencao" : mudou ? "border-acento bg-acento-fraco" : ""
        }`}
      />
    );
  };

  const deOnde = anterior ? `Saldo de ${anterior.split(" ")[0].toLowerCase()}` : "Saldo anterior";

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

      {/* ── O mês inteiro, ao vivo enquanto se digita ────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoIndicador
          compacto
          rotulo={deOnde}
          valor={emReais(total.anterior)}
          detalhe="vem sozinho do mês anterior"
        />
        <CartaoIndicador compacto rotulo="Medido no mês" valor={emReais(total.medido)} cor="bg-acento" />
        <CartaoIndicador compacto rotulo="Faturado no mês" valor={emReais(total.faturado)} cor="bg-disponivel">
          <Progresso fracao={total.fracao} cor="bg-disponivel" />
        </CartaoIndicador>
        <CartaoIndicador
          compacto
          rotulo="Saldo a faturar"
          valor={<span className="text-saldo">{emReais(total.saldo)}</span>}
          cor="bg-saldo"
          detalhe="passa para o mês seguinte"
        />
      </div>

      <Painel
        titulo={`Medições de ${periodo.rotulo}`}
        descricao={`${deOnde} + medido no mês − faturado no mês = saldo, base a base.`}
        acoes={
          <>
            <Botao
              variante="discreto"
              onClick={() => setValores(inicial)}
              disabled={salvando || mudadas.length === 0}
            >
              Desfazer
            </Botao>
            <Botao
              variante="primario"
              onClick={salvar}
              disabled={salvando || mudadas.length === 0 || invalidas > 0}
            >
              {salvando
                ? "Salvando…"
                : mudadas.length
                  ? `Salvar ${mudadas.length} alteração(ões)`
                  : "Nada mudou"}
            </Botao>
          </>
        }
      >
        {/* ── O quadro: um cartão por base ──────────────────── */}
        <div className="grid gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-3">
          {regioes.map((r) => {
            const b = conta([r.id]);
            const mexida = CATEGORIAS.some((c) => {
              const k = chave(r.id, c);
              return (
                valor(valores[k].medido) !== valor(inicial[k].medido) ||
                valor(valores[k].faturado) !== valor(inicial[k].faturado)
              );
            });
            return (
              <section
                key={r.id}
                aria-label={r.nome}
                className={`rounded-xl border bg-superficie p-3 shadow-cartao ${
                  mexida ? "border-acento" : "border-borda"
                }`}
              >
                <header className="flex items-baseline gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{r.nome}</h3>
                  <span className="text-[11px] text-texto-3">saldo</span>
                  <span className="text-sm font-semibold text-saldo tabular-nums">{emReais(b.saldo)}</span>
                </header>
                <Progresso fracao={b.fracao} cor="bg-disponivel" />
                <div className="mt-3 grid grid-cols-[minmax(0,5.5rem)_minmax(0,6rem)_1fr_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
                  <span />
                  <span className="text-right text-[11px] text-texto-3">{deOnde}</span>
                  <span className="text-right text-[11px] text-texto-3">Medido</span>
                  <span className="text-right text-[11px] text-texto-3">Faturado</span>
                  {CATEGORIAS.map((c) => {
                    const k = chave(r.id, c);
                    const v = veioDe(k);
                    return (
                      <Fragment key={c}>
                        <span className="flex items-center gap-1.5 truncate text-texto-2">
                          <span className={`size-2 shrink-0 rounded-full ${COR_CATEGORIA[c]}`} />
                          {ROTULO_CATEGORIA[c]}
                        </span>
                        <span
                          className={`truncate text-right tabular-nums ${v ? "font-medium text-texto" : "text-texto-3"}`}
                          title="Calculado: o saldo desta categoria no mês anterior"
                        >
                          {v ? emReais(v) : "—"}
                        </span>
                        {entrada(k, "medido", `${ROTULO_CATEGORIA[c]} medido no mês — ${r.nome}`)}
                        {entrada(k, "faturado", `${ROTULO_CATEGORIA[c]} faturado no mês — ${r.nome}`)}
                      </Fragment>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </Painel>

      {historico.length > 0 && (
        <Painel titulo="Últimos lançamentos" descricao="Nada se apaga: o número corrigido fica por cima do antigo.">
          <ul className="divide-y divide-borda text-xs">
            {historico.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-3 px-4 py-1.5">
                <span className="font-medium">{h.regiao}</span>
                <span className="text-texto-2">
                  {ROTULO_CATEGORIA[h.categoria as Categoria] ?? h.categoria}
                </span>
                <span className="tabular-nums">
                  medido {emReais(h.medido)} · faturado {emReais(h.faturado)}
                </span>
                <span className="ml-auto text-texto-3">
                  {quando(h.em)} · {h.quem_nome}
                </span>
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </div>
  );
}

/** Abre o período de um mês — ou o controle de um cliente novo. */
export function NovoPeriodo({ cliente }: { cliente: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(cliente);
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, iniciar] = useTransition();

  return (
    <Painel titulo="Abrir período" descricao="Um por mês. Cliente novo começa aqui também.">
      <form
        className="flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          iniciar(async () => {
            const res = await abrirPeriodo(nome, mes);
            if (!res.ok) {
              setErro(res.erro ?? "Não deu certo.");
              return;
            }
            router.push(
              `/controle/lancar?cliente=${encodeURIComponent(nome.trim())}&periodo=${res.periodoId}`,
            );
          });
        }}
      >
        <Campo rotulo="Cliente" className="min-w-[14rem] flex-1">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value.toUpperCase())}
            className={`${CAMPO} w-full`}
          />
        </Campo>
        <Campo rotulo="Mês">
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className={CAMPO}
          />
        </Campo>
        <Botao type="submit" disabled={abrindo || !nome.trim() || !mes}>
          Abrir
        </Botao>
        {erro && <p className="w-full text-xs text-manutencao">{erro}</p>}
      </form>
    </Painel>
  );
}

/** Uma região (ou base) nova no controle do cliente. */
export function NovaRegiao({ cliente }: { cliente: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [criando, iniciar] = useTransition();

  return (
    <Painel titulo="Nova região" descricao={`Entra no fim da lista de ${cliente}.`}>
      <form
        className="flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          iniciar(async () => {
            const res = await criarRegiao(cliente, nome);
            if (!res.ok) {
              setErro(res.erro ?? "Não deu certo.");
              return;
            }
            setNome("");
            router.refresh();
          });
        }}
      >
        <Campo rotulo="Nome" className="min-w-[14rem] flex-1">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="BAIXADA III"
            className={`${CAMPO} w-full`}
          />
        </Campo>
        <Botao type="submit" disabled={criando || !nome.trim()}>
          Incluir
        </Botao>
        {erro && <p className="w-full text-xs text-manutencao">{erro}</p>}
      </form>
    </Painel>
  );
}
