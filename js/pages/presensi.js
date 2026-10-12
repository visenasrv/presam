/* =====================================================================
   Presensi — daftar kegiatan hari ini & draft, serta form kegiatan
   ===================================================================== */
'use strict';

function kegiatanCard(k, opt) {
  opt = opt || {};
  const st = Store.stats(k.id) || { total: 0, jml: 0, L: 0, P: 0, pct: 0 };
  const draft = k.status !== 'SELESAI';
  return '<div class="card ' + (draft && opt.active ? 'active' : '') + '">' +
    '<div class="pill-row between">' + UI.lvl(k.tingkat) + UI.status(k) + '</div>' +
    '<div class="card-title">' + esc(k.judul) + '</div>' +
    '<div class="meta-row">' + (k.jam ? ic('clock', 16) + '<span class="num">' + esc(k.jam) + '</span><span class="sep"></span>' : '') + ic('map-pin', 16) + '<span class="ellipsis">' + esc(k.tempat) + '</span></div>' +
    '<div class="att-box"><div class="row1"><span class="num">Hadir ' + st.total + '/' + st.jml + '</span><span class="pct num">' + Fmt.pct(st.total, st.jml) + '</span></div>' +
      '<div class="progress"><span style="width:' + Math.min(100, st.pct).toFixed(1) + '%"></span></div>' +
      '<div class="row2"><span>Dibuat oleh ' + esc(Store.nameOf(k.by)) + '</span><span class="num">L ' + st.L + ' · P ' + st.P + '</span></div></div>' +
    (draft
      ? '<button class="btn ' + (opt.active ? 'btn-primary' : 'btn-secondary') + ' btn-block" style="margin-top:14px" data-go="#/absen/' + esc(k.id) + '">' + (opt.active ? 'Lanjutkan Absen ' + ic('arrow-right', 18) : 'Buka') + '</button>'
      : '<button class="btn btn-secondary btn-block" style="margin-top:14px" data-go="#/detail/' + esc(k.id) + '">Lihat Detail &amp; Laporan</button>') +
  '</div>';
}

Pages.presensi = {
  nav: 'presensi',
  mount(el) {
    el.innerHTML = '<div class="js-body"></div><a class="fab" href="#/kegiatan/baru">' + ic('plus', 22, '', 2.2) + 'Kegiatan Baru</a>';
  },
  show(el) { this.render(el); },
  onData(el) { this.render(el); },
  render(el) {
    const today = Fmt.ymd();
    const all = Store.kegiatanAll();
    const todays = all.filter((k) => k.tanggal === today).sort((a, b) => (a.jam || '99').localeCompare(b.jam || '99'));
    const drafts = all.filter((k) => k.status !== 'SELESAI' && k.tanggal !== today);
    let firstDraft = true;
    $('.js-body', el).innerHTML =
      '<div class="page-head"><h1 class="h1">Presensi</h1><div class="page-sub">' + esc(Fmt.long(today)) + '</div></div>' +
      '<div class="section-label">Kegiatan Hari Ini<span class="aside">' + todays.length + ' kegiatan</span></div>' +
      (todays.length
        ? todays.map((k) => { const active = k.status !== 'SELESAI' && firstDraft; if (active) firstDraft = false; return kegiatanCard(k, { active }); }).join('')
        : '<div class="card">' + emptyState('clipboard', 'Belum ada kegiatan hari ini', 'Buat kegiatan untuk mulai mengabsen. Bisa tanpa internet.', '<a class="btn btn-primary" href="#/kegiatan/baru">' + ic('plus', 20) + 'Buat Kegiatan</a>') + '</div>') +
      (drafts.length
        ? '<div class="section-label">Draft Belum Selesai<span class="aside">' + drafts.length + '</span></div><div class="card" style="padding:4px 16px">' +
          drafts.map((k) => '<a class="list-row" href="#/absen/' + esc(k.id) + '" style="color:inherit"><div class="row-main"><div class="row-title ellipsis">' + esc(Fmt.short(k.tanggal)) + ' · ' + esc(k.judul) + '</div>' +
            '<div class="row-sub">' + ic('hard-drive', 14) + 'Draft tersimpan di HP · ' + esc((Store.stats(k.id) || {}).total || 0) + ' hadir</div></div>' + UI.status(k) + ic('chevron-right', 18, 'muted') + '</a>').join('') + '</div>'
        : '');
  }
};

/* ---------- Form kegiatan (baru / ubah) ---------- */
Pages.kegiatan = {
  focus: true,
  mount(el) {
    el.innerHTML =
      '<div class="js-head"></div>' +
      '<form class="pad" novalidate id="kgForm">' +
        '<div class="field"><div class="label"><span>Tingkat Sambung<span class="req">*</span></span></div>' +
          '<div class="seg" role="radiogroup" id="kgTingkat">' + ['Kelompok', 'Desa', 'Daerah'].map((t) => '<button type="button" role="radio" data-t="' + t + '">' + t + '</button>').join('') + '</div>' +
          '<div class="help">Pilih lingkup kegiatan sambung yang akan diabsen.</div></div>' +
        '<div class="field"><label class="label" for="kgJudul"><span>Judul Kegiatan<span class="req">*</span></span><span class="err-inline" data-err="judul" hidden></span></label>' +
          '<div class="input-wrap"><input class="input" id="kgJudul" name="judul" maxlength="120" placeholder="contoh: Pengajian Rutin" autocomplete="off" list="dlJudul" enterkeyhint="next">' +
          '<button type="button" class="clear-btn" data-clear="kgJudul" hidden aria-label="Kosongkan">' + ic('x', 16) + '</button></div><datalist id="dlJudul"></datalist></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label class="label" for="kgTanggal"><span>Tanggal<span class="req">*</span></span></label><input class="input num" type="date" id="kgTanggal"></div>' +
          '<div class="field"><label class="label" for="kgJam"><span>Jam <span class="muted" style="font-weight:500">(opsional)</span></span></label>' +
            '<div class="input-wrap"><input class="input num" type="time" id="kgJam"><button type="button" class="clear-btn js-jamx" hidden aria-label="Kosongkan jam">' + ic('x', 16) + '</button></div>' +
            '<button type="button" class="btn-text js-jamnow" style="font-size:13px;padding:6px 0 0">' + ic('clock', 14) + ' Isi jam sekarang</button></div>' +
        '</div>' +
        '<div class="field"><label class="label" for="kgTempat"><span>Tempat<span class="req">*</span></span><span class="err-inline" data-err="tempat" hidden></span></label>' +
          '<input class="input" id="kgTempat" maxlength="120" placeholder="contoh: Masjid Al-Ikhlas" autocomplete="off" list="dlTempat" enterkeyhint="done"><datalist id="dlTempat"></datalist>' +
          '<div class="error-text" data-errmsg="tempat" hidden></div></div>' +
        '<div class="banner info">' + ic('info', 20) + '<div><b>Bekerja offline:</b> bisa dibuat tanpa internet. Data dan centang presensi dikirim otomatis saat HP kembali online.</div></div>' +
      '</form>' +
      '<div class="action-bar"><div class="action-bar-inner btn-row"><button class="btn btn-ghost" type="button" data-back="presensi">Batal</button>' +
        '<button class="btn btn-primary grow" type="button" id="kgSave"></button></div></div>';
    const seg = $('#kgTingkat', el);
    seg.onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) this.setTingkat(b.dataset.t); };
    const judul = $('#kgJudul', el), clr = $('[data-clear]', el);
    judul.addEventListener('input', () => { clr.hidden = !judul.value; this.clearErr('judul'); });
    clr.onclick = () => { judul.value = ''; clr.hidden = true; judul.focus(); };
    $('#kgTempat', el).addEventListener('input', () => this.clearErr('tempat'));
    $('#kgForm', el).addEventListener('submit', (e) => { e.preventDefault(); this.save(); });
    $('#kgSave', el).onclick = () => this.save();
    const jam = $('#kgJam', el);
    jam.addEventListener('input', () => this.jamUI());
    $('.js-jamx', el).onclick = () => { jam.value = ''; this.jamUI(); };
    $('.js-jamnow', el).onclick = () => { jam.value = Fmt.hm(); this.jamUI(); };
    this.el = el;
  },
  show(el, params) {
    const editId = params[0] === 'ubah' ? params[1] : null;
    const kg = editId ? S.kegiatan.get(editId) : null;
    this.editId = kg ? kg.id : null;
    $('.js-head', el).innerHTML = UI.focusHead({ title: kg ? 'Ubah Kegiatan' : 'Kegiatan Baru', sub: kg ? kg.judul : 'Buat kegiatan sambung' });
    $('#kgSave', el).innerHTML = kg ? ic('check', 20) + 'Simpan Perubahan' : 'Simpan &amp; Mulai Absen ' + ic('arrow-right', 20);
    const last = LS.get('lastTingkat', 'Kelompok');
    this.setTingkat(kg ? kg.tingkat : last);
    $('#kgJudul', el).value = kg ? kg.judul : '';
    $('[data-clear]', el).hidden = !(kg && kg.judul);
    $('#kgTanggal', el).value = kg ? kg.tanggal : Fmt.ymd();
    $('#kgJam', el).value = kg ? kg.jam : '';
    this.jamUI();
    $('#kgTempat', el).value = kg ? kg.tempat : LS.get('lastTempat', '');
    ['judul', 'tempat'].forEach((f) => this.clearErr(f));
    // Saran dari kegiatan sebelumnya
    const uniq = (f) => [...new Set(Store.kegiatanAll().map((k) => k[f]).filter(Boolean))].slice(0, 12);
    $('#dlJudul', el).innerHTML = uniq('judul').map((v) => '<option value="' + esc(v) + '">').join('');
    $('#dlTempat', el).innerHTML = uniq('tempat').map((v) => '<option value="' + esc(v) + '">').join('');
    if (!kg) setTimeout(() => $('#kgJudul', el).focus({ preventScroll: true }), 200);
  },
  jamUI() {
    const v = $('#kgJam', this.el).value;
    $('.js-jamx', this.el).hidden = !v;
    $('.js-jamnow', this.el).hidden = !!v;
  },
  setTingkat(t) {
    this.tingkat = t;
    $$('#kgTingkat [data-t]', this.el).forEach((b) => {
      const on = b.dataset.t === t;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
      b.innerHTML = (on ? ic('check', 18, '', 2.4) : '') + b.dataset.t;
    });
  },
  err(f, msg) {
    const el = this.el;
    const input = $(f === 'judul' ? '#kgJudul' : '#kgTempat', el);
    input.classList.add('invalid');
    const lab = $('[data-err="' + f + '"]', el); lab.hidden = false; lab.innerHTML = ic('circle-alert', 14) + esc(msg);
  },
  clearErr(f) {
    const el = this.el;
    $(f === 'judul' ? '#kgJudul' : '#kgTempat', el).classList.remove('invalid');
    $('[data-err="' + f + '"]', el).hidden = true;
  },
  async save() {
    const el = this.el;
    const judul = $('#kgJudul', el).value.trim(), tempat = $('#kgTempat', el).value.trim();
    const tanggal = $('#kgTanggal', el).value, jam = $('#kgJam', el).value;
    let bad = false;
    if (!judul) { this.err('judul', 'Judul wajib diisi'); bad = true; }
    if (!tempat) { this.err('tempat', 'Tempat wajib diisi'); bad = true; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) { Toast.show('Tanggal wajib diisi.', 'err'); bad = true; }
    if (jam && !/^\d{2}:\d{2}$/.test(jam)) { Toast.show('Format jam tidak valid.', 'err'); bad = true; }
    if (bad) { haptic([20, 30, 20]); return; }
    LS.set('lastTingkat', this.tingkat); LS.set('lastTempat', tempat);
    const id = await Store.saveKegiatan({ id: this.editId, tingkat: this.tingkat, judul, tanggal, jam, tempat });
    if (this.editId) { Toast.show('Perubahan kegiatan disimpan'); App.back('detail/' + id); }
    else App.replace('#/absen/' + id);
  }
};
