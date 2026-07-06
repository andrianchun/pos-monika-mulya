/**
 * RESET PASSWORD USER (untuk Admin/Pemilik)
 * ==========================================
 * Dipakai saat kasir/staf LUPA password. Ganti password sendiri (ingat
 * password lama) tetap bisa langsung di aplikasi lewat menu profil.
 *
 * CARA PAKAI:
 *   node reset-password.cjs <username> <passwordBaru>
 *
 * Contoh:
 *   node reset-password.cjs hana rahasia123
 *
 * Butuh file serviceAccountKey.json di folder ini. Kalau sudah dihapus,
 * download lagi (1 menit): Firebase Console → ⚙️ Project Settings →
 * Service accounts → Generate new private key → simpan di folder ini
 * dengan nama serviceAccountKey.json. Hapus lagi setelah selesai.
 */
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const EMAIL_DOMAIN = 'monikamulya.com'; // harus sama dengan AUTH_EMAIL_DOMAIN di src/firebase.js

const [, , username, newPass] = process.argv;

if (!username || !newPass) {
  console.log('Cara pakai:  node reset-password.cjs <username> <passwordBaru>');
  console.log('Contoh    :  node reset-password.cjs hana rahasia123');
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

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
initializeApp({ credential: cert(require(KEY_PATH)) });

const email = `${String(username).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

(async () => {
  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (e) {
    console.error(`❌ User "${username}" tidak ditemukan (${email}).`);
    process.exit(1);
  }
  await getAuth().updateUser(user.uid, { password: newPass });
  console.log(`✅ Password "${username}" berhasil diganti menjadi: ${newPass}`);
  console.log('   Beritahu user ybs, dan sarankan dia ganti sendiri lewat menu profil aplikasi.');
  process.exit(0);
})().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
