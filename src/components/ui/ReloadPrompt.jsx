import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

// Helper membandingkan semver: 1 jika v1 > v2, -1 jika v1 < v2, 0 jika sama
function compareSemver(v1, v2) {
  if (!v1 || !v2) return 0;
  const clean1 = String(v1).trim().replace(/^v/i, '');
  const clean2 = String(v2).trim().replace(/^v/i, '');
  const p1 = clean1.split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = clean2.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

export default function ReloadPrompt() {
  const [forceShow, setForceShow] = useState(false);
  const [serverReleaseNotes, setServerReleaseNotes] = useState('');
  const [serverVersion, setServerVersion] = useState('');
  const [serverBuildTime, setServerBuildTime] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  // Hook bawaan vite-plugin-pwa untuk bereaksi terhadap pembaruan Service Worker
  const sw = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        window.__tokoto_sw_reg = registration;

        // Cek seketika saat kasir kembali membuka tab/aplikasi Tokoto (fallback)
        const onVisibilityChange = () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        };
      }
    },
    onRegisterError(error) {
      console.error('Service Worker gagal mendaftar:', error);
    },
  });

  const needRefreshArray = sw?.needRefresh || [false, () => {}];
  const updateServiceWorker = sw?.updateServiceWorker || (() => {});
  const [needRefresh, setNeedRefresh] = needRefreshArray;

  // Realtime push update via Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'app_version'), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const remoteVersion = data.version;
      const remoteBuildTime = Number(data.buildTime) || 0;

      const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
      const currentBuildTime = typeof __BUILD_TIME__ !== 'undefined' ? Number(__BUILD_TIME__) : 0;

      const currentKey = `${remoteVersion || ''}_${remoteBuildTime}`;
      const dismissedKey = localStorage.getItem('tokoto_dismissed_update');
      const appliedBuildTime = Number(localStorage.getItem('tokoto_applied_build_time')) || 0;

      // 1. Jangan tampilkan jika sudah di-dismiss user untuk update ini
      if (dismissedKey === currentKey) {
        return;
      }

      // 2. Jangan tampilkan jika user sudah pernah memuat ulang untuk build ini
      if (appliedBuildTime && remoteBuildTime && appliedBuildTime >= remoteBuildTime) {
        return;
      }

      // 3. Evaluasi apakah ada rilis versi baru atau build baru
      const semverDiff = compareSemver(remoteVersion, currentVersion);
      const isNewVersion = semverDiff > 0;
      const isNewBuild = remoteBuildTime && currentBuildTime && remoteBuildTime > currentBuildTime;

      // Jika versi dan build sama persis dengan yang sedang aktif, abaikan
      if (remoteVersion === currentVersion && !isNewBuild) {
        return;
      }

      if (isNewVersion || isNewBuild) {
        if (window.__tokoto_sw_reg) {
          window.__tokoto_sw_reg.update().catch(() => {});
        }

        if (data.releaseNotes) {
          setServerReleaseNotes(data.releaseNotes);
        }
        if (remoteVersion) {
          setServerVersion(remoteVersion);
        }
        setServerBuildTime(remoteBuildTime);
        setNeedRefresh(true);
      }
    }, (err) => {
      console.debug('Firestore app_version listener:', err);
    });

    return () => unsub();
  }, [setNeedRefresh]);

  // Handle action reload: simpan status agar tidak looping & pasti reload
  const handleReload = async () => {
    setIsReloading(true);

    try {
      if (serverVersion) {
        localStorage.setItem('tokoto_applied_version', serverVersion);
      }
      if (serverBuildTime) {
        localStorage.setItem('tokoto_applied_build_time', String(serverBuildTime));
      }
      localStorage.removeItem('tokoto_dismissed_update');
    } catch (e) {
      console.debug('localStorage error:', e);
    }

    try {
      if (typeof updateServiceWorker === 'function') {
        await updateServiceWorker(true);
      }
      if (window.__tokoto_sw_reg?.waiting) {
        window.__tokoto_sw_reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (e) {
      console.debug('SW skip waiting error:', e);
    }

    // Fallback eksekusi reload halaman
    setTimeout(() => {
      window.location.reload();
    }, 250);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
    setForceShow(false);
    try {
      const dismissKey = `${serverVersion || 'v'}_${serverBuildTime || 0}`;
      localStorage.setItem('tokoto_dismissed_update', dismissKey);
    } catch (e) {
      console.debug('localStorage error:', e);
    }
  };

  // Izinkan force show / simulasi banner kapan saja (untuk tes/demo)
  useEffect(() => {
    const handleForceShow = () => {
      setForceShow(true);
    };
    const handleForceCheck = async () => {
      if (window.__tokoto_sw_reg) {
        try {
          await window.__tokoto_sw_reg.update();
        } catch (e) {
          console.debug('SW update check error:', e);
        }
      }
    };

    window.addEventListener('tokoto_test_update_banner', handleForceShow);
    window.addEventListener('tokoto_check_update', handleForceCheck);

    window.tokotoCheckUpdate = handleForceCheck;
    window.tokotoSimulateUpdate = handleForceShow;

    return () => {
      window.removeEventListener('tokoto_test_update_banner', handleForceShow);
      window.removeEventListener('tokoto_check_update', handleForceCheck);
    };
  }, []);

  // Jika tidak ada update baru dan tidak sedang disimulasikan, sembunyikan UI
  if (!needRefresh && !forceShow) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] p-4 bg-white dark:bg-[#18181B] rounded-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] border border-[#D4AF37]/50 max-w-sm w-[calc(100%-2rem)] flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="bg-[#D4AF37]/15 p-2 rounded-xl text-[#D4AF37] shrink-0 mt-0.5">
          <RefreshCw size={18} className={isReloading ? 'animate-spin' : ''} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Pembaruan Tersedia
            </h4>
            {serverVersion && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                v{serverVersion}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
            {serverReleaseNotes || 'Muat ulang aplikasi untuk menerapkan versi terbaru.'}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Tutup notifikasi"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0 -mr-1 -mt-1 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <button
        type="button"
        disabled={isReloading}
        onClick={handleReload}
        className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] disabled:opacity-70 text-[#18181B] font-bold text-xs rounded-xl shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
      >
        <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
        <span>{isReloading ? 'Memuat ulang...' : 'Muat Ulang Sekarang'}</span>
      </button>
    </div>
  );
}
