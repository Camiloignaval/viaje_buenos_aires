import { Resend } from 'resend';
import { getPlatformConfig, requireConfigValue } from '../platformConfig.js';

let client;

export function isEmailConfigured() {
  const config = getPlatformConfig();
  return Boolean(config.email.resendApiKey && config.email.from);
}

export function getResendClient() {
  const config = getPlatformConfig();
  const apiKey = requireConfigValue(config.email.resendApiKey, 'RESEND_API_KEY');
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

export function getEmailFrom() {
  return requireConfigValue(getPlatformConfig().email.from, 'EMAIL_FROM');
}

export function getDefaultReplyTo() {
  return getPlatformConfig().email.replyTo || undefined;
}
