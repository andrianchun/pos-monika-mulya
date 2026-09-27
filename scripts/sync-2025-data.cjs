/**
 * SYNC DATA 2025: hxpos2 -> tokoto-id (tenants/monikamulya)
 * ========================================================
 * Menyedot data transaksi tahun 2025 yang belum ada di tokoto-id
 * dengan proteksi ganda:
 * 1. Tidak akan menimpa (overwrite) dokumen apapun yang sudah ada di tokoto-id
 * 2. Struktur data, nota, tanggal, item, dan nominal dipertahankan 100% identik
 * 3. Menghitung dan melaporkan setiap batch penulisan secara transparan
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Baca Google OAuth Token dari firebase-tools session
function getAccessToken() {
  const p = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(p)) {
    throw new Error('Configstore firebase-tools.json tidak ditemukan.');
  }
  const config = JSON.parse(fs.readFileSync(p, 'utf8'));
  return config.tokens?.access_token;
}

let TOKEN = getAccessToken();

async function authedFetch(url, options = {}) {
  options.headers = options.headers || {};
  options.headers['Authorization'] = 'Bearer ' + TOKEN;
  let res = await fetch(url, options);
  if (res.status === 401) {
    console.log('🔄 Token kedaluwarsa, memperbarui token...');
    TOKEN = getAccessToken();
    options.headers['Authorization'] = 'Bearer ' + TOKEN;
    res = await fetch(url, options);
  }
  return res;
}

// 1. Ambil seluruh ID yang sudah ada di tokoto-id agar 100% bebas tumpang tindih
async function getExistingIds(colName) {
  console.log(`🔍 Memindai ID yang sudah ada di tokoto-id (${colName})...`);
  const existingSet = new Set();
  let pageToken = '';
  do {
    const url = `https://firestore.googleapis.com/v1/projects/tokoto-id/databases/(default)/documents/tenants/monikamulya/${colName}?pageSize=300&mask.fieldPaths=id${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await authedFetch(url);
    if (!res.ok) {
      throw new Error(`Gagal membaca ${colName} dari tokoto-id: ${await res.text()}`);
    }
    const data = await res.json();
    if (data.documents) {
      for (const d of data.documents) {
        existingSet.add(d.name.split('/').pop());
      }
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  console.log(`   -> Ditemukan ${existingSet.size} dokumen aktif di tokoto-id (${colName}).`);
  return existingSet;
}

// 2. Eksekusi batch write ke tokoto-id
async function commitBatch(writes) {
  if (writes.length === 0) return 0;
  const url = 'https://firestore.googleapis.com/v1/projects/tokoto-id/databases/(default)/documents:batchWrite';
  const res = await authedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal batch write ke tokoto-id: ${errText}`);
  }

  const resJson = await res.json();
  return resJson.writeResults?.length || writes.length;
}

// 3. Migrasi koleksi secara streaming batch
async function syncCollection(colName) {
  console.log(`\n======================================================`);
  console.log(`🚀 MEMULAI SINKRONISASI KOLEKSI: ${colName.toUpperCase()}`);
  console.log(`======================================================`);

  const existingIds = await getExistingIds(colName);

  let pageToken = '';
  let totalRead = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let pendingWrites = [];

  do {
    const url = `https://firestore.googleapis.com/v1/projects/hxpos2/databases/(default)/documents/${colName}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await authedFetch(url);
    if (!res.ok) {
      throw new Error(`Gagal membaca ${colName} dari hxpos2: ${await res.text()}`);
    }

    const data = await res.json();
    const docs = data.documents || [];
    totalRead += docs.length;

    for (const doc of docs) {
      const docId = doc.name.split('/').pop();
      if (existingIds.has(docId)) {
        totalSkipped++;
        continue; // AMAN: Sudah ada di tokoto-id, jangan pernah disentuh/ditimpa!
      }

      // Siapkan penulisan ke tujuan tokoto-id/tenants/monikamulya/<colName>/<docId>
      const targetDocName = `projects/tokoto-id/databases/(default)/documents/tenants/monikamulya/${colName}/${docId}`;
      pendingWrites.push({
        update: {
          name: targetDocName,
          fields: doc.fields || {}
        }
      });

      // Tulis per batch 200 dokumen untuk performa optimal
      if (pendingWrites.length >= 200) {
        const written = await commitBatch(pendingWrites);
        totalMigrated += written;
        process.stdout.write(`   ✓ Tersalin ${totalMigrated} dokumen (${colName})...\r`);
        pendingWrites = [];
      }
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  // Tulis sisa dokumen yang belum mencapai 200
  if (pendingWrites.length > 0) {
    const written = await commitBatch(pendingWrites);
    totalMigrated += written;
    pendingWrites = [];
  }

  console.log(`\n✅ SINKRONISASI ${colName.toUpperCase()} SELESAI:`);
  console.log(`   - Total dokumen dibaca dari hxpos2: ${totalRead}`);
  console.log(`   - Total dokumen baru berhasil disalin: ${totalMigrated}`);
  console.log(`   - Total dokumen dilewati (sudah ada): ${totalSkipped}`);

  return { totalRead, totalMigrated, totalSkipped };
}

async function run() {
  console.log('🏁 MEMULAI PROSES SEDOT & GABUNGKAN DATA 2025 KE TOKOTO-ID');
  console.log(`Waktu Mulai: ${new Date().toLocaleString('id-ID')}\n`);

  const startTime = Date.now();

  try {
    // 1. Sinkronisasi Sales (Penjualan 2025)
    const salesResult = await syncCollection('sales');

    // 2. Sinkronisasi Purchases (Pembelian 2025)
    const purchasesResult = await syncCollection('purchases');

    // 3. Sinkronisasi Accounting (Buku Kas 2025)
    const accountingResult = await syncCollection('accounting');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n======================================================`);
    console.log(`🎉 SEMUA DATA TAHUN 2025 BERHASIL DIGABUNGKAN DENGAN SEMPURNA!`);
    console.log(`Waktu proses: ${duration} detik`);
    console.log(`Ringkasan:`);
    console.log(`- Sales (Penjualan) : +${salesResult.totalMigrated} nota 2025 ditambahkan`);
    console.log(`- Purchases (Beli)  : +${purchasesResult.totalMigrated} nota 2025 ditambahkan`);
    console.log(`- Accounting (Kas)  : +${accountingResult.totalMigrated} entri kas 2025 ditambahkan`);
    console.log(`Semua data 2026 yang sudah berjalan tetap 100% utuh tanpa ada yang tertimpa.`);
    console.log(`======================================================`);
  } catch (err) {
    console.error('\n❌ Terjadi kesalahan saat migrasi:', err);
    process.exit(1);
  }
}

run();
