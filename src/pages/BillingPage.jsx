import React, { useState } from 'react';
import { CreditCard, AlertTriangle, CheckCircle2, ShieldAlert, Smartphone, Trash2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { wipeTenantData } from '../utils/tenantHelpers';
import { useNavigate } from 'react-router-dom';

export default function BillingPage({ colors, storeInfo, tenantId, user, showToast }) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const navigate = useNavigate();

  const handlePayWA = () => {
    const text = `Halo Admin Tokoto! 👋\nSaya ingin memperpanjang langganan POS untuk toko saya.\n\n*Nama Toko:* ${storeInfo.name}\n*Tenant ID:* ${tenantId}\n*Email:* ${user.email}\n\nMohon informasi pembayarannya. Terima kasih!`;
    const waUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    setShowPayModal(false);
  };

  const handleWipeData = async () => {
    if (deleteConfirmText !== storeInfo.name) {
      showToast('Nama toko tidak cocok! Penghapusan dibatalkan.', 'error');
      return;
    }
    
    setIsWiping(true);
    try {
      await wipeTenantData(db, tenantId, user.uid);
      
      // Hapus akun email/password-nya dari Authentication
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      showToast('Toko berhasil dihapus permanen. Sampai jumpa!', 'success');
      window.location.href = '/';
    } catch (e) {
      setIsWiping(false);
      showToast('Gagal menghapus toko: ' + e.message, 'error');
    }
  };

  return (
    <div className={`p-4 md:p-6 pb-24 min-h-[calc(100vh-80px)] ${colors.bg} ${colors.text} animate-fade-in`}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500 flex items-center gap-2">
              <CreditCard className="text-orange-500" size={32} />
              Billing & Langganan
            </h1>
            <p className={`${colors.textMuted} mt-1 text-sm md:text-base`}>Manajemen langganan dan status akun tokomu.</p>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className={`p-6 md:p-8 rounded-2xl shadow-xl border ${colors.border} ${colors.panel} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <CheckCircle2 size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-sm font-bold mb-4 border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Status: Aktif
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold mb-2">Toko <span className={colors.gold}>{storeInfo.name}</span></h2>
            <p className={colors.textMuted}>Terima kasih telah menggunakan layanan POS kami. Usahamu saat ini dalam perlindungan sistem yang aktif.</p>
            
            <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <p className={`text-sm ${colors.textMuted}`}>Berlaku hingga:</p>
                <p className="text-lg font-bold">Trial Selamanya (Beta)</p>
              </div>
              <button 
                onClick={() => setShowPayModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
              >
                <CreditCard size={18} />
                Perpanjang Langganan
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={`p-6 md:p-8 rounded-2xl border-2 border-red-500/30 bg-red-500/5 relative overflow-hidden mt-12`}>
          <div className="flex items-center gap-3 mb-4 text-red-500">
            <ShieldAlert size={28} />
            <h2 className="text-xl md:text-2xl font-black">Zona Berbahaya</h2>
          </div>
          <p className="text-red-400/80 mb-6 text-sm md:text-base leading-relaxed">
            Hati-hati! Tindakan di area ini bersifat permanen dan tidak dapat dibatalkan. Pastikan kamu sudah memikirkannya matang-matang sebelum mengeklik tombol di bawah ini.
          </p>
          
          <div className={`p-4 rounded-xl border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-950/20`}>
            <div>
              <h3 className="font-bold text-red-400">Hapus Toko Permanen</h3>
              <p className="text-xs text-red-500/70 mt-1">Menghapus SELURUH data penjualan, produk, dan pengaturan. Toko akan musnah selamanya.</p>
            </div>
            <button 
              onClick={() => setShowDangerModal(true)}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg shadow-red-500/20"
            >
              <Trash2 size={16} />
              Hapus Toko
            </button>
          </div>
        </div>

      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${colors.border} ${colors.panel} transform transition-all`}>
            <h2 className={`text-xl font-bold mb-4 ${colors.text} flex items-center gap-2`}>
              <Smartphone className="text-emerald-500" />
              Verifikasi Pembayaran
            </h2>
            <p className={`text-sm ${colors.textMuted} mb-6 leading-relaxed`}>
              Standar pembayaran langganan saat ini diproses secara manual melalui WhatsApp Admin demi keamanan dan kenyamananmu (menghindari biaya payment gateway).
            </p>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 mb-6">
               <p className="text-xs text-slate-400 mb-1">Transfer ke:</p>
               <p className="font-bold text-lg text-emerald-400">BCA 1234567890</p>
               <p className="text-sm font-semibold text-slate-300">a.n. PT Tokoto Kasir Indonesia</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayModal(false)} className={`flex-1 py-3 font-semibold rounded-xl border ${colors.border} ${colors.textMuted} hover:bg-slate-800 transition-colors`}>
                Batal
              </button>
              <button onClick={handlePayWA} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20">
                Konfirmasi via WA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Modal */}
      {showDangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl shadow-2xl border border-red-500/50 bg-slate-900 transform transition-all">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black mb-2 text-white text-center">Yakin Ingin Menghapus?</h2>
            <p className="text-sm text-slate-400 mb-6 text-center leading-relaxed">
              Tindakan ini akan menghapus <b>permanen</b> seluruh data produk, transaksi, dan riwayat. Ketik <span className="font-bold text-red-400 select-all">{storeInfo.name}</span> di bawah ini untuk mengonfirmasi.
            </p>
            
            <input 
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none mb-6 text-center font-bold placeholder-slate-600"
              placeholder="Ketik nama tokomu di sini..."
              disabled={isWiping}
            />

            <div className="flex gap-3">
              <button disabled={isWiping} onClick={() => setShowDangerModal(false)} className="flex-1 py-3 font-semibold rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors">
                Batal
              </button>
              <button 
                disabled={isWiping || deleteConfirmText !== storeInfo.name} 
                onClick={handleWipeData} 
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isWiping ? 'Menghapus...' : 'Hancurkan Toko'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
