import { Fragment, type ReactNode } from "react";
import { useExperienceCtx } from "./experienceContext";
import { Links } from "./Links";
import { SavedMemory, MemoryInvitation } from "./Memories";
import { formatChapterDate, toRoman } from "../lib/format";
import { heroImageForChapter } from "../lib/chapterSummary";
import { resolveContextualLines } from "../lib/contextualInfo";
import { mostRecent } from "../lib/memoryGrouping";
import { photoSlotKey } from "../lib/photoSlot";
import { getChapterReferenceDate } from "@/features/story/engine/storyProgress";
import { resolveStoryMediaUrl } from "@/features/story/engine/storyMedia";
import { ChapterStatus } from "@/features/story/engine/types";
import { useSession } from "@/features/auth/hooks/useSession";
import { createMoney, normalizeLegacyMoney } from "@/features/context-engine/money";
import { resolvePreferredCurrency } from "@/features/context-engine/preferredCurrencyResolver";
import { MoneyLine } from "@/features/context-engine/MoneyLine";
import { useFinancialContext } from "@/features/context-engine/useFinancialContext";
import type { Money } from "@/features/context-engine/types";
import type {
  Activity,
  ArrivalGate,
  Chapter,
  ChapterStatusValue,
  CollectionItem,
  EstimatedCost,
  Place,
  PhotoSpot,
  StoryPackage,
  SuggestedMemory,
  Tradition,
} from "@/features/story/engine/types";
import type { ActivityWithPlace } from "@/features/story/engine/chapterContent";
import type { Memory } from "@/features/album/data/types";
import type { PassageComposition } from "../lib/dayLived";

export interface PassageNote {
  label: string;
  text: string;
}

function resolveLocation(activity: Activity, place: Place | null) {
  return activity.location ?? place?.location ?? null;
}

function resolveWebsiteUrl(activity: Activity, place: Place | null) {
  return activity.websiteUrl ?? place?.websiteUrl ?? null;
}

export function SceneFilete() {
  return (
    <div className="scene-filete" aria-hidden="true">
      <span className="scene-filete-line" />
      <span className="scene-filete-mark">∞</span>
      <span className="scene-filete-line" />
    </div>
  );
}

function ReferenceLamina({ src, alt, panoramic = false }: { src: string; alt: string; panoramic?: boolean }) {
  return (
    <figure className={`reference-lamina${panoramic ? " reference-lamina-panoramic" : ""}`}>
      <span className="lamina-corner lamina-corner-tl" aria-hidden="true" />
      <span className="lamina-corner lamina-corner-tr" aria-hidden="true" />
      <img src={src} alt={alt} loading="lazy" />
      <span className="lamina-corner lamina-corner-bl" aria-hidden="true" />
      <span className="lamina-corner lamina-corner-br" aria-hidden="true" />
    </figure>
  );
}

// Regla editorial: máximo 2 notas al margen por pasaje, cada una con nombre
// propio (nunca "Al margen" genérico). El excedente se descarta antes que
// reconstruir una columna de widgets. Prioridad: voz autorada > contextual.
const MAX_MARGINALIA = 2;

function PassageMarginalia({
  traditions = [],
  discoveries = [],
  collectionItems = [],
  relatedPlaces = [],
  notes = [],
  contextual = [],
}: {
  traditions?: Tradition[];
  discoveries?: string[];
  collectionItems?: CollectionItem[];
  relatedPlaces?: Place[];
  notes?: PassageNote[];
  contextual?: PassageNote[];
}) {
  const entries: ReactNode[] = [];
  notes.forEach((note, index) =>
    entries.push(
      <div className="marginal-note" key={`note-${note.label}-${index}`}>
        <p className="marginal-label">{note.label}</p>
        <p>{note.text}</p>
      </div>,
    ),
  );
  traditions.forEach((tradition) =>
    entries.push(
      <div className="marginal-note" key={`trad-${tradition.title}`}>
        <p className="marginal-label">{tradition.title}</p>
        <p>{tradition.body}</p>
      </div>,
    ),
  );
  discoveries.forEach((discovery, index) =>
    entries.push(
      <div className="marginal-note" key={`disc-${index}`}>
        <p className="marginal-label">Algo que descubrimos</p>
        <p>{discovery}</p>
      </div>,
    ),
  );
  collectionItems.forEach((item) =>
    entries.push(<CollectionNote item={item} key={`coll-${item.id}`} />),
  );
  relatedPlaces.forEach((place) =>
    entries.push(
      <div className="marginal-note" key={`place-${place.id}`}>
        <p className="marginal-label">{place.name}</p>
        {place.recommendation ? <p>{place.recommendation}</p> : null}
        <Links location={place.location} websiteUrl={place.websiteUrl} />
      </div>,
    ),
  );
  contextual.forEach((note, index) =>
    entries.push(
      <div className="marginal-note" key={`ctx-${note.label}-${index}`}>
        <p className="marginal-label">{note.label}</p>
        <p>{note.text}</p>
      </div>,
    ),
  );

  if (entries.length === 0) return null;

  return (
    <aside className="passage-marginalia" aria-label="Notas al margen">
      {entries.slice(0, MAX_MARGINALIA)}
    </aside>
  );
}

function CollectionNote({ item }: { item: CollectionItem }) {
  const { user } = useSession();
  const preferredCurrency = resolvePreferredCurrency({
    explicitPreference: user?.preferredCurrency,
    residenceCountryCode: user?.residenceCountryCode,
  });
  const localMoney = normalizeLegacyMoney(item.estimatedPrice, item.currency);
  const legacyLine = !localMoney
    ? [item.suggestedWhereToBuy, item.estimatedPrice].filter(Boolean).join(" — ")
    : "";
  return (
    <div className="marginal-note">
      <p className="marginal-label">{item.name}</p>
      {item.description ? <p>{item.description}</p> : null}
      {localMoney ? (
        <p>
          {item.suggestedWhereToBuy ? `${item.suggestedWhereToBuy} — ` : ""}
          <MoneyLine localMoney={localMoney} preferredCurrency={preferredCurrency} />
        </p>
      ) : legacyLine ? <p>{legacyLine}</p> : null}
    </div>
  );
}

// Franja editorial de hechos: hora · lugar · duración. Lectura de un vistazo, en
// versalitas, sin caja ni chips. Es el encabezado práctico que faltaba: dice
// cuándo, dónde y cuánto dura sin convertirse en ficha técnica.
function PassageFacts({ activity, place }: { activity: Activity; place: Place | null }) {
  const location = resolveLocation(activity, place);
  const duration = activity.practical?.estimatedDuration ?? activity.intelligence?.durationEstimate;
  // El nombre del lugar (El Cuartito) es más reconocible de un vistazo que su
  // dirección; la dirección exacta vive en el pliegue, sin repetirse aquí.
  const placeLabel = place?.name ?? location?.name;
  const facts = [activity.timeWindow, placeLabel, duration].filter(Boolean) as string[];
  if (facts.length === 0) return null;
  return (
    <p className="passage-facts">
      {facts.map((fact, index) => (
        <Fragment key={`${fact}-${index}`}>
          {index > 0 ? <span className="fact-sep" aria-hidden="true"> · </span> : null}
          <span className="fact">{fact}</span>
        </Fragment>
      ))}
    </p>
  );
}

function resolveReservation(activity: Activity, place: Place | null): string | null {
  if (activity.practical?.reservation) return activity.practical.reservation;
  const flag = activity.intelligence?.reservationRecommended ?? place?.intelligence?.reservationRecommended;
  if (flag === true) return "Recomendada";
  if (flag === false) return "No suele ser necesaria";
  return null;
}

interface PracticalRow {
  term: string;
  detail: string;
}

// Banda de precio → palabra editorial. La banda no envejece como un monto.
function priceWord(level: string): string {
  const bands: Record<string, string> = { $: "Económico", $$: "Medio", $$$: "Alto", $$$$: "Muy alto" };
  return bands[level] ?? "";
}

// Mini mapa editorial: una postal dibujada del lugar, no un widget ni un mapa
// interactivo. Al tocarla abre Google Maps. Sin tiles externos, sin coordenadas,
// sin API — una ilustración más del libro que además lleva al mapa real.
function MapPostcard({ href, label }: { href: string; label?: string }) {
  return (
    <a
      className="map-postcard"
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={label ? `Abrir ${label} en el mapa` : "Abrir en el mapa"}
    >
      <svg className="map-postcard-art" viewBox="0 0 220 104" aria-hidden="true" focusable="false">
        <path
          className="map-street"
          d="M0 68 H220 M78 0 V104 M0 30 L132 104 M164 0 L220 44 M20 0 L20 104"
        />
        <circle className="map-plot" cx="30" cy="86" r="9" />
        <circle className="map-plot" cx="186" cy="22" r="7" />
        <g className="map-pin" transform="translate(110 40)">
          <path d="M0 22 C-9 9 -9 -3 0 -9 C9 -3 9 9 0 22 Z" />
          <circle cx="0" cy="1" r="3.6" />
        </g>
      </svg>
      {label ? <span className="map-postcard-label">{label}</span> : null}
    </a>
  );
}

const COST_BASIS: Record<string, string> = {
  couple: "para dos",
  person: "por persona",
  total: "en total",
  ticket: "por entrada",
  ride: "por viaje",
};

const COST_LABEL: Record<string, string> = {
  free: "Entrada gratuita",
  included: "Incluido en el viaje",
  variable: "Costo variable",
  alreadyPaid: "Coordinado aparte",
};

// Rango de dinero con la moneda escrita una sola vez ("ARS 70.000 – 105.000").
// Los montos curados (y sus conversiones aproximadas) son enteros: los pesos no
// se citan con centavos, así que el costo se muestra sin decimales.
function formatMoneyRange(min: Money, max: Money, display: "code" | "symbol"): string {
  const fmt = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: min.currency,
      currencyDisplay: display,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  if (min.amount === max.amount) return fmt(min.amount);
  const high = fmt(max.amount).replace(/^[^\d]*/, "");
  return `${fmt(min.amount)} – ${high}`;
}

function formatConvertedRange(min: Money, max: Money): string {
  return `≈ ${formatMoneyRange(min, max, "symbol")} ${min.currency}`;
}

// Costo monetario: moneda local primero, conversión aproximada debajo si hay
// tasa (regla de render del contenido). Dos lecturas de tasa: extremo y extremo.
function CostMoney({ min, max, preferredCurrency }: { min: Money; max: Money; preferredCurrency: string }) {
  const minCtx = useFinancialContext(min, preferredCurrency);
  const maxCtx = useFinancialContext(max, preferredCurrency);
  const convMin = minCtx.data?.available ? minCtx.data.convertedMoney : null;
  const convMax = maxCtx.data?.available ? maxCtx.data.convertedMoney : null;
  return (
    <span className="money-line">
      <span className="money-line-local">{formatMoneyRange(min, max, "code")}</span>
      {convMin && convMax ? (
        <span className="money-line-context">
          <span className="money-line-converted">{formatConvertedRange(convMin, convMax)}</span>
        </span>
      ) : null}
    </span>
  );
}

// El costo aproximado como nota editorial: monto real (ARS/CLP) con conversión, o
// una etiqueta curada ("Entrada gratuita", "Incluido", "Costo variable"). Nunca
// un precio inventado ni un monto que envejezca solo.
function CostFact({ cost }: { cost: EstimatedCost }) {
  const { user } = useSession();
  const preferredCurrency = resolvePreferredCurrency({
    explicitPreference: user?.preferredCurrency,
    residenceCountryCode: user?.residenceCountryCode,
  });
  const isMonetary = cost.type === "range" || cost.type === "fixed";
  const aside = isMonetary
    ? [cost.includes, cost.basis ? COST_BASIS[cost.basis] : ""].filter(Boolean).join(" · ")
    : cost.note ?? "";

  let body: ReactNode = null;
  if (isMonetary) {
    const min = createMoney(cost.min ?? cost.amount ?? Number.NaN, cost.currency);
    const max = createMoney(cost.max ?? cost.amount ?? Number.NaN, cost.currency);
    if (min && max) {
      body = <CostMoney min={min} max={max} preferredCurrency={preferredCurrency} />;
    } else {
      body = cost.note ?? null;
    }
  } else {
    body = COST_LABEL[cost.type] ?? cost.note ?? null;
  }
  if (!body) return null;

  return (
    <div className="practical-fact">
      <dt>Costo aprox.</dt>
      <dd>
        {body}
        {aside ? <span className="cost-aside">{aside}</span> : null}
      </dd>
    </div>
  );
}

// "Cómo llegar y datos prácticos": pliegue editorial, silencioso en reposo pero
// evidente. Al abrir, el orden es el de alguien que llega a un lugar nuevo:
// dónde queda → cómo se ve → cómo llegar → cuánto cuesta → y recién después los
// detalles editoriales (qué pedir, reserva, clima, consejo). Nunca una tarjeta.
function PracticalFold({ activity, place }: { activity: Activity; place: Place | null }) {
  const location = resolveLocation(activity, place);
  const websiteUrl = resolveWebsiteUrl(activity, place);
  const order = (activity.practical?.suggestedOrder ?? []).filter(Boolean);
  const reservation = resolveReservation(activity, place);
  const cost = activity.practical?.estimatedCost ?? place?.estimatedCost;
  const priceLevel = place?.priceLevel ?? activity.practical?.priceLevel;
  const rows: PracticalRow[] = [
    // priceLevel es solo respaldo cuando no hay costo estimado real.
    !cost && priceLevel
      ? { term: "Costo aprox.", detail: `${priceLevel}${priceWord(priceLevel) ? ` · ${priceWord(priceLevel)}` : ""}` }
      : null,
    order.length ? { term: "Qué pedir", detail: order.join(" · ") } : null,
    reservation ? { term: "Reserva", detail: reservation } : null,
    activity.practical?.weatherNote ? { term: "Clima", detail: activity.practical.weatherNote } : null,
    activity.practical?.experienceTip ? { term: "Consejo", detail: activity.practical.experienceTip } : null,
  ].filter((row): row is PracticalRow => row !== null);
  const hasNavigation = Boolean(location?.uberDeepLink || location?.cabifyDeepLink || websiteUrl);
  const hasNotes = Boolean(cost) || rows.length > 0;
  const hasContent = Boolean(location?.name || location?.googleMapsUrl || hasNavigation || hasNotes);
  if (!hasContent) return null;
  return (
    <details className="practical-fold">
      <summary>
        <span className="practical-fold-label">Cómo llegar y datos prácticos</span>
        {location?.name ? <span className="practical-fold-preview">{location.name}</span> : null}
      </summary>
      <div className="practical-fold-body">
        <div className="practical-fold-place">
          {location?.name ? <p className="practical-address">{location.name}</p> : null}
          {location?.googleMapsUrl ? (
            <MapPostcard href={location.googleMapsUrl} label={place?.name ?? location.name} />
          ) : null}
          {hasNavigation ? <Links location={location} websiteUrl={websiteUrl} omitMap /> : null}
        </div>
        {hasNotes ? (
          <dl className="practical-facts">
            {cost ? <CostFact cost={cost} /> : null}
            {rows.map((row) => (
              <div className="practical-fact" key={row.term}>
                <dt>{row.term}</dt>
                <dd>{row.detail}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </details>
  );
}

// La foto de este momento: consejo fotográfico curado, cerca de su actividad.
function photoSpotNote(spot: PhotoSpot): PassageNote {
  const lead = [spot.bestTime, spot.location?.name].filter(Boolean).join(" · ");
  const text = [lead, spot.tip].filter(Boolean).join(" — ");
  return { label: "La foto de este momento", text };
}

function ActivityPageMarks({
  chapterId,
  activity,
  suggestedMemories,
  existingMemory,
  staged,
  memoryEnabled,
  allowInvitation,
  dateLabel,
}: {
  chapterId: string;
  activity: Activity;
  suggestedMemories: SuggestedMemory[];
  existingMemory: Memory | null;
  staged: import("../lib/photoSlot").StagedPhoto[];
  memoryEnabled: boolean;
  allowInvitation: boolean;
  dateLabel?: string;
}) {
  if (existingMemory) {
    return (
      <div className="activity-page-marks" aria-label="Recuerdo guardado en este pasaje">
        <SavedMemory memory={existingMemory} dateLabel={dateLabel} />
      </div>
    );
  }
  // Escasez: la casilla que espera solo aparece en beats con peso de recuerdo
  // (Pleno y Pausa). Umbral/Cierre y Caminado no la muestran.
  if (!memoryEnabled || !allowInvitation) return null;
  const hint = suggestedMemories.map((memory) => memory.prompt).join(" · ");
  return (
    <div className="activity-page-marks" aria-label="Espacio para un recuerdo de este pasaje">
      <MemoryInvitation
        chapterId={chapterId}
        activityId={activity.id}
        question=""
        hint={hint}
        staged={staged}
        whisper="Aquí va a quedar la foto de este momento"
      />
    </div>
  );
}

export function ActivityPage({
  entry,
  chapterId,
  memoriesByActivityId,
  composition = "pleno",
  centered = false,
  showReferencePhoto = true,
  memoryEnabled = true,
  dateLabel,
  traditions,
  discoveries,
  collectionItems,
  relatedPlaces,
  notes,
  photoSpot,
  companion,
}: {
  entry: ActivityWithPlace;
  chapterId: string;
  memoriesByActivityId: Map<string, Memory[]>;
  composition?: PassageComposition;
  centered?: boolean;
  showReferencePhoto?: boolean;
  memoryEnabled?: boolean;
  dateLabel?: string;
  traditions?: Tradition[];
  discoveries?: string[];
  collectionItems?: CollectionItem[];
  relatedPlaces?: Place[];
  notes?: PassageNote[];
  photoSpot?: PhotoSpot;
  companion?: ReactNode;
}) {
  const { stagedPhotosBySlot } = useExperienceCtx();
  const { activity, place, suggestedMemories } = entry;
  const existingMemory = mostRecent(memoriesByActivityId.get(activity.id));
  const staged = stagedPhotosBySlot.get(photoSlotKey(chapterId, activity.id)) ?? [];
  const mediaUrl = showReferencePhoto ? resolveStoryMediaUrl(activity.image) : null;
  const contextual = resolveContextualLines(activity.intelligence, place?.intelligence).map((line) => ({
    label: line.id === "duration" ? "Tiempo" : "Para saber",
    text: line.text,
  }));
  const voice = [activity.description, activity.insight].filter(Boolean).join(" ");
  const panoramic = composition === "caminado";
  const isInstante = activity.kind === "instante";
  const isCeremonia = activity.kind === "ceremonia";
  const centeredResolved = centered || isCeremonia;
  const allowInvitation = isInstante || composition === "pleno" || composition === "pausa";
  // La nota fotográfica del spot viaja con su actividad y encabeza la marginalia.
  const marginalNotes = [...(photoSpot ? [photoSpotNote(photoSpot)] : []), ...(notes ?? [])];

  // Un Instante es una respiración, no una actividad: título modesto, la línea del
  // momento y, si acaso, una foto pequeña. Sin datos prácticos, sin marginalia,
  // sin filete. Solo el latido del viaje entre escena y escena.
  if (isInstante) {
    const line = activity.moment || voice;
    return (
      <li className="activity-page activity-page-instante">
        <article
          className="day-passage day-passage-instante"
          data-composition="instante"
          data-reveal-on-scroll=""
          data-reveal-key={`passage-${activity.id}`}
        >
          <div className="passage-main">
            <h2 className="instante-title">{activity.title}</h2>
            {line ? <p className="instante-line">{line}</p> : null}
            {mediaUrl ? <ReferenceLamina src={mediaUrl} alt={activity.title} /> : null}
            <ActivityPageMarks
              chapterId={chapterId}
              activity={activity}
              suggestedMemories={suggestedMemories}
              existingMemory={existingMemory}
              staged={staged}
              memoryEnabled={memoryEnabled}
              allowInvitation
              dateLabel={dateLabel}
            />
          </div>
        </article>
      </li>
    );
  }

  return (
    <li className="activity-page">
      <article
        className={`day-passage day-passage-${composition}${centeredResolved ? " day-passage-centered" : ""}${isCeremonia ? " day-passage-ceremonia" : ""}`}
        data-composition={composition}
        data-reveal-on-scroll=""
        data-reveal-key={`passage-${activity.id}`}
      >
        <div className="passage-main">
          {isCeremonia ? <p className="ceremonia-kicker" aria-hidden="true">La gran escena del día</p> : null}
          <header className="passage-heading">
            {activity.moment ? (
              <p className="passage-moment">{activity.moment}</p>
            ) : null}
            <h2>{activity.title}</h2>
            <PassageFacts activity={activity} place={place} />
          </header>
          {voice ? <p className="passage-voice">{voice}</p> : null}
          {place?.recommendation ? (
            <p className="passage-counsel">{place.recommendation}</p>
          ) : null}
          {mediaUrl ? <ReferenceLamina src={mediaUrl} alt={activity.title} panoramic={panoramic} /> : null}
          {companion ? <div className="passage-companion">{companion}</div> : null}
          <ActivityPageMarks
            chapterId={chapterId}
            activity={activity}
            suggestedMemories={suggestedMemories}
            existingMemory={existingMemory}
            staged={staged}
            memoryEnabled={memoryEnabled}
            allowInvitation={allowInvitation}
            dateLabel={dateLabel}
          />
          <PracticalFold activity={activity} place={place} />
        </div>
        {composition !== "pausa" ? (
          <PassageMarginalia
            traditions={traditions}
            discoveries={discoveries}
            collectionItems={collectionItems}
            relatedPlaces={relatedPlaces}
            notes={marginalNotes}
            contextual={contextual}
          />
        ) : null}
      </article>
      <SceneFilete />
    </li>
  );
}

/** Compatibilidad para consumidores editoriales existentes. */
export const ActivityCard = ActivityPage;

export function OurMoment({
  ourMoment,
  chapterId,
  existingMemory = null,
  staged = [],
  memoryEnabled = false,
  dateLabel,
}: {
  ourMoment?: string;
  chapterId: string;
  existingMemory?: Memory | null;
  staged?: import("../lib/photoSlot").StagedPhoto[];
  memoryEnabled?: boolean;
  dateLabel?: string;
}) {
  if (!ourMoment) return null;
  const slotId = `${chapterId}::our-moment`;
  return (
    <article className="day-passage day-passage-pausa day-passage-our-moment" data-composition="pausa">
      <div className="passage-main">
        <h2 className="memory-rotulo">Nuestro momento</h2>
        <p className="passage-voice">{ourMoment}</p>
        {existingMemory ? <SavedMemory memory={existingMemory} dateLabel={dateLabel} /> : null}
        {!existingMemory && memoryEnabled ? (
          <MemoryInvitation
            chapterId={chapterId}
            activityId={slotId}
            staged={staged}
            whisper="Aquí va a vivir este instante, solo de ustedes dos"
          />
        ) : null}
      </div>
    </article>
  );
}

export function NightNote({ nightNote, chapterId, folio = 1 }: { nightNote?: string; chapterId: string; folio?: number }) {
  if (!nightNote) return null;
  return (
    <article
      className="day-passage day-passage-umbral-cierre day-passage-closing"
      data-composition="umbral-cierre"
      data-reveal-key={`chapter-${chapterId}-closing`}
    >
      <SceneFilete />
      <h2 className="sr-only">Cierre del día</h2>
      <p className="closing-line">{nightNote}</p>
      <p className="day-folio" aria-label={`Folio ${folio}`}>— {toRoman(folio).toLowerCase()} —</p>
    </article>
  );
}

export function GeneralMemories({
  chapterId,
  unassignedSuggestedMemories,
  generalMemories,
  staged,
  memoryEnabled = true,
  dateLabel,
}: {
  chapterId: string;
  unassignedSuggestedMemories: SuggestedMemory[];
  generalMemories: Memory[];
  staged: import("../lib/photoSlot").StagedPhoto[];
  memoryEnabled?: boolean;
  dateLabel?: string;
}) {
  const existing = mostRecent(generalMemories);
  if (existing) return <SavedMemory memory={existing} dateLabel={dateLabel} />;
  if (!memoryEnabled) return null;
  return (
    <div className="day-memory-coda" aria-label="Espacio para otro recuerdo del día">
      <p className="memory-rotulo">Lo que queremos guardar</p>
      <MemoryInvitation
        chapterId={chapterId}
        activityId={null}
        question=""
        hint={unassignedSuggestedMemories.map((memory) => memory.prompt).join(" · ")}
        staged={staged}
        whisper="Aquí cabe algo más que quieran guardar del día"
      />
    </div>
  );
}

export function RelatedPlaces({ places }: { places: Place[]; chapterId: string }) {
  return <PassageMarginalia relatedPlaces={places} />;
}

export function PhotoSpots({ spots }: { spots: PhotoSpot[]; chapterId: string }) {
  return (
    <PassageMarginalia
      notes={spots.map((spot) => ({
        label: spot.title,
        text: [spot.bestTime, spot.tip].filter(Boolean).join(" · "),
      }))}
    />
  );
}

export function CollectionItems({ items }: { items: CollectionItem[]; chapterId: string }) {
  return <PassageMarginalia collectionItems={items} />;
}

export function Traditions({ traditions }: { traditions?: Tradition[]; chapterId: string }) {
  return <PassageMarginalia traditions={traditions} />;
}

export function MicroDiscoveries({ discoveries }: { discoveries?: string[]; chapterId: string }) {
  return <PassageMarginalia discoveries={discoveries} />;
}

export function DayNote({ copy, title }: { copy?: string; title: string; variant: "plan-b" | "extra-time"; chapterId: string }) {
  return copy ? <PassageMarginalia notes={[{ label: title, text: copy }]} /> : null;
}

export function AlbumLink({ label = "Abrir nuestros recuerdos" }: { label?: string }) {
  const { interactive, actions } = useExperienceCtx();
  if (!interactive) return null;
  return (
    <p className="album-link">
      <button type="button" onClick={() => actions.openAlbum()}>{label}</button>
    </p>
  );
}

// El índice ya no vive como barra fija sobre la lectura: se invoca, discreto, al
// pie del día. Reemplaza a la topbar persistente sin perder la navegación.
export function IndexReturnLink({ label = "Volver al índice" }: { label?: string }) {
  const { interactive, actions } = useExperienceCtx();
  if (!interactive) return null;
  return (
    <p className="index-return-link">
      <button type="button" onClick={() => actions.openIndex()}>{label}</button>
    </p>
  );
}

// Divisor de fase: el umbral cruzado. "Bienvenidos a Buenos Aires" con su copy,
// como una nueva portada dentro del mismo día.
export function PhaseTitle({ title, copy }: { title?: string; copy?: string }) {
  if (!title && !copy) return null;
  return (
    <li className="activity-page phase-title-page">
      <div className="phase-title">
        <SceneFilete />
        {title ? <h2>{title}</h2> : null}
        {copy ? <p>{copy}</p> : null}
      </div>
    </li>
  );
}

// Umbral humano de llegada. No consulta sensores: la acción explícita del viajero
// es suficiente y reutiliza el progreso pegajoso existente (actions.start).
export function ArrivalThreshold({
  gate,
  onOpen,
}: {
  gate: ArrivalGate;
  onOpen: () => void;
}) {
  const copy = gate.confirmationCopy ?? `¿Ya llegaron a ${gate.destination ?? "destino"}?`;
  const label = gate.confirmLabel ?? "Abrir Buenos Aires";
  return (
    <li className="activity-page arrival-threshold-page">
      <div className="arrival-threshold" data-arrival-mode="manual">
        <SceneFilete />
        <p className="arrival-threshold-copy">{copy}</p>
        <button type="button" className="arrival-threshold-open" onClick={onOpen}>
          {label} →
        </button>
      </div>
    </li>
  );
}

export function ClosingMessage({ view, storyPackage }: { view: import("@/features/story/engine/types").StoryView; storyPackage: StoryPackage }) {
  const lastClosed = storyPackage.chapters
    .filter((chapter) => view.completedChapters.includes(chapter.id))
    .sort((a, b) => b.order - a.order)[0];
  if (!lastClosed) return null;
  const closeLine = lastClosed.copy?.close ?? storyPackage.baseCopy.dailyCloseTemplate;
  return <NightNote nightNote={closeLine} chapterId={lastClosed.id} folio={lastClosed.order} />;
}

export function ChapterHero({ chapter, openLine }: { chapter: Chapter; openLine: string }) {
  const { storyPackage } = useExperienceCtx();
  const chapterDate = formatChapterDate(getChapterReferenceDate(chapter, storyPackage));
  const hero = heroImageForChapter(chapter);
  return (
    <header className="day-masthead">
      <p className="day-masthead-kicker">Día {toRoman(chapter.order)} · {chapterDate}</p>
      <h1>{chapter.title}</h1>
      <p className="day-masthead-open">{openLine}</p>
      {hero ? <ReferenceLamina src={hero} alt={`Fotografía de referencia de ${chapter.title}`} /> : null}
      <SceneFilete />
    </header>
  );
}

interface ActionButtonOptions {
  useConfirmation?: boolean;
  confirmQuestion?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  startLabel?: string;
  closeLabel?: string;
}

export function ActionButton({
  chapterId,
  status,
  options = {},
}: {
  chapterId: string;
  status: ChapterStatusValue;
  options?: ActionButtonOptions;
}) {
  const { interactive, confirmingClose, actions } = useExperienceCtx();
  const {
    useConfirmation = true,
    confirmQuestion = "¿Quieres cerrar el día así como fue?",
    confirmLabel = "Sí, cerrar por hoy",
    cancelLabel = "Seguir un rato más",
    startLabel = "Abrir este día",
    closeLabel = "Dejar el día así",
  } = options;
  if (!interactive) return null;
  if (status === ChapterStatus.AVAILABLE) {
    return <div className="actions"><button type="button" onClick={() => actions.start(chapterId)}>{startLabel}</button></div>;
  }
  if (status !== ChapterStatus.STARTED) return null;
  if (!useConfirmation) {
    return <div className="actions"><button type="button" onClick={() => actions.complete(chapterId)}>{closeLabel}</button></div>;
  }
  if (confirmingClose) {
    return (
      <div className="actions actions-confirm">
        <p className="confirm-question">{confirmQuestion}</p>
        <div className="confirm-buttons">
          <button type="button" onClick={() => actions.cancelClose()}>{cancelLabel}</button>
          <button type="button" onClick={() => actions.complete(chapterId)}>{confirmLabel}</button>
        </div>
      </div>
    );
  }
  return <div className="actions"><button type="button" onClick={() => actions.askClose()}>{closeLabel}</button></div>;
}
