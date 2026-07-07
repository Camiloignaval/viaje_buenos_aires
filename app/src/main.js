import "./style.css";
import {
  CHECKLIST_CATEGORIES,
  CHECKLIST_ITEMS,
  ALBUM_PHOTOS,
  VIDEO_MOMENTS,
  IMAGE_LIMITS,
} from "./data.js";
import { getMemories, upsertMemory, uploadImage, uploadVideo, isUsingBackend } from "./storage.js";
import { getUploadPassword, clearSavedPassword } from "./auth.js";

const app = document.querySelector("#app");

// Todos los ids que cuentan para el progreso global (checklist + fotos + videos)
const ALL_IDS = [
  ...CHECKLIST_ITEMS.map((i) => i.id),
  ...ALBUM_PHOTOS.map((p) => p.id),
  ...VIDEO_MOMENTS.map((v) => v.id),
];

let memories = {}; // { [id]: Memory } — se recarga en cada render()
let usingBackend = false; // se resuelve una vez al arrancar, ver refresh()

function checkIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`;
}

function computeProgress() {
  const total = ALL_IDS.length;
  const done = ALL_IDS.filter((id) => memories[id]?.completed).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function renderHeader() {
  const { done, total, pct } = computeProgress();
  return `
    <header class="app-header">
      <div class="app-header-inner">
        <div>
          <h1>🧳 Buenos Aires 2026</h1>
          <div class="tag">Camilo ❤ Kari — app del viaje ${usingBackend ? "" : "(modo local)"}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${pct}%"></div></div>
          <span class="progress-label">${done}/${total}</span>
        </div>
      </div>
    </header>
  `;
}

function renderChecklistSection(category) {
  const items = CHECKLIST_ITEMS.filter((i) => i.category === category.key);
  const done = items.filter((i) => memories[i.id]?.completed).length;
  return `
    <section class="section">
      <div class="section-title">
        <h2>${category.icon} ${category.label}</h2>
        <span class="count">${done}/${items.length}</span>
      </div>
      <div class="checklist-grid">
        ${items
          .map((item) => {
            const checked = !!memories[item.id]?.completed;
            return `
              <button type="button" class="check-row ${checked ? "checked" : ""}" data-toggle="${item.id}" data-title="${item.title}" data-category="${item.category}" aria-pressed="${checked}">
                <span class="box">${checkIcon()}</span>
                <span class="label">${item.title}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderAlbumSection() {
  return `
    <section class="section">
      <div class="section-title">
        <h2>📸 Las 10 fotos que no pueden faltar</h2>
        <span class="count">${ALBUM_PHOTOS.filter((p) => memories[p.id]?.completed).length}/${ALBUM_PHOTOS.length}</span>
      </div>
      <p class="section-subtitle">Marquen cada foto cuando la tomen, y si quieren, suban la real y dejen una nota del momento.</p>
      <div class="album-grid">
        ${ALBUM_PHOTOS.map(renderPhotoCard).join("")}
      </div>
    </section>
  `;
}

function renderPhotoCard(photo) {
  const mem = memories[photo.id] || {};
  const done = !!mem.completed;
  const note = mem.note || "";
  const image = mem.imageUrl || null;

  return `
    <article class="photo-card ${done ? "done" : ""}" data-photo="${photo.id}">
      <div class="photo-preview">
        ${
          image
            ? `<img src="${image}" alt="${photo.title}"><button type="button" class="remove-photo" data-remove-photo="${photo.id}" title="Quitar foto">✕</button>`
            : `<span>${photo.emoji}</span>`
        }
      </div>
      <div class="photo-body">
        <h3>${photo.emoji} ${photo.title}</h3>
        <p class="desc">${photo.description}</p>
        <div class="photo-meta">
          <div><b>Horario ideal:</b> ${photo.horario}</div>
          <div><b>Consejo:</b> ${photo.consejo}</div>
        </div>
        <textarea class="photo-note" placeholder="Nota del recuerdo..." data-note="${photo.id}">${note}</textarea>
        <div class="upload-error" data-error="${photo.id}" hidden></div>
        <div class="photo-actions">
          <button type="button" class="btn btn-primary ${done ? "is-done" : ""}" data-mark="${photo.id}">
            ${done ? "✓ Tomada" : "Marcar como tomada"}
          </button>
          <button type="button" class="btn" data-upload-trigger="${photo.id}">📷 Subir foto</button>
          <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" data-upload-input="${photo.id}" hidden>
        </div>
      </div>
    </article>
  `;
}

function renderVideoSection() {
  return `
    <section class="section">
      <div class="section-title">
        <h2>🎥 Los 10 videos que no pueden faltar</h2>
        <span class="count">${VIDEO_MOMENTS.filter((v) => memories[v.id]?.completed).length}/${VIDEO_MOMENTS.length}</span>
      </div>
      <p class="section-subtitle">Videos cortos (10-15 segundos) — en unos años van a valer más que cien fotos.</p>
      <div class="album-grid">
        ${VIDEO_MOMENTS.map(renderVideoCard).join("")}
      </div>
    </section>
  `;
}

function renderVideoCard(video) {
  const mem = memories[video.id] || {};
  const done = !!mem.completed;
  const url = mem.videoUrl || null;

  return `
    <article class="photo-card ${done ? "done" : ""}" data-video="${video.id}">
      <div class="photo-preview">
        ${
          url
            ? `<video src="${url}" controls playsinline></video><button type="button" class="remove-photo" data-remove-video="${video.id}" title="Quitar video">✕</button>`
            : `<span>${video.emoji}</span>`
        }
      </div>
      <div class="photo-body">
        <h3>${video.emoji} ${video.title}</h3>
        <div class="upload-error" data-video-error="${video.id}" hidden></div>
        <div class="photo-actions">
          <button type="button" class="btn btn-primary ${done ? "is-done" : ""}" data-mark-video="${video.id}">
            ${done ? "✓ Grabado" : "Marcar como grabado"}
          </button>
          <button type="button" class="btn" data-video-upload-trigger="${video.id}">🎬 Subir video</button>
          <input type="file" accept="video/*" data-video-upload-input="${video.id}" hidden>
        </div>
      </div>
    </article>
  `;
}

function render() {
  app.innerHTML = `
    ${renderHeader()}
    <main class="wrap">
      ${CHECKLIST_CATEGORIES.map(renderChecklistSection).join("")}
      ${renderAlbumSection()}
      ${renderVideoSection()}
      <footer class="app-footer">
        Buenos Aires 2026 · Camilo &amp; Kari — todo se guarda automáticamente en este navegador.
      </footer>
    </main>
  `;
  attachEvents();
}

function attachEvents() {
  // Checklist simple: toggle completed
  app.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.toggle;
      const current = !!memories[id]?.completed;
      await upsertMemory(id, {
        completed: !current,
        title: btn.dataset.title,
        category: btn.dataset.category,
      });
      await refresh();
    });
  });

  // Álbum: marcar como tomada
  app.querySelectorAll("[data-mark]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.mark;
      const photo = ALBUM_PHOTOS.find((p) => p.id === id);
      const current = !!memories[id]?.completed;
      await upsertMemory(id, {
        completed: !current,
        title: photo.title,
        category: "fotos",
        day: photo.day,
      });
      await refresh();
    });
  });

  // Álbum: nota del recuerdo (autosave con debounce)
  app.querySelectorAll("[data-note]").forEach((textarea) => {
    let timer = null;
    textarea.addEventListener("input", () => {
      clearTimeout(timer);
      const id = textarea.dataset.note;
      const value = textarea.value;
      timer = setTimeout(async () => {
        const photo = ALBUM_PHOTOS.find((p) => p.id === id);
        // No llamamos a refresh() acá a propósito: evita perder el foco
        // del textarea mientras la persona sigue escribiendo.
        memories[id] = await upsertMemory(id, { note: value, title: photo.title, category: "fotos", day: photo.day });
      }, 500);
    });
  });

  // Álbum: pedir contraseña antes de abrir el selector de archivo
  app.querySelectorAll("[data-upload-trigger]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.uploadTrigger;
      const password = await getUploadPassword();
      if (password === null) return; // canceló el modal
      app.querySelector(`[data-upload-input="${id}"]`).click();
    });
  });

  // Álbum: subir foto (ya con contraseña guardada de este mismo tab)
  app.querySelectorAll("[data-upload-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const id = input.dataset.uploadInput;
      const file = input.files[0];
      const errorEl = app.querySelector(`[data-error="${id}"]`);
      errorEl.hidden = true;
      if (!file) return;
      try {
        const photo = ALBUM_PHOTOS.find((p) => p.id === id);
        const password = await getUploadPassword();
        const { imageUrl, cloudinaryPublicId } = await uploadImage(file, password);
        await upsertMemory(id, { imageUrl, cloudinaryPublicId, title: photo.title, category: "fotos", day: photo.day });
        await refresh();
      } catch (err) {
        if (err.unauthorized) {
          clearSavedPassword();
          errorEl.textContent = "Contraseña incorrecta — probá de nuevo.";
        } else {
          errorEl.textContent = err.message;
        }
        errorEl.hidden = false;
      }
    });
  });

  // Álbum: quitar foto subida
  app.querySelectorAll("[data-remove-photo]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.removePhoto;
      await upsertMemory(id, { imageUrl: null, cloudinaryPublicId: null });
      await refresh();
    });
  });

  // Video: marcar como grabado
  app.querySelectorAll("[data-mark-video]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.markVideo;
      const video = VIDEO_MOMENTS.find((v) => v.id === id);
      const current = !!memories[id]?.completed;
      await upsertMemory(id, { completed: !current, title: video.title, category: "videos", day: video.day });
      await refresh();
    });
  });

  // Video: pedir contraseña antes de abrir el selector de archivo
  app.querySelectorAll("[data-video-upload-trigger]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.videoUploadTrigger;
      const password = await getUploadPassword();
      if (password === null) return;
      app.querySelector(`[data-video-upload-input="${id}"]`).click();
    });
  });

  // Video: subir
  app.querySelectorAll("[data-video-upload-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const id = input.dataset.videoUploadInput;
      const file = input.files[0];
      const errorEl = app.querySelector(`[data-video-error="${id}"]`);
      errorEl.hidden = true;
      if (!file) return;
      try {
        const video = VIDEO_MOMENTS.find((v) => v.id === id);
        const password = await getUploadPassword();
        errorEl.textContent = "Subiendo video...";
        errorEl.hidden = false;
        const { videoUrl, cloudinaryPublicId } = await uploadVideo(file, password);
        await upsertMemory(id, { videoUrl, cloudinaryPublicId, completed: true, title: video.title, category: "videos", day: video.day });
        errorEl.hidden = true;
        await refresh();
      } catch (err) {
        if (err.unauthorized) {
          clearSavedPassword();
          errorEl.textContent = "Contraseña incorrecta — probá de nuevo.";
        } else {
          errorEl.textContent = err.message;
        }
        errorEl.hidden = false;
      }
    });
  });

  // Video: quitar
  app.querySelectorAll("[data-remove-video]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.removeVideo;
      await upsertMemory(id, { videoUrl: null, cloudinaryPublicId: null });
      await refresh();
    });
  });
}

async function refresh() {
  usingBackend = await isUsingBackend();
  memories = await getMemories();
  render();
}

console.log(
  `%cLímite de imagen: ${IMAGE_LIMITS.maxSizeMB}MB — formatos: ${IMAGE_LIMITS.acceptedTypes.join(", ")}`,
  "color:#5a31f4"
);

refresh();
