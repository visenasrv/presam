# Presensi Sambung

Aplikasi presensi kegiatan sambung (Kelompok · Desa · Daerah) untuk Penerobos — dibuat untuk HP, bisa dipakai tanpa internet.

- Centang presensi instan, tab Laki-laki / Perempuan, cari nama
- Tersimpan otomatis di HP (draft), sinkron ke Google Sheets saat online
- Dua Penerobos bisa mengabsen kegiatan yang sama bersamaan
- Impor peserta dari Excel, laporan siap tempel ke WhatsApp, PDF di Google Drive
- Dashboard kehadiran, mode terang / gelap

**Teknologi:** HTML/CSS/JavaScript murni (PWA) di GitHub Pages · Google Apps Script sebagai REST API · Google Sheets & Drive.

Panduan pemasangan lengkap: **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**

Sebelum dipakai, isi `API_URL` di `js/config.js` dengan URL `/exec` dari deploy Google Apps Script.
