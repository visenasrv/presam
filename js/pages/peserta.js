/* =====================================================================
   Data Peserta (tambah/ubah/hapus: Penerobos Utama) & Impor Excel
   ===================================================================== */
'use strict';

Pages.peserta = {
  nav: 'peserta',
  q: '', jk: '', open: null,

  mount(el) {
    el.innerHTML = '<div class="js-head"></div>' +
      '<div class="search input-wrap">' + ic('search', 20) + '<input class="input js-q" type="search" placeholder="Cari nama peserta…" autocomplete="off" aria-label="Cari peserta"></div>' +
      '<div class="chips js-chips" style="margin-bottom:14px"></div>' +
      '<div class="js-list"></div>' +
      '<button class="fab js-fab">' + ic('plus', 22, '', 2.2) + 'Tambah Peserta</button>';
    this.el = el;
    $('.js-q', el).addEventListener('input', debounce((e) => { this.q = norm(e.target.value); this.renderList(); }, 100));
    $('.js-fab', el).onclick = () => this.form();
    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-jk]');
      if (c) { this.jk = c.dataset.jk; this.render(); return; }
      const a = e.target.closest('[data-act]');
      if (a) {
        e.stopPropagation();
        const id = a.dataset.id;
        if (a.dataset.act === 'edit') this.form(S.peserta.get(id));
        else if (a.dataset.act === 'del') this.remove(S.peserta.get(id));
        else if (a.dataset.act === 'menu') { this.open = this.open === id ? null : id; this.renderList(); }
        return;
      }
      const card = e.target.closest('.person-card');
      if (card && Store.isUtama()) { this.open = this.open === card.dataset.id ? null : card.dataset.id; this.renderList(); }
    });
  },
  show() { this.open = null; this.render(); },
  onData() { this.render(); },

  render() {
    const el = this.el, utama = Store.isUtama();
    const ps = Store.pesertaAktif();
    const nL = ps.filter((p) => p.jk === 'L').length;
    $('.js-head', el).innerHTML = '<div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">' +
      '<div><h1 class="h1">Data Peserta</h1><div class="page-sub">' + ps.length + ' peserta aktif terdaftar</div></div>' +
      (utama ? '<a class="btn btn-secondary btn-sm" href="#/impor" style="margin-top:4px">' + ic('file-spreadsheet', 18) + 'Impor Excel</a>' : '') + '</div>';
    $('.js-chips', el).innerHTML = [['', 'Semua', ps.length], ['L', 'Laki-laki', nL], ['P', 'Perempuan', ps.length - nL]]
      .map((x) => '<button class="chip ' + (this.jk === x[0] ? 'on' : '') + '" data-jk="' + x[0] + '">' + x[1] + ' <span class="count">' + x[2] + '</span></button>').join('');
    $('.js-fab', el).hidden = !utama;
    this.renderList();
  },

  renderList() {
    const utama = Store.isUtama(), att = Store.attendance('');
    const all = Store.pesertaAktif();
    const list = all.filter((p) => (!this.jk || p.jk === this.jk) && (!this.q || norm(p.nama).indexOf(this.q) > -1));
    const box = $('.js-list', this.el);
    if (!all.length) {
      box.innerHTML = '<div class="card">' + emptyState('people', 'Belum ada peserta', utama ? 'Tambahkan satu per satu atau impor sekaligus dari Excel.' : 'Peserta dikelola oleh Penerobos Utama.',
        utama ? '<div class="btn-row" style="width:100%;max-width:320px"><a class="btn btn-secondary" href="#/impor">' + ic('file-spreadsheet', 18) + 'Impor</a><button class="btn btn-primary" data-act="new">' + ic('plus', 18) + 'Tambah</button></div>' : '') + '</div>';
      const nb = $('[data-act="new"]', box); if (nb) nb.onclick = (e) => { e.stopPropagation(); this.form(); };
      return;
    }
    if (!list.length) { box.innerHTML = emptyState('search', 'Peserta tidak ditemukan', 'Coba kata kunci lain.'); return; }
    box.innerHTML = list.map((p) => {
      const a = att.get(p.id), pct = a && a.pct !== null ? a.pct : null;
      const open = this.open === p.id, dk = Store.dapukanOf(p.id);
      return '<div class="card person-card ' + (open ? 'open' : '') + '" data-id="' + esc(p.id) + '"><div style="display:flex;align-items:center;gap:12px">' +
        '<span class="avatar ' + p.jk + '">' + esc(Fmt.initials(p.nama)) + '</span>' +
        '<div class="row-main"><div class="row-title">' + esc(p.nama) + '</div><div class="row-sub">' + UI.jk(p.jk) + (dk ? '<span class="pill sm musy">' + esc(dk.nama) + '</span>' : '') +
          (p.lahir ? '<span class="num">' + esc(Fmt.dMon(p.lahir)) + '</span>' : '<span style="font-style:italic">Tgl lahir —</span>') + '</div></div>' +
        '<div class="row-end"><div class="pct-big ' + (pct === null ? 'muted' : Fmt.pctClass(pct)) + '">' + (pct === null ? '—' : Math.round(pct) + '%') + '</div><div class="pct-cap">kehadiran</div></div>' +
        (utama ? '<button class="icon-btn plain" data-act="menu" data-id="' + esc(p.id) + '" aria-label="Aksi">' + ic('ellipsis-vertical', 20) + '</button>' : '') +
        '</div>' +
        (open ? '<div class="actions"><button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + esc(p.id) + '">' + ic('pencil', 16) + 'Ubah</button>' +
          '<button class="btn btn-danger btn-sm" data-act="del" data-id="' + esc(p.id) + '">' + ic('trash-2', 16) + 'Hapus</button></div>' : '') +
      '</div>';
    }).join('');
  },

  form(p) {
    if (!Store.isUtama()) return;
    let jk = p ? p.jk : (this.jk || 'L');
    Sheet.open({
      title: p ? 'Ubah Peserta' : 'Tambah Peserta',
      html: '<form id="psForm" novalidate>' +
        '<div class="field"><label class="label" for="psNama"><span>Nama<span class="req">*</span></span></label><input class="input" id="psNama" maxlength="80" autocomplete="off" autocapitalize="words" value="' + esc(p ? p.nama : '') + '" autofocus>' +
          '<div class="error-text" id="psErr" hidden></div></div>' +
        '<div class="field"><div class="label"><span>Jenis Kelamin<span class="req">*</span></span></div><div class="seg" id="psJk"><button type="button" data-v="L">Laki-laki</button><button type="button" data-v="P">Perempuan</button></div></div>' +
        '<div class="field"><label class="label" for="psLahir"><span>Tanggal Lahir <span class="muted" style="font-weight:500">(opsional)</span></span></label><input class="input" type="date" id="psLahir" value="' + esc(p ? p.lahir : '') + '" max="' + Fmt.ymd() + '"></div>' +
        '<div class="btn-row"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow" type="submit">' + ic('check', 18) + 'Simpan</button></div></form>',
      onMount: (el, s) => {
        const seg = $('#psJk', el);
        const paint = () => $$('[data-v]', seg).forEach((b) => b.classList.toggle('on', b.dataset.v === jk));
        seg.onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { jk = b.dataset.v; paint(); } };
        paint();
        $('[data-x]', el).onclick = () => s.close();
        $('#psForm', el).onsubmit = async (e) => {
          e.preventDefault();
          const nama = $('#psNama', el).value.replace(/\s+/g, ' ').trim();
          if (!nama) { const er = $('#psErr', el); er.hidden = false; er.textContent = 'Nama wajib diisi.'; $('#psNama', el).classList.add('invalid'); return; }
          const dup = Store.pesertaAktif().find((x) => x.id !== (p && p.id) && x.jk === jk && norm(x.nama) === norm(nama));
          if (dup && !(await Sheet.confirm({ title: 'Nama sudah terdaftar', message: '"' + dup.nama + '" sudah ada. Tetap simpan sebagai peserta lain?', ok: 'Tetap Simpan' }))) return;
          await Store.savePeserta({ id: p && p.id, nama, jk, lahir: $('#psLahir', el).value });
          s.close();
          Toast.show(p ? 'Data peserta diperbarui' : nama + ' ditambahkan');
        };
      }
    });
  },

  async remove(p) {
    if (!p) return;
    const ok = await Sheet.confirm({ title: 'Hapus ' + p.nama + '?', message: 'Peserta tidak muncul di presensi berikutnya. Riwayat kehadiran sebelumnya tetap tersimpan.', ok: 'Hapus', danger: true });
    if (!ok) return;
    await Store.deletePeserta(p.id);
    this.open = null;
    Toast.show(p.nama + ' dihapus');
  }
};

/* ---------- Impor dari Excel ---------- */
Pages.impor = {
  focus: true, utama: true,
  rows: null, file: null, dupMode: 'skip',

  mount(el) {
    el.innerHTML = '<div class="js-head">' + UI.focusHead({ title: 'Impor Peserta dari Excel', sub: 'File .xlsx / .xls / .csv' }) + '</div>' +
      '<div class="pad js-body"></div>' +
      '<input type="file" class="js-file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" hidden>' +
      '<div class="action-bar"><div class="action-bar-inner btn-row"><button class="btn btn-ghost" data-back="peserta">Batal</button><button class="btn btn-primary grow js-save" disabled>Simpan</button></div></div>';
    this.el = el;
    $('.js-file', el).addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) this.parse(f); });
    $('.js-save', el).onclick = () => this.save();
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      if (t.dataset.act === 'tpl') this.template();
      else if (t.dataset.act === 'pick') $('.js-file', el).click();
    });
    el.addEventListener('change', (e) => { if (e.target.name === 'dup') { this.dupMode = e.target.value; this.renderSave(); } });
  },
  show() { this.rows = null; this.file = null; this.dupMode = 'skip'; this.render(); loadScript('lib/xlsx.mini.min.js').catch(() => {}); },

  render() {
    const r = this.rows, el = this.el;
    const step = r ? 3 : 1;
    const st = (n, label) => '<div class="step ' + (n < step ? 'done' : n === step ? 'on' : '') + '"><span class="n">' + (n < step ? ic('check', 16, '', 3) : n) + '</span>' + label + '</div>';
    let html = '<div class="card"><div class="stepper">' + st(1, 'Unduh') + st(2, 'Pilih File') + st(3, 'Periksa &amp; Simpan') + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Format Kolom Wajib</h3><span class="sub">Baris pertama = judul kolom</span></div>' +
        '<div class="cols-pill"><b>Nama</b>|<b>Jenis Kelamin</b>|<span>Tanggal Lahir (opsional)</span></div>' +
        '<button class="btn btn-ghost btn-block" data-act="tpl">' + ic('download', 18) + 'Unduh Template Excel</button>' +
        '<p class="help">Jenis kelamin boleh ditulis L / P / Laki-laki / Perempuan. Tanggal lahir: dd/mm/yyyy.</p></div>';
    if (!r) {
      html += '<div class="dropzone" data-act="pick" role="button" tabindex="0"><span class="circ">' + ic('file-spreadsheet', 24) + '</span><b>Pilih file Excel</b><span>.xlsx, .xls, atau .csv dari HP Anda</span></div>';
    } else {
      const n = { valid: 0, dup: 0, bad: 0 };
      r.forEach((x) => n[x.status]++);
      html += '<div class="card file-card"><span class="file-ic">' + ic('file-spreadsheet', 22) + '</span><div class="row-main"><div class="row-title ellipsis">' + esc(this.file) + '</div>' +
          '<div class="row-sub"><span class="dot" style="width:7px;height:7px;border-radius:50%;background:var(--primary)"></span>' + r.length + ' baris terdeteksi</div></div><button class="btn-text" data-act="pick">Ganti File</button></div>' +
        '<div class="sum-grid"><div class="sum ok"><b>' + n.valid + '</b><span>Valid</span><small>Siap simpan</small></div>' +
          '<div class="sum warn"><b>' + n.dup + '</b><span>Duplikat</span><small>Sudah ada</small></div>' +
          '<div class="sum err"><b>' + n.bad + '</b><span>Bermasalah</span><small>Perlu dicek</small></div></div>' +
        '<div class="card" style="padding:0;overflow:hidden"><div class="card-head" style="padding:14px 16px 10px"><h3>Pratinjau Data <span class="muted" style="font-weight:500">(' + Math.min(r.length, 200) + ' dari ' + r.length + ')</span></h3><span class="sub">geser →</span></div>' +
          '<div class="table-wrap" style="margin:0"><table class="tbl"><thead><tr><th>No</th><th>Nama</th><th>JK</th><th>Tgl Lahir</th><th>Status</th></tr></thead><tbody>' +
          r.slice(0, 200).map((x) => '<tr class="' + (x.status === 'bad' ? 'bad' : '') + '"><td class="num">' + x.no + '</td><td>' + esc(x.nama || '—') + (x.reason ? '<div class="reason">' + esc(x.reason) + '</div>' : '') + '</td><td>' + (x.jk || '—') + '</td><td class="num">' + (x.lahir ? Fmt.dmy(x.lahir) : '—') + '</td>' +
            '<td>' + (x.status === 'valid' ? '<span class="pill sm ok">Valid</span>' : x.status === 'dup' ? '<span class="pill sm warn">Duplikat</span>' : '<span class="pill sm err">Bermasalah</span>') + '</td></tr>').join('') +
          '</tbody></table></div></div>' +
        (n.dup ? '<div class="card"><h3 class="h2" style="font-size:16px;margin-bottom:4px">Penanganan Data Duplikat</h3>' +
          '<label class="radio-row"><input type="radio" name="dup" value="skip"' + (this.dupMode === 'skip' ? ' checked' : '') + '><span><b>Lewati duplikat</b><small>Hanya ' + n.valid + ' peserta valid yang disimpan</small></span></label>' +
          '<label class="radio-row"><input type="radio" name="dup" value="add"' + (this.dupMode === 'add' ? ' checked' : '') + '><span><b>Tetap tambahkan</b><small>Duplikat ikut disimpan sebagai peserta baru</small></span></label></div>' : '');
    }
    $('.js-body', el).innerHTML = html;
    this.renderSave();
  },

  renderSave() {
    const btn = $('.js-save', this.el);
    const n = this.toSave().length;
    btn.disabled = !n;
    btn.innerHTML = n ? 'Simpan ' + n + ' Peserta ' + ic('arrow-right', 18) : 'Simpan';
  },
  toSave() { return (this.rows || []).filter((x) => x.status === 'valid' || (x.status === 'dup' && this.dupMode === 'add')); },

  async lib() {
    if (!window.XLSX) await loadScript('lib/xlsx.mini.min.js');
    return window.XLSX;
  },

  async template() {
    try {
      const X = await this.lib();
      const ws = X.utils.aoa_to_sheet([['Nama', 'Jenis Kelamin', 'Tanggal Lahir'], ['Ahmad Fauzi', 'L', '12/05/2008'], ['Siti Aisyah', 'P', '']]);
      ws['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 16 }];
      const wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, ws, 'Peserta');
      X.writeFile(wb, 'template_peserta_presensi_sambung.xlsx');
      Toast.show('Template diunduh');
    } catch (e) { Toast.show('Gagal membuat template: ' + e.message, 'err'); }
  },

  async parse(file) {
    let X;
    try { X = await this.lib(); } catch (e) { Toast.show('Pustaka Excel belum termuat. Coba lagi saat online.', 'err'); return; }
    try {
      const buf = await file.arrayBuffer();
      const wb = X.read(buf, { type: 'array', raw: true, cellDates: false });  // raw: tanggal CSV tidak ditafsirkan format AS
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
      this.rows = this.analyze(aoa, X);
      this.file = file.name;
      if (!this.rows.length) { this.rows = null; Toast.show('Tidak ada data peserta di file ini.', 'warn'); }
      this.render();
    } catch (e) { console.error(e); Toast.show('File tidak bisa dibaca. Pastikan formatnya Excel atau CSV.', 'err'); }
  },

  analyze(aoa, X) {
    // Cari baris judul kolom
    let head = -1, cN = 0, cJ = 1, cT = 2;
    for (let i = 0; i < Math.min(6, aoa.length); i++) {
      const r = aoa[i].map((v) => norm(v));
      const n = r.findIndex((v) => /^nama/.test(v));
      if (n > -1) {
        head = i; cN = n;
        cJ = r.findIndex((v) => /jenis|kelamin|^jk$|^l\/p$|gender|^sex/.test(v));
        cT = r.findIndex((v) => /lahir|^tgl|tanggal|birth/.test(v));
        break;
      }
    }
    const existing = new Set(Store.pesertaAktif().map((p) => norm(p.nama) + '|' + p.jk));
    const seen = new Set(), out = [];
    aoa.slice(head + 1).forEach((r, i) => {
      const nama = String(r[cN] === undefined ? '' : r[cN]).replace(/\s+/g, ' ').trim();
      const jkRaw = cJ > -1 ? norm(r[cJ]) : '';
      const tRaw = cT > -1 ? r[cT] : '';
      if (!nama && !jkRaw && !String(tRaw).trim()) return;
      const x = { no: out.length + 1, nama, jk: '', lahir: '', status: 'valid', reason: '' };
      if (/^(l|lk|laki|laki-laki|laki laki|pria|male|m)$/.test(jkRaw)) x.jk = 'L';
      else if (/^(p|pr|perempuan|wanita|female|f|w)$/.test(jkRaw)) x.jk = 'P';
      const t = parseTanggal(tRaw, X);
      if (t === null) { x.status = 'bad'; x.reason = 'Tanggal lahir tidak dikenali (pakai dd/mm/yyyy)'; } else x.lahir = t;
      if (!x.jk) { x.status = 'bad'; x.reason = jkRaw ? 'Jenis kelamin tidak dikenali' : 'Jenis kelamin kosong'; }
      if (!nama) { x.status = 'bad'; x.reason = 'Nama kosong'; }
      if (x.status === 'valid') {
        const k = norm(nama) + '|' + x.jk;
        if (existing.has(k)) { x.status = 'dup'; x.reason = ''; }
        else if (seen.has(k)) { x.status = 'dup'; x.reason = 'Ganda di file ini'; }
        seen.add(k);
      }
      out.push(x);
    });
    return out;
  },

  async save() {
    const list = this.toSave();
    if (!list.length) return;
    const btn = $('.js-save', this.el);
    btn.disabled = true; btn.innerHTML = ic('refresh-cw', 18, 'spin') + 'Menyimpan…';
    await Store.importPeserta(list.map((x) => ({ nama: x.nama, jk: x.jk, lahir: x.lahir })));
    Toast.show(list.length + ' peserta ditambahkan' + (navigator.onLine === false ? ' · dikirim saat online' : ''));
    App.replace('#/peserta');
  }
};

/** '' → '' (kosong), tidak dikenali → null */
function parseTanggal(v, X) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') {
    const d = X && X.SSF ? X.SSF.parse_date_code(v) : null;
    if (d && d.y > 1900) return d.y + '-' + p2(d.m) + '-' + p2(d.d);
    return null;
  }
  const s = String(v).trim();
  if (!s) return '';
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m) {
    let y = +m[3]; if (y < 100) y += y > 30 ? 1900 : 2000;
    const dd = +m[1], mm = +m[2];
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return y + '-' + p2(mm) + '-' + p2(dd);
    return null;
  }
  m = s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
  if (m) return +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31 ? m[1] + '-' + p2(+m[2]) + '-' + p2(+m[3]) : null;
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const idx = BULAN.concat(BULAN3).map((b) => b.toLowerCase()).findIndex((b) => m[2].toLowerCase().indexOf(b.slice(0, 3)) === 0);
    if (idx > -1) return m[3] + '-' + p2((idx % 12) + 1) + '-' + p2(+m[1]);
  }
  return null;
}
