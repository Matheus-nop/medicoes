/**
 * O id do usuario que o proxy ja validou, repassado para as paginas.
 *
 * `supabase.auth.getUser()` nao le cookie: ele PERGUNTA ao servidor de auth do
 * Supabase se o token vale, e isso e uma viagem de rede. O proxy roda essa
 * pergunta em toda requisicao — e a pagina fazia a mesma pergunta de novo,
 * pagando duas vezes pela mesma resposta antes de mostrar qualquer coisa.
 *
 * Agora o proxy escreve o id aqui e a pagina le. O cabecalho e sempre
 * REESCRITO pelo proxy (apagado quando nao ha ninguem logado), entao nao ha
 * como alguem mandar um id de fora e ser acreditado.
 *
 * E, mesmo que houvesse: isto so decide o que a NAVEGACAO mostra. Os DADOS
 * continuam protegidos pela RLS, que valida o token dentro do Postgres e nao
 * sabe que este cabecalho existe.
 */
export const CABECALHO_USUARIO = "x-medicoes-usuario";
