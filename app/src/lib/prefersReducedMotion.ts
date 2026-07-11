// Lee la media query de movimiento reducido de forma segura (guarda `?.` por si
// matchMedia no existe, p. ej. en entornos de test/SSR). Compartido para no
// duplicar la misma consulta en cada hook/componente con animación.
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
