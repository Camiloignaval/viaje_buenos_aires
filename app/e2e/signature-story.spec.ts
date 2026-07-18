import { expect, test, type Page } from "@playwright/test";

const STORY_SCOPE = "story-ba-2026";
const CHAPTER_TITLES = [
  "Hoy nos vamos",
  "Buenos Aires se disfruta caminando",
  "El alma de Buenos Aires",
  "El último día siempre llega demasiado rápido",
] as const;

async function setStoryDate(page: Page, calendarDate: string) {
  await page.clock.setFixedTime(new Date(`${calendarDate}T12:00:00`));
}

async function dismissOpening(page: Page) {
  const skip = page.getByRole("button", { name: "Saltar apertura" });
  if (await skip.isVisible()) await skip.click();
}

async function expectNoHorizontalOverflow(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((scope) => {
    if (!window.localStorage.getItem("alaia:e2e:signature-initialized")) {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("alaia:e2e:signature-initialized", "1");
    }
    const now = new Date();
    const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    window.localStorage.setItem(
      "alaia:opening:lastShown:v1",
      JSON.stringify({ shownAt: now.getTime(), dayKey, variant: "opening" }),
    );
    window.sessionStorage.setItem(`alaia:intro-video-2-seen:${scope}`, "1");
  }, STORY_SCOPE);
});

test("Buenos Aires · portada, recuerdo, álbum y epílogo conservan el relato responsive", async ({ page }) => {
  await setStoryDate(page, "2026-07-17");
  await page.goto("/experience", { waitUntil: "domcontentloaded" });
  await dismissOpening(page);

  await expect(page.getByRole("heading", { name: "Capítulos" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Repetir intro" }).click();
  await expect(page.getByRole("heading", { name: "Buenos Aires, 2026" })).toBeVisible();
  await expect(page.getByLabel("Introducción de Alaia")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await setStoryDate(page, "2026-07-18");
  await page.goto("/experience", { waitUntil: "domcontentloaded" });
  await dismissOpening(page);
  await expect(page.getByRole("heading", { name: "Hoy nos vamos" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir este día" }).click();
  await expect(page.locator(".activity-page").first()).toBeVisible();

  await page.getByRole("button", { name: "Volver al índice" }).click();
  await expect(page.getByRole("heading", { name: "Capítulos" })).toBeVisible();
  await page.getByRole("button", { name: "← Volver al capítulo" }).click();
  await expect(page.locator(".activity-page").first()).toBeVisible();

  const emptyMemory = page.getByRole("button", { name: "Escribir un recuerdo de este momento" }).first();
  await emptyMemory.click();
  const note = page.getByRole("textbox", { name: "Escribir lo que quieren recordar de este momento" }).first();
  await expect(page.getByLabel("Elegir fotos para este recuerdo").first()).toBeAttached();
  await note.fill("La primera caminata por Corrientes.");

  await expect(page.getByText("La primera caminata por Corrientes.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Opciones del recuerdo" })).toBeVisible();
  await expect(page.locator(".memory-wax-seal")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dejar aparte" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Abrir nuestros recuerdos" }).click();
  await expect(page.getByRole("heading", { name: "Nuestros recuerdos" })).toBeVisible();
  await expect(page.getByText("La primera caminata por Corrientes.")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await setStoryDate(page, "2026-07-22");
  await page.goto("/experience", { waitUntil: "domcontentloaded" });
  await dismissOpening(page);
  await page.evaluate(({ scope, chapterIds }) => {
    window.localStorage.setItem(
      `alaia:progress:${scope}`,
      JSON.stringify(Object.fromEntries(chapterIds.map((chapterId) => [chapterId, "completed"]))),
    );
  }, { scope: STORY_SCOPE, chapterIds: CHAPTER_TITLES.map((_, index) => `chapter-${index + 1}`) });
  await page.reload({ waitUntil: "domcontentloaded" });
  await dismissOpening(page);
  await expect(page.getByRole("heading", { name: "Feliz cumpleaños" })).toBeVisible();
  await expect(page.getByText("Reflexión final")).toBeVisible();
  await expect(page.getByRole("button", { name: "Escribir un recuerdo de este momento" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
