// Russian text helpers (pure, safe to import from tests).

// plural(5, 'задача', 'задачи', 'задач') -> 'задач'.
export function plural(n, one, few, many) {
  const a = Math.abs(Math.trunc(n)) % 100; const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  return b >= 2 && b <= 4 ? few : many;
}
// Number with Russian grouping: 12 345.
export const nf = (n) => n.toLocaleString('ru-RU');
// Count with its word: countOf(3, 'задача', 'задачи', 'задач') -> '3 задачи'.
export const countOf = (n, one, few, many) => `${nf(n)} ${plural(n, one, few, many)}`;
