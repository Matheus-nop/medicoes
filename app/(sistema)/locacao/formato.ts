const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** "Setembro 2026". */
export function mesPorExtenso(d: string): string {
  return `${MESES[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
}

/** "01/09". */
export function diaMes(d: string): string {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}
