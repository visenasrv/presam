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
    });
    Bus.on('sync', () => { if (App.route && App.route.name === 'lainnya') this.renderSync(); });
  },
  show() { this.render(); if (Store.isUtama() && navigator.onLine !== false) this.refreshPenerobos(); },
  onData() { this.render(); },

  render() {
    const me = S.me || {}, utama = Store.isUtama();
    const pnr = Object.values(S.pnr).filter((p) => p.aktif).sort((a, b) => (a.peran === 'UTAMA' ? -1 : b.peran === 'UTAMA' ? 1 : collator.compare(a.nama, b.nama)));
    const row = (act, icon, title, sub, green) => '<button class="settings-row" data-act="' + act + '"><span class="s-ic ' + (green ? 'green' : '') + '">' + ic(icon, 20) + '</span><span class="row-main"><span class="s-title" style="display:block">' + title + '</span>' + (sub ? '<span class="s-sub" style="display:block">' + sub + '</span>' : '') + '</span>' + ic('chevron-right', 18, 'chev') + '</button>';
    const tpl = S.cfg.template_wa === DEFAULT_TEMPLATE_WA ? 'Template bawaan' : 'Template khusus';
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
          '<span class="s-sub" style="display:block">' + tpl + ' · PDF ' + (S.cfg.pdf_tampilkan_tidak_hadir ? 'dengan' : 'tanpa') + ' daftar tidak hadir</span></span><span class="btn-text" style="padding:0">Atur</span>' + ic('chevron-right', 18, 'chev') + '</a>' +
        row('ambang', 'sliders-horizontal', 'Ambang Dashboard', '&lt; ' + S.cfg.ambang_sering_tidak_hadir + '% dari ' + S.cfg.jumlah_kegiatan_evaluasi + ' kegiatan terakhir', true) +
      '</div>' +
      '<div class="card"><div class="card-label">Kelola Penerobos <span class="aside" style="text-transform:none;letter-spacing:0;font-weight:600">' + pnr.length + '/3</span></div>' +
        pnr.map((p) => '<div class="list-row"><span class="avatar sm">' + esc(Fmt.initials(p.nama)) + '</span><div class="row-main"><div class="row-title">' + esc(p.nama) + (p.id === me.id ? ' <span class="muted" style="font-weight:500">(Anda)</span>' : '') + '</div>' +
          '<div class="row-sub">' + (p.peran === 'UTAMA' ? 'Penerobos Utama' : 'Penerobos') + (p.login ? ' · masuk ' + esc(p.login.slice(0, 10).split('-').reverse().join('/')) : '') + '</div></div>' +
          '<button class="icon-btn plain" data-act="pmenu" data-id="' + esc(p.id) + '" aria-label="Aksi ' + esc(p.nama) + '">' + ic('ellipsis-vertical', 20) + '</button></div>').join('') +
        (pnr.length < 3 ? '<button class="btn btn-ghost btn-block" style="margin-top:10px;border-style:dashed" data-act="addp">' + ic('user-plus', 18) + 'Tambah Penerobos</button>' : '<p class="help">Maksimal 2 Penerobos selain Penerobos Utama.</p>') +
      '</div>' : '') +
      '<div class="card"><div class="card-label">Data</div>' +
        row('reload', 'database', 'Muat ulang data dari server', 'Ambil ulang seluruh data terbaru dari Google Sheets') +
      '</div>' +
      '<button class="btn btn-danger btn-block btn-lg" style="margin-top:16px" data-act="logout">' + ic('log-out', 20) + 'Keluar</button>' +
      '<p class="footer-note">Presensi Sambung v' + esc((window.APP_CONFIG || {}).APP_VERSION || '1.0.0') + ' · data tersimpan aman di HP &amp; Google Sheets</p>';
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

/* ---------- Format Laporan ---------- */
Pages.format = {
  focus: true, utama: true,
  mount(el) {
    el.innerHTML = '<div class="js-head"></div><div class="pad">' +
      '<div class="section-label" style="margin-top:4px">Template WhatsApp<span class="aside">Mendukung *tebal* &amp; emoji</span></div>' +
      '<div class="editor"><div class="editor-back js-back" aria-hidden="true"></div><textarea class="js-tpl" spellcheck="false" aria-label="Template laporan WhatsApp"></textarea></div>' +
      '<div class="card" style="margin-top:12px"><div class="card-head" style="margin-bottom:10px"><span style="display:inline-flex;gap:6px;align-items:center;font-weight:600;font-size:14px">' + ic('tag', 16) + 'Ketuk untuk menyisipkan penanda</span><span class="sub" style="color:var(--primary);font-weight:600">' + Report.TOKENS.length + ' tersedia</span></div>' +
        '<div class="tokens">' + Report.TOKENS.map((t) => '<button class="token ' + (/tidak_hadir/.test(t) ? 'muted' : '') + '" data-tok="' + t + '">{' + t + '}</button>').join('') + '</div></div>' +
      '<div class="section-label">Pratinjau Hasil Salin<span class="aside js-pvsrc"></span></div>' +
      '<div class="wa-bubble js-preview"></div>' +
      '<button class="btn-text js-reset" style="margin-top:10px;display:inline-flex;gap:6px;align-items:center">' + ic('rotate-ccw', 16) + 'Kembalikan ke template bawaan</button>' +
      '<div class="section-label" id="pdfOpt">Laporan PDF</div>' +
      '<div class="card" style="display:flex;align-items:center;gap:12px"><div class="row-main"><div class="row-title" style="font-size:15px">Tampilkan peserta tidak hadir di PDF</div><div class="row-sub">Bagian "Tidak Hadir" (L/P) dicetak di bawah daftar hadir</div></div>' +
        '<label class="switch"><input type="checkbox" class="js-pdf"><span class="track"></span></label></div>' +
      '</div>' +
      '<div class="action-bar"><div class="action-bar-inner"><button class="btn btn-primary btn-block btn-lg js-save">' + ic('check', 20) + 'Simpan Pengaturan</button></div></div>';
    this.el = el;
    this.ta = $('.js-tpl', el); this.back = $('.js-back', el);
    this.ta.addEventListener('input', () => this.update());
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tok]');
      if (t) this.insert('{' + t.dataset.tok + '}');
    });
    $('.js-reset', el).onclick = () => { this.ta.value = DEFAULT_TEMPLATE_WA; this.update(); Toast.show('Template bawaan dipulihkan (belum disimpan)', 'info'); };
    $('.js-pdf', el).onchange = () => this.update();
    $('.js-save', el).onclick = () => this.save();
  },
  show(el, params) {
    this.ta.value = LS.get('tplDraft', null) || S.cfg.template_wa || DEFAULT_TEMPLATE_WA;
    $('.js-pdf', el).checked = !!S.cfg.pdf_tampilkan_tidak_hadir;
    this.update();
    if (params[0] === 'pdf') setTimeout(() => $('#pdfOpt', el).scrollIntoView({ behavior: 'smooth', block: 'start' }), 220);
  },
  dirty() { return this.ta.value !== (S.cfg.template_wa || DEFAULT_TEMPLATE_WA) || $('.js-pdf', this.el).checked !== !!S.cfg.pdf_tampilkan_tidak_hadir; },
  update() {
    const v = this.ta.value, known = new Set(Report.TOKENS);
    this.back.innerHTML = esc(v).replace(/\{(\w+)\}/g, (m, k) => (known.has(k) ? '<mark>' + m + '</mark>' : m)) + '\n';
    this.ta.style.height = 'auto';
    this.ta.style.height = Math.max(330, this.ta.scrollHeight) + 'px';
    const kg = Store.kegiatanAll()[0];
    $('.js-preview', this.el).innerHTML = Report.toHtml(Report.render(v, kg ? Report.vars(kg) : Report.sampleVars()));
    $('.js-pvsrc', this.el).textContent = kg ? 'Kegiatan terakhir' : 'Contoh data';
    const d = this.dirty();
    $('.js-head', this.el).innerHTML = UI.focusHead({ title: 'Format Laporan WA/PDF', sub: 'Template WhatsApp & opsi PDF', right: d ? '<span class="pill ok">' + ic('save', 14) + 'Belum disimpan</span>' : '' });
    if (this.ta.value !== (S.cfg.template_wa || DEFAULT_TEMPLATE_WA)) LS.set('tplDraft', this.ta.value); else LS.del('tplDraft');
  },
  insert(text) {
    const ta = this.ta, s = ta.selectionStart === undefined ? ta.value.length : ta.selectionStart, e = ta.selectionEnd === undefined ? s : ta.selectionEnd;
    ta.focus({ preventScroll: true });
    ta.setRangeText(text, s, e, 'end');
    this.update();
    haptic(6);
  },
  async save() {
    const ops = [];
    if (this.ta.value !== S.cfg.template_wa) ops.push(['settings.set', 'cfg:template_wa', { key: 'template_wa', value: this.ta.value }]);
    const pdf = $('.js-pdf', this.el).checked;
    if (pdf !== !!S.cfg.pdf_tampilkan_tidak_hadir) ops.push(['settings.set', 'cfg:pdf_tampilkan_tidak_hadir', { key: 'pdf_tampilkan_tidak_hadir', value: pdf }]);
    if (ops.length) await Store.mutateMany(ops);
    LS.del('tplDraft');
    Toast.show('Pengaturan laporan disimpan');
    App.back('lainnya');
  }
};
