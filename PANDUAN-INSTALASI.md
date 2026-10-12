# Panduan Instalasi — Presensi Sambung

Aplikasi terdiri dari dua bagian:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs`, `Data.gs`, `Media.gs`, `Setup.gs`, `appsscript.json` | Google Apps Script (database di Google Sheets, foto & PDF di Google Drive) |
| **Frontend** | Folder `presensi-sambung` (berisi `index.html`, `css/`, `js/`, dst.) | GitHub Pages, lalu dipasang ke layar utama HP |

Urutannya: **Backend dulu → salin URL → isi `js/config.js` → Frontend ke GitHub Pages.**

---

## Bagian A — Backend (Google Apps Script)

### A1. Buat proyek
1. Buka **https://script.google.com** dengan akun Google yang akan menyimpan database.
2. Klik **Proyek baru**, ganti namanya menjadi **Presensi Sambung**.

### A2. Tempel berkas
1. Berkas `Code.gs` bawaan → ganti nama menjadi **`Kode`**, hapus isinya, tempel isi **`Kode.gs`**.
2. Klik **＋ → Skrip**, beri nama **`Data`**, tempel isi **`Data.gs`**.
3. Ulangi untuk **`Media`** (isi `Media.gs`) dan **`Setup`** (isi `Setup.gs`).
4. Klik ⚙️ **Setelan proyek** → centang **"Tampilkan file manifes appsscript.json di editor"**.
   Kembali ke Editor, buka `appsscript.json`, ganti seluruh isinya dengan isi **`appsscript.json`**.
5. Klik 💾 **Simpan**.

### A3. Sesuaikan data awal
Buka berkas **`Setup`**, ubah bagian paling atas:

```javascript
const SETUP = {
  NAMA_KELOMPOK: 'Sangatta Selatan 2',
  NAMA_PENEROBOS_UTAMA: 'Adry',
  PIN_AWAL_UTAMA: '123456',
  PIN_RESET_UTAMA: '654321'
};
```

### A4. Jalankan `setupAwal` — **SEKALI SAJA**
1. Pilih fungsi **`setupAwal`** di menu tarik-turun, klik ▶ **Jalankan**.
2. Muncul **"Perlu otorisasi"** → **Tinjau izin** → pilih akun → **Lanjutan** → **Buka Presensi Sambung (tidak aman)** → **Izinkan**.
   (Peringatan ini normal untuk skrip buatan sendiri.)
3. Buka **Log eksekusi**. Harus muncul **✅ Setup selesai!** beserta tautan database & folder Drive.
4. Cek Google Drive: ada folder **Presensi Sambung** berisi spreadsheet **DB Presensi Sambung**, folder **Foto Kegiatan**, dan **Laporan PDF**.

> ⚠️ Jangan menjalankan `setupAwal` lagi. Bila tidak sengaja dijalankan, skrip akan menolak dan tidak membuat duplikat.

### A5. Deploy sebagai aplikasi web
1. Klik **Deploy → Deployment baru** → ⚙️ pilih jenis **Aplikasi web**.
2. Isi:
   - **Jalankan sebagai:** Saya
   - **Siapa yang memiliki akses:** Siapa saja
3. Klik **Deploy**, lalu **salin "URL aplikasi web"** (berakhiran `/exec`).

Cek cepat: tempel URL itu di browser. Bila tampil `{"ok":true,...,"siap":true}`, backend siap.

---

## Bagian B — Frontend (GitHub Pages)

### B1. Ekstrak ZIP dan isi alamat server
1. Ekstrak **`presensi-sambung.zip`**. Hasilnya folder **`presensi-sambung`** yang langsung berisi `index.html`, `css`, `js`, `fonts`, `icons`, `lib`.
2. Buka **`presensi-sambung/js/config.js`** dengan Notepad, ganti alamatnya dengan URL `/exec` dari langkah A5:

```javascript
API_URL: 'https://script.google.com/macros/s/AKfycb..../exec',
```

3. Simpan.

### B2. Siapkan Git & repository (sekali saja)
1. Pasang Git: **https://git-scm.com/download/win** (pengaturan bawaan).
2. Buat akun di **https://github.com** bila belum punya.
3. Atur identitas Git (buka **PowerShell**):
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@gmail.com"
   ```
4. Di github.com: **＋ → New repository** → nama misalnya `presensi-sambung` → pilih **Public** → **jangan** centang README → **Create repository**.

### B3. Masuk ke folder yang BENAR
Folder yang dikirim ke GitHub adalah **`presensi-sambung`** (yang langsung berisi `index.html`) — **bukan** folder di atasnya.

Cara cepat: buka folder `presensi-sambung` di File Explorer → klik address bar → ketik `powershell` → Enter. Lalu periksa:

```powershell
dir
```

Baris yang tampil **harus** memuat `index.html`, `css`, `js`. Bila yang tampil justru folder `presensi-sambung`, ketik `cd presensi-sambung` dulu.

### B4. Kirim ke GitHub (satu per satu)
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/presensi-sambung.git
git push -u origin main
```

Saat `git push` meminta **Password**, tempel **Personal Access Token**, bukan password akun:
- Buat di **https://github.com/settings/tokens** → **Generate new token (classic)** → centang **repo** → **Generate** → salin `ghp_...`.
- Saat ditempel di terminal, layar **tidak menampilkan apa pun** — itu normal. Tekan Enter.

Tanda berhasil: muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### B5. Aktifkan GitHub Pages
Repo di github.com → **Settings → Pages**:
- **Source:** Deploy from a branch
- **Branch:** `main` · `/ (root)` → **Save**
- Centang **Enforce HTTPS**

Tunggu 1–2 menit hingga muncul **"Your site is live at https://USERNAME.github.io/presensi-sambung/"**.

### B6. Pasang di HP setiap Penerobos
1. Buka alamat tadi di **Chrome HP**.
2. Masuk dengan PIN (login pertama **harus online**).
3. Menu Chrome ⋮ → **Tambahkan ke layar utama** / **Instal aplikasi**.
4. Selanjutnya buka aplikasi dari ikon di layar utama. Aplikasi tetap terbuka walau tanpa internet.

---

## Bagian C — Mulai Memakai

1. Masuk sebagai **Penerobos Utama** (PIN dari `SETUP`), lalu **Lainnya → Ganti PIN**.
2. **Peserta → Impor Excel → Unduh Template**, isi data, lalu pilih file tersebut dan **Simpan**.
3. **Lainnya → Kelola Penerobos → Tambah Penerobos** (maks. 2), beri tahu PIN masing-masing secara pribadi.
4. **Presensi → + Kegiatan Baru** → isi → **Simpan & Mulai Absen**.

---

## Bagian D — Memperbarui Aplikasi

**Backend** (setelah mengubah `.gs`):
**Deploy → Kelola deployment → ✏️ Edit → Versi: Versi baru → Deploy.**
Jangan memilih "Deployment baru" — itu menghasilkan URL baru dan aplikasi di HP berhenti tersambung.

**Frontend** (setelah mengubah berkas di folder `presensi-sambung`):
1. Buka `sw.js`, naikkan versinya, misalnya `ps-v1.0.0` → `ps-v1.0.1`.
2. Dari folder `presensi-sambung` jalankan:
   ```bash
   git add .
   git commit -m "Pembaruan"
   git push
   ```
3. Di HP akan muncul pemberitahuan **"Versi baru tersedia → Muat ulang"**.

---

## Bagian E — Masalah Umum

| Gejala | Penyebab & solusi |
|---|---|
| Layar PIN: "API_URL belum diisi" | `js/config.js` belum diisi URL `/exec`. Isi, lalu push ulang. |
| "Server membalas tidak sesuai" | URL salah atau akses deploy bukan **Siapa saja**. Cek langkah A5. |
| "Server belum disiapkan" | `setupAwal` belum dijalankan. Lihat A4. |
| Situs GitHub 404 | Yang di-push folder induk. Ulangi B3–B4 dari folder yang berisi `index.html` (pakai `git push -u origin main --force`). |
| Lupa PIN Penerobos Utama | Ubah `PIN_RESET_UTAMA` di `Setup`, jalankan fungsi **`resetPinUtama`**. |
| Data di Sheets diedit manual tidak muncul di HP | Jalankan fungsi **`bersihkanCache`**, lalu di HP: **Lainnya → Muat ulang data dari server**. |
| Cek kondisi server | Jalankan fungsi **`cekSetup`** dan baca lognya. |
| Ingin melihat kecepatan | Buka Chrome di laptop → F12 → Console → ketik `Perf.table()`. |

**Penting:** jangan menghapus data situs/riwayat Chrome di HP saat masih ada data **belum terkirim** (lihat pill di kanan atas). Selama pill menunjukkan **Online**, semua data sudah aman di Google Sheets.
