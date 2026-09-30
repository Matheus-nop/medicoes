// O endereço de cada sistema do grupo, validado.
//
// Vivia dentro de `troca-sistema.tsx`, que é `"use client"` — e por isso o
// painel, que é componente de servidor, não podia chamá-la: o Next recusa
// invocar função de um módulo cliente a partir do servidor. `tsc` e `eslint`
// passaram limpos; quem pegou foi abrir a tela. Função pura não pertence a um
// arquivo de componente cliente de qualquer forma.

/**
 * Só entra no menu quem tem endereço http(s) de verdade.
 *
 * Isto nasceu de um caso real, no app de frota: a variável foi preenchida com
 * o texto de exemplo — `https://<endereço do roteiros>` — e o app renderizou
 * um link com `<`, `>` e espaços dentro do host. O Chrome se recusa a navegar
 * para isso e mostra `about:blank#blocked`, uma mensagem que não diz uma
 * palavra sobre configuração e manda a pessoa caçar defeito no lugar errado.
 *
 * Endereço sem esquema (`frota.exemplo.com.br`) ganha `https://`, que é o
 * engano honesto de quem copia da barra do navegador. Qualquer outra coisa
 * vira `undefined` e o item some do menu — item que sumiu faz olhar a
 * variável; link que não vai a lugar nenhum não faz olhar nada.
 *
 * O `https://` só entra quando NÃO há esquema: com o prefixo,
 * `https://<endereço>` viraria `https://https//%3Cendere%C3%A7o%3E`, que o
 * `URL` aceita de bom grado, e o valor quebrado voltaria disfarçado de bom.
 */
export function enderecoDeSistema(bruto: string | undefined): string | undefined {
  const v = bruto?.trim();
  if (!v) return undefined;
  const candidato = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(candidato);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}
