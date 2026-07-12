import { z } from "zod";

// Mensajes espejo de lib/platformTrips.js normalizeTripInput — el server sigue
// siendo la verdad. Se valida el payload YA ARMADO justo antes de enviarlo
// (red de seguridad final del wizard, no valida paso a paso).
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const TRAVEL_CONTEXT_MAX_LENGTH = 500;
const MAX_TRAVEL_STYLES = 2;

export const tripDestinationSchema = z.object({
  countryCode: z.string().length(2, "El país del destino es inválido."),
  countryName: z.string().min(1),
  cityId: z.string().min(1, "El viaje necesita una ciudad."),
  cityName: z.string().min(1, "El viaje necesita una ciudad."),
  adminName: z.string().optional(),
  latitude: z.number({ error: "La ciudad necesita coordenadas válidas." }),
  longitude: z.number({ error: "La ciudad necesita coordenadas válidas." }),
  timezone: z.string().min(1, "La ciudad necesita una zona horaria."),
});

export const tripAccommodationSchema = z.object({
  type: z.enum(["hotel", "address", "neighborhood", "unknown"]),
  name: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
});

export const travelBudgetSchema = z.object({
  amount: z.number().positive("El monto del presupuesto es inválido."),
  currency: z.string().regex(CURRENCY_CODE_PATTERN, "La moneda del presupuesto es inválida."),
  style: z.literal("defined"),
});

export const tripWizardSchema = z
  .object({
    title: z.string().trim().min(1, "El viaje necesita un título."),
    destination: tripDestinationSchema,
    startDateTime: z.string().regex(DATETIME_LOCAL_PATTERN, "La fecha y hora de llegada es inválida."),
    endDateTime: z.string().regex(DATETIME_LOCAL_PATTERN, "La fecha y hora de regreso es inválida."),
    travelCompanions: z.enum(["partner", "family", "friends", "coworkers", "solo", "other"], {
      error: "Cuéntanos quiénes viven esta historia contigo.",
    }),
    expectedTravelers: z.number().int().min(1).max(50, "La cantidad de personas es inválida."),
    travelReason: z.enum(
      ["honeymoon", "birthday", "vacation", "celebration", "family_reunion", "work", "studies", "first_time"],
      { error: "Cuéntanos qué los trae hasta aquí." },
    ),
    travelStyle: z
      .array(z.enum(["romantic", "relaxed", "adventurous", "cultural", "gastronomic", "photographic", "nightlife", "nature", "shopping"]))
      .min(1, "Elige al menos un estilo de viaje.")
      .max(MAX_TRAVEL_STYLES, `Elige como máximo ${MAX_TRAVEL_STYLES} estilos de viaje.`),
    travelBudgetStyle: z.enum(["carefree", "balanced", "simple", "defined"], {
      error: "Cuéntanos cómo les gustaría vivir este viaje.",
    }),
    accommodation: tripAccommodationSchema.optional(),
    travelContext: z
      .string()
      .trim()
      .max(TRAVEL_CONTEXT_MAX_LENGTH, `El contexto no puede superar los ${TRAVEL_CONTEXT_MAX_LENGTH} caracteres.`)
      .optional(),
    travelBudget: travelBudgetSchema.optional(),
  })
  .refine((values) => values.endDateTime > values.startDateTime, {
    message: "La vuelta debe ser después de la llegada.",
    path: ["endDateTime"],
  })
  .refine((values) => values.travelBudgetStyle !== "defined" || values.travelBudget != null, {
    message: "Indicá el monto y la moneda del presupuesto.",
    path: ["travelBudget"],
  });

export type TripWizardPayload = z.infer<typeof tripWizardSchema>;
