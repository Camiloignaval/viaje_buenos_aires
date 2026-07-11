import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLoginFlow } from "../hooks/useLoginFlow";
import { EmailStep } from "./EmailStep";
import { CodeStep } from "./CodeStep";

// Orquesta la máquina de dos pasos (email → código). El estado del formulario
// vive local (useState); la red vive en useLoginFlow. Mensajes de error de red
// idénticos al viejo loginForm.js. El paso de email a código es un crossfade
// suave (Motion) que se anula con reduced-motion.
export function LoginForm() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { request, verify } = useLoginFlow();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");

  async function handleEmail(value: string) {
    setEmail(value);
    try {
      await request.mutateAsync(value);
      setStep("code");
    } catch {
      // request.isError alimenta el mensaje; no hay que hacer nada más acá.
    }
  }

  async function handleCode(code: string) {
    try {
      const result = await verify.mutateAsync({ email, code });
      navigate(result.user.onboardingCompleted ? "/trips" : "/onboarding", { replace: true });
    } catch {
      // verify.isError alimenta el mensaje.
    }
  }

  function useAnotherEmail() {
    request.reset();
    verify.reset();
    setStep("email");
  }

  return (
    <div className="aurora-entrance-content" data-step={step}>
      {/* El paso email→código es una página que se da vuelta: la vieja se
          desvanece (Motion) y la nueva se escribe sola (aurora-reveal por
          elemento). El wrapper sólo maneja la salida para no duplicar el fade. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
        >
          {step === "code" ? (
            <CodeStep
              email={email}
              submitting={verify.isPending}
              submitError={
                verify.isError ? "El código no es correcto. Intentá nuevamente." : null
              }
              onSubmit={handleCode}
              onUseAnotherEmail={useAnotherEmail}
            />
          ) : (
            <EmailStep
              defaultEmail={email}
              submitting={request.isPending}
              submitError={
                request.isError
                  ? "No pudimos enviar el código. Intentá nuevamente."
                  : null
              }
              onSubmit={handleEmail}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
