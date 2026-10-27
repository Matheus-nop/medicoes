"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Aviso,
  Botao,
  CAMPO,
  Cabecalho,
  Campo,
  CartaoIndicador,
  ESTILO_BOTAO,
  Painel,
  Selo,
  SoLeitura,
} from "@/components/ui";
import { emReais } from "@/lib/medicoes/dinheiro";
import {
  bateComOSisloc,
  cobravel,
  faltaNaBase,
  patrimoniosRepetidos,
  posicoesDoBoletim,
  totalLido,
} from "@/lib/medicoes/locacao";
import { quemLanca } from "@/lib/medicoes/papeis";
import type { CargaDaMedicao, ItemGravado } from "../dados";
import { salvarCabecalho, tirarBoletim, type CabecalhoDaMedicao } from "../acoes";
import { diaMes, mesPorExtenso } from "../formato";
import { Importador } from "../importador";

type Carga = Extract<CargaDaMedicao, { ok: true }>;

/**
 * A medição de locação de um mês: as bases que chegaram, o que falta
 * conferir, o cabeçalho da planilha da AEGEA e, base a base, os equipamentos
 * em posições — a troca dentro da posição, e não como um equipamento a mais.
 */
export function Medicao({ carga, clientes, podeMexer }: { carga: Carga; clientes: string[]; podeMexer: boolean }) {
  const { medicao: m, boletins, itens, faltando, manutencao } = carga;
  const router = useRouter();
  const [aberta, setAberta] = useState<Record<number, boolean>>({});
  const [importando, setImportando] = useState(boletins.length === 0);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const doBoletim = new Map<number, ItemGravado[]>();
  for (const i of itens) doBoletim.set(i.boletim_id, [...(doBoletim.get(i.boletim_id) ?? []), i]);
  const porBase = boletins.map((b) => {
    const seus = doBoletim.get(b.id) ?? [];
    const posicoes = posicoesDoBoletim(seus);
    return {
      b,
      itens: seus,
      posicoes,
      cobrados: seus.filter(cobravel).length,
      trocas: posicoes.filter((p) => p.itens.length > 1).length,
      semSubstituta: posicoes.filter((p) => p.semSubstituta).length,
      lido: totalLido(seus),
      bate: bateComOSisloc({ itens: seus, total_sisloc: b.total_sisloc }),
      falta: faltaNaBase(b.base),
    };
  });
  const locacao = porBase.reduce((t, x) => t + x.lido, 0);
  const sisloc = boletins.reduce((t, b) => t + (b.total_sisloc ?? 0), 0);
  const cobrados = porBase.reduce((t, x) => t + x.cobrados, 0);
  const posicoes = porBase.reduce((t, x) => t + x.posicoes.length, 0);
  const trocas = porBase.reduce((t, x) => t + x.trocas, 0);
  const valorManutencao = manutencao.reduce((t, x) => t + x.valor, 0);
  const repetidos = patrimoniosRepetidos(
    porBase.flatMap((x) =>
      x.itens.filter(cobravel).map((i) => ({ patrimonio: i.patrimonio, base: x.b.base_nome, inicio: i.inicio, fim: i.fim })),
    ),
  );
  const naoBatem = porBase.filter((x) => x.bate === false);
  const incompletas = porBase.filter((x) => x.falta.length > 0);
  const manutencaoSemBase = [...new Set(manutencao.filter((x) => faltaNaBase(x.base).some((f) => f !== "coordenador")).map((x) => x.nome))];
  const aConferir = repetidos.length + naoBatem.length + incompletas.length + faltando.length;

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo={`Medição de locação · ${mesPorExtenso(m.mes)}`}
        resumo={[m.cliente, m.contrato_juridico, m.contratante].filter(Boolean).join(" · ")}
        acoes={
          <>
            <Link href="/locacao" className={ESTILO_BOTAO.discreto}>
              Voltar
            </Link>
            {podeMexer && !importando && (
              <Botao onClick={() => setImportando(true)}>Importar mais PDFs</Botao>
            )}
            {boletins.length > 0 && (
              <>
                <a href={`/locacao/${m.id}/planilha`} className={ESTILO_BOTAO.contorno} download>
                  Planilha AEGEA (.xlsx)
                </a>
                <Link href={`/locacao/${m.id}/folha`} className={ESTILO_BOTAO.primario}>
                  PDF Nova Opção
                </Link>
              </>
            )}
          </>
        }
      />

      {!podeMexer && <SoLeitura>Você vê a medição, mas quem importa é {quemLanca("locacao")}.</SoLeitura>}
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}

      {importando && podeMexer && (
        <Painel titulo="Importar os PDFs do Sisloc" descricao={`Cada boletim vai para a medição do mês dele — os de ${mesPorExtenso(m.mes)} caem aqui.`}>
          <Importador clientes={clientes} clienteInicial={m.cliente} aoGravar="ficar" />
        </Painel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoIndicador
          rotulo="Bases"
          valor={boletins.length}
          detalhe={faltando.length ? `${faltando.length} do mês anterior ainda não vieram` : "importadas"}
          cor="bg-acento"
          destaque={faltando.length > 0}
        />
        <CartaoIndicador
          rotulo="Equipamentos cobrados"
          valor={cobrados}
          detalhe={`em ${posicoes} posições · ${trocas} troca(s)`}
          cor="bg-cat-locacao"
        />
        <CartaoIndicador
          compacto
          rotulo="Locação"
          valor={emReais(locacao)}
          detalhe={`Sisloc: ${emReais(sisloc)}`}
          cor="bg-disponivel"
        />
        <CartaoIndicador
          compacto
          rotulo="Manutenção do mês"
          valor={emReais(valorManutencao)}
          detalhe={`${manutencao.length} boletim(ns) apresentados · entra na planilha`}
          cor="bg-cat-manutencao"
        />
      </div>

      {aConferir > 0 && (
        <Painel titulo={`A conferir · ${aConferir}`} descricao="O que faria o cliente devolver a medição. A planilha sai mesmo assim — mas melhor acertar antes.">
          <ul className="space-y-2 p-4 text-sm">
            {repetidos.map((r) => (
              <li key={r.patrimonio} className="text-manutencao">
                <strong>Patrimônio {r.patrimonio}</strong> cobrado em mais de uma base no mesmo período:{" "}
                {r.bases.join(" e ")}.
              </li>
            ))}
            {naoBatem.map((x) => (
              <li key={x.b.id} className="text-manutencao">
                <strong>{x.b.base_nome}</strong>: a soma lida ({emReais(x.lido)}) não bate com o Sisloc (
                {emReais(x.b.total_sisloc ?? 0)}). Exporte o PDF de novo e reimporte.
              </li>
            ))}
            {faltando.map((nome) => (
              <li key={nome}>
                <strong>{nome}</strong> veio no mês anterior e ainda não foi importada.
              </li>
            ))}
            {incompletas.map((x) => (
              <li key={x.b.id}>
                <strong>{x.b.base_nome}</strong>: falta {x.falta.join(", ")} no cadastro da base.{" "}
                <Link href={`/bases?base=${encodeURIComponent(x.b.base_nome)}`} className="font-semibold text-acento underline">
                  Completar
                </Link>
              </li>
            ))}
          </ul>
        </Painel>
      )}

      {manutencaoSemBase.length > 0 && (
        <Aviso tom="erro">
          As linhas de MANUTENÇÃO de {manutencaoSemBase.length} base(s) saem sem projeto, município ou bloco — falta no cadastro:{" "}
          {manutencaoSemBase.slice(0, 6).join(", ")}
          {manutencaoSemBase.length > 6 ? "…" : ""}.
        </Aviso>
      )}

      <CabecalhoDaPlanilha id={m.id} m={m} podeMexer={podeMexer} />

      <div className="space-y-3">
        {porBase.map((x) => {
          const fechada = !aberta[x.b.id];
          const base = x.b.base;
          return (
            <Painel
              key={x.b.id}
              titulo={x.b.base_nome}
              descricao={[
                [base?.projeto, base?.municipio, base?.superintendencia, base?.bloco].filter(Boolean).join(" · ") ||
                  "sem os dados da AEGEA no cadastro",
                base?.coordenador ? `coord. ${base.coordenador}` : "sem coordenador",
                `${x.cobrados} equip. · ${x.posicoes.length} posições${x.trocas ? ` · ${x.trocas} troca(s)` : ""}`,
              ].join(" — ")}
              recolhido={fechada}
              aoRecolher={() => setAberta((a) => ({ ...a, [x.b.id]: !a[x.b.id] }))}
              acoes={
                <span className="flex items-center gap-2">
                  {x.bate === false ? <Selo tom="aviso">não bate</Selo> : x.falta.length ? <Selo tom="transito">cadastro</Selo> : <Selo tom="ok">ok</Selo>}
                  <span className="text-sm font-semibold tabular-nums">{emReais(x.lido)}</span>
                </span>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-left text-xs tabular-nums">
                  <thead className="border-b border-borda text-texto-3">
                    <tr>
                      <th className="px-4 py-2 font-medium">Pos.</th>
                      <th className="py-2 pr-3 font-medium">Equipamento</th>
                      <th className="py-2 pr-3 font-medium">Patrimônio</th>
                      <th className="py-2 pr-3 font-medium">Período</th>
                      <th className="py-2 pr-3 text-right font-medium">Dias</th>
                      <th className="py-2 pr-3 text-right font-medium">Base mensal</th>
                      <th className="py-2 pr-3 text-right font-medium">Valor</th>
                      <th className="py-2 pr-4 font-medium">Remessa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {x.posicoes.map((p, n) =>
                      p.itens.length === 1 ? (
                        <tr key={p.itens[0].id} className="border-b border-borda/50">
                          <td className="px-4 py-1.5 text-texto-3">{n + 1}</td>
                          <td className="py-1.5 pr-3">{p.itens[0].equipamento}</td>
                          <td className="py-1.5 pr-3 font-medium">{p.itens[0].patrimonio}</td>
                          <td className="py-1.5 pr-3">
                            {diaMes(p.itens[0].inicio)} a {diaMes(p.itens[0].fim)}
                            {p.semSubstituta && <span className="ml-2 text-manutencao">saiu sem substituta</span>}
                          </td>
                          <td className="py-1.5 pr-3 text-right">{p.itens[0].dias}</td>
                          <td className="py-1.5 pr-3 text-right text-texto-2">{emReais(p.itens[0].valor_base)}</td>
                          <td className="py-1.5 pr-3 text-right">{emReais(p.itens[0].valor_total)}</td>
                          <td className="py-1.5 pr-4 text-texto-3">{p.itens[0].remessa}</td>
                        </tr>
                      ) : (
                        [
                          <tr key={`p${p.itens[0].id}`} className="border-b border-borda/50 bg-cat-locacao/10 font-medium">
                            <td className="px-4 py-1.5">{n + 1}</td>
                            <td className="py-1.5 pr-3">{p.itens[0].grupo ?? p.itens[0].equipamento}</td>
                            <td className="py-1.5 pr-3">
                              <Selo tom="transito">{p.itens.length - 1} troca(s)</Selo>
                            </td>
                            <td className="py-1.5 pr-3">
                              {diaMes(p.itens[0].inicio)} a {diaMes(p.itens[p.itens.length - 1].fim)}
                            </td>
                            <td className="py-1.5 pr-3 text-right">{p.dias}</td>
                            <td className="py-1.5 pr-3 text-right text-texto-2">{emReais(p.itens[0].valor_base)}</td>
                            <td className="py-1.5 pr-3 text-right">{emReais(p.valor_total)}</td>
                            <td className="py-1.5 pr-4" />
                          </tr>,
                          ...p.itens.map((i, k) => (
                            <tr key={i.id} className="border-b border-borda/50 text-texto-2">
                              <td className="py-1.5 pr-3 pl-8">
                                {n + 1}.{k + 1}
                              </td>
                              <td className="py-1.5 pr-3">
                                {k === 0 ? "até a troca" : "substituta"} · {i.equipamento}
                              </td>
                              <td className="py-1.5 pr-3 font-medium text-texto">{i.patrimonio}</td>
                              <td className="py-1.5 pr-3">
                                {diaMes(i.inicio)} a {diaMes(i.fim)}
                              </td>
                              <td className="py-1.5 pr-3 text-right">{i.dias}</td>
                              <td className="py-1.5 pr-3 text-right" />
                              <td className="py-1.5 pr-3 text-right">{emReais(i.valor_total)}</td>
                              <td className="py-1.5 pr-4 text-texto-3">
                                {i.remessa}
                                {i.substituido ? " · Subs." : ""}
                              </td>
                            </tr>
                          )),
                        ]
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-borda px-4 py-2 text-xs text-texto-3">
                <span>
                  Cód. {x.b.cod_docto ?? "—"} · fichas {x.b.fichas.map((f) => f.replace(/^0+/, "")).join(", ")}
                </span>
                <span>
                  {x.itens.length - x.cobrados} acessório(s) a R$ 0,00 fora da planilha
                </span>
                <span>importado por {x.b.importado_por_nome}</span>
                {podeMexer && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      if (!window.confirm(`Tirar o boletim de ${x.b.base_nome} desta medição?`)) return;
                      iniciar(async () => {
                        const r = await tirarBoletim(m.id, x.b.id);
                        if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
                        router.refresh();
                      });
                    }}
                    className="ml-auto font-semibold text-manutencao underline"
                  >
                    Tirar da medição
                  </button>
                )}
              </div>
            </Painel>
          );
        })}
      </div>
    </div>
  );
}

function CabecalhoDaPlanilha({ id, m, podeMexer }: { id: number; m: Carga["medicao"]; podeMexer: boolean }) {
  const router = useRouter();
  const inicial: CabecalhoDaMedicao = {
    contratante: m.contratante ?? "ÁGUAS DO RIO 1 E 4 SPE S.A",
    obra: m.obra ?? "LOCAÇÃO DE EQUIPAMENTOS LEVES",
    contratoJuridico: m.contrato_juridico ?? "",
    contratoSistemico: m.contrato_sistemico ?? "",
    superintendencia: m.superintendencia ?? "",
    observacao: m.observacao ?? "",
  };
  const [c, setC] = useState(inicial);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const campo = (k: keyof CabecalhoDaMedicao, rotulo: string) => (
    <Campo rotulo={rotulo}>
      <input
        value={c[k]}
        onChange={(e) => setC((x) => ({ ...x, [k]: e.target.value }))}
        disabled={!podeMexer}
        className={`${CAMPO} w-full`}
      />
    </Campo>
  );
  return (
    <Painel
      titulo="Cabeçalho da planilha"
      descricao={[inicial.contratante, inicial.contratoJuridico || "sem nº de contrato", inicial.superintendencia].filter(Boolean).join(" · ")}
      recolhido={!aberto}
      aoRecolher={() => setAberto((x) => !x)}
    >
      <form
        className="space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            setErro(null);
            const r = await salvarCabecalho(id, c);
            if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
            setAberto(false);
            router.refresh();
          });
        }}
      >
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campo("contratante", "Contratante")}
          {campo("obra", "Obra / serviço")}
          {campo("contratoJuridico", "Nº contrato jurídico")}
          {campo("contratoSistemico", "Nº contrato sistêmico")}
          {campo("superintendencia", "Superintendência")}
          {campo("observacao", "Observação")}
        </div>
        <p className="text-xs text-texto-3">
          O responsável pelo preenchimento é quem baixa a planilha, e a data é a do dia. A medição do mês seguinte nasce com este cabeçalho.
        </p>
        {podeMexer && (
          <Botao type="submit" variante="primario" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar o cabeçalho"}
          </Botao>
        )}
      </form>
    </Painel>
  );
}
