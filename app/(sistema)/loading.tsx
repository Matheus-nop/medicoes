// O que aparece enquanto a próxima tela carrega.
//
// Sem este arquivo o Next segura a navegação no servidor: a pessoa clica e
// fica olhando a tela ANTERIOR, sem nada acontecendo, até a consulta terminar.
// Parece travado. Com ele o esqueleto pinta na hora e o conteúdo entra por
// cima — e, de quebra, o Next passa a pré-carregar a rota quando o mouse passa
// por cima do link, porque agora existe uma fronteira para carregar.
//
// O desenho imita a forma real das telas (cabeçalho, faixa de números, lista),
// e não um spinner: assim o layout não pula quando o conteúdo chega.
export default function Carregando() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>

      <div className="space-y-2">
        <div className="h-7 w-52 animate-pulse rounded-lg bg-superficie-3" />
        <div className="h-4 w-72 animate-pulse rounded bg-superficie-3" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-borda bg-superficie p-4 shadow-cartao"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-superficie-3" />
            <div className="mt-2.5 h-7 w-14 animate-pulse rounded bg-superficie-3" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-superficie-3" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-cartao">
        <div className="border-b border-borda px-4 py-3">
          <div className="h-4 w-32 animate-pulse rounded bg-superficie-3" />
        </div>
        <ul className="divide-y divide-borda">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="size-4 shrink-0 animate-pulse rounded bg-superficie-3" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-28 animate-pulse rounded bg-superficie-3" />
                <div className="h-3 w-56 animate-pulse rounded bg-superficie-3" />
              </div>
              <div className="h-8 w-36 shrink-0 animate-pulse rounded-lg bg-superficie-3" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
