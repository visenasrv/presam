/* =====================================================================
   Detail Kegiatan — ringkasan, foto (maks. 2), laporan WA, PDF
   ===================================================================== */
'use strict';

Pages.detail = {
  focus: true,
  kid: null, fotos: {}, busy: {},

  mount(el) {
    el.innerHTML = '<div class="js-head"></div><div class="pad js-body"></div>' +
      '<div class="action-bar"><div class="action-bar-inner"><button class="btn btn-secondary btn-block btn-lg js-edit">' + ic('pencil', 20) + 'Edit Presensi</button></div></div>' +
      '<input type="file" accept="image/*" capture="environment" class="js-cam" hidden><input type="file" accept="image/*" class="js-gal" hidden>';
    this.el = el;
    $('.js-edit', el).onclick = () => { location.hash = '#/absen/' + this.kid; };
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const a = t.dataset.act;
      if (a === 'copy') this.copy();
      else if (a === 'share') this.share();
      else if (a === 'pdf') this.makePdf();
      else if (a === 'dl') this.downloadPdf();
      else if (a === 'add') this.addPhoto(+t.dataset.slot);
      else if (a === 'rm') { e.stopPropagation(); this.removePhoto(+t.dataset.slot); }
      else if (a === 'view') this.viewPhoto(+t.dataset.slot);
      else if (a === 'more') this.more();
      else if (a === 'notulen') location.hash = '#/absen/' + this.kid + '/notulen';
    });
    const onFile = (input) => input.addEventListener('change', () => { const f = input.files[0]; input.value = ''; if (f) this.savePhoto(f); });
    onFile($('.js-cam', el)); onFile($('.js-gal', el));
    Bus.on('foto', (kid) => { if (kid === this.kid && App.route && App.route.name === 'detail') this.loadPhotos(); });
  },

  show(el, params) {
    this.kid = params[0];
    this.fotos = {};
    this.render();
    this.loadPhotos();
  },
  onData() { this.render(); },

  render() {
    const el = this.el, kg = S.kegiatan.get(this.kid);
    if (!kg) {
      $('.js-head', el).innerHTML = UI.focusHead({ title: 'Detail Kegiatan' });
      $('.js-body', el).innerHTML = emptyState('search', 'Kegiatan tidak ditemukan', 'Mungkin sudah dihapus.', '<a class="btn btn-primary" href="#/riwayat">Ke Riwayat</a>');
      $('.action-bar', el).hidden = true; return;
    }
    $('.action-bar', el).hidden = false;
    const musy = isMusy(kg);
    $('.js-edit', el).innerHTML = ic('pencil', 20) + (musy ? 'Edit Presensi &amp; Notulen' : 'Edit Presensi');
    $('.js-head', el).innerHTML = UI.focusHead({ title: musy ? 'Detail Musyawaroh' : 'Detail Kegiatan', sub: UI.jenisLabel(kg), right: '<button class="icon-btn plain" data-act="more" aria-label="Menu lainnya">' + ic('ellipsis-vertical', 22) + '</button>' });
    const st = Store.stats(kg.id);
    const pct = st.pct, R = 25, C = 2 * Math.PI * R;
    const sub = (n, d) => d ? 'dari ' + d + ' terdaftar (' + Fmt.pct(n, d) + ')' : '';
    const text = Report.text(kg);
    const pdfOld = kg.pdf && kg.pdfStale;
    const busyPdf = this.busy.pdf;

    $('.js-body', el).innerHTML =
      '<div class="card"><div class="pill-row">' + UI.lvl(kg.tingkat, kg.jenis) + UI.status(kg) + '</div>' +
        '<h2 class="detail-title">' + esc(kg.judul) + '</h2>' +
        '<div class="kv">' + ic('calendar', 19) + esc(Fmt.long(kg.tanggal)) + '</div>' +
        (kg.jam ? '<div class="kv">' + ic('clock', 19) + esc(kg.jam) + ' WITA</div>' : '') +
        '<div class="kv">' + ic('map-pin', 19) + esc(kg.tempat) + '</div>' +
        '<div class="kv" style="color:var(--text-muted);font-size:13.5px">' + ic('user', 19) + 'Dibuat oleh ' + esc(Store.nameOf(kg.by)) + '</div>' +
      '</div>' +
      '<div class="section-label">Ringkasan Kehadiran</div>' +
      '<div class="stat-grid">' +
        '<div class="card stat"><div class="stat-label">Total Hadir</div><div class="stat-value">' + st.total + '</div><div class="stat-foot">dari ' + st.jml + (musy ? ' anggota' : ' peserta') + '</div></div>' +
        '<div class="card stat" style="display:flex;align-items:center;justify-content:space-between;gap:6px"><div><div class="stat-label">Persentase</div><div class="stat-value" style="color:var(--primary)">' + Fmt.pct(st.total, st.jml) + '</div>' +
          '<div class="stat-foot ' + (pct >= 75 ? 'ok' : pct >= 50 ? '' : 'err') + '">' + (pct >= 75 ? 'Kehadiran tinggi' : pct >= 50 ? 'Kehadiran sedang' : 'Kehadiran rendah') + '</div></div>' +
          '<svg class="ring" viewBox="0 0 60 60"><circle class="bg" cx="30" cy="30" r="' + R + '"/><circle class="fg" cx="30" cy="30" r="' + R + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - Math.min(100, pct) / 100)).toFixed(2) + '"/></svg></div>' +
        (musy ? '' :
        '<div class="card stat"><div class="stat-top" style="margin-bottom:4px"><span class="stat-label">Laki-laki</span><span class="dot" style="width:9px;height:9px;border-radius:50%;background:var(--chart-male)"></span></div><div class="stat-value">' + st.L + '</div><div class="stat-foot">' + sub(st.L, st.regL) + '</div></div>' +
        '<div class="card stat"><div class="stat-top" style="margin-bottom:4px"><span class="stat-label">Perempuan</span><span class="dot" style="width:9px;height:9px;border-radius:50%;background:var(--chart-female)"></span></div><div class="stat-value">' + st.P + '</div><div class="stat-foot">' + sub(st.P, st.regP) + '</div></div>') +
      '</div>' +
      (musy ? this.musyCards(kg) : '') +
      '<div class="card" style="margin-top:12px"><div class="card-head"><div><h3>Foto Kegiatan <span class="muted" style="font-weight:500">(maks. 2)</span></h3><div class="sub">Otomatis dikompres ≤ 500 KB</div></div><span class="pill js-fcount"></span></div>' +
        '<div class="photos js-photos"></div></div>' +
      '<div class="card" style="margin-top:12px"><div class="card-head" style="margin-bottom:12px"><h3>Laporan WhatsApp</h3><span class="sub">Template aktif</span></div>' +
        '<div class="wa-bubble">' + Report.toHtml(text) + '</div>' +
        '<div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" data-act="copy">' + ic('copy', 18) + 'Salin Laporan</button>' +
        '<button class="btn btn-secondary" data-act="share">' + ic('share-2', 18) + 'Bagikan ke WA</button></div></div>' +
      '<div class="card" style="margin-top:12px"><div class="card-head" style="margin-bottom:12px"><h3>Laporan PDF</h3><span class="sub">' + (musy ? 'Notulen + daftar hadir' : 'Daftar hadir L / P') + '</span></div>' +
        (pdfOld ? '<div class="banner warn" style="margin-bottom:12px">' + ic('triangle-alert', 20) + '<div><b>PDF perlu diperbarui</b> — ' + (musy ? 'presensi atau notulen' : 'presensi') + ' diubah setelah PDF dibuat.</div></div>' : '') +
        '<div class="btn-row"><button class="btn ' + (kg.pdf && !pdfOld ? 'btn-secondary' : 'btn-primary') + '" data-act="pdf"' + (busyPdf ? ' disabled' : '') + '>' +
          (busyPdf ? ic('refresh-cw', 18, 'spin') + 'Membuat PDF…' : ic(kg.pdf ? 'refresh-cw' : 'file-text', 18) + (kg.pdf ? 'Perbarui PDF' : 'Buat PDF')) + '</button>' +
          (kg.pdf ? '<button class="btn ' + (pdfOld ? 'btn-secondary' : 'btn-primary') + '" data-act="dl"' + (this.busy.dl ? ' disabled' : '') + '>' + (this.busy.dl ? ic('refresh-cw', 18, 'spin') : ic('download', 18)) + 'Unduh PDF</button>' : '') + '</div>' +
        '<p class="help" style="display:flex;align-items:center;gap:6px;margin-top:10px">' + ic('hard-drive', 15) +
          (kg.pdf ? 'Tersimpan di Google Drive' + (kg.pdfAt ? ' · ' + esc(Fmt.dMon(kg.pdfAt.slice(0, 10)) + ', ' + kg.pdfAt.slice(11, 16)) : '') : 'PDF disimpan ke Google Drive dan bisa diunduh kapan saja.') + '</p></div>';
    this.renderPhotos();
  },

  /** Musyawaroh: daftar hadir per dapukan + notulen. */
  musyCards(kg) {
    const h = Store.musyGroups(kg.id, true), a = Store.musyGroups(kg.id, false);
    const nA = a.reduce((x, g) => x + g.list.length, 0);
    const grp = (gs) => gs.map((g) => '<div class="dk-group"><div class="dk-name">' + esc(g.nama) + ' <span>' + g.list.length + '</span></div><div class="dk-names">' + g.list.map((n) => '<span>' + esc(n) + '</span>').join('') + '</div></div>').join('');
    const note = (kg.notulen || '').trim();
    return '<div class="card" style="margin-top:12px"><div class="card-head" style="margin-bottom:8px"><div><h3>' + ic('notebook-pen', 18) + ' Notulen Musyawaroh</h3>' +
        (note && kg.nby ? '<div class="sub">Terakhir diubah ' + esc(Store.nameOf(kg.nby)) + (kg.nt ? ' · ' + esc(Fmt.ago(kg.nt)) : '') + '</div>' : '') + '</div></div>' +
        (note ? '<div class="notulen-view">' + Report.toHtml(note) + '</div>'
              : '<div class="empty" style="padding:14px 6px 6px"><p>Notulen belum ditulis.</p></div>') +
        '<button class="btn btn-secondary btn-block" style="margin-top:12px" data-act="notulen">' + ic('pencil', 18) + (note ? 'Ubah Notulen' : 'Tulis Notulen') + '</button></div>' +
      '<div class="card" style="margin-top:12px"><div class="card-head" style="margin-bottom:6px"><h3>Daftar Hadir</h3><span class="pill ok">' + h.reduce((x, g) => x + g.list.length, 0) + ' hadir</span></div>' +
        (h.length ? grp(h) : '<p class="help">Belum ada yang dicentang hadir.</p>') +
        (nA ? '<details class="dk-absent"><summary>Tidak hadir (' + nA + ')</summary>' + grp(a) + '</details>' : '') + '</div>';
  },

  /* ---------- Foto ---------- */
  async loadPhotos() {
    const kg = S.kegiatan.get(this.kid);
    if (!kg) return;
    const kid = kg.id;
    for (const slot of [1, 2]) {
      const f = await DB.get('files', 'foto:' + kid + ':' + slot);
      const remote = slot === 1 ? kg.f1 : kg.f2;
      if (f && (f.pending || f.fileId === remote)) this.fotos[slot] = f;
      else if (remote) {
        this.fotos[slot] = { loading: true };
        if (navigator.onLine !== false) {
          api('foto.get', { id: remote }).then(async (r) => {
            if (!r.ok || this.kid !== kid) { if (this.kid === kid) { this.fotos[slot] = { error: true }; this.renderPhotos(); } return; }
            const rec = { key: 'foto:' + kid + ':' + slot, kind: 'foto', kid, slot, data: 'data:' + r.data.mime + ';base64,' + r.data.data, size: Math.round(r.data.data.length * 0.75), fileId: remote, pending: false };
            await DB.put('files', rec);
            this.fotos[slot] = rec; this.renderPhotos();
          });
        } else this.fotos[slot] = { error: true };
      } else {
        if (f) DB.del('files', f.key);
        delete this.fotos[slot];
      }
    }
    this.renderPhotos();
  },

  renderPhotos() {
    const box = $('.js-photos', this.el);
    if (!box) return;
    const n = [1, 2].filter((s) => this.fotos[s] && !this.fotos[s].error).length;
    $('.js-fcount', this.el).textContent = n + '/2 terunggah';
    let html = '', addShown = false;
    [1, 2].forEach((slot) => {
      const f = this.fotos[slot];
      if (f && f.data) {
        html += '<div class="photo" data-act="view" data-slot="' + slot + '"><img src="' + f.data + '" alt="Foto kegiatan ' + slot + '" loading="lazy"><span class="size">' + Fmt.kb(f.size || 0) + '</span>' +
          (f.pending ? '<span class="pend">Menunggu unggah</span>' : '') + '<button class="rm" data-act="rm" data-slot="' + slot + '" aria-label="Hapus foto">' + ic('x', 16, '', 2.4) + '</button></div>';
      } else if (f && f.loading) html += '<div class="photo sk"></div>';
      else if (f && f.error) html += '<div class="photo" style="display:grid;place-items:center;color:var(--text-muted);font-size:13px;text-align:center;padding:10px">' + ic('cloud-off', 22) + '<span>Foto tersimpan di Drive<br>(butuh internet)</span></div>';
      else if (!addShown) { addShown = true; html += '<button class="photo-add" data-act="add" data-slot="' + slot + '"><span class="circ">' + ic('camera', 22) + '</span>+ Tambah Foto<small>Kamera atau Galeri</small></button>'; }
    });
    box.innerHTML = html;
  },

  addPhoto(slot) {
    this.slot = slot;
    Sheet.menu({
      title: 'Tambah foto kegiatan',
      items: [
        { icon: 'camera', label: 'Ambil dari Kamera', onClick: () => $('.js-cam', this.el).click() },
        { icon: 'image', label: 'Pilih dari Galeri', onClick: () => $('.js-gal', this.el).click() }
      ]
    });
  },

  async savePhoto(file) {
    const kid = this.kid, slot = this.slot || ([1, 2].find((s) => !this.fotos[s]) || 1);
    this.fotos[slot] = { loading: true }; this.renderPhotos();
    try {
      const img = await ImageTool.compress(file);
      const rec = { key: 'foto:' + kid + ':' + slot, kind: 'foto', kid, slot, data: img.dataUrl, size: img.size, pending: true, reqId: uid() + uid() };
      await DB.put('files', rec);
      this.fotos[slot] = rec; this.renderPhotos();
      Uploads.pending++; App.renderPill();
      Toast.show(navigator.onLine === false ? 'Foto disimpan, diunggah saat online' : 'Foto dikompres ' + Fmt.kb(img.size) + ' · mengunggah…', navigator.onLine === false ? 'info' : 'ok');
      if (S.outbox.size) await Sync.run(); else Uploads.run();
    } catch (e) {
      delete this.fotos[slot]; this.renderPhotos();
      Toast.show(e.message, 'err');
    }
  },

  async removePhoto(slot) {
    const f = this.fotos[slot];
    if (!f) return;
    const ok = await Sheet.confirm({ title: 'Hapus foto ini?', message: f.pending ? 'Foto belum terunggah dan akan dihapus dari HP.' : 'Foto juga dihapus dari Google Drive.', ok: 'Hapus', danger: true });
    if (!ok) return;
    if (f.pending) { await DB.del('files', f.key); delete this.fotos[slot]; await Uploads.count(); App.renderPill(); this.renderPhotos(); return; }
    if (navigator.onLine === false) { Toast.show('Menghapus foto yang sudah terunggah butuh internet.', 'warn'); return; }
    this.fotos[slot] = { loading: true }; this.renderPhotos();
    const r = await api('foto.delete', { kid: this.kid, slot });
    if (r.ok) { await DB.del('files', 'foto:' + this.kid + ':' + slot); delete this.fotos[slot]; await Store.applyChanges({ kg: [r.data.kg] }); Toast.show('Foto dihapus'); }
    else { this.fotos[slot] = f; Toast.show(r.error, 'err'); }
    this.renderPhotos();
  },

  viewPhoto(slot) {
    const f = this.fotos[slot];
    if (!f || !f.data) return;
    const v = document.createElement('div');
    v.className = 'viewer';
    v.innerHTML = '<img src="' + f.data + '" alt="Foto kegiatan"><button class="icon-btn" aria-label="Tutup">' + ic('x', 22) + '</button>';
    v.onclick = () => v.remove();
    document.body.appendChild(v);
  },

  /* ---------- Laporan ---------- */
  async copy() {
    const kg = S.kegiatan.get(this.kid);
    const ok = await copyText(Report.text(kg));
    haptic(10);
    Toast.show(ok ? 'Laporan disalin ke clipboard' : 'Gagal menyalin. Gunakan tombol Bagikan.', ok ? 'ok' : 'err');
  },
  share() { Report.share(Report.text(S.kegiatan.get(this.kid))); },

  async makePdf() {
    const kid = this.kid;
    if (navigator.onLine === false) { Toast.show('Butuh internet. Laporan WA tetap bisa disalin.', 'warn', { ms: 4000 }); return; }
    this.busy.pdf = true; this.render();
    if (Store.pendingKegiatan().has(kid)) await Sync.run();
    if (Store.pendingKegiatan().has(kid)) {
      this.busy.pdf = false; this.render();
      Toast.show('Data presensi belum terkirim. Coba lagi sebentar.', 'warn'); return;
    }
    const r = await api('pdf.generate', { kid }, { timeout: 120000 });
    this.busy.pdf = false;
    if (r.ok) {
      await DB.put('files', { key: 'pdf:' + kid, kind: 'pdf', kid, name: r.data.name, data: r.data.data, fileId: r.data.kg.pdf });
      await Store.applyChanges({ kg: [r.data.kg] });
      this.render();
      downloadBlob(b64ToBlob(r.data.data, 'application/pdf'), r.data.name);
      Toast.show('PDF tersimpan di Google Drive');
    } else { this.render(); Toast.show(r.error || 'Gagal membuat PDF.', 'err'); }
  },

  async downloadPdf() {
    const kg = S.kegiatan.get(this.kid);
    const cached = await DB.get('files', 'pdf:' + kg.id);
    if (cached && cached.fileId === kg.pdf) { downloadBlob(b64ToBlob(cached.data, 'application/pdf'), cached.name); return; }
    if (navigator.onLine === false) { Toast.show('PDF belum tersimpan di HP. Butuh internet untuk mengunduh.', 'warn'); return; }
    this.busy.dl = true; this.render();
    const r = await api('pdf.get', { kid: kg.id });
    this.busy.dl = false; this.render();
    if (r.ok) {
      await DB.put('files', { key: 'pdf:' + kg.id, kind: 'pdf', kid: kg.id, name: r.data.name, data: r.data.data, fileId: kg.pdf });
      downloadBlob(b64ToBlob(r.data.data, 'application/pdf'), r.data.name);
    } else Toast.show(r.error, 'err');
  },

  more() {
    const kg = S.kegiatan.get(this.kid);
    if (!kg) return;
    const items = [{ icon: 'pencil', label: 'Ubah info kegiatan', onClick: () => (location.hash = '#/kegiatan/ubah/' + kg.id) }];
    if (Store.isUtama()) items.push({
      icon: 'trash-2', label: 'Hapus kegiatan', danger: true,
      onClick: async () => {
        const ok = await Sheet.confirm({ title: 'Hapus kegiatan ini?', message: '"' + kg.judul + '" beserta presensinya tidak tampil lagi di aplikasi. Data tetap tercatat di Google Sheets.', ok: 'Hapus', danger: true });
        if (!ok) return;
        await Store.deleteKegiatan(kg.id);
        Toast.show('Kegiatan dihapus');
        App.replace('#/riwayat');
      }
    });
    Sheet.menu({ title: kg.judul, items });
  }
};
