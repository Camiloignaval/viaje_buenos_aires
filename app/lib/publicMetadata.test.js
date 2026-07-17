import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../public/", import.meta.url);
const manifestPaths = [
  "icons/Web/site.webmanifest",
  "AppAssets_2026-07-09/Web/site.webmanifest",
];

test("los manifests públicos legados usan la identidad de Alaia y abren la raíz", async () => {
  for (const manifestPath of manifestPaths) {
    const rawManifest = await readFile(new URL(manifestPath, publicRoot), "utf8");
    const manifest = JSON.parse(rawManifest);

    assert.equal(manifest.id, "/", manifestPath);
    assert.equal(manifest.name, "Alaia — Historias de viaje", manifestPath);
    assert.equal(manifest.short_name, "Alaia", manifestPath);
    assert.equal(
      manifest.description,
      "Un compañero para vivir y recordar cada viaje.",
      manifestPath,
    );
    assert.equal(manifest.start_url, "/", manifestPath);
    assert.equal(manifest.scope, "/", manifestPath);
    assert.equal(manifest.lang, "es", manifestPath);
  }
});

test("el favicon público expone la identidad Alaia", async () => {
  const favicon = await readFile(new URL("favicon.svg", publicRoot), "utf8");

  assert.match(favicon, /aria-label="Alaia"/);
  assert.doesNotMatch(favicon, /Aurora/);
});
