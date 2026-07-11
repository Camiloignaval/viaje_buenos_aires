import { test } from "@playwright/test";

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
  "create-trip",
  "onboarding-name",
  "onboarding-country",
  "trip-arrival-step",
  "trip-departure-step",
  "trip-departure-step-error",
  "trip-style-step",
  "trip-summary",
  "story-beginning",
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
    await page.goto(`/dev/states?state=${state}`);
    await page.waitForLoadState("networkidle");
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
