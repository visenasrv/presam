/* ============================================================================
   KONFIGURASI "SATU SITUS BANYAK KLIEN" — Presensi Sambung
   Satu alamat situs dipakai banyak kelompok. Tiap kelompok punya server
   Apps Script + Google Sheet sendiri, dan masuk dengan Kode Kelompok.
   Tulis dengan format JSON (tanda kutip ganda, tanpa koma di akhir).
   ⚠️  APP_ID jangan diubah setelah ada kelompok terdaftar — semua kode jadi tidak terbaca.
   👉  Ganti REPO, DOMAIN, dan ADMIN_WA dengan milik Anda sebelum diunggah.
   ========================================================================== */
window.TENANT_CONFIG = {
  "APP_ID": "presensi-sambung",
  "APP_NAME": "Presensi Sambung",
  "LABEL": "Kode Kelompok",
  "PARAM": "k",
  "REGISTRY": "klien.json",
  "REPO": "visenasrv/presam",
  "BRANCH": "main",
  "DOMAIN": "visenasrv.github.io/presam",
  "ADMIN_WA": "082213712168",
  "BACKEND": "gas",
  "LEGACY_URL": "https://script.google.com/macros/s/AKfycbxYunvfi2YSKj1OAyFl7rmEe34NSjKcrGVgtB4-7bq_AyQAXIcnnS5sT7r8W7UU4TuYAg/exec",
  "PAKET": {
    "lengkap": { "label": "Paket Lengkap", "harga": "", "fitur": ["musyawaroh", "pdf", "foto"] }
  },
  "PAKET_DEFAULT": "lengkap",
  "FITUR": {
    "musyawaroh": "Presensi Musyawaroh & Notulen",
    "pdf": "Laporan PDF",
    "foto": "Foto Kegiatan"
  },
  "PUBLIC_PAGES": []
};
