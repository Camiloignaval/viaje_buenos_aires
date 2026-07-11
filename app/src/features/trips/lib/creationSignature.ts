import type { OpeningVariant } from "@/features/opening/lib/openingConstants";

export const TRIP_CREATION_SIGNATURE_VARIANT: OpeningVariant = "micro";

/**
 * Punto de extensión para Etapa 6:
 * creación exitosa → Micro Signature → portada del viaje → cuenta regresiva.
 *
 * Hoy no reproduce nada: no existe asset `micro`, y NO debe reutilizarse el
 * opening global de 4s ni `/video_intro_2.mp4`.
 */
export function shouldPlayTripCreationSignature(): boolean {
  return false;
}
