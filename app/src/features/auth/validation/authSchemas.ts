import { z } from "zod";

// Regex y mensajes portados TAL CUAL del viejo loginForm.js — la validación es
// parte de la identidad de Aurora y no debe cambiar. Nunca revela si el correo
// tiene cuenta o no.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const AUTH_CODE_LENGTH = 6;

export function normalizeEmailInput(value: unknown): string {
  return String(value ?? "").trim();
}

/** Solo dígitos, máximo 6 — un código pegado con espacios/guiones también entra. */
export function normalizeCodeInput(value: unknown): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, AUTH_CODE_LENGTH);
}

// superRefine (no .refine encadenado) para preservar la PRIORIDAD de mensajes
// del original: primero "obligatorio", luego "formato". Un refine por regla
// emitiría ambos a la vez.
export const emailSchema = z
  .string()
  .transform(normalizeEmailInput)
  .superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: "custom", message: "Ingresa tu correo." });
      return;
    }
    if (!EMAIL_PATTERN.test(value)) {
      ctx.addIssue({ code: "custom", message: "Ingresa un correo válido." });
    }
  });

export const codeSchema = z
  .string()
  .transform(normalizeCodeInput)
  .refine((value) => value.length === AUTH_CODE_LENGTH, {
    message: "Ingresa los 6 dígitos que te enviamos.",
  });

export const emailFormSchema = z.object({ email: emailSchema });
export const codeFormSchema = z.object({ code: codeSchema });

export type EmailFormValues = z.input<typeof emailFormSchema>;
export type CodeFormValues = z.input<typeof codeFormSchema>;
