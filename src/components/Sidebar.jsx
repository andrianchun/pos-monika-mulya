import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, FileText, Users, Settings, X } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen, activeMenu, handleMenuClick, colors, user, storeInfo }) {
  const fullMenuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard' },
    { id: 'pos', icon: ShoppingCart, label: 'Kasir / POS', module: 'pos' },
    { id: 'produk', icon: Package, label: 'Produk', module: 'produk' },
    { id: 'penjualan', icon: FileText, label: 'Data Penjualan', module: 'penjualan' },
    { id: 'pembelian', icon: FileText, label: 'Data Pembelian', module: 'pembelian' },
    { id: 'kontak', icon: Users, label: 'Kontak', module: 'kontak' },
    { id: 'laporan', icon: FileText, label: 'Laporan Keuangan', module: 'laporan' },
    { id: 'pengaturan', icon: Settings, label: 'Pengaturan Sistem', module: 'pengaturan' }
  ];

  const permittedMenu = user.role === 'admin' ? fullMenuItems : fullMenuItems.filter(m => user.permissions?.includes(m.module));

  return (
    <>
      {/* OVERLAY MOBILE: Layar hitam transparan saat menu terbuka di HP */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden" onClick={() => setIsOpen(false)}></div>
      )}
      
      <div className={`fixed lg:relative top-0 left-0 h-full z-[70] flex flex-col ${colors.panel} border-r ${colors.border} transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'} shrink-0 print:hidden`}>
        
        {/* Tombol Silang khusus untuk menutup di HP */}
        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-1.5 bg-red-100 text-red-500 rounded-lg lg:hidden">
          <X size={20} />
        </button>

        {/* ======================================================== */}
        {/* 🔥 LOGO HXPOS BRANDING (BISA DIKLIK BUAT BUKA/TUTUP!) 🔥  */}
        {/* ======================================================== */}
        <div className={`h-16 flex items-center justify-center border-b ${colors.border} shrink-0 mt-4 lg:mt-0 transition-all`}>
          {isOpen ? (
            <div 
               onClick={() => setIsOpen(!isOpen)} 
               className="flex items-center gap-3 w-full pl-5 cursor-pointer group"
               title="Tutup Menu (Minimize)"
            >
              {/* Ikon Box Glowing Emas Minimalis */}
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-yellow-600 shadow-[0_0_12px_rgba(212,175,55,0.3)] shrink-0 transition-transform group-hover:scale-105">
                 <div className="absolute inset-[2px] bg-white dark:bg-[#1a1a1a] rounded-[9px] flex items-center justify-center">
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-br from-[#D4AF37] to-yellow-600 text-xs tracking-tighter">
                       HX
                    </span>
                 </div>
              </div>

              {/* Teks Brand Dua Warna */}
              <div className="flex flex-col justify-center">
                <span className="text-xl font-black tracking-tighter leading-none flex items-center">
                  <span className="text-[#D4AF37]">HX</span>
                  <span className="text-gray-800 dark:text-white">POS</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium mt-0.5 whitespace-nowrap">
                  by andrian
                </span>
              </div>
            </div>
          ) : (
            /* Logo Mode Minimalis (Saat sidebar mengecil / ditutup) */
            <div 
               onClick={() => setIsOpen(!isOpen)} 
               className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-yellow-600 shadow-[0_0_12px_rgba(212,175,55,0.3)] shrink-0 mx-auto transition-transform hover:scale-110 cursor-pointer"
               title="Buka Menu (Maximize)"
            >
               <div className="absolute inset-[2px] bg-white dark:bg-[#1a1a1a] rounded-[9px] flex items-center justify-center">
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-br from-[#D4AF37] to-yellow-600 text-xs tracking-tighter">
                     HX
                  </span>
               </div>
            </div>
          )}
        </div>
        {/* ======================================================== */}
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {permittedMenu.map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <button key={item.id} onClick={() => { handleMenuClick(item.id); if(window.innerWidth < 1024) setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? `${colors.goldBg} text-[#18181B] shadow-md` : `hover:${colors.creamBg} ${colors.text} opacity-80 hover:opacity-100`}`}>
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