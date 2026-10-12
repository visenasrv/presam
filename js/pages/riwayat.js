/* =====================================================================
   Riwayat Kegiatan — cari, saring tingkat / tanggal / status
   ===================================================================== */
'use strict';

Pages.riwayat = {
  nav: 'riwayat',
  f: { q: '', tingkat: '', status: '', from: '', to: '', label: 'Semua' },
  limit: 30,

  mount(el) {
    el.innerHTML =
      '<div class="page-head"><h1 class="h1">Riwayat Kegiatan</h1><div class="page-sub">Arsip sambung kelompok, desa &amp; daerah</div></div>' +
      '<div class="search input-wrap">' + ic('search', 20) + '<input class="input js-q" type="search" placeholder="Cari judul atau tempat…" autocomplete="off" aria-label="Cari kegiatan"></div>' +
      '<div class="chips js-filters" style="margin-bottom:4px"></div>' +
      '<div class="js-list"></div>';
    this.el = el;
    const q = $('.js-q', el);
    q.addEventListener('input', debounce(() => { this.f.q = norm(q.value); this.limit = 30; this.renderList(); }, 120));
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-f]')) { this.f[e.target.dataset.f] = e.target.value; this.limit = 30; this.render(); }
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-date]')) this.dateSheet();
      else if (e.target.closest('[data-more]')) { this.limit += 40; this.renderList(); }
      else if (e.target.closest('[data-reset]')) { this.f = { q: '', tingkat: '', status: '', from: '', to: '', label: 'Semua' }; q.value = ''; this.render(); }
    });
  },
  show() { this.render(); },
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
    return '<a class="card tap" style="display:block;color:inherit" href="#/' + (k.status === 'SELESAI' ? 'detail/' : 'absen/') + esc(k.id) + '">' +
      '<div class="pill-row between">' + UI.lvl(k.tingkat) + UI.status(k) + '</div>' +
      '<div class="card-title">' + esc(k.judul) + '</div>' +
      '<div class="meta-row">' + ic('clock', 15) + '<span class="ellipsis">' + esc(Fmt.short(k.tanggal) + ' · ' + k.jam + ' · ' + k.tempat) + '</span></div>' +
      '<div class="att-box"><div class="row1"><span class="num">Hadir ' + st.total + '/' + st.jml + '</span><span class="pct num">' + Fmt.pct(st.total, st.jml) + '</span></div>' + UI.progress(st.pct) + '</div>' +
      '<div class="link-row">' + pdf + '<span class="btn-text" style="padding:0">' + (k.status === 'SELESAI' ? 'Buka Detail' : 'Lanjutkan') + ' →</span></div>' +
    '</a>';
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
