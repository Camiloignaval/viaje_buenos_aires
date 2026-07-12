export const INTERNAL_API_PATH_QUERY = '__api_path';

function normalizePathname(value) {
  const rawPath = String(value || '/');
  const pathname = new URL(rawPath, 'http://api.local').pathname;
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, '')
    : withLeadingSlash;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileRoute(route, index) {
  const path = normalizePathname(route.path);
  const parameterNames = [];
  const segments = path.split('/').filter(Boolean);
  const source = segments
    .map((segment) => {
      if (segment.startsWith(':')) {
        parameterNames.push(segment.slice(1));
        return '([^/]+)';
      }

      return escapeRegex(segment);
    })
    .join('/');

  return {
    ...route,
    index,
    parameterNames,
    parameterCount: parameterNames.length,
    matcher: new RegExp(`^/${source}$`),
  };
}

function compileRoutes(routes) {
  return routes
    .map(compileRoute)
    .sort((left, right) => left.parameterCount - right.parameterCount || left.index - right.index);
}

function matchCompiledRoute(pathname, compiledRoutes) {
  const normalizedPathname = normalizePathname(pathname);

  for (const route of compiledRoutes) {
    const match = route.matcher.exec(normalizedPathname);
    if (!match) continue;

    const params = Object.fromEntries(
      route.parameterNames.map((name, index) => [name, decodeURIComponent(match[index + 1])]),
    );

    return { handler: route.handler, params, path: route.path };
  }

  return null;
}

export function resolveApiRoute(pathname, routes) {
  return matchCompiledRoute(pathname, compileRoutes(routes));
}

function requestPathname(req) {
  const query = req.query || (req.query = {});
  const internalPath = query[INTERNAL_API_PATH_QUERY];
  delete query[INTERNAL_API_PATH_QUERY];

  if (internalPath !== undefined) {
    const value = Array.isArray(internalPath) ? internalPath[0] : internalPath;
    const path = String(value || '').replace(/^\/+/, '');
    return normalizePathname(`/api/${path}`);
  }

  return normalizePathname(req.url);
}

function sendNotFound(res) {
  const body = { error: 'Ruta API no encontrada' };

  if (typeof res.status === 'function') {
    return res.status(404).json(body);
  }

  res.statusCode = 404;
  res.setHeader?.('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

export function createApiRouter(routes) {
  const compiledRoutes = compileRoutes(routes);

  return async function apiRouter(req, res) {
    const match = matchCompiledRoute(requestPathname(req), compiledRoutes);
    if (!match) return sendNotFound(res);

    Object.assign(req.query, match.params);
    return match.handler(req, res);
  };
}
