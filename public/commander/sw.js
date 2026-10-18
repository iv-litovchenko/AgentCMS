/* Service worker: макет работает офлайн и умеет показывать уведомления */
const V = 'jarvis-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'css/main.css', 'css/holo.css', 'css/dash.css',
  ...['01-core', '02-rich-answers', '03-dashboards-gestures-builder', '04-second-brain', '05-lab-1', '06-lab-2', '07-lab-3', '08-llm-brain', '09-gestures-2', '10-camera-ideas', '11-holo-hud', '12-shell', '13-thoughts', '14-holotable', '15-simulator', '16-rewind', '17-roadmap', '18-office', '19-integrations', '20-remote-pwa-xr'].map(f => `js/${f}.js`)];
const CDN = /^(https:\/\/(cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.(googleapis|gstatic)\.com|storage\.googleapis\.com))/;

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())) });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())) });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const same = new URL(r.url).origin === location.origin;
  if (!same && !CDN.test(r.url)) return; // API (Claude, погода, Spotify, HA) — всегда напрямую
  // свои файлы: сначала сеть (правки видны сразу), без сети — из кэша
  if (same) return e.respondWith(caches.open(V).then(c => fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res }).catch(() => c.match(r, { ignoreSearch: true }))));
  // CDN: stale-while-revalidate — сразу из кэша, в фоне обновляем
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r, { ignoreSearch: same });
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res }).catch(() => hit);
    return hit || net;
  }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then(ws => ws[0] ? ws[0].focus() : self.clients.openWindow('./'))) });
