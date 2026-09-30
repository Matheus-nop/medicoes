import { carregarControle } from "./dados";
import { VisaoDoControle } from "./painel";

export const dynamic = "force-dynamic";

/**
 * O painel do controle de medições: manutenção, locação e indenização, por
 * região, na foto de um período — a posição atual, por padrão.
 *
 * É a planilha "CONTROLE DE MEDIÇÕES" e o painel que a diretoria já lia,
 * agora lendo do banco: quem lança em /controle/lancar aparece aqui em até um
 * minuto, em qualquer tela aberta.
 */
export default async function PainelDoControle({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; periodo?: string }>;
}) {
  const q = await searchParams;
  const carga = await carregarControle(q.cliente, q.periodo ? Number(q.periodo) : undefined);

  if (!carga.ok) {
    return (
      <div className="rounded-lg border border-borda bg-superficie p-8 text-center">
        <p className="font-medium">Não foi possível carregar o controle</p>
        <p className="mt-1 text-sm text-texto-2">{carga.erro}</p>
        {carga.faltaMigracao && (
          <p className="mt-3 text-xs text-texto-3">
            Falta aplicar a <code>0005_controle.sql</code> no SQL Editor.
          </p>
        )}
      </div>
    );
  }

  return <VisaoDoControle carga={carga} />;
}
