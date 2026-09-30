"use client";

import { ESTILO_BOTAO } from "@/components/ui";

/**
 * O botão de imprimir e o CSS que decide o que vai para o papel.
 *
 * Fica num componente de cliente porque `window.print` não existe no servidor,
 * e o mesmo arquivo carrega a regra de impressão — as duas coisas andam juntas:
 * quem esquecer uma esquece a outra, e a folha sai com o menu do sistema.
 *
 * Estava em `relatorios/imprimir.tsx`, e subiu para o kit quando a terceira
 * tela precisou dele. `orientacao` veio junto: folha de acompanhamento tem
 * coluna demais para caber em retrato, e o resto continua em retrato sem
 * mudar nada.
 */
export function Imprimir({
  rotulo = "Imprimir",
  orientacao = "portrait",
}: {
  rotulo?: string;
  orientacao?: "portrait" | "landscape";
}) {
  return (
    <>
      <RegraDeImpressao orientacao={orientacao} />
      <button type="button" onClick={() => window.print()} className={ESTILO_BOTAO.primario}>
        {rotulo}
      </button>
    </>
  );
}

/**
 * Só a regra, sem o botão.
 *
 * Existe para a tela que abre um diálogo antes de imprimir: se a regra fosse
 * junto do botão, e o botão morasse dentro do diálogo, o `Ctrl+P` do navegador
 * com o diálogo fechado imprimiria a tela inteira — menu, abas e tudo. A regra
 * fica montada na página o tempo todo; o botão vai para onde fizer sentido.
 */
export function RegraDeImpressao({
  orientacao = "portrait",
}: {
  orientacao?: "portrait" | "landscape";
}) {
  return (
    <style>{`
      @media print {
        @page { size: A4 ${orientacao}; margin: 12mm; }
        body * { visibility: hidden; }
        #folha, #folha * { visibility: visible; }
        #folha { position: absolute; inset: 0; }
      }
    `}</style>
  );
}
