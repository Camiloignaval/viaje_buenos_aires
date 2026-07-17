import { expect, test, type Page } from "@playwright/test";

const STORY_SCOPE = "story-ba-2026";
const CHAPTER_TITLES = [
  "Bienvenidos a Buenos Aires",
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
    window.localStorage.clear();
    window.sessionStorage.clear();
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
  await expect(page.getByRole("heading", { name: "Bienvenidos a Buenos Aires" })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Marcas que quedaron en esta página" }).first(),
  ).toBeVisible();

  const note = page.getByRole("textbox", { name: "Qué quieren recordar de este momento" }).first();
  const save = page.getByRole("button", { name: "Guardar el momento" }).first();
  await expect(page.getByLabel("Elegir fotos para este recuerdo").first()).toBeAttached();
  await expect(save).toBeDisabled();
  await note.fill("La primera caminata por Corrientes.");
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByText("La primera caminata por Corrientes.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar entre nuestros recuerdos favoritos" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Dejar aparte" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Abrir nuestros recuerdos" }).click();
  await expect(page.getByRole("heading", { name: "Nuestros recuerdos" })).toBeVisible();
  await expect(page.getByText("La primera caminata por Corrientes.")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await setStoryDate(page, "2026-07-22");
  await page.goto("/experience", { waitUntil: "domcontentloaded" });
  await dismissOpening(page);
  for (const chapterTitle of CHAPTER_TITLES) {
    await expect(page.getByRole("heading", { name: chapterTitle })).toBeVisible();
    await page.getByRole("button", { name: "Abrir este día" }).click();
    await page.getByRole("button", { name: "Dejar el día así" }).click();
    await page.getByRole("button", { name: "Sí, cerrar por hoy" }).click();
  }
  await expect(page.getByRole("heading", { name: "Feliz cumpleaños" })).toBeVisible();
  await expect(page.getByText("Reflexión final")).toBeVisible();
  await expect(page.getByLabel("Elegir fotos para este recuerdo").first()).toBeAttached();
  await expect(page.getByRole("button", { name: "Guardar el momento" }).first()).toBeDisabled();
  await expectNoHorizontalOverflow(page);
});
