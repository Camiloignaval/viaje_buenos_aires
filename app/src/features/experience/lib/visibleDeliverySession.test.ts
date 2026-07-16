import { describe, expect, it, vi } from "vitest";
import {
  buildVisibleDeliverySessionKey,
  createPendingVisibleDeliveryReceipt,
  readVisibleDeliverySession,
  toVisibleDeliveryCompanionSnapshot,
  transitionVisibleDeliveryReceipt,
  writeVisibleDeliverySession,
  type DeliveryReceiptV1,
  type DeliverySessionDocumentV1,
  type VisibleDeliveryStorage,
} from "./visibleDeliverySession";

const NOW = "2026-10-03T15:00:00.000Z";
const LATER = "2026-10-03T16:00:00.000Z";
const EXPIRES = "2026-10-04T15:00:00.000Z";
const SCOPE = Object.freeze({ userId: "user-a", tripId: "trip-a" });

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function dependencies(storage = new MemoryStorage()): VisibleDeliveryStorage {
  return Object.freeze({ getStorage: () => storage });
}

function pending(overrides: Partial<DeliveryReceiptV1> = {}): DeliveryReceiptV1 {
  const receipt = createPendingVisibleDeliveryReceipt({
    scope: SCOPE,
    actionId: "action-a",
    destination: "in_app",
    references: ["editorial_message", "memory_candidate"],
    dedupeKey: "safe-dedupe-a",
    priority: "high",
    pendingAt: NOW,
    expiryBoundaries: ["2026-10-05T15:00:00.000Z", EXPIRES, "not-a-date"],
  });
  if (!receipt) throw new Error("Expected valid receipt fixture");
  return Object.freeze({ ...receipt, ...overrides });
}

function transientPending() {
  return createPendingVisibleDeliveryReceipt({
    scope: SCOPE,
    actionId: "action-weather",
    destination: "in_app",
    references: ["editorial_message"],
    dedupeKey: "safe-weather-dedupe",
    priority: "normal",
    pendingAt: NOW,
    expiryBoundaries: [EXPIRES],
  });
}

function document(receipts: readonly DeliveryReceiptV1[] = [pending()]): DeliverySessionDocumentV1 {
  return Object.freeze({ version: 1, receipts: Object.freeze([...receipts]) });
}

describe("visible delivery session identity and allowlist", () => {
  it("builds stable FNV fixtures and isolates user plus trip scope", () => {
    expect(buildVisibleDeliverySessionKey(SCOPE)).toBe("alaia:visible-delivery:v1:cdb35b68");
    expect(buildVisibleDeliverySessionKey({ userId: "user-b", tripId: "trip-a" })).not.toBe(buildVisibleDeliverySessionKey(SCOPE));
    expect(buildVisibleDeliverySessionKey({ userId: "user-a", tripId: "trip-b" })).not.toBe(buildVisibleDeliverySessionKey(SCOPE));
    expect(pending().identity).toBe("vdr1_bf6d8315");
  });

  it("creates the exact frozen V1 record using the earliest valid boundary", () => {
    const receipt = pending();

    expect(receipt).toEqual({
      version: 1,
      identity: "vdr1_bf6d8315",
      state: "pending",
      destination: "in_app",
      dedupeKey: "safe-dedupe-a",
      priority: "high",
      pendingAt: NOW,
      processedAt: null,
      dismissedAt: null,
      expiresAt: EXPIRES,
    });
    expect(Object.keys(receipt)).toEqual([
      "version", "identity", "state", "destination", "dedupeKey", "priority",
      "pendingAt", "processedAt", "dismissedAt", "expiresAt",
    ]);
    expect(Object.isFrozen(receipt)).toBe(true);
  });

  it("accepts the exact editorial-only reference while preserving the V1 private receipt", () => {
    const receipt = transientPending();

    expect(receipt).toEqual({
      version: 1,
      identity: "vdr1_6efe294e",
      state: "pending",
      destination: "in_app",
      dedupeKey: "safe-weather-dedupe",
      priority: "normal",
      pendingAt: NOW,
      processedAt: null,
      dismissedAt: null,
      expiresAt: EXPIRES,
    });
    expect(JSON.stringify(receipt)).not.toMatch(/editorial|action-weather|user-a|trip-a/);
    expect(createPendingVisibleDeliveryReceipt({
      scope: SCOPE,
      actionId: "action-weather",
      destination: "in_app",
      references: [] as unknown as readonly ["editorial_message"],
      dedupeKey: "safe-weather-dedupe",
      priority: "normal",
      pendingAt: NOW,
      expiryBoundaries: [EXPIRES],
    })).toBeNull();
  });

  it("stores no raw scope, action, text, payload, PII or error fields", () => {
    const storage = new MemoryStorage();
    const result = writeVisibleDeliverySession({ dependencies: dependencies(storage), scope: SCOPE, document: document() });
    const serialized = storage.getItem(buildVisibleDeliverySessionKey(SCOPE)) ?? "";

    expect(result).toEqual({ status: "available" });
    expect(serialized).not.toMatch(/user-a|trip-a|action-a|editorial|message|payload|error|@/);
    expect(Object.keys(JSON.parse(serialized).receipts[0])).toEqual(Object.keys(pending()));
  });
});

describe("visible delivery session storage", () => {
  it("round-trips an immutable exact document after probing the namespace", () => {
    const storage = new MemoryStorage();
    expect(writeVisibleDeliverySession({ dependencies: dependencies(storage), scope: SCOPE, document: document() })).toEqual({ status: "available" });

    const result = readVisibleDeliverySession({ dependencies: dependencies(storage), scope: SCOPE, now: NOW });
    expect(result).toEqual({ status: "available", document: document() });
    if (result.status === "available") {
      expect(Object.isFrozen(result.document)).toBe(true);
      expect(Object.isFrozen(result.document.receipts)).toBe(true);
      expect(Object.isFrozen(result.document.receipts[0])).toBe(true);
    }
    expect([...storage.values.keys()]).toEqual([buildVisibleDeliverySessionKey(SCOPE)]);
  });

  it("accepts an exact allowlist regardless of JSON property order", () => {
    const storage = new MemoryStorage();
    const receipt = pending();
    const reorderedReceipt = {
      expiresAt: receipt.expiresAt,
      dismissedAt: receipt.dismissedAt,
      processedAt: receipt.processedAt,
      pendingAt: receipt.pendingAt,
      priority: receipt.priority,
      dedupeKey: receipt.dedupeKey,
      destination: receipt.destination,
      state: receipt.state,
      identity: receipt.identity,
      version: receipt.version,
    };
    storage.setItem(buildVisibleDeliverySessionKey(SCOPE), JSON.stringify({ receipts: [reorderedReceipt], version: 1 }));

    expect(readVisibleDeliverySession({ dependencies: dependencies(storage), scope: SCOPE, now: NOW })).toEqual({
      status: "available",
      document: document(),
    });
  });

  it.each([
    ["getter", () => ({ getStorage: () => { throw new Error("getter"); } })],
    ["get", () => ({ getStorage: () => Object.assign(new MemoryStorage(), { getItem: () => { throw new Error("get"); } }) })],
    ["set/quota", () => ({ getStorage: () => Object.assign(new MemoryStorage(), { setItem: () => { throw new DOMException("quota"); } }) })],
    ["remove", () => ({ getStorage: () => Object.assign(new MemoryStorage(), { removeItem: () => { throw new Error("remove"); } }) })],
  ])("fails closed when the Storage %s operation is hostile", (_name, make) => {
    expect(readVisibleDeliverySession({ dependencies: make() as VisibleDeliveryStorage, scope: SCOPE, now: NOW })).toEqual({ status: "unavailable" });
    expect(writeVisibleDeliverySession({ dependencies: make() as VisibleDeliveryStorage, scope: SCOPE, document: document() })).toEqual({ status: "unavailable" });
  });

  it.each([
    ["malformed JSON", "{"],
    ["unknown version", JSON.stringify({ version: 2, receipts: [] })],
    ["unknown document key", JSON.stringify({ version: 1, receipts: [], extra: true })],
    ["unknown receipt key", JSON.stringify({ version: 1, receipts: [{ ...pending(), rawUserId: "user-a" }] })],
  ])("rejects and safely cleans %s", (_name, stored) => {
    const storage = new MemoryStorage();
    storage.setItem(buildVisibleDeliverySessionKey(SCOPE), stored);

    expect(readVisibleDeliverySession({ dependencies: dependencies(storage), scope: SCOPE, now: NOW })).toEqual({ status: "unavailable" });
    expect(storage.getItem(buildVisibleDeliverySessionKey(SCOPE))).toBeNull();
  });

  it("lazily expires at access time without scheduling a timer", () => {
    const storage = new MemoryStorage();
    const timer = vi.spyOn(globalThis, "setTimeout");
    storage.setItem(buildVisibleDeliverySessionKey(SCOPE), JSON.stringify(document([
      pending({ identity: "vdr1_pending", expiresAt: NOW }),
      pending({ identity: "vdr1_visible", state: "visible", processedAt: "2026-10-03T14:00:00.000Z", expiresAt: NOW }),
    ])));

    const result = readVisibleDeliverySession({ dependencies: dependencies(storage), scope: SCOPE, now: NOW });
    expect(result).toEqual({
      status: "available",
      document: document([pending({ identity: "vdr1_visible", state: "expired", processedAt: "2026-10-03T14:00:00.000Z", expiresAt: NOW })]),
    });
    expect(timer).not.toHaveBeenCalled();
    timer.mockRestore();
  });
});

describe("visible delivery receipt lifecycle and Companion projection", () => {
  it("supports pending to visible to dismissed while preserving processedAt", () => {
    const visible = transitionVisibleDeliveryReceipt(pending(), "visible", LATER);
    const dismissed = visible.status === "transitioned"
      ? transitionVisibleDeliveryReceipt(visible.receipt, "dismissed", "2026-10-03T17:00:00.000Z")
      : visible;

    expect(visible).toEqual({ status: "transitioned", receipt: pending({ state: "visible", processedAt: LATER }) });
    expect(dismissed).toEqual({ status: "transitioned", receipt: pending({ state: "dismissed", processedAt: LATER, dismissedAt: "2026-10-03T17:00:00.000Z" }) });
  });

  it.each(["pending", "visible", "dismissed"] as const)("allows %s to expire", (state) => {
    const source = pending({
      state,
      processedAt: state === "pending" ? null : LATER,
      dismissedAt: state === "dismissed" ? "2026-10-03T17:00:00.000Z" : null,
    });
    const result = transitionVisibleDeliveryReceipt(source, "expired", EXPIRES);

    expect(result).toEqual({ status: "transitioned", receipt: pending({ ...source, state: "expired" }) });
  });

  it("makes repeated transitions idempotent and rejects illegal transitions fail closed", () => {
    const visible = pending({ state: "visible", processedAt: LATER });
    expect(transitionVisibleDeliveryReceipt(visible, "visible", LATER)).toEqual({ status: "transitioned", receipt: visible });
    expect(transitionVisibleDeliveryReceipt(pending(), "dismissed", LATER)).toEqual({ status: "unavailable" });
    expect(transitionVisibleDeliveryReceipt(visible, "pending", LATER)).toEqual({ status: "unavailable" });
    expect(transitionVisibleDeliveryReceipt(pending({ state: "expired" }), "visible", LATER)).toEqual({ status: "unavailable" });
  });

  it("evaluates expiry before a visible or dismissed transition", () => {
    const expiredPending = pending({ expiresAt: NOW });
    const expiredVisible = pending({ state: "visible", processedAt: "2026-10-03T14:00:00.000Z", expiresAt: NOW });

    expect(transitionVisibleDeliveryReceipt(expiredPending, "visible", NOW)).toEqual({ status: "unavailable" });
    expect(transitionVisibleDeliveryReceipt(expiredVisible, "dismissed", NOW)).toEqual({
      status: "transitioned",
      receipt: pending({ state: "expired", processedAt: "2026-10-03T14:00:00.000Z", expiresAt: NOW }),
    });
  });

  it("excludes pending but projects visible, dismissed and visible-expired into exact caller-owned evidence", () => {
    const input = document([
      pending(),
      pending({ identity: "vdr1_visible", state: "visible", dedupeKey: "visible-key", priority: "normal", processedAt: LATER }),
      pending({ identity: "vdr1_dismissed", state: "dismissed", dedupeKey: "dismissed-key", processedAt: LATER, dismissedAt: EXPIRES }),
      pending({ identity: "vdr1_expired", state: "expired", dedupeKey: "expired-key", priority: "low", processedAt: LATER }),
      pending({ identity: "vdr1_pending_expired", state: "expired", dedupeKey: "never-visible", processedAt: null }),
    ]);
    const snapshot = toVisibleDeliveryCompanionSnapshot(input);

    expect([...snapshot.decisionProcessedKeys]).toEqual(["visible-key", "dismissed-key", "expired-key"]);
    expect([...snapshot.companionProcessedKeys]).toEqual(["visible-key", "dismissed-key", "expired-key"]);
    expect(snapshot.history).toEqual([
      { dedupeKey: "visible-key", priority: "normal", processedAt: LATER },
      { dedupeKey: "dismissed-key", priority: "high", processedAt: LATER },
      { dedupeKey: "expired-key", priority: "low", processedAt: LATER },
    ]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.history)).toBe(true);
    expect(Object.isFrozen(snapshot.history[0])).toBe(true);
    expect("add" in snapshot.decisionProcessedKeys).toBe(false);
    expect(input.receipts[1].state).toBe("visible");
  });
});
