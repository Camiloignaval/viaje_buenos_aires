import { Link } from "react-router-dom";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { FeedbackSection } from "../components/FeedbackSection";
import { isFeedbackUiEnabled } from "../lib/feedbackFlag";

export default function FeedbackPage() {
  const enabled = isFeedbackUiEnabled();

  return (
    <div className="trips-page">
      <AlaiaParticles subtle />
      <div className="trips-page-content feedback-page-content">
        <Link className="trips-secondary-nav alaia-reveal alaia-reveal-1" to="/trips">
          ← Volver a Mis viajes
        </Link>

        {enabled ? (
          <FeedbackSection />
        ) : (
          <section className="feedback-section alaia-reveal alaia-reveal-2" aria-labelledby="feedback-disabled-title">
            <p className="feedback-kicker">Alaia mejora con vos</p>
            <h1 id="feedback-disabled-title" className="feedback-title">
              Las sugerencias no están disponibles por ahora
            </h1>
            <p className="feedback-description">
              Este espacio está pausado temporalmente. Tus viajes siguen esperándote.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
