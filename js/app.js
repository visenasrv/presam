/* =====================================================================
   app.js — kerangka aplikasi: router SPA (hash), header & navigasi bawah,
   layar masuk PIN, tema terang/gelap, service worker, siklus sesi.
   Halaman dibuat SEKALI lalu disembunyikan/ditampilkan (tidak dibuang),
   sehingga pindah menu instan dan posisi gulir tetap terjaga.
   ===================================================================== */
'use strict';

const Pages = {};

/* ---------- Komponen tampilan bersama ---------- */
const UI = {
  lvl(t, jenis) {
    if (jenis === MUSY) return '<span class="pill musy">' + ic('messages-square', 14) + 'Musyawaroh ' + esc(t) + '</span>';
    if (jenis === IBU) return '<span class="pill ibu">' + ic('users-round', 14) + 'Pengajian Ibu ' + esc(t) + '</span>';
    return '<span class="pill lvl-' + esc(t) + '">Sambung ' + esc(t) + '</span>';
  },
  jenisLabel(kg) { return (isMusy(kg) ? 'Musyawaroh ' : isIbu(kg) ? 'Pengajian Ibu-ibu ' : 'Sambung ') + kg.tingkat; },
  /** Tombol "Pasang aplikasi" — tampil hanya bila HP/browser bisa memasang (lihat pwa.js). */
  installBtn(cls) { return '<button type="button" class="' + (cls || 'btn btn-ghost btn-block') + '" data-pwa-install hidden>' + ic('smartphone', 18) + 'Pasang aplikasi di HP</button>'; },
  bindInstall(root) {
    if (!window.PWA) return;
    $$('[data-pwa-install]', root).forEach((b) => {
      b.hidden = !PWA.canInstall || PWA.isInstalled;
      if (!b._pwa) { b._pwa = true; b.addEventListener('click', (e) => { e.preventDefault(); PWA.install(); }); }
    });
  },
  status(kg) {
    const pend = Store.pendingKegiatan().has(kg.id);
    const stuck = pend && (navigator.onLine === false || Sync.state === 'error' || Sync.state === 'offline');
    if (stuck) return '<span class="pill warn">' + ic('cloud-off', 14) + 'Belum terkirim</span>';
    return kg.status === 'SELESAI' ? '<span class="pill ok">Selesai</span>' : '<span class="pill">Draft</span>';
  },
  jk(jk) { return jk === 'P' ? '<span class="pill sm female">Perempuan</span>' : '<span class="pill sm male">Laki-laki</span>'; },
  pill(id) { return '<button class="sync-pill js-pill" type="button" aria-label="Status sinkronisasi"' + (id ? ' id="' + id + '"' : '') + '></button>'; },
  focusHead(o) {
    return '<header class="topbar">' +
      '<button class="icon-btn plain back" data-back aria-label="Kembali">' + ic('arrow-left', 24) + '</button>' +
      '<div class="brand"><div class="topbar-title ellipsis">' + esc(o.title) + '</div>' + (o.sub ? '<div class="brand-sub ellipsis js-sub">' + esc(o.sub) + '</div>' : '') + '</div>' +
      (o.right || '') + '</header>';
  },
  progress(pct) {
    const c = pct >= 75 ? '' : pct >= 50 ? ' amber' : ' red';
    return '<div class="progress sm' + c + '"><span style="width:' + Math.min(100, Math.max(0, pct)).toFixed(1) + '%"></span></div>';
  },
  skeleton(n) {
    let s = '';
    for (let i = 0; i < (n || 3); i++) s += '<div class="card" style="margin-bottom:12px"><div class="sk" style="height:14px;width:40%"></div><div class="sk" style="height:20px;width:75%;margin-top:12px"></div><div class="sk" style="height:12px;width:55%;margin-top:12px"></div></div>';
    return s;
  }
};

/* ---------- Tema ---------- */
const Theme = {
  get() { return LS.getG('theme', 'system'); },
  isDark() {
    const t = this.get();
    return t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  },
  set(t) {
    LS.setG('theme', t);
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    this.meta();
    Bus.emit('theme');
  },
  toggle() { this.set(this.isDark() ? 'light' : 'dark'); },
  meta() {
    const dark = this.isDark();
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0B1210' : '#FFFFFF'));
    $$('.js-theme').forEach((b) => { b.innerHTML = ic(dark ? 'moon' : 'sun', 20); b.setAttribute('aria-label', dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'); });
  }
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (Theme.get() === 'system') { Theme.meta(); Bus.emit('theme'); } });

/* ---------- Warna aplikasi (diatur Penerobos Utama, berlaku untuk semua HP) ---------- */
const Tema = {
  DEFAULT: '#15803D',
  PRESETS: [['Hijau', '#15803D'], ['Tosca', '#0F766E'], ['Biru', '#1D4ED8'], ['Biru Tua', '#1E3A8A'], ['Ungu', '#6D28D9'],
            ['Marun', '#9F1239'], ['Merah', '#B91C1C'], ['Oranye', '#C2410C'], ['Cokelat', '#8B4513'], ['Abu Gelap', '#334155']],
  cur: null,
  valid(h) { return /^#[0-9A-Fa-f]{6}$/.test(String(h || '')); },
  hsl(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  },
  hex(h, s, l) {
    s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0');
    return ('#' + f(0) + f(8) + f(4)).toUpperCase();
  },
  lum(hex) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  },
  contrast(a, b) { const x = this.lum(a), y = this.lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); },
  /** Satu warna dasar → seluruh token warna mode terang & gelap. */
  css(base) {
    let [h, s, l] = this.hsl(base);
    const l0 = l;
    if (this.contrast(base, '#FFFFFF') < 4.5) while (l > 18 && this.contrast(this.hex(h, s, l), '#FFFFFF') < 4.5) l -= 2;   // teks putih tetap terbaca
    const P = l === l0 ? base.toUpperCase() : this.hex(h, s, l), gray = s < 25;
    const sd = gray ? Math.max(s, 12) : Math.min(80, Math.max(s, 55));
    let ld = 55;
    while (ld < 75 && this.contrast(this.hex(h, sd, ld), '#0B1210') < 6) ld += 2;
    const D = this.hex(h, sd, ld), st = gray ? s : Math.min(s, 70);
    const light = {
      '--primary': P, '--primary-hover': this.hex(h, s, Math.max(10, l - 7)), '--primary-soft': this.hex(h, st, 92), '--primary-tint': this.hex(h, st, 97),
      '--on-primary': '#FFFFFF', '--bg': this.hex(h, gray ? 10 : 14, 97),
      '--lvl-kelompok-bg': this.hex(h, st, 92), '--lvl-kelompok-fg': this.hex(h, s, Math.min(l, 26)),
      '--chart-male': P, '--chart-female': this.hex(h, st, 76), '--chart-line': P
    };
    const dark = {
      '--primary': D, '--primary-hover': this.hex(h, sd, ld - 8), '--primary-soft': this.hex(h, Math.round(sd * .6), 20), '--primary-tint': this.hex(h, gray ? 10 : 40, 10),
      '--on-primary': this.hex(h, sd, 10), '--bg': this.hex(h, gray ? 12 : 25, 6), '--surface': this.hex(h, gray ? 10 : 17, 9),
      '--surface-2': this.hex(h, gray ? 10 : 16, 13), '--surface-3': this.hex(h, gray ? 10 : 16, 16), '--border': this.hex(h, gray ? 10 : 15, 17),
      '--border-strong': this.hex(h, gray ? 10 : 14, 23), '--text': this.hex(h, gray ? 8 : 15, 92), '--text-2': this.hex(h, gray ? 8 : 12, 80),
      '--text-muted': this.hex(h, gray ? 6 : 8, 61), '--lvl-kelompok-bg': this.hex(h, Math.round(sd * .6), 20), '--lvl-kelompok-fg': this.hex(h, sd, 75),
      '--chart-male': D, '--chart-female': this.hex(h, Math.round(sd * .7), 30), '--chart-line': D
    };
    const decl = (o) => Object.keys(o).map((k) => k + ':' + o[k]).join(';');
    return ':root{' + decl(light) + '}' +
      '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){' + decl(dark) + '}}' +
      ':root[data-theme="dark"]{' + decl(dark) + '}';
  },
  /** Terapkan warna. Hijau bawaan = tanpa penimpaan (persis desain asli). */
  apply(hex) {
    hex = this.valid(hex) ? hex.toUpperCase() : '';
    if (hex === this.DEFAULT) hex = '';
    if (hex === this.cur) return;
    this.cur = hex;
    let el = document.getElementById('temaVars');
    if (!hex) { if (el) el.remove(); LS.del('temaCss'); return; }
    const css = this.css(hex);
    if (!el) { el = document.createElement('style'); el.id = 'temaVars'; document.head.appendChild(el); }
    el.textContent = css;
    LS.set('temaCss', css);
  }
};

/* ---------- Aplikasi ---------- */
const App = {
  route: null, els: {}, stack: [], scroll: {}, shell: false, pendingRender: false,

  async init() {
    // Satu situs banyak klien: belum memilih Kode Kelompok / kelompok dinonaktifkan → gerbang kode
    if (window.Tenant && (Tenant.need || Tenant.blocked)) { TenantGate.mount(); return; }
    if (window.TenantGate) TenantGate.watch();
    addEventListener('pwa:installable', () => UI.bindInstall(document));
    addEventListener('pwa:installed', () => { UI.bindInstall(document); Toast.show('Aplikasi terpasang di HP'); });
    Bus.on('auth-expired', () => this.sessionExpired());
    Bus.on('sync', () => this.renderPill());
    Bus.on('outbox', () => this.renderPill());
    Bus.on('data', (x) => this.onData(x));
    addEventListener('hashchange', () => this.onHash());
    addEventListener('online', () => this.renderPill());
    addEventListener('offline', () => this.renderPill());
    try { await DB.open(); } catch (e) { this.fatal(e.message); return; }
    if (!Store.loadSession()) { this.showLogin(); API.warmUp(); return; }
    await this.start();
  },

  async start(loaded) {
    this.mountShell();
    if (!loaded) await Store.load();
    Tema.apply(S.cfg.tema_warna);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if (!Store.hasData()) {
      this.view.innerHTML = UI.skeleton(4);
      const ok = await this.refreshAll(true);
      if (!ok) {
        this.view.innerHTML = emptyState('clipboard', 'Data belum bisa dimuat', 'Pastikan HP terhubung internet, lalu coba lagi.',
          '<button class="btn btn-primary" id="retryBoot">' + ic('refresh-cw', 18) + 'Coba lagi</button>');
        $('#retryBoot').onclick = () => { this.els = {}; this.start(); };
        return;
      }
      this.view.innerHTML = '';
    }
    this.onHash();
    Sync.run();
    Uploads.count().then(() => this.renderPill());
  },

  mountShell() {
    this.shell = true; this.els = {}; this.route = null; this.stack = [];
    const root = $('#app');
    root.innerHTML =
      '<div class="app-wrap">' +
        '<header class="topbar" id="mainTop">' +
          '<div class="brand"><div class="brand-title">Presensi Sambung</div><div class="brand-sub ellipsis" id="brandSub"></div></div>' +
          UI.pill() +
          '<button class="icon-btn theme js-theme" type="button"></button>' +
        '</header>' +
        '<main class="view" id="view"></main>' +
      '</div>' +
      '<nav class="bottomnav" id="bottomNav" aria-label="Navigasi utama"><div class="bottomnav-inner">' +
        [['beranda', 'house', 'Beranda'], ['peserta', 'users', 'Peserta'], ['presensi', 'clipboard-check', 'Presensi'], ['riwayat', 'history', 'Riwayat'], ['lainnya', 'menu', 'Lainnya']]
          .map((n) => {
            const center = n[0] === 'presensi';   // tombol utama: di tengah, lebih besar
            return '<a class="nav-item' + (center ? ' center' : '') + '" href="#/' + n[0] + '" data-nav="' + n[0] + '"><span class="nav-ic">' + ic(n[1], center ? 30 : 23, '', center ? 2 : 1.75) + '</span>' + n[2] + '</a>';
          }).join('') +
      '</div></nav>';
    this.view = $('#view');
    this.top = $('#mainTop');
    this.nav = $('#bottomNav');
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-back], .js-theme, .js-pill, [data-go]');
      if (!t) return;
      if (t.matches('[data-back]')) { e.preventDefault(); this.back(t.dataset.back || 'beranda'); }
      else if (t.matches('.js-theme')) Theme.toggle();
      else if (t.matches('.js-pill')) this.syncSheet();
      else if (t.matches('[data-go]')) { e.preventDefault(); location.hash = t.dataset.go; }
    });
    Theme.meta();
    this.renderBrand();
    this.renderPill();
  },

  renderBrand() {
    const k = S.cfg.nama_kelompok || LS.get('kelompok', '');
    if (k) LS.set('kelompok', k);
    const el = $('#brandSub'); if (el) el.textContent = k ? 'Kelompok ' + k : '';
  },

  renderPill() {
    const p = Sync.pill();
    $$('.js-pill').forEach((el) => {
      el.className = 'sync-pill js-pill ' + p.cls;
      el.innerHTML = (p.icon === 'spin' ? ic('refresh-cw', 14, 'spin', 2.2) : '<span class="dot"></span>') + '<span class="ellipsis">' + esc(p.text) + '</span>';
    });
    const badge = S.outbox.size + Uploads.pending;
    const nb = $('[data-nav="presensi"]');
    if (nb) {
      let b = nb.querySelector('.nav-badge');
      if (badge && navigator.onLine === false) { if (!b) { b = document.createElement('span'); b.className = 'nav-badge'; nb.appendChild(b); } b.textContent = badge > 99 ? '99+' : badge; }
      else if (b) b.remove();
    }
  },

  syncSheet() {
    const n = S.outbox.size, f = Uploads.pending;
    const off = navigator.onLine === false;
    Sheet.open({
      title: 'Sinkronisasi',
      html:
        '<div class="list-row"><div class="row-main"><div class="row-title">' + (off ? 'Sedang offline' : Sync.state === 'error' ? 'Gagal menghubungi server' : 'Terhubung') + '</div>' +
        '<div class="row-sub">Terakhir sinkron: ' + esc(Fmt.ago(S.lastSyncAt)) + '</div>' + (Sync.state === 'error' && Sync.err ? '<div class="error-text">' + esc(Sync.err) + '</div>' : '') + '</div></div>' +
        '<div class="list-row"><div class="row-main"><div class="row-title">Perubahan belum terkirim</div><div class="row-sub">Tersimpan aman di HP ini</div></div><div class="pct-big">' + n + '</div></div>' +
        (f ? '<div class="list-row"><div class="row-main"><div class="row-title">Foto menunggu diunggah</div></div><div class="pct-big">' + f + '</div></div>' : '') +
        '<p class="help" style="margin:6px 0 16px">' + (off ? 'Semua presensi tetap tersimpan di HP dan dikirim otomatis saat internet tersambung.' : 'Data dikirim otomatis setiap ada perubahan dan diperiksa ulang tiap 30 detik.') + '</p>' +
        '<button class="btn btn-secondary btn-block" data-now ' + (off ? 'disabled' : '') + '>' + ic('refresh-cw', 18) + 'Sinkronkan Sekarang</button>',
      onMount(el, s) { el.querySelector('[data-now]').onclick = async () => { s.close(); await Sync.run(); Toast.show(Sync.state === 'ok' ? 'Data tersinkron' : (Sync.err || 'Belum bisa sinkron'), Sync.state === 'ok' ? 'ok' : 'warn'); }; }
    });
  },

  /* ---------- Router ---------- */
  onHash() {
    if (!S.token || !this.shell) return;
    const raw = location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    let name = parts[0] || 'beranda';
    let def = Pages[name];
    if (!def) { name = 'beranda'; def = Pages.beranda; }
    if (def.utama && !Store.isUtama()) { location.replace('#/beranda'); return; }
    if (!raw) { history.replaceState(null, '', '#/beranda'); }
    Sheet.closeAll();
    $$('.viewer').forEach((v) => v.remove());

    const key = '#/' + parts.join('/');
    if (this.replacing) { this.replacing = false; this.stack.pop(); }
    const back = this.stack.length > 1 && this.stack[this.stack.length - 2] === key;
    if (back) this.stack.pop();
    else if (this.stack[this.stack.length - 1] !== key) this.stack.push(key);
    if (this.stack.length > 30) this.stack.shift();

    if (this.route) {
      this.scroll[this.route.key] = window.scrollY;
      if (this.route.def.hide) this.route.def.hide(this.route.el);
      this.route.el.hidden = true;
    }
    let el = this.els[name];
    if (!el) {
      el = document.createElement('section');
      el.dataset.page = name;
      this.view.appendChild(el);
      if (def.mount) def.mount(el);
      this.els[name] = el;
    }
    el.hidden = false;
    el.classList.remove('page'); void el.offsetWidth; el.classList.add('page');
    this.route = { name, params: parts.slice(1), def, el, key };
    this.setChrome(def, name);
    def.show(el, parts.slice(1));
    window.scrollTo(0, back ? this.scroll[key] || 0 : 0);
    this.renderPill();
  },

  setChrome(def, name) {
    const focus = !!def.focus;
    this.top.hidden = focus;
    this.nav.hidden = focus;
    this.view.classList.toggle('focus', focus);
    $$('.nav-item', this.nav).forEach((a) => a.classList.toggle('active', a.dataset.nav === (def.nav || name)));
  },

  back(fallback) {
    if (this.stack.length > 1) history.back();
    else this.replace('#/' + (fallback || 'beranda'));
  },

  /** Ganti halaman tanpa menambah riwayat (mis. dari form ke layar absen). */
  replace(hash) {
    this.replacing = true;
    location.replace(hash);
  },

  onData(x) {
    Tema.apply(S.cfg.tema_warna);
    if (x && x.remote) this.renderBrand();
    if (this.pendingRender) return;
    this.pendingRender = true;
    requestAnimationFrame(() => {
      this.pendingRender = false;
      const r = this.route;
      if (r && r.def.onData) r.def.onData(r.el, x || {});
      this.renderPill();
    });
  },

  /** Ambil ulang semua data dari server (antrian lokal dikirim lebih dulu). */
  async refreshAll(silent) {
    if (S.outbox.size) await Sync.run();
    const r = await api('bootstrap', {}, { timeout: 45000 });
    if (r.ok) {
      await Store.applyBoot(r.data);
      S.lastSyncAt = Date.now(); Store.saveMeta();
      if (!silent) Toast.show('Data terbaru dimuat dari server');
      return true;
    }
    if (!silent || r.code !== 'AUTH') Toast.show(r.error || 'Gagal memuat data.', 'err');
    return false;
  },

  /* ---------- Masuk / keluar ---------- */
  showLogin(msg) {
    this.shell = false;
    const root = $('#app');
    const kel = LS.get('kelompok', '');
    root.innerHTML =
      '<div class="login">' +
        '<div class="login-inner">' +
          '<div class="logo-tile">' + ic('clipboard-check', 42, '', 1.9) + '</div>' +
          '<h1>Presensi Sambung</h1>' +
          '<p class="sub">' + (kel ? 'Kelompok ' + esc(kel) : 'Masuk dengan PIN Penerobos') + '</p>' +
          (window.TenantGate ? TenantGate.loginLine() : '') +
          '<div class="pin-label">MASUKKAN PIN</div>' +
          '<div class="pin-dots" id="pinDots" aria-live="polite"></div>' +
          '<div class="pin-msg" id="pinMsg">' + (msg ? '<span class="err">' + ic('circle-alert', 18) + esc(msg) + '</span>' : '') + '</div>' +
          '<div class="keypad" id="keypad">' +
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
              k === '' ? '<span class="key blank"></span>' :
              k === 'del' ? '<button class="key fn" data-k="del" aria-label="Hapus">' + ic('delete', 28) + '</button>' :
              '<button class="key" data-k="' + k + '">' + k + '</button>').join('') +
          '</div>' +
          '<div style="flex:1;min-height:24px"></div>' +
          '<button class="btn btn-primary btn-block btn-lg" id="btnMasuk" disabled>Masuk ' + ic('arrow-right', 20) + '</button>' +
          '<div class="login-foot">' + ic('wifi', 16) + 'Login pertama memerlukan internet</div>' +
        '</div>' +
        UI.installBtn('login-install') +
      '</div>';
    if (window.TenantGate) TenantGate.bindLoginLine(root, { pending: async () => (await DB.getAll('outbox')).length });
    UI.bindInstall(root);
    let pin = '';
    const dots = $('#pinDots'), btn = $('#btnMasuk'), msgEl = $('#pinMsg');
    const draw = () => {
      const n = Math.max(6, pin.length);
      let h = ''; for (let i = 0; i < n; i++) h += '<i class="' + (i < pin.length ? 'on' : '') + '"></i>';
      dots.innerHTML = h;
      btn.disabled = pin.length < 4;
    };
    const press = (k) => {
      if (btn.dataset.busy) return;
      if (k === 'del') pin = pin.slice(0, -1);
      else if (pin.length < 8) pin += k;
      haptic(6); draw();
    };
    const submit = async () => {
      if (pin.length < 4 || btn.dataset.busy) return;
      if (!API.configured()) { msgEl.innerHTML = '<span class="err">' + ic('circle-alert', 18) + 'Kode Kelompok belum dipilih. Muat ulang aplikasi.</span>'; return; }
      if (navigator.onLine === false) { msgEl.innerHTML = '<span class="err">' + ic('wifi-off', 18) + 'Tidak ada internet. Login pertama butuh koneksi.</span>'; return; }
      btn.dataset.busy = '1';
      btn.innerHTML = ic('refresh-cw', 20, 'spin') + 'Memeriksa…';
      const r = await api('auth.login', { pin, device: deviceId() }, { tries: 2, timeout: 30000 });
      if (r.ok) {
        btn.innerHTML = ic('check', 20) + 'Memuat data…';
        Store.setSession(r.data);
        await Store.load();
        await Store.applyBoot(r.data.boot);
        S.lastSyncAt = Date.now(); Store.saveMeta();
        LS.set('kelompok', S.cfg.nama_kelompok || '');
        if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/beranda');
        await this.start(true);
        Toast.show('Selamat datang, ' + S.me.nama);
        return;
      }
      delete btn.dataset.busy;
      btn.innerHTML = 'Masuk ' + ic('arrow-right', 20);
      pin = ''; draw();
      dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
      haptic([30, 40, 30]);
      msgEl.innerHTML = '<span class="err">' + ic(r.network ? 'wifi-off' : 'circle-alert', 18) + esc(r.error || 'Gagal masuk.') + '</span>';
    };
    $('#keypad').onclick = (e) => { const k = e.target.closest('[data-k]'); if (k) press(k.dataset.k); };
    btn.onclick = submit;
    const onKey = (e) => {
      if (this.shell) { removeEventListener('keydown', onKey); return; }
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') submit();
    };
    addEventListener('keydown', onKey);
    draw();
  },

  sessionExpired() {
    if (!this.shell) return;
    Store.clearSession();
    this.showLogin('Sesi berakhir. Masukkan PIN untuk melanjutkan.');
  },

  async logout() {
    const n = S.outbox.size + Uploads.pending;
    let wipe = false;
    const ok = await new Promise((resolve) => {
      let v = false;
      Sheet.open({
        title: 'Keluar dari aplikasi?',
        message: n ? n + ' perubahan belum terkirim. Perubahan tetap tersimpan di HP ini dan dikirim setelah Anda masuk kembali.' : 'Anda perlu memasukkan PIN lagi untuk masuk.',
        html: (n ? '' : '<label class="radio-row"><input type="checkbox" id="wipeChk"><span><b>Hapus juga data di HP ini</b><small>Pilih bila HP ini bukan milik Anda.</small></span></label>') +
          '<div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost" data-x>Batal</button><button class="btn btn-danger solid" data-ok>' + ic('log-out', 18) + 'Keluar</button></div>',
        onMount(el, s) {
          el.querySelector('[data-x]').onclick = () => s.close();
          el.querySelector('[data-ok]').onclick = () => { v = true; const c = el.querySelector('#wipeChk'); wipe = !!(c && c.checked); s.close(); };
        },
        onClose() { resolve(v); }
      });
    });
    if (!ok) return;
    if (wipe) { await DB.wipe(); LS.del('kelompok'); LS.del('temaCss'); S.outbox = new Map(); S.since = 0; }
    Store.clearSession();
    history.replaceState(null, '', '#/beranda');
    this.showLogin();
  },

  fatal(msg) {
    $('#app').innerHTML = '<div class="login"><div class="login-inner">' + emptyState('clipboard', 'Aplikasi tidak dapat dibuka', msg + ' Pastikan tidak memakai mode penyamaran.') + '</div></div>';
  }
};

function deviceId() {
  let d = LS.getG('device', '');
  if (!d) { d = LS.get('device', '') || uid(); LS.setG('device', d); }
  return d;
}
/* Service worker, tombol pasang, dan banner "Versi baru tersedia" ada di pwa.js */

document.addEventListener('DOMContentLoaded', () => App.init());
