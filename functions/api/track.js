export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.k9_analytics) {
    return new Response('ok', { status: 200 });
  }

  let event = 'unknown';
  try {
    const body = await request.json();
    event = body.event || 'unknown';
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  if (event === 'download') {
    await Promise.all([
      increment(env.k9_analytics, 'downloads:total'),
      increment(env.k9_analytics, `downloads:${today}`),
    ]);
  }

  return new Response('ok', {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' },
  });
}

async function increment(kv, key) {
  const cur = await kv.get(key);
  await kv.put(key, String((parseInt(cur) || 0) + 1));
}
