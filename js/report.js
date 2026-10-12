/* =====================================================================
   report.js — laporan WhatsApp dari template (bisa dibuat saat offline)
   ===================================================================== */
'use strict';

const Report = {
  TOKENS: ['tingkat', 'judul', 'nama_kelompok', 'hari_tanggal', 'jam', 'tempat', 'jumlah_peserta', 'jumlah_hadir',
           'persentase', 'jumlah_hadir_l', 'jumlah_hadir_p', 'daftar_hadir_l', 'daftar_hadir_p',
           'jumlah_tidak_hadir', 'daftar_tidak_hadir_l', 'daftar_tidak_hadir_p'],

  list(arr) { return arr.length ? arr.map((n, i) => (i + 1) + '. ' + n).join('\n') : '-'; },

  vars(kg) {
    const st = Store.stats(kg.id) || { L: 0, P: 0, total: 0, jml: 0 };
    const h = Store.hadirNames(kg.id), a = Store.absenNames(kg.id);
    return {
      tingkat: kg.tingkat, judul: kg.judul, nama_kelompok: S.cfg.nama_kelompok || '',
      hari_tanggal: Fmt.long(kg.tanggal), jam: kg.jam, tempat: kg.tempat,
      jumlah_peserta: String(st.jml), jumlah_hadir: String(st.total), persentase: Fmt.pct(st.total, st.jml),
      jumlah_hadir_l: String(st.L), jumlah_hadir_p: String(st.P),
      daftar_hadir_l: this.list(h.L), daftar_hadir_p: this.list(h.P),
      jumlah_tidak_hadir: String(Math.max(0, st.jml - st.total)),
      daftar_tidak_hadir_l: this.list(a.L), daftar_tidak_hadir_p: this.list(a.P)
    };
  },

  /** Isi penanda. Baris yang penandanya kosong (mis. jam tidak diisi) dan tak tersisa teks lain → dihapus. */
  render(tpl, vars) {
    const has = (k) => Object.prototype.hasOwnProperty.call(vars, k);
    return String(tpl || '').split('\n').map((line) => {
      let any = false, empty = false;
      const out = line.replace(/\{(\w+)\}/g, (m, k) => { if (!has(k)) return m; any = true; const v = vars[k] === undefined || vars[k] === null ? '' : String(vars[k]); if (!v) empty = true; return v; });
      return any && empty && !/[\p{L}\p{N}]/u.test(out) ? null : out;
    }).filter((l) => l !== null).join('\n');
  },

  text(kg) { return this.render(S.cfg.template_wa || DEFAULT_TEMPLATE_WA, this.vars(kg)); },

  /** Contoh data untuk pratinjau template bila belum ada kegiatan. */
  sampleVars() {
    return {
      tingkat: 'Kelompok', judul: 'Pengajian Rutin Malam Selasa', nama_kelompok: S.cfg.nama_kelompok || 'Sangatta Selatan 2',
      hari_tanggal: Fmt.long(Fmt.ymd()), jam: '19:30', tempat: 'Masjid Al-Ikhlas', jumlah_peserta: '150', jumlah_hadir: '74',
      persentase: '49,3%', jumlah_hadir_l: '34', jumlah_hadir_p: '40', daftar_hadir_l: '1. Abdullah Pratama\n2. Achmad Syarifuddin',
      daftar_hadir_p: '1. Annisa Bella\n2. Dewi Sartika', jumlah_tidak_hadir: '76', daftar_tidak_hadir_l: '1. Adnan Maulana', daftar_tidak_hadir_p: '1. Fatimah Zahra'
    };
  },

  /** Format WA (*tebal*, _miring_, ~coret~) → HTML aman untuk pratinjau. */
  toHtml(text) {
    return esc(text)
      .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])_([^_\n]+)_/g, '$1<i>$2</i>')
      .replace(/~([^~\n]+)~/g, '<s>$1</s>')
      .replace(/\n/g, '<br>');
  },

  async share(text) {
    if (navigator.share) {
      try { await navigator.share({ text }); return true; } catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    return true;
  }
};
