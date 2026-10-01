"use client";

import { useState } from "react";
import { Botao, CartaoIndicador, Chips, Painel, SoLeitura, Vazio } from "@/components/ui";
import {
  alertasDoContrato,
  situacaoDoContrato,
  type ContratoAtual,
  type SituacaoDoContrato,
} from "@/lib/medicoes/contratos";
import { emPorcento, emReais } from "@/lib/medicoes/dinheiro";
import { chaveDoCliente } from "@/lib/medicoes/medicoes";
import { quemLanca } from "@/lib/medicoes/papeis";
import { CartaoDoContrato } from "./cartao";
import { FormularioDoContrato, camposDoContrato } from "./formulario";

type Filtro = "atencao" | "vigentes" | "fora" | "todos";

const ATIVOS: SituacaoDoContrato[] = ["vigente", "vence", "a_iniciar"];

export function QuadroDeContratos({
  contratos,
  clientes,
  hoje,
  podeMexer,
}: {
  contratos: ContratoAtual[];
  clientes: string[];
  hoje: string;
  podeMexer: boolean;
}) {
  const [novo, setNovo] = useState(false);
  const pedem = (c: ContratoAtual) => alertasDoContrato(c, hoje).some((a) => a.tom === "aviso");
  const atencao = contratos.filter(pedem);
  const [filtro, setFiltro] = useState<Filtro>(atencao.length ? "atencao" : "todos");

  const ativos = contratos.filter((c) => ATIVOS.includes(situacaoDoContrato(c, hoje)));
  const fora = contratos.filter((c) => !ATIVOS.includes(situacaoDoContrato(c, hoje)));
  const comValor = ativos.filter((c) => c.valor_atual !== null);
  const valor = comValor.reduce((t, c) => t + (c.valor_atual ?? 0), 0);
  const medido = comValor.reduce((t, c) => t + c.medido, 0);
  const vencem = ativos.filter((c) => situacaoDoContrato(c, hoje) === "vence").length;

  const lista = { atencao, vigentes: ativos, fora, todos: contratos }[filtro];
  // O que pede ação primeiro; depois, o que vence antes.
  const ordenada = [...lista].sort(
    (a, b) => Number(pedem(b)) - Number(pedem(a)) || a.vigencia_atual.localeCompare(b.vigencia_atual),
  );
  const grupos = [...new Set(ordenada.map((c) => chaveDoCliente(c.cliente)))].map((k) => ({
    chave: k,
    nome: ordenada.find((c) => chaveDoCliente(c.cliente) === k)!.cliente,
    contratos: ordenada.filter((c) => chaveDoCliente(c.cliente) === k),
  }));

  return (
    <div className="space-y-4">
      {/* Uma coluna no celular: os milhões não cabem em meia tela. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoIndicador rotulo="Vigentes" valor={ativos.length} detalhe={`${fora.length} encerrado(s) ou vencido(s)`} cor="bg-disponivel" />
        <CartaoIndicador
          rotulo="Pedem atenção"
          valor={atencao.length}
          detalhe={`${vencem} vencem no prazo de aviso`}
          cor="bg-manutencao"
          destaque={atencao.length > 0}
        />
        <CartaoIndicador compacto rotulo="Valor dos vigentes" valor={emReais(valor, false)} detalhe={`${comValor.length} com valor global`} cor="bg-acento" />
        <CartaoIndicador
          compacto
          rotulo="Medido nos vigentes"
          valor={emReais(medido, false)}
          detalhe={`${emPorcento(valor > 0 ? medido / valor : null)} do valor`}
          cor="bg-saldo"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Chips
          rotulo="Quais contratos"
          valor={filtro}
          aoMudar={setFiltro}
          opcoes={[
            { valor: "atencao", rotulo: "Pedem atenção", contagem: atencao.length },
            { valor: "vigentes", rotulo: "Vigentes", contagem: ativos.length },
            { valor: "fora", rotulo: "Encerrados e vencidos", contagem: fora.length },
            { valor: "todos", rotulo: "Todos", contagem: contratos.length },
          ]}
        />
        {podeMexer && !novo && (
          <Botao variante="primario" className="ml-auto" onClick={() => setNovo(true)}>
            Novo contrato
          </Botao>
        )}
      </div>

      {!podeMexer && <SoLeitura>Você vê os contratos, mas quem cadastra é {quemLanca("contrato")}.</SoLeitura>}

      {novo && (
        <Painel titulo="Novo contrato" descricao="O cadastro de partida. O que muda depois entra como aditivo.">
          <FormularioDoContrato inicial={camposDoContrato()} clientes={clientes} aoFechar={() => setNovo(false)} />
        </Painel>
      )}

      {grupos.length === 0 ? (
        <Vazio>
          {contratos.length === 0
            ? "Nenhum contrato cadastrado ainda."
            : filtro === "atencao"
              ? "Nenhum contrato pedindo atenção. Bom sinal."
              : "Nenhum contrato aqui."}
        </Vazio>
      ) : (
        grupos.map((g) => (
          <Painel key={g.chave} titulo={g.nome} descricao={`${g.contratos.length} contrato(s)`}>
            <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
              {g.contratos.map((c) => (
                <CartaoDoContrato key={c.id} c={c} hoje={hoje} comCliente={false} />
              ))}
            </div>
          </Painel>
        ))
      )}
    </div>
  );
}
