import type {
  FirstRealExperienceComposed,
  FirstRealExperienceTransientComposed,
  FirstRealExperienceResult,
} from "../firstRealExperience";

export type VisibleExperienceEventKind =
  | "adaptive_flow_started"
  | "adaptive_result_layer"
  | "contextual_rendered"
  | "contextual_silence"
  | "memory_persisted"
  | "memory_discarded"
  | "memory_rendered"
  | "delivery_expired"
  ;

export type VisibleExperienceEvent = Readonly<{ kind: VisibleExperienceEventKind }>;
export type VisibleExperienceObserver = (event: VisibleExperienceEvent) => void;

export type VisibleCompanionExperienceViewModel = Readonly<{
  label: "Alaia";
  text: string;
}>;

export type VisibleExperienceProjectionOptions = Readonly<{
  surface: "active_trip_home" | "active_story_chapter" | "other";
  observer?: VisibleExperienceObserver;
}>;

function observerFrom(options: VisibleExperienceProjectionOptions): VisibleExperienceObserver | undefined {
  try {
    return typeof options.observer === "function" ? options.observer : undefined;
  } catch {
    return undefined;
  }
}

export function observeVisibleExperience(
  observer: VisibleExperienceObserver | undefined,
  kind: VisibleExperienceEventKind,
): void {
  try {
    observer?.(Object.freeze({ kind }));
  } catch {
    // Presentation observability is best-effort and never controls visibility.
  }
}

function isMatchingHomeIntent(result: FirstRealExperienceComposed): boolean {
  if (result.deliveryIntents.length !== 1) return false;
  const intent = result.deliveryIntents[0];
  return intent.destination === "in_app"
    && intent.destination === result.message.channel
    && intent.state === "pending"
    && intent.references.length === 2
    && intent.references[0] === "editorial_message"
    && intent.references[1] === "memory_candidate";
}

function isMatchingChapterIntent(result: FirstRealExperienceTransientComposed): boolean {
  if (result.deliveryIntents.length !== 1) return false;
  const intent = result.deliveryIntents[0];
  return intent.destination === "in_app"
    && intent.state === "pending"
    && intent.references.length === 1
    && intent.references[0] === "editorial_message";
}

export function toVisibleCompanionExperience(
  result: FirstRealExperienceResult,
  options: VisibleExperienceProjectionOptions,
): VisibleCompanionExperienceViewModel | null {
  const observer = observerFrom(options);
  try {
    const matchesHome = options.surface === "active_trip_home"
      && result.outcome === "composed"
      && isMatchingHomeIntent(result);
    const matchesChapter = options.surface === "active_story_chapter"
      && result.outcome === "transient_composed"
      && isMatchingChapterIntent(result);
    if (!matchesHome && !matchesChapter) {
      observeVisibleExperience(observer, "adaptive_result_layer");
      observeVisibleExperience(observer, "contextual_silence");
      return null;
    }
    if (typeof result.message.text !== "string") {
      observeVisibleExperience(observer, "adaptive_result_layer");
      observeVisibleExperience(observer, "contextual_silence");
      return null;
    }
    const viewModel = Object.freeze({ label: "Alaia" as const, text: result.message.text });
    observeVisibleExperience(observer, "adaptive_result_layer");
    return viewModel;
  } catch {
    observeVisibleExperience(observer, "contextual_silence");
    return null;
  }
}
