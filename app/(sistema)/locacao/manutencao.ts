import { linhasDaManutencao, linhasDosBms, type BaseDaPlanilha, type LinhaDaPlanilha } from "@/lib/medicoes/locacao";
import type { CargaDaMedicao } from "./dados";

type Carga = Extract<CargaDaMedicao, { ok: true }>;

const daBase = (b: Carga["manutencao"][number]["base"]): BaseDaPlanilha | null =>
  b
    ? {
        nome: b.nome,
        projeto: b.projeto ?? null,
        municipio: b.municipio ?? null,
        superintendencia: b.superintendencia ?? null,
        bloco: b.bloco ?? null,
        coordenador: b.coordenador ?? null,
      }
    : null;

/**
 * As linhas de MANUTENÇÃO da medição — o que vai embaixo da locação, na
 * planilha e no PDF. Com BMs incluídos pela faturista (0024), são eles, uma
 * linha por OM; sem nenhum, a soma dos boletins apresentados no mês, por
 * projeto, município, superintendência e bloco, como antes.
 */
export function manutencaoDaMedicao(carga: Carga): { linhas: LinhaDaPlanilha[]; dosBms: boolean } {
  if (carga.bms.length > 0) return { linhas: linhasDosBms(carga.bms), dosBms: true };
  const m = carga.medicao.mes;
  const fim = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10);
  return {
    linhas: linhasDaManutencao(
      carga.manutencao.map((x) => ({ valor: x.valor, base: daBase(x.base) })),
      m,
      fim,
    ),
    dosBms: false,
  };
}
