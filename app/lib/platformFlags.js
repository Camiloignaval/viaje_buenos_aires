import { getPlatformConfig } from './platformConfig.js';

export const FEATURE_FLAGS = Object.freeze({
  FEEDBACK: 'ENABLE_FEEDBACK',
  TRANSACTIONAL_EMAILS: 'ENABLE_TRANSACTIONAL_EMAILS',
  NEW_USER_NOTIFICATIONS: 'ENABLE_NEW_USER_NOTIFICATIONS',
  FEEDBACK_NOTIFICATIONS: 'ENABLE_FEEDBACK_NOTIFICATIONS',
  SYSTEM_ALERTS: 'ENABLE_SYSTEM_ALERTS',
  TRIP_FAILURE_ALERTS: 'ENABLE_TRIP_FAILURE_ALERTS',
  AI_GENERATION: 'ENABLE_AI_GENERATION',
});

const FLAG_TO_CONFIG = Object.freeze({
  [FEATURE_FLAGS.FEEDBACK]: 'enableFeedback',
  [FEATURE_FLAGS.TRANSACTIONAL_EMAILS]: 'enableTransactionalEmails',
  [FEATURE_FLAGS.NEW_USER_NOTIFICATIONS]: 'enableNewUserNotifications',
  [FEATURE_FLAGS.FEEDBACK_NOTIFICATIONS]: 'enableFeedbackNotifications',
  [FEATURE_FLAGS.SYSTEM_ALERTS]: 'enableSystemAlerts',
  [FEATURE_FLAGS.TRIP_FAILURE_ALERTS]: 'enableTripFailureAlerts',
  [FEATURE_FLAGS.AI_GENERATION]: 'enableAiGeneration',
});

export function isFeatureEnabled(flag, { config = getPlatformConfig() } = {}) {
  const key = FLAG_TO_CONFIG[flag] ?? flag;
  return Boolean(config.flags?.[key]);
}

export function assertFeatureEnabled(flag, options = {}) {
  return isFeatureEnabled(flag, options);
}
