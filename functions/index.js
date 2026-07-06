/**
 * Cloud Functions — POS Monika Mulya
 * ===================================
 * Operasi manajemen akun staf yang butuh hak akses admin (Firebase Admin SDK)
 * dan TIDAK BOLEH dijalankan langsung dari browser client:
 *  - createStaffAccount: bikin akun staf baru
 *  - resetStaffPassword: reset password staf yang lupa (tanpa perlu password lama)
 *  - deleteStaffAccount: hapus akun staf (Auth + profil Firestore) sekaligus
 *  - resolveLoginEmail: dipanggil TANPA login (dari layar Login) untuk
 *    menerjemahkan username -> email asli yang sedang aktif di Firebase Auth,
 *    supaya login by-username tetap jalan meski usernya sudah ganti email
 *    dari alamat sintetis (username@monikamulya.com) ke email asli miliknya.
 *
 * Fungsi bertanda admin memverifikasi pemanggilnya sudah login DAN rolenya
 * admin (dicek dari dokumen Firestore users/{uid}) sebelum melakukan apa pun.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

const EMAIL_DOMAIN = 'monikamulya.com'; // harus sama dengan AUTH_EMAIL_DOMAIN di src/firebase.js
const usernameToEmail = (username) => `${String(username || '').trim().toLowerCase()}@${EMAIL_DOMAIN}`;

async function assertIsAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Anda harus login terlebih dahulu.');
  }
  const profileSnap = await getFirestore().collection('users').doc(request.auth.uid).get();
  const profile = profileSnap.data();
  if (!profile || profile.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Hanya admin yang boleh melakukan aksi ini.');
  }
}

// Sumber kebenaran alamat email login saat ini untuk sebuah username. Profil
// Firestore menyimpan `email` yang selalu disinkronkan ke email Auth yang
// benar-benar aktif (lihat App.jsx: efek sinkronisasi setelah verifikasi
// ganti email) — jadi ini SELALU akurat, baik masih sintetis maupun sudah
// diganti ke email asli oleh user.
async function findAuthEmailByUsername(username) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!cleanUsername) return null;
  const snap = await getFirestore().collection('users').where('username', '==', cleanUsername).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data().email || usernameToEmail(cleanUsername);
}

exports.createStaffAccount = onCall(async (request) => {
  await assertIsAdmin(request);
  const { username, password, name, role, permissions } = request.data || {};

  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!cleanUsername) throw new HttpsError('invalid-argument', 'Username wajib diisi.');
  if (!password || password.length < 6) throw new HttpsError('invalid-argument', 'Password minimal 6 karakter.');
  if (!name || !String(name).trim()) throw new HttpsError('invalid-argument', 'Nama wajib diisi.');

  const email = usernameToEmail(cleanUsername);
  let authUser;
  try {
    authUser = await getAuth().createUser({ email, password, displayName: name });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Username sudah dipakai akun lain.');
    }
    throw new HttpsError('internal', 'Gagal membuat akun: ' + err.message);
  }

  const profile = {
    id: authUser.uid,
    username: cleanUsername,
    email,
    name: String(name).trim(),
    role: role === 'admin' ? 'admin' : 'kasir',
    permissions: role === 'admin' ? ['all'] : (Array.isArray(permissions) ? permissions : []),
    avatar: null,
  };
  await getFirestore().collection('users').doc(authUser.uid).set(profile);

  return { success: true, profile };
});

exports.resetStaffPassword = onCall(async (request) => {
  await assertIsAdmin(request);
  const { username, newPassword } = request.data || {};

  if (!newPassword || newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password baru minimal 6 karakter.');
  }
  const email = await findAuthEmailByUsername(username);
  if (!email) throw new HttpsError('not-found', `User "${username}" tidak ditemukan.`);
  let targetUser;
  try {
    targetUser = await getAuth().getUserByEmail(email);
  } catch (e) {
    throw new HttpsError('not-found', `Akun login untuk "${username}" tidak ditemukan di Firebase Auth.`);
  }
  await getAuth().updateUser(targetUser.uid, { password: newPassword });
  return { success: true };
});

exports.deleteStaffAccount = onCall(async (request) => {
  await assertIsAdmin(request);
  const { username } = request.data || {};

  const email = await findAuthEmailByUsername(username);
  try {
    if (email) {
      const targetUser = await getAuth().getUserByEmail(email);
      if (targetUser.uid === request.auth.uid) {
        throw new HttpsError('failed-precondition', 'Tidak bisa menghapus akun sendiri yang sedang login.');
      }
      await getAuth().deleteUser(targetUser.uid);
      await getFirestore().collection('users').doc(targetUser.uid).delete();
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    // User Auth mungkin sudah tidak ada — tetap coba bersihkan profil Firestore by username
    const snap = await getFirestore().collection('users').where('username', '==', String(username).toLowerCase()).get();
    await Promise.all(snap.docs.map(d => d.ref.delete()));
  }
  return { success: true };
});

// Dipanggil dari layar Login SEBELUM autentikasi (tanpa cek admin — memang
// harus bisa dipakai siapa pun yang belum login). Hanya mengembalikan alamat
// email yang perlu dipakai untuk sign-in; tidak membocorkan data lain.
exports.resolveLoginEmail = onCall(async (request) => {
  const { username } = request.data || {};
  const email = await findAuthEmailByUsername(username);
  if (!email) throw new HttpsError('not-found', 'Username tidak ditemukan.');
  return { email };
});
