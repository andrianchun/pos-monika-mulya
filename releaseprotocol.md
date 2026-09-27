# Tokoto App Release Protocol (`releaseprotocol.md`)

Panduan standar enterprise ini ditujukan untuk AI Assistant (seperti Cursor, Claude Code, atau Antigravity) dan Developer saat merilis (*release*) atau memperbarui versi aplikasi **Tokoto POS** (`tokoto-id.web.app`).

---

## 1. Pilih Jalur Rilis Terlebih Dahulu

Ada dua jalur rilis di Tokoto. **Hampir selalu Jalur A yang benar.**
Tanyakan satu hal: *Apakah ada perubahan native di folder `android/` (plugin native baru, permission OS, icon launcher, SDK gradle)?*

| Parameter | Jalur A — OTA / Web Bundle (Default) | Jalur B — APK Native |
|---|---|---|
| **Kapan Dipakai** | Perubahan React, UI/UX, Logika Kasir, CSS, Firestore Rules, DB lokal | Ada perubahan native di `android/` atau izin OS baru |
| **Perintah Utama** | `npm run release` | Build APK → Salin ke hosting → `npm run release apk` |
| **Yang Diterima User** | Bundle web ±2–4 MB, hot-update instan di dalam aplikasi | APK ±20–30 MB, diunduh langsung dari hosting |
| **Pengalaman User** | **Seamless**: Notifikasi update muncul, 1 klik langsung terbarui tanpa install ulang | Browser/App mengunduh APK, Android memicu dialog install sistem |

---

## 2. Aturan Mutlak Rilis (*Strict Invariants*)

1. **`dist/ota/version.json` hanya boleh dihasilkan oleh `npm run build:ota` atau `scripts/build-ota.js`.**
   Jangan pernah membuat file manual `public/ota/version.json` — Vite akan menyalin `public/` ke `dist/`, sehingga menimpa manifest asli dengan konfigurasi basi/kosong.
2. **Deploy hosting selalu lewat script rilis resmi, jangan `npm run build` polos.**
   `npm run build` biasa tidak membuat bundle ZIP OTA dan tidak menulis manifest `version.json`.
3. **Naikkan versi `package.json` SEBELUM proses build dijalankan.**
   Konstanta `__APP_VERSION__` di-bake oleh Vite saat build. Jika build jalan duluan, aplikasi melaporkan versi lama dan terus-menerus memicu loop update.
4. **Dilarang keras memakai link Google Drive / MediaFire untuk unduhan APK.**
   Layanan penyimpanan pihak ketiga selalu menyajikan halaman interstitial HTML peringatan virus, yang menyebabkan proses instalasi otomatis gagal. File APK wajib disajikan langsung dari domain hosting resmi: `https://tokoto-id.web.app/apk/tokoto-latest.apk`.
5. **Bersihkan cache `.firebase` sebelum deploy.**
   Cache Firebase CLI terkadang melewatkan file yang dikira sudah terunggah, menyebabkan `version.json` atau ZIP hilang dan terkena rewrite SPA `index.html`. Script `release.js` wajib otomatis membersihkan cache ini.

---

## 3. Jalur A — Rilis OTA / Web (Hot-Patch Instan)

### Rilis Normal (Pembaruan Fitur/Bugfix Biasa)
```bash
npm run release "Perbaikan perhitungan diskon dan tampilan struk"
```
*Atau untuk menaikkan minor/major:*
```bash
npm run release minor "Pembaruan modul analitik kasir dan laporan laba"
npm run release major "Peluncuran Tokoto POS v2.0"
```

### Rilis Wajib / Kritis (*Forced In-App Update*)
Gunakan kata kunci `force` jika ada perbaikan bug kritis keuangan atau perubahan skema database multi-tenant yang wajib diterapkan seketika:
```bash
npm run release force "Perbaikan kritis sinkronisasi checkout multi-cabang"
```

### Verifikasi Setelah Rilis
```bash
curl -s https://tokoto-id.web.app/ota/version.json
```
Manifest harus menampilkan `ota_version` terbaru dan URL bundle zip yang valid.

---

## 4. Jalur B — Rilis APK Native (Hanya Jika Ada Perubahan Android Native)

Jalankan tahapan berikut secara berurutan:

### Langkah 1: Update Versi di Web & Gradle
1. Naikkan `version` di `package.json` (misalnya dari `1.0.0` ke `1.0.1`).
2. Di `android/app/build.gradle`:
   - Naikkan `versionCode` (+1).
   - Samakan `versionName` dengan `package.json`.

### Langkah 2: Build & Salin APK ke Hosting
```bash
npm run sync:android
cd android && ./gradlew assembleRelease && cd ..
cp android/app/build/outputs/apk/release/app-release.apk public/apk/tokoto-latest.apk
```

### Langkah 3: Rilis Jalur APK
```bash
npm run release force apk "Menambah integrasi printer bluetooth thermal native"
```
Kata `apk` akan otomatis menyetel `"is_apk": true` pada manifest `version.json`, sehingga tombol Update di aplikasi langsung mengunduh file APK resmi.

### Verifikasi Jalur APK
```bash
curl -s https://tokoto-id.web.app/ota/version.json
curl -sIL https://tokoto-id.web.app/apk/tokoto-latest.apk | grep -i "content-type"
```
Header harus bertipe `application/vnd.android.package-archive` (bukan `text/html`).

---

## 5. Ringkasan Siklus Rilis Otomatis

Script `npm run release` secara otomatis melakukan rangkaian:
1. Validasi argumen & kelengkapan file APK (jika jalur APK).
2. Bump versi semver (`patch` / `minor` / `major`).
3. Build Vite bundle.
4. Kompresi OTA ZIP level 9 dengan retensi 3 versi terakhir.
5. Pembuatan manifest `dist/ota/version.json`.
6. Purge cache `.firebase/`.
7. Deploy ke Firebase Hosting (`tokoto-id`).
