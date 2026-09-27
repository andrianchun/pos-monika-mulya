// Manifest builder for OTA and APK releases
export const APK_URL = 'https://tokoto-id.web.app/apk/tokoto-latest.apk';

export const zipNameFor = (version) => `update_${version.replace(/\./g, '')}.zip`;

export function buildManifest(version, { apk = false, forced = false, notes = '' } = {}) {
  const manifest = {
    ota_version: version,
    ota_url: apk ? APK_URL : `https://tokoto-id.web.app/ota/${zipNameFor(version)}`,
    is_forced: forced,
    release_notes: notes || `Pembaruan Tokoto POS v${version}`,
  };
  if (apk) manifest.is_apk = true;
  return manifest;
}
