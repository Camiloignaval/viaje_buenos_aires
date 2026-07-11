import { z } from "zod";

// Mensajes espejo de lib/platformUsers.js normalizeOnboardingInput — el server
// sigue siendo la verdad.
export const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Decinos cómo te llamamos.")
    .max(80, "El nombre no puede superar los 80 caracteres."),
  residenceCountryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Elegí un país de residencia.")
    .transform((value) => value.toUpperCase()),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
