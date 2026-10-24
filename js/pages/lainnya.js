/* =====================================================================
   Lainnya — profil, sinkronisasi, akun, pengaturan (Utama), kelola Penerobos
   Format Laporan — editor template WA + opsi PDF
   ===================================================================== */
'use strict';

const pinInput = (id, label, extra) => '<div class="field"><label class="label" for="' + id + '">' + label + '</label><input class="input num" id="' + id + '" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" ' + (extra || '') + '></div>';

Pages.lainnya = {
  nav: 'lainnya',
  mount(el) {
    this.el = el;
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const a = t.dataset.act;
      if (a === 'sync') this.syncNow(t);
      else if (a === 'pin') this.changePin();
      else if (a === 'kelompok') this.editKelompok();
      else if (a === 'ambang') this.editAmbang();
      else if (a === 'addp') this.addPenerobos();
      else if (a === 'resetp') this.resetPin(t.dataset.id);
      else if (a === 'delp') this.delPenerobos(t.dataset.id);
      else if (a === 'pmenu') this.penerobosMenu(t.dataset.id);
      else if (a === 'reload') this.reload(t);
      else if (a === 'logout') App.logout();
      else if (a === 'rename') this.rename(t.dataset.id || (S.me && S.me.id));
      else if (a === 'warna') this.editWarna();
      else if (a === 'gantikode') this.gantiKode();
    });
    Bus.on('sync', () => { if (App.route && App.route.name === 'lainnya') this.renderSync(); });
  },
  show() { this.render(); if (Store.isUtama() && navigator.onLine !== false) this.refreshPenerobos(); },
  onData() { this.render(); },

  render() {
    const me = S.me || {}, utama = Store.isUtama();
    const pnr = Object.values(S.pnr).filter((p) => p.aktif).sort((a, b) => (a.peran === 'UTAMA' ? -1 : b.peran === 'UTAMA' ? 1 : collator.compare(a.nama, b.nama)));
    const row = (act, icon, title, sub, green) => '<button class="settings-row" data-act="' + act + '"><span class="s-ic ' + (green ? 'green' : '') + '">' + ic(icon, 20) + '</span><span class="row-main"><span class="s-title" style="display:block">' + title + '</span>' + (sub ? '<span class="s-sub" style="display:block">' + sub + '</span>' : '') + '</span>' + ic('chevron-right', 18, 'chev') + '</button>';
    const tpl = JENIS.every((j) => Report.template(j) === Pages.format.def(j)) ? 'Template bawaan' : 'Template khusus';
    const warna = Tema.valid(S.cfg.tema_warna) ? S.cfg.tema_warna.toUpperCase() : Tema.DEFAULT;
    const wNama = (Tema.PRESETS.find((p) => p[1] === warna) || ['Warna khusus'])[0];
    const nDk = Store.dapukanList().length, nAg = Store.anggotaAll().length;
    const T = window.Tenant && Tenant.current;
    this.el.innerHTML =
      '<div class="card profile"><span class="avatar">' + esc(Fmt.initials(me.nama)) + '</span><div class="row-main"><div class="nm">' + esc(me.nama) + '</div>' +
        '<div class="muted" style="font-size:14px">Kelompok ' + esc(S.cfg.nama_kelompok || '—') + '</div>' +
        '<div style="margin-top:8px">' + (utama ? '<span class="badge-utama">' + ic('shield-check', 14) + 'Penerobos Utama</span>' : '<span class="pill outline">Penerobos</span>') + '</div></div>' +
        (utama ? '<button class="icon-btn" data-act="rename" aria-label="Ubah nama">' + ic('pencil', 18) + '</button>' : '') + '</div>' +
      '<div class="card js-sync"></div>' +
      '<div class="card"><div class="card-label">Akun</div>' +
        row('pin', 'lock', 'Ganti PIN', 'Amankan akses masuk pribadi') +
      '</div>' +
      (utama ? '<div class="card"><div class="card-label">Pengaturan <span class="badge-utama" style="height:22px;font-size:10.5px">Penerobos Utama</span></div>' +
        row('kelompok', 'building-2', 'Nama Kelompok', esc(S.cfg.nama_kelompok || '—'), true) +
        '<a class="settings-row highlight" href="#/format" style="color:inherit;margin:4px 0"><span class="s-ic" style="background:var(--primary);color:var(--on-primary)">' + ic('message-square', 20) + '</span><span class="row-main"><span class="s-title" style="display:block">Format Laporan WA/PDF</span>' +
          '<span class="s-sub" style="display:block">Sambung, musyawaroh &amp; ibu-ibu · ' + tpl + ' · PDF ' + (S.cfg.pdf_tampilkan_tidak_hadir ? 'dengan' : 'tanpa') + ' daftar tidak hadir</span></span><span class="btn-text" style="padding:0">Atur</span>' + ic('chevron-right', 18, 'chev') + '</a>' +
        '<a class="settings-row" href="#/dapukan" style="color:inherit"><span class="s-ic green">' + ic('users-round', 20) + '</span><span class="row-main"><span class="s-title" style="display:block">Dapukan Musyawaroh</span>' +
          '<span class="s-sub" style="display:block">' + nDk + ' dapukan · ' + nAg + ' anggota</span></span>' + ic('chevron-right', 18, 'chev') + '</a>' +
        '<button class="settings-row" data-act="warna"><span class="s-ic" style="background:var(--primary);color:var(--on-primary)">' + ic('palette', 20) + '</span><span class="row-main"><span class="s-title" style="display:block">Warna Aplikasi</span>' +
          '<span class="s-sub" style="display:block">' + esc(wNama) + ' · berlaku di semua HP</span></span><span class="swatch-dot" style="background:' + warna + '"></span>' + ic('chevron-right', 18, 'chev') + '</button>' +
        row('ambang', 'sliders-horizontal', 'Ambang Dashboard', '&lt; ' + S.cfg.ambang_sering_tidak_hadir + '% dari ' + S.cfg.jumlah_kegiatan_evaluasi + ' kegiatan terakhir', true) +
      '</div>' +
      '<div class="card"><div class="card-label">Kelola Penerobos <span class="aside" style="text-transform:none;letter-spacing:0;font-weight:600">' + pnr.length + '/3</span></div>' +
        pnr.map((p) => '<div class="list-row"><span class="avatar sm">' + esc(Fmt.initials(p.nama)) + '</span><div class="row-main"><div class="row-title">' + esc(p.nama) + (p.id === me.id ? ' <span class="muted" style="font-weight:500">(Anda)</span>' : '') + '</div>' +
          '<div class="row-sub">' + (p.peran === 'UTAMA' ? 'Penerobos Utama' : 'Penerobos') + (p.login ? ' · masuk ' + esc(p.login.slice(0, 10).split('-').reverse().join('/')) : '') + '</div></div>' +
          '<button class="icon-btn plain" data-act="pmenu" data-id="' + esc(p.id) + '" aria-label="Aksi ' + esc(p.nama) + '">' + ic('ellipsis-vertical', 20) + '</button></div>').join('') +
        (pnr.length < 3 ? '<button class="btn btn-ghost btn-block" style="margin-top:10px;border-style:dashed" data-act="addp">' + ic('user-plus', 18) + 'Tambah Penerobos</button>' : '<p class="help">Maksimal 2 Penerobos selain Penerobos Utama.</p>') +
      '</div>' : '') +
      '<div class="card"><div class="card-label">Data &amp; Aplikasi</div>' +
        row('reload', 'database', 'Muat ulang data dari server', 'Ambil ulang seluruh data terbaru dari Google Sheets') +
        (T ? row('gantikode', 'key-round', 'Kode Kelompok: ' + esc(T.kode), 'Ketuk untuk pindah ke kelompok lain di HP ini') : '') +
        UI.installBtn('settings-row js-install') +
      '</div>' +
      '<button class="btn btn-danger btn-block btn-lg" style="margin-top:16px" data-act="logout">' + ic('log-out', 20) + 'Keluar</button>' +
      '<p class="footer-note">Presensi Sambung v' + esc((window.APP_CONFIG || {}).APP_VERSION || '1.0.0') + ' · data tersimpan aman di HP &amp; Google Sheets</p>';
    const ib = $('.js-install', this.el);
    if (ib) ib.innerHTML = '<span class="s-ic green">' + ic('smartphone', 20) + '</span><span class="row-main"><span class="s-title" style="display:block">Pasang aplikasi di HP</span><span class="s-sub" style="display:block">Buka langsung dari layar utama, tanpa browser</span></span>' + ic('chevron-right', 18, 'chev');
    UI.bindInstall(this.el);
    this.renderSync();
  },

  renderSync() {
    const box = $('.js-sync', this.el);
    if (!box) return;
    const p = Sync.pill(), n = S.outbox.size + Uploads.pending, off = navigator.onLine === false;
    box.innerHTML = '<div class="card-label">Sinkronisasi</div>' +
      '<div class="list-row" style="padding-top:6px"><div class="row-main"><div class="row-title" style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:' + (off ? 'var(--amber)' : p.cls === 'err' ? 'var(--danger)' : 'var(--primary)') + '"></span>' +
        (off ? 'Offline' : 'Online') + ' <span class="muted" style="font-weight:500">· Terakhir ' + esc(Fmt.ago(S.lastSyncAt)) + '</span></div></div>' + (!n && !off ? '<span class="pill ok">Tersinkron</span>' : '') + '</div>' +
      '<div class="list-row"><div class="row-main">Perubahan belum terkirim</div><span class="pill ' + (n ? 'warn' : '') + ' num">' + n + '</span></div>' +
      '<button class="btn btn-secondary btn-block" style="margin-top:8px" data-act="sync"' + (off ? ' disabled' : '') + '>' + ic('refresh-cw', 18, Sync.busy ? 'spin' : '') + 'Sinkronkan Sekarang</button>';
  },

  async syncNow() {
    await Sync.run();
    Toast.show(Sync.state === 'ok' ? 'Data tersinkron' : Sync.err || 'Belum bisa sinkron', Sync.state === 'ok' ? 'ok' : 'warn');
  },

  async reload(btn) {
    if (navigator.onLine === false) { Toast.show('Butuh internet.', 'warn'); return; }
    btn.querySelector('.s-ic').innerHTML = ic('refresh-cw', 20, 'spin');
    await App.refreshAll();
    this.render();
  },

  async refreshPenerobos() {
    const r = await api('penerobos.list');
    if (r.ok) await Store.applyChanges({ pnr: r.data });
  },

  online() { if (navigator.onLine === false) { Toast.show('Butuh internet untuk mengelola akun.', 'warn'); return false; } return true; },

  changePin() {
    if (!this.online()) return;
    Sheet.open({
      title: 'Ganti PIN',
      message: 'PIN 4–8 angka. Disarankan 6 angka dan tidak mudah ditebak.',
      html: '<form id="pinForm">' + pinInput('pOld', 'PIN lama', 'autofocus') + pinInput('pNew', 'PIN baru') + pinInput('pNew2', 'Ulangi PIN baru') +
        '<div class="error-text" id="pErr" hidden></div><div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow">Simpan PIN</button></div></form>',
      onMount: (el, s) => {
        $('[data-x]', el).onclick = () => s.close();
        $('#pinForm', el).onsubmit = async (e) => {
          e.preventDefault();
          const o = $('#pOld', el).value, n = $('#pNew', el).value, n2 = $('#pNew2', el).value, er = $('#pErr', el);
          const show = (m) => { er.hidden = false; er.textContent = m; };
          if (!/^\d{4,8}$/.test(n)) return show('PIN baru harus 4–8 angka.');
          if (n !== n2) return show('Ulangan PIN baru tidak sama.');
          const b = e.submitter || $('button.btn-primary', el); b.disabled = true;
          const r = await api('auth.changePin', { oldPin: o, newPin: n });
          b.disabled = false;
          if (!r.ok) return show(r.error);
          s.close(); Toast.show('PIN berhasil diganti');
        };
      }
    });
  },

  gantiKode() {
    const n = S.outbox.size + Uploads.pending;
    Sheet.confirm({
      title: 'Pindah Kode Kelompok?',
      message: (n ? n + ' perubahan belum terkirim tetap aman di HP dan dikirim saat Anda kembali ke kelompok ini. ' : '') + 'Data tiap kelompok disimpan terpisah. Anda akan diminta memasukkan Kode Kelompok lain.',
      ok: 'Pindah'
    }).then((ok) => { if (ok) Tenant.forget(); });
  },

  editWarna() {
    const asal = Tema.valid(S.cfg.tema_warna) ? S.cfg.tema_warna.toUpperCase() : Tema.DEFAULT;
    let pilih = asal, saved = false;
    Sheet.open({
      title: 'Warna Aplikasi',
      message: 'Warna utama tombol, menu, grafik, dan PDF. Berlaku di semua HP Penerobos setelah tersinkron. Mode terang/gelap tetap diatur tiap HP.',
      html: '<div class="swatches js-sw"></div>' +
        '<label class="custom-color"><span class="cc-prev js-ccp"></span><span class="row-main"><b>Warna lain…</b><small class="js-cch"></small></span><input type="color" class="js-cc" aria-label="Pilih warna lain"></label>' +
        '<div class="tema-preview"><button type="button" class="btn btn-primary btn-sm" tabindex="-1">' + ic('check', 16) + 'Tombol</button><span class="pill lvl-Kelompok">Sambung Kelompok</span><span class="pill ok">Selesai</span><span class="chip on" style="pointer-events:none">Bulan ini</span></div>' +
        '<div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow" data-ok>' + ic('check', 18) + 'Simpan Warna</button></div>',
      onMount: (el, sh) => {
        const draw = () => {
          $('.js-sw', el).innerHTML = Tema.PRESETS.map((p) => '<button type="button" class="sw ' + (p[1] === pilih ? 'on' : '') + '" data-c="' + p[1] + '" aria-label="' + p[0] + '"><i style="background:' + p[1] + '">' + (p[1] === pilih ? ic('check', 18, '', 3) : '') + '</i><span>' + p[0] + '</span></button>').join('');
          const custom = !Tema.PRESETS.some((p) => p[1] === pilih);
          $('.js-ccp', el).style.background = pilih;
          $('.js-cch', el).textContent = custom ? pilih + ' (dipilih)' : 'Bebas pilih warna sendiri';
          $('.js-cc', el).value = pilih.toLowerCase();
          Tema.apply(pilih);                                           // pratinjau langsung
        };
        el.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { pilih = b.dataset.c; haptic(6); draw(); } });
        $('.js-cc', el).addEventListener('input', (e) => { pilih = e.target.value.toUpperCase(); draw(); });
        $('[data-x]', el).onclick = () => sh.close();
        $('[data-ok]', el).onclick = async () => {
          saved = true; sh.close();
          if (pilih !== asal) { await Store.setSetting('tema_warna', pilih === Tema.DEFAULT ? '' : pilih); Toast.show('Warna aplikasi disimpan'); }
          this.render();
        };
        draw();
      },
      onClose: () => { if (!saved) Tema.apply(asal); }
    });
  },

  editKelompok() {
    Sheet.open({
      title: 'Nama Kelompok',
      message: 'Tampil di header, laporan WhatsApp, dan PDF.',
      html: '<form id="kForm"><div class="field"><input class="input" id="kNama" maxlength="80" value="' + esc(S.cfg.nama_kelompok) + '" autofocus placeholder="contoh: Sangatta Selatan 2"></div>' +
        '<div class="btn-row"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow">Simpan</button></div></form>',
      onMount: (el, s) => {
        $('[data-x]', el).onclick = () => s.close();
        $('#kForm', el).onsubmit = async (e) => {
          e.preventDefault();
          const v = $('#kNama', el).value.trim();
          if (!v) return;
          await Store.setSetting('nama_kelompok', v);
          LS.set('kelompok', v); App.renderBrand();
          s.close(); Toast.show('Nama kelompok disimpan');
        };
      }
    });
  },

  editAmbang() {
    Sheet.open({
      title: 'Ambang Dashboard',
      message: 'Peserta masuk daftar "Sering Tidak Hadir" bila kehadirannya di bawah ambang pada sejumlah kegiatan terakhir.',
      html: '<form id="aForm"><div class="grid-2"><div class="field"><label class="label" for="aPct">Ambang (%)</label><input class="input num" id="aPct" type="number" inputmode="numeric" min="1" max="100" value="' + S.cfg.ambang_sering_tidak_hadir + '"></div>' +
        '<div class="field"><label class="label" for="aN">Kegiatan terakhir</label><input class="input num" id="aN" type="number" inputmode="numeric" min="2" max="50" value="' + S.cfg.jumlah_kegiatan_evaluasi + '"></div></div>' +
        '<div class="btn-row"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow">Simpan</button></div></form>',
      onMount: (el, s) => {
        $('[data-x]', el).onclick = () => s.close();
        $('#aForm', el).onsubmit = async (e) => {
          e.preventDefault();
          const a = Math.max(1, Math.min(100, Math.round(+$('#aPct', el).value || 50)));
          const n = Math.max(2, Math.min(50, Math.round(+$('#aN', el).value || 8)));
          await Store.mutateMany([['settings.set', 'cfg:ambang_sering_tidak_hadir', { key: 'ambang_sering_tidak_hadir', value: a }],
                                  ['settings.set', 'cfg:jumlah_kegiatan_evaluasi', { key: 'jumlah_kegiatan_evaluasi', value: n }]]);
          s.close(); Toast.show('Ambang disimpan');
        };
      }
    });
  },

  addPenerobos() {
    if (!this.online()) return;
    Sheet.open({
      title: 'Tambah Penerobos',
      message: 'Penerobos dapat membuat kegiatan, mengabsen, dan membuat laporan. PIN harus berbeda dari Penerobos lain.',
      html: '<form id="npForm"><div class="field"><label class="label" for="npNama">Nama</label><input class="input" id="npNama" maxlength="60" autofocus autocapitalize="words"></div>' +
        pinInput('npPin', 'PIN (4–8 angka)') + '<div class="error-text" id="npErr" hidden></div>' +
        '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow">' + ic('user-plus', 18) + 'Tambah</button></div></form>',
      onMount: (el, s) => {
        $('[data-x]', el).onclick = () => s.close();
        $('#npPin', el).type = 'text';
        $('#npForm', el).onsubmit = async (e) => {
          e.preventDefault();
          const nama = $('#npNama', el).value.trim(), pin = $('#npPin', el).value, er = $('#npErr', el);
          if (!nama || !/^\d{4,8}$/.test(pin)) { er.hidden = false; er.textContent = 'Isi nama dan PIN 4–8 angka.'; return; }
          const b = e.submitter || $('button.btn-primary', el); b.disabled = true;
          const r = await api('penerobos.add', { nama, pin });
          b.disabled = false;
          if (!r.ok) { er.hidden = false; er.textContent = r.error; return; }
          s.close(); Toast.show(nama + ' ditambahkan. Beri tahu PIN-nya secara pribadi.', 'ok', { ms: 4500 });
          await this.refreshPenerobos();
        };
      }
    });
  },

  resetPin(id) {
    if (!this.online()) return;
    const p = S.pnr[id];
    Sheet.open({
      title: 'Reset PIN ' + (p ? p.nama : ''),
      message: 'Penerobos ini akan keluar dari HP-nya dan perlu masuk dengan PIN baru.',
      html: '<form id="rpForm">' + pinInput('rpPin', 'PIN baru (4–8 angka)', 'autofocus') + '<div class="error-text" id="rpErr" hidden></div>' +
        '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow">Reset PIN</button></div></form>',
      onMount: (el, s) => {
        $('[data-x]', el).onclick = () => s.close();
        $('#rpPin', el).type = 'text';
        $('#rpForm', el).onsubmit = async (e) => {
          e.preventDefault();
          const pin = $('#rpPin', el).value, er = $('#rpErr', el);
          if (!/^\d{4,8}$/.test(pin)) { er.hidden = false; er.textContent = 'PIN harus 4–8 angka.'; return; }
          const r = await api('penerobos.resetPin', { id, pin });
          if (!r.ok) { er.hidden = false; er.textContent = r.error; return; }
          s.close(); Toast.show('PIN direset');
        };
      }
    });
  },

  penerobosMenu(id) {
    const p = S.pnr[id];
    if (!p) return;
    const items = [{ icon: 'pencil', label: 'Ubah nama', onClick: () => this.rename(id) }];
    if (p.peran !== 'UTAMA') items.push(
      { icon: 'key-round', label: 'Reset PIN', onClick: () => this.resetPin(id) },
      { icon: 'trash-2', label: 'Hapus Penerobos', danger: true, onClick: () => this.delPenerobos(id) });
    Sheet.menu({ title: p.nama + (p.peran === 'UTAMA' ? ' · Penerobos Utama' : ''), items });
  },

  rename(id) {
    if (!this.online()) return;
    const p = S.pnr[id] || (S.me && S.me.id === id ? S.me : null);
    if (!p) return;
    Sheet.open({
      title: 'Ubah Nama',
      message: (p.peran === 'UTAMA' ? 'Nama Penerobos Utama' : 'Nama Penerobos') + ' tampil di aplikasi dan di laporan PDF.',
      html: '<form id="rnForm"><div class="field"><input class="input" id="rnNama" maxlength="60" autocapitalize="words" value="' + esc(p.nama) + '" autofocus></div>' +
        '<div class="error-text" id="rnErr" hidden></div><div class="btn-row"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow">' + ic('check', 18) + 'Simpan</button></div></form>',
      onMount: (el, s) => {
        $('[data-x]', el).onclick = () => s.close();
        $('#rnForm', el).onsubmit = async (e) => {
          e.preventDefault();
          const nama = $('#rnNama', el).value.replace(/\s+/g, ' ').trim(), er = $('#rnErr', el);
          if (!nama) { er.hidden = false; er.textContent = 'Nama wajib diisi.'; return; }
          if (nama === p.nama) { s.close(); return; }
          const b = e.submitter || $('button.btn-primary', el); b.disabled = true;
          const r = await api('penerobos.rename', { id, nama });
          b.disabled = false;
          if (!r.ok) { er.hidden = false; er.textContent = r.error; return; }
          s.close();
          await this.refreshPenerobos();
          Toast.show('Nama diubah menjadi ' + nama);
        };
      }
    });
  },

  async delPenerobos(id) {
    if (!this.online()) return;
    const p = S.pnr[id];
    const ok = await Sheet.confirm({ title: 'Hapus ' + (p ? p.nama : 'Penerobos') + '?', message: 'Akun tidak bisa masuk lagi. Presensi yang pernah dicatatnya tetap tersimpan.', ok: 'Hapus', danger: true });
    if (!ok) return;
    const r = await api('penerobos.delete', { id });
    if (!r.ok) { Toast.show(r.error, 'err'); return; }
    Toast.show('Penerobos dihapus');
    await this.refreshPenerobos();
  }
};

/* ---------- Format Laporan (Sambung & Musyawaroh) ---------- */
Pages.format = {
  focus: true, utama: true, jenis: 'SAMBUNG', drafts: {},
  def(j) { return j === MUSY ? DEFAULT_TEMPLATE_MUSY : j === IBU ? DEFAULT_TEMPLATE_IBU : DEFAULT_TEMPLATE_WA; },
  saved(j) { return Report.template(j); },
  tokens() { return Report.tokens(this.jenis); },
  mount(el) {
    el.innerHTML = '<div class="js-head"></div><div class="pad">' +
      '<div class="seg js-fj" style="margin-bottom:6px"><button type="button" data-fj="SAMBUNG">' + ic('users', 17) + 'Sambung</button><button type="button" data-fj="MUSYAWAROH">' + ic('messages-square', 17) + 'Musyawaroh</button><button type="button" data-fj="IBU">' + ic('users-round', 17) + 'Ibu-ibu</button></div>' +
      '<div class="section-label" style="margin-top:12px"><span class="js-tl">Template WhatsApp</span><span class="aside">Mendukung *tebal* &amp; emoji</span></div>' +
      '<div class="editor"><div class="editor-back js-back" aria-hidden="true"></div><textarea class="js-tpl" spellcheck="false" aria-label="Template laporan WhatsApp"></textarea></div>' +
      '<div class="card" style="margin-top:12px"><div class="card-head" style="margin-bottom:10px"><span style="display:inline-flex;gap:6px;align-items:center;font-weight:600;font-size:14px">' + ic('tag', 16) + 'Ketuk untuk menyisipkan penanda</span><span class="sub js-tn" style="color:var(--primary);font-weight:600"></span></div>' +
        '<div class="tokens js-tokens"></div></div>' +
      '<div class="section-label">Pratinjau Hasil Salin<span class="aside js-pvsrc"></span></div>' +
      '<div class="wa-bubble js-preview"></div>' +
      '<button class="btn-text js-reset" style="margin-top:10px;display:inline-flex;gap:6px;align-items:center">' + ic('rotate-ccw', 16) + 'Kembalikan ke template bawaan</button>' +
      '<div class="section-label" id="pdfOpt">Laporan PDF</div>' +
      '<div class="card" style="display:flex;align-items:center;gap:12px"><div class="row-main"><div class="row-title" style="font-size:15px">Tampilkan yang tidak hadir di PDF</div><div class="row-sub">Sambung: daftar tidak hadir L/P · Musyawaroh: anggota yang tidak hadir per dapukan</div></div>' +
        '<label class="switch"><input type="checkbox" class="js-pdf"><span class="track"></span></label></div>' +
      '</div>' +
      '<div class="action-bar"><div class="action-bar-inner"><button class="btn btn-primary btn-block btn-lg js-save">' + ic('check', 20) + 'Simpan Pengaturan</button></div></div>';
    this.el = el;
    this.ta = $('.js-tpl', el); this.back = $('.js-back', el);
    this.ta.addEventListener('input', () => { this.drafts[this.jenis] = this.ta.value; this.update(); });
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tok]');
      if (t) { this.insert('{' + t.dataset.tok + '}'); return; }
      const j = e.target.closest('[data-fj]');
      if (j && j.dataset.fj !== this.jenis) { this.setJenis(j.dataset.fj); haptic(6); }
    });
    $('.js-reset', el).onclick = () => { this.ta.value = this.def(this.jenis); this.drafts[this.jenis] = this.ta.value; this.update(); Toast.show('Template bawaan dipulihkan (belum disimpan)', 'info'); };
    $('.js-pdf', el).onchange = () => this.update();
    $('.js-save', el).onclick = () => this.save();
  },
  show(el, params) {
    const d = LS.get('tplDrafts', null) || {};
    const old = LS.get('tplDraft', null);                          // draf versi lama
    this.drafts = { SAMBUNG: d.SAMBUNG || old || this.saved('SAMBUNG'), MUSYAWAROH: d.MUSYAWAROH || this.saved(MUSY), IBU: d.IBU || this.saved(IBU) };
    $('.js-pdf', el).checked = !!S.cfg.pdf_tampilkan_tidak_hadir;
    this.setJenis(params[0] === 'musyawaroh' ? MUSY : params[0] === 'ibu' ? IBU : 'SAMBUNG');
    if (params[0] === 'pdf') setTimeout(() => $('#pdfOpt', el).scrollIntoView({ behavior: 'smooth', block: 'start' }), 220);
  },
  setJenis(j) {
    this.jenis = jenisOk(j);
    $$('[data-fj]', this.el).forEach((b) => b.classList.toggle('on', b.dataset.fj === this.jenis));
    $('.js-tl', this.el).textContent = 'Template WhatsApp · ' + (this.jenis === MUSY ? 'Musyawaroh' : this.jenis === IBU ? 'Pengajian Ibu-ibu' : 'Sambung');
    const tk = this.tokens();
    $('.js-tokens', this.el).innerHTML = tk.map((t) => '<button class="token ' + (/tidak_hadir/.test(t) ? 'muted' : '') + '" data-tok="' + t + '">{' + t + '}</button>').join('');
    $('.js-tn', this.el).textContent = tk.length + ' tersedia';
    this.ta.value = this.drafts[this.jenis];
    this.update();
  },
  dirty() {
    return JENIS.some((j) => this.drafts[j] !== this.saved(j)) || $('.js-pdf', this.el).checked !== !!S.cfg.pdf_tampilkan_tidak_hadir;
  },
  update() {
    const v = this.ta.value, known = new Set(this.tokens());
    this.back.innerHTML = esc(v).replace(/\{(\w+)\}/g, (m, k) => (known.has(k) ? '<mark>' + m + '</mark>' : m)) + '\n';
    this.ta.style.height = 'auto';
    this.ta.style.height = Math.max(330, this.ta.scrollHeight) + 'px';
    const j = this.jenis, kg = Store.kegiatanJenis(j)[0];
    $('.js-preview', this.el).innerHTML = Report.toHtml(Report.render(v, kg ? Report.vars(kg) : j === MUSY ? Report.sampleMusy() : j === IBU ? Report.sampleIbu() : Report.sampleVars()));
    $('.js-pvsrc', this.el).textContent = kg ? (j === MUSY ? 'Musyawaroh terakhir' : j === IBU ? 'Pengajian ibu-ibu terakhir' : 'Kegiatan terakhir') : 'Contoh data';
    const d = this.dirty();
    $('.js-head', this.el).innerHTML = UI.focusHead({ title: 'Format Laporan WA/PDF', sub: 'Template sambung, musyawaroh & opsi PDF', right: d ? '<span class="pill ok">' + ic('save', 14) + 'Belum disimpan</span>' : '' });
    const keep = {};
    JENIS.forEach((j) => { if (this.drafts[j] !== this.saved(j)) keep[j] = this.drafts[j]; });
    if (Object.keys(keep).length) LS.set('tplDrafts', keep); else LS.del('tplDrafts');
    LS.del('tplDraft');
  },
  insert(text) {
    const ta = this.ta, s = ta.selectionStart === undefined ? ta.value.length : ta.selectionStart, e = ta.selectionEnd === undefined ? s : ta.selectionEnd;
    ta.focus({ preventScroll: true });
    ta.setRangeText(text, s, e, 'end');
    this.drafts[this.jenis] = ta.value;
    this.update();
    haptic(6);
  },
  async save() {
    const ops = [];
    if (this.drafts.SAMBUNG !== S.cfg.template_wa) ops.push(['settings.set', 'cfg:template_wa', { key: 'template_wa', value: this.drafts.SAMBUNG }]);
    if (this.drafts.MUSYAWAROH !== (S.cfg.template_musy || DEFAULT_TEMPLATE_MUSY)) ops.push(['settings.set', 'cfg:template_musy', { key: 'template_musy', value: this.drafts.MUSYAWAROH }]);
    if (this.drafts.IBU !== (S.cfg.template_ibu || DEFAULT_TEMPLATE_IBU)) ops.push(['settings.set', 'cfg:template_ibu', { key: 'template_ibu', value: this.drafts.IBU }]);
    const pdf = $('.js-pdf', this.el).checked;
    if (pdf !== !!S.cfg.pdf_tampilkan_tidak_hadir) ops.push(['settings.set', 'cfg:pdf_tampilkan_tidak_hadir', { key: 'pdf_tampilkan_tidak_hadir', value: pdf }]);
    if (ops.length) await Store.mutateMany(ops);
    LS.del('tplDrafts');
    Toast.show('Pengaturan laporan disimpan');
    App.back('lainnya');
  }
};
