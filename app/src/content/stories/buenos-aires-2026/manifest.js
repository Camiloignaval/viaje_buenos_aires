const MEDIA_BASE_PATH = "content/stories/buenos-aires-2026/media";

/**
 * Descriptor editorial de Buenos Aires 2026.
 *
 * `catalogId` identifica la entrada publicable; `storyPackageId` identifica el
 * contenido narrativo; ninguno reemplaza al `tripId` de una experiencia vivida.
 */
export const buenosAiresStoryManifest = Object.freeze({
  catalogId: "ba-2026",
  storyPackageId: "story-ba-2026",
  status: "published",
  source: "base",
  immutable: true,
  demo: true,
  packageUrl: new URL("./story.json", import.meta.url),
  selection: Object.freeze({
    title: "Buenos Aires, 2026",
    destination: "Buenos Aires",
    summary: "Historia privada del viaje de Camilo y Kari en julio de 2026.",
  }),
  compatibility: Object.freeze({
    requiresExplicitAssignment: true,
    personalized: true,
    destinationCountryCodes: Object.freeze(["AR"]),
    destinationCityNames: Object.freeze(["Buenos Aires"]),
    travelDates: Object.freeze({ start: "2026-07-18", end: "2026-07-21" }),
  }),
  media: Object.freeze({
    basePath: MEDIA_BASE_PATH,
    required: Object.freeze([
      `${MEDIA_BASE_PATH}/cover-hero.jpg`,
      `${MEDIA_BASE_PATH}/video_intro_2.mp4`,
      `${MEDIA_BASE_PATH}/dia1-hero.jpg`,
      `${MEDIA_BASE_PATH}/dia2-hero.jpg`,
      `${MEDIA_BASE_PATH}/dia3-hero.jpg`,
      `${MEDIA_BASE_PATH}/dia4-hero.jpg`,
      `${MEDIA_BASE_PATH}/hotel.jpg`,
      `${MEDIA_BASE_PATH}/dia1-cuartito.jpg`,
      `${MEDIA_BASE_PATH}/dia1-corrientes.jpg`,
      `${MEDIA_BASE_PATH}/dia1-cena.jpg`,
      `${MEDIA_BASE_PATH}/dia1-rapanui.jpg`,
      `${MEDIA_BASE_PATH}/dia2-floralis.jpg`,
      `${MEDIA_BASE_PATH}/dia2-cementerio.jpg`,
      `${MEDIA_BASE_PATH}/la-biela.jpg`,
      `${MEDIA_BASE_PATH}/dia2-almuerzo.jpg`,
      `${MEDIA_BASE_PATH}/dia2-rosedal.jpg`,
      `${MEDIA_BASE_PATH}/dia2-cafepalermo.jpg`,
      `${MEDIA_BASE_PATH}/dia2-puertomadero.jpg`,
      `${MEDIA_BASE_PATH}/dia2-cena.jpg`,
      `${MEDIA_BASE_PATH}/dia3-mercado.jpg`,
      `${MEDIA_BASE_PATH}/dia3-mafalda.jpg`,
      `${MEDIA_BASE_PATH}/dia3-dorrego.jpg`,
      `${MEDIA_BASE_PATH}/dia3-caminito.jpg`,
      `${MEDIA_BASE_PATH}/dia3-almuerzo.jpg`,
      `${MEDIA_BASE_PATH}/dia3-floreria.jpg`,
      `${MEDIA_BASE_PATH}/dia4-ateneo.jpg`,
      `${MEDIA_BASE_PATH}/dia4-almuerzo.jpg`,
    ]),
  }),
});

export default buenosAiresStoryManifest;
