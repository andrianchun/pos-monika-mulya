import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export const runHxposMigration = async (tenantId, setProgressLog) => {
  if (!tenantId) {
    setProgressLog("ERROR: Tenant ID tidak ditemukan!");
    return;
  }

  const legacyCollections = [
    'users',
    'settings',
    'products',
    'sales',
    'purchases',
    'customers',
    'suppliers',
    'accounting',
    'financialAccounts',
    'shiftHistory',
    'activityLogs'
  ];

  setProgressLog(`🚀 Memulai migrasi dari hxpos2 ke tenant: [${tenantId}]`);
  
  let totalDataCopied = 0;

  for (const collName of legacyCollections) {
    setProgressLog(`Sedang memproses koleksi: /${collName}...`);
    try {
      // 1. WIPE (Bersihkan data uji coba yang ada di dalam tenant sekarang)
      const tenantCollRef = collection(db, 'tenants', tenantId, collName);
      const tenantSnap = await getDocs(tenantCollRef);
      if (!tenantSnap.empty) {
         let wipeBatch = writeBatch(db);
         let wipeCount = 0;
         for (const tDoc of tenantSnap.docs) {
             wipeBatch.delete(tDoc.ref);
             wipeCount++;
             if (wipeCount === 400) { await wipeBatch.commit(); wipeBatch = writeBatch(db); wipeCount = 0; }
         }
         if (wipeCount > 0) await wipeBatch.commit();
         setProgressLog(`  -> (WIPE) Dihapus ${tenantSnap.docs.length} data uji coba dari tenant.`);
      }

      // 2. COPY (Sedot dari legacy hxpos2)
      // Coba sedot dari ROOT terlebih dahulu
      let q = collection(db, collName);
      let snapshot = await getDocs(q);
      
      // Jika ROOT kosong, mungkin maksud Bos Chun hxpos2 itu ada di dalam kamar tenant lama bernama 'hxpos2'!
      if (snapshot.empty) {
         q = collection(db, 'tenants', 'hxpos2', collName);
         snapshot = await getDocs(q);
      }

      if (snapshot.empty) {
        setProgressLog(`  -> Koleksi legacy /${collName} (dan tenants/hxpos2/${collName}) benar-benar kosong. Lewati.`);
        continue;
      }

      const docs = snapshot.docs;
      setProgressLog(`  -> Ditemukan ${docs.length} dokumen. Sedang meng-copy...`);

      // Firestore Batch memiliki limit maksimal 500 operasi per batch
      const BATCH_LIMIT = 400;
      let batch = writeBatch(db);
      let operationCount = 0;
      let copiedCount = 0;

      for (let i = 0; i < docs.length; i++) {
        const docSnap = docs[i];
        
        // Buat referensi tujuan di dalam kamar tenant
        const targetRef = doc(db, 'tenants', tenantId, collName, docSnap.id);
        
        // Copy seluruh data
        batch.set(targetRef, docSnap.data());
        
        operationCount++;
        copiedCount++;
        totalDataCopied++;

        // Commit jika sudah mencapai limit atau merupakan dokumen terakhir
        if (operationCount === BATCH_LIMIT || i === docs.length - 1) {
          await batch.commit();
          setProgressLog(`  -> Berhasil menyimpan batch (${copiedCount}/${docs.length}) ke /tenants/${tenantId}/${collName}`);
          // Reset batch untuk sisa dokumen
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

    } catch (err) {
      setProgressLog(`❌ ERROR gagal memigrasi /${collName}: ${err.message}`);
      // Lanjutkan ke koleksi berikutnya meskipun satu koleksi gagal
    }
  }

  setProgressLog(`\n✅ MIGRASI SELESAI!\nTotal ${totalDataCopied} dokumen berhasil disalin ke toko ${tenantId}. Data HxPOS2 Anda tidak dihapus dan tetap aman!`);
};
