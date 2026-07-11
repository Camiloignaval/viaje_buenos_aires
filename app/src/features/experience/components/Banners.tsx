import { useExperienceCtx } from "./experienceContext";

// Espejo de renderInstallBanner + renderNotificationPrompt (Épica 4). Invitaciones
// quietas: nunca un modal, nunca bloquean nada.

export function InstallBanner() {
  const { installBanner, actions } = useExperienceCtx();
  if (!installBanner) {
    return null;
  }
  if (installBanner.platform === "ios") {
    return (
      <div className="install-banner">
        <button
          type="button"
          className="install-dismiss"
          aria-label="Más tarde"
          onClick={() => actions.dismissInstall()}
        >
          ×
        </button>
        <p>
          Para guardar Alaia en tu pantalla de inicio, toca <strong>Compartir</strong> y luego{" "}
          <strong>"Agregar a inicio"</strong>.
        </p>
      </div>
    );
  }
  return (
    <div className="install-banner">
      <button
        type="button"
        className="install-dismiss"
        aria-label="Más tarde"
        onClick={() => actions.dismissInstall()}
      >
        ×
      </button>
      <p>Alaia puede quedarse contigo, en tu pantalla de inicio.</p>
      <button type="button" onClick={() => actions.installApp()}>
        Dejarla en inicio
      </button>
    </div>
  );
}

export function NotificationPrompt() {
  const { pendingNotification, actions } = useExperienceCtx();
  if (!pendingNotification) {
    return null;
  }
  return (
    <div className="notification-prompt">
      <p>{pendingNotification.body} ¿Querés que Alaia te avise en momentos así?</p>
      <button type="button" onClick={() => actions.allowNotifications()}>
        Avisame
      </button>
      <button type="button" onClick={() => actions.dismissNotificationPrompt()}>
        Ahora no
      </button>
    </div>
  );
}

/** El par de banners, en el mismo orden que el vanilla (`${install}${notification}`). */
export function Banners() {
  return (
    <>
      <InstallBanner />
      <NotificationPrompt />
    </>
  );
}
