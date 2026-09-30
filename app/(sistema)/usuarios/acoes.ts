"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { conferirChaveDeServico, explicarErroDaChave } from "@/lib/supabase/chave";
import { urlDoSupabase } from "@/lib/supabase/url";
import { createClient as criarCliente } from "@supabase/supabase-js";
import { sessaoAtual, type PapelReal } from "@/lib/supabase/papel";

export interface Resultado {
  ok: boolean;
  erro?: string;
  aviso?: string;
}

/**
 * O cliente com a service role, ou a razão pela qual ele não existe.
 *
 * "Invalid API key" cabe em quatro causas e não aponta nenhuma. A conferência
 * de `lib/supabase/chave.ts` responde antes de ir à rede — e o caso que
 * aconteceu de verdade, a chave que ficou apontada para o projeto antigo depois
 * da mudança de projeto, sai com o nome dos dois projetos na mensagem.
 */
function admOuErro():
  | { adm: NonNullable<ReturnType<typeof clienteAdmin>> }
  | { erro: string } {
  const diagnostico = conferirChaveDeServico(
    urlDoSupabase(),
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (!diagnostico.ok) return { erro: diagnostico.erro };

  const adm = clienteAdmin();
  if (!adm) return { erro: "Falta a variável SUPABASE_SERVICE_ROLE_KEY na Vercel." };
  return { adm };
}

// Toda ação confere o papel antes de fazer qualquer coisa. O middleware já
// barra a navegação, mas Server Action é endpoint: quem souber o nome chama
// direto. Papel e RLS são o controle; a tela é só conveniência.
async function exigirDiretoria() {
  const { papel } = await sessaoAtual();
  return papel === "diretoria";
}

/**
 * A conta nova não pode ganhar acesso aos outros dois apps de carona.
 *
 * O projeto é compartilhado, e cada app tem um gatilho em `auth.users` que dá
 * perfil a toda conta nova: o do Roteiros dá PCM (a não ser que o metadado
 * diga `SEM_ACESSO`, que vai no `createUser` abaixo), e o do Estoque dá
 * OPERADOR ATIVO, sem olhar metadado nenhum. Uma pessoa do faturamento criada
 * aqui acordaria com o estoque aberto.
 *
 * Só para conta NOVA, criada neste instante — nunca para quem já existia: essa
 * pessoa pode usar o estoque de verdade, e desativá-la aqui seria tirar o
 * trabalho dela por engano. Quem precisar dos dois apps ganha o acesso lá.
 */
async function semCaronaNoEstoque(usuarioId: string): Promise<string | null> {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return "sem a chave de serviço";
  const estoque = criarCliente(urlDoSupabase(), chave, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "estoque" },
  });
  const { error } = await estoque.from("perfis").update({ ativo: false }).eq("id", usuarioId);
  return error ? error.message : null;
}

function atualizar() {
  revalidatePath("/usuarios");
}

export async function criarUsuario(
  nome: string,
  email: string,
  senha: string,
  papel: PapelReal,
): Promise<Resultado> {
  if (!(await exigirDiretoria())) return { ok: false, erro: "Só a diretoria faz isso." };

  nome = nome.trim();
  email = email.trim().toLowerCase();
  if (!nome) return { ok: false, erro: "Informe o nome." };
  if (!email) return { ok: false, erro: "Informe o e-mail." };

  const acesso = admOuErro();
  if ("erro" in acesso) return { ok: false, erro: acesso.erro };
  const admin = acesso.adm;

  // Quem já usa o Roteiros ou o Estoque tem login neste mesmo projeto:
  // `auth.users` é um só. Para essa pessoa não há conta a criar — falta só o
  // perfil daqui, que é o que a RLS de medições consulta.
  const existente = await procurarPorEmail(admin, email);
  if (existente) return darAcesso(existente, nome, papel);

  // Só agora a senha importa: conta que já existe mantém a dela.
  if (senha.length < 8) return { ok: false, erro: "A senha precisa de 8 caracteres ou mais." };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    // Sem isto a pessoa não entra até clicar num e-mail de confirmação — e o
    // e-mail pode nem sair, se o projeto não tiver SMTP.
    email_confirm: true,
    // `papel` alimenta o gatilho do Roteiros, que divide o mesmo `auth.users`:
    // sem isso a pessoa do faturamento nasceria PCM lá, com poder sobre o
    // planejamento. O do Estoque não lê metadado — ver `semCaronaNoEstoque`.
    user_metadata: { nome, papel: "SEM_ACESSO" },
  });

  if (error) {
    // Corrida com outro cadastro, ou uma conta que a busca não alcançou.
    if (/already|exists|registered/i.test(error.message)) {
      const achado = await procurarPorEmail(admin, email);
      if (achado) return darAcesso(achado, nome, papel);
      return { ok: false, erro: "Já existe usuário com esse e-mail." };
    }
    return { ok: false, erro: explicarErroDaChave(error.message) };
  }

  // Aqui não há gatilho: o perfil de medições nasce agora, com o papel que a
  // diretoria escolheu. E o do Estoque, que o gatilho de lá acabou de criar
  // ativo, sai desativado.
  const supabase = await createClient();
  const [{ error: erroPerfil }, erroEstoque] = await Promise.all([
    supabase.from("perfis").insert({ id: data.user!.id, nome, papel, ativo: true }),
    semCaronaNoEstoque(data.user!.id),
  ]);

  atualizar();
  if (erroPerfil) {
    return {
      ok: true,
      aviso: `Conta criada, mas o acesso a medições não foi salvo: ${erroPerfil.message}`,
    };
  }
  if (erroEstoque) {
    return {
      ok: true,
      aviso:
        `Conta criada. Atenção: o gatilho do Estoque deu a ela acesso de operador lá, ` +
        `e não consegui desativar (${erroEstoque}). Desative na tela de Usuários do Estoque.`,
    };
  }
  return { ok: true };
}

// `listUsers` pagina de 50 em 50 e não filtra por e-mail, então a busca é feita
// aqui. Poucas centenas de contas: o custo é irrelevante e evita SQL solto.
async function procurarPorEmail(
  admin: NonNullable<ReturnType<typeof clienteAdmin>>,
  email: string,
) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const achado = data.users.find((u) => u.email?.toLowerCase() === email);
    if (achado) return achado;
    if (data.users.length < 200) return null;
  }
  return null;
}

// Dar acesso é criar (ou reativar) o perfil de medições. A conta do Supabase e a
// senha continuam sendo as que a pessoa já usa — não se mexe nelas aqui.
async function darAcesso(
  usuario: { id: string; email?: string },
  nome: string,
  papel: PapelReal,
): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("perfis")
    .upsert({ id: usuario.id, nome, papel, ativo: true }, { onConflict: "id" });

  if (error) return { ok: false, erro: error.message };

  atualizar();
  return {
    ok: true,
    aviso:
      `${nome} já tinha login no grupo (o mesmo do Roteiros e do Estoque). ` +
      `Liberei o acesso a medições; a senha continua sendo a que essa pessoa já usa.`,
  };
}

export async function definirSenha(usuarioId: string, senha: string): Promise<Resultado> {
  if (!(await exigirDiretoria())) return { ok: false, erro: "Só a diretoria faz isso." };
  if (senha.length < 8) return { ok: false, erro: "A senha precisa de 8 caracteres ou mais." };

  const acesso = admOuErro();
  if ("erro" in acesso) return { ok: false, erro: acesso.erro };

  const { error } = await acesso.adm.auth.admin.updateUserById(usuarioId, {
    password: senha,
  });
  if (error) return { ok: false, erro: explicarErroDaChave(error.message) };

  atualizar();
  return { ok: true };
}

export async function mudarPapel(
  usuarioId: string,
  papel: PapelReal,
): Promise<Resultado> {
  if (!(await exigirDiretoria())) return { ok: false, erro: "Só a diretoria faz isso." };

  const { usuarioId: eu } = await sessaoAtual();
  if (usuarioId === eu && papel !== "diretoria") {
    return { ok: false, erro: "Você não pode tirar o próprio acesso de diretoria." };
  }

  // Sem service role: quem autoriza é a política `diretoria_gere_perfis`.
  const supabase = await createClient();
  const { error } = await supabase.from("perfis").update({ papel }).eq("id", usuarioId);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

export async function mudarAtivo(usuarioId: string, ativo: boolean): Promise<Resultado> {
  if (!(await exigirDiretoria())) return { ok: false, erro: "Só a diretoria faz isso." };

  const { usuarioId: eu } = await sessaoAtual();
  if (usuarioId === eu && !ativo) {
    return { ok: false, erro: "Você não pode desativar a si mesmo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("perfis").update({ ativo }).eq("id", usuarioId);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}
