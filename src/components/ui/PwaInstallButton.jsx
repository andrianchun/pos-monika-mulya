import React, { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { playSound } from '../../utils/helpers';

export default function PwaInstallButton({ installPrompt, storeName = 'Monika Mulya', isSoundOn = true, showToast = null, variant = 'compact' }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [promptReady, setPromptReady] = useState(() => !!(installPrompt || (typeof window !== 'undefined' && window.deferredInstallPrompt)));

  useEffect(() => {
    // Sembunyikan tombol jika sudah berjalan di mode aplikasi mandiri
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        (document.referrer && document.referrer.includes('android-app://'));
      setIsStandalone(standalone);
    };

    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    const onInstallReady = () => setPromptReady(true);
    window.addEventListener('tokoto-install-ready', onInstallReady);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
      setPromptReady(true);
    });

    return () => {
      window.removeEventListener('tokoto-install-ready', onInstallReady);
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  const handleClick = async () => {
    playSound('pop', isSoundOn);

    const activePrompt = installPrompt || (typeof window !== 'undefined' ? window.deferredInstallPrompt : null);

    // 1. Android / Chrome: Panggil dialog native instalasi resmi 1-klik langsung dari sistem operasi
    if (activePrompt) {
      try {
        activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === 'accepted') {
          if (showToast) showToast('Aplikasi berhasil dipasang di layar utama!', 'success');
          if (typeof window !== 'undefined') window.deferredInstallPrompt = null;
        }
        return;
      } catch (err) {
        console.warn('Native prompt call error:', err);
      }
    }

    // 2. iOS (Safari): Panggil Web Share Sheet bawaan Apple langsung dalam 1 klik
    // Safari akan langsung membuka lembar menu sistem iOS (di mana terdapat opsi "Tambahkan ke Layar Utama")
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${storeName} POS`,
          text: `Buka aplikasi kasir ${storeName}`,
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
        return;
      }
    }

    // 3. Fallback browser desktop / non-share: Notifikasi simpel 1 baris tanpa popup mengganggu
    if (showToast) {
      showToast('Gunakan menu peramban untuk memasang aplikasi ke layar utama', 'info');
    }
  };

  return variant === 'icon' ? (
    <button
      type="button"
      onClick={handleClick}
      title={`Pasang Aplikasi ${storeName} ke HP`}
      className="w-10 h-10 rounded-full border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-[#D4AF37] transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center group shrink-0"
    >
      <Smartphone size={18} className="group-hover:rotate-6 transition-transform text-[#D4AF37]" />
    </button>
  ) : (
    <button
      type="button"
      onClick={handleClick}
      title="Pasang Aplikasi ke Layar Utama HP"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[#D4AF37] transition-all hover:scale-105 active:scale-95 text-xs font-bold shadow-sm"
    >
      <Smartphone size={15} className="shrink-0 text-[#D4AF37]" />
      <span className="hidden md:inline">Install App</span>
    </button>
  );
}
