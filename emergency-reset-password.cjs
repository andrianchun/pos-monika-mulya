/**
 * PINTU DARURAT — RESET PASSWORD (dipakai HANYA kalau tidak bisa login admin sama sekali)
 * =========================================================================================
 * Kalau masih ada admin lain yang bisa login: pakai menu Pengaturan → Hak Akses
 * User → ikon 🔑 di baris user — jauh lebih cepat, tidak perlu buka komputer.
 *
 * Script ini untuk kondisi darurat: SATU-SATUNYA admin lupa password sehingga
 * tidak ada yang bisa login ke aplikasi untuk memakai tombol di atas. Script
 * ini bekerja lewat kunci proyek Firebase (bukan lewat login aplikasi), jadi
 * tetap bisa dipakai meski semua akun terkunci.
 *
 * CARA PAKAI:
 * 1. Firebase Console (login pakai akun Google pemilik project) → ⚙️ Project
 *    Settings → Service accounts → Generate new private key → simpan file
 *    JSON-nya di folder ini dengan nama: serviceAccountKey.json
 * 2. Jalankan:  npm install firebase-admin   (kalau belum pernah)
 * 3. Jalankan:  node emergency-reset-password.cjs <username> <passwordBaru>
 *    Contoh   :  node emergency-reset-password.cjs admin passwordbaru123
 * 4. Login ke aplikasi pakai password baru itu.
 * 5. HAPUS file serviceAccountKey.json dari komputer (kunci ini akses penuh
 *    ke seluruh project — jangan disimpan/dibagikan/di-commit ke git).
 */
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const EMAIL_DOMAIN = 'monikamulya.com'; // harus sama dengan AUTH_EMAIL_DOMAIN di src/firebase.js

const [, , username, newPass] = process.argv;

if (!username || !newPass) {
  console.log('Cara pakai:  node emergency-reset-password.cjs <username> <passwordBaru>');
  console.log('Contoh    :  node emergency-reset-password.cjs admin passwordbaru123');
  process.exit(1);
}
if (newPass.length < 6) {
  console.error('❌ Password baru minimal 6 karakter.');
  process.exit(1);
}
if (!fs.existsSync(KEY_PATH)) {
  console.error('❌ File serviceAccountKey.json tidak ditemukan di folder ini.');
  console.error('   Download: Firebase Console → ⚙️ Project Settings → Service accounts');
  console.error('   → Generate new private key → simpan sebagai serviceAccountKey.json.');
  process.exit(1);
}

let initializeApp, cert, getAuth;
try {
  ({ initializeApp, cert } = require('firebase-admin/app'));
  ({ getAuth } = require('firebase-admin/auth'));
} catch (e) {
  console.error('❌ Paket firebase-admin belum terpasang. Jalankan dulu:  npm install firebase-admin');
  process.exit(1);
}

initializeApp({ credential: cert(require(KEY_PATH)) });

const email = `${String(username).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

(async () => {
  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (e) {
    console.error(`❌ User "${username}" tidak ditemukan (${email}).`);
    console.error('   Cek ejaan username. Ini harus sama persis dengan username login di aplikasi.');
    process.exit(1);
  }
  await getAuth().updateUser(user.uid, { password: newPass });
  console.log(`✅ Password "${username}" berhasil direset menjadi: ${newPass}`);
  console.log('   Sekarang login ke aplikasi pakai password baru ini.');
  console.log('   Jangan lupa hapus serviceAccountKey.json setelah selesai!');
  process.exit(0);
})().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
