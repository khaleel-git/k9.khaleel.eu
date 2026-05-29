export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Only count GET requests for the root page (not API calls, assets, etc.)
  const isPageView = request.method === 'GET'
    && (url.pathname === '/' || url.pathname === '/index.html')
    && !request.headers.get('purpose') // skip prefetch
    && !request.headers.get('sec-purpose');

  if (isPageView && env.k9_analytics) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    context.waitUntil(
      Promise.all([
        increment(env.k9_analytics, 'views:total'),
        increment(env.k9_analytics, `views:${today}`),
      ])
    );
  }

  return next();
}

async function increment(kv, key) {
  const cur = await kv.get(key);
  await kv.put(key, String((parseInt(cur) || 0) + 1));
}
