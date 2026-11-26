const CACHE = 'dopa-drill-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './fonts/dela-gothic-one.woff2',
  './fonts/zen-maru-gothic-black.woff2',
  './fonts/zen-maru-gothic-bold.woff2',
  './js/audio.js',
  './js/bg.js',
  './js/core.js',
  './js/dopakichi.js',
  './js/fx.js',
  './js/growth.js',
  './js/guide.js',
  './js/main.js',
  './js/problems.js',
  './js/quests.js',
  './js/ru.js',
  './js/scoring.js',
  './js/session.js',
  './js/skills.js',
  './js/store.js',
  './js/trophies.js',
  './js/unlocks.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});
