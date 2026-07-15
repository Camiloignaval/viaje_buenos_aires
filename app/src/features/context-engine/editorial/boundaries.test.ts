import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIRECTORY = path.resolve(process.cwd(), "src/features/context-engine/editorial");

function productionSources(): string {
  return readdirSync(DIRECTORY)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => readFileSync(path.join(DIRECTORY, name), "utf8"))
    .join("\n");
}

describe("Editorial Voice boundaries", () => {
  it("does not depend on runtime context, Story, providers, UI, delivery, storage or AI", () => {
    const source = productionSources();
    const banned = [
      /from\s+["']react["']/i,
      /livingContext|\/story\/|open-meteo|\/providers?\//i,
      /orchestrateCompanion|runContextDecisionEngine|\.\/decision/i,
      /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|mongodb/i,
      /PushCompanion|web-push|sendNotification|authorizeDelivery/i,
      /openai|anthropic|prompt|generateText|chatCompletion/i,
      /lib\/companionEngine|lib\\companionEngine/i,
      /from\s+["'][^"']*\/companion(?:\/|["'])/i,
      /console\.(?:log|warn|error)|navigator\.|document\.|window\./i,
    ];

    for (const boundary of banned) expect(source).not.toMatch(boundary);
  });

  it("keeps the v1 catalog free of interpolation tokens and input identifiers", () => {
    const source = readFileSync(path.join(DIRECTORY, "catalog.ts"), "utf8");
    expect(source).not.toMatch(/\$\{|\{(?:action|decision|trip|user|destination)Id\}/i);
    expect(source).not.toMatch(/\bMath\.random\b|\bDate\.now\b/);
  });

  it("keeps observation free of identifiers, copy and runtime payload shapes", () => {
    const source = readFileSync(path.join(DIRECTORY, "observer.ts"), "utf8");

    expect(source).not.toMatch(/actionId|decisionId|dedupeKey|actionRef|\btext\b|payload|evidence|rawError|\bstack\b/);
    expect(source).not.toMatch(/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|openai|prompt/i);
  });
});
