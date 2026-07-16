import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT,
  simulateFirstRealExperience,
} from "./firstRealExperienceSimulator";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(HERE, "..", "..");
const APP_ROOT = join(SRC_ROOT, "..");
const REPO_ROOT = join(APP_ROOT, "..");

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child, seen);
}

describe("simulateFirstRealExperience", () => {
  it("Fixture repetible: repeats the canonical real five-engine result without ambient time", async () => {
    const first = await simulateFirstRealExperience();
    const second = await simulateFirstRealExperience();

    expect(first).toEqual(second);
    expect(first.result).toMatchObject({
      outcome: "composed",
      message: {
        variantId: "today-01",
        text: "Hoy comienza una nueva historia.",
        channel: "in_app",
      },
      memoryCandidate: { outcome: "candidate", type: "trip_started" },
      deliveryIntents: [{ destination: "in_app", state: "pending" }],
    });
    expect(first.transitions).toBe(FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT);
    expect(first.result.trace).toEqual(first.transitions);
  });

  it("exposes the exact categorical five-stage transition snapshot", () => {
    expect(FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT).toEqual([
      { stage: "living_context", outcome: "resolved", reason: "none" },
      { stage: "decision_engine", outcome: "selected", reason: "none" },
      { stage: "companion", outcome: "action", reason: "none" },
      { stage: "editorial_voice", outcome: "rendered", reason: "none" },
      { stage: "memory_engine", outcome: "candidate", reason: "trip_started" },
    ]);
    expect(JSON.stringify(FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT))
      .not.toMatch(/trip-1|user-1|story-1|2026-|Hoy comienza|payload|@|error/i);
    expectDeepFrozen(FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT);
  });

  it("ignores hostile observers while preserving a deeply immutable result", async () => {
    const events: unknown[] = [];
    const expected = await simulateFirstRealExperience();
    const actual = await simulateFirstRealExperience({
      observer: (event) => {
        events.push(event);
        throw new Error("observer failure with private@example.com token=secret");
      },
    });

    expect(actual).toEqual(expected);
    expect(events).toEqual(FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT);
    expect(JSON.stringify(events)).not.toMatch(/trip-1|user-1|story-1|2026-|Hoy comienza|payload|@|secret/i);
    expectDeepFrozen(actual);
  });

  it("Ausencia productiva: has no production importer or forbidden runtime capability", () => {
    const simulatorPath = join(HERE, "firstRealExperienceSimulator.ts");
    const composerPath = join(SRC_ROOT, "features", "experience", "firstRealExperience.ts");
    const runtimeSource = [simulatorPath, composerPath].map((path) => readFileSync(path, "utf8")).join("\n");
    const testSource = [
      join(HERE, "firstRealExperienceSimulator.test.ts"),
      join(SRC_ROOT, "features", "experience", "firstRealExperience.test.ts"),
    ].map((path) => readFileSync(path, "utf8")).join("\n");
    const productionImporters = sourceFiles(SRC_ROOT)
      .filter((path) => path !== simulatorPath && !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
      .filter((path) => readFileSync(path, "utf8").includes("firstRealExperienceSimulator"))
      .map((path) => relative(SRC_ROOT, path));

    expect(productionImporters).toEqual([]);
    expect(runtimeSource).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB/);
    expect(runtimeSource).not.toMatch(/from\s+["'][^"']*(?:react|provider|story|lifecycle|repository|rules)[^"']*["']/i);
    expect(runtimeSource).not.toMatch(/\b(?:openai|llm|embedding|prompt|Math\.random|Date\.now|new Date\s*\(\s*\))\b/i);
    expect(runtimeSource).not.toMatch(/\b(?:window|document|navigator)\b|\.tsx["']/);
    const bannedTestApi = new RegExp([
      ["vi", "mo" + "ck"].join("\\."),
      "toMatch" + "Snapshot",
      "toMatchInline" + "Snapshot",
    ].join("|"));
    expect(testSource).not.toMatch(bannedTestApi);
  });

  it("keeps unsupported delivery destinations fail-closed without replacing an engine", () => {
    const composerSource = readFileSync(
      join(SRC_ROOT, "features", "experience", "firstRealExperience.ts"),
      "utf8",
    );

    expect(composerSource).toContain(
      "export type DeliveryDestination = \"push\" | \"in_app\" | \"timeline\" | \"memory\";",
    );
    expect(composerSource).toContain(
      "const COMPANION_CHANNELS = new Set([\"push\", \"in_app\", \"timeline\", \"memory\", \"editorial\"]);",
    );
    expect(composerSource).toMatch(
      /!COMPANION_CHANNELS\.has\([\s\S]+?errorResult\(trace, observer, "companion", "unsupported_destination"\)/,
    );
  });

  it("Prueba byte-unchanged: keeps the five engine trees unchanged from the planning base", () => {
    const protectedPaths = [
      "app/src/features/context-engine/livingContext.ts",
      "app/src/features/context-engine/types.ts",
      "app/src/features/context-engine/decision",
      "app/src/features/context-engine/companion",
      "app/src/features/context-engine/editorial",
      "app/src/features/context-engine/memory",
    ];

    const output = execFileSync("git", [
      "-c", `safe.directory=${REPO_ROOT.replaceAll("\\", "/")}`,
      "diff", "--name-only", "cd50dcc", "--", ...protectedPaths,
    ], { cwd: REPO_ROOT, encoding: "utf8" });

    const productionChanges = output
      .split(/\r?\n/u)
      .filter((path) => path && !/\.test\.[^.]+$/u.test(path));
    expect(productionChanges).toEqual([]);
  });
});
