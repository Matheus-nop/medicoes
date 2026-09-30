import { FUSO } from "@/lib/medicoes/medicoes";

/** "18/08/2026", no fuso de quem usa. Sem data, um travessão. */
export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { timeZone: FUSO });
}

/** "18/08 a 10/09/2026" — o período que as OMs do boletim cobrem. */
export function periodo(de: string | null, ate: string | null): string {
  if (!de || !ate) return "—";
  const a = dataCurta(de);
  const b = dataCurta(ate);
  if (a === b) return a;
  // O ano só aparece uma vez quando é o mesmo nas duas pontas.
  return a.slice(6) === b.slice(6) ? `${a.slice(0, 5)} a ${b}` : `${a} a ${b}`;
}
