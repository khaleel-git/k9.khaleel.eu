export async function onRequestGet(context) {
  const { env } = context;

  if (!env.k9_analytics) {
    return Response.json({ error: 'analytics not configured' }, { status: 503 });
  }

  // Fetch totals + last 30 days in parallel
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });

  const [viewsTotal, downloadsTotal, ...dailyValues] = await Promise.all([
    env.k9_analytics.get('views:total'),
    env.k9_analytics.get('downloads:total'),
    ...days.flatMap(day => [
      env.k9_analytics.get(`views:${day}`),
      env.k9_analytics.get(`downloads:${day}`),
    ]),
  ]);

  const daily = days.map((day, i) => ({
    date: day,
    views: parseInt(dailyValues[i * 2]) || 0,
    downloads: parseInt(dailyValues[i * 2 + 1]) || 0,
  })).reverse();

  return Response.json({
    totals: {
      views: parseInt(viewsTotal) || 0,
      downloads: parseInt(downloadsTotal) || 0,
    },
    daily,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
