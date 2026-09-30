import Image from "next/image";

// Duas artes: a colorida serve em fundo claro, a branca em fundo escuro.
// A troca e por CSS (ver globals.css), nao por JavaScript — assim a marca
// certa ja vem na primeira pintura, sem piscar a errada.
export function Logo({
  altura = 32,
  className = "",
}: {
  altura?: number;
  className?: string;
}) {
  const largura = Math.round(altura * (735.12 / 223.2));
  const comum = "w-auto";

  // A arte pedida ao `next/image` é 3x a exibida, e o CSS reduz.
  //
  // Sem isto a marca saía borrada em tela boa: o `next/image` escolhe o arquivo
  // pela largura declarada, e a declarada era a de 1x. Numa TV ou num notebook
  // retina o navegador precisa do dobro (ou do triplo) dos pixels e recebia
  // 128 de largura para pintar 196 — medido, não suposto.
  //
  // Três, e não dois: a TV do galpão é grande e a logo é a única imagem da
  // tela. Ela é um PNG de 3063 de largura, então há de sobra na origem, e o
  // arquivo servido continua pequeno porque a arte é pequena.
  const escala = 3;

  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Grupo Nova Opção"
        width={largura * escala}
        height={altura * escala}
        quality={90}
        priority
        className={`logo-claro ${comum}`}
        style={{ height: altura }}
      />
      <Image
        src="/logo-branco.svg"
        alt="Grupo Nova Opção"
        width={largura * escala}
        height={altura * escala}
        priority
        className={`logo-escuro ${comum}`}
        style={{ height: altura }}
      />
    </span>
  );
}
