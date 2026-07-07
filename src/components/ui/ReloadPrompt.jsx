import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function ReloadPrompt() {
  // Hook bawaan vite-plugin-pwa untuk bereaksi terhadap pembaruan Service Worker
  const sw = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker terdaftar');
    },
    onRegisterError(error) {
      console.error('Service Worker gagal mendaftar:', error);
    },
  });

  const needRefreshArray = sw?.needRefresh || [false, () => {}];
  const updateServiceWorker = sw?.updateServiceWorker || (() => {});
  const [needRefresh, setNeedRefresh] = needRefreshArray;

  // Jika tidak ada update baru, sembunyikan UI ini sepenuhnya
  if (!needRefresh) return null;

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
         <button onClick={() => setNeedRefresh(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-black/5 dark:bg-white/5 rounded-full p-1">
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
