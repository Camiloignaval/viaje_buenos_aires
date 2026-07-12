export interface TravelOption {
  value: string;
  emoji: string;
  label: string;
  description?: string;
}

export const MAX_TRAVEL_STYLES = 2;
export const MAX_EXPECTED_TRAVELERS = 50;

export const TRAVEL_COMPANIONS_OPTIONS: TravelOption[] = [
  { value: "partner", emoji: "❤️", label: "Mi pareja" },
  { value: "family", emoji: "👨‍👩‍👧", label: "Mi familia" },
  { value: "friends", emoji: "👯", label: "Amigos" },
  { value: "coworkers", emoji: "💼", label: "Compañeros de trabajo" },
  { value: "solo", emoji: "🎒", label: "Solo yo" },
  { value: "other", emoji: "🌎", label: "Otro grupo" },
];

export const TRAVEL_REASON_OPTIONS: TravelOption[] = [
  { value: "honeymoon", emoji: "❤️", label: "Luna de miel" },
  { value: "birthday", emoji: "🎂", label: "Cumpleaños" },
  { value: "vacation", emoji: "✈️", label: "Vacaciones" },
  { value: "celebration", emoji: "🎉", label: "Celebración" },
  { value: "family_reunion", emoji: "👨‍👩‍👧", label: "Reencuentro familiar" },
  { value: "work", emoji: "💼", label: "Trabajo" },
  { value: "studies", emoji: "🎓", label: "Estudios" },
  { value: "first_time", emoji: "🌎", label: "Primera vez" },
];

export const TRAVEL_STYLE_OPTIONS: TravelOption[] = [
  { value: "romantic", emoji: "❤️", label: "Romántico" },
  { value: "relaxed", emoji: "🍷", label: "Tranquilo" },
  { value: "adventurous", emoji: "🌄", label: "Aventurero" },
  { value: "cultural", emoji: "🎨", label: "Cultural" },
  { value: "gastronomic", emoji: "🍴", label: "Gastronómico" },
  { value: "photographic", emoji: "📸", label: "Fotográfico" },
  { value: "nightlife", emoji: "🎉", label: "Vida nocturna" },
  { value: "nature", emoji: "🌿", label: "Naturaleza" },
  { value: "shopping", emoji: "🛍", label: "Compras" },
];

export const TRAVEL_BUDGET_STYLE_OPTIONS: TravelOption[] = [
  {
    value: "carefree",
    emoji: "💎",
    label: "Sin preocuparnos demasiado",
    description: "Aprovechar cada momento, aunque eso signifique gastar un poco más.",
  },
  {
    value: "balanced",
    emoji: "⚖️",
    label: "Con equilibrio",
    description: "Disfrutar el viaje manteniendo un presupuesto razonable.",
  },
  {
    value: "simple",
    emoji: "🎒",
    label: "Lo más simple posible",
    description: "Preferimos gastar solo en lo realmente importante.",
  },
  {
    value: "defined",
    emoji: "✨",
    label: "Definir un presupuesto",
    description: "Queremos indicar un monto aproximado.",
  },
];

export const CURRENCY_OPTIONS = [
  { value: "CLP", label: "CLP — Peso chileno" },
  { value: "ARS", label: "ARS — Peso argentino" },
  { value: "USD", label: "USD — Dólar estadounidense" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "BRL", label: "BRL — Real brasileño" },
];

function findOption(options: TravelOption[], value: string | undefined): TravelOption | undefined {
  return options.find((option) => option.value === value);
}

export function companionLabel(value: string | undefined): string | undefined {
  return findOption(TRAVEL_COMPANIONS_OPTIONS, value)?.label;
}

export function reasonLabel(value: string | undefined): string | undefined {
  return findOption(TRAVEL_REASON_OPTIONS, value)?.label;
}

export function styleLabels(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => findOption(TRAVEL_STYLE_OPTIONS, value)?.label ?? value);
}

export function budgetStyleLabel(value: string | undefined): string | undefined {
  return findOption(TRAVEL_BUDGET_STYLE_OPTIONS, value)?.label;
}
