"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, CAMPO, Campo, Painel, Selo, SoLeitura, Vazio } from "@/components/ui";
import { daBase } from "@/lib/medicoes/arquivo";
import type { Base } from "@/lib/medicoes/bases";
import { quemLanca } from "@/lib/medicoes/papeis";
import { ROTULO_MODELO, chaveDoCliente, modeloDoCliente } from "@/lib/medicoes/medicoes";
import { dataCurta } from "../formato";
import { apagarBase, salvarBase, type CamposDaBase } from "./acoes";

export type BaseNoQuadro = Base & { boletins: number; ultimo: string | null; proximo: string };

const vazio = (cliente = ""): CamposDaBase => ({
  cliente,
  nome: "",
  responsavel: "",
  email: "",
  telefone: "",
  localObra: "",
  observacao: "",
  modelo: "",
});

const daBaseParaCampos = (b: Base): CamposDaBase => ({
  cliente: b.cliente,
  nome: b.nome,
  responsavel: b.responsavel ?? "",
  email: b.email ?? "",
  telefone: b.telefone ?? "",
  localObra: b.local_obra ?? "",
  observacao: b.observacao ?? "",
  modelo: b.modelo ?? "",
});

/**
 * O quadro das bases, um painel por cliente e um cartão por base. O cartão
 * mostra o que o boletim novo vai puxar; "Editar" abre o formulário ali mesmo.
 * A base que falta responsável ou local da obra aparece marcada: é o papel que
 * sairia com a caixa em branco.
 */
export function QuadroDeBases({
  bases,
  baseInicial,
  podeMexer,
}: {
  bases: BaseNoQuadro[];
  baseInicial: string;
  /** O papel é do time que lança boletim (a 0011). Quem não é, só lê. */
  podeMexer: boolean;
}) {
  const [filtro, setFiltro] = useState(baseInicial);
  const [editando, setEditando] = useState<number | "nova" | null>(null);
  const visiveis = bases.filter((b) => daBase(b.nome, filtro) || daBase(b.cliente, filtro));
  const clientes = [...new Set(visiveis.map((b) => chaveDoCliente(b.cliente)))].map((k) => ({
    chave: k,
    nome: visiveis.find((b) => chaveDoCliente(b.cliente) === k)!.cliente,
    bases: visiveis.filter((b) => chaveDoCliente(b.cliente) === k),
  }));
  const incompletas = bases.filter((b) => !b.responsavel || !b.local_obra).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Campo rotulo="Base ou cliente" className="w-full max-w-md">
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Digite parte do nome — belford, gávea, rio+…"
            aria-label="Filtrar as bases"
            className={`${CAMPO} w-full`}
          />
        </Campo>
        <p className="pb-2 text-xs text-texto-3">
          {visiveis.length} de {bases.length} base(s)
          {incompletas > 0 && ` · ${incompletas} sem responsável ou local da obra`}
        </p>
        {podeMexer && (
          <Botao variante="primario" className="ml-auto" onClick={() => setEditando("nova")}>
            Nova base
          </Botao>
        )}
      </div>

      {!podeMexer && (
        <SoLeitura>Você vê o cadastro, mas quem edita é {quemLanca("boletim")}.</SoLeitura>
      )}

      {editando === "nova" && (
        <Painel titulo="Nova base" descricao="O boletim novo desta base já nasce com estes dados.">
          <Formulario inicial={vazio()} aoFechar={() => setEditando(null)} />
        </Painel>
      )}

      {clientes.length === 0 ? (
        <Vazio>Nenhuma base com esse nome.</Vazio>
      ) : (
        clientes.map((c) => (
          <Painel key={c.chave} titulo={c.nome} descricao={`${c.bases.length} base(s)`}>
            <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
              {c.bases.map((b) =>
                editando === b.id ? (
                  <div key={b.id} className="rounded-xl border border-acento bg-superficie shadow-cartao md:col-span-2 2xl:col-span-3">
                    <Formulario id={b.id} inicial={daBaseParaCampos(b)} aoFechar={() => setEditando(null)} />
                  </div>
                ) : (
                  <CartaoDaBase key={b.id} b={b} aoEditar={podeMexer ? () => setEditando(b.id) : undefined} />
                ),
              )}
            </div>
          </Painel>
        ))
      )}
    </div>
  );
}

function CartaoDaBase({ b, aoEditar }: { b: BaseNoQuadro; aoEditar?: () => void }) {
  const falta = [!b.responsavel && "responsável", !b.local_obra && "local da obra"].filter(Boolean);
  // Em vermelho só o que faz falta no papel: responsável e local da obra.
  const linha = (rotulo: string, valor: string | null, faz = false) => (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-texto-3">{rotulo}</dt>
      <dd
        className={`min-w-0 truncate text-right ${valor ? "" : faz ? "text-manutencao" : "text-texto-3"}`}
        title={valor ?? ""}
      >
        {valor ?? "—"}
      </dd>
    </div>
  );
  return (
    <section className={`rounded-xl border bg-superficie p-4 shadow-cartao ${falta.length ? "border-manutencao/40" : "border-borda"}`}>
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold" title={b.nome}>
            {b.nome}
          </h3>
          <p className="text-xs text-texto-3">
            {b.boletins} boletim(ns){b.ultimo ? ` · último em ${dataCurta(b.ultimo)}` : ""}
          </p>
        </div>
        <Selo tom="acento">próximo nº {b.proximo}</Selo>
      </header>
      <dl className="mt-3 space-y-1 text-xs">
        {linha("Responsável", b.responsavel, true)}
        {linha("E-mail", b.email)}
        {linha("Telefone", b.telefone)}
        {linha("Local da obra", b.local_obra, true)}
        <div className="flex justify-between gap-3">
          <dt className="text-texto-3">Papel</dt>
          <dd>{ROTULO_MODELO[b.modelo ?? modeloDoCliente(b.cliente)]}{!b.modelo && " (do cliente)"}</dd>
        </div>
        {b.observacao && linha("Observação", b.observacao)}
      </dl>
      <div className="mt-3 flex items-center gap-3 text-xs">
        {falta.length > 0 && <span className="text-manutencao">falta {falta.join(" e ")}</span>}
        {aoEditar && (
          <button type="button" onClick={aoEditar} className="ml-auto font-semibold text-acento underline">
            Editar
          </button>
        )}
      </div>
    </section>
  );
}

function Formulario({ id, inicial, aoFechar }: { id?: number; inicial: CamposDaBase; aoFechar: () => void }) {
  const router = useRouter();
  const [c, setC] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const campo = (k: keyof CamposDaBase, rotulo: string, placeholder = "", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Campo rotulo={rotulo}>
      <input
        value={c[k]}
        onChange={(e) => setC((x) => ({ ...x, [k]: e.target.value }))}
        placeholder={placeholder}
        className={`${CAMPO} w-full`}
        {...extra}
      />
    </Campo>
  );
  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        iniciar(async () => {
          const r = await salvarBase(id ?? null, c);
          if (!r.ok) {
            setErro(r.erro ?? "Não deu certo.");
            return;
          }
          aoFechar();
          router.refresh();
        });
      }}
    >
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campo("cliente", "Cliente", "AEGEA SANEAMENTO E PARTICIPAÇÕES S.A", { required: true })}
        {campo("nome", "Base / fiscalização", "VCG - NOVA IGUAÇU - BAIXADA 2 - BLOCO 4", { required: true })}
        {campo("responsavel", "Responsável (contato do cliente)", "Sra. Thaynã")}
        {campo("email", "E-mail", "fiscal@cliente.com.br", { type: "email" })}
        {campo("telefone", "Telefone", "(21) 0000-0000", { inputMode: "tel" })}
        {campo("localObra", "Local da obra", "Rua Oscar Soares, 1362 - Nova Iguaçu - RJ")}
        <Campo rotulo="Papel">
          <select value={c.modelo} onChange={(e) => setC((x) => ({ ...x, modelo: e.target.value }))} className={`${CAMPO} w-full`}>
            <option value="">O do cliente</option>
            {(Object.keys(ROTULO_MODELO) as (keyof typeof ROTULO_MODELO)[]).map((m) => (
              <option key={m} value={m}>
                {ROTULO_MODELO[m]}
              </option>
            ))}
          </select>
        </Campo>
        <div className="sm:col-span-2">{campo("observacao", "Observação de todo boletim", "Contrato, pedido de compra…")}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
        <Botao type="button" variante="discreto" onClick={aoFechar}>
          Cancelar
        </Botao>
        {id && (
          <Botao
            type="button"
            variante="discreto"
            className="ml-auto text-manutencao"
            disabled={salvando}
            onClick={() => {
              if (!window.confirm(`Apagar a base ${inicial.nome} do cadastro? Os boletins dela continuam.`)) return;
              iniciar(async () => {
                const r = await apagarBase(id);
                if (!r.ok) {
                  setErro(r.erro ?? "Não deu certo.");
                  return;
                }
                aoFechar();
                router.refresh();
              });
            }}
          >
            Apagar
          </Botao>
        )}
      </div>
    </form>
  );
}
