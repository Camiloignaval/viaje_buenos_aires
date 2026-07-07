// Modal simple para pedir una contraseña antes de subir una foto.
// La idea no es una seguridad robusta (es un viaje de dos personas, no un banco),
// sino evitar que alguien que consiga el link de la app suba cosas sin querer.
//
// La contraseña real se valida en el servidor (api/upload.js, contra la env var
// UPLOAD_PASSWORD) — acá solo la pedimos y la guardamos en sessionStorage para
// no tener que escribirla en cada foto durante la misma sesión del navegador.

const SESSION_KEY = "ba-upload-password";

export function getSavedPassword() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function clearSavedPassword() {
  sessionStorage.removeItem(SESSION_KEY);
}

function savePassword(value) {
  sessionStorage.setItem(SESSION_KEY, value);
}

/**
 * Devuelve la contraseña a usar para subir una foto.
 * Si ya hay una guardada en esta sesión, la devuelve directo.
 * Si no, muestra un modal y espera a que la persona la escriba (o cancele).
 * Devuelve `null` si cancela.
 */
export function getUploadPassword() {
  const saved = getSavedPassword();
  if (saved !== null) return Promise.resolve(saved);
  return promptForPassword();
}

function promptForPassword() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="pw-modal-title">
        <h3 id="pw-modal-title">🔒 Contraseña para subir</h3>
        <p class="modal-hint">Para subir fotos o videos del viaje hace falta la contraseña compartida.</p>
        <input type="password" class="modal-input" placeholder="Contraseña" autofocus>
        <div class="modal-actions">
          <button type="button" class="btn" data-modal-cancel>Cancelar</button>
          <button type="button" class="btn btn-primary" data-modal-confirm>Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector(".modal-input");
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector("[data-modal-cancel]").addEventListener("click", () => close(null));
    overlay.querySelector("[data-modal-confirm]").addEventListener("click", () => {
      const value = input.value.trim();
      if (!value) return;
      savePassword(value);
      close(value);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(null);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") overlay.querySelector("[data-modal-confirm]").click();
      if (e.key === "Escape") close(null);
    });

    input.focus();
  });
}
