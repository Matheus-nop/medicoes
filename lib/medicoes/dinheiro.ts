// Dinheiro e porcentagem escritos como se fala. Os mesmos do Estoque.

/** "R$ 1.921,00". Sem centavos quando passa de mil, que é como se fala. */
export function emReais(v: number, centavos = true): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: centavos ? 2 : 0,
    maximumFractionDigits: centavos ? 2 : 0,
  });
}

/** "73,6%" — uma casa, que é o quanto a conta merece. */
export function emPorcento(v: number | null): string {
  return v === null ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
