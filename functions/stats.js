// SHA-256 of the PIN — never store the plain PIN in source
const PIN_HASH = 'ff805620597e92258a4fdf2324268ecb9704a8d0600924efc10ff253eddeab01';
const COOKIE_NAME = 'k9_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return v;
  }
  return null;
}

function isAuthenticated(request) {
  return getCookie(request, COOKIE_NAME) === PIN_HASH;
}

export async function onRequestGet(context) {
  const { request } = context;
  if (!isAuthenticated(request)) return pinForm();
  return dashboardPage();
}

export async function onRequestPost(context) {
  const { request } = context;
  const body = await request.formData().catch(() => null);
  const pin = body?.get('pin') || '';
  const hash = await sha256(pin.trim());

  if (hash !== PIN_HASH) {
    return pinForm('Incorrect PIN. Try again.');
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/stats',
      'Set-Cookie': `${COOKIE_NAME}=${PIN_HASH}; Path=/stats; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`,
    },
  });
}

function pinForm(error = '') {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>K9 Analytics — Sign In</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #080f1e; color: #f0f6ff;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
    }
    .card {
      background: #0d1830; border: 1px solid rgba(77,184,255,.12);
      border-radius: 16px; padding: 40px; width: 100%; max-width: 360px; text-align: center;
    }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .sub { font-size: 13px; color: #94a3c0; margin-bottom: 28px; }
    input[type=password] {
      width: 100%; padding: 12px 16px; border-radius: 10px;
      background: #111e38; border: 1px solid rgba(77,184,255,.2);
      color: #f0f6ff; font-size: 20px; letter-spacing: 8px; text-align: center;
      outline: none; margin-bottom: 16px;
      transition: border-color .2s;
    }
    input[type=password]:focus { border-color: rgba(77,184,255,.5); }
    button {
      width: 100%; padding: 12px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #2196f3, #1565c0);
      color: #fff; font-size: 15px; font-weight: 600;
      transition: opacity .15s;
    }
    button:hover { opacity: .9; }
    .error { color: #f87171; font-size: 13px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Analytics Dashboard</h1>
    <p class="sub">K9 Web Protection</p>
    ${error ? `<p class="error">${error}</p>` : ''}
    <form method="POST" action="/stats">
      <input type="password" name="pin" placeholder="••••" maxlength="20" autofocus autocomplete="off" />
      <button type="submit">Unlock</button>
    </form>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: error ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function dashboardPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>K9 Analytics Dashboard</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:     #080f1e; --bg2: #0d1830; --bg3: #111e38;
      --accent: #4db8ff; --green: #22c55e; --red: #f87171;
      --text1:  #f0f6ff; --text2: #94a3c0; --text3: #5a6a85;
      --border: rgba(77,184,255,.12); --radius: 16px;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg); color: var(--text1); min-height: 100vh; padding: 40px 24px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; }
    header h1 { font-size: 22px; font-weight: 700; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .btn { background: var(--bg3); border: 1px solid var(--border); color: var(--text2);
      font-size: 12px; padding: 6px 14px; border-radius: 8px; cursor: pointer;
      transition: color .2s; text-decoration: none; }
    .btn:hover { color: var(--accent); }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px; margin-bottom: 40px; }
    .stat-card { background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px; }
    .stat-label { font-size: 12px; color: var(--text3); text-transform: uppercase;
      letter-spacing: .5px; margin-bottom: 8px; }
    .stat-value { font-size: 40px; font-weight: 800; color: var(--accent); }
    .stat-value.green { color: var(--green); }
    .section-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: var(--text2); }
    .chart-wrap { background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 24px; overflow-x: auto; margin-bottom: 20px; }
    .bars { display: flex; align-items: flex-end; gap: 4px; height: 140px; min-width: 600px; }
    .bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .bar-col { display: flex; gap: 2px; align-items: flex-end; height: 110px; }
    .bar { width: 10px; border-radius: 3px 3px 0 0; min-height: 2px; }
    .bar.views { background: var(--accent); opacity: .7; }
    .bar.downloads { background: var(--green); }
    .bar-date { font-size: 9px; color: var(--text3); writing-mode: vertical-rl;
      text-orientation: mixed; transform: rotate(180deg); margin-top: 6px; }
    .legend { display: flex; gap: 20px; margin-top: 16px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text2); }
    .legend-dot { width: 10px; height: 10px; border-radius: 2px; }
    .legend-dot.views { background: var(--accent); opacity: .7; }
    .legend-dot.downloads { background: var(--green); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; color: var(--text3); font-weight: 600;
      font-size: 11px; text-transform: uppercase; letter-spacing: .5px;
      padding: 0 12px 12px; border-bottom: 1px solid var(--border); }
    td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.04); color: var(--text2); }
    td:first-child { color: var(--text1); font-variant-numeric: tabular-nums; }
    td.num { font-variant-numeric: tabular-nums; color: var(--text1); }
    tr:hover td { background: rgba(77,184,255,.03); }
    tr:last-child td { border-bottom: none; }
    .loading { color: var(--text3); text-align: center; padding: 60px; }
    @media (max-width: 600px) { body { padding: 24px 16px; } .stat-value { font-size: 32px; } }
  </style>
</head>
<body>
<div class="container">
  <header>
    <h1>K9 Analytics</h1>
    <div class="header-actions">
      <button class="btn" onclick="load()">Refresh</button>
      <a class="btn" href="/">← Site</a>
    </div>
  </header>
  <div id="root"><p class="loading">Loading…</p></div>
</div>
<script>
async function load() {
  document.getElementById('root').innerHTML = '<p class="loading">Loading…</p>';
  try {
    const data = await fetch('/api/stats').then(r => r.json());
    render(data);
  } catch(e) {
    document.getElementById('root').innerHTML = '<p style="color:var(--red);text-align:center;padding:40px">Failed to load: ' + e.message + '</p>';
  }
}
function render({ totals, daily }) {
  const maxVal = Math.max(...daily.map(d => Math.max(d.views, d.downloads)), 1);
  const conv = totals.views > 0 ? ((totals.downloads / totals.views) * 100).toFixed(1) : '0.0';
  const bars = daily.map(d => \`
    <div class="bar-group">
      <div class="bar-col">
        <div class="bar views" style="height:\${Math.max(2,(d.views/maxVal)*110)}px" title="\${d.date}: \${d.views} views"></div>
        <div class="bar downloads" style="height:\${Math.max(d.downloads>0?2:0,(d.downloads/maxVal)*110)}px" title="\${d.date}: \${d.downloads} dl"></div>
      </div>
      <div class="bar-date">\${d.date.slice(5)}</div>
    </div>\`).join('');
  const rows = [...daily].reverse().filter(d => d.views > 0 || d.downloads > 0).map(d => \`
    <tr>
      <td>\${d.date}</td>
      <td class="num">\${d.views.toLocaleString()}</td>
      <td class="num">\${d.downloads.toLocaleString()}</td>
      <td class="num">\${d.views > 0 ? ((d.downloads/d.views)*100).toFixed(1)+'%' : '—'}</td>
    </tr>\`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:32px">No data yet — visit the site to start tracking.</td></tr>';
  document.getElementById('root').innerHTML = \`
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Total Page Views</div><div class="stat-value">\${totals.views.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Total Downloads</div><div class="stat-value green">\${totals.downloads.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Conversion Rate</div><div class="stat-value">\${conv}%</div></div>
    </div>
    <p class="section-title">Last 30 Days</p>
    <div class="chart-wrap">
      <div class="bars">\${bars}</div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot views"></div>Page Views</div>
        <div class="legend-item"><div class="legend-dot downloads"></div>Downloads</div>
      </div>
    </div>
    <div class="chart-wrap">
      <table>
        <thead><tr><th>Date</th><th>Views</th><th>Downloads</th><th>Conv. Rate</th></tr></thead>
        <tbody>\${rows}</tbody>
      </table>
    </div>\`;
}
load();
</script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
