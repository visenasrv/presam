/* ============================================================================
   tenant-gate.js — layar "Masukkan Kode", layar nonaktif, konfirmasi pindah klien,
   baris "Kode … · Ganti" untuk layar login, dan kotak "fitur terkunci".
   Mandiri (CSS sendiri), tanpa dependensi. Muat setelah tenant.js.

   Pemakaian di aplikasi:
     if (Tenant.need || Tenant.blocked) { TenantGate.mount(); return; }   // sebelum start aplikasi
     loginEl.insertAdjacentHTML('beforeend', TenantGate.loginLine());     // di layar login
     TenantGate.bindLoginLine(loginEl, { pending: jumlahDataBelumTerkirim });
     el.innerHTML = TenantGate.lockedBox('online');                       // halaman fitur terkunci
   Warna mengikuti <meta name="theme-color">. Teks bisa diubah di objek TEXT.
   ========================================================================== */
(function () {
  'use strict';
  var T = window.Tenant; if (!T) { console.error('tenant-gate.js: muat tenant.js lebih dulu'); return; }
  var C = T.config || {};
  var L = C.LABEL || 'Kode Toko';
  var TEXT = {
    title: 'Masukkan ' + L,
    hint: L + ' diberikan oleh admin/Penerobos Utama. Cukup diisi sekali di HP ini.',
    placeholder: 'contoh: SANGATTA2-4821',
    next: 'Lanjut',
    noCode: 'Belum punya ' + L + '?',
    contact: 'Hubungi admin',
    switchTitle: 'Buka klien lain?',
    blockedTitle: 'Aplikasi ini sedang nonaktif',
    blockedDefault: 'Silakan hubungi admin untuk mengaktifkan kembali.',
    retry: 'Periksa lagi',
    other: 'Pakai ' + L + ' lain',
    change: 'Ganti',
    lockedTitle: function (f) { return 'Fitur ' + f + ' belum termasuk paket Anda'; },
    lockedText: 'Data Anda tetap utuh saat naik paket — tidak perlu pasang ulang.',
    upgrade: 'Tanya upgrade lewat WhatsApp'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function wa(msg) { var n = String(C.ADMIN_WA || '').replace(/\D/g, ''); if (n.charAt(0) === '0') n = '62' + n.slice(1); return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg); }
  // Presensi Sambung: warna mengikuti warna aplikasi (--primary), bukan theme-color (putih/gelap)
  function accent() { var c = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(); return c || '#15803D'; }
  function css() {
    if (document.getElementById('tg-css')) return;
    var s = document.createElement('style'); s.id = 'tg-css';
    s.textContent = ':root{--tg-a:' + accent() + '}' +
      '.tg-wrap{position:fixed;inset:0;z-index:2147482000;overflow:auto;background:#f7f5f3;display:flex;align-items:flex-start;justify-content:center;padding:max(8vh,24px) 16px 32px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1c1917;box-sizing:border-box}' +
      '.tg-box{width:100%;max-width:400px}.tg-brand{text-align:center;margin-bottom:18px}.tg-logo{width:64px;height:64px;border-radius:18px;margin:0 auto 10px;display:grid;place-items:center;background:var(--tg-a);color:#fff;font-weight:800;font-size:28px;overflow:hidden}.tg-logo img{width:100%;height:100%;object-fit:cover}' +
      '.tg-brand h2{margin:0;font-size:22px}.tg-card{background:#fff;border:1px solid #e7e2de;border-radius:18px;padding:20px}.tg-card h3{margin:0 0 4px;font-size:17px}.tg-muted{color:#6b6461;font-size:13.5px}' +
      '.tg-in{width:100%;box-sizing:border-box;margin-top:14px;font:700 16px ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;padding:12px 14px;border:1.5px solid #e7e2de;border-radius:12px}.tg-in:focus{outline:none;border-color:var(--tg-a)}' +
      '.tg-in::placeholder{text-transform:none;letter-spacing:0;font-weight:500;font-family:system-ui,sans-serif}.tg-err{margin-top:10px;padding:10px 12px;border-radius:10px;background:#fdecec;color:#b91c1c;font-size:14px}.tg-btn{display:block;width:100%;box-sizing:border-box;margin-top:14px;padding:13px;border:0;border-radius:12px;background:var(--tg-a);color:#fff;font:700 15px system-ui,sans-serif;cursor:pointer;text-align:center;text-decoration:none}' +
      '.tg-btn.out{background:#fff;color:#1c1917;border:1.5px solid #e7e2de;margin-top:8px}.tg-btn.wa{background:#16A34A}.tg-btn:disabled{opacity:.6}.tg-link{background:none;border:0;color:var(--tg-a);font:700 14px system-ui,sans-serif;cursor:pointer;padding:0}' +
      '.tg-foot{text-align:center;margin-top:16px;font-size:13.5px;color:#6b6461}.tg-line{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:14px;font-size:13px;color:#6b6461}.tg-line b{font-family:ui-monospace,Menlo,monospace;color:#1c1917}' +
      '.tg-lock{max-width:520px;margin:16px auto;background:#fff;border:1px solid #e7e2de;border-radius:18px;padding:20px;font:15px/1.5 system-ui,sans-serif;color:#1c1917}.tg-lock h3{margin:0 0 6px;font-size:17px}' +
      '.tg-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147482001;display:grid;place-items:center;padding:16px}.tg-dlg{background:#fff;border-radius:16px;padding:20px;max-width:380px;width:100%;font:15px/1.5 system-ui,sans-serif}.tg-dlg h3{margin:0 0 8px}.tg-row{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}.tg-row .tg-btn{width:auto;margin:0;padding:10px 16px}';
    document.head.appendChild(s);
  }
  function frame(inner) {
    css();
    var old = document.querySelector('.tg-wrap'); if (old) old.remove();
    var w = document.createElement('div'); w.className = 'tg-wrap';
    var name = C.APP_NAME || document.title || 'Aplikasi';
    var icon = document.querySelector('link[rel="apple-touch-icon"],link[rel="icon"]');
    w.innerHTML = '<div class="tg-box"><div class="tg-brand"><div class="tg-logo">' + (icon ? '<img alt="" src="' + esc(icon.href) + '">' : esc(name.charAt(0))) + '</div><h2>' + esc(name) + '</h2></div>' + inner + '</div>';
    document.body.appendChild(w);
    return w;
  }
  function busy(b, on) { if (b) { b.disabled = !!on; b.dataset.t = b.dataset.t || b.textContent; b.textContent = on ? 'Memeriksa…' : b.dataset.t; } }

  var G = window.TenantGate = {
    TEXT: TEXT,
    /** Tampilkan layar yang sesuai: nonaktif / konfirmasi pindah / masukkan kode. */
    mount: function () {
      if (T.blocked) return G.blocked(T.current);
      if (T.current && T.wantKode) return G.confirmSwitch(T.current, T.wantKode);
      return G.form(T.wantKode);
    },
    form: function (prefill, err) {
      var w = frame('<form class="tg-card" autocomplete="off"><h3>' + TEXT.title + '</h3><div class="tg-muted">' + esc(TEXT.hint) + '</div>' +
        '<input class="tg-in" maxlength="32" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="' + esc(TEXT.placeholder) + '" value="' + esc(prefill || '') + '" aria-label="' + esc(L) + '">' +
        '<div class="tg-err" ' + (err ? '' : 'hidden') + '>' + esc(err || '') + '</div><button class="tg-btn" type="submit">' + TEXT.next + ' →</button></form>' +
        (C.ADMIN_WA ? '<div class="tg-foot">' + esc(TEXT.noCode) + ' <a class="tg-link" target="_blank" rel="noopener" href="' + wa('Halo admin ' + (C.APP_NAME || '') + ', saya ingin bertanya tentang aplikasinya.') + '">' + TEXT.contact + '</a></div>' : ''));
      var f = w.querySelector('form'), inp = w.querySelector('.tg-in'), er = w.querySelector('.tg-err'), btn = w.querySelector('.tg-btn');
      inp.addEventListener('input', function () { er.hidden = true; });
      f.onsubmit = async function (e) {
        e.preventDefault();
        var kode = T.norm(inp.value); if (!kode) { er.hidden = false; er.textContent = 'Isi ' + L + ' terlebih dahulu.'; return; }
        inp.value = kode; busy(btn, true); er.hidden = true;
        var r = await T.resolve(kode); busy(btn, false);
        if (!r.ok) { er.hidden = false; er.textContent = r.error; inp.focus(); return; }
        if (!r.t.aktif) { G.blocked(r.t, true); return; }
        btn.textContent = '✓ ' + (r.t.nama || 'Terhubung');
        T.choose(r.t);
      };
      if (prefill && !err) f.requestSubmit ? f.requestSubmit() : f.onsubmit(new Event('submit')); else setTimeout(function () { inp.focus(); }, 60);
    },
    confirmSwitch: function (cur, want) {
      var w = frame('<div class="tg-card"><h3>' + TEXT.switchTitle + '</h3><div class="tg-muted">Perangkat ini sedang terhubung ke <b>' + esc(cur.nama || cur.kode) + '</b> (' + esc(cur.kode) + '). Tautan yang Anda buka meminta <b>' + esc(want) + '</b>. Data tiap klien disimpan terpisah.</div>' +
        '<button class="tg-btn" data-go type="button">Buka ' + esc(want) + '</button><button class="tg-btn out" data-stay type="button">Tetap di ' + esc(cur.nama || cur.kode) + '</button></div>');
      w.querySelector('[data-stay]').onclick = function () { T.stay(); };
      w.querySelector('[data-go]').onclick = function () { T.wantKode = ''; G.form(want); };
    },
    blocked: function (t, fresh) {
      t = t || {};
      var w = frame('<div class="tg-card" style="text-align:center"><div style="font-size:36px">🔒</div><h3>' + TEXT.blockedTitle + '</h3><div class="tg-muted">' + esc(t.pesan || TEXT.blockedDefault) + '</div>' +
        '<div style="font:700 15px ui-monospace,monospace;margin-top:10px">' + esc(t.kode || '') + '</div>' +
        (C.ADMIN_WA ? '<a class="tg-btn wa" target="_blank" rel="noopener" href="' + wa('Halo admin, aplikasi saya nonaktif. ' + L + ': ' + (t.kode || '-')) + '">' + TEXT.contact + '</a>' : '') +
        '<div class="tg-foot">' + (fresh ? '' : '<button class="tg-link" data-retry type="button">' + TEXT.retry + '</button> · ') + '<button class="tg-link" data-other type="button">' + TEXT.other + '</button></div></div>');
      var rt = w.querySelector('[data-retry]');
      if (rt) rt.onclick = async function () { rt.textContent = 'Memeriksa…'; var r = await T.refresh(); if (r && r.ok && r.t.aktif) location.reload(); else { rt.textContent = TEXT.retry; alert(r && !r.ok ? r.error : 'Masih nonaktif.'); } };
      w.querySelector('[data-other]').onclick = function () { if (fresh) G.form(''); else T.forget(); };
    },
    /** HTML baris kecil untuk layar login: "Kode Toko ABC-1234 · Ganti". */
    loginLine: function () {
      var c = T.current; if (!c) return '';
      return '<div class="tg-line" data-tg-line>🔑 <span>' + esc(L) + ' <b>' + esc(c.kode) + '</b></span><button type="button" class="tg-link" data-tg-switch>' + TEXT.change + '</button></div>';
    },
    /** Pasang aksi tombol "Ganti" di dalam elemen root. opts.pending = jumlah data belum terkirim (angka atau fungsi async). */
    bindLoginLine: function (root, opts) {
      css(); opts = opts || {};
      var b = (root || document).querySelector('[data-tg-switch]'); if (!b) return;
      b.onclick = async function () {
        var p = 0; try { p = typeof opts.pending === 'function' ? await opts.pending() : (opts.pending || 0); } catch (e) {}
        G.confirm('Ganti ' + L + '?', (p ? 'Masih ada ' + p + ' data yang belum terkirim. Data itu tetap aman di perangkat dan terkirim saat Anda kembali ke klien ini. ' : '') + 'Anda akan diminta memasukkan ' + L + ' lain.', 'Ganti').then(function (ok) { if (ok) T.forget(); });
      };
    },
    /** HTML kotak "fitur terkunci" + tombol WA upgrade. */
    lockedBox: function (fitur) {
      css();
      var nama = (C.FITUR && C.FITUR[fitur]) || fitur;
      var c = T.current || {};
      var naik = Object.keys(T.PAKET).filter(function (k) { return (T.PAKET[k].fitur || []).indexOf(fitur) > -1; }).map(function (k) { return T.PAKET[k].label; });
      return '<div class="tg-lock"><h3>🔒 ' + esc(TEXT.lockedTitle(nama)) + '</h3><div class="tg-muted">Paket Anda: <b>' + esc(T.paketLabel || '-') + '</b>' + (naik.length ? ' · tersedia di <b>' + esc(naik.join(' / ')) + '</b>' : '') + '. ' + esc(TEXT.lockedText) + '</div>' +
        (C.ADMIN_WA ? '<a class="tg-btn wa" target="_blank" rel="noopener" href="' + wa('Halo admin, saya ingin upgrade agar bisa memakai fitur ' + nama + '. ' + L + ': ' + (c.kode || '-')) + '">' + TEXT.upgrade + '</a>' : '') + '</div>';
    },
    confirm: function (title, msg, okText) {
      css();
      return new Promise(function (res) {
        var ov = document.createElement('div'); ov.className = 'tg-ov';
        ov.innerHTML = '<div class="tg-dlg" role="alertdialog"><h3>' + esc(title) + '</h3><div class="tg-muted">' + esc(msg) + '</div><div class="tg-row"><button class="tg-btn out" data-no type="button">Batal</button><button class="tg-btn" data-yes type="button">' + esc(okText || 'Ya') + '</button></div></div>';
        function done(v) { ov.remove(); res(v); }
        ov.querySelector('[data-no]').onclick = function () { done(false); };
        ov.querySelector('[data-yes]').onclick = function () { done(true); };
        ov.addEventListener('click', function (e) { if (e.target === ov) done(false); });
        document.body.appendChild(ov);
      });
    },
    /** Jalankan cek paket/status di latar setelah aplikasi tampil; berubah → muat ulang sekali. */
    watch: function (delay) {
      setTimeout(function () {
        T.refresh().then(function (r) { if (r && r.reload) location.reload(); }).catch(function () {});
      }, delay == null ? 1500 : delay);
    }
  };
})();
