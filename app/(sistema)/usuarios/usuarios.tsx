"use client";

import { useState, useTransition } from "react";
import { Botao, Cabecalho, Campo, CAMPO, Painel, Selo, Aviso } from "@/components/ui";
import { criarUsuario, definirSenha, mudarAtivo, mudarPapel, type Resultado } from "./acoes";
import { PAPEIS, ROTULO_PAPEL, type PapelReal } from "@/lib/medicoes/papeis";

export interface Pessoa {
  id: string;
  nome: string;
  papel: PapelReal;
  ativo: boolean;
  email: string | null;
  ultimoAcesso: string | null;
}

const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "nunca entrou";

export function Usuarios({
  pessoas,
  eu,
  temChaveAdmin,
}: {
  pessoas: Pessoa[];
  eu: string | null;
  temChaveAdmin: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [recado, setRecado] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [criando, setCriando] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState<string | null>(null);

  function rodar(acao: () => Promise<Resultado>, sucesso: string) {
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) return setRecado({ tipo: "erro", texto: r.erro ?? "Não deu certo." });
      setRecado({ tipo: "ok", texto: r.aviso ?? sucesso });
      setCriando(false);
      setTrocandoSenha(null);
    });
  }

  return (
    <div className="space-y-4">
      <Cabecalho
        titulo="Usuários"
        resumo={`${pessoas.length} ${pessoas.length === 1 ? "pessoa" : "pessoas"} com acesso ao sistema`}
        acoes={
          <Botao variante="primario" onClick={() => setCriando((v) => !v)}>
            {criando ? "Cancelar" : "Novo usuário"}
          </Botao>
        }
      />

      {!temChaveAdmin && (
        <Aviso tom="erro">
          Falta a variável <code>SUPABASE_SERVICE_ROLE_KEY</code> na Vercel. Sem
          ela dá para mudar papel e ativar/desativar, mas não dá para criar
          usuário nem definir a senha de alguém — e o e-mail não aparece na lista.
        </Aviso>
      )}

      {recado && (
        <Aviso tom={recado.tipo === "ok" ? "ok" : "erro"} aoFechar={() => setRecado(null)}>
          {recado.texto}
        </Aviso>
      )}

      {criando && (
        <Painel titulo="Novo usuário">
          <form
            className="grid gap-3 sm:grid-cols-2"
            action={(f) =>
              rodar(
                () =>
                  criarUsuario(
                    String(f.get("nome") ?? ""),
                    String(f.get("email") ?? ""),
                    String(f.get("senha") ?? ""),
                    String(f.get("papel") ?? "orcamento") as PapelReal,
                  ),
                "Usuário criado. Passe a senha para a pessoa — ela pode trocar depois.",
              )
            }
          >
            <Campo rotulo="Nome" obrigatorio>
              <input name="nome" required autoFocus className={`${CAMPO} w-full`} />
            </Campo>
            <Campo rotulo="E-mail" obrigatorio>
              <input name="email" type="email" required className={`${CAMPO} w-full`} />
            </Campo>
            <Campo rotulo="Senha inicial">
              <input
                name="senha"
                type="text"
                minLength={8}
                placeholder="mínimo 8 caracteres"
                className={`${CAMPO} w-full`}
              />
            </Campo>
            <Campo rotulo="Papel">
              <select name="papel" defaultValue="faturamento" className={`${CAMPO} w-full`}>
                {PAPEIS.map((x) => (
                  <option key={x} value={x}>
                    {ROTULO_PAPEL[x]}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="sm:col-span-2">
              <Botao type="submit" variante="primario" disabled={pendente || !temChaveAdmin}>
                Criar
              </Botao>
              <p className="mt-2 text-xs text-texto-2">
                A senha aparece em texto de propósito: quem cadastra precisa
                anotá-la para entregar à pessoa. Se essa pessoa já usa o app de
                roteiros, deixe em branco — ela entra com a senha que já tem.
              </p>
            </div>
          </form>
        </Painel>
      )}

      <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
        <table className="w-full text-sm">
          <thead className="border-b border-borda text-left text-xs text-texto-2">
            <tr>
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">E-mail</th>
              <th className="px-4 py-2.5 font-medium">Papel</th>
              <th className="px-4 py-2.5 font-medium">Último acesso</th>
              <th className="px-4 py-2.5 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pessoas.map((p) => (
              <tr key={p.id} className="border-b border-borda/60 last:border-0">
                <td className="px-4 py-2.5">
                  <span className={p.ativo ? "" : "text-texto-3 line-through"}>{p.nome}</span>
                  {p.id === eu && <span className="ml-2 text-xs text-texto-3">(você)</span>}
                </td>
                <td className="px-4 py-2.5 text-texto-2">{p.email ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Selo tom={p.papel === "diretoria" ? "acento" : "neutro"}>
                    {ROTULO_PAPEL[p.papel]}
                  </Selo>
                </td>
                <td className="px-4 py-2.5 text-texto-2">{data(p.ultimoAcesso)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Botao
                      variante="discreto"
                      disabled={pendente || !temChaveAdmin}
                      onClick={() => setTrocandoSenha(trocandoSenha === p.id ? null : p.id)}
                    >
                      Definir senha
                    </Botao>
                    {/* Com três papéis o botão que alterna deixa de fazer
                        sentido com quatro papéis. Um seletor mostra todos e o atual. */}
                    <label className="sr-only" htmlFor={`papel-${p.id}`}>
                      Papel de {p.nome}
                    </label>
                    <select
                      id={`papel-${p.id}`}
                      value={p.papel}
                      disabled={pendente || p.id === eu}
                      onChange={(ev) => {
                        const novo = ev.target.value as PapelReal;
                        rodar(
                          () => mudarPapel(p.id, novo),
                          `Agora é ${ROTULO_PAPEL[novo].toLowerCase()}.`,
                        );
                      }}
                      className={`${CAMPO} h-8 py-0`}
                    >
                      {PAPEIS.map((x) => (
                        <option key={x} value={x}>
                          {ROTULO_PAPEL[x]}
                        </option>
                      ))}
                    </select>
                    <Botao
                      variante={p.ativo ? "discreto" : "contorno"}
                      disabled={pendente || p.id === eu}
                      onClick={() =>
                        rodar(
                          () => mudarAtivo(p.id, !p.ativo),
                          p.ativo ? "Acesso desativado." : "Acesso reativado.",
                        )
                      }
                    >
                      {p.ativo ? "Desativar" : "Reativar"}
                    </Botao>
                  </div>

                  {trocandoSenha === p.id && (
                    <form
                      className="mt-2 flex flex-wrap items-end gap-2"
                      action={(f) =>
                        rodar(
                          () => definirSenha(p.id, String(f.get("senha") ?? "")),
                          `Senha de ${p.nome} trocada. Entregue a nova para a pessoa.`,
                        )
                      }
                    >
                      <input
                        name="senha"
                        type="text"
                        required
                        minLength={8}
                        autoFocus
                        placeholder="nova senha, mínimo 8"
                        className={`${CAMPO} w-56`}
                      />
                      <Botao type="submit" variante="primario" disabled={pendente}>
                        Salvar
                      </Botao>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-texto-2">
        Desativar não apaga ninguém: a pessoa some do sistema e o que ela já
        registrou continua com o nome dela. Apagar usuário quebraria o histórico
        — cada movimentação aponta para quem a fez.
      </p>
    </div>
  );
}
