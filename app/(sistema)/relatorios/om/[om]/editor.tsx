"use client";

// O formulário do relatório de manutenção — o que a orçamentista preenchia no
// Excel. Abre com o que a OM do boletim, o boletim e o cadastro do Estoque já
// sabem; o resto (defeito, diagnóstico, materiais, fotos) é dela.
//
// A foto sobe na hora de escolher, reduzida no aparelho, e o "Gravar" só
// guarda o caminho. Cada Gravar é uma versão nova; a última manda.

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao, CAMPO, Campo, ESTILO_BOTAO, Painel } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { emReais } from "@/lib/medicoes/dinheiro";
import { lerValorDigitado } from "@/lib/medicoes/medicoes";
import { nomeDeArquivo, reduzirFoto } from "@/lib/medicoes/foto";
import {
  faltaNoRelatorio,
  MOMENTOS,
  ROTULO_MOMENTO,
  TIPOS_DE_MANUTENCAO,
  totalDosMateriais,
  type DadosDoRelatorio,
  type MomentoDaFoto,
  type TipoDeManutencao,
} from "@/lib/medicoes/relatorio";
import { gravarRelatorio } from "../../acoes";

const AREA = `${CAMPO} h-auto min-h-[5rem] w-full py-2`;

/** O valor como se digita: "2.624,00". */
const comoSeDigita = (v: number | null) =>
  v === null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Editor({
  om,
  inicial,
  urlsIniciais,
  valorNoBoletim,
  podeGravar,
}: {
  om: string;
  inicial: DadosDoRelatorio;
  urlsIniciais: Record<MomentoDaFoto, string | null>;
  /** O valor da OM no boletim, para conferir com o total dos materiais. */
  valorNoBoletim: number | null;
  podeGravar: boolean;
}) {
  const router = useRouter();
  const [d, setD] = useState<DadosDoRelatorio>(inicial);
  // O valor de cada material como texto, para a vírgula não sumir enquanto se digita.
  const [valores, setValores] = useState<string[]>(() => inicial.materiais.map((m) => comoSeDigita(m.valor)));
  const [previas, setPrevias] = useState(urlsIniciais);
  const [subindo, setSubindo] = useState<Record<MomentoDaFoto, boolean>>({ retirada: false, manutencao: false, entrega: false });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const muda = <K extends keyof DadosDoRelatorio>(k: K, v: DadosDoRelatorio[K]) => {
    setOk(null);
    setD((a) => ({ ...a, [k]: v }));
  };
  const total = totalDosMateriais(d.materiais);
  const naoBate = valorNoBoletim !== null && Math.abs(total - valorNoBoletim) >= 0.01;
  const algumaSubindo = MOMENTOS.some((m) => subindo[m]);

  function mudaMaterial(i: number, descricao: string | null, valor: string | null) {
    setOk(null);
    if (valor !== null) setValores((v) => v.map((x, j) => (j === i ? valor : x)));
    setD((a) => ({
      ...a,
      materiais: a.materiais.map((m, j) =>
        j !== i
          ? m
          : {
              descricao: descricao ?? m.descricao,
              valor: valor === null ? m.valor : valor.trim() === "" || valor.trim() === "-" ? null : lerValorDigitado(valor),
            },
      ),
    }));
  }

  function maisUmMaterial() {
    setD((a) => ({ ...a, materiais: [...a.materiais, { descricao: "", valor: null }] }));
    setValores((v) => [...v, ""]);
  }

  function tirarMaterial(i: number) {
    setD((a) => ({ ...a, materiais: a.materiais.filter((_, j) => j !== i) }));
    setValores((v) => v.filter((_, j) => j !== i));
  }

  async function anexar(m: MomentoDaFoto, arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setSubindo((s) => ({ ...s, [m]: true }));
    setPrevias((p) => ({ ...p, [m]: URL.createObjectURL(arquivo) }));
    try {
      const reduzida = await reduzirFoto(arquivo);
      const caminho = `${om}/${nomeDeArquivo()}`;
      const { error } = await createClient()
        .storage.from("medicoes-relatorios")
        .upload(caminho, reduzida, { contentType: "image/jpeg" });
      if (error) throw error;
      setD((a) => ({ ...a, fotos: { ...a.fotos, [m]: caminho } }));
    } catch {
      setPrevias((p) => ({ ...p, [m]: urlsIniciais[m] }));
      setErro("A foto não subiu — tente de novo. Se repetir, falta aplicar a 0021 no Supabase.");
    } finally {
      setSubindo((s) => ({ ...s, [m]: false }));
    }
  }

  function gravar(abrirPapel: boolean) {
    setErro(null);
    setOk(null);
    if (valores.some((v, i) => v.trim() && v.trim() !== "-" && d.materiais[i]?.valor === null)) {
      return setErro("Algum valor de material não é número — use 2.624,00, ou deixe em branco.");
    }
    iniciar(async () => {
      const r = await gravarRelatorio(om, d);
      if (!r.ok) return setErro(r.erro ?? "Não foi possível gravar.");
      if (abrirPapel) router.push(`/relatorios/om/${om}/folha?imprimir=1`);
      else {
        setOk("Gravado. O papel já sai com isto.");
        router.refresh();
      }
    });
  }

  const falta = faltaNoRelatorio(d);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        gravar(true);
      }}
    >
      <Painel titulo="O cabeçalho" descricao="O que veio da OM e do boletim já está aqui — confira e complete.">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo rotulo="Data da retirada">
            <input
              type="date"
              className={`${CAMPO} w-full`}
              value={d.data_retirada ?? ""}
              onChange={(e) => muda("data_retirada", e.target.value || null)}
            />
          </Campo>
          <Campo rotulo="Responsável (do cliente)">
            <input className={`${CAMPO} w-full`} value={d.responsavel} onChange={(e) => muda("responsavel", e.target.value)} />
          </Campo>
          <Campo rotulo="Solicitante">
            <input className={`${CAMPO} w-full`} value={d.solicitante} onChange={(e) => muda("solicitante", e.target.value)} />
          </Campo>
          <Campo rotulo="Superintendência" className="sm:col-span-2">
            <input
              className={`${CAMPO} w-full`}
              value={d.superintendencia}
              onChange={(e) => muda("superintendencia", e.target.value)}
            />
          </Campo>
          <Campo rotulo="Tipo de manutenção">
            <select
              className={`${CAMPO} w-full`}
              value={d.tipo_manutencao}
              onChange={(e) => muda("tipo_manutencao", e.target.value as TipoDeManutencao)}
            >
              {TIPOS_DE_MANUTENCAO.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Equipamento" obrigatorio>
            <input className={`${CAMPO} w-full`} value={d.equipamento} onChange={(e) => muda("equipamento", e.target.value)} />
          </Campo>
          <Campo rotulo="Modelo">
            <input className={`${CAMPO} w-full`} value={d.modelo} onChange={(e) => muda("modelo", e.target.value)} />
          </Campo>
          <Campo rotulo="Nº de patrimônio" obrigatorio>
            <input
              className={`${CAMPO} w-full font-mono uppercase`}
              value={d.patrimonio}
              onChange={(e) => muda("patrimonio", e.target.value)}
            />
          </Campo>
          <Campo rotulo="Defeito aparente" obrigatorio className="sm:col-span-2 lg:col-span-3">
            <textarea className={AREA} value={d.defeito} onChange={(e) => muda("defeito", e.target.value)} />
          </Campo>
          <Campo rotulo="Observação" className="sm:col-span-2 lg:col-span-3">
            <textarea className={AREA} value={d.observacao} onChange={(e) => muda("observacao", e.target.value)} />
          </Campo>
        </div>
      </Painel>

      <Painel titulo="Registro das entregas realizadas" descricao="O diagnóstico e as três fotos do papel.">
        <div className="space-y-4 p-4">
          <Campo rotulo="Diagnóstico técnico" obrigatorio>
            <textarea className={AREA} value={d.diagnostico} onChange={(e) => muda("diagnostico", e.target.value)} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-3">
            {MOMENTOS.map((m) => (
              <div key={m} className="rounded-lg border border-borda p-2">
                <p className="mb-1.5 text-xs font-semibold">{ROTULO_MOMENTO[m]}</p>
                {previas[m] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- prévia local ou URL assinada do bucket
                  <img
                    src={previas[m] as string}
                    alt={ROTULO_MOMENTO[m]}
                    className={`aspect-[4/3] w-full rounded object-cover ${subindo[m] ? "opacity-50" : ""}`}
                  />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center rounded bg-superficie-2 text-xs text-texto-3">
                    sem foto
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className={`${ESTILO_BOTAO.contorno} h-8 cursor-pointer text-xs`}>
                    {subindo[m] ? "Subindo…" : previas[m] ? "Trocar" : "Tirar ou escolher"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={!podeGravar || subindo[m]}
                      onChange={(e) => {
                        anexar(m, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {d.fotos[m] && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-texto-3 underline"
                      onClick={() => {
                        muda("fotos", { ...d.fotos, [m]: null });
                        setPrevias((p) => ({ ...p, [m]: null }));
                      }}
                    >
                      Tirar do papel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Painel>

      <Painel
        titulo="Lista de materiais substituídos"
        descricao="Cada peça ou serviço com o valor. O total é a soma — é o Valor Total O.M do papel."
      >
        <div className="space-y-2 p-4">
          {d.materiais.map((m, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                className={`${CAMPO} min-w-0 flex-1`}
                placeholder="CONJUNTO DO CILINDRO"
                value={m.descricao}
                onChange={(e) => mudaMaterial(i, e.target.value, null)}
                aria-label={`Material ${i + 1}`}
              />
              <span className="text-xs text-texto-3">R$</span>
              <input
                className={`${CAMPO} w-32 text-right tabular-nums`}
                inputMode="decimal"
                placeholder="-"
                value={valores[i] ?? ""}
                onChange={(e) => mudaMaterial(i, null, e.target.value)}
                aria-label={`Valor do material ${i + 1}`}
              />
              <button type="button" className="text-xs font-semibold text-texto-3 underline" onClick={() => tirarMaterial(i)}>
                Tirar
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Botao type="button" className="h-8 text-xs" onClick={maisUmMaterial}>
              + Material
            </Botao>
            <span className="ml-auto text-sm">
              Valor total da OM <b className="tabular-nums">{emReais(total)}</b>
            </span>
          </div>
          {naoBate && (
            <p className="rounded-md border border-reservado/40 bg-reservado/10 px-2.5 py-1.5 text-xs">
              O total dos materiais ({emReais(total)}) não bate com o valor da OM no boletim (
              {emReais(valorNoBoletim as number)}). O cliente confere os dois.
            </p>
          )}
        </div>
      </Painel>

      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}
      {ok && <Aviso tom="ok">{ok}</Aviso>}
      {falta && <p className="text-xs text-reservado">Antes de mandar ao cliente: {falta}</p>}

      {podeGravar ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/relatorios/om/${om}/folha`} className={ESTILO_BOTAO.discreto}>
            Ver o papel
          </Link>
          <Botao type="button" disabled={enviando || algumaSubindo} onClick={() => gravar(false)}>
            Gravar
          </Botao>
          <Botao type="submit" variante="primario" disabled={enviando || algumaSubindo}>
            {algumaSubindo ? "Esperando a foto…" : enviando ? "Gravando…" : "Gravar e gerar o PDF"}
          </Botao>
        </div>
      ) : (
        <p className="text-right text-xs text-texto-3">Só quem lança o boletim grava o relatório.</p>
      )}
    </form>
  );
}
