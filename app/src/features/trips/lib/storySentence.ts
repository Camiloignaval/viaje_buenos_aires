// Frase final de "Creo que ya empiezo a conocer esta historia" — SOLO
// plantillas (nunca IA). No es una única frase con slots: el motivo define el
// ESQUELETO de la primera oración (milestone vs. práctico) y el estilo +
// la forma de vivir el viaje arman una segunda — la combinatoria hace que se
// sienta mucho más personal, pero sigue siendo 100% determinística (mismo
// input, siempre la misma frase).
const REASON_PHRASES: Record<string, string> = {
  honeymoon: "el comienzo de una vida juntos",
  birthday: "un cumpleaños para recordar",
  vacation: "un descanso que se lo merecen",
  celebration: "una celebración que vale la pena vivir a fondo",
  family_reunion: "un reencuentro que la familia esperaba",
  work: "una oportunidad que también merece ser disfrutada",
  studies: "un capítulo de aprendizaje fuera de casa",
  first_time: "una primera vez que no se olvida",
};

// Motivos "prácticos" cambian el esqueleto de la primera oración (no solo el
// contenido): no es una historia que "empieza", es un viaje que "van a
// compartir" — un tono distinto, no solo un slot distinto.
const PRACTICAL_REASONS = new Set(["work", "studies", "vacation"]);

const COMPANION_PHRASES: Record<string, string> = {
  partner: "los dos, escribiendo esta historia de a dos",
  family: "toda la familia, sumando un capítulo más",
  friends: "un grupo de amigos que decidió vivirlo junto",
  coworkers: "un equipo que también sabe parar y disfrutar",
  solo: "tú, con todo el tiempo del mundo para descubrir",
  other: "un grupo que decidió emprender esto juntos",
};

const STYLE_TONE: Record<string, string> = {
  romantic: "muy de a dos, casi como una postal",
  relaxed: "sin apuro, a su propio ritmo",
  adventurous: "buscando siempre algo nuevo",
  cultural: "con curiosidad por cada historia del lugar",
  gastronomic: "con la mesa como protagonista",
  photographic: "buscando esos instantes que van a querer recordar",
  nightlife: "también cuando cae la noche",
  nature: "cerca del aire libre",
  shopping: "con tiempo también para recorrer vitrinas",
};

const BUDGET_STYLE_CLOSE: Record<string, string> = {
  carefree: "Sin pensar demasiado en los números: solo en disfrutarlo.",
  balanced: "Buscando siempre el equilibrio entre disfrutar y cuidar cada peso.",
  simple: "Yendo a lo esencial, sin vueltas.",
  defined: "Con todo pensado de antemano, para vivirlo con tranquilidad.",
};

const FALLBACK_SENTENCE = "Creo que este será un viaje lleno de momentos que valdrá la pena recordar.";

interface StorySentenceInput {
  travelReason?: string | null;
  travelCompanions?: string | null;
  travelStyle?: string[] | null;
  travelBudgetStyle?: string | null;
}

function buildFirstSentence(reasonKey?: string | null, companionsKey?: string | null): string {
  const reason = reasonKey ? REASON_PHRASES[reasonKey] : undefined;
  const companions = companionsKey ? COMPANION_PHRASES[companionsKey] : undefined;

  if (reason && companions) {
    if (reasonKey && PRACTICAL_REASONS.has(reasonKey)) {
      return `Creo que este viaje va a ser ${reason}, y lo van a compartir ${companions}.`;
    }
    return `Creo que este será ${reason}, con ${companions}.`;
  }
  if (reason) return `Creo que este será ${reason}.`;
  if (companions) return `Creo que esta historia la escriben ${companions}.`;
  return FALLBACK_SENTENCE;
}

function buildStyleClause(styles?: string[] | null): string | undefined {
  const tones = (styles ?? []).map((style) => STYLE_TONE[style]).filter(Boolean);
  if (tones.length === 0) return undefined;
  return tones.join(" y ");
}

function buildSecondSentence(styles?: string[] | null, budgetStyleKey?: string | null): string | undefined {
  const styleTone = buildStyleClause(styles);
  const budgetClose = budgetStyleKey ? BUDGET_STYLE_CLOSE[budgetStyleKey] : undefined;

  if (styleTone && budgetClose) return `Algo me dice que van a vivirla ${styleTone}. ${budgetClose}`;
  if (styleTone) return `Algo me dice que van a vivirla ${styleTone}.`;
  return budgetClose;
}

export function buildStorySentence({
  travelReason,
  travelCompanions,
  travelStyle,
  travelBudgetStyle,
}: StorySentenceInput): string {
  const first = buildFirstSentence(travelReason, travelCompanions);
  if (first === FALLBACK_SENTENCE) return first;

  const second = buildSecondSentence(travelStyle, travelBudgetStyle);
  return second ? `${first} ${second}` : first;
}
