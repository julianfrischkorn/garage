// Offline-Modus: App-Dateien und Schriften werden zwischengespeichert.
// Bei jeder Änderung an den App-Dateien VERSION hochzählen, damit Handys die neue Fassung laden.
const VERSION = 'garage-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'sync.js', 'config.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Google-Anmeldung und Drive nie aus dem Zwischenspeicher
  if (url.hostname.endsWith('googleapis.com') && url.hostname !== 'fonts.googleapis.com') return;
  if (url.hostname === 'accounts.google.com') return;

  if (url.origin === location.origin) {
    // Netz zuerst, damit Updates sofort ankommen; ohne Netz die gespeicherte Fassung
    e.respondWith(fetch(e.request, {cache: 'no-cache'}).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r;
    })));
  }
});
