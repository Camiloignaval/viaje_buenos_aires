import type {
  FirstRealExperienceComposed,
  FirstRealExperienceResult,
} from "../firstRealExperience";

export type VisibleExperienceEventKind =
  | "flow_started"
  | "result_layer"
  | "delivery_pending"
  | "delivery_expired"
  | "render_success"
  | "dismiss"
  | "silence";

export type VisibleExperienceEvent = Readonly<{ kind: VisibleExperienceEventKind }>;
export type VisibleExperienceObserver = (event: VisibleExperienceEvent) => void;

export type VisibleCompanionExperienceViewModel = Readonly<{
  label: "Alaia";
  text: string;
}>;

export type VisibleExperienceProjectionOptions = Readonly<{
  surface: "active_trip_home" | "other";
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

function isMatchingIntent(result: FirstRealExperienceComposed): boolean {
  if (result.deliveryIntents.length !== 1) return false;
  const intent = result.deliveryIntents[0];
  return intent.destination === "in_app"
    && intent.destination === result.message.channel
    && intent.state === "pending"
    && intent.references.length === 2
    && intent.references[0] === "editorial_message"
    && intent.references[1] === "memory_candidate";
}

export function toVisibleCompanionExperience(
  result: FirstRealExperienceResult,
  options: VisibleExperienceProjectionOptions,
): VisibleCompanionExperienceViewModel | null {
  const observer = observerFrom(options);
  try {
    if (options.surface !== "active_trip_home"
      || result.outcome !== "composed"
      || !isMatchingIntent(result)) {
      observeVisibleExperience(observer, "result_layer");
      observeVisibleExperience(observer, "silence");
      return null;
    }
    if (typeof result.message.text !== "string") {
      observeVisibleExperience(observer, "result_layer");
      observeVisibleExperience(observer, "silence");
      return null;
    }
    const viewModel = Object.freeze({ label: "Alaia" as const, text: result.message.text });
    observeVisibleExperience(observer, "result_layer");
    return viewModel;
  } catch {
    observeVisibleExperience(observer, "silence");
    return null;
  }
}
