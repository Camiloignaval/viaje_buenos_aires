function lazyHandler(load) {
  let handler;

  return async function loadAndHandle(req, res) {
    handler ||= (await load()).default;
    return handler(req, res);
  };
}

export const apiRoutes = Object.freeze([
  {
    path: '/api/alaia/photo-upload',
    handler: lazyHandler(() => import('../routes/alaia/photo-upload.js')),
  },
  { path: '/api/alaia/story', handler: lazyHandler(() => import('../routes/alaia/story.js')) },
  { path: '/api/alaia/sync', handler: lazyHandler(() => import('../routes/alaia/sync.js')) },
  { path: '/api/auth/logout', handler: lazyHandler(() => import('../routes/auth/logout.js')) },
  {
    path: '/api/auth/request-code',
    handler: lazyHandler(() => import('../routes/auth/request-code.js')),
  },
  { path: '/api/auth/session', handler: lazyHandler(() => import('../routes/auth/session.js')) },
  {
    path: '/api/auth/verify-code',
    handler: lazyHandler(() => import('../routes/auth/verify-code.js')),
  },
  {
    path: '/api/context/exchange-rates',
    handler: lazyHandler(() => import('../routes/context/exchange-rates.js')),
  },
  {
    path: '/api/context/weather',
    handler: lazyHandler(() => import('../routes/context/weather.js')),
  },
  { path: '/api/diagnose-env', handler: lazyHandler(() => import('../routes/diagnose-env.js')) },
  { path: '/api/feedback', handler: lazyHandler(() => import('../routes/feedback.js')) },
  { path: '/api/health', handler: lazyHandler(() => import('../routes/health.js')) },
  { path: '/api/push/public-key', handler: lazyHandler(() => import('../routes/push/public-key.js')) },
  { path: '/api/push/subscriptions', handler: lazyHandler(() => import('../routes/push/subscriptions.js')) },
  { path: '/api/push/test', handler: lazyHandler(() => import('../routes/push/test.js')) },
  { path: '/api/push/preferences', handler: lazyHandler(() => import('../routes/push/preferences.js')) },
  {
    path: '/api/invitations/:token',
    handler: lazyHandler(() => import('../routes/invitations/[token].js')),
  },
  {
    path: '/api/invitations/:token/accept',
    handler: lazyHandler(() => import('../routes/invitations/[token]/accept.js')),
  },
  {
    path: '/api/invitations/:token/decline',
    handler: lazyHandler(() => import('../routes/invitations/[token]/decline.js')),
  },
  {
    path: '/api/locations/accommodation',
    handler: lazyHandler(() => import('../routes/locations/accommodation.js')),
  },
  {
    path: '/api/locations/cities',
    handler: lazyHandler(() => import('../routes/locations/cities.js')),
  },
  { path: '/api/memories', handler: lazyHandler(() => import('../routes/memories.js')) },
  {
    path: '/api/memories/:id',
    handler: lazyHandler(() => import('../routes/memories/[id].js')),
  },
  { path: '/api/stories/base', handler: lazyHandler(() => import('../routes/stories/base.js')) },
  {
    path: '/api/stories/:storyId',
    handler: lazyHandler(() => import('../routes/stories/[storyId].js')),
  },
  { path: '/api/trips', handler: lazyHandler(() => import('../routes/trips.js')) },
  {
    path: '/api/trips/:tripId',
    handler: lazyHandler(() => import('../routes/trips/[tripId].js')),
  },
  {
    path: '/api/trips/:tripId/invitations',
    handler: lazyHandler(() => import('../routes/trips/[tripId]/invitations.js')),
  },
  {
    path: '/api/trips/:tripId/invitations/:invitationId/revoke',
    handler: lazyHandler(
      () => import('../routes/trips/[tripId]/invitations/[invitationId]/revoke.js'),
    ),
  },
  {
    path: '/api/trips/:tripId/media',
    handler: lazyHandler(() => import('../routes/trips/[tripId]/media.js')),
  },
  {
    path: '/api/trips/:tripId/media-upload',
    handler: lazyHandler(() => import('../routes/trips/[tripId]/media-upload.js')),
  },
  {
    path: '/api/trips/:tripId/sync',
    handler: lazyHandler(() => import('../routes/trips/[tripId]/sync.js')),
  },
  { path: '/api/upload', handler: lazyHandler(() => import('../routes/upload.js')) },
  {
    path: '/api/users/onboarding',
    handler: lazyHandler(() => import('../routes/users/onboarding.js')),
  },
  { path: '/api/version', handler: lazyHandler(() => import('../routes/version.js')) },
  {
    path: '/api/video-upload-signature',
    handler: lazyHandler(() => import('../routes/video-upload-signature.js')),
  },
]);
