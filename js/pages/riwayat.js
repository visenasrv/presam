/* =====================================================================
   Riwayat Kegiatan — cari, saring tingkat / tanggal / status
   ===================================================================== */
'use strict';

Pages.riwayat = {
  nav: 'riwayat',
  f: { q: '', tingkat: '', status: '', from: '', to: '', label: 'Semua' },
  limit: 30, selecting: false, sel: new Set(),

  mount(el) {
    el.innerHTML =
      '<div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div><h1 class="h1">Riwayat Kegiatan</h1><div class="page-sub">Arsip sambung kelompok, desa &amp; daerah</div></div>' +
        '<button class="btn btn-ghost btn-sm js-pick" style="margin-top:4px" hidden>' + ic('check-check', 18) + 'Pilih</button></div>' +
      '<div class="search input-wrap">' + ic('search', 20) + '<input class="input js-q" type="search" placeholder="Cari judul atau tempat…" autocomplete="off" aria-label="Cari kegiatan"></div>' +
      '<div class="chips js-filters" style="margin-bottom:4px"></div>' +
      '<div class="js-list"></div>' +
      '<div class="sel-bar js-selbar" hidden><button class="btn btn-ghost btn-sm" data-selcancel>Batal</button><button class="btn-text" data-selall>Pilih semua</button>' +
        '<button class="btn btn-danger solid btn-sm js-seldel" data-seldel disabled>' + ic('trash-2', 16) + 'Hapus</button></div>';
    this.el = el;
    const q = $('.js-q', el);
    q.addEventListener('input', debounce(() => { this.f.q = norm(q.value); this.limit = 30; this.renderList(); }, 120));
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-f]')) { this.f[e.target.dataset.f] = e.target.value; this.limit = 30; this.render(); }
    });
    $('.js-pick', el).onclick = () => this.setSelecting(!this.selecting);
    el.addEventListener('click', (e) => {
      const menu = e.target.closest('[data-kmenu]'), card = e.target.closest('[data-kid]');
      if (menu) { e.stopPropagation(); this.cardMenu(menu.dataset.kmenu); return; }
      if (e.target.closest('[data-selcancel]')) { this.setSelecting(false); return; }
      if (e.target.closest('[data-selall]')) { this.filtered().slice(0, this.limit).forEach((k) => this.sel.add(k.id)); this.renderList(); return; }
      if (e.target.closest('[data-seldel]')) { this.removeMany([...this.sel]); return; }
      if (card) {
        if (this.selecting) { const id = card.dataset.kid; this.sel.has(id) ? this.sel.delete(id) : this.sel.add(id); haptic(6); this.renderList(); }
        else location.hash = card.dataset.href;
        return;
      }
      if (e.target.closest('[data-date]')) this.dateSheet();
      else if (e.target.closest('[data-more]')) { this.limit += 40; this.renderList(); }
      else if (e.target.closest('[data-reset]')) { this.f = { q: '', tingkat: '', status: '', from: '', to: '', label: 'Semua' }; q.value = ''; this.render(); }
    });
  },
  show() { this.setSelecting(false, true); this.render(); },
  hide() { this.setSelecting(false, true); },

  setSelecting(on, silent) {
    this.selecting = on && Store.isUtama();
    this.sel.clear();
    const el = this.el;
    $('.js-selbar', el).hidden = !this.selecting;
    $('.js-pick', el).innerHTML = this.selecting ? ic('x', 18) + 'Batal' : ic('check-check', 18) + 'Pilih';
    if (!silent) this.renderList();
  },

  cardMenu(id) {
    const k = S.kegiatan.get(id);
    if (!k) return;
    Sheet.menu({
      title: k.judul,
      items: [
        { icon: k.status === 'SELESAI' ? 'file-text' : 'clipboard-check', label: k.status === 'SELESAI' ? 'Buka detail & laporan' : 'Lanjutkan absen', onClick: () => (location.hash = this.href(k)) },
        { icon: 'check-check', label: 'Pilih beberapa untuk dihapus', onClick: () => { this.setSelecting(true); this.sel.add(id); this.renderList(); } },
        { icon: 'trash-2', label: 'Hapus riwayat ini', danger: true, onClick: () => this.removeMany([id]) }
      ]
    });
  },

  async removeMany(ids) {
    if (!ids.length || !Store.isUtama()) return;
    const one = ids.length === 1 ? S.kegiatan.get(ids[0]) : null;
    const ok = await Sheet.confirm({
      title: one ? 'Hapus riwayat ini?' : 'Hapus ' + ids.length + ' riwayat kegiatan?',
      message: (one ? '"' + one.judul + '" (' + Fmt.short(one.tanggal) + ')' : ids.length + ' kegiatan terpilih') +
        ' beserta presensinya tidak tampil lagi di aplikasi. Data tetap tercatat di Google Sheets sebagai arsip.',
      ok: 'Hapus', danger: true
    });
    if (!ok) return;
    await Store.mutateMany(ids.map((id) => ['kegiatan.delete', 'kgd:' + id, { id }]));
    this.setSelecting(false);
    Toast.show(ids.length === 1 ? 'Riwayat dihapus' : ids.length + ' riwayat dihapus');
  },

  href(k) { return '#/' + (k.status === 'SELESAI' ? 'detail/' : 'absen/') + k.id; },
  onData() { this.renderList(); },

  render() { this.renderFilters(); this.renderList(); },

  renderFilters() {
    const f = this.f;
    const sel = (name, label, opts) => '<label class="chip select ' + (f[name] ? 'on' : '') + '">' + esc(label) + ic('chevron-down', 16) +
      '<select data-f="' + name + '">' + opts.map((o) => '<option value="' + o[0] + '"' + (f[name] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>';
    $('.js-filters', this.el).innerHTML =
      sel('tingkat', 'Tingkat: ' + (f.tingkat || 'Semua'), [['', 'Semua tingkat'], ['Kelompok', 'Sambung Kelompok'], ['Desa', 'Sambung Desa'], ['Daerah', 'Sambung Daerah']]) +
      '<button class="chip ' + (f.from || f.to ? 'on' : '') + '" data-date>' + ic('calendar-range', 16) + 'Tanggal: ' + esc(f.label) + ic('chevron-down', 16) + '</button>' +
      sel('status', 'Status: ' + ({ '': 'Semua', DRAFT: 'Draft', SELESAI: 'Selesai', PENDING: 'Belum terkirim' })[f.status], [['', 'Semua status'], ['DRAFT', 'Draft'], ['SELESAI', 'Selesai'], ['PENDING', 'Belum terkirim']]);
  },

  filtered() {
    const f = this.f, pend = Store.pendingKegiatan();
    return Store.kegiatanAll().filter((k) =>
      (!f.tingkat || k.tingkat === f.tingkat) &&
      (!f.status || (f.status === 'PENDING' ? pend.has(k.id) : k.status === f.status)) &&
      (!f.from || k.tanggal >= f.from) && (!f.to || k.tanggal <= f.to) &&
      (!f.q || norm(k.judul + ' ' + k.tempat).indexOf(f.q) > -1));
  },

  renderList() {
    const list = this.filtered(), box = $('.js-list', this.el);
    $('.js-pick', this.el).hidden = !Store.isUtama() || !list.length;
    const db = $('.js-seldel', this.el);
    db.disabled = !this.sel.size;
    db.innerHTML = ic('trash-2', 16) + 'Hapus' + (this.sel.size ? ' (' + this.sel.size + ')' : '');
    const any = Store.kegiatanAll().length;
    if (!list.length) {
      box.innerHTML = any
        ? emptyState('search', 'Tidak ada kegiatan yang cocok', 'Coba ubah kata kunci atau saringan.', '<button class="btn btn-secondary" data-reset>Hapus saringan</button>')
        : emptyState('history', 'Belum ada riwayat', 'Kegiatan yang sudah diabsen akan tersimpan di sini.', '<a class="btn btn-primary" href="#/kegiatan/baru">' + ic('plus', 20) + 'Buat Kegiatan</a>');
      return;
    }
    const counts = {};
    list.forEach((k) => { const m = k.tanggal.slice(0, 7); counts[m] = (counts[m] || 0) + 1; });
    let html = '', cur = '';
    list.slice(0, this.limit).forEach((k) => {
      const m = k.tanggal.slice(0, 7);
      if (m !== cur) { cur = m; html += '<div class="month-head"><span>' + esc(Fmt.monthYear(k.tanggal)) + '</span><span>' + counts[m] + ' kegiatan</span></div>'; }
      html += this.card(k);
    });
    if (list.length > this.limit) html += '<button class="more-btn" data-more>Tampilkan lebih banyak (' + (list.length - this.limit) + ' lagi)</button>';
    box.innerHTML = html;
  },

  card(k) {
    const st = Store.stats(k.id);
    const pdf = k.pdf ? (k.pdfStale ? '<span class="pill sm warn">' + ic('file-text', 13) + 'PDF perlu diperbarui</span>' : '<span style="color:var(--primary);font-weight:600;display:inline-flex;gap:5px;align-items:center">' + ic('file-text', 16) + 'PDF ✓</span>')
      : '<span class="muted" style="font-style:italic;display:inline-flex;gap:5px;align-items:center">' + ic('file-text', 16) + 'Belum dibuat PDF</span>';
    const on = this.sel.has(k.id), utama = Store.isUtama();
    return '<div class="card tap rw-card' + (this.selecting ? ' selecting' : '') + (on ? ' picked' : '') + '" role="' + (this.selecting ? 'checkbox' : 'link') + '"' + (this.selecting ? ' aria-checked="' + on + '"' : '') +
      ' data-kid="' + esc(k.id) + '" data-href="' + esc(this.href(k)) + '" tabindex="0">' +
      '<div class="pill-row between">' + (this.selecting ? '<span class="chk">' + ic('check', 16, '', 3) + '</span>' : '') + UI.lvl(k.tingkat) + '<span style="flex:1"></span>' + UI.status(k) +
        (utama && !this.selecting ? '<button class="icon-btn plain rw-menu" data-kmenu="' + esc(k.id) + '" aria-label="Aksi riwayat">' + ic('ellipsis-vertical', 20) + '</button>' : '') + '</div>' +
      '<div class="card-title">' + esc(k.judul) + '</div>' +
      '<div class="meta-row">' + ic('clock', 15) + '<span class="ellipsis">' + esc([Fmt.short(k.tanggal), k.jam, k.tempat].filter(Boolean).join(' · ')) + '</span></div>' +
      '<div class="att-box"><div class="row1"><span class="num">Hadir ' + st.total + '/' + st.jml + '</span><span class="pct num">' + Fmt.pct(st.total, st.jml) + '</span></div>' + UI.progress(st.pct) + '</div>' +
      '<div class="link-row">' + pdf + '<span class="btn-text" style="padding:0">' + (k.status === 'SELESAI' ? 'Buka Detail' : 'Lanjutkan') + ' →</span></div>' +
    '</div>';
  },

  dateSheet() {
    const f = this.f, today = new Date(), y = today.getFullYear(), m = today.getMonth();
    const ymd = (a, b, c) => Fmt.ymd(new Date(a, b, c));
    const presets = [
      ['Semua', '', ''], ['Bulan ini', ymd(y, m, 1), ymd(y, m + 1, 0)], ['Bulan lalu', ymd(y, m - 1, 1), ymd(y, m, 0)],
      ['3 bulan', ymd(y, m - 2, 1), ymd(y, m + 1, 0)], ['Tahun ini', ymd(y, 0, 1), ymd(y, 11, 31)]
    ];
    Sheet.open({
      title: 'Saring tanggal',
      html: '<div class="chips" style="margin:4px -16px 16px">' + presets.map((p, i) => '<button class="chip ' + (f.label === p[0] ? 'on' : '') + '" data-p="' + i + '">' + p[0] + '</button>').join('') + '</div>' +
        '<div class="grid-2"><div class="field"><label class="label">Dari</label><input class="input" type="date" id="dFrom" value="' + esc(f.from) + '"></div>' +
        '<div class="field"><label class="label">Sampai</label><input class="input" type="date" id="dTo" value="' + esc(f.to) + '"></div></div>' +
        '<button class="btn btn-primary btn-block" id="dApply">Terapkan</button>',
      onMount: (el, s) => {
        $$('[data-p]', el).forEach((b) => (b.onclick = () => {
          const p = presets[+b.dataset.p];
          Object.assign(this.f, { from: p[1], to: p[2], label: p[0] }); s.close(); this.render();
        }));
        $('#dApply', el).onclick = () => {
          const a = $('#dFrom', el).value, b = $('#dTo', el).value;
          Object.assign(this.f, { from: a, to: b, label: a || b ? (a ? Fmt.dm(a) : '…') + '–' + (b ? Fmt.dm(b) : '…') : 'Semua' });
          s.close(); this.render();
        };
      }
    });
  }
};
