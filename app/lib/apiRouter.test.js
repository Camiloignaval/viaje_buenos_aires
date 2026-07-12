import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createApiRouter,
  INTERNAL_API_PATH_QUERY,
  resolveApiRoute,
} from './apiRouter.js';

function createResponse() {
  return {
    body: undefined,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('resuelve rutas estáticas antes que rutas dinámicas', () => {
  const dynamicHandler = () => {};
  const staticHandler = () => {};
  const routes = [
    { path: '/api/stories/:storyId', handler: dynamicHandler },
    { path: '/api/stories/base', handler: staticHandler },
  ];

  const match = resolveApiRoute('/api/stories/base', routes);

  assert.equal(match.handler, staticHandler);
  assert.deepEqual(match.params, {});
});

test('resuelve rutas dinámicas e inyecta sus params sin perder query params', async () => {
  let delegatedRequest;
  const handler = async (req) => {
    delegatedRequest = req;
    return 'delegated';
  };
  const router = createApiRouter([{ path: '/api/trips/:tripId/media', handler }]);
  const req = {
    url: '/api/index?__api_path=trips/trip-123/media&view=grid',
    query: {
      [INTERNAL_API_PATH_QUERY]: 'trips/trip-123/media',
      tripId: 'query-must-not-win',
      view: 'grid',
    },
  };
  const res = createResponse();

  const result = await router(req, res);

  assert.equal(result, 'delegated');
  assert.equal(delegatedRequest, req);
  assert.deepEqual(req.query, { tripId: 'trip-123', view: 'grid' });
});

test('acepta trailing slash', async () => {
  let called = false;
  const router = createApiRouter([
    {
      path: '/api/health',
      handler: () => {
        called = true;
      },
    },
  ]);

  await router({ url: '/api/health/', query: {} }, createResponse());

  assert.equal(called, true);
});

test('responde 404 para rutas desconocidas', async () => {
  const router = createApiRouter([]);
  const res = createResponse();

  await router({ url: '/api/unknown', query: {} }, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'Ruta API no encontrada' });
});

test('delega usando las mismas instancias de req y res', async () => {
  const req = { url: '/api/version', query: { channel: 'stable' } };
  const res = createResponse();
  let received;
  const router = createApiRouter([
    {
      path: '/api/version',
      handler: (handlerReq, handlerRes) => {
        received = { req: handlerReq, res: handlerRes };
      },
    },
  ]);

  await router(req, res);

  assert.equal(received.req, req);
  assert.equal(received.res, res);
  assert.deepEqual(req.query, { channel: 'stable' });
});
