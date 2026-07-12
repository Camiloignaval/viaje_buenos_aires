// Contraparte frontend de app/lib/searchNormalize.js (mismo algoritmo, dos
// runtimes distintos: este corre en el bundle de Vite, no en las funciones
// serverless). Se usa para que el catálogo local de países sea tan tolerante
// como la búsqueda de ciudades: "peru" debe encontrar "Perú".
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mismo criterio de relevancia que scoreCityMatch en el backend: exacto >
// empieza así > alguna palabra empieza así > lo contiene > sin relación.
export function scoreTextMatch(name: string, normalizedQuery: string): number {
  if (!normalizedQuery) return 0;
  const normalizedName = normalizeSearchText(name);
  if (!normalizedName) return 0;
  if (normalizedName === normalizedQuery) return 4;
  if (normalizedName.startsWith(normalizedQuery)) return 3;
  if (normalizedName.split(" ").some((word) => word.startsWith(normalizedQuery))) return 2;
  if (normalizedName.includes(normalizedQuery)) return 1;
  return 0;
}
