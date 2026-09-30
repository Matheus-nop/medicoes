"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Botao, CAMPO, Campo, ESTILO_BOTAO } from "@/components/ui";
import {
  TODAS,
  emailDaRegiao,
  recadoDaRegiao,
  type LinhaDaRegiao,
  type Periodo,
} from "@/lib/medicoes/controle";

/**
 * O painel ao vivo: rebusca os dados a cada minuto e quando a aba volta a ficar
 * visível. É o que deixa a TV da diretoria e a tela do time mostrando o número
 * que o faturamento acabou de lançar, sem ninguém apertar F5.
 *
 * `router.refresh()`, e não recarregar a página: mantém o período escolhido e
 * a região do relatório.
 */
export function AoVivo({ segundos = 60 }: { segundos?: number }) {
  const router = useRouter();
  const [agora, setAgora] = useState<string | null>(null);

  useEffect(() => {
    const marcar = () =>
      setAgora(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        }),
      );
    marcar();
    const refazer = () => {
      router.refresh();
      marcar();
    };
    const relogio = window.setInterval(() => {
      if (document.visibilityState === "visible") refazer();
    }, segundos * 1000);
    const aoVoltar = () => document.visibilityState === "visible" && refazer();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [router, segundos]);

  return (
    <span className="flex items-center gap-1.5 text-xs text-texto-3">
      <span className="size-2 animate-pulse rounded-full bg-disponivel" />
      ao vivo{agora && ` · ${agora}`}
    </span>
  );
}

/** Cliente e período — mudam o endereço, e o servidor lê de novo. */
export function EscolherPeriodo({
  clientes,
  cliente,
  periodos,
  periodoId,
  comValor,
}: {
  clientes: string[];
  cliente: string;
  periodos: Periodo[];
  periodoId: number | null;
  /** Os períodos que têm algum valor — os outros ficam de fora do painel. */
  comValor?: number[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams();
  const ir = (mudar: Record<string, string | null>) => {
    const p = new URLSearchParams(busca.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    router.push(`${caminho}?${p.toString()}`);
  };
  const lista = comValor ? periodos.filter((p) => comValor.includes(p.id)) : periodos;

  return (
    <div className="flex flex-wrap items-end gap-2">
      {clientes.length > 1 && (
        <Campo rotulo="Cliente">
          <select
            value={cliente}
            onChange={(e) => ir({ cliente: e.target.value, periodo: null })}
            className={CAMPO}
          >
            {clientes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
      )}
      <Campo rotulo="Posição">
        <select
          value={periodoId ?? ""}
          onChange={(e) => ir({ periodo: e.target.value })}
          className={CAMPO}
          disabled={lista.length === 0}
        >
          {lista.length === 0 && <option value="">—</option>}
          {[...lista].reverse().map((p) => (
            <option key={p.id} value={p.id}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </Campo>
    </div>
  );
}

/**
 * O relatório de uma base: escolhe a região e copia o resumo para o WhatsApp
 * ou o e-mail — o "relatório por base" do painel que a diretoria já usava.
 */
export function RecadoDaBase({
  cliente,
  rotulo,
  regioes,
  periodoId,
}: {
  cliente: string;
  rotulo: string;
  regioes: LinhaDaRegiao[];
  periodoId?: number;
}) {
  const comValor = regioes.filter((r) => r.medido !== 0 || r.faturado !== 0);
  const [nome, setNome] = useState(
    [...comValor].sort((a, b) => b.saldo - a.saldo)[0]?.regiao ?? regioes[0]?.regiao ?? "",
  );
  const [copiado, setCopiado] = useState<string | null>(null);
  const linha = regioes.find((r) => r.regiao === nome);
  if (!linha) return <p className="p-4 text-sm text-texto-3">Nenhuma região cadastrada.</p>;

  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const texto = recadoDaRegiao(cliente, rotulo, linha, hoje);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado("Copiado — cole no WhatsApp ou no e-mail.");
    } catch {
      setCopiado("O navegador não deixou copiar. Selecione o texto abaixo.");
    }
    window.setTimeout(() => setCopiado(null), 3000);
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-2">
        <Campo rotulo="Base">
          <select value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO}>
            {regioes.map((r) => (
              <option key={r.regiao}>{r.regiao}</option>
            ))}
          </select>
        </Campo>
        <Botao onClick={copiar}>Copiar resumo</Botao>
        <a
          href={`/controle/relatorio?cliente=${encodeURIComponent(cliente)}&base=${encodeURIComponent(nome)}${periodoId ? `&periodo=${periodoId}` : ""}`}
          className={ESTILO_BOTAO.discreto}
        >
          PDF / e-mail desta base
        </a>
        {copiado && <span className="text-xs text-texto-2">{copiado}</span>}
      </div>
      <pre className="rounded-lg border border-borda bg-superficie-2 p-3 text-xs whitespace-pre-wrap text-texto-2 select-all">
        {texto}
      </pre>
    </div>
  );
}

/** A base do relatório — "todas" é o cliente inteiro. Muda o endereço. */
export function EscolherBase({ bases, base }: { bases: string[]; base: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams();
  return (
    <Campo rotulo="Base">
      <select
        value={base}
        onChange={(e) => {
          const p = new URLSearchParams(busca.toString());
          p.set("base", e.target.value);
          router.push(`${caminho}?${p.toString()}`);
        }}
        className={CAMPO}
      >
        <option value={TODAS}>Todas as bases</option>
        {bases.map((b) => (
          <option key={b}>{b}</option>
        ))}
      </select>
    </Campo>
  );
}

/**
 * Mandar o relatório: copiar o resumo (WhatsApp) ou abrir o e-mail já com
 * assunto e corpo. O PDF sai do "Imprimir / PDF" e se anexa — o navegador não
 * deixa um link de e-mail levar arquivo junto.
 */
export function EnviarRelatorio({
  cliente,
  rotulo,
  linha,
  endereco,
}: {
  cliente: string;
  rotulo: string;
  linha: LinhaDaRegiao;
  /** O caminho do relatório, para ir no corpo do e-mail. */
  endereco: string;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(recadoDaRegiao(cliente, rotulo, linha, hoje));
      setCopiado("Copiado — cole no WhatsApp.");
    } catch {
      setCopiado("O navegador não deixou copiar.");
    }
    window.setTimeout(() => setCopiado(null), 3000);
  }

  function email() {
    const { assunto, corpo } = emailDaRegiao(cliente, rotulo, linha, hoje);
    const link = `${window.location.origin}${endereco}`;
    const texto = `${corpo}\n\nRelatório completo (PDF em anexo, ou no sistema): ${link}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`;
  }

  return (
    <>
      {copiado && <span className="text-xs text-texto-2">{copiado}</span>}
      <Botao variante="discreto" onClick={copiar}>
        Copiar resumo
      </Botao>
      <Botao onClick={email}>Enviar por e-mail</Botao>
    </>
  );
}
