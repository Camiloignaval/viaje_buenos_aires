import { useEffect, useState } from "react";
import { getPwaCapabilities } from "./capabilities";
import { deletePushSubscription, getPushPreferences, savePushPreferences, sendPushTest, subscribeForPush, type PushPreferences } from "./pushApi";

const initial: PushPreferences = { enabled: false, beforeTrip: true, duringTrip: true, afterTrip: true, futureMemories: false };

export function PushCompanion({ eligible }: { eligible: boolean }) {
  const capabilities = getPwaCapabilities();
  const [preferences, setPreferences] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (eligible) void getPushPreferences().then(({ preferences }) => setPreferences(preferences)).catch(() => undefined); }, [eligible]);
  if (!eligible || !capabilities.notifications || !capabilities.pushManager || !capabilities.serviceWorker) return null;
  const iosBrowser = capabilities.ios && !capabilities.standalone;
  async function enable() {
    if (iosBrowser || Notification.permission === "denied") return;
    setBusy(true); setMessage("");
    try {
      if (Notification.permission === "default" && await Notification.requestPermission() !== "granted") { setMessage("Puedes habilitarlo más adelante desde los ajustes de tu navegador."); return; }
      if (Notification.permission !== "granted") { setMessage("Puedes habilitarlo más adelante desde los ajustes de tu navegador."); return; }
      await subscribeForPush({ pushManager: true, notifications: true, standalone: capabilities.standalone });
      const next = { ...preferences, enabled: true };
      setPreferences((await savePushPreferences(next)).preferences); setMessage("Acompañamiento activado.");
    } catch { setMessage("No pudimos activar el acompañamiento ahora. Inténtalo más tarde."); }
    finally { setBusy(false); }
  }
  async function revoke() {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) { const json = subscription.toJSON(); await subscription.unsubscribe(); await deletePushSubscription(json); }
      const next = { ...preferences, enabled: false };
      setPreferences((await savePushPreferences(next)).preferences); setMessage("El acompañamiento quedó desactivado.");
    } catch { setMessage("No pudimos cambiar este ajuste ahora."); }
    finally { setBusy(false); }
  }
  async function test() { setBusy(true); setMessage(""); try { await sendPushTest(); setMessage("La prueba fue enviada a tus dispositivos activos."); } catch { setMessage("No pudimos enviar una prueba ahora."); } finally { setBusy(false); } }
  return <section className="personal-section pwa-companion" aria-labelledby="pwa-companion-title">
    <h2 id="pwa-companion-title" className="personal-section-title">Acompañamiento</h2>
    <p>Solo aparecerá cuando haya algo que valga la pena recordar.</p>
    {iosBrowser ? <p>Para activarlo en iPhone o iPad, instala Alaia y ábrela desde la pantalla de inicio.</p> : preferences.enabled ? <><div className="pwa-companion-actions"><button type="button" onClick={() => void test()} disabled={busy}>Enviar una prueba</button><button type="button" onClick={() => void revoke()} disabled={busy}>Desactivar</button></div><button type="button" className="pwa-companion-secondary" onClick={() => void savePushPreferences({ ...preferences, futureMemories: !preferences.futureMemories }).then(({ preferences }) => setPreferences(preferences))}>{preferences.futureMemories ? "No guardar recuerdos futuros" : "Permitir recuerdos futuros"}</button></> : <div className="pwa-companion-actions"><button type="button" onClick={() => void enable()} disabled={busy || Notification.permission === "denied"}>Permitir acompañamiento</button><button type="button" onClick={() => setMessage("Está bien. No volveremos a insistir.")}>Ahora no</button></div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
