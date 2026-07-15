import { Link } from "react-router-dom";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useSession } from "@/features/auth/hooks/useSession";
import { FeedbackSection } from "@/features/feedback/components/FeedbackSection";
import { isFeedbackUiEnabled } from "@/features/feedback/lib/feedbackFlag";
import { PwaInstallPrompt } from "@/features/pwa/PwaInstallPrompt";
import { PushCompanion } from "@/features/pwa/PushCompanion";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { personalEditorialMessage } from "../lib/personalMessage";

export default function PersonalPage() {
  const { user } = useSession();
  const logout = useLogout();
  const trips = useTrips();
  const list = trips.data?.trips ?? [];
  const message = personalEditorialMessage(list);
  const feedbackEnabled = isFeedbackUiEnabled();

  return (
    <div className="trips-page personal-page">
      <AlaiaParticles subtle />
      <main className="trips-page-content personal-page-content">
        <Link className="trips-secondary-nav alaia-reveal alaia-reveal-1" to="/trips">
          ← Mis viajes
        </Link>
        <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">Alaia</p>
        <h1 className="trips-title alaia-reveal alaia-reveal-2">Para ustedes</h1>
        <p className="personal-message alaia-reveal alaia-reveal-3">{message.text}</p>

        <div className="personal-sections alaia-reveal alaia-reveal-4">
          <PushCompanion eligible={list.length > 0} />
          <PwaInstallPrompt />
          {feedbackEnabled && <FeedbackSection />}
          <section className="personal-section personal-account" aria-labelledby="personal-account-title">
            <h2 id="personal-account-title" className="personal-section-title">Cuenta</h2>
            <p className="personal-email">{user?.email ?? ""}</p>
            <button type="button" className="trips-logout" onClick={() => logout.mutate()}>
              Cerrar sesión
            </button>
          </section>
        </div>
        <p className="personal-closing alaia-reveal alaia-reveal-5">Gracias por confiar sus historias a Alaia.</p>
      </main>
    </div>
  );
}
