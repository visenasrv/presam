/* =====================================================================
   Absen — layar inti presensi
   • Ketuk baris = centang/batal, tersimpan di HP seketika (draft otomatis)
   • Tab Laki-laki / Perempuan, cari nama, saring Semua/Belum/Sudah
   • Centang dari Penerobos lain muncul otomatis saat tersinkron
   • Baris diperbarui di tempat (tanpa render ulang daftar) → tetap mulus
   ===================================================================== */
'use strict';

Pages.absen = {
  focus: true,
  kid: null, tab: 'L', q: '', filter: 'all', rows: new Map(), sig: '',

  mount(el) {
    el.innerHTML =
      '<div class="js-head"></div>' +
      '<div class="info-strip"><span style="color:var(--primary);display:inline-flex">' + ic('calendar', 18) + '</span><span class="txt js-info"></span><span class="pill sm ok js-draft"></span></div>' +
      '<div class="tabs" role="tablist"><button class="tab" role="tab" data-tab="L">Laki-laki <span class="badge js-cL"></span></button>' +
        '<button class="tab" role="tab" data-tab="P">Perempuan <span class="badge js-cP"></span></button></div>' +
      '<div class="absen-tools"><div class="search input-wrap">' + ic('search', 20) +
        '<input class="input js-q" type="search" placeholder="Cari nama peserta…" autocomplete="off" enterkeyhint="search" aria-label="Cari nama">' +
        '<button class="clear-btn js-qx" hidden aria-label="Kosongkan">' + ic('x', 16) + '</button></div>' +
        '<div class="chips js-filters"></div></div>' +
      '<div class="att-list js-list"></div>' +
      '<div class="js-empty"></div>' +
      '<div class="action-bar"><div class="action-bar-inner">' +
        '<div class="counter js-counter"></div>' +
        '<button class="btn btn-primary btn-block btn-lg js-finish"></button>' +
      '</div></div>';

    this.el = el;
    this.list = $('.js-list', el);
    this.list.addEventListener('click', (e) => {
      const row = e.target.closest('.att-row');
      if (row) this.toggle(row.dataset.pid, row);
    });
    $$('[data-tab]', el).forEach((b) => (b.onclick = () => this.setTab(b.dataset.tab)));
    const q = $('.js-q', el), qx = $('.js-qx', el);
    q.addEventListener('input', () => { this.q = norm(q.value); qx.hidden = !q.value; this.applyFilter(); });
    qx.onclick = () => { q.value = ''; this.q = ''; qx.hidden = true; this.applyFilter(); q.focus(); };
    $('.js-filters', el).addEventListener('click', (e) => {
      const c = e.target.closest('[data-f]');
      if (c) { this.filter = c.dataset.f; this.applyFilter(); }
    });
    $('.js-finish', el).onclick = () => this.finish();
    el.addEventListener('click', (e) => { if (e.target.closest('[data-more]')) this.more(); });
  },

  show(el, params) {
    this.kid = params[0];
    const kg = S.kegiatan.get(this.kid);
    if (!kg) {
      $('.js-head', el).innerHTML = UI.focusHead({ title: 'Absen' });
      this.list.innerHTML = ''; $('.js-empty', el).innerHTML = emptyState('search', 'Kegiatan tidak ditemukan', 'Mungkin sudah dihapus atau belum tersinkron.', '<a class="btn btn-primary" href="#/presensi">Ke Presensi</a>');
      $('.action-bar', el).hidden = true; return;
    }
    $('.action-bar', el).hidden = false;
    this.tab = LS.get('absenTab', 'L');
    this.filter = 'all'; this.q = '';
    $('.js-q', el).value = ''; $('.js-qx', el).hidden = true;
    $('.js-head', el).innerHTML = UI.focusHead({ title: 'Absen', sub: 'Sambung ' + kg.tingkat + ' · ' + kg.judul, right: UI.pill() + '<button class="icon-btn plain" data-more aria-label="Menu lainnya">' + ic('ellipsis-vertical', 22) + '</button>' });
    this.renderHead(kg);
    this.build();
    if (!Store.prLoaded(kg)) this.loadOld(kg);
    App.renderPill();
    Sync.run();
  },

  hide() { if (S.outbox.size) Sync.schedule(200); },

  renderHead(kg) {
    const el = this.el;
    $('.js-info', el).textContent = Fmt.shortY(kg.tanggal) + ' · ' + kg.jam + ' · ' + kg.tempat;
    const d = $('.js-draft', el);
    d.innerHTML = kg.status === 'SELESAI' ? ic('check', 14) + 'Selesai · edit' : ic('check', 14) + 'Draft · tersimpan';
    d.className = 'pill sm js-draft ' + (kg.status === 'SELESAI' ? '' : 'ok');
    $('.js-finish', el).innerHTML = kg.status === 'SELESAI' ? ic('circle-check', 22) + 'Selesai Edit' : ic('circle-check', 22) + 'Simpan &amp; Selesai';
  },

  /** Bangun ulang daftar (dipakai saat buka, ganti tab, atau daftar peserta berubah). */
  build() {
    const kg = S.kegiatan.get(this.kid);
    if (!kg) return;
    const list = Store.absenList(kg);
    this.people = list;
    this.sig = list.map((p) => p.id + p.nama).join('|');
    const mp = S.presensi.get(this.kid);
    const rows = list.filter((p) => p.jk === this.tab);
    $$('[data-tab]', this.el).forEach((b) => { const on = b.dataset.tab === this.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });

    const groups = new Map();
    rows.forEach((p) => {
      const ch = (p.nama.trim()[0] || '#').toUpperCase();
      const k = /[A-Z]/.test(ch) ? ch : '#';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    });
    let html = '', no = 0;
    groups.forEach((arr, letter) => {
      html += '<div class="letter" data-letter="' + letter + '"><span>HURUF ' + letter + '</span><span class="js-ln">' + arr.length + ' nama</span></div>';
      arr.forEach((p) => {
        no++;
        const r = mp && mp.get(p.id);
        html += '<button class="att-row" data-pid="' + esc(p.id) + '" data-l="' + letter + '" data-n="' + esc(norm(p.nama)) + '" role="checkbox" aria-checked="false">' +
          '<span class="chk">' + ic('check', 18, '', 3) + '</span>' +
          '<span class="row-main"><span class="att-name">' + esc(p.nama) + '</span><span class="att-sub"><span class="st"></span></span></span>' +
          '<span class="att-no">' + p2(no) + '</span></button>';
      });
    });
    this.list.innerHTML = html;
    this.rows = new Map();
    $$('.att-row', this.list).forEach((r) => this.rows.set(r.dataset.pid, r));
    this.rows.forEach((row, pid) => this.paintRow(row, mp && mp.get(pid)));
    $('.js-empty', this.el).innerHTML = list.length ? '' :
      emptyState('people', 'Belum ada peserta', Store.isUtama() ? 'Tambahkan peserta atau impor dari Excel terlebih dahulu.' : 'Minta Penerobos Utama menambahkan peserta.',
        Store.isUtama() ? '<a class="btn btn-primary" href="#/peserta">' + ic('user-plus', 20) + 'Kelola Peserta</a>' : '');
    this.applyFilter();
  },

  paintRow(row, r) {
    const on = !!(r && r.h);
    row.classList.toggle('on', on);
    row.setAttribute('aria-checked', on);
    const sub = row.querySelector('.att-sub');
    let html = '<span class="st">' + (on ? 'Hadir · ' + Fmt.time(r.t) : 'Belum diabsen') + '</span>';
    if (on && r.by && S.me && r.by !== S.me.id) html += '<span class="by-tag">dicentang oleh ' + esc(Store.nameOf(r.by)) + '</span>';
    if (sub.innerHTML !== html) sub.innerHTML = html;
  },

  toggle(pid, row) {
    const kg = S.kegiatan.get(this.kid);
    if (!kg) return;
    const mp = S.presensi.get(this.kid);
    const cur = mp && mp.get(pid);
    const h = !(cur && cur.h);
    Store.setPresensi(this.kid, pid, h);           // memori diperbarui seketika, IndexedDB menyusul
    this.paintRow(row, S.presensi.get(this.kid).get(pid));
    row.classList.remove('pop'); void row.offsetWidth; row.classList.add('pop');
    haptic(h ? 10 : 5);
    this.counts(true);
    if (this.filter !== 'all') setTimeout(() => this.applyFilter(), 350);
  },

  setTab(t) {
    if (t === this.tab) return;
    this.tab = t; LS.set('absenTab', t);
    this.build();
    window.scrollTo(0, 0);
  },

  applyFilter() {
    const mp = S.presensi.get(this.kid);
    const visLetters = {};
    this.rows.forEach((row, pid) => {
      const on = !!(mp && mp.get(pid) && mp.get(pid).h);
      const okQ = !this.q || row.dataset.n.indexOf(this.q) > -1;
      const okF = this.filter === 'all' || (this.filter === 'yes' ? on : !on);
      const vis = okQ && okF;
      if (row.hidden === vis) row.hidden = !vis;
      if (vis) visLetters[row.dataset.l] = (visLetters[row.dataset.l] || 0) + 1;
    });
    $$('.letter', this.list).forEach((h) => {
      const n = visLetters[h.dataset.letter] || 0;
      h.hidden = !n;
      h.querySelector('.js-ln').textContent = n + ' nama';
    });
    this.counts();
    const anyVis = Object.keys(visLetters).length > 0;
    const emp = $('.js-empty', this.el);
    if (this.people && this.people.length) {
      emp.innerHTML = anyVis ? '' : '<div class="empty">' + ic('search', 30, 'muted') + '<p>' + (this.q ? 'Nama "' + esc($('.js-q', this.el).value) + '" tidak ditemukan' : this.filter === 'yes' ? 'Belum ada yang dicentang' : 'Semua sudah hadir 🎉') + '</p></div>';
    }
  },

  counts(bump) {
    const kg = S.kegiatan.get(this.kid);
    if (!kg || !this.people) return;
    const mp = S.presensi.get(this.kid);
    let L = 0, P = 0, nL = 0, nP = 0;
    this.people.forEach((p) => {
      const on = !!(mp && mp.get(p.id) && mp.get(p.id).h);
      if (p.jk === 'P') { nP++; if (on) P++; } else { nL++; if (on) L++; }
    });
    const el = this.el;
    $('.js-cL', el).textContent = L + '/' + nL;
    $('.js-cP', el).textContent = P + '/' + nP;
    const tabOn = this.tab === 'P' ? P : L, tabN = this.tab === 'P' ? nP : nL;
    const f = [['all', 'Semua', tabN], ['no', 'Belum hadir', tabN - tabOn], ['yes', 'Sudah hadir', tabOn]];
    $('.js-filters', el).innerHTML = f.map((x) => '<button class="chip ' + (this.filter === x[0] ? 'on' : '') + '" data-f="' + x[0] + '">' + x[1] + ' <span class="count">' + x[2] + '</span></button>').join('');
    const jml = kg.status === 'SELESAI' && kg.jml > 0 ? kg.jml : this.people.length;
    const c = $('.js-counter', el);
    c.innerHTML = '<span><span class="dot"></span><b>Hadir</b> <span class="lp">L ' + L + ' · P ' + P + '</span></span>' +
      '<span class="tot">Total <b class="num">' + (L + P) + '/' + jml + '</b> <span class="lp">(' + Fmt.pct(L + P, jml) + ')</span></span>';
    if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  },

  onData(el, x) {
    if (x.local) return;
    const kg = S.kegiatan.get(this.kid);
    if (!kg) { Toast.show('Kegiatan ini telah dihapus.', 'warn'); App.replace('#/presensi'); return; }
    this.renderHead(kg);
    const sig = Store.absenList(kg).map((p) => p.id + p.nama).join('|');
    if (sig !== this.sig) { const y = window.scrollY; this.build(); window.scrollTo(0, y); return; }
    const mp = S.presensi.get(this.kid);
    this.rows.forEach((row, pid) => this.paintRow(row, mp && mp.get(pid)));
    this.applyFilter();
  },

  async loadOld(kg) {
    if (navigator.onLine === false) { Toast.show('Data presensi lama perlu internet untuk dimuat.', 'warn'); return; }
    const r = await api('kegiatan.presensi', { kid: kg.id });
    if (r.ok) { await Store.applyChanges({ pr: r.data.pr }); if (!S.presensi.has(kg.id)) prMap(kg.id); this.build(); }
  },

  async finish() {
    const kg = S.kegiatan.get(this.kid);
    if (!kg) return;
    if (kg.status === 'SELESAI') { App.replace('#/detail/' + kg.id); return; }
    const st = Store.stats(kg.id);
    if (!st.total) {
      const ok = await Sheet.confirm({ title: 'Belum ada yang dicentang', message: 'Tetap selesaikan presensi dengan 0 peserta hadir?', ok: 'Tetap Selesai' });
      if (!ok) return;
    }
    await Store.finishKegiatan(kg.id);
    Toast.show('Presensi disimpan · ' + st.total + ' hadir');
    App.replace('#/detail/' + kg.id);
  },

  more() {
    const kg = S.kegiatan.get(this.kid);
    if (!kg) return;
    Sheet.menu({
      title: kg.judul,
      items: [
        { icon: 'message-square', label: 'Detail & laporan', onClick: () => (location.hash = '#/detail/' + kg.id) },
        { icon: 'pencil', label: 'Ubah info kegiatan', onClick: () => (location.hash = '#/kegiatan/ubah/' + kg.id) },
        { icon: 'refresh-cw', label: 'Sinkronkan sekarang', onClick: () => Sync.run() }
      ]
    });
  }
};
