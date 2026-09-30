"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Botao, CAMPO, Campo } from "@/components/ui";
import {
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
}: {
  cliente: string;
  rotulo: string;
  regioes: LinhaDaRegiao[];
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
        {copiado && <span className="text-xs text-texto-2">{copiado}</span>}
      </div>
      <pre className="rounded-lg border border-borda bg-superficie-2 p-3 text-xs whitespace-pre-wrap text-texto-2 select-all">
        {texto}
      </pre>
    </div>
  );
}
