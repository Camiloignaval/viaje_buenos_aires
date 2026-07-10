import { Resend } from 'resend';

let client;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Aurora Email necesita RESEND_API_KEY configurado.');
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

// Sin EMAIL_FROM configurado, cae al sandbox de Resend (onboarding@resend.dev):
// es el único remitente que funciona sin verificar un dominio propio.
export function getEmailFrom() {
  return process.env.EMAIL_FROM ?? 'Aurora <onboarding@resend.dev>';
}
