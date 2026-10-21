"use client";

// O formulário do relatório de manutenção — o que a orçamentista preenchia no
// Excel. Abre com o que a OM do boletim, o boletim e o cadastro do Estoque já
// sabem; o resto (defeito, diagnóstico, materiais, fotos) é dela.
//
// A foto sobe na hora de escolher, reduzida no aparelho, e o "Gravar" só
// guarda o caminho. Cada Gravar é uma versão nova; a última manda.

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao, CAMPO, Campo, ESTILO_BOTAO, Painel } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { emReais } from "@/lib/medicoes/dinheiro";
import { lerValorDigitado, mesmaOm } from "@/lib/medicoes/medicoes";
import { nomeDeArquivo, reduzirFoto } from "@/lib/medicoes/foto";
import {
  chaveDaColagem,
  faltaNoRelatorio,
  lerColagemDoSisloc,
  MOMENTOS,
  preencherComLeitura,
  ROTULO_FONTE_DA_LEITURA,
  ROTULO_MOMENTO,
  TIPOS_DE_MANUTENCAO,
  totalDosMateriais,
  type DadosDoRelatorio,
  type LeituraDaOm,
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
  const [leitura, setLeitura] = useState<{ fonte: string; preenchidos: string[] } | null>(null);
  // Aberto enquanto o relatório não tem equipamento: é o caso de colar.
  const [lerAberto, setLerAberto] = useState(!inicial.equipamento.trim());
  const [colagem, setColagem] = useState("");
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);

  /** Preenche o que está em branco com a leitura, e diz o quê. */
  function aplicar(l: LeituraDaOm, sobre: DadosDoRelatorio = d) {
    const r = preencherComLeitura(sobre, l);
    setD(r.dados);
    setValores(r.dados.materiais.map((m) => comoSeDigita(m.valor)));
    setOk(null);
    setLeitura({ fonte: ROTULO_FONTE_DA_LEITURA[l.fonte], preenchidos: r.preenchidos });
    setLerAberto(false);
  }

  // A colagem feita no leitor de /relatorios chega pelo sessionStorage da aba.
  const lida = useRef(false);
  useEffect(() => {
    if (lida.current) return;
    lida.current = true;
    try {
      const chave = chaveDaColagem(om);
      const crua = sessionStorage.getItem(chave);
      if (!crua) return;
      sessionStorage.removeItem(chave);
      const l = JSON.parse(crua) as LeituraDaOm;
      // Depois da montagem, e não dentro dela: o formulário aparece e se preenche.
      queueMicrotask(() => aplicar(l, inicial));
    } catch {
      // Colagem ilegível ou sem sessionStorage: o painel "Colar do Sisloc" continua aqui.
    }
    // Só na abertura: a colagem é do leitor, e depois quem manda é o formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function lerColagem(texto = colagem) {
    setErroLeitura(null);
    const r = lerColagemDoSisloc(texto);
    if (r.erro) return setErroLeitura(r.erro);
    const achada = r.oms.find((x) => mesmaOm(x.om, om));
    if (!achada) return setErroLeitura(`A OM ${om} não está na colagem (vieram ${r.oms.map((x) => x.om).join(", ")}).`);
    aplicar(achada.leitura);
    setColagem("");
  }

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

  /** A primeira foto de uma colagem (Ctrl+V), como arquivo. */
  function fotoColada(dados: DataTransfer | null): File | null {
    for (const item of Array.from(dados?.items ?? [])) {
      if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
    }
    return null;
  }

  /** Ctrl+V no quadro: a foto copiada (do WhatsApp, do e-mail, do Sisloc) entra sem salvar arquivo. */
  function colarFoto(m: MomentoDaFoto, e: React.ClipboardEvent) {
    const foto = fotoColada(e.clipboardData);
    if (!foto) return;
    e.preventDefault();
    e.stopPropagation();
    anexar(m, foto);
  }

  /** O botão "Colar": lê a área de transferência — o navegador pede licença na primeira vez. */
  async function colarDoBotao(m: MomentoDaFoto) {
    setErro(null);
    try {
      for (const item of await navigator.clipboard.read()) {
        const tipo = item.types.find((t) => t.startsWith("image/"));
        if (tipo) return anexar(m, new File([await item.getType(tipo)], "colada", { type: tipo }));
      }
      setErro("Não há foto copiada. Copie a foto (botão direito → Copiar imagem) e cole de novo.");
    } catch {
      setErro("O navegador não deixou ler a foto copiada. Clique no quadro da foto e aperte Ctrl+V.");
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
      <Painel
        titulo="Colar do Sisloc"
        descricao="Copie a OM na grade do Sisloc, com a linha dos títulos, e cole aqui. Só o que está em branco é preenchido."
        recolhido={!lerAberto}
        aoRecolher={() => setLerAberto((x) => !x)}
        acoes={leitura && <span className="text-xs text-texto-3">lido da {leitura.fonte}</span>}
      >
        <div className="space-y-3 p-4">
          <textarea
            className={`${AREA} font-mono text-xs`}
            value={colagem}
            onChange={(e) => setColagem(e.target.value)}
            onPaste={(e) => {
              const colado = e.clipboardData.getData("text");
              if (colado.includes("\t")) {
                e.preventDefault();
                setColagem(colado);
                lerColagem(colado);
              }
            }}
            placeholder="Ctrl+V com a OM copiada do Sisloc"
            aria-label="Colar a OM do Sisloc"
          />
          {erroLeitura && <p className="text-xs text-manutencao">{erroLeitura}</p>}
        </div>
      </Painel>
      {leitura && (
        <p className="text-xs text-texto-2">
          {leitura.preenchidos.length
            ? `Preenchido pela colagem do Sisloc: ${leitura.preenchidos.join(", ")}. Confira e complete.`
            : "A colagem não tinha nada para o que estava em branco — o que estava escrito ficou."}
        </p>
      )}

      <Painel titulo="O cabeçalho" descricao="O que veio da colagem já está aqui — confira e complete.">
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

      <Painel titulo="Registro das entregas realizadas" descricao="O diagnóstico e as três fotos do papel — coladas, sem precisar salvar.">
        <div className="space-y-4 p-4">
          <Campo rotulo="Diagnóstico técnico" obrigatorio>
            <textarea className={AREA} value={d.diagnostico} onChange={(e) => muda("diagnostico", e.target.value)} />
          </Campo>
          <p className="text-xs text-texto-3">
            Copie a foto onde ela estiver (WhatsApp, e-mail, galeria) e cole no quadro: clique nele e aperte Ctrl+V, ou
            use o botão Colar. Colar fora dos quadros enche o primeiro vazio.
          </p>
          <div
            className="grid gap-3 sm:grid-cols-3"
            onPaste={(e) => {
              const vazio = MOMENTOS.find((m) => !previas[m]);
              if (podeGravar && vazio) colarFoto(vazio, e);
            }}
          >
            {MOMENTOS.map((m) => (
              <div
                key={m}
                tabIndex={podeGravar ? 0 : -1}
                onPaste={(e) => podeGravar && colarFoto(m, e)}
                aria-label={`${ROTULO_MOMENTO[m]}: clique e cole a foto com Ctrl+V`}
                className="rounded-lg border border-borda p-2 outline-none focus:border-acento focus:ring-2 focus:ring-acento/30"
              >
                <p className="mb-1.5 text-xs font-semibold">{ROTULO_MOMENTO[m]}</p>
                {previas[m] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- prévia local ou URL assinada do bucket
                  <img
                    src={previas[m] as string}
                    alt={ROTULO_MOMENTO[m]}
                    className={`aspect-[4/3] w-full rounded object-cover ${subindo[m] ? "opacity-50" : ""}`}
                  />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center rounded border border-dashed border-borda bg-superficie-2 px-2 text-center text-xs text-texto-3">
                    clique aqui e cole a foto (Ctrl+V)
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Botao
                    type="button"
                    variante="primario"
                    className="h-8 text-xs"
                    disabled={!podeGravar || subindo[m]}
                    onClick={() => colarDoBotao(m)}
                  >
                    {subindo[m] ? "Subindo…" : "Colar"}
                  </Botao>
                  <label className={`${ESTILO_BOTAO.contorno} h-8 cursor-pointer text-xs`}>
                    {previas[m] ? "Trocar" : "Arquivo"}
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
