"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, CAMPO, Campo } from "@/components/ui";
import { CATEGORIAS, ROTULO_CATEGORIA } from "@/lib/medicoes/controle";
import { chaveDoCliente } from "@/lib/medicoes/medicoes";
import {
  INDICES,
  ROTULO_ADITIVO,
  TIPOS_DE_ADITIVO,
  sugestaoDaRenovacao,
  type Ciclo,
  type ContratoAtual,
  type TipoDeAditivo,
} from "@/lib/medicoes/contratos";
import { registrarAditivo, salvarContrato, type CamposDoAditivo, type CamposDoContrato } from "./acoes";

export function camposDoContrato(c?: ContratoAtual): CamposDoContrato {
  const dinheiro = (v: number | null) =>
    v === null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    numero: c?.numero ?? "",
    cliente: c?.cliente ?? "",
    objeto: c?.objeto ?? "",
    vigenciaInicio: c?.vigencia_inicio ?? "",
    vigenciaFim: c?.vigencia_fim ?? "",
    valor: dinheiro(c?.valor ?? null),
    saldoConferido: dinheiro(c?.saldo_conferido ?? null),
    saldoAte: c?.saldo_ate ? c.saldo_ate.slice(0, 7) : "",
    categorias: c?.categorias ?? [],
    regioes: c?.regioes ?? [],
    indice: c?.indice ?? "",
    // A view devolve a data-base já com o início no lugar do vazio: se são
    // iguais, o campo fica vazio — que é o que quer dizer "o início".
    dataBase: c && c.data_base !== c.vigencia_inicio ? c.data_base : "",
    avisoDias: String(c?.aviso_dias ?? 90),
    contato: c?.contato ?? "",
    email: c?.email ?? "",
    observacao: c?.observacao ?? "",
  };
}

/**
 * O cadastro do contrato. O cliente se escolhe da lista (o nome do controle é
 * o que liga o contrato ao medido), mas aceita um novo.
 */
export function FormularioDoContrato({
  id,
  inicial,
  clientes,
  regionais,
  aoFechar,
}: {
  id?: number;
  inicial: CamposDoContrato;
  clientes: string[];
  /** As regionais do controle de cada cliente, pela chave do nome. */
  regionais: Record<string, string[]>;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [c, setC] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const muda = (k: keyof CamposDoContrato) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setC((x) => ({ ...x, [k]: e.target.value }));
  const doCliente = regionais[chaveDoCliente(c.cliente)] ?? [];
  // A regional marcada que não é do cliente escolhido (trocou o cliente) não vai.
  const marcadas = c.regioes.filter((r) => doCliente.includes(r));
  const foraDoControle = c.cliente.trim() !== "" && doCliente.length === 0;

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          setErro(null);
          const r = await salvarContrato(id ?? null, { ...c, regioes: marcadas });
          if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
          aoFechar();
          if (!id && r.id) router.push(`/contratos/${r.id}`);
          else router.refresh();
        });
      }}
    >
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Número do contrato" obrigatorio>
          <input value={c.numero} onChange={muda("numero")} required placeholder="CT-001/2025" className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Cliente" obrigatorio className="sm:col-span-1 lg:col-span-3">
          <input
            value={c.cliente}
            onChange={muda("cliente")}
            required
            list="clientes-do-contrato"
            placeholder="O nome do controle, para o medido entrar"
            className={`${CAMPO} w-full`}
          />
          <datalist id="clientes-do-contrato">
            {clientes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Campo>
        <Campo rotulo="Objeto" className="sm:col-span-2 lg:col-span-4">
          <input
            value={c.objeto}
            onChange={muda("objeto")}
            placeholder="Locação e manutenção de equipamentos…"
            className={`${CAMPO} w-full`}
          />
        </Campo>
        <Campo rotulo="Início da vigência" obrigatorio>
          <input type="date" value={c.vigenciaInicio} onChange={muda("vigenciaInicio")} required className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Fim da vigência" obrigatorio>
          <input type="date" value={c.vigenciaFim} onChange={muda("vigenciaFim")} required className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Valor global do papel (R$)">
          <input
            value={c.valor}
            onChange={muda("valor")}
            inputMode="decimal"
            placeholder="vazio se não souber"
            className={`${CAMPO} w-full text-right tabular-nums`}
          />
        </Campo>
        <Campo rotulo="Saldo que resta (R$)">
          <input
            value={c.saldoConferido}
            onChange={muda("saldoConferido")}
            inputMode="decimal"
            placeholder="o que o time conferiu"
            className={`${CAMPO} w-full text-right tabular-nums`}
          />
        </Campo>
        <Campo rotulo="Depois do faturamento de" obrigatorio={!!c.saldoConferido.trim()}>
          <input
            type="month"
            value={c.saldoAte}
            onChange={muda("saldoAte")}
            required={!!c.saldoConferido.trim()}
            className={`${CAMPO} w-full`}
          />
        </Campo>
        <Campo rotulo="Avisar o vencimento com (dias)">
          <input value={c.avisoDias} onChange={muda("avisoDias")} inputMode="numeric" className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Índice de reajuste">
          <select value={c.indice} onChange={muda("indice")} className={`${CAMPO} w-full`}>
            <option value="">Sem reajuste</option>
            {INDICES.map((i) => (
              <option key={i} value={i}>
                {i === "outro" ? "Outro" : i}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Data-base do reajuste">
          <input type="date" value={c.dataBase} onChange={muda("dataBase")} className={`${CAMPO} w-full`} />
        </Campo>
        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-medium text-texto-2">O medido que conta</legend>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {CATEGORIAS.map((k) => (
              <label key={k} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={c.categorias.length === 0 || c.categorias.includes(k)}
                  onChange={(e) => {
                    const todas = c.categorias.length === 0 ? [...CATEGORIAS] : c.categorias;
                    const nova = e.target.checked ? [...todas, k] : todas.filter((x) => x !== k);
                    setC((x) => ({ ...x, categorias: nova.length === CATEGORIAS.length ? [] : nova }));
                  }}
                />
                {ROTULO_CATEGORIA[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2 lg:col-span-4">
          <legend className="text-xs font-medium text-texto-2">Regionais do controle que o contrato cobre</legend>
          {doCliente.length ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={marcadas.length === 0}
                  onChange={() => setC((x) => ({ ...x, regioes: [] }))}
                />
                Todas
              </label>
              {doCliente.map((r) => (
                <label key={r} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={marcadas.includes(r)}
                    onChange={(e) =>
                      setC((x) => ({
                        ...x,
                        regioes: e.target.checked ? [...marcadas, r] : marcadas.filter((y) => y !== r),
                      }))
                    }
                  />
                  {r}
                </label>
              ))}
            </div>
          ) : (
            <p className={`mt-1 text-xs ${foraDoControle ? "text-manutencao" : "text-texto-3"}`}>
              {foraDoControle
                ? "Este nome não é cliente do controle: o contrato fica sem medido e sem faturado. Escolha o cliente da lista e marque a regional aqui."
                : "Escolha o cliente para ver as regionais dele."}
            </p>
          )}
        </fieldset>
        <Campo rotulo="Gestor do contrato no cliente">
          <input value={c.contato} onChange={muda("contato")} className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="E-mail do gestor">
          <input type="email" value={c.email} onChange={muda("email")} className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Observação" className="sm:col-span-2 lg:col-span-4">
          <textarea value={c.observacao} onChange={muda("observacao")} rows={2} className={`${CAMPO} h-auto w-full py-2`} />
        </Campo>
      </div>
      <p className="text-xs text-texto-3">
        O valor global é o total assinado no papel. O saldo que resta é o que o time confere hoje, depois do
        faturamento de um mês do controle: dali em diante ele desce sozinho a cada nota. Com os dois, o sistema
        sabe também o que foi faturado antes dele; sem nenhum, o contrato é por preço unitário, sem teto.
        A data-base vazia é o início da vigência. Prorrogação, reajuste e mudança de valor não se corrigem aqui:
        registre o aditivo, que fica no histórico.
      </p>
      <div className="flex gap-2">
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? "Salvando…" : id ? "Salvar a correção" : "Cadastrar o contrato"}
        </Botao>
        <Botao type="button" variante="discreto" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

const VAZIO: CamposDoAditivo = {
  tipo: "renovacao",
  data: "",
  numero: "",
  novaVigenciaFim: "",
  novaVigenciaInicio: "",
  valorCiclo: "",
  incorporaSaldo: false,
  valorDelta: "",
  percentual: "",
  descricao: "",
};

const emTexto = (v: number | null) =>
  v === null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** O formulário em branco, com a renovação já proposta a partir do último ciclo. */
function vazioPara(ultimo?: Ciclo): CamposDoAditivo {
  if (!ultimo) return VAZIO;
  const s = sugestaoDaRenovacao(ultimo);
  return { ...VAZIO, novaVigenciaInicio: s.inicio, novaVigenciaFim: s.fim, valorCiclo: emTexto(s.valor) };
}

/** O que cada tipo pede, além da data. */
const PEDE: Record<
  TipoDeAditivo,
  { ciclo?: boolean; vigencia?: boolean; valor?: boolean; percentual?: boolean; ajuda: string }
> = {
  renovacao: {
    ciclo: true,
    vigencia: true,
    percentual: true,
    ajuda:
      "Abre um ciclo novo, que começa do zero: o medido do ciclo anterior não consome o novo. Renovação que já aconteceu entra com as datas dela.",
  },
  prorrogacao: { vigencia: true, valor: true, ajuda: "A nova data de fim. Se a prorrogação traz valor, informe o acréscimo." },
  reajuste: {
    percentual: true,
    valor: true,
    ajuda: "O percentual do índice e quanto o valor global sobe com ele (o reajuste vale sobre o que falta medir).",
  },
  valor: { valor: true, ajuda: "Positivo acresce, negativo suprime (-50.000,00)." },
  encerramento: { ajuda: "Na data do encerramento o contrato sai da lista dos vigentes e para de contar medido." },
  outro: { ajuda: "Qualquer outro termo: descreva o que mudou." },
};

export function FormularioDoAditivo({
  contratoId,
  ultimo,
  aoFechar,
}: {
  contratoId: number;
  /** O último ciclo, de onde a renovação tira o período e o valor propostos. */
  ultimo?: Ciclo;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [a, setA] = useState(() => vazioPara(ultimo));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const muda = (k: keyof CamposDoAditivo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setA((x) => ({ ...x, [k]: e.target.value }));
  const pede = PEDE[a.tipo as TipoDeAditivo];

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          setErro(null);
          const r = await registrarAditivo(contratoId, {
            ...a,
            novaVigenciaFim: pede.vigencia ? a.novaVigenciaFim : "",
            novaVigenciaInicio: pede.ciclo ? a.novaVigenciaInicio : "",
            valorCiclo: pede.ciclo ? a.valorCiclo : "",
            incorporaSaldo: pede.ciclo ? a.incorporaSaldo : false,
            valorDelta: pede.valor ? a.valorDelta : "",
            percentual: pede.percentual ? a.percentual : "",
          });
          if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
          aoFechar();
          router.refresh();
        });
      }}
    >
      {erro && (
        <Aviso tom="erro" aoFechar={() => setErro(null)}>
          {erro}
        </Aviso>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Tipo" obrigatorio>
          <select
            value={a.tipo}
            onChange={(e) => {
              const tipo = e.target.value;
              // O período proposto é da renovação: na prorrogação a data se digita.
              const base = vazioPara(ultimo);
              setA((x) => ({ ...x, tipo, novaVigenciaFim: tipo === "renovacao" ? base.novaVigenciaFim : "" }));
            }}
            className={`${CAMPO} w-full`}
          >
            {TIPOS_DE_ADITIVO.map((t) => (
              <option key={t} value={t}>
                {ROTULO_ADITIVO[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Data" obrigatorio>
          <input type="date" value={a.data} onChange={muda("data")} required className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Número no papel">
          <input value={a.numero} onChange={muda("numero")} placeholder="1º Termo Aditivo" className={`${CAMPO} w-full`} />
        </Campo>
        {pede.ciclo && (
          <Campo rotulo="Ciclo novo de" obrigatorio>
            <input
              type="date"
              value={a.novaVigenciaInicio}
              onChange={muda("novaVigenciaInicio")}
              required
              className={`${CAMPO} w-full`}
            />
          </Campo>
        )}
        {pede.vigencia && (
          <Campo rotulo={pede.ciclo ? "Ciclo novo até" : "Nova vigência até"} obrigatorio>
            <input type="date" value={a.novaVigenciaFim} onChange={muda("novaVigenciaFim")} required className={`${CAMPO} w-full`} />
          </Campo>
        )}
        {pede.ciclo && (
          <Campo rotulo="Valor do ciclo novo (R$)">
            <input
              value={a.valorCiclo}
              onChange={muda("valorCiclo")}
              inputMode="decimal"
              placeholder="vazio: preço unitário"
              className={`${CAMPO} w-full text-right tabular-nums`}
            />
          </Campo>
        )}
        {pede.percentual && (
          <Campo rotulo={pede.ciclo ? "Reajuste na renovação (%)" : "Percentual (%)"}>
            <input value={a.percentual} onChange={muda("percentual")} inputMode="decimal" placeholder="4,52" className={`${CAMPO} w-full text-right`} />
          </Campo>
        )}
        {pede.valor && (
          <Campo rotulo="Muda o valor global em (R$)">
            <input
              value={a.valorDelta}
              onChange={muda("valorDelta")}
              inputMode="decimal"
              placeholder="0,00"
              className={`${CAMPO} w-full text-right tabular-nums`}
            />
          </Campo>
        )}
        {pede.ciclo && (
          <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-3">
            <input
              type="checkbox"
              checked={a.incorporaSaldo}
              onChange={(e) => setA((x) => ({ ...x, incorporaSaldo: e.target.checked }))}
            />
            O termo leva o saldo do ciclo anterior para o novo
          </label>
        )}
        <Campo rotulo="Descrição" className="sm:col-span-3">
          <input value={a.descricao} onChange={muda("descricao")} className={`${CAMPO} w-full`} />
        </Campo>
      </div>
      <p className="text-xs text-texto-3">{pede.ajuda} Aditivo não se edita: o lançado por engano a diretoria apaga.</p>
      <div className="flex gap-2">
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? "Registrando…" : "Registrar o aditivo"}
        </Botao>
        <Botao type="button" variante="discreto" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
