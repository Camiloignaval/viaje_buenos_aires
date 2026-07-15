import { DECISION_REASONS } from "@/features/context-engine/decision/constants";
import { DECISION_RULE_IDS } from "@/features/context-engine/decision/contracts";
import { LIVING_CONTEXT_MODULES } from "@/features/context-engine/types";
import type { StoryPackage } from "@/features/story/engine/types";
import type { HealthCheckContext, HealthFinding } from "./types";

const RULE_IDS = new Set<string>(DECISION_RULE_IDS);
const CAPABILITIES = new Set<string>(LIVING_CONTEXT_MODULES);
const REASONS = new Set<string>(DECISION_REASONS);
const CANDIDATE_METADATA = new Set(["outdoor", "indoor", "rainFriendly", "photoMoment"]);
const REQUIRED_CANDIDATE_METADATA: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "weather-attention-candidate": Object.freeze(["outdoor", "rainFriendly"]),
  "light-moment-candidate": Object.freeze(["photoMoment"]),
});
const BASE_PATH = "$context.decisionManifest.rules";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function warning(code: string, path: string): HealthFinding {
  return {
    category: "context",
    severity: "warning",
    code,
    path,
    message: "Decision manifest metadata is invalid at this path.",
  };
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function invalidClosedValues(
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
  code: string,
): HealthFinding[] {
  if (!Array.isArray(value)) return [warning(code, path)];
  return value.flatMap((item, index) => (
    typeof item === "string" && allowed.has(item)
      ? []
      : [warning(code, `${path}[${index}]`)]
  ));
}

function inspectRule(ruleValue: unknown, index: number): HealthFinding[] {
  const path = `${BASE_PATH}[${index}]`;
  const rule = asRecord(ruleValue);
  if (!rule) return [warning("decision-manifest.invalid-rule", path)];
  const findings: HealthFinding[] = [];

  if (typeof rule.id !== "string" || !RULE_IDS.has(rule.id)) {
    findings.push(warning("decision-manifest.invalid-rule-id", `${path}.id`));
  }
  findings.push(...invalidClosedValues(
    rule.requiredCapabilities,
    CAPABILITIES,
    `${path}.requiredCapabilities`,
    "decision-manifest.unknown-capability",
  ));
  findings.push(...invalidClosedValues(
    rule.abstainReasons,
    REASONS,
    `${path}.abstainReasons`,
    "decision-manifest.unknown-reason-code",
  ));

  const window = asRecord(rule.window);
  if (
    !window
    || !validTimestamp(window.validFrom)
    || !validTimestamp(window.validUntil)
    || Date.parse(window.validUntil) <= Date.parse(window.validFrom)
  ) {
    findings.push(warning("decision-manifest.invalid-window", `${path}.window`));
  }

  if (rule.dedupeStrategy !== "semantic") {
    findings.push(warning("decision-manifest.missing-dedupe-strategy", `${path}.dedupeStrategy`));
  }
  if (rule.expiresAt === undefined || rule.expiresAt === null || rule.expiresAt === "") {
    findings.push(warning("decision-manifest.missing-required-expiry", `${path}.expiresAt`));
  } else if (!validTimestamp(rule.expiresAt)) {
    findings.push(warning("decision-manifest.invalid-required-expiry", `${path}.expiresAt`));
  }

  const metadata = rule.candidateMetadata;
  const required = typeof rule.id === "string" ? REQUIRED_CANDIDATE_METADATA[rule.id] ?? [] : [];
  const metadataIsCompatible = Array.isArray(metadata)
    && metadata.every((item) => typeof item === "string" && CANDIDATE_METADATA.has(item))
    && required.every((item) => metadata.includes(item));
  if (!metadataIsCompatible) {
    findings.push(warning("decision-manifest.incompatible-candidate-metadata", `${path}.candidateMetadata`));
  }

  return findings;
}

function duplicateIdFindings(rules: readonly unknown[]): HealthFinding[] {
  const byId = new Map<string, number[]>();
  rules.forEach((value, index) => {
    const id = asRecord(value)?.id;
    if (typeof id !== "string") return;
    const indexes = byId.get(id) ?? [];
    indexes.push(index);
    byId.set(id, indexes);
  });
  return [...byId.values()]
    .filter((indexes) => indexes.length > 1)
    .flatMap((indexes) => indexes.map((index) => warning(
      "decision-manifest.duplicate-rule-id",
      `${BASE_PATH}[${index}].id`,
    )))
    .sort((left, right) => (left.path ?? "").localeCompare(right.path ?? ""));
}

export function inspectDecisionManifest(manifest: unknown): HealthFinding[] {
  if (manifest === undefined || manifest === null) return [];
  const rules = asRecord(manifest)?.rules;
  if (!Array.isArray(rules)) {
    return [warning("decision-manifest.invalid-rules", BASE_PATH)];
  }
  return [
    ...rules.flatMap(inspectRule),
    ...duplicateIdFindings(rules),
  ];
}

export function checkDecisionManifest(_pkg: StoryPackage, ctx: HealthCheckContext): HealthFinding[] {
  return inspectDecisionManifest(ctx.decisionManifest);
}
