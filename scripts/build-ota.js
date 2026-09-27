import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';
import { buildManifest, zipNameFor } from './otaManifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist');
const otaPath = path.resolve(__dirname, '../dist/ota');
const archivePath = path.resolve(__dirname, '../.ota-archive');
const KEEP = 3;

const version = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')).version;
const zipName = zipNameFor(version);
const outputPath = path.join(otaPath, zipName);

console.log(`Building OTA ZIP: ${zipName}`);

if (!fs.existsSync(distPath)) {
  console.error('dist folder does not exist! Please run build first.');
  process.exit(1);
}

if (!fs.existsSync(otaPath)) {
  fs.mkdirSync(otaPath, { recursive: true });
}

const output = fs.createWriteStream(outputPath);
const archive = new ZipArchive({
  zlib: { level: 9 },
});

output.on('close', function () {
  console.log(`${archive.pointer()} total bytes created for ${zipName}`);

  // Simpan ke arsip, pertahankan 3 rilis terakhir agar URL unduhan versi lama tidak langsung 404
  fs.mkdirSync(archivePath, { recursive: true });
  fs.copyFileSync(outputPath, path.join(archivePath, zipName));
  const kept = fs
    .readdirSync(archivePath)
    .filter((f) => f.endsWith('.zip'))
    .sort((a, b) => fs.statSync(path.join(archivePath, b)).mtimeMs - fs.statSync(path.join(archivePath, a)).mtimeMs);

  kept.slice(KEEP).forEach((f) => fs.rmSync(path.join(archivePath, f)));
  kept.slice(0, KEEP).forEach((f) => fs.copyFileSync(path.join(archivePath, f), path.join(otaPath, f)));

  // Buat version.json setelah ZIP selesai
  const apk = process.env.OTA_APK === '1';
  fs.writeFileSync(
    path.join(otaPath, 'version.json'),
    JSON.stringify(
      buildManifest(version, { apk, forced: process.env.OTA_FORCE === '1', notes: process.env.OTA_NOTES }),
      null,
      2
    )
  );

  console.log(`OTA siap (v${version})${apk ? ' — jalur APK' : ''}. Zip ter-deploy: ${kept.slice(0, KEEP).join(', ')}`);
});

archive.on('warning', function (err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on('error', function (err) {
  throw err;
});

archive.pipe(output);

// Abaikan file internal yang tidak dibutuhkan di bundle web mobile
archive.glob('**/*', {
  cwd: distPath,
  ignore: ['ota/**', 'apk/**', 'sw.js', 'workbox-*.js', 'registerSW.js', 'manifest.webmanifest'],
});

archive.finalize();
