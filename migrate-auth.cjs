/**
 * MIGRASI AKUN → FIREBASE AUTH (jalankan SEKALI saja)
 * ====================================================
 * Memindahkan semua user dari koleksi Firestore `users` (password plaintext)
 * menjadi akun Firebase Authentication asli, lalu menulis ulang profil
 * (tanpa password) dengan document ID = UID Auth.
 *
 * CARA PAKAI:
 * 1. Firebase Console → ⚙️ Project Settings → Service accounts
 *    → "Generate new private key" → simpan file JSON-nya di folder ini
 *    dengan nama: serviceAccountKey.json
 * 2. Jalankan:  npm install firebase-admin   (sekali saja)
 * 3. Jalankan:  node migrate-auth.cjs
 * 4. Setelah sukses & login diverifikasi: HAPUS file serviceAccountKey.json
 *    (kunci ini akses penuh ke project — jangan pernah di-commit/dibagikan).
 *
 * Script ini aman dijalankan ulang (idempotent): user yang sudah termigrasi
 * akan dilewati.
 */
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');
const EMAIL_DOMAIN = 'monikamulya.com'; // harus sama dengan AUTH_EMAIL_DOMAIN di src/firebase.js

if (!fs.existsSync(KEY_PATH)) {
  console.error('❌ File serviceAccountKey.json tidak ditemukan di folder ini.');
  console.error('   Download dulu dari Firebase Console → Project Settings → Service accounts.');
  process.exit(1);
}

let initializeApp, cert, getFirestore, getAuth;
try {
  ({ initializeApp, cert } = require('firebase-admin/app'));
  ({ getFirestore } = require('firebase-admin/firestore'));
  ({ getAuth } = require('firebase-admin/auth'));
} catch (e) {
  console.error('❌ Paket firebase-admin belum terpasang. Jalankan dulu:  npm install firebase-admin');
  process.exit(1);
}

initializeApp({ credential: cert(require(KEY_PATH)) });
const db = getFirestore();
const auth = getAuth();

const usernameToEmail = (username) => `${String(username || '').trim().toLowerCase()}@${EMAIL_DOMAIN}`;

(async () => {
  console.log('🔎 Membaca koleksi users...\n');
  const snap = await db.collection('users').get();
  if (snap.empty) {
    console.log('Koleksi users kosong — tidak ada yang dimigrasi.');
    process.exit(0);
  }

  const report = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const username = String(data.username || '').trim();

    if (!username) {
      report.push(`⏭️  Lewati dokumen ${docSnap.id}: tidak punya username.`);
      continue;
    }
    if (!data.password) {
      report.push(`⏭️  Lewati "${username}": sudah termigrasi (tidak ada field password).`);
      continue;
    }

    const email = usernameToEmail(username);
    let password = String(data.password);
    let passwordNote = '';
    if (password.length < 6) {
      // Firebase Auth mewajibkan password minimal 6 karakter
      password = `${password}${username}123`.slice(0, 12);
      passwordNote = ` ⚠️ password lama terlalu pendek — PASSWORD BARU: "${password}" (beritahu user ini!)`;
    }

    let uid;
    try {
      const created = await auth.createUser({ email, password, displayName: data.name || username });
      uid = created.uid;
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
        report.push(`ℹ️  Akun Auth "${username}" sudah ada, pakai UID yang ada.`);
      } else {
        report.push(`❌ GAGAL membuat akun "${username}": ${err.message}`);
        continue;
      }
    }

    // Tulis profil baru dengan ID = UID, TANPA password
    const { password: _dropped, ...profile } = data;
    await db.collection('users').doc(uid).set({ ...profile, id: uid, username: username.toLowerCase(), email });

    // Hapus dokumen lama (yang ber-ID angka & berisi password plaintext)
    if (docSnap.id !== uid) {
      await docSnap.ref.delete();
    }

    report.push(`✅ "${username}" (${data.role || 'kasir'}) → login: username "${username.toLowerCase()}"${passwordNote}`);
  }

  console.log(report.join('\n'));
  console.log('\n🎉 Migrasi selesai.');
  console.log('LANGKAH BERIKUTNYA:');
  console.log('  1. Tempel isi file firestore.rules ke Firebase Console → Firestore → Rules → Publish.');
  console.log('  2. Deploy aplikasi versi baru, tes login semua akun.');
  console.log('  3. Hapus akun satpam@monikamulya.com di Console → Authentication.');
  console.log('  4. HAPUS file serviceAccountKey.json dari komputer ini.');
  process.exit(0);
})().catch(err => { console.error('❌ Error:', err); process.exit(1); });
