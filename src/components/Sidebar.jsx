import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, FileText, Users, Settings, X, ChevronLeft, ChevronRight, Activity, CreditCard } from 'lucide-react';

export default function Sidebar({ colors,  isOpen, setIsOpen, activeMenu, handleMenuClick, user, storeInfo }) {
  const fullMenuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', modules: ['dashboard'] },
    { id: 'pos', icon: ShoppingCart, label: 'Kasir / POS', modules: ['pos'] },
    { id: 'riwayat', icon: FileText, label: 'Riwayat', modules: ['riwayat_penjualan', 'riwayat_pembelian'] },
    { id: 'kontak', icon: Users, label: 'Kontak', modules: ['kontak_customer', 'kontak_supplier'] },
    { id: 'produk', icon: Package, label: 'Produk', modules: ['produk'] },
    { id: 'laporan', icon: FileText, label: 'Laporan', modules: ['laporan_keuangan', 'laporan_barang'] },
    { id: 'aktivitas', icon: Activity, label: 'Log Aktivitas', modules: ['aktivitas'] },
    { id: 'pengaturan', icon: Settings, label: 'Pengaturan', modules: ['pengaturan'] },
    { id: 'langganan', icon: CreditCard, label: 'Langganan', modules: [], adminOnly: true }
  ];

  const permittedMenu = user.role === 'admin' ? fullMenuItems : fullMenuItems.filter(m => !m.adminOnly && m.modules.some(mod => user.permissions?.includes(mod)));

  return (
    <>
      {/* OVERLAY MOBILE: Layar hitam transparan saat menu terbuka di HP */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden" onClick={() => setIsOpen(false)}></div>
      )}
      
      <div className={`fixed lg:relative top-0 left-0 h-full z-[70] flex flex-col ${colors.panel} border-r ${colors.border} transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'} shrink-0 print:hidden`}>
        

        {/* ======================================================== */}
        {/* 🔥 LOGO TOKOTO BRANDING (BISA DIKLIK BUAT BUKA/TUTUP!) 🔥  */}
        {/* ======================================================== */}
        <div className={`h-16 flex items-center justify-center border-b ${colors.border} shrink-0 mt-4 lg:mt-0 transition-all`}>
          {isOpen ? (
              <div 
                 onClick={() => setIsOpen(!isOpen)} 
                 className="flex items-center justify-between w-full pl-4 pr-3 cursor-pointer group select-none"
                 title="Tutup Menu (Minimize)"
              >
                {/* Banner Brand WebP & Copyright */}
                <div className="flex flex-col justify-center transition-transform group-hover:scale-[1.02]">
                  <img 
                    src="/logo-banner.webp" 
                    alt="TOKOTO" 
                    className="h-5 w-auto max-w-[105px] object-contain object-left pointer-events-none drop-shadow-sm opacity-90" 
                  />
                  <span className="text-[8px] text-gray-400 dark:text-gray-500 font-normal mt-0.5 tracking-tight whitespace-nowrap opacity-80">
                    by andrianchun © 2026
                  </span>
                </div>
                <div className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 text-gray-400 dark:text-gray-300 ${colors.goldHoverText} border ${colors.border} ${colors.goldHoverBorder} transition-all`}>
                  <ChevronLeft size={16} />
                </div>
              </div>
            ) : (
              /* Logo Mode Minimalis (Saat sidebar mengecil / ditutup) */
              <div 
                 onClick={() => setIsOpen(!isOpen)} 
                 className="flex flex-col items-center justify-center w-full cursor-pointer group transition-transform hover:scale-110 select-none py-1"
                 title="Buka Menu (Expand)"
              >
                  <img 
                    src="/logo-icon.webp" 
                    alt="TOKOTO" 
                    className="w-6 h-6 object-contain pointer-events-none drop-shadow-sm opacity-90" 
                  />
              </div>
            )}
        </div>
        {/* ======================================================== */}
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {permittedMenu.map((item) => {
            const isActive = activeMenu === item.id;
            const forceYellow = ['dashboard', 'produk', 'pengaturan'].includes(item.id);
            const activeBg = forceYellow ? colors.goldBg : colors.goldBg;
            const activeText = forceYellow ? 'text-[#18181B]' : (colors.goldBg.includes('blue') ? 'text-white' : 'text-[#18181B]');
            return (
              <button key={item.id} onClick={() => { handleMenuClick(item.id); if(window.innerWidth < 1024) setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? `${activeBg} ${activeText} shadow-md` : `hover:${colors.creamBg} ${colors.text} opacity-80 hover:opacity-100`}`}>
                <item.icon size={22} className={isOpen ? '' : 'mx-auto'} />
                <span className={`font-medium whitespace-nowrap ${isOpen ? 'block' : 'hidden'}`}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </>
  );
}