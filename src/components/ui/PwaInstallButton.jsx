import React, { useState, useEffect } from 'react';
import { Smartphone, Share2, PlusSquare, MoreVertical, X, CheckCircle2, Download, ArrowUpRight } from 'lucide-react';
import { playSound } from '../../utils/helpers';

export default function PwaInstallButton({ installPrompt, storeName = 'Monika Mulya', isSoundOn = true, showToast = null, variant = 'compact' }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('android');

  useEffect(() => {
    // Cek apakah aplikasi sudah berjalan dalam mode standalone (terpasang di HP/PC)
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        (document.referrer && document.referrer.includes('android-app://'));
      setIsStandalone(standalone);
    };

    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // Deteksi otomatis sistem operasi untuk panduan
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOSDevice) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }
  }, []);

  // Jika sudah terpasang (berjalan di dalam aplikasi mandiri), sembunyikan tombol
  if (isStandalone) {
    return null;
  }

  const handleClick = async () => {
    playSound('pop', isSoundOn);

    // Jika browser mendukung native beforeinstallprompt (Android / Chrome Desktop)
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
          if (showToast) showToast('Aplikasi berhasil dipasang di layar utama!', 'success');
          return;
        }
      } catch (err) {
        console.warn('Native install prompt failed, showing guide modal fallback:', err);
      }
    }

    // Jika iOS (Safari tidak mendukung beforeinstallprompt) atau native prompt ditolak/ditutup:
    setShowModal(true);
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={handleClick}
          title={`Install Aplikasi ${storeName} ke HP`}
          className="w-10 h-10 rounded-full border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-[#D4AF37] transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center group shrink-0"
        >
          <Smartphone size={18} className="group-hover:rotate-6 transition-transform text-[#D4AF37]" />
        </button>
      ) : variant === 'card' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full mt-3 py-2.5 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-[#D4AF37] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          <Smartphone size={16} className="text-[#D4AF37] shrink-0" />
          <span>Pasang Aplikasi {storeName || 'Kasir'} ke HP</span>
        </button>
      ) : (
        /* Default: Compact button untuk Header bar */
        <button
          type="button"
          onClick={handleClick}
          title="Install Aplikasi ke Layar Utama HP"
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[#D4AF37] transition-all hover:scale-105 active:scale-95 text-xs font-bold shadow-sm"
        >
          <Smartphone size={15} className="shrink-0 text-[#D4AF37]" />
          <span className="hidden md:inline">Install App</span>
        </button>
      )}

      {/* MODAL PANDUAN INSTALL PWA (IOS & ANDROID) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#27272A] bg-[#202024] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#D4AF37]">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Pasang Aplikasi Kasir</h3>
                  <p className="text-xs text-zinc-400">Jalankan di HP seperti aplikasi resmi Play Store / App Store</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { playSound('pop', isSoundOn); setShowModal(false); }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* OS Tab Selector */}
            <div className="flex border-b border-[#27272A] bg-[#141417]">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  activeTab === 'android'
                    ? 'border-[#D4AF37] text-[#D4AF37] bg-white/5'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <span>🤖 Android (Chrome)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  activeTab === 'ios'
                    ? 'border-[#D4AF37] text-[#D4AF37] bg-white/5'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <span>🍎 iPhone / iPad (Safari)</span>
              </button>
            </div>

            {/* Modal Body / Steps */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {activeTab === 'ios' ? (
                <div className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    💡 Gunakan browser <b>Safari</b> di iPhone/iPad untuk mengaktifkan mode layar penuh tanpa bilah peramban.
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#222226] border border-[#27272A]">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                    <div>
                      <p className="font-bold text-white">Tekan Tombol Bagikan (Share)</p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        Ketuk ikon <b>Bagikan <Share2 size={13} className="inline text-blue-400 mx-0.5" /></b> di bilah menu bawah layar Safari.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#222226] border border-[#27272A]">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                    <div>
                      <p className="font-bold text-white">Pilih "Tambahkan ke Layar Utama"</p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        Gulir menu ke bawah dan ketuk opsi <b>"Tambahkan ke Layar Utama" (Add to Home Screen ⊞)</b>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#222226] border border-[#27272A]">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                    <div>
                      <p className="font-bold text-white">Ketuk "Tambah" (Add)</p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        Tekan tombol <b>Tambah</b> di pojok kanan atas. Ikon aplikasi akan langsung muncul di Homescreen HP!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    💡 Gunakan browser <b>Google Chrome</b> di perangkat Android untuk performa kasir terbaik.
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#222226] border border-[#27272A]">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-[#D4AF37] font-bold flex items-center justify-center shrink-0 text-xs">1</div>
                    <div>
                      <p className="font-bold text-white">Ketuk Titik Tiga (Menu)</p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        Ketuk ikon <b>Titik Tiga <MoreVertical size={13} className="inline text-amber-400 mx-0.5" /></b> di pojok kanan atas browser Chrome.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#222226] border border-[#27272A]">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-[#D4AF37] font-bold flex items-center justify-center shrink-0 text-xs">2</div>
                    <div>
                      <p className="font-bold text-white">Pilih "Install Aplikasi"</p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        Pilih menu <b>"Install aplikasi"</b> atau <b>"Tambahkan ke Layar Utama"</b>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#222226] border border-[#27272A]">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-[#D4AF37] font-bold flex items-center justify-center shrink-0 text-xs">3</div>
                    <div>
                      <p className="font-bold text-white">Konfirmasi Pemasangan</p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        Ketuk <b>"Install"</b> saat pop-up konfirmasi muncul. Aplikasi siap digunakan seperti aplikasi Play Store!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Setelah terpasang, aplikasi kasir dapat dibuka langsung dari layar depan tanpa repot mengetik URL lagi.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#27272A] bg-[#202024] flex justify-end">
              <button
                type="button"
                onClick={() => { playSound('pop', isSoundOn); setShowModal(false); }}
                className="w-full py-2.5 rounded-xl font-bold bg-[#D4AF37] hover:bg-[#C5A028] text-[#18181B] transition-colors shadow-sm text-xs sm:text-sm"
              >
                Saya Mengerti, Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
