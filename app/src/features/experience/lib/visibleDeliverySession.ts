import type { CompanionHistoryEntry } from "@/features/context-engine/companion/contracts";
import type { DecisionPriority } from "@/features/context-engine/decision";
import { fnv1aUtf8 } from "@/features/context-engine/editorial/hash";

const VERSION = 1 as const;
const DESTINATION = "in_app" as const;
const KEY_PREFIX = "alaia:visible-delivery:v1:";
const IDENTITY_PREFIX = "vdr1_";
const SEPARATOR = "\u001f";
const DOCUMENT_KEYS = ["version", "receipts"] as const;
const RECEIPT_KEYS = [
  "version", "identity", "state", "destination", "dedupeKey", "priority",
  "pendingAt", "processedAt", "dismissedAt", "expiresAt",
] as const;
const STATES = new Set(["pending", "visible", "dismissed", "expired"]);
const PRIORITIES = new Set(["high", "normal", "low"]);

export type DeliveryReceiptState = "pending" | "visible" | "dismissed" | "expired";

export type DeliveryReceiptV1 = Readonly<{
  version: 1;
  identity: `vdr1_${string}`;
  state: DeliveryReceiptState;
  destination: "in_app";
  dedupeKey: string;
  priority: DecisionPriority;
  pendingAt: string;
  processedAt: string | null;
  dismissedAt: string | null;
  expiresAt: string;
}>;

export type DeliverySessionDocumentV1 = Readonly<{
  version: 1;
  receipts: readonly DeliveryReceiptV1[];
}>;

export type VisibleDeliveryScope = Readonly<{ userId: string; tripId: string }>;
export type VisibleDeliveryStorage = Readonly<{ getStorage: () => Storage }>;
export type VisibleDeliveryReferences =
  | readonly ["editorial_message"]
  | readonly ["editorial_message", "memory_candidate"];

export type PendingVisibleDeliveryInput = Readonly<{
  scope: VisibleDeliveryScope;
  actionId: string;
  destination: "in_app";
  references: VisibleDeliveryReferences;
  dedupeKey: string;
  priority: DecisionPriority;
  pendingAt: string;
  expiryBoundaries: readonly string[];
}>;

export type VisibleDeliveryCompanionSnapshot = Readonly<{
  decisionProcessedKeys: ReadonlySet<string>;
  companionProcessedKeys: ReadonlySet<string>;
  history: readonly CompanionHistoryEntry[];
}>;

type ReadResult =
  | Readonly<{ status: "available"; document: DeliverySessionDocumentV1 }>
  | Readonly<{ status: "unavailable" }>;
type WriteResult = Readonly<{ status: "available" | "unavailable" }>;
type TransitionResult =
  | Readonly<{ status: "transitioned"; receipt: DeliveryReceiptV1 }>
  | Readonly<{ status: "unavailable" }>;

function hash(value: string): string {
  return fnv1aUtf8(value).toString(16).padStart(8, "0");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isIsoInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  const allowed = new Set(keys);
  return actual.length === keys.length && actual.every((key) => allowed.has(key));
}

function freezeReceipt(receipt: DeliveryReceiptV1): DeliveryReceiptV1 {
  return Object.freeze({ ...receipt });
}

function freezeDocument(receipts: readonly DeliveryReceiptV1[]): DeliverySessionDocumentV1 {
  return Object.freeze({ version: VERSION, receipts: Object.freeze(receipts.map(freezeReceipt)) });
}

function isReceipt(value: unknown): value is DeliveryReceiptV1 {
  if (!value || typeof value !== "object" || !hasExactKeys(value, RECEIPT_KEYS)) return false;
  const receipt = value as Record<string, unknown>;
  if (receipt.version !== VERSION
    || !isNonEmptyString(receipt.identity) || !receipt.identity.startsWith(IDENTITY_PREFIX)
    || !STATES.has(receipt.state as string)
    || receipt.destination !== DESTINATION
    || !isNonEmptyString(receipt.dedupeKey)
    || !PRIORITIES.has(receipt.priority as string)
    || !isIsoInstant(receipt.pendingAt)
    || !isIsoInstant(receipt.expiresAt)
    || !(receipt.processedAt === null || isIsoInstant(receipt.processedAt))
    || !(receipt.dismissedAt === null || isIsoInstant(receipt.dismissedAt))) return false;

  if (receipt.state === "pending") return receipt.processedAt === null && receipt.dismissedAt === null;
  if (receipt.state === "visible") return receipt.processedAt !== null && receipt.dismissedAt === null;
  if (receipt.state === "dismissed") return receipt.processedAt !== null && receipt.dismissedAt !== null;
  return receipt.dismissedAt === null || receipt.processedAt !== null;
}

function parseDocument(serialized: string): DeliverySessionDocumentV1 | null {
  const value: unknown = JSON.parse(serialized);
  if (!value || typeof value !== "object" || !hasExactKeys(value, DOCUMENT_KEYS)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== VERSION || !Array.isArray(candidate.receipts) || !candidate.receipts.every(isReceipt)) return null;
  return freezeDocument(candidate.receipts);
}

function storageForAccess(dependencies: VisibleDeliveryStorage, key: string): Storage | null {
  try {
    const storage = dependencies.getStorage();
    const probeKey = `${key}:probe`;
    storage.setItem(probeKey, VERSION.toString());
    if (storage.getItem(probeKey) !== VERSION.toString()) return null;
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

function unavailable(): Readonly<{ status: "unavailable" }> {
  return Object.freeze({ status: "unavailable" });
}

export function buildVisibleDeliverySessionKey(scope: VisibleDeliveryScope): string {
  return `${KEY_PREFIX}${hash(`${scope.userId}${SEPARATOR}${scope.tripId}`)}`;
}

export function createPendingVisibleDeliveryReceipt(
  input: PendingVisibleDeliveryInput,
): DeliveryReceiptV1 | null {
  try {
    if (!isNonEmptyString(input.scope.userId)
      || !isNonEmptyString(input.scope.tripId)
      || !isNonEmptyString(input.actionId)
      || input.destination !== DESTINATION
      || input.references[0] !== "editorial_message"
      || !(input.references.length === 1
        || input.references.length === 2 && input.references[1] === "memory_candidate")
      || !isNonEmptyString(input.dedupeKey)
      || !PRIORITIES.has(input.priority)
      || !isIsoInstant(input.pendingAt)) return null;

    const expiresAt = input.expiryBoundaries
      .filter(isIsoInstant)
      .sort((left, right) => Date.parse(left) - Date.parse(right))[0];
    if (!expiresAt) return null;

    const identitySeed = [
      input.scope.userId, input.scope.tripId, input.actionId, input.destination, ...input.references,
    ].join(SEPARATOR);
    return freezeReceipt({
      version: VERSION,
      identity: `${IDENTITY_PREFIX}${hash(identitySeed)}`,
      state: "pending",
      destination: DESTINATION,
      dedupeKey: input.dedupeKey,
      priority: input.priority,
      pendingAt: input.pendingAt,
      processedAt: null,
      dismissedAt: null,
      expiresAt,
    });
  } catch {
    return null;
  }
}

export function transitionVisibleDeliveryReceipt(
  source: DeliveryReceiptV1,
  target: DeliveryReceiptState,
  at: string,
): TransitionResult {
  try {
    if (!isReceipt(source) || !STATES.has(target) || !isIsoInstant(at)) return unavailable();
    if (target !== "expired" && Date.parse(at) >= Date.parse(source.expiresAt)) {
      if (source.processedAt === null) return unavailable();
      return Object.freeze({
        status: "transitioned",
        receipt: freezeReceipt({ ...source, state: "expired" }),
      });
    }
    if (source.state === target) return Object.freeze({ status: "transitioned", receipt: freezeReceipt(source) });

    const legal = target === "expired"
      ? source.state !== "expired"
      : source.state === "pending" && target === "visible"
        || source.state === "visible" && target === "dismissed";
    if (!legal) return unavailable();

    const receipt = target === "visible"
      ? { ...source, state: target, processedAt: at }
      : target === "dismissed"
        ? { ...source, state: target, dismissedAt: at }
        : { ...source, state: target };
    return Object.freeze({ status: "transitioned", receipt: freezeReceipt(receipt as DeliveryReceiptV1) });
  } catch {
    return unavailable();
  }
}

export function writeVisibleDeliverySession(input: Readonly<{
  dependencies: VisibleDeliveryStorage;
  scope: VisibleDeliveryScope;
  document: DeliverySessionDocumentV1;
}>): WriteResult {
  const key = buildVisibleDeliverySessionKey(input.scope);
  const storage = storageForAccess(input.dependencies, key);
  if (!storage || !isReceiptDocument(input.document)) return unavailable();
  try {
    storage.setItem(key, JSON.stringify(input.document));
    return Object.freeze({ status: "available" });
  } catch {
    return unavailable();
  }
}

function isReceiptDocument(value: unknown): value is DeliverySessionDocumentV1 {
  if (!value || typeof value !== "object" || !hasExactKeys(value, DOCUMENT_KEYS)) return false;
  const document = value as DeliverySessionDocumentV1;
  return document.version === VERSION && Array.isArray(document.receipts) && document.receipts.every(isReceipt);
}

export function readVisibleDeliverySession(input: Readonly<{
  dependencies: VisibleDeliveryStorage;
  scope: VisibleDeliveryScope;
  now: string;
}>): ReadResult {
  if (!isIsoInstant(input.now)) return unavailable();
  const key = buildVisibleDeliverySessionKey(input.scope);
  const storage = storageForAccess(input.dependencies, key);
  if (!storage) return unavailable();

  try {
    const serialized = storage.getItem(key);
    if (serialized === null) return Object.freeze({ status: "available", document: freezeDocument([]) });
    let document: DeliverySessionDocumentV1 | null;
    try {
      document = parseDocument(serialized);
    } catch {
      document = null;
    }
    if (!document) {
      storage.removeItem(key);
      return unavailable();
    }

    let changed = false;
    const receipts = document.receipts.flatMap((receipt): DeliveryReceiptV1[] => {
      if (Date.parse(receipt.expiresAt) > Date.parse(input.now) || receipt.state === "expired") return [receipt];
      changed = true;
      if (receipt.state === "pending") return [];
      return [freezeReceipt({ ...receipt, state: "expired" })];
    });
    const current = changed ? freezeDocument(receipts) : document;
    if (changed) storage.setItem(key, JSON.stringify(current));
    return Object.freeze({ status: "available", document: current });
  } catch {
    return unavailable();
  }
}

function immutableSet(values: readonly string[]): ReadonlySet<string> {
  const internal = new Set(values);
  return Object.freeze({
    size: internal.size,
    has: internal.has.bind(internal),
    forEach: internal.forEach.bind(internal),
    entries: internal.entries.bind(internal),
    keys: internal.keys.bind(internal),
    values: internal.values.bind(internal),
    [Symbol.iterator]: internal[Symbol.iterator].bind(internal),
  });
}

export function toVisibleDeliveryCompanionSnapshot(
  document: DeliverySessionDocumentV1,
): VisibleDeliveryCompanionSnapshot {
  const visible = document.receipts.filter((receipt) => receipt.processedAt !== null);
  const keys = visible.map((receipt) => receipt.dedupeKey);
  const history = Object.freeze(visible.map((receipt) => Object.freeze({
    dedupeKey: receipt.dedupeKey,
    priority: receipt.priority,
    processedAt: receipt.processedAt as string,
  })));
  return Object.freeze({
    decisionProcessedKeys: immutableSet(keys),
    companionProcessedKeys: immutableSet(keys),
    history,
  });
}
