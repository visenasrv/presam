/* ============================================================================
   tenant.js — "Satu situs banyak klien" (template skill satu-situs-banyak-klien)

   Kode klien (mis. Kode Toko) → file registry (klien.json, terenkripsi)
   → alamat server klien + paket + status.  Satu frontend dipakai semua klien;
   data tiap klien tetap di server/Sheet masing-masing.

   Muat SETELAH tenant-config.js dan SEBELUM skrip aplikasi yang memakai URL server:
     <script src="tenant-config.js"></script>
     <script src="tenant.js" data-page="app"></script>      ← aplikasi utama (login)
     <script src="tenant.js" data-page="public"></script>   ← halaman publik (mis. toko online)
     <script src="tenant.js" data-page="kelola"></script>   ← halaman kelola (penjual)

   Hasil untuk data-page="app" (sinkron, 0 jaringan bila klien sudah pernah dipilih):
     window.TENANT_URL  alamat server klien aktif ('' bila belum pilih klien)
     window.TENANT_NS   awalan penyimpanan lokal per klien ('' = data lama sebelum fitur ini)
     window.Tenant      API (lihat bawah)

   Format registry:  { "format": 1, "toko": { "<id>": "<data terenkripsi>" } }
     id   = PBKDF2(kode) bagian 1 (tidak bisa dibalik ke kode)
     data = AES-GCM(JSON { u: url server, p: id paket, a: 1|0 aktif, n: nama, m: pesan nonaktif })
   ========================================================================== */
'use strict';
(function () {
  var C = window.TENANT_CONFIG || {};
  var APP = String(C.APP_ID || 'app').replace(/[^\w-]/g, '');
  var SALT = APP + '.kode.v1', ITER = 20000;
  var REG_URL = C.REGISTRY || 'klien.json';
  var PARAM = C.PARAM || 'k';
  var PAKET = C.PAKET || { lengkap: { label: 'Paket Lengkap', fitur: [] } };
  var PAKET_DEFAULT = C.PAKET_DEFAULT && PAKET[C.PAKET_DEFAULT] ? C.PAKET_DEFAULT : Object.keys(PAKET).pop();
  var K_CUR = APP + ':tenant', K_NS = APP + ':tns', K_PUB = APP + ':tpub:';
  var GAS_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[\w.-]+|macros)\/s\/[\w-]{20,}\/exec$/;
  var URL_RE = C.BACKEND === 'https' ? /^https:\/\/[^\s"'<>]+$/ : GAS_RE;
  var te = new TextEncoder(), td = new TextDecoder();
  var legacyUrl = C.LEGACY_URL && URL_RE.test(C.LEGACY_URL) ? C.LEGACY_URL : '';
  var me = document.currentScript, PAGE = (me && me.dataset.page) || 'app';

  var ls = {
    get: function (k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  /** "kedai budi" → "KEDAI-BUDI" (huruf besar, angka, "-"; 3–32 karakter). */
  function norm(k) { return String(k || '').trim().toUpperCase().replace(/[\s_.]+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 32); }
  function hex(u8) { return Array.prototype.map.call(u8, function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  function b64u(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function nsOf(url) { var h = 2166136261; for (var i = 0; i < url.length; i++) { h ^= url.charCodeAt(i); h = Math.imul(h, 16777619); } return 't' + (h >>> 0).toString(36) + ':'; }

  /* ------------------------------------------------------------ kriptografi */
  var _dk = {};
  async function derive(kode) {
    kode = norm(kode);
    if (_dk[kode]) return _dk[kode];
    if (!(window.crypto && crypto.subtle)) throw new Error('Browser ini belum mendukung fitur ini. Buka lewat alamat https:// di Chrome/Safari terbaru.');
    var base = await crypto.subtle.importKey('raw', te.encode(kode), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(SALT), iterations: ITER }, base, 384));
    var key = await crypto.subtle.importKey('raw', bits.slice(16, 48), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return (_dk[kode] = { id: hex(bits.slice(0, 16)), key: key });
  }
  async function seal(kode, info) {
    var d = await derive(kode), iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: te.encode(d.id) }, d.key, te.encode(JSON.stringify(info))));
    var all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12);
    return { id: d.id, blob: b64u(all) };
  }
  async function unseal(kode, blob) {
    var d = await derive(kode), all = unb64u(blob);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12), additionalData: te.encode(d.id) }, d.key, all.slice(12));
    return JSON.parse(td.decode(pt));
  }

  /* --------------------------------------------------------------- registry */
  async function registry() {
    var ctrl = new AbortController(), t = setTimeout(function () { ctrl.abort(); }, 12000);
    try {
      var res = await fetch(REG_URL + (REG_URL.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var j = await res.json();
      if (!j || typeof j.toko !== 'object' || !j.toko) throw new Error('format registry tidak dikenal');
      return j;
    } finally { clearTimeout(t); }
  }
  function toTenant(info, kode, id) {
    var url = String((info && info.u) || '').trim();
    if (!URL_RE.test(url)) return null;
    return {
      kode: norm(kode), id: id, url: url,
      paket: PAKET[info.p] ? info.p : PAKET_DEFAULT,
      aktif: !(info.a === 0 || info.a === false),
      nama: String(info.n || '').slice(0, 60), pesan: String(info.m || '').slice(0, 200), at: Date.now()
    };
  }
  /** Cari kode → { ok:true, t } | { ok:false, code: FORMAT|NET|NOTFOUND|BROKEN|CRYPTO, error } */
  async function resolve(kode) {
    kode = norm(kode);
    var L = C.LABEL || 'Kode';
    if (kode.length < 3) return { ok: false, code: 'FORMAT', error: L + ' minimal 3 huruf/angka.' };
    var reg;
    try { reg = await registry(); } catch (e) {
      return { ok: false, code: 'NET', error: navigator.onLine === false ? 'Perangkat sedang offline. Sambungkan internet untuk memeriksa ' + L + '.' : 'Daftar klien tidak bisa dimuat (' + e.message + '). Coba lagi sebentar.' };
    }
    var d; try { d = await derive(kode); } catch (e) { return { ok: false, code: 'CRYPTO', error: e.message }; }
    var blob = reg.toko[d.id];
    if (!blob) return { ok: false, code: 'NOTFOUND', error: L + ' "' + kode + '" tidak ditemukan. Periksa ejaannya atau hubungi admin.' };
    var info; try { info = await unseal(kode, blob); } catch (e) { return { ok: false, code: 'BROKEN', error: 'Data ' + L + ' ini rusak. Hubungi admin.' }; }
    var t = toTenant(info, kode, d.id);
    if (!t) return { ok: false, code: 'BROKEN', error: 'Alamat server klien ini tidak valid. Hubungi admin.' };
    return { ok: true, t: t };
  }

  /* ------------------------------------------------------------ state halaman */
  var params = new URLSearchParams(location.search);
  var qk = norm(params.get(PARAM) || '');
  var cur = ls.get(K_CUR);
  if (cur && !(cur.url && URL_RE.test(cur.url) && cur.kode)) cur = null;

  function nsFor(url, keep) {
    var map = ls.get(K_NS) || {};
    var ns = map[url];
    if (ns === undefined) ns = keep !== undefined ? keep : (legacyUrl && url === legacyUrl ? '' : nsOf(url));
    map[url] = ns; ls.set(K_NS, map);
    return ns;
  }
  function cleanUrl() {
    params.delete(PARAM);
    var q = params.toString();
    return location.pathname + (q ? '?' + q : '');
  }
  function fiturOf(t) { var p = t && PAKET[t.paket]; return (p && p.fitur) || []; }

  var T = {
    config: C, page: PAGE, norm: norm, resolve: resolve, registry: registry, seal: seal, unseal: unseal, derive: derive,
    URL_RE: URL_RE, PAKET: PAKET, PAKET_DEFAULT: PAKET_DEFAULT,
    current: cur, wantKode: '', need: false, blocked: false, publicTenant: null,
    /** true bila paket klien aktif berisi fitur ini (mis. Tenant.has('online')). */
    has: function (fitur) {
      var t = PAGE === 'public' ? T.publicTenant : T.current;
      if (!t) return false;
      if (t.legacy) return true;
      return fiturOf(t).indexOf(fitur) > -1;
    },
    get paketLabel() { var t = T.current; return t && PAKET[t.paket] ? PAKET[t.paket].label : ''; },
    /** Kunci penyimpanan lokal per klien:  localStorage.setItem(Tenant.key('cart'), ...) */
    key: function (k) { return APP + ':' + (window.TENANT_NS || '') + k; },
    /** Nama database IndexedDB per klien:  indexedDB.open(Tenant.dbName('appdb'), 1) */
    dbName: function (base) { var ns = window.TENANT_NS || ''; return base + (ns ? '-' + ns.replace(/[^\w]/g, '') : ''); },
    /** Simpan klien terpilih lalu muat ulang (tanpa ?k dan #hash). */
    choose: function (t) { t.ns = nsFor(t.url); ls.set(K_CUR, t); location.replace(cleanUrl()); },
    /** Lepas klien dari perangkat ini (data lokalnya tetap tersimpan terpisah). */
    forget: function () { ls.del(K_CUR); location.replace(cleanUrl()); },
    stay: function () { location.replace(cleanUrl()); },
    /** Cek ulang di latar. Paket/status/alamat berubah → { reload:true }. Gagal/tidak ketemu → tetap pakai salinan. */
    refresh: async function () {
      var c = T.current; if (!c) return null;
      var r = await resolve(c.kode);
      if (!r.ok) return r;
      var n = r.t, big = n.url !== c.url || n.paket !== c.paket || n.aktif !== c.aktif;
      if (big || n.nama !== c.nama || n.pesan !== c.pesan) {
        n.ns = c.url === n.url ? c.ns : nsFor(n.url, c.ns);
        ls.set(K_CUR, n); T.current = n;
      }
      return { ok: true, reload: big, t: n };
    },
    /** Tambahkan ?k=KODE ke tautan (link halaman publik, QR, bagikan). */
    withKode: function (url) {
      var c = PAGE === 'public' ? T.publicTenant : T.current;
      var u = new URL(url, location.href);
      if (c && !c.legacy) u.searchParams.set(PARAM, c.kode);
      return u.href;
    },
    /** Halaman publik: tentukan server dari ?k=. opts.fitur = fitur paket yang wajib ada.
        Salinan di perangkat → instan; cek ulang di latar → opts.onChange(baru, lama). */
    public: async function (opts) {
      opts = opts || {};
      function judge(t) {
        if (!t.aktif) return { ok: false, code: 'OFF', t: t, error: 'Layanan ini sedang tidak tersedia. Silakan hubungi pemiliknya secara langsung.' };
        if (opts.fitur && !t.legacy && fiturOf(t).indexOf(opts.fitur) < 0) return { ok: false, code: 'PAKET', t: t, error: 'Halaman ini belum diaktifkan oleh pemiliknya.' };
        return { ok: true, t: t };
      }
      if (!qk) {
        if (legacyUrl) { T.publicTenant = { url: legacyUrl, ns: '', paket: PAKET_DEFAULT, aktif: true, legacy: true }; return { ok: true, t: T.publicTenant }; }
        return { ok: false, code: 'NOKODE', error: 'Tautan ini tidak lengkap (kode tidak ada). Minta tautan atau QR terbaru dari pemiliknya.' };
      }
      var key = K_PUB + qk, cached = ls.get(key);
      var fresh = resolve(qk).then(function (r) {
        if (!r.ok) return r;
        r.t.ns = cached && cached.url === r.t.url ? cached.ns : nsOf(r.t.url);
        ls.set(key, r.t);
        return r;
      });
      if (cached && URL_RE.test(cached.url)) {
        T.publicTenant = cached;
        fresh.then(function (r) {
          if (!r.ok) return;
          T.publicTenant = r.t;
          if (opts.onChange && (r.t.url !== cached.url || r.t.paket !== cached.paket || r.t.aktif !== cached.aktif)) opts.onChange(r.t, cached, judge(r.t));
        }).catch(function () {});
        return judge(cached);
      }
      var r = await fresh;
      if (!r.ok) return r;
      T.publicTenant = r.t;
      return judge(r.t);
    }
  };

  if (PAGE === 'app') {
    if (cur && (!qk || qk === cur.kode)) {
      window.TENANT_URL = cur.url; window.TENANT_NS = cur.ns || '';
      T.blocked = !cur.aktif;
      if (qk) { try { history.replaceState(null, '', cleanUrl() + location.hash); } catch (e) {} }
    } else {
      T.need = true; T.wantKode = qk;
      window.TENANT_URL = ''; window.TENANT_NS = '__gate__:';      // belum pilih klien → jangan sentuh data mana pun
    }
  }
  window.Tenant = T;
})();
