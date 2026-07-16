import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  observeVisibleExperience,
  type VisibleExperienceEvent,
  type VisibleExperienceEventKind,
} from "./lib/visibleExperience";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), "src", relativePath), "utf8");
}

const projection = source("features/experience/lib/visibleExperience.ts");
const component = source("features/experience/components/VisibleCompanionExperience.tsx");
const hook = source("features/experience/hooks/useFirstVisibleExperience.ts");
const session = source("features/experience/lib/visibleDeliverySession.ts");
const tripHome = source("features/trips/pages/TripHomePage.tsx");
const activeHome = source("features/trips/components/ActiveTripHome.tsx");
const visibleProduction = [projection, component, hook, tripHome, activeHome].join("\n");

describe("First Visible Experience boundaries", () => {
  it("Isolation: imports the approved composer but never simulator, lower engines or Story rules", () => {
    expect(hook).toContain('from "../firstRealExperience"');
    expect(visibleProduction).not.toMatch(/firstRealExperienceSimulator|features\/dev/);
    expect(visibleProduction).not.toMatch(/context-engine\/(?:livingContext|decision|companion|editorial)(?:\/|"|')/);
    expect(hook).toContain('import { acceptMemoryCandidate, type MemoryCandidate } from "@/features/context-engine/memory"');
    expect(visibleProduction).not.toMatch(/features\/story\/engine\/(?:storyEngine|progressStore|storyProgress|chapterContent|intelligence)/);
    expect(session.split("\n").filter((line) => line.includes("context-engine/"))).toEqual([
      'import type { CompanionHistoryEntry } from "@/features/context-engine/companion/contracts";',
      'import type { DecisionPriority } from "@/features/context-engine/decision";',
      'import { fnv1aUtf8 } from "@/features/context-engine/editorial/hash";',
    ]);
    expect([visibleProduction, session].join("\n")).not.toMatch(/firstRealExperienceSimulator|features\/dev/);
  });

  it("Isolation: permits only the established preference read and no Push, delivery or network capability", () => {
    expect(hook).toMatch(/import \{\s*getPushPreferences,\s*type PushPreferences\s*\} from "@\/features\/pwa\/pushApi"/s);
    expect(hook).toContain("await getPushPreferences()");
    expect(visibleProduction).not.toMatch(/PushCompanion|WebPush|web-push|subscribeForPush|savePushPreferences|sendPushTest|savePushSubscription|deletePushSubscription/);
    expect(visibleProduction).not.toMatch(/\bfetch\s*\(|platformRequest|axios|navigator\.serviceWorker|Notification\b/);
    expect(visibleProduction).not.toMatch(/sendDelivery|deliverMessage|timeline|\bemail\b|\bSMS\b|\bsms\b/);
  });

  it("Isolation: session continuity stays feature-local without durable persistence", () => {
    const presentation = [projection, component].join("\n");
    expect(presentation).not.toMatch(/localStorage|sessionStorage|indexedDB|visibleDeliverySession|repository|database|mongodb/i);
    expect(hook).toContain('from "../lib/visibleDeliverySession"');
    expect(hook).toContain("window.sessionStorage");
    expect(hook).not.toMatch(/localStorage|indexedDB|continuityStore|rememberTrip|repository|database|mongodb/i);
    expect(session).not.toMatch(/localStorage|indexedDB|continuityStore|rememberTrip|repository|database|mongodb/i);
    expect([hook, session].join("\n")).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    expect(component).toContain("useState(false)");
    expect(component).toContain("onVisible?: () => boolean");
    expect(component).toContain("onDismiss?: () => boolean");
  });

  it("keeps React presentation limited to view model and observer rather than domain inputs", () => {
    expect(component).toMatch(/type VisibleCompanionExperienceProps = Readonly<\{\s*viewModel: VisibleCompanionExperienceViewModel \| null;\s*observer\?: VisibleExperienceObserver;\s*onVisible\?: \(\) => boolean;\s*onDismiss\?: \(\) => boolean;\s*\}>/s);
    expect(component).not.toMatch(/\bTrip\b|\bUser\b|StoryPackage|FirstRealExperienceResult|DeliveryIntent|CompanionAction|EditorialMessage|MemoryCandidate/);
    expect(activeHome).toMatch(/companionMoment\?: ReactNode/);
  });

  it("emits only frozen category-only events for the complete observability vocabulary", () => {
    const kinds: VisibleExperienceEventKind[] = [
      "adaptive_flow_started",
      "adaptive_result_layer",
      "contextual_rendered",
      "contextual_silence",
      "memory_persisted",
      "memory_discarded",
      "memory_rendered",
      "delivery_expired",
    ];
    const events: VisibleExperienceEvent[] = [];

    for (const kind of kinds) observeVisibleExperience((event) => events.push(event), kind);

    expect(events).toEqual(kinds.map((kind) => ({ kind })));
    expect(events.every((event) => Object.keys(event).length === 1 && Object.isFrozen(event))).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/Hoy comienza|trip-|user-|2026-|payload|private@|rawError/);
  });
});
