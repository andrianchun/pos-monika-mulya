import { execSync } from 'child_process';
import fs from 'fs';

const run = (cmd, env) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
const readVersion = () => JSON.parse(fs.readFileSync('package.json', 'utf8')).version;

const BUMPS = ['patch', 'minor', 'major'];
const args = process.argv.slice(2);
const forced = args.includes('force');
const apk = args.includes('apk');
const bump = args.find((a) => BUMPS.includes(a)) || 'patch';

const rest = args.filter((a) => a !== 'force' && a !== 'apk' && !BUMPS.includes(a));
if (rest.length > 1) {
  console.error(`Catatan rilis harus satu argumen (pakai tanda kutip): ${rest.join(' | ')}`);
  process.exit(1);
}
const notes = rest[0];
if (notes && !/\s/.test(notes)) {
  console.error(`Catatan rilis "${notes}" hanya satu kata — gunakan kalimat deskriptif.\nContoh: npm run release [patch|minor|major] [force] ["Catatan pembaruan"]`);
  process.exit(1);
}

if (apk && !fs.existsSync('public/apk/tokoto-latest.apk')) {
  console.error('Jalur APK dipilih tapi public/apk/tokoto-latest.apk tidak ditemukan.\n' +
    'Salin terlebih dahulu berkas APK baru ke public/apk/tokoto-latest.apk sebelum menjalankan release apk.');
  process.exit(1);
}

const from = readVersion();
run(`npm version ${bump} --no-git-tag-version`);
const version = readVersion();
console.log(`\n=== RELEASE TOKOTO POS: v${from} -> v${version}${forced ? ' [FORCED UPDATE]' : ''}${apk ? ' [APK TRACK]' : ''} ===\n`);

run('npm run build:ota', { OTA_FORCE: forced ? '1' : '0', OTA_NOTES: notes || '', OTA_APK: apk ? '1' : '0' });

// Bersihkan cache hosting lokal Firebase sebelum deploy untuk mencegah rewrite SPA menyembunyikan /ota
if (fs.existsSync('.firebase')) {
  fs.rmSync('.firebase', { recursive: true, force: true });
}

console.log('\n--- Mendeploy Hosting Firebase ---');
run('firebase deploy --only hosting');

console.log('\n--- Git Commit & Push ---');
run('git add -A');
run(`git commit -m "release: v${version}${notes ? ` - ${notes}` : ''}"`);
run('git push');

console.log(`\n🎉 Tokoto POS v${version} sukses dirilis! PWA akan menerima notifikasi update, dan APK menerima OTA.`);
