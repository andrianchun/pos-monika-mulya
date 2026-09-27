import React, { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { playSound } from '../../utils/helpers';

export default function PwaInstallButton({ installPrompt, storeName = 'Monika Mulya', isSoundOn = true, showToast = null, variant = 'compact' }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    try {
      return localStorage.getItem('tokoto_pwa_installed') === 'true';
    } catch (e) {
      return false;
    }
  });
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

    // Cek apakah browser mendeteksi aplikasi sudah terpasang di OS
    if (typeof navigator !== 'undefined' && navigator.getInstalledRelatedApps) {
      navigator.getInstalledRelatedApps().then((apps) => {
        if (apps && apps.length > 0) {
          setIsInstalled(true);
          try {
            localStorage.setItem('tokoto_pwa_installed', 'true');
          } catch (e) {}
        }
      }).catch(() => {});
    }

    // Tangkap event bawaan browser saat instalasi PWA selesai
    const onAppInstalled = () => {
      setIsInstalled(true);
      try {
        localStorage.setItem('tokoto_pwa_installed', 'true');
      } catch (e) {}
    };
    window.addEventListener('appinstalled', onAppInstalled);

    const onInstallReady = () => setPromptReady(true);
    window.addEventListener('tokoto-install-ready', onInstallReady);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
      setPromptReady(true);
    });

    return () => {
      window.removeEventListener('tokoto-install-ready', onInstallReady);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Sembunyikan tombol jika:
  // 1. Di PC / Desktop (Chrome / Edge desktop sudah memiliki tombol "Open in app" / install resmi di address bar)
  // 2. Sudah dibuka di mode aplikasi mandiri (standalone)
  // 3. Sudah pernah dipasang di perangkat ini (isInstalled)
  if (!isMobile || isStandalone || isInstalled) {
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
          setIsInstalled(true);
          try {
            localStorage.setItem('tokoto_pwa_installed', 'true');
          } catch (e) {}
          if (showToast) showToast('Aplikasi berhasil dipasang di layar utama!', 'success');
          if (typeof window !== 'undefined') window.deferredInstallPrompt = null;
        }
        return;
      } catch (err) {
        console.warn('Native prompt call error:', err);
      }
    }

    // 2. iOS (Safari): Hanya jalankan Web Share jika perangkat benar-benar iPhone / iPad
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${storeName} POS`,
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

    // 3. Android / Desktop: Cek apakah aplikasi sudah terpasang di perangkat
    if (typeof navigator !== 'undefined' && navigator.getInstalledRelatedApps) {
      try {
        const apps = await navigator.getInstalledRelatedApps();
        if (apps && apps.length > 0) {
          setIsInstalled(true);
          try {
            localStorage.setItem('tokoto_pwa_installed', 'true');
          } catch (e) {}
          if (showToast) showToast('Aplikasi sudah terpasang di HP Anda! Buka dari layar depan (Homescreen).', 'success');
          return;
        }
      } catch (e) {}
    }

    // 4. Jika di PC / Desktop prompt tidak aktif (karena aplikasi sudah terpasang di Chrome)
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      setIsInstalled(true);
      try {
        localStorage.setItem('tokoto_pwa_installed', 'true');
      } catch (e) {}
      if (showToast) {
        showToast('Aplikasi sudah terpasang di PC Anda. Tombol instalasi disembunyikan.', 'success');
      }
      return;
    }

    // 5. Jika di HP Android prompt sistem belum siap
    if (showToast) {
      showToast('Tekan menu titik tiga (⋮) Chrome ➔ pilih "Install Aplikasi"', 'info');
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
