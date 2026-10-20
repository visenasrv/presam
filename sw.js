/* =====================================================================
   Service worker Presensi Sambung (pola skill pwa-installable)
   • Tampilan (app shell) cache-first → terbuka instan & tetap jalan offline
   • API Google Apps Script & POST tidak pernah di-cache
   • klien.json (daftar Kode Kelompok) selalu diambil terbaru, cadangan saat offline
   • Naikkan VERSION setiap kali memperbarui berkas di GitHub → muncul
     banner "Versi baru tersedia" di HP pengguna
   ===================================================================== */
const VERSION = 'ps-v1.2.0';
const SPA = true;
const OFFLINE_PAGE = 'offline.html';
const REGISTRY = 'klien.json';
const RUNTIME = VERSION + '-rt';

const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'offline.html', 'pwa.js',
  'tenant-config.js', 'tenant.js', 'tenant-gate.js',
  'css/style.css',
  'js/config.js', 'js/icons.js', 'js/util.js', 'js/db.js', 'js/api.js', 'js/store.js', 'js/sync.js',
  'js/report.js', 'js/image.js', 'js/charts.js', 'js/app.js',
  'js/pages/beranda.js', 'js/pages/presensi.js', 'js/pages/absen.js', 'js/pages/detail.js',
  'js/pages/riwayat.js', 'js/pages/peserta.js', 'js/pages/lainnya.js', 'js/pages/dapukan.js',
  'lib/xlsx.mini.min.js',
  'fonts/pjs-400.woff2', 'fonts/pjs-500.woff2', 'fonts/pjs-600.woff2', 'fonts/pjs-700.woff2', 'fonts/pjs-800.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.svg'
];

const API_HOSTS = [/(^|\.)script\.google\.com$/, /(^|\.)script\.googleusercontent\.com$/, /(^|\.)googleapis\.com$/];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch((err) => console.warn('[SW] gagal cache', u, err))));
  })());
  // Tidak langsung aktif: pwa.js menampilkan banner "Versi baru tersedia" dulu.
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== RUNTIME && !k.endsWith('-reg')).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                                         // POST (API) tidak pernah di-cache
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;
  if (API_HOSTS.some((re) => re.test(url.hostname))) return;                 // API → langsung ke server
  if (url.origin !== self.location.origin) return;

  // Daftar Kode Kelompok → selalu terbaru (cadangan: salinan terakhir saat offline)
  if (url.pathname.endsWith('/' + REGISTRY)) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const cp = res.clone(); caches.open('ps-reg').then((c) => c.put(REGISTRY, cp)); }
      return res;
    }).catch(() => caches.open('ps-reg').then((c) => c.match(REGISTRY)).then((r) => r || Response.error())));
    return;
  }
  if (req.mode === 'navigate') { e.respondWith(handleNavigate(req, url)); return; }

  // Berkas aplikasi → cache dulu, jaringan bila belum ada
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') c.put(req, res.clone());
      return res;
    } catch (err) { return new Response('', { status: 504 }); }
  }));
});

/** index.html dari cache (instan, juga saat offline); halaman .html lain (kelola.html) dijawab berkasnya sendiri. */
async function handleNavigate(req, url) {
  const c = await caches.open(VERSION);
  let key = url.href.split(/[?#]/)[0].slice(self.registration.scope.length);
  if (key === '' || key.endsWith('/')) key += 'index.html';
  if (SPA && !/\.html?$/.test(key)) key = 'index.html';
  // index.html hanya diganti saat VERSION naik (semua berkas berganti bersamaan → tidak tercampur versi)
  const hit = await c.match(key);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic' && key === 'index.html') c.put(key, res.clone());
    return res;
  } catch (err) {
    return (await c.match(OFFLINE_PAGE)) || Response.error();
  }
}
