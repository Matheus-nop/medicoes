"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  acharBase,
  dadosDoBoletimNovo,
  proximoDocumento,
  type Base,
} from "@/lib/medicoes/bases";
import {
  acharComprovantes,
  chaveDoCliente,
  chaveDoDestino,
  dataDaOm,
  descricaoDoEquipamento,
  mesDeReferencia,
  modeloLido,
  omValida,
  type DemandaDoRoteiros,
  type ModeloDoPapel,
  type OmLida,
  type OsComOms,
  type SituacaoBoletim,
} from "@/lib/medicoes/medicoes";
import { quemLanca } from "@/lib/medicoes/papeis";

export interface Resultado {
  ok: boolean;
  erro?: string;
  /** O boletim que recebeu as OMs — o novo, quando nasceu agora. */
  boletimId?: number;
  numero?: string;
  incluidas?: number;
  /** OMs que já estavam em outro boletim, com o número dele. */
  jaMedidas?: { om: string; numero: string }[];
  /** Quantos comprovantes (retirada + entrega) foram achados sozinhos. */
  comprovantes?: number;
  /** O Roteiros não respondeu (a 0003 falta?) — só a OS foi consultada. */
  semRoteiros?: boolean;
}

type Cliente = Awaited<ReturnType<typeof createClient>>;

/**
 * As duas fontes dos comprovantes, lidas de uma vez para todas as OMs.
 *
 * A OS do Estoque e as demandas do Roteiros, pelas duas funções da 0003. Se a
 * função ainda não existir, segue só com a OS — comprovante é conveniência, e
 * a falta dele não pode impedir ninguém de montar o boletim.
 */
async function fontesDosComprovantes(
  supabase: Cliente,
  patrimonios: string[],
): Promise<{ ordens: OsComOms[]; demandas: DemandaDoRoteiros[]; semRoteiros: boolean }> {
  const lista = [...new Set(patrimonios.filter(Boolean))];
  const [os, dem] = await Promise.all([
    supabase.rpc("os_com_oms"),
    lista.length
      ? supabase.rpc("demandas_dos_patrimonios", { p_patrimonios: lista })
      : Promise.resolve({ data: [], error: null }),
  ]);
  const ordens = (os.data ?? []) as OsComOms[];
  return {
    ordens,
    demandas: (dem.data ?? []) as DemandaDoRoteiros[],
    semRoteiros: Boolean(dem.error || os.error),
  };
}

function recado(erro: { code?: string; message: string }, oQue: string): string {
  if (erro.code === "42501") {
    return `Seu usuário não tem permissão para ${oQue} — quem lança boletim e base é ${quemLanca("boletim")}.`;
  }
  if (erro.code === "23505") {
    return "Alguma dessas OMs acabou de entrar em outro boletim. Recarregue a tela e cole de novo.";
  }
  if (erro.code === "42P01") {
    return "Falta aplicar a migração 0002_boletins.sql no Supabase.";
  }
  // Coluna que não existe: a 0002 entrou pela metade (colagem cortada).
  if (erro.code === "42703" || erro.code === "PGRST204") {
    return "A migração 0002_boletins.sql entrou pela metade no Supabase. Rode de novo — ela é idempotente.";
  }
  return `Não foi possível ${oQue}: ${erro.message}`;
}

/**
 * O update que "deu certo" sem mexer em nada.
 *
 * Com o boletim fechado, a policy não deixa ver a OM, e o Postgres responde
 * zero linhas em vez de erro. Sem esta conferência a tela diria "salvo" para
 * quem não salvou nada.
 */
const fechado: Resultado = {
  ok: false,
  erro: "O boletim não está aberto — OM de boletim fechado não muda. Peça à diretoria para reabrir.",
};

function refazer(boletimId?: number) {
  revalidatePath("/");
  if (boletimId) revalidatePath(`/boletins/${boletimId}`);
}

/* ── Colar ─────────────────────────────────────────────────── */

/**
 * Guarda `nome` (como o Sisloc escreveu) entre os nomes da base `base` do
 * cadastro, quando são diferentes. Sem a 0017, ou sem a base, não faz nada.
 */
async function lembrarNomeDaBase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cliente: string,
  base: string | undefined,
  nome: string | undefined,
) {
  if (!base?.trim() || !nome?.trim()) return;
  if (chaveDoDestino(cliente, base) === chaveDoDestino(cliente, nome)) return;
  const { data, error } = await supabase.from("bases").select("id, cliente, nome, apelidos");
  if (error) return;
  const alvo = acharBase((data ?? []) as Base[], cliente, base);
  if (!alvo || acharBase([alvo], cliente, nome)) return;
  await supabase
    .from("bases")
    .update({ apelidos: [...(alvo.apelidos ?? []), nome.trim()] })
    .eq("id", alvo.id);
}

/**
 * Põe as OMs coladas num boletim — o aberto que a tela escolheu, ou um novo.
 *
 * A OM que já está em qualquer boletim fica de fora e volta na resposta com o
 * número de onde está: a constraint `medicao_om_uma_vez` barraria de qualquer
 * jeito, mas barrar a colagem inteira por causa de uma OM obrigaria a pessoa a
 * achar qual era.
 */
export async function incluirOms(entrada: {
  boletimId: number | null;
  cliente: string;
  /** A base do boletim novo. Ignorada quando `boletimId` já existe. */
  base: string;
  linhas: OmLida[];
  /**
   * O que a pessoa acertou no cartão da colagem antes de abrir: a base do
   * cadastro (ou o nome da base nova), o Documento Nº e o mês de referência —
   * vazio, vale o que o sistema calcula. `lembrarComo` é o nome que o Sisloc
   * escreveu: se a base escolhida tem outro nome, ele vira um dos nomes dela.
   */
  escolha?: { base?: string; documento?: string; referencia?: string; lembrarComo?: string };
}): Promise<Resultado> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const oms = [...new Set(entrada.linhas.map((l) => l.om))];
  if (oms.length === 0) return { ok: false, erro: "Nenhuma OM para incluir." };

  const { data: existentes, error: erroExistentes } = await supabase
    .from("boletim_oms")
    .select("om, boletins(numero)")
    .in("om", oms);
  if (erroExistentes) return { ok: false, erro: recado(erroExistentes, "conferir as OMs") };

  const jaMedidas = ((existentes ?? []) as unknown as {
    om: string;
    boletins: { numero: string } | null;
  }[]).map((e) => ({ om: e.om, numero: e.boletins?.numero ?? "outro boletim" }));
  const fora = new Set(jaMedidas.map((j) => j.om));
  const novas = entrada.linhas.filter((l) => !fora.has(l.om));
  if (novas.length === 0) {
    return { ok: false, erro: "Todas essas OMs já estão em algum boletim.", jaMedidas };
  }

  let boletimId = entrada.boletimId;
  let numero: string | undefined;

  if (boletimId === null) {
    // O nome que já está nos boletins vence o da colagem: "S.A." e "S.A" são o
    // mesmo cliente, e o painel soma por nome. E o boletim anterior da MESMA
    // base empresta o contato, o telefone e o endereço da obra — é o que o
    // antigo fazia copiando a planilha do mês passado.
    const [{ data: anteriores }, cadastro] = await Promise.all([
      supabase
        .from("boletins")
        .select("cliente, base, contato, email, telefone, local_obra, observacao, modelo, documento")
        .order("id", { ascending: false }),
      supabase.from("bases").select("*"),
    ]);
    type Anterior = {
      cliente: string;
      base: string | null;
      contato: string | null;
      email: string | null;
      telefone: string | null;
      local_obra: string | null;
      observacao: string | null;
      modelo: ModeloDoPapel;
      documento: string | null;
    };
    const lista = (anteriores ?? []) as Anterior[];
    // Sem a 0010 o cadastro não existe: segue como antes, pelo último boletim.
    const bases = cadastro.error ? [] : ((cadastro.data ?? []) as Base[]);
    const chave = chaveDoCliente(entrada.cliente);
    const conhecido = lista.find((b) => chaveDoCliente(b.cliente) === chave)?.cliente;
    const nomeDoCliente = (conhecido ?? entrada.cliente).trim();
    const baseEscolhida = entrada.escolha?.base?.trim() || entrada.base;
    const daBase = acharBase(bases, entrada.cliente, baseEscolhida);
    const destino = chaveDoDestino(entrada.cliente, daBase?.nome ?? baseEscolhida);
    const mesmaBase = lista.find((b) => chaveDoDestino(b.cliente, b.base) === destino);
    // O cadastro manda; o último boletim da base completa; o cliente dá o papel.
    const dados = dadosDoBoletimNovo(nomeDoCliente, daBase, mesmaBase ?? null);
    const nomeDaBase = daBase?.nome ?? mesmaBase?.base ?? (baseEscolhida.trim().replace(/\s+/g, " ") || null);
    const documento = entrada.escolha?.documento?.trim();
    const referencia = entrada.escolha?.referencia?.trim().toUpperCase().replace(/\s*\/\s*/, "/");

    const { data, error } = await supabase
      .from("boletins")
      .insert({
        cliente: nomeDoCliente,
        base: nomeDaBase,
        contato: dados.contato,
        email: dados.email,
        telefone: dados.telefone,
        local_obra: dados.local_obra,
        observacao: dados.observacao,
        modelo: dados.modelo,
        // O próximo número da base ("08" → "09"), como o cliente conta —
        // ou o que a pessoa escreveu no cartão.
        documento: documento || (nomeDaBase ? proximoDocumento(lista, nomeDoCliente, nomeDaBase) : null),
        referencia:
          referencia ||
          mesDeReferencia(novas.map((l) => dataDaOm({ chegada_em: l.chegadaEm, aberta_em: l.abertaEm }))),
        criado_por: auth.user.id,
      })
      .select("id, numero")
      .single();
    if (error) return { ok: false, erro: recado(error, "abrir o boletim") };
    boletimId = data.id as number;
    numero = data.numero as string;
    // Base nova entra no cadastro com o que se sabe dela — da próxima vez o
    // boletim já nasce com os dados que alguém completar lá.
    if (!daBase && nomeDaBase && !cadastro.error) {
      await supabase.from("bases").insert({
        cliente: nomeDoCliente,
        nome: nomeDaBase,
        responsavel: dados.contato,
        email: dados.email,
        telefone: dados.telefone,
        local_obra: dados.local_obra,
        modelo: dados.modelo,
      });
    }
  }

  // O nome do Sisloc vira um dos nomes da base escolhida: da próxima vez a
  // colagem acha a base sozinha. Falhar aqui não desfaz o boletim.
  await lembrarNomeDaBase(supabase, entrada.cliente, entrada.escolha?.base, entrada.escolha?.lembrarComo);

  // Os comprovantes, antes de gravar: o "OM RETIRADA" do Sisloc vale mais
  // que o achado; o achado preenche o que o Sisloc deixou vazio.
  const fontes = await fontesDosComprovantes(
    supabase,
    novas.map((l) => l.patrimonio),
  );
  let achados = 0;
  const comprovantes = new Map(
    novas.map((l) => {
      const c = acharComprovantes(
        { om: l.om, patrimonio: l.patrimonio, abertaEm: l.abertaEm, entregueEm: l.entregueEm },
        fontes.ordens,
        fontes.demandas,
      );
      const retirada = l.omRetirada || c.retirada;
      if (!l.omRetirada && c.retirada) achados += 1;
      if (c.entrega) achados += 1;
      return [l.om, { retirada, entrega: c.entrega }];
    }),
  );

  const { error } = await supabase.from("boletim_oms").insert(
    novas.map((l) => ({
      boletim_id: boletimId,
      om: l.om,
      patrimonio: l.patrimonio || null,
      equipamento: descricaoDoEquipamento(l.equipamento, l.complemento) || null,
      local: l.local || null,
      cidade: l.cidade || null,
      tipo_om: l.tipoOm || null,
      complemento: l.complemento || null,
      aberta_em: l.abertaEm,
      concluida_em: l.concluidaEm,
      entregue_em: l.entregueEm,
      previsto: l.previsto,
      gasto: l.gasto,
      orcamento: l.orcamento,
      valor: l.valor,
      fonte: l.fonte,
      origem: l.origem,
      om_retirada: comprovantes.get(l.om)?.retirada || null,
      recibo_entrega: comprovantes.get(l.om)?.entrega || null,
      chegada_em: l.chegadaEm,
      etapa_om: l.etapaBruta || null,
      incluido_por: auth.user!.id,
    })),
  );
  if (error) {
    // 42501 aqui quer dizer boletim fechado: a policy de insert olha o
    // último andamento.
    if (error.code === "42501") return fechado;
    return { ok: false, erro: recado(error, "incluir as OMs"), boletimId: boletimId ?? undefined };
  }

  refazer(boletimId);
  return {
    ok: true,
    boletimId,
    numero,
    incluidas: novas.length,
    jaMedidas,
    comprovantes: achados,
    semRoteiros: fontes.semRoteiros,
  };
}

/* ── A OM dentro do boletim ────────────────────────────────── */

export async function mudarValor(
  boletimId: number,
  itemId: number,
  valor: number,
): Promise<Resultado> {
  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, erro: "Valor tem de ser um número, zero ou maior." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boletim_oms")
    .update({ valor: Math.round(valor * 100) / 100, fonte: "manual" })
    .eq("id", itemId)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "mudar o valor") };
  if (!data?.length) return fechado;
  refazer(boletimId);
  return { ok: true };
}

/** Tudo o que vai para o papel numa linha do boletim. */
export interface CamposDaOm {
  om: string;
  equipamento: string;
  patrimonio: string;
  /** "2026-07-23", ou vazio. */
  data: string;
  omRetirada: string;
  reciboEntrega: string;
  valor: number;
  observacao: string;
}

/** Os campos, prontos para o banco. A data digitada vira a DATA da linha. */
function linhaDigitada(c: CamposDaOm) {
  const t = (v: string) => v.trim() || null;
  const numero = (v: string) => v.replace(/\s+/g, "") || null;
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(c.data) ? `${c.data}T12:00:00-03:00` : null;
  return {
    om: c.om.replace(/\s+/g, ""),
    equipamento: t(c.equipamento.toUpperCase()),
    patrimonio: t(c.patrimonio.toUpperCase()),
    chegada_em: dia,
    om_retirada: numero(c.omRetirada),
    recibo_entrega: numero(c.reciboEntrega),
    valor: Math.round(c.valor * 100) / 100,
    observacao: t(c.observacao),
  };
}

function validar(c: CamposDaOm): string | null {
  if (!omValida(c.om)) return "O Nº OM é o número do Sisloc (só dígitos) ou o do comprovante (1170-01).";
  if (!c.equipamento.trim()) return "Falta a descrição do equipamento ou do serviço.";
  if (!Number.isFinite(c.valor) || c.valor < 0) return "Valor tem de ser zero ou maior.";
  return null;
}

/**
 * Corrige uma linha do boletim — qualquer campo que vai para o papel.
 *
 * O automático (a colagem, a OS, o Roteiros) é o ponto de partida; quem monta
 * o boletim tem a última palavra. Mudou o valor, a fonte vira `manual`, para
 * a tela não continuar dizendo que ele veio do orçamento.
 */
export async function editarOm(
  boletimId: number,
  itemId: number,
  campos: CamposDaOm,
  valorAnterior: number,
): Promise<Resultado> {
  const problema = validar(campos);
  if (problema) return { ok: false, erro: problema };
  const linha = linhaDigitada(campos);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boletim_oms")
    .update(linha.valor !== valorAnterior ? { ...linha, fonte: "manual" } : linha)
    .eq("id", itemId)
    .select("id");
  if (error) {
    if (error.code === "23505") return { ok: false, erro: `A OM ${linha.om} já está em outro boletim.` };
    return { ok: false, erro: recado(error, "salvar a OM") };
  }
  if (!data?.length) return fechado;
  refazer(boletimId);
  return { ok: true };
}

/**
 * A OM que não veio na colagem — digitada inteira.
 *
 * Acontece: a OM que o PCM ainda não encerrou, a que está em outra tela do
 * Sisloc, o serviço combinado por fora. Entra com fonte `manual`, e a mesma
 * trava de sempre vale: OM que já está em outro boletim não entra.
 */
export async function incluirOmAMao(boletimId: number, campos: CamposDaOm): Promise<Resultado> {
  const problema = validar(campos);
  if (problema) return { ok: false, erro: problema };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = linhaDigitada(campos);
  const { error } = await supabase.from("boletim_oms").insert({
    ...linha,
    boletim_id: boletimId,
    // A data digitada também ordena a linha no papel.
    aberta_em: linha.chegada_em,
    fonte: "manual",
    origem: "digitada no boletim",
    incluido_por: auth.user.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, erro: `A OM ${linha.om} já está em outro boletim.` };
    if (error.code === "42501") return fechado;
    return { ok: false, erro: recado(error, "incluir a OM") };
  }
  refazer(boletimId);
  return { ok: true, incluidas: 1 };
}

/**
 * Os dois recibos da linha: o de retirada (que o Sisloc às vezes traz, no
 * "OM RETIRADA") e o de entrega (que ele não traz nunca).
 */
export async function mudarRecibos(
  boletimId: number,
  itemId: number,
  recibos: { omRetirada: string; reciboEntrega: string },
): Promise<Resultado> {
  const limpo = (t: string) => t.replace(/\s+/g, "") || null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boletim_oms")
    .update({
      om_retirada: limpo(recibos.omRetirada),
      recibo_entrega: limpo(recibos.reciboEntrega),
    })
    .eq("id", itemId)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "salvar a proposta e a OM entrega") };
  if (!data?.length) return fechado;
  refazer(boletimId);
  return { ok: true };
}

/**
 * Procura de novo os comprovantes das OMs que estão sem.
 *
 * O retorno ao cliente costuma acontecer DEPOIS de a OM entrar no boletim: na
 * colagem ainda não havia comprovante de entrega para achar. Este botão é o
 * "olhar de novo" antes de fechar. Só preenche o que está vazio.
 */
export async function buscarComprovantes(boletimId: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data: itens, error } = await supabase
    .from("boletim_oms")
    .select("id, om, patrimonio, aberta_em, entregue_em, om_retirada, recibo_entrega")
    .eq("boletim_id", boletimId);
  if (error) return { ok: false, erro: recado(error, "ler as OMs") };

  const faltando = (itens ?? []).filter((i) => !i.om_retirada || !i.recibo_entrega);
  if (faltando.length === 0) return { ok: true, comprovantes: 0 };

  const fontes = await fontesDosComprovantes(
    supabase,
    faltando.map((i) => i.patrimonio ?? ""),
  );
  let achados = 0;
  for (const i of faltando) {
    const c = acharComprovantes(
      { om: i.om, patrimonio: i.patrimonio, abertaEm: i.aberta_em, entregueEm: i.entregue_em },
      fontes.ordens,
      fontes.demandas,
    );
    const mudar: { om_retirada?: string; recibo_entrega?: string } = {};
    if (!i.om_retirada && c.retirada) mudar.om_retirada = c.retirada;
    if (!i.recibo_entrega && c.entrega) mudar.recibo_entrega = c.entrega;
    if (!Object.keys(mudar).length) continue;
    const { data, error: erroUpdate } = await supabase
      .from("boletim_oms")
      .update(mudar)
      .eq("id", i.id)
      .select("id");
    if (erroUpdate) return { ok: false, erro: recado(erroUpdate, "gravar os comprovantes") };
    if (!data?.length) return fechado;
    achados += Object.keys(mudar).length;
  }

  refazer(boletimId);
  return { ok: true, comprovantes: achados, semRoteiros: fontes.semRoteiros };
}

export async function tirarOm(boletimId: number, itemId: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boletim_oms")
    .delete()
    .eq("id", itemId)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "tirar a OM") };
  if (!data?.length) return fechado;
  refazer(boletimId);
  return { ok: true };
}

/* ── O boletim ─────────────────────────────────────────────── */

/** Os campos do cabeçalho do papel que não vêm do Sisloc. */
export interface CabecalhoDoBoletim {
  referencia: string;
  base: string;
  contato: string;
  email: string;
  telefone: string;
  localObra: string;
  observacao: string;
  modelo: ModeloDoPapel;
  /** O DOCUMENTO Nº à mão. Vazio, vale o da casa. */
  documento: string;
}

export async function editarBoletim(
  boletimId: number,
  campos: CabecalhoDoBoletim,
): Promise<Resultado> {
  const t = (v: string) => v.trim() || null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boletins")
    .update({
      referencia: t(campos.referencia.toUpperCase()),
      base: t(campos.base),
      contato: t(campos.contato),
      email: t(campos.email.toLowerCase()),
      telefone: t(campos.telefone),
      local_obra: t(campos.localObra),
      observacao: t(campos.observacao),
      modelo: modeloLido(campos.modelo),
      documento: t(campos.documento.toUpperCase()),
    })
    .eq("id", boletimId)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "salvar o boletim") };
  if (!data?.length) return fechado;
  refazer(boletimId);
  return { ok: true };
}

/**
 * Um passo do boletim: fechar, enviar, faturar — ou reabrir, que é da diretoria.
 *
 * A ordem dos passos é conferida aqui, e não na RLS: a policy de
 * `boletim_andamentos` não pode ler a própria tabela sem entrar em recursão.
 * O que a RLS garante é o que não pode falhar nunca — quem assina é quem
 * apertou, e só a diretoria reabre.
 */
export async function andar(
  boletimId: number,
  para: SituacaoBoletim,
  observacao = "",
): Promise<Resultado> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { data: atual, error: erroAtual } = await supabase
    .from("boletins_atual")
    .select("situacao, oms")
    .eq("id", boletimId)
    .maybeSingle();
  if (erroAtual) return { ok: false, erro: recado(erroAtual, "ler o boletim") };
  if (!atual) return { ok: false, erro: "Boletim não encontrado." };

  const de = atual.situacao as SituacaoBoletim;
  const permitido: Record<SituacaoBoletim, SituacaoBoletim[]> = {
    aberto: ["fechado"],
    fechado: ["enviado", "aberto"],
    enviado: ["faturado", "aberto"],
    faturado: [],
  };
  if (!permitido[de].includes(para)) {
    return { ok: false, erro: "Este passo não vale para a situação atual do boletim. Recarregue a tela." };
  }
  if (para === "fechado" && atual.oms === 0) {
    return { ok: false, erro: "Boletim sem OM não se fecha." };
  }
  if (para === "aberto" && !observacao.trim()) {
    return { ok: false, erro: "Diga por que o boletim está sendo reaberto." };
  }

  const { error } = await supabase.from("boletim_andamentos").insert({
    boletim_id: boletimId,
    situacao: para,
    quem: auth.user.id,
    observacao: observacao.trim() || null,
  });
  if (error) {
    if (error.code === "42501" && para === "aberto") {
      return { ok: false, erro: "Só a diretoria reabre boletim." };
    }
    return { ok: false, erro: recado(error, "registrar o passo") };
  }
  refazer(boletimId);
  return { ok: true };
}

/**
 * Traz para o boletim aberto os dados do cadastro da base — responsável,
 * e-mail, telefone, local da obra, observação e papel. O que o cadastro não
 * tem, o boletim mantém.
 */
export async function puxarDaBase(boletimId: number): Promise<Resultado> {
  const supabase = await createClient();
  const [{ data: b }, cadastro] = await Promise.all([
    supabase.from("boletins").select("cliente, base, contato, email, telefone, local_obra, observacao, modelo").eq("id", boletimId).maybeSingle(),
    supabase.from("bases").select("*"),
  ]);
  if (!b) return { ok: false, erro: "Boletim não encontrado." };
  if (cadastro.error) return { ok: false, erro: "Falta aplicar a migração 0010_bases.sql no Supabase." };
  const base = acharBase((cadastro.data ?? []) as Base[], b.cliente, b.base);
  if (!base) return { ok: false, erro: "Esta base ainda não está no cadastro. Cadastre em Cadastro de bases." };
  const d = dadosDoBoletimNovo(b.cliente, base, {
    contato: b.contato,
    email: b.email,
    telefone: b.telefone,
    local_obra: b.local_obra,
    observacao: b.observacao,
    modelo: b.modelo,
  });
  const { data, error } = await supabase
    .from("boletins")
    .update({
      contato: d.contato,
      email: d.email,
      telefone: d.telefone,
      local_obra: d.local_obra,
      observacao: d.observacao,
      modelo: d.modelo,
    })
    .eq("id", boletimId)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "puxar os dados da base") };
  if (!data?.length) return fechado;
  refazer(boletimId);
  return { ok: true };
}

/* ── A OM faturada ─────────────────────────────────────────── */

/**
 * Marca a OM como faturada — o STATUS do papel da Rio+, e o faturado do painel.
 * Só com o boletim fechado ou enviado: a RLS (0004) confere.
 */
export async function faturarOm(
  boletimId: number,
  itemId: number,
  notaFiscal: string,
): Promise<Resultado> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await supabase.from("om_faturadas").insert({
    boletim_om_id: itemId,
    nota_fiscal: notaFiscal.trim() || null,
    quem: auth.user.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Esta OM já está faturada." };
    if (error.code === "42501") {
      return { ok: false, erro: "Só se fatura OM de boletim fechado ou enviado." };
    }
    return { ok: false, erro: recado(error, "marcar a OM como faturada") };
  }
  refazer(boletimId);
  return { ok: true };
}

/** A marcação errada do dia. Só quem marcou ou a diretoria desfaz. */
export async function desfazerFaturamento(boletimId: number, itemId: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("om_faturadas")
    .delete()
    .eq("boletim_om_id", itemId)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "desfazer o faturamento") };
  if (!data?.length) {
    return { ok: false, erro: "Só quem marcou a OM como faturada, ou a diretoria, desfaz." };
  }
  refazer(boletimId);
  return { ok: true };
}

export async function apagarBoletim(boletimId: number): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boletins")
    .delete()
    .eq("id", boletimId)
    .select("id");
  if (error) return { ok: false, erro: recado(error, "apagar o boletim") };
  if (!data?.length) {
    return {
      ok: false,
      erro: "Só se apaga boletim aberto, e só quem o abriu ou a diretoria.",
    };
  }
  refazer();
  return { ok: true };
}
