import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ActDecision, ContextDecisionRun } from "../decision";
import type { CompanionInput } from "./contracts";
import { orchestrateCompanion } from "./orchestrator";

const NOW = "2026-10-03T15:00:00.000Z";
const COMPANION_DIRECTORY = path.resolve(process.cwd(), "src/features/context-engine/companion");
const CONTEXT_ENGINE_DIRECTORY = path.resolve(process.cwd(), "src/features/context-engine");

function productionCompanionSources(): string[] {
  return readdirSync(COMPANION_DIRECTORY)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => readFileSync(path.join(COMPANION_DIRECTORY, name), "utf8"));
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "companion" ? [] : sourceFiles(fullPath);
    return /\.(?:ts|tsx|js)$/.test(entry.name) ? [fullPath] : [];
  });
}

function selected(): ActDecision {
  return {
    outcome: "act",
    id: "decision:trip-start:trip-1:2026-10-03",
    ruleId: "trip-start-today",
    kind: "trip_start_today",
    category: "trip_lifecycle",
    priority: "normal",
    reasonCode: "actionable",
    confidence: "sufficient",
    evidence: [{ kind: "signal", state: "present" }],
    freshness: [{ module: "temporal", state: "fresh" }],
    requiredCapabilities: ["temporal"],
    sourceModules: ["temporal"],
    dedupeKey: "trip-start:trip-1:2026-10-03",
    window: {
      validFrom: "2026-10-03T14:00:00.000Z",
      validUntil: "2026-10-03T16:00:00.000Z",
      effectiveAt: NOW,
      expiresAt: "2026-10-03T16:00:00.000Z",
    },
    payload: { attentionSignal: "trip_lifecycle", temporalState: "active" },
  };
}

describe("Companion isolation boundaries", () => {
  it("has no production imports or calls for I/O, providers, delivery, UI, AI or Legacy Companion", () => {
    const productionSource = productionCompanionSources().join("\n");
    const bannedBoundaries = [
      /from\s+["']react["']/i,
      /open-meteo|weatherProvider|\/providers?\//i,
      /localStorage|sessionStorage|indexedDB|mongodb|platformMongo|node:fs|node:https?/i,
      /\bfetch\s*\(|XMLHttpRequest/i,
      /PushCompanion|web-push|sendNotification|authorizeDelivery/i,
      /features\/(?:experience|connected)|\/(?:components|ui)\//i,
      /openai|anthropic|chatCompletion|generateText/i,
      /lib\/companionEngine|lib\\companionEngine/i,
    ];

    for (const boundary of bannedBoundaries) expect(productionSource).not.toMatch(boundary);
  });

  it("does not activate a consumer or make prior Context Engine modules depend on Companion", () => {
    const priorEngineSource = sourceFiles(CONTEXT_ENGINE_DIRECTORY)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(priorEngineSource).not.toMatch(/from\s+["'][^"']*\/companion(?:\/index)?["']/i);
    expect(priorEngineSource).not.toMatch(/import\s*\(\s*["'][^"']*\/companion(?:\/index)?["']/i);
  });

  it("does not read Living Context or decision evaluations and performs no network request", () => {
    const context = new Proxy({}, {
      get: () => {
        throw new Error("Living Context must remain opaque");
      },
    });
    const act = selected();
    const decisionRun = Object.defineProperty({ decision: act, selected: act }, "evaluations", {
      get: () => {
        throw new Error("evaluations must not be read");
      },
    }) as ContextDecisionRun;
    const fetch = vi.fn(() => {
      throw new Error("network must not be used");
    });
    vi.stubGlobal("fetch", fetch);

    const result = orchestrateCompanion({
      context,
      decisionRun,
      preferences: { enabled: true },
    } as CompanionInput, { now: () => new Date(NOW) });

    expect(result).toMatchObject({ outcome: "action", channel: "in_app" });
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("produces a conceptual action without copy or delivery authorization", () => {
    const act = selected();
    const result = orchestrateCompanion({
      context: {} as CompanionInput["context"],
      decisionRun: { decision: act, selected: act, evaluations: [] },
      preferences: { enabled: true },
    }, { now: () => new Date(NOW) });

    expect(result).toMatchObject({ outcome: "action", channel: "in_app" });
    expect(result).not.toHaveProperty("copy");
    expect(result).not.toHaveProperty("delivery");
    expect(result).not.toHaveProperty("authorized");
  });
});
