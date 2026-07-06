# 🔐 Panduan Migrasi Keamanan — POS Monika Mulya

Kode aplikasi sudah diubah total ke Firebase Authentication. Supaya aktif,
ikuti langkah di bawah **secara berurutan**. Total waktu ±15 menit.

> ⚠️ Lakukan di luar jam sibuk toko. Setelah langkah 3 (Rules), aplikasi versi
> LAMA tidak bisa dipakai lagi — pastikan langsung deploy versi baru (langkah 4).

---

## Langkah 1 — Download kunci Service Account (2 menit)

1. Buka [Firebase Console](https://console.firebase.google.com) → project **hxpos2**.
2. Klik ⚙️ (Project Settings) → tab **Service accounts**.
3. Klik **Generate new private key** → **Generate key**.
4. Simpan file JSON yang terdownload ke folder proyek ini, ganti namanya menjadi:
   `serviceAccountKey.json`

## Langkah 2 — Jalankan script migrasi akun (3 menit)

Buka terminal di folder proyek, lalu:

```
npm install firebase-admin
node migrate-auth.cjs
```

Script akan:
- Membuat akun Firebase Auth untuk setiap user (login tetap pakai **username yang sama, password yang sama**).
- Menghapus password dari database (pindah ke sistem Auth yang ter-enkripsi).
- Menampilkan laporan per user. **Baca laporannya** — kalau ada password yang
  terlalu pendek (< 6 karakter), script memberi password baru dan mencetaknya;
  beritahu user yang bersangkutan.

Script aman dijalankan ulang kalau gagal di tengah jalan.

## Langkah 3 — Pasang Security Rules (2 menit)

1. Firebase Console → **Firestore Database** → tab **Rules**.
2. Hapus isi lama, **copy-paste seluruh isi file `firestore.rules`** dari folder proyek ini.
3. Klik **Publish**.

Mulai detik ini database tertutup untuk siapa pun yang tidak login.

## Langkah 4 — Deploy aplikasi versi baru (sesuai cara deploy biasa)

Build sudah siap di folder `dist/` (hasil `npx vite build`). Deploy seperti biasa,
lalu di tiap perangkat toko: buka aplikasi → refresh (tutup-buka jika PWA).

## Langkah 5 — Tes login (2 menit)

- Login sebagai admin (username & password sama seperti sebelumnya) ✅
- Login sebagai kasir ✅
- Coba transaksi penjualan 1x ✅

## Langkah 6 — Bersih-bersih (WAJIB, 2 menit)

1. Firebase Console → **Authentication** → **Users** → hapus akun
   **satpam@monikamulya.com** (akun bersama lama yang kredensialnya pernah bocor di kode).
2. **Hapus file `serviceAccountKey.json`** dari komputer (kunci ini akses penuh
   ke project — jangan disimpan/dibagikan/di-commit; sudah otomatis di-gitignore).

---

## Yang berubah untuk pemakaian sehari-hari

| Hal | Dulu | Sekarang |
|---|---|---|
| Login staf | Username + password (dicek dari database) | Sama persis, tapi diverifikasi Firebase Auth |
| Tambah akun staf | Menu Pengaturan → Akun | Sama (butuh koneksi internet saat membuat) |
| Ganti password sendiri | Menu profil | Sama (butuh koneksi internet) |
| Reset password user lain (lupa) | Admin edit di Pengaturan | Menu Pengaturan → Hak Akses User → klik ikon 🔑 di baris user, langsung dari aplikasi (butuh project Blaze + Cloud Functions ter-deploy) |
| Hapus akun staf | Menu Pengaturan | Sama — sekarang otomatis menghapus akun login-nya juga, tidak perlu ke Firebase Console lagi |
| Tambah akun staf baru | Menu Pengaturan | Sama, sekarang lewat Cloud Function (lebih aman, sesi admin tidak ikut ke-logout) |
| Login pertama di perangkat baru | Bisa offline | Butuh internet (sesudahnya offline jalan seperti biasa) |

## Saran lanjutan (opsional, kapan-kapan)

- Aktifkan **App Check** (Firebase Console → App Check) agar hanya aplikasi resmi yang bisa akses.
- Aktifkan **Point-in-Time Recovery** Firestore (butuh paket Blaze) sebagai anti-wipe pamungkas.
- Rutin pakai fitur **Backup JSON** di menu Pengaturan.
