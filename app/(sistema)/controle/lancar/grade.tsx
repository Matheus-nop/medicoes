"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Aviso, Botao, CAMPO, Campo, Painel } from "@/components/ui";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import {
  CATEGORIAS,
  ROTULO_CATEGORIA,
  lerColagemDoMes,
  lerNumero,
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
 * A grade do período: uma linha por região, medido e faturado de cada
 * categoria. Salva só o que mudou — cada célula alterada é um lançamento novo,
 * e o anterior fica no histórico (a tabela é append-only).
 */
export function Grade({
  periodo,
  regioes,
  celulas,
  anterior,
  historico,
}: {
  periodo: Periodo;
  regioes: Regiao[];
  celulas: Celula[];
  anterior: { rotulo: string; celulas: Celula[] } | null;
  historico: Lancamento[];
}) {
  const router = useRouter();
  const inicial = useMemo(() => dasCelulas(regioes, celulas), [regioes, celulas]);
  const [valores, setValores] = useState<Valores>(inicial);
  const [colando, setColando] = useState(false);
  const [colagem, setColagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

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
    (p) => (p.medido.trim() && lerNumero(p.medido) === null) || (p.faturado.trim() && lerNumero(p.faturado) === null),
  ).length;

  const linha = (r: Regiao) => {
    const m = CATEGORIAS.reduce((t, c) => t + valor(valores[chave(r.id, c)].medido), 0);
    const f = CATEGORIAS.reduce((t, c) => t + valor(valores[chave(r.id, c)].faturado), 0);
    return { m, f };
  };
  const totalCat = (c: Categoria, campo: keyof Par) =>
    regioes.reduce((t, r) => t + valor(valores[chave(r.id, c)][campo]), 0);
  const totalM = CATEGORIAS.reduce((t, c) => t + totalCat(c, "medido"), 0);
  const totalF = CATEGORIAS.reduce((t, c) => t + totalCat(c, "faturado"), 0);

  function mudar(k: string, campo: keyof Par, texto: string) {
    setValores((v) => ({ ...v, [k]: { ...v[k], [campo]: texto } }));
  }

  function aplicarColagem() {
    const { linhas, desconhecidas } = lerColagemDoMes(
      colagem,
      regioes.map((r) => r.nome),
    );
    if (linhas.length === 0) {
      setErro(
        "Não achei nenhuma região na colagem. Copie da planilha as linhas das regiões (a coluna REGIÃO até a de indenização).",
      );
      return;
    }
    const porNome = new Map(regioes.map((r) => [r.nome, r.id]));
    setValores((v) => {
      const novo = { ...v };
      for (const l of linhas) {
        const id = porNome.get(l.regiao)!;
        for (const c of CATEGORIAS) {
          const par = l.valores[c];
          if (!par) continue;
          novo[chave(id, c)] = { medido: noCampo(par.medido), faturado: noCampo(par.faturado) };
        }
      }
      return novo;
    });
    setColando(false);
    setColagem("");
    setErro(null);
    setRecado(
      `${linhas.length} região(ões) preenchida(s) da colagem. Confira e salve.` +
        (desconhecidas.length
          ? ` Ficaram de fora, por não estarem cadastradas: ${desconhecidas.join(", ")}.`
          : ""),
    );
  }

  function partirDoAnterior() {
    if (!anterior) return;
    setValores(dasCelulas(regioes, anterior.celulas));
    setRecado(`Preenchido com a foto de ${anterior.rotulo}. Ajuste o que mudou e salve.`);
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const res = await lancar(periodo.id, mudadas);
      if (!res.ok) {
        setErro(res.erro ?? "Não deu certo.");
        return;
      }
      setRecado(`${res.lancadas} célula(s) lançada(s). O painel já mostra.`);
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
        className={`${CAMPO} h-8 w-28 px-2 text-right text-xs tabular-nums ${
          ruim ? "border-manutencao" : mudou ? "border-acento bg-acento-fraco" : ""
        }`}
      />
    );
  };

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

      <Painel
        titulo={`Medições de ${periodo.rotulo}`}
        descricao="A foto do mês, acumulada: o que está medido e o que está faturado nesta data."
        acoes={
          <>
            {anterior && (
              <Botao variante="discreto" onClick={partirDoAnterior} disabled={salvando}>
                Partir de {anterior.rotulo}
              </Botao>
            )}
            <Botao variante="discreto" onClick={() => setColando((c) => !c)} disabled={salvando}>
              Colar da planilha
            </Botao>
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
        {colando && (
          <div className="space-y-2 border-b border-borda bg-superficie-2 p-4">
            <p className="text-xs text-texto-2">
              Na aba do mês da planilha, selecione das regiões (coluna REGIÃO) até a indenização,
              copie e cole aqui. Saldo e totais que vierem junto são ignorados — são conta.
            </p>
            <textarea
              value={colagem}
              onChange={(e) => setColagem(e.target.value)}
              rows={6}
              placeholder={"NORTE\t24.338,00\t7.732,00\t16.606,00\t92.934,85\t…"}
              className="w-full rounded-lg border border-borda bg-superficie p-2 font-mono text-xs outline-none focus:border-acento"
            />
            <div className="flex gap-2">
              <Botao variante="primario" onClick={aplicarColagem} disabled={!colagem.trim()}>
                Preencher a grade
              </Botao>
              <Botao variante="discreto" onClick={() => setColando(false)}>
                Cancelar
              </Botao>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] text-left text-xs tabular-nums">
            <thead className="text-texto-3">
              <tr className="border-b border-borda">
                <th rowSpan={2} className="px-4 py-2 align-bottom font-medium">
                  Região
                </th>
                {CATEGORIAS.map((c) => (
                  <th key={c} colSpan={2} className="px-1 pt-2 text-center font-semibold text-texto-2">
                    {ROTULO_CATEGORIA[c]}
                  </th>
                ))}
                <th rowSpan={2} className="py-2 pr-3 text-right align-bottom font-medium">
                  Saldo
                </th>
                <th rowSpan={2} className="py-2 pr-4 text-right align-bottom font-medium">
                  % fat.
                </th>
              </tr>
              <tr className="border-b border-borda">
                {CATEGORIAS.flatMap((c) => [
                  <th key={`${c}m`} className="px-1 pb-2 text-right font-medium">
                    Medido
                  </th>,
                  <th key={`${c}f`} className="px-1 pb-2 text-right font-medium">
                    Faturado
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {regioes.map((r) => {
                const { m, f } = linha(r);
                return (
                  <tr key={r.id} className="border-b border-borda/50">
                    <td className="px-4 py-1.5 font-medium whitespace-nowrap">{r.nome}</td>
                    {CATEGORIAS.flatMap((c) => [
                      <td key={`${c}m`} className="px-1 py-1.5 text-right">
                        {entrada(chave(r.id, c), "medido", `${ROTULO_CATEGORIA[c]} medido — ${r.nome}`)}
                      </td>,
                      <td key={`${c}f`} className="px-1 py-1.5 text-right">
                        {entrada(chave(r.id, c), "faturado", `${ROTULO_CATEGORIA[c]} faturado — ${r.nome}`)}
                      </td>,
                    ])}
                    <td className="py-1.5 pr-3 text-right font-semibold whitespace-nowrap text-saldo">
                      {emReais(m - f)}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-texto-2">
                      {m > 0 ? emPorcento(f / m) : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-superficie-2 font-semibold">
                <td className="px-4 py-2">TOTAL</td>
                {CATEGORIAS.flatMap((c) => [
                  <td key={`${c}m`} className="px-2 py-2 text-right whitespace-nowrap">
                    {emReais(totalCat(c, "medido"))}
                  </td>,
                  <td key={`${c}f`} className="px-2 py-2 text-right whitespace-nowrap">
                    {emReais(totalCat(c, "faturado"))}
                  </td>,
                ])}
                <td className="py-2 pr-3 text-right whitespace-nowrap text-saldo">
                  {emReais(totalM - totalF)}
                </td>
                <td className="py-2 pr-4 text-right">{totalM > 0 ? emPorcento(totalF / totalM) : "—"}</td>
              </tr>
            </tbody>
          </table>
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
