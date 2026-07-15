import { platformRequest } from "@/services/platformClient";

export interface PushCapabilitiesPayload { pushManager: boolean; notifications: boolean; standalone: boolean; }
export interface PushPreferences { enabled: boolean; beforeTrip: boolean; duringTrip: boolean; afterTrip: boolean; futureMemories: boolean; }

function base64UrlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export const getPushPreferences = () => platformRequest<{ preferences: PushPreferences }>("/api/push/preferences");
export const savePushPreferences = (preferences: PushPreferences) => platformRequest<{ preferences: PushPreferences }>("/api/push/preferences", { method: "PUT", body: { preferences } });
export const savePushSubscription = (subscription: PushSubscriptionJSON, capabilities: PushCapabilitiesPayload) => platformRequest<{ active: boolean }>("/api/push/subscriptions", { method: "POST", body: { subscription, capabilities } });
export const deletePushSubscription = (subscription: PushSubscriptionJSON) => platformRequest<{ active: boolean }>("/api/push/subscriptions", { method: "DELETE", body: { subscription } });
export const sendPushTest = () => platformRequest<{ attempted: number; delivered: number }>("/api/push/test", { method: "POST" });

export async function subscribeForPush(capabilities: PushCapabilitiesPayload): Promise<PushSubscriptionJSON> {
  const key = await platformRequest<{ publicKey: string }>("/api/push/public-key");
  const registration = await navigator.serviceWorker.ready;
  const current = await registration.pushManager.getSubscription();
  const subscription = current ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(key.publicKey) });
  const json = subscription.toJSON();
  await savePushSubscription(json, capabilities);
  return json;
}
