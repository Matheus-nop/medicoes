import { AbasDeLink } from "@/components/ui";

/** As abas do painel executivo: um cliente por vez, ou todos juntos. */
export function AbasDoPainel({ atual }: { atual: "cliente" | "todos" }) {
  return (
    <AbasDeLink
      rotulo="Visão do painel"
      atual={atual === "todos" ? "/controle/todos" : "/controle"}
      opcoes={[
        { href: "/controle", rotulo: "Por cliente" },
        { href: "/controle/todos", rotulo: "Todos os clientes" },
      ]}
    />
  );
}
