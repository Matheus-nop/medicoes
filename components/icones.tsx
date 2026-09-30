// Ícones de linha, desenhados à mão, os mesmos do Estoque. Sem biblioteca: são
// duas formas, e uma dependência de ícones traz duas mil.

type Props = { className?: string };

function Desenho({
  children,
  className = "size-full",
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const svg = (d: React.ReactNode) =>
  function Icone({ className = "size-full" }: Props) {
    return <Desenho className={className}>{d}</Desenho>;
  };

export const IconeMedicoes = svg(
  <>
    <path d="M9 3.5h6v2.5H9z" />
    <path d="M9 4.75H7.5A1.5 1.5 0 0 0 6 6.25V19a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V6.25a1.5 1.5 0 0 0-1.5-1.5H15" />
    <path d="M9 10h3.5M9 13.5h3.5M9 17h3.5" />
    <path d="M15 10h.01M15 13.5h.01M15 17h.01" />
  </>,
);


export const IconeUsuarios = svg(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 5.6a3.2 3.2 0 0 1 0 4.8M17.5 14.8c2 .6 3.2 2.3 3.2 4.7" />
  </>,
);

