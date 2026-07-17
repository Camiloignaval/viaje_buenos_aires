/** Convierte una referencia editorial en URL sin inventar assets globales. */
export function resolveStoryMediaUrl(reference: unknown): string | null {
  if (typeof reference !== "string" || reference.trim() === "") return null;
  const value = reference.trim();
  if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) return value;
  return `/${value.replace(/^\/+/, "")}`;
}
