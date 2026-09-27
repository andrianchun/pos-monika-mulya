import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, X, DownloadCloud, Sparkles, RefreshCw } from 'lucide-react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Plugin lokal native Android: mengalirkan byte APK langsung ke PackageInstaller.Session
// Tanpa menyimpan file fisik di Downloads (zero disk residue).
const ApkInstaller = registerPlugin('ApkInstaller');

function DownloadProgress({ progress, isApk }) {
  const isInstalling = progress >= 100;
  return (
    <div className="w-full space-y-2 pt-1 text-left">
      <div className="flex items-center justify-between text-xs font-bold text-white">
        <span className="text-slate-300">
          {isInstalling
            ? isApk
              ? 'Mempersiapkan pemasangan APK…'
              : 'Memasang pembaruan & memuat ulang…'
            : isApk
              ? 'Mengunduh berkas APK baru…'
              : 'Mengunduh pembaruan OTA…'}
        </span>
        <span className="tabular-nums font-mono text-orange-400 font-bold">{progress}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800 relative border border-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-150 ease-out"
          style={{ width: `${Math.max(progress, 3)}%` }}
        />
        {isInstalling && (
          <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
        )}
      </div>
      <p className="text-[12px] text-slate-400 text-center">
        {isInstalling
          ? isApk
            ? 'Konfirmasi dialog "Update/Install" di layar Anda.'
            : 'Tokoto POS akan otomatis dimuat ulang.'
          : 'Jangan tutup aplikasi saat proses mengunduh.'}
      </p>
    </div>
  );
}

export default function UpdaterAlert() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [manifest, setManifest] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Versi bundle JS yang sedang aktif berjalan di aplikasi
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
  const isNative = Capacitor.isNativePlatform();

  const checkUpdate = useCallback(async () => {
    try {
      const primaryUrl = isNative ? 'https://tokoto-id.web.app/ota/version.json' : '/ota/version.json';
      let res = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        res = await fetch(`${primaryUrl}?t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch {
        if (!isNative) {
          try {
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 7000);
            res = await fetch(`https://tokoto-id.web.app/ota/version.json?t=${Date.now()}`, {
              cache: 'no-store',
              signal: controller2.signal,
            });
            clearTimeout(timeoutId2);
          } catch {
            return;
          }
        }
      }

      if (!res || !res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;

      const data = await res.json();

      // Jika rilis khusus APK tapi dibuka di browser web biasa, abaikan
      if (data.is_apk && !isNative) {
        setUpdateAvailable(false);
        return;
      }

      // Deteksi versi berbeda berdasarkan bundle aktif (__APP_VERSION__)
      if (data.ota_version && data.ota_version !== currentVersion) {
        const storedDismiss = localStorage.getItem('tokoto_dismissed_ota');
        if (storedDismiss === data.ota_version && !data.is_forced) {
          setUpdateAvailable(false);
          return;
        }
        setManifest(data);
        setUpdateAvailable(true);
      } else {
        setUpdateAvailable(false);
      }
    } catch {
      // Abaikan jika offline / koneksi terputus
    }
  }, [currentVersion, isNative]);

  useEffect(() => {
    checkUpdate();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkUpdate();
    };
    const onOnline = () => checkUpdate();
    const onTrigger = (e) => {
      if (e.detail) {
        setManifest(e.detail);
        setUpdateAvailable(true);
      } else {
        checkUpdate();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('tokoto_trigger_ota', onTrigger);
    const interval = setInterval(checkUpdate, 20 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('tokoto_trigger_ota', onTrigger);
      clearInterval(interval);
    };
  }, [checkUpdate]);

  // Listener progres Capgo (khusus bundle ZIP OTA di Native APK)
  useEffect(() => {
    if (!isNative) return;
    let listener;
    CapacitorUpdater.addListener('download', (info) => {
      setDownloadProgress(Math.round(info.percent || 0));
    }).then((l) => {
      listener = l;
    });

    return () => {
      if (listener) listener.remove();
    };
  }, [isNative]);

  // Listener progres ApkInstaller (khusus unduhan streaming in-app APK tanpa sisa file)
  useEffect(() => {
    if (!isNative || Capacitor.getPlatform() !== 'android') return;
    let listener;
    ApkInstaller.addListener('apkInstall', (info) => {
      if (info?.state === 'downloading') {
        setDownloadProgress(Math.round(info.percent || 0));
      } else if (info?.state === 'installing' || info?.state === 'prompt') {
        setDownloadProgress(100);
      } else if (info?.state === 'failed') {
        setDownloadProgress(null);
        setErrorMsg(info?.message || 'Pemasangan APK dibatalkan atau gagal.');
      }
    }).then((l) => {
      listener = l;
    });

    return () => {
      if (listener) listener.remove();
    };
  }, [isNative]);

  const handleUpdate = async () => {
    if (!manifest) return;
    setErrorMsg('');
    localStorage.removeItem('tokoto_dismissed_ota');

    const isApkRelease = manifest.is_apk || !manifest.ota_url?.toLowerCase().endsWith('.zip');

    // 1. Jalur APK Mandiri: Pasang langsung dari dalam aplikasi via PackageInstaller (Zero Disk Residue)
    if (isApkRelease) {
      if (isNative && Capacitor.getPlatform() === 'android') {
        setDownloadProgress(0);
        try {
          const res = await ApkInstaller.install({ url: manifest.ota_url });
          if (res?.needsPermission) {
            setDownloadProgress(null);
            setErrorMsg('Android butuh izin untuk memasang pembaruan langsung. Aktifkan "Izinkan dari sumber ini", lalu tekan Update lagi.');
            await ApkInstaller.openInstallSettings();
            return;
          }
          return;
        } catch (err) {
          console.warn('ApkInstaller belum terpasang di biner APK lama, mengunduh APK lewat browser...', err);
          setDownloadProgress(null);
          window.open(manifest.ota_url, '_system');
          return;
        }
      }

      window.open(manifest.ota_url, '_blank');
      return;
    }

    // 2. Jalur Web / PWA: Refresh service worker dan reload halaman seketika
    if (!isNative) {
      setDownloadProgress(0);
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (e) {}
      setDownloadProgress(100);
      setTimeout(() => {
        window.location.reload();
      }, 400);
      return;
    }

    // 3. Jalur Native APK: Unduh bundle ZIP OTA via Capgo dan pasang langsung
    try {
      setDownloadProgress(0);
      const bundle = await CapacitorUpdater.download({
        url: manifest.ota_url,
        version: manifest.ota_version,
      });
      setDownloadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await CapacitorUpdater.set(bundle);
    } catch (err) {
      console.error('OTA Update failed:', err);
      setDownloadProgress(null);
      setErrorMsg(err?.message || 'Gagal mengunduh pembaruan. Periksa koneksi internet.');
    }
  };

  const handleDismiss = () => {
    if (manifest?.ota_version) {
      localStorage.setItem('tokoto_dismissed_ota', manifest.ota_version);
    }
    setUpdateAvailable(false);
  };

  if (!updateAvailable || !manifest) {
    return null;
  }

  const isDownloading = downloadProgress !== null;
  const isApkRelease = manifest.is_apk || !manifest.ota_url?.toLowerCase().endsWith('.zip');
  const versionLine = currentVersion && manifest.ota_version
    ? `v${currentVersion} → v${manifest.ota_version}`
    : `v${manifest.ota_version}`;

  // Mode 1: FORCED UPDATE (Modal memblokir penuh layar kasir jika is_forced == true)
  if (manifest.is_forced) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-300">
        <div className="w-full max-w-sm rounded-3xl border border-orange-500/30 bg-slate-900/95 p-6 shadow-2xl space-y-4 text-center text-white">
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="size-20 rounded-3xl border border-white/20 p-2 bg-gradient-to-br from-orange-500/20 to-amber-500/10 backdrop-blur-md flex items-center justify-center shadow-lg shadow-orange-500/20">
              <img
                src="/icon.png"
                alt="Tokoto POS"
                className="size-16 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1">Pembaruan Wajib!</h2>
            <p className="text-xs text-slate-400 px-2">
              Versi terbaru Tokoto POS telah dirilis. Harap perbarui aplikasi untuk melanjutkan transaksi kasir.
            </p>
            <p className="text-xs font-bold text-orange-400 font-mono mt-1">{versionLine}</p>
          </div>

          {manifest.release_notes && (
            <div className="rounded-2xl bg-slate-800/80 p-3.5 text-left border border-slate-700/60 space-y-1">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} />
                Yang Baru:
              </p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {manifest.release_notes}
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="text-center text-xs font-semibold text-rose-400 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800">
              {errorMsg}
            </p>
          )}

          <div className="pt-2">
            {isDownloading ? (
              <DownloadProgress progress={downloadProgress ?? 0} isApk={isApkRelease} />
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleUpdate}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:brightness-110 active:scale-95 transition-all"
                >
                  <DownloadCloud size={18} />
                  <span>Update Sekarang</span>
                </button>
                {isApkRelease && (
                  <a
                    href={manifest.ota_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs font-medium text-slate-400 hover:text-orange-400 underline underline-offset-2 transition-colors pt-1"
                  >
                    Atau unduh berkas APK langsung
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mode 2: NON-FORCED UPDATE (Floating Glass Banner yang elegan di bagian bawah layar)
  return (
    <aside aria-label="Notifikasi Pembaruan" className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-[9999] animate-in slide-in-from-bottom-6 fade-in duration-300">
      <div className="flex flex-col gap-3 rounded-2xl border border-orange-500/25 bg-slate-900/95 p-4 shadow-2xl shadow-orange-500/10 backdrop-blur-xl relative overflow-hidden text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="size-11 rounded-xl shadow-md border border-white/20 p-1 bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center shrink-0">
              <img
                src="/icon.png"
                alt="Tokoto"
                className="size-8 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white leading-tight truncate flex items-center gap-1.5">
                Update Tersedia
                <span className="size-2 rounded-full bg-orange-500 animate-pulse"></span>
              </h3>
              <p className="text-xs text-orange-300/80 font-mono mt-0.5 truncate">
                {versionLine}
              </p>
            </div>
          </div>

          {!isDownloading && (
            <button
              onClick={handleDismiss}
              aria-label="Tutup notifikasi update"
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {manifest.release_notes && !isDownloading && (
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            {manifest.release_notes}
          </p>
        )}

        {errorMsg && (
          <p className="text-xs font-semibold text-rose-400 bg-rose-950/60 p-2 rounded-xl border border-rose-800">{errorMsg}</p>
        )}

        {isDownloading ? (
          <DownloadProgress progress={downloadProgress ?? 0} isApk={isApkRelease} />
        ) : (
          <button
            onClick={handleUpdate}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <DownloadCloud size={16} />
            <span>Update Sekarang</span>
          </button>
        )}
      </div>
    </aside>
  );
}
