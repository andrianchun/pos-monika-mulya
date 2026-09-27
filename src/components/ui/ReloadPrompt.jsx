import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ReloadPrompt() {
  const [forceShow, setForceShow] = useState(false);
  const [serverReleaseNotes, setServerReleaseNotes] = useState('');
  const [serverVersion, setServerVersion] = useState('');

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

  // 🔥 MEKANISME REALTIME PUSH: Mendengarkan sinyal update dari Firestore secara realtime!
  // Tanpa perlu polling interval tiap 15 menit yang membuang baterai dan kuota.
  // Begitu versi baru dirilis/di-deploy, sinyal dikirim langsung via WebSocket Google Firestore (< 500ms).
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'app_version'), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const remoteVersion = data.version;
      const remoteBuildTime = Number(data.buildTime) || 0;

      const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
      const currentBuildTime = typeof __BUILD_TIME__ !== 'undefined' ? Number(__BUILD_TIME__) : 0;

      const isNewVersion = remoteVersion && remoteVersion !== currentVersion;
      const isNewBuild = remoteBuildTime && currentBuildTime && remoteBuildTime > currentBuildTime;

      if (isNewVersion || isNewBuild) {
        console.log('⚡ [Tokoto Push] Rilis baru terdeteksi via Firestore:', data);

        // Langsung perintahkan browser untuk memperbarui Service Worker
        if (window.__tokoto_sw_reg) {
          window.__tokoto_sw_reg.update().catch(() => {});
        }

        // Tampilkan catatan rilis jika ada
        if (data.releaseNotes) {
          setServerReleaseNotes(data.releaseNotes);
        }
        if (remoteVersion) {
          setServerVersion(remoteVersion);
        }

        // Munculkan banner pembaruan seketika ke layar kasir!
        setNeedRefresh(true);
      }
    }, (err) => {
      console.debug('Firestore app_version listener:', err);
    });

    return () => unsub();
  }, [setNeedRefresh]);

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
    <div className="fixed bottom-4 right-4 z-[9999] p-4 bg-white dark:bg-[#18181B] rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-[#D4AF37] max-w-sm w-[calc(100%-2rem)] flex flex-col gap-3 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-start gap-3">
         <div className="bg-[#D4AF37]/20 p-2.5 rounded-full text-[#D4AF37] animate-pulse shrink-0">
            <RefreshCw size={24} />
         </div>
         <div className="flex-1 mt-0.5 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
               <h4 className="text-[13px] font-extrabold text-gray-900 dark:text-white tracking-wide uppercase">
                  Pembaruan Tersedia
               </h4>
               {serverVersion && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                     v{serverVersion}
                  </span>
               )}
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
               Versi terbaru aplikasi telah dirilis. Muat ulang sekarang untuk mengaplikasikan fitur & perbaikan terbaru.
            </p>
            {serverReleaseNotes && (
               <div className="mt-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[11px] text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                  <Sparkles size={13} className="text-[#D4AF37] shrink-0 mt-0.5" />
                  <span className="leading-tight">{serverReleaseNotes}</span>
               </div>
            )}
         </div>
         <button onClick={() => { setNeedRefresh(false); setForceShow(false); }} className="text-gray-400 hover:text-white transition-colors bg-black/5 dark:bg-white/5 rounded-full p-1 shrink-0">
            <X size={16} />
         </button>
      </div>
      <button 
        className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#18181B] font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5"
        onClick={() => updateServiceWorker(true)}
      >
        <RefreshCw size={14} />
        Muat Ulang & Perbarui Sekarang
      </button>
    </div>
  );
}
