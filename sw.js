/* =====================================================================
   Service worker Presensi Sambung — tampilan bisa dibuka tanpa internet.
   Naikkan VERSION setiap kali memperbarui berkas di GitHub agar HP
   mengambil versi terbaru (muncul tombol "Muat ulang" di aplikasi).
   ===================================================================== */
const VERSION = 'ps-v1.0.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css',
  'js/config.js', 'js/icons.js', 'js/util.js', 'js/db.js', 'js/api.js', 'js/store.js', 'js/sync.js',
  'js/report.js', 'js/image.js', 'js/charts.js', 'js/app.js',
  'js/pages/beranda.js', 'js/pages/presensi.js', 'js/pages/absen.js', 'js/pages/detail.js',
  'js/pages/riwayat.js', 'js/pages/peserta.js', 'js/pages/lainnya.js',
  'lib/xlsx.mini.min.js',
  'fonts/pjs-400.woff2', 'fonts/pjs-500.woff2', 'fonts/pjs-600.woff2', 'fonts/pjs-700.woff2', 'fonts/pjs-800.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // API Google & sumber luar: selalu lewat jaringan

  // Navigasi halaman → index.html dari cache (aplikasi tetap terbuka saat offline)
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match('index.html');
      if (cached) return cached;
      try { return await fetch(req); } catch (err) { return new Response('Offline', { status: 503 }); }
    })());
    return;
  }

  // Aset statis → cache dulu, jaringan bila belum ada
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      return new Response('', { status: 504 });
    }
  })());
});
