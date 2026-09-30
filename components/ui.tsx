// Pecas visuais compartilhadas. Existem para que as nove telas tenham o
// mesmo cabecalho, o mesmo botao e o mesmo cartao — sem repetir classe
// solta em cada arquivo, que e como um sistema fica com cara de remendo.

import Link from "next/link";
import type { ReactNode } from "react";

/* ── Cabecalho de pagina ───────────────────────────────────── */

// A escala e a do roteiros (`src/components/ui.tsx`, componente `Pagina`):
// titulo 18px, resumo 13px. Aqui era 24px com resumo de 14px, e o cabecalho
// comia um quinto da tela antes de qualquer dado aparecer.

export function Cabecalho({
  titulo,
  resumo,
  acoes,
}: {
  titulo: string;
  resumo?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight">{titulo}</h1>
        {resumo && <p className="mt-0.5 text-[13px] text-texto-2">{resumo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

/* ── Botoes ────────────────────────────────────────────────── */

const BASE_BOTAO =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45";

export const ESTILO_BOTAO = {
  primario: `${BASE_BOTAO} bg-acento text-acento-texto hover:opacity-90`,
  contorno: `${BASE_BOTAO} border border-borda bg-superficie text-texto hover:bg-superficie-2`,
  discreto: `${BASE_BOTAO} text-texto-2 hover:bg-superficie-2 hover:text-texto`,
  perigo: `${BASE_BOTAO} bg-manutencao text-white hover:opacity-90`,
};

export function Botao({
  variante = "contorno",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: keyof typeof ESTILO_BOTAO;
}) {
  return <button {...props} className={`${ESTILO_BOTAO[variante]} ${className}`} />;
}

/* ── Chips de filtro ───────────────────────────────────────── */

export function Chips<T extends string>({
  valor,
  aoMudar,
  opcoes,
  rotulo,
}: {
  valor: T;
  aoMudar: (v: T) => void;
  opcoes: { valor: T; rotulo: string; contagem?: number }[];
  rotulo: string;
}) {
  return (
    <div role="tablist" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="tab"
            aria-selected={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
              ativo
                ? "border-acento/45 bg-acento-fraco text-acento"
                : "border-borda bg-superficie text-texto-2 hover:bg-superficie-2 hover:text-texto"
            }`}
          >
            {o.rotulo}
            {o.contagem !== undefined && (
              <span className={`tabular-nums ${ativo ? "opacity-70" : "text-texto-3"}`}>
                {o.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Abas ──────────────────────────────────────────────────── */

/**
 * Trocar de secao dentro de uma tela.
 *
 * Eram pilulas soltas, e a ativa era um botao azul cheio — do mesmo tamanho e
 * da mesma cor do "Reservar patrimonio" no canto oposto. Duas coisas com o
 * mesmo peso visual e significados diferentes: uma diz onde voce esta, a outra
 * faz alguma coisa acontecer.
 *
 * Um controle segmentado resolve as duas: as opcoes ficam dentro de um trilho
 * unico, entao lê-se que sao alternativas entre si, e a ativa se distingue por
 * elevacao, nao por cor de acao.
 */
export function Abas<T extends string>({
  valor,
  aoMudar,
  opcoes,
  rotulo,
}: {
  valor: T;
  aoMudar: (v: T) => void;
  opcoes: { valor: T; rotulo: string; contagem?: number }[];
  rotulo: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-xl border border-borda bg-superficie-2 p-0.5"
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="tab"
            aria-selected={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors ${
              ativo
                ? "bg-superficie text-texto shadow-cartao"
                : "text-texto-2 hover:text-texto"
            }`}
          >
            {o.rotulo}
            {o.contagem !== undefined && (
              <span
                className={`grid min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-semibold tabular-nums ${
                  ativo ? "bg-acento-fraco text-acento" : "text-texto-3"
                }`}
              >
                {o.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Abas de endereco ─────────────────────────────────────── */

/**
 * As mesmas abas, mas cada uma e um endereco: servem a pagina de servidor
 * (sem estado) e deixam a aba certa no link que se manda para alguem.
 */
export function AbasDeLink({
  atual,
  opcoes,
  rotulo,
}: {
  atual: string;
  opcoes: { href: string; rotulo: string; contagem?: number }[];
  rotulo: string;
}) {
  return (
    <nav
      aria-label={rotulo}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-xl border border-borda bg-superficie-2 p-0.5"
    >
      {opcoes.map((o) => {
        const ativo = o.href === atual;
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={ativo ? "page" : undefined}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors ${
              ativo ? "bg-superficie text-texto shadow-cartao" : "text-texto-2 hover:text-texto"
            }`}
          >
            {o.rotulo}
            {o.contagem !== undefined && (
              <span className="text-[11px] font-semibold text-texto-3 tabular-nums">{o.contagem}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Cartao de numeros ─────────────────────────────────────── */

/**
 * O cartao do quadro: um titulo, as linhas de rotulo e valor, e a barra de
 * quanto ja foi. E a peca das telas por cliente e por base — o boletim, a
 * regiao do controle, o cliente no painel executivo.
 */
export function CartaoDoQuadro({
  titulo,
  subtitulo,
  selo,
  linhas,
  destaque,
  fracao,
  corDaBarra = "bg-disponivel",
  href,
  rodape,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  selo?: ReactNode;
  linhas: { rotulo: string; valor: ReactNode }[];
  /** A ultima linha, em negrito e na cor do saldo. */
  destaque?: { rotulo: string; valor: ReactNode };
  fracao?: number | null;
  corDaBarra?: string;
  href?: string;
  rodape?: ReactNode;
}) {
  const corpo = (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {/* Nome comprido (a base) corta, e o inteiro aparece no mouse. */}
          <p
            className="truncate text-sm font-semibold"
            title={typeof titulo === "string" ? titulo : undefined}
          >
            {titulo}
          </p>
          {subtitulo && (
            <p
              className="truncate text-xs text-texto-3"
              title={typeof subtitulo === "string" ? subtitulo : undefined}
            >
              {subtitulo}
            </p>
          )}
        </div>
        {selo}
      </div>
      <dl className="mt-3 space-y-1 text-xs tabular-nums">
        {linhas.map((l) => (
          <div key={l.rotulo} className="flex justify-between gap-2">
            <dt className="text-texto-2">{l.rotulo}</dt>
            <dd className="font-medium">{l.valor}</dd>
          </div>
        ))}
        {destaque && (
          <div className="flex justify-between gap-2 border-t border-borda pt-1 text-sm">
            <dt className="font-medium text-saldo">{destaque.rotulo}</dt>
            <dd className="font-semibold text-saldo">{destaque.valor}</dd>
          </div>
        )}
      </dl>
      {fracao !== undefined && <Progresso fracao={fracao} cor={corDaBarra} />}
      {rodape && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">{rodape}</div>}
    </>
  );
  const classe =
    "block rounded-xl border border-borda bg-superficie p-4 shadow-cartao transition-colors";
  return href ? (
    <Link href={href} className={`${classe} hover:border-acento/50 hover:bg-superficie-2`}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}

/* ── Abas em cartao ───────────────────────────── */

/**
 * O mesmo que `Abas`, quando a secao fechada precisa ser vista e nao so
 * alcancada.
 *
 * O controle segmentado e discreto de proposito: ele diz onde voce esta e sai
 * da frente. Isso e certo quando as secoes sao recortes de uma mesma lista.
 * Nao serve quando o que esta do outro lado muda a decisao de quem olha — na
 * tela de Reservas, saber que ha tres maquinas ja prometidas importa mais que
 * a lista de livres, e numa pilula de 13px isso passa batido.
 *
 * Aqui cada secao e um cartao: o numero grande na cor da propria situacao, o
 * nome, e uma linha dizendo o que tem dentro. A aberta ganha borda e fundo de
 * acento; a fechada continua legivel e continua contando — que e o ponto.
 */

type CorContagem = "disponivel" | "reservado" | "expedicao" | "manutencao" | "neutro";

// Classe fixa por cor: o Tailwind so ve o que esta escrito no fonte, entao
// `text-${cor}` montado em tempo de execucao nao geraria CSS nenhum.
const TINTA_CONTAGEM: Record<CorContagem, string> = {
  disponivel: "text-disponivel",
  reservado: "text-reservado",
  expedicao: "text-expedicao",
  manutencao: "text-manutencao",
  neutro: "text-texto-2",
};

export function AbasCartao<T extends string>({
  valor,
  aoMudar,
  opcoes,
  rotulo,
}: {
  valor: T;
  aoMudar: (v: T) => void;
  opcoes: {
    valor: T;
    rotulo: string;
    contagem: number;
    descricao: string;
    cor?: CorContagem;
  }[];
  rotulo: string;
}) {
  // Classe fixa por contagem, não montada em tempo de execução: o Tailwind só
  // gera o que está escrito no fonte. Com três seções a terceira ficava
  // sozinha numa segunda linha, metade da largura e desencaixada.
  const colunas =
    opcoes.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div role="tablist" aria-label={rotulo} className={`grid gap-2 ${colunas}`}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="tab"
            aria-selected={ativo}
            onClick={() => aoMudar(o.valor)}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              ativo
                ? "border-acento bg-acento-fraco shadow-cartao"
                : "border-borda bg-superficie hover:bg-superficie-2"
            }`}
          >
            <span
              className={`grid h-11 min-w-[2.75rem] shrink-0 place-items-center rounded-lg px-2 text-xl font-semibold tabular-nums ${
                ativo ? "bg-superficie" : "bg-superficie-2"
              } ${TINTA_CONTAGEM[o.cor ?? "neutro"]}`}
            >
              {o.contagem}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-texto">{o.rotulo}</span>
              <span className="block text-xs leading-snug text-texto-2">{o.descricao}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Campos ────────────────────────────────────────────────── */

export const CAMPO =
  "h-9 rounded-lg border border-borda bg-superficie px-3 text-sm text-texto outline-none transition-colors placeholder:text-texto-3 focus:border-acento";

export function Campo({
  rotulo,
  obrigatorio,
  className = "",
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-xs font-medium text-texto-2 ${className}`}>
      {rotulo}
      {obrigatorio && <span className="text-manutencao"> *</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ── Cartao de indicador ───────────────────────────────────── */

export function CartaoIndicador({
  rotulo,
  valor,
  detalhe,
  cor,
  destaque,
  compacto,
  children,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: string;
  /** Número menor, para dinheiro com centavos ("R$ 1.558.887,59"). */
  compacto?: boolean;
  /** O que vai abaixo do número — uma barra de progresso, por exemplo. */
  children?: ReactNode;
  /** Classe de fundo do ponto, ex: "bg-disponivel". */
  cor?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-superficie p-4 shadow-cartao ${
        destaque ? "border-manutencao/45" : "border-borda"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {cor && <span className={`size-2 rounded-full ${cor}`} />}
        <span className="text-[11px] font-semibold tracking-wide text-texto-3 uppercase">
          {rotulo}
        </span>
      </div>
      <p
        className={`mt-1.5 leading-none font-semibold tabular-nums ${
          compacto ? "text-xl sm:text-2xl" : "text-3xl"
        } ${destaque ? "text-manutencao" : ""}`}
      >
        {valor}
      </p>
      {detalhe && <p className="mt-1 text-xs text-texto-3">{detalhe}</p>}
      {children}
    </div>
  );
}

/* ── Barra de progresso ────────────────────────────────────── */

/** Quanto de um todo já foi — o faturado do medido, por exemplo. */
export function Progresso({ fracao, cor = "bg-acento" }: { fracao: number | null; cor?: string }) {
  const pct = fracao === null ? 0 : Math.min(100, Math.max(0, fracao * 100));
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-3">
      {/* A largura é o dado da barra: a única coisa que muda por uso. */}
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Painel com titulo ─────────────────────────────────────── */

/**
 * Painel, opcionalmente recolhivel.
 *
 * Quem passa `aoRecolher` ganha o titulo clicavel e a seta; quem nao passa tem
 * o painel de sempre, sem um pixel de diferenca. O estado fica com quem chama,
 * e nao aqui dentro: este arquivo e usado por pagina de servidor, e um
 * `useState` no Painel obrigaria metade das telas a virar componente de
 * cliente para ganhar um painel que fecha.
 *
 * O `acoes` continua visivel com o painel fechado, de proposito: e ali que
 * mora o total: "Custo na lista" fechado ainda diz quanto.
 */
export function Painel({
  titulo,
  descricao,
  acoes,
  children,
  className = "",
  recolhido,
  aoRecolher,
}: {
  titulo?: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
  /** So vale junto de `aoRecolher`. */
  recolhido?: boolean;
  /** Passar isto e o que torna o painel recolhivel. */
  aoRecolher?: () => void;
}) {
  const cabeca = (
    <>
      {titulo && <span className="block text-sm font-semibold">{titulo}</span>}
      {descricao && <span className="block text-xs text-texto-3">{descricao}</span>}
    </>
  );

  return (
    <section
      className={`overflow-hidden rounded-xl border border-borda bg-superficie shadow-cartao ${className}`}
    >
      {(titulo || acoes) && (
        <header className="flex flex-wrap items-center gap-3 border-b border-borda px-4 py-3">
          {aoRecolher ? (
            // O <h2> continua sendo o titulo da secao, com o botao dentro: e o
            // que faz o leitor de tela anunciar "secao fechada" em vez de um
            // botao solto sem dono.
            <h2 className="min-w-0">
              <button
                type="button"
                onClick={aoRecolher}
                aria-expanded={!recolhido}
                className="-m-1.5 flex min-w-0 items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-superficie-2"
              >
                <Seta aberta={!recolhido} />
                <span className="min-w-0">{cabeca}</span>
              </button>
            </h2>
          ) : (
            <div className="min-w-0">
              {titulo && <h2 className="text-sm font-semibold">{titulo}</h2>}
              {descricao && <p className="text-xs text-texto-3">{descricao}</p>}
            </div>
          )}
          {acoes && <div className="ml-auto flex items-center gap-2">{acoes}</div>}
        </header>
      )}
      {!recolhido && children}
    </section>
  );
}

/** A seta do painel recolhivel. Aponta para baixo quando esta aberto. */
function Seta({ aberta }: { aberta: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`size-4 shrink-0 text-texto-3 transition-transform ${
        aberta ? "" : "-rotate-90"
      }`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ── Coluna de quadro ──────────────────────────────────────── */

export function Coluna({
  titulo,
  contagem,
  cor,
  children,
  className = "",
  ...resto
}: {
  titulo: string;
  contagem: number;
  /** Classe de fundo da faixa do topo, ex: "bg-disponivel". */
  cor: string;
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      aria-label={titulo}
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-borda bg-superficie shadow-cartao transition-colors ${className}`}
      {...resto}
    >
      {/* Faixa colorida no topo identifica a coluna sem precisar de legenda. */}
      <div className={`h-1 ${cor}`} />
      <header className="flex items-center gap-2 border-b border-borda px-3 py-2.5">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <span className="ml-auto grid min-w-[22px] place-items-center rounded-full bg-superficie-3 px-1.5 py-0.5 text-xs font-medium tabular-nums text-texto-2">
          {contagem}
        </span>
      </header>
      {children}
    </section>
  );
}

/* ── Selo ──────────────────────────────────────────────────── */

export function Selo({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: "neutro" | "aviso" | "ok" | "acento" | "transito";
}) {
  const tons = {
    neutro: "border-borda text-texto-3",
    aviso: "border-manutencao/40 bg-manutencao/10 text-manutencao",
    ok: "border-disponivel/40 bg-disponivel/10 text-disponivel",
    acento: "border-acento/40 bg-acento-fraco text-acento",
    // Em trânsito: a mesma cor da expedição, que é a outra coisa que sai
    // daqui e ainda não chegou.
    transito: "border-expedicao/40 bg-expedicao/10 text-expedicao",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 whitespace-nowrap py-0.5 text-[10px] font-semibold tracking-wide uppercase ${tons[tom]}`}
    >
      {children}
    </span>
  );
}

/* ── Avisos ────────────────────────────────────────────────── */

export function Aviso({
  tom,
  children,
  aoFechar,
}: {
  tom: "erro" | "ok";
  children: ReactNode;
  aoFechar?: () => void;
}) {
  const cor =
    tom === "erro"
      ? "border-manutencao/40 bg-manutencao/10 text-manutencao"
      : "border-disponivel/40 bg-disponivel/10 text-disponivel";
  return (
    <p
      role={tom === "erro" ? "alert" : undefined}
      className={`flex items-center justify-between gap-4 rounded-lg border px-3.5 py-2.5 text-sm ${cor}`}
    >
      {children}
      {aoFechar && (
        <button type="button" onClick={aoFechar} className="text-xs underline">
          fechar
        </button>
      )}
    </p>
  );
}

/* ── Vazio ─────────────────────────────────────────────────── */

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-borda bg-superficie px-4 py-12 text-center text-sm text-texto-3">
      {children}
    </div>
  );
}
