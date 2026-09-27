import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function ReloadPrompt() {
  const [forceShow, setForceShow] = React.useState(false);

  // Hook bawaan vite-plugin-pwa untuk bereaksi terhadap pembaruan Service Worker
  const sw = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        window.__tokoto_sw_reg = registration;

        // 1. Cek pembaruan berkala di background tiap 15 menit
        const intervalId = setInterval(() => {
          if (navigator.onLine) {
            registration.update().catch(() => {});
          }
        }, 15 * 60 * 1000);

        // 2. Cek seketika saat kasir kembali membuka tab/aplikasi Tokoto
        const onVisibilityChange = () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        // 3. Cek saat koneksi internet pulih kembali
        const onOnline = () => {
          registration.update().catch(() => {});
        };
        window.addEventListener('online', onOnline);

        return () => {
          clearInterval(intervalId);
          document.removeEventListener('visibilitychange', onVisibilityChange);
          window.removeEventListener('online', onOnline);
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

  // Izinkan force show / simulasi banner kapan saja (untuk tes/demo)
  React.useEffect(() => {
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

    // Ekspos fungsi global yang bisa dipanggil kapan saja di konsol atau komponen lain
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
         <div className="bg-[#D4AF37]/20 p-2.5 rounded-full text-[#D4AF37] animate-pulse">
            <RefreshCw size={24} />
         </div>
         <div className="flex-1 mt-1">
            <h4 className="text-[13px] font-extrabold text-gray-900 dark:text-white mb-0.5 tracking-wide uppercase">Pembaruan Tersedia</h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
               Versi terbaru aplikasi telah terunduh. Muat ulang aplikasi untuk mengaplikasikan fitur baru.
            </p>
         </div>
         <button onClick={() => { setNeedRefresh(false); setForceShow(false); }} className="text-gray-400 hover:text-white transition-colors bg-black/5 dark:bg-white/5 rounded-full p-1">
            <X size={16} />
         </button>
      </div>
      <button 
        className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#18181B] font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02]"
        onClick={() => updateServiceWorker(true)}
      >
        Muat Ulang & Perbarui
      </button>
    </div>
  );
}
