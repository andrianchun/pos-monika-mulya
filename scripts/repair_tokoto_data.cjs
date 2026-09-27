/**
 * Skrip Pemulihan & Pembersihan Data Tokoto POS (Monika Mulya)
 * 1. Menghapus 97 dokumen Selisih Shift (Minus Semu) di accounting.
 * 2. Merekalsifikasi 82 dokumen Setoran Shift di accounting menjadi Ekuitas/Prive.
 * 3. Mereset flag hppChanged = false pada seluruh produk agar 638 notifikasi bersih.
 */

const fs = require('fs');
const https = require('https');

async function getAccessToken() {
  const auth = require('C:/Users/unthe/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth');
  const acc = auth.getGlobalDefaultAccount();
  if (!acc) throw new Error("Akun Firebase CLI tidak ditemukan.");
  const tokenObj = await auth.getAccessToken(acc.tokens.refresh_token, []);
  return tokenObj.access_token;
}

function makeRequest(url, method = 'GET', body = null, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('🚀 Memulai proses audit dan perbaikan data live Tokoto POS...');
  const token = await getAccessToken();
  console.log('✅ Token otentikasi Firebase berhasil diperoleh.');

  // =========================================================================
  // TAHAP 1: BERSIHKAN DATA ACCOUNTING (SELISIH SHIFT & SETORAN KAS)
  // =========================================================================
  console.log('\n--- TAHAP 1: Membaca seluruh data accounting ---');
  let pageToken = '';
  let accountingDocs = [];
  do {
    const url = `https://firestore.googleapis.com/v1/projects/tokoto-id/databases/(default)/documents/tenants/monikamulya/accounting?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await makeRequest(url, 'GET', null, token);
    if (res.documents) accountingDocs.push(...res.documents);
    pageToken = res.nextPageToken || '';
  } while (pageToken);

  console.log(`Total dokumen accounting ditemukan: ${accountingDocs.length}`);

  const selisihDocsToDelete = [];
  const setoranDocsToUpdate = [];

  for (const doc of accountingDocs) {
    const f = doc.fields || {};
    const name = (f.name?.stringValue || '').toLowerCase();
    const category = (f.category?.stringValue || '').toLowerCase();
    const docPath = doc.name; // projects/tokoto-id/databases/(default)/documents/tenants/monikamulya/accounting/ID

    if (category.includes('selisih shift') || name.includes('selisih shift')) {
      selisihDocsToDelete.push({ path: docPath, id: docPath.split('/').pop(), name: f.name?.stringValue, amount: f.amount });
    } else if (category.includes('setoran') || name.includes('setoran shift') || name.includes('setoran kas')) {
      setoranDocsToUpdate.push({ path: docPath, doc });
    }
  }

  console.log(`\nDokumen Selisih Shift Semu yang akan DIHAPUS: ${selisihDocsToDelete.length}`);
  console.log(`Dokumen Setoran Shift yang akan DIREKLASIFIKASI ke Prive: ${setoranDocsToUpdate.length}`);

  // Hapus dokumen Selisih Shift via Commit Batch API
  if (selisihDocsToDelete.length > 0) {
    console.log(`Menghapus ${selisihDocsToDelete.length} dokumen selisih shift semu...`);
    const chunkSize = 200;
    for (let i = 0; i < selisihDocsToDelete.length; i += chunkSize) {
      const chunk = selisihDocsToDelete.slice(i, i + chunkSize);
      const writes = chunk.map(item => ({
        delete: item.path
      }));
      const commitUrl = 'https://firestore.googleapis.com/v1/projects/tokoto-id/databases/(default)/documents:commit';
      await makeRequest(commitUrl, 'POST', { writes }, token);
      console.log(`  - Berhasil menghapus ${Math.min(i + chunkSize, selisihDocsToDelete.length)} / ${selisihDocsToDelete.length}`);
    }
    console.log('✅ Seluruh dokumen Selisih Shift semu berhasil dibersihkan!');
  }

  // Reklasifikasi Setoran Shift ke Ekuitas / Prive
  if (setoranDocsToUpdate.length > 0) {
    console.log(`\nMerekalsifikasi ${setoranDocsToUpdate.length} dokumen setoran shift ke Ekuitas/Prive...`);
    const chunkSize = 200;
    for (let i = 0; i < setoranDocsToUpdate.length; i += chunkSize) {
      const chunk = setoranDocsToUpdate.slice(i, i + chunkSize);
      const writes = chunk.map(item => {
        const fields = { ...item.doc.fields };
        fields.type = { stringValue: 'ekuitas' };
        fields.category = { stringValue: 'Prive / Setoran Pemilik' };
        return {
          update: {
            name: item.path,
            fields: fields
          },
          updateMask: {
            fieldPaths: ['type', 'category']
          }
        };
      });
      const commitUrl = 'https://firestore.googleapis.com/v1/projects/tokoto-id/databases/(default)/documents:commit';
      await makeRequest(commitUrl, 'POST', { writes }, token);
      console.log(`  - Berhasil mengupdate ${Math.min(i + chunkSize, setoranDocsToUpdate.length)} / ${setoranDocsToUpdate.length}`);
    }
    console.log('✅ Seluruh dokumen Setoran Shift berhasil diubah menjadi Ekuitas (Prive)!');
  }

  // =========================================================================
  // TAHAP 2: BERSIHKAN NOTIFIKASI HPP PADA PRODUK
  // =========================================================================
  console.log('\n--- TAHAP 2: Membaca data produk untuk mereset hppChanged ---');
  let productPageToken = '';
  let productDocs = [];
  do {
    const url = `https://firestore.googleapis.com/v1/projects/tokoto-id/databases/(default)/documents/tenants/monikamulya/products?pageSize=300${productPageToken ? '&pageToken=' + productPageToken : ''}`;
    const res = await makeRequest(url, 'GET', null, token);
    if (res.documents) productDocs.push(...res.documents);
    productPageToken = res.nextPageToken || '';
  } while (productPageToken);

  console.log(`Total produk ditemukan: ${productDocs.length}`);
  const hppProductsToReset = productDocs.filter(d => d.fields?.hppChanged?.booleanValue === true);
  console.log(`Produk dengan hppChanged: true yang menumpuk di notifikasi: ${hppProductsToReset.length}`);

  if (hppProductsToReset.length > 0) {
    console.log(`Mereset ${hppProductsToReset.length} produk menjadi hppChanged = false...`);
    const chunkSize = 200;
    for (let i = 0; i < hppProductsToReset.length; i += chunkSize) {
      const chunk = hppProductsToReset.slice(i, i + chunkSize);
      const writes = chunk.map(doc => {
        const fields = { ...doc.fields };
        fields.hppChanged = { booleanValue: false };
        // Pastikan lastHpp sama dengan cost agar tidak muncul "Dari Rp0"
        if (fields.cost) {
          fields.lastHpp = fields.cost;
          fields.basePrice = fields.cost;
        }
        return {
          update: {
            name: doc.name,
            fields: fields
          },
          updateMask: {
            fieldPaths: ['hppChanged', 'lastHpp', 'basePrice']
          }
        };
      });
      const commitUrl = 'https://firestore.googleapis.com/v1/projects/tokoto-id/databases/(default)/documents:commit';
      await makeRequest(commitUrl, 'POST', { writes }, token);
      console.log(`  - Berhasil mereset ${Math.min(i + chunkSize, hppProductsToReset.length)} / ${hppProductsToReset.length}`);
    }
    console.log('✅ Seluruh notifikasi HPP produk berhasil dibersihkan!');
  }

  console.log('\n🎉 PROSES PEMULIHAN DATABASE SELESAI DENGAN SUKSES! 🎉');
}

run().catch(err => {
  console.error('❌ Error saat menjalankan skrip:', err);
  process.exit(1);
});
