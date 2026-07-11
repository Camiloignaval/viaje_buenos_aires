// Numeración de capítulo — mismo algoritmo que toRoman() en experience/render.js
// y en el viejo connectedShell.js. Portado literal (incluida la degradación a
// String(n) para números fuera de tabla).
export function toRoman(n: number): string {
  const table: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = n;
  let roman = "";
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      roman += symbol;
      remaining -= value;
    }
  }
  return roman || String(n);
}
