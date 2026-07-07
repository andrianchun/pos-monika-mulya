import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

/**
 * Menghapus SELURUH data tenant dari Firestore Client-Side.
 * Peringatan: Sangat berbahaya dan tidak bisa dibatalkan!
 */
export const wipeTenantData = async (db, tenantId, uid) => {
  if (!tenantId || !uid) throw new Error("Parameter tidak lengkap untuk wipeTenantData.");

  const tenantCollections = [
    'products',
    'categories',
    'units',
    'customers',
    'suppliers',
    'sales',
    'purchases',
    'accounting',
    'activity_logs',
    'shift_history',
    'financial_accounts',
    'settings' // Termasuk doc 'storeInfo' dll.
  ];

  try {
    // 1. Hapus isi setiap subkoleksi
    for (const colName of tenantCollections) {
      const colRef = collection(db, "tenants", tenantId, colName);
      const snap = await getDocs(colRef);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }
    
    // 2. Hapus root doc dari tenant jika diperlukan (meski di Firestore doc kosong otomatis hilang)
    // namun demi kepastian kita eksekusi.
    await deleteDoc(doc(db, "tenants", tenantId));

    // 3. Hapus profil owner dari global_users agar URL tenant bebas digunakan lagi
    await deleteDoc(doc(db, "global_users", uid));

    // Bersihkan juga sisa localStorage (opsional, tapi bagus)
    localStorage.removeItem(`mmpos_storeInfo_${tenantId}`);
    
    return true;
  } catch (error) {
    console.error("Gagal menghapus tenant:", error);
    throw error;
  }
};
