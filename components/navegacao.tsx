"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconeAbertos,
  IconeArquivo,
  IconeBase,
  IconeContrato,
  IconeLancar,
  IconeMedicoes,
  IconePainel,
  IconeReceber,
  IconeUsuarios,
} from "./icones";

// Uma seção por time, porque são dois trabalhos diferentes:
//
//   Orçamento — a medição de MANUTENÇÃO, OM por OM, colada do Sisloc. Vira o
//     boletim que vai ao cliente. É a tela inicial.
//   Faturamento — as medições do contrato inteiro (manutenção, locação e
//     indenização) por região, conforme o faturamento anda. É o que aparece
//     no painel da diretoria.
//
// Os dois não se misturam: o boletim não alimenta o painel sozinho.
//
//   BMs em aberto — a conferência dos boletins que recebem OMs o mês todo. O
//     contador é o de abertos pedindo atenção (`pendenciasDoAberto`).
//
//   Contratos — o que vence, o que reajusta e quanto já foi medido. O contador
//     do item é o de contratos pedindo ação (ver `contratosPedindoAtencao`).
const SECOES = [
  {
    titulo: "Orçamento · manutenção",
    itens: [
      { href: "/", rotulo: "Lançar medições de manutenção", Icone: IconeMedicoes },
      { href: "/boletins/abertos", rotulo: "BMs em aberto", Icone: IconeAbertos },
      { href: "/bases", rotulo: "Cadastro de bases", Icone: IconeBase },
    ],
  },
  {
    titulo: "Faturamento · painel",
    itens: [
      { href: "/controle/lancar", rotulo: "Lançar medições", Icone: IconeLancar },
      { href: "/controle", rotulo: "Painel executivo", Icone: IconePainel },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [{ href: "/controle/receber", rotulo: "Lançar recebimentos", Icone: IconeReceber }],
  },
  {
    titulo: "Consulta",
    itens: [
      { href: "/contratos", rotulo: "Contratos", Icone: IconeContrato },
      { href: "/clientes", rotulo: "Arquivo por cliente", Icone: IconeArquivo },
    ],
  },
  {
    titulo: "Administração",
    soGestor: true,
    itens: [{ href: "/usuarios", rotulo: "Usuários", Icone: IconeUsuarios }],
  },
];

export function BarraLateral({
  pendencias,
  aberta,
  aoFechar,
  gestor,
}: {
  pendencias?: Record<string, number>;
  aberta: boolean;
  aoFechar: () => void;
  gestor?: boolean;
}) {
  const caminho = usePathname();
  // O middleware ja barra a rota; esconder o item so evita mostrar porta
  // fechada. Quem decide de verdade e a RLS.
  const secoes = SECOES.filter((s) => !s.soGestor || gestor);

  const conteudo = (
    <div className="flex flex-col gap-5 p-3">
      {secoes.map((secao) => (
        <div key={secao.titulo}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.08em] text-texto-3 uppercase">
            {secao.titulo}
          </p>
          <ul className="space-y-0.5">
            {secao.itens.map(({ href, rotulo, Icone }) => {
              // "/" e "/controle" têm filhos com item próprio no menu: só a própria.
              const exato = href === "/";
              // O painel executivo tem duas abas; o lançamento tem item próprio.
              const ativo = exato
                ? caminho === href
                : href === "/controle"
                  ? caminho === "/controle" || caminho.startsWith("/controle/todos") || caminho.startsWith("/controle/relatorio")
                  : caminho.startsWith(href);
              const n = pendencias?.[href] ?? 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={ativo ? "page" : undefined}
                    onClick={aoFechar}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      ativo
                        ? "bg-acento-fraco text-acento"
                        : "text-texto-2 hover:bg-superficie-2 hover:text-texto"
                    }`}
                  >
                    <Icone className={`size-[18px] shrink-0 ${ativo ? "" : "text-texto-3"}`} />
                    <span className="min-w-0 flex-1 truncate">{rotulo}</span>
                    {/* Contador de pendencia: so aparece quando ha o que fazer. */}
                    {n > 0 && (
                      <span
                        className={`grid min-w-[20px] place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                          ativo
                            ? "bg-acento text-acento-texto"
                            : "bg-superficie-3 text-texto-2"
                        }`}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Fixa no desktop */}
      <aside className="hidden w-56 shrink-0 border-r border-borda bg-superficie lg:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto">{conteudo}</div>
      </aside>

      {/* Gaveta no mobile */}
      {aberta && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={aoFechar}
            aria-hidden
          />
          <nav
            aria-label="Seções"
            className="absolute inset-y-0 left-0 w-64 overflow-y-auto border-r border-borda bg-superficie shadow-alta"
          >
            {conteudo}
          </nav>
        </div>
      )}
    </>
  );
}
