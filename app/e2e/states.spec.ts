import { expect, test } from "@playwright/test";

// Recorre cada estado de la galería dev-only en cada viewport y guarda un PNG en
// e2e/__shots__/<viewport>-<estado>.png. Sin backend: la galería renderiza los
// componentes presentacionales con props fijas. Las claves deben coincidir con
// GALLERY_STATES en src/features/dev/StatesGallery.tsx.
const STATES = [
  "checking",
  "login-email",
  "sending",
  "send-error",
  "login-code",
  "invalid-code",
  "trips-empty",
  "trips-list",
  "trip-home",
  "trip-home-chile",
  "feedback",
  "create-trip",
  "onboarding-name",
  "onboarding-country",
  "trip-arrival-step",
  "trip-arrival-date-open",
  "trip-arrival-time-open",
  "trip-departure-step",
  "trip-departure-step-error",
  "trip-style-step",
  "trip-summary",
  "story-beginning",
  "invite-unauthenticated",
  "invite-decision",
  "invite-wrong-email",
  "invite-expired",
] as const;

const SHOTS_DIR = "e2e/__shots__";

for (const state of STATES) {
  test(`acceso · ${state}`, async ({ page }, testInfo) => {
    // La apertura de marca Alaia (AlaiaOpening, feature aparte) se muestra en
    // toda visita "fresca" sin localStorage previo — incluida esta galería
    // dev-only. Se precarga el registro de "ya se mostró hoy" ANTES de
    // navegar para que el harness siga viendo cada estado directamente, sin
    // tocar el feature de apertura en sí (mismo storage key que usa AlaiaOpening).
    await page.addInitScript(() => {
      const now = new Date();
      const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      window.localStorage.setItem(
        "alaia:opening:lastShown:v1",
        JSON.stringify({ shownAt: now.getTime(), dayKey, variant: "opening" }),
      );
    });
    await page.goto(`/dev/states?state=${state}`, { waitUntil: "domcontentloaded" });
    // WebKit puede aislar localStorage del addInitScript en una navegación de
    // contexto nuevo. Si la apertura aparece igual, la cerramos por su control
    // público antes de validar la pantalla solicitada.
    const skipOpening = page.getByRole("button", { name: "Saltar apertura" });
    if (await skipOpening.isVisible()) {
      await skipOpening.click();
      await expect(page.getByRole("dialog", { name: "Apertura de marca Alaia" })).toBeHidden();
    }
    if (state === "trip-home" || state === "trip-home-chile") {
      const country = state === "trip-home" ? "Argentina" : "Chile";
      const flag = state === "trip-home" ? "🇦🇷" : "🇨🇱";
      await expect(page.getByRole("img", { name: country })).toHaveText(flag);
      await expect(page.getByText(state === "trip-home" ? "AR" : "CL", { exact: true })).toHaveCount(0);
    }
    if (state === "feedback") {
      await page.getByRole("combobox", { name: "Categoría" }).click();
      const panel = await page.getByRole("listbox").boundingBox();
      const message = await page.getByLabel("Mensaje").boundingBox();
      expect(panel).not.toBeNull();
      expect(message).not.toBeNull();
      expect((panel?.y ?? 0) + (panel?.height ?? 0)).toBeLessThanOrEqual((message?.y ?? 0) + 1);
    }
    if (state === "onboarding-country") {
      const panel = await page.getByRole("listbox").boundingBox();
      const next = await page.getByRole("button", { name: "Continuar →" }).boundingBox();
      expect(panel).not.toBeNull();
      expect(next).not.toBeNull();
      expect((panel?.y ?? 0) + (panel?.height ?? 0)).toBeLessThanOrEqual((next?.y ?? 0) + 1);
    }
    if (state.startsWith("trip-arrival") || state.startsWith("trip-departure")) {
      await expect(page.locator('input[type="date"], input[type="time"], input[type="datetime-local"]')).toHaveCount(0);
    }
    if (state === "trip-arrival-date-open" || state === "trip-arrival-time-open") {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
      const box = await dialog.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport?.height ?? 0);
      await expect(page.getByRole("button", { name: state.endsWith("date-open") ? "Elegir esta fecha" : "Usar esta hora" })).toBeVisible();
    }
    // Dejar asentar la entrada de Framer Motion (opacity vía WAAPI) antes de
    // capturar. No usamos `animations:"disabled"`: esa opción pelea con Motion y
    // puede capturar el bloque en opacity:0. Los halos/partículas infinitos son
    // decoración aria-hidden; una variación de frame entre corridas es esperable
    // en un harness pensado para inspección humana, no para pixel-diff estricto.
    await page.waitForTimeout(1300);
    await page.screenshot({
      path: `${SHOTS_DIR}/${testInfo.project.name}-${state}.png`,
    });
  });
}
