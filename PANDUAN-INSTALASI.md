# Panduan Instalasi — Presensi Sambung v1.2

Mulai versi 1.2, **satu situs dipakai banyak kelompok**. Situsnya (frontend) cukup dipasang sekali di GitHub Pages. Setiap kelompok punya **server sendiri** (Apps Script + Google Sheet di akun Google kelompok itu) dan masuk dengan **Kode Kelompok**.

| Bagian | Isi | Dipasang | Berapa kali |
|---|---|---|---|
| **Backend** | `Kode.gs`, `Data.gs`, `Media.gs`, `Setup.gs`, `appsscript.json` | Google Apps Script di akun Google **tiap kelompok** | Sekali per kelompok |
| **Frontend** | Isi `presensi-sambung.zip` (`index.html`, `kelola.html`, `klien.json`, `css/`, `js/`, …) | GitHub Pages | Sekali untuk semua |
| **Daftar kode** | `klien.json` | Diubah lewat `kelola.html` | Setiap ada kelompok baru |

Urutannya: **A. Server kelompok → B. Situs GitHub Pages (sekali) → C. Daftarkan Kode Kelompok → D. Pasang di HP.**

---

## A. Server untuk satu kelompok (Google Apps Script)

Lakukan di **akun Google milik kelompok** (buka jendela Incognito bila memakai laptop sendiri).

1. Buka **https://script.google.com** → **Proyek baru** → beri nama **Presensi Sambung**.
2. Berkas `Code.gs` bawaan → ganti nama menjadi **`Kode`**, hapus isinya, tempel **`Kode.gs`**.
3. **＋ → Skrip**: buat **`Data`**, **`Media`**, **`Setup`**, tempel isi berkas yang sama namanya.
4. ⚙️ **Setelan proyek** → centang **Tampilkan file manifes "appsscript.json"** → buka `appsscript.json`, ganti seluruh isinya.
5. Buka **`Setup`**, ubah bagian atas sesuai kelompok:
   ```javascript
   const SETUP = {
     NAMA_KELOMPOK: 'Sangatta Selatan 2',
     NAMA_PENEROBOS_UTAMA: 'Nama Penerobos Utama',
     PIN_AWAL_UTAMA: '123456',
     PIN_RESET_UTAMA: '654321'
   };
   ```
6. Pilih fungsi **`setupAwal`** → ▶ **Jalankan** → izinkan akses (**Lanjutan → Buka Presensi Sambung (tidak aman) → Izinkan**). Log harus menampilkan **✅ Setup selesai!**
   Sheet yang dibuat: Pengaturan, Penerobos, Peserta, Kegiatan, Presensi, **Dapukan** (berisi Pak Yai, Wakil Yai, Penerobos, Aghnia), **Anggota_Musyawaroh**, Log_Sinkron.
7. **Deploy → Deployment baru → Aplikasi web** · Jalankan sebagai: **Saya** · Akses: **Siapa saja** → **Deploy** → salin URL yang berakhiran **`/exec`**.

Cek cepat: buka URL itu di browser → harus tampil `{"ok":true,...,"siap":true}`.

> **Server versi lama (v1.0/v1.1)?** Tidak perlu `setupAwal` lagi. Tempel 4 berkas `.gs` versi baru, lalu **Deploy → Kelola deployment → ✏️ → Versi: Versi baru → Deploy** (URL tetap sama). Sheet & kolom baru (dapukan, notulen) ditambahkan otomatis saat aplikasi pertama kali tersambung, atau jalankan fungsi **`perbaruiDatabase`**.

---

## B. Situs di GitHub Pages (sekali untuk semua kelompok)

### B1. Isi tiga data di `tenant-config.js`
Ekstrak **`presensi-sambung.zip`**, buka **`tenant-config.js`** dengan Notepad:

```javascript
"REPO": "visenasrv/presam",
"DOMAIN": "visenasrv.github.io/presam",
"ADMIN_WA": "08xxxxxxxxxx",
"LEGACY_URL": "",
```

- `ADMIN_WA` = nomor WA Anda (muncul sebagai tombol *Hubungi admin* di layar kode).
- `LEGACY_URL` = isi dengan URL `/exec` lama **hanya bila** aplikasi sudah dipakai sebelumnya dengan satu server, agar data di HP Penerobos tetap terbaca.
- **Jangan ubah `APP_ID`.**

### B2. Kirim ke GitHub
Folder yang dikirim adalah folder yang **langsung berisi `index.html`**. Dari folder itu (PowerShell):

```bash
git init
git add .
git commit -m "Presensi Sambung v1.2"
git branch -M main
git remote add origin https://github.com/visenasrv/presam.git
git push -u origin main
```

Password = **Personal Access Token** (https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo**). Saat ditempel, layar memang tidak menampilkan apa pun.

### B3. Aktifkan Pages
Repo → **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → **Save** → centang **Enforce HTTPS**. Tunggu 1–2 menit.

> Sudah punya repo versi lama? Cukup timpa semua berkas dengan isi ZIP baru, lalu `git add .` → `git commit -m "v1.2"` → `git push`.

---

## C. Daftarkan Kode Kelompok

1. Buka **`https://visenasrv.github.io/presam/kelola.html`**.
2. Isi **Nama kelompok** → **Buat otomatis** (kode) → tempel **URL `/exec`** dari langkah A7 → **Cek server** → **Simpan ke daftar**.
3. **Salin isi file** → **Buka di GitHub** → Ctrl+A, Ctrl+V → **Commit changes**.
4. Tunggu 1 menit → **Uji kode di situs** → harus *sudah aktif*.
5. **Salin pesan untuk klien** / **Unduh QR** → kirim ke Penerobos Utama kelompok itu.

Rincian (kelompok nonaktif, pindah HP, dll.): **PANDUAN-SATU-SITUS-BANYAK-KLIEN.md**.

---

## D. Pasang di HP setiap Penerobos

Buka tautan dari kelola (`…/?k=KODE`) — kode langsung terisi, lalu masuk dengan PIN (login pertama **harus online**).

**Android (Chrome)**
1. Bila dibuka dari WhatsApp, ketuk ⋮ → **Buka di Chrome**.
2. Ketuk **Pasang aplikasi** (pojok kanan atas layar PIN) atau menu **⋮ → Instal aplikasi**.
3. Selanjutnya buka dari ikon **Presensi** di layar HP. Tetap bisa dibuka tanpa internet.

**iPhone (Safari)**
1. Buka tautan di **Safari** → tombol **Bagikan** (kotak dengan panah ke atas).
2. **Tambahkan ke Layar Utama** → **Tambah**.
3. Buka dari ikonnya. Kode Kelompok & PIN mungkin diminta sekali lagi — itu normal di iPhone.

**Laptop (Chrome/Edge):** klik ikon **Instal** di ujung kanan bilah alamat.

Tombol **Pasang aplikasi di HP** juga ada di **Lainnya → Data & Aplikasi** (hanya muncul bila HP mendukung dan belum terpasang).

---

## E. Mulai memakai (Penerobos Utama)

1. **Lainnya → Ganti PIN**.
2. **Peserta → Impor Excel** (atau tambah satu per satu).
3. **Lainnya → Dapukan Musyawaroh** → atur dapukan (tambah/ubah/hapus/urutkan) → **Pilih anggota dari Data Peserta**.
4. **Lainnya → Warna Aplikasi** → pilih warna kelompok (berlaku di semua HP).
5. **Lainnya → Format Laporan WA/PDF** → atur template **Sambung** dan **Musyawaroh**.
6. **Lainnya → Kelola Penerobos** → tambah maks. 2 Penerobos.
7. **Presensi → Kegiatan Baru** → pilih **Sambung** atau **Musyawaroh**.

---

## F. Memperbarui aplikasi

**Backend:** tempel `.gs` baru → **Deploy → Kelola deployment → ✏️ → Versi baru**. Jangan "Deployment baru" (URL berubah → kode kelompok harus didaftarkan ulang). Ulangi di akun setiap kelompok.

**Frontend:** ubah berkas → naikkan `VERSION` di `sw.js` (mis. `ps-v1.2.0` → `ps-v1.2.1`) → `git add .` → `git commit -m "Pembaruan"` → `git push`. Di HP muncul **Versi baru tersedia → Muat ulang**. Tanpa menaikkan versi, HP tetap memakai versi lama.

---

## G. Masalah umum

| Gejala | Solusi |
|---|---|
| "Kode Kelompok tidak ditemukan" | Tunggu 1 menit setelah Commit. Kirim tautan `?k=` agar tidak salah ketik. |
| Layar "Aplikasi ini sedang nonaktif" | Kelompok diset Nonaktif di kelola.html. Ubah ke Aktif, Commit, lalu ketuk *Periksa lagi*. |
| "Server membalas tidak sesuai" | URL `/exec` salah atau akses deploy bukan **Siapa saja**. |
| "Server belum disiapkan" | `setupAwal` belum dijalankan di akun kelompok itu. |
| Situs GitHub 404 | Yang di-push folder induk. Push dari folder yang berisi `index.html`. |
| Tombol Pasang aplikasi tidak muncul | Buka di Chrome (bukan dari dalam WhatsApp) atau Safari di iPhone; atau aplikasi sudah terpasang. |
| Lupa PIN Penerobos Utama | Ubah `PIN_RESET_UTAMA` di `Setup`, jalankan **`resetPinUtama`**. |
| Data di Sheets diedit manual tidak muncul | Jalankan **`bersihkanCache`**, lalu di HP **Lainnya → Muat ulang data dari server**. |
| Cek kondisi server | Jalankan **`cekSetup`**. |

**Penting:** jangan menghapus data situs Chrome di HP saat pill di kanan atas masih menunjukkan **belum terkirim**.
