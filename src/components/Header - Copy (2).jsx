import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sun, Moon, LogOut, Settings, Menu, Bell, AlertTriangle, Package, Calendar, Send } from 'lucide-react';
import ProfileModal from './modals/ProfileModal';
import { playSound, formatIDR, formatDate } from '../utils/helpers';

export default function Header({ 
  user, setUser, users, setUsers, theme, setTheme, colors, isSoundOn, storeInfo, showToast, 
  isSidebarOpen, setIsSidebarOpen, products = [], sales = [], purchases = [], suppliers = [] 
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- 1. LOGIKA STOK MENIPIS & GROUPING SUPPLIER ---
  const lowStockItems = useMemo(() => products.filter(p => Number(p.stock) <= 5), [products]);

  const groupedLowStock = useMemo(() => {
    const groups = {};
    lowStockItems.forEach(item => {
       // Mencari supplier yang cocok (berdasarkan ID, nama, atau kategori sebagai fallback)
       const supp = suppliers.find(s => 
          s.id === item.supplierId || 
          s.name === item.supplier || 
          s.name.toLowerCase().includes(item.category?.toLowerCase())
       ) || suppliers[0] || { name: 'Supplier Umum', phone: '' };
       
       const suppName = supp.name;
       if (!groups[suppName]) {
          groups[suppName] = { supplier: supp, items: [] };
       }
       groups[suppName].items.push(item);
    });
    return Object.values(groups);
  }, [lowStockItems, suppliers]);

  const handleSendBulkSupplierWA = (group) => {
    playSound('pop', isSoundOn);
    const itemList = group.items.map(item => `- ${item.name} (Sisa Stok: ${String(item.stock).replace('.', ',')} ${item.unit})`).join('\n');
    const text = `Halo *${group.supplier.name}*,\n\nKami dari *${storeInfo.name}* ingin memesan kembali produk berikut karena stok di toko kami sudah menipis:\n\n${itemList}\n\nMohon diinfokan ketersediaan barang dan total tagihannya ya. Terima kasih.`;
    
    let phone = group.supplier.phone || '';
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    phone = phone.replace(/\D/g, ''); // Hapus karakter selain angka
    
    const waUrl = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // --- 2. LOGIKA UTANG/PIUTANG JATUH TEMPO (H-7 hingga Telat) ---
  const incomingDebts = useMemo(() => {
    const now = new Date();
    return purchases.filter(p => {
      if (p.status !== 'Tempo' || !p.dueDate) return false;
      const daysLeft = (new Date(p.dueDate) - now) / (1000 * 60 * 60 * 24);
      return daysLeft >= -5 && daysLeft <= 7; // Telat sampai 5 hari, atau sisa 7 hari
    });
  }, [purchases]);

  const incomingReceivables = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      if (s.status !== 'Tempo' || !s.dueDate) return false;
      const daysLeft = (new Date(s.dueDate) - now) / (1000 * 60 * 60 * 24);
      return daysLeft >= -5 && daysLeft <= 7;
    });
  }, [sales]);

  // --- 3. LOGIKA BARANG HAMPIR KEDALUWARSA (H-30) ---
  const expiringItems = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return products.filter(p => p.expiryDate && new Date(p.expiryDate) <= thirtyDaysFromNow);
  }, [products]);

  const totalNotifCount = lowStockItems.length + incomingDebts.length + incomingReceivables.length + expiringItems.length;

  const handleLogout = () => {
    playSound('pop', isSoundOn);
    localStorage.removeItem('mmpos_user');
    localStorage.removeItem('mmpos_last_active');
    setUser(null);
  };

  return (
    <>
      <header className={`h-16 flex justify-between items-center px-4 md:px-6 shrink-0 border-b ${colors.border} ${colors.panel} z-50 print:hidden shadow-sm`}>
        <div className="flex items-center gap-3">
           <button onClick={() => { playSound('pop', isSoundOn); setIsSidebarOpen(!isSidebarOpen); }} className={`p-2 rounded-lg border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors lg:hidden`}>
              <Menu size={20} className={colors.text} />
           </button>

           <div className="hidden sm:flex items-center gap-3 ml-2">
             {storeInfo.logo ? <img src={storeInfo.logo} alt="Logo" className="w-8 h-8 rounded-md object-cover" /> : <div className={`w-8 h-8 rounded-md ${colors.goldBg} flex items-center justify-center text-[#18181B] font-bold`}>{storeInfo.name?.charAt(0) || 'M'}</div>}
             <div>
               <h1 className={`font-bold text-sm leading-tight ${colors.text}`}>{storeInfo.name}</h1>
               <p className={`text-[10px] ${colors.textMuted}`}>{storeInfo.tagline}</p>
             </div>
           </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          
          {isOnline ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-xs font-bold text-green-700 dark:text-green-400">Sistem Online</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-bounce">
               <span className="w-2 h-2 rounded-full bg-red-500"></span>
               <span className="text-xs font-bold text-red-700 dark:text-red-400">Mode Offline (Lokal)</span>
            </div>
          )}

          <div className="relative" ref={notifRef}>
             <button onClick={() => { playSound('pop', isSoundOn); setShowNotifDropdown(!showNotifDropdown); }} className={`p-2 rounded-full border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors relative`}>
                <Bell size={18} className={colors.text} />
                {totalNotifCount > 0 && (
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md">{totalNotifCount}</span>
                )}
             </button>

             {showNotifDropdown && (
                <div className={`absolute right-0 mt-3 w-80 sm:w-[420px] rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} z-[150] overflow-hidden max-h-[85vh] flex flex-col`}>
                   <div className="p-4 border-b border-solid border-gray-200 dark:border-gray-800 bg-[#F8FAFC] dark:bg-[#27272A]/50 flex justify-between items-center shrink-0">
                      <h4 className={`font-black text-sm ${colors.text}`}>Pemberitahuan Sistem</h4>
                      <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded font-bold">{totalNotifCount} Isu Ditemukan</span>
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                      {totalNotifCount === 0 ? (
                         <div className="p-8 text-center text-xs text-gray-500 font-bold">Semua sistem aman. Tidak ada pemberitahuan baru. ✨</div>
                      ) : (
                         <>
                           {/* 1. KELOMPOK PIUTANG JATUH TEMPO */}
                           {incomingReceivables.map(s => {
                              const daysLeft = Math.ceil((new Date(s.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                              const isLate = daysLeft < 0;
                              return (
                                 <div key={`rec-${s.id}`} className={`p-3 rounded-xl ${isLate ? 'bg-red-500/5 border-red-500/20' : 'bg-blue-500/5 border-blue-500/20'} border flex gap-2 min-w-0 shadow-sm`}>
                                    <Calendar size={16} className={`${isLate ? 'text-red-500' : 'text-blue-500'} shrink-0 mt-0.5`} />
                                    <div className="min-w-0 flex-1">
                                       <p className={`text-xs font-bold ${colors.text} truncate`}>Piutang Pelanggan: {s.customer}</p>
                                       <p className={`text-[10px] ${colors.textMuted}`}>Nota: {s.nota}</p>
                                       <div className="flex justify-between items-center mt-1">
                                          <p className={`text-[10px] font-bold ${isLate ? 'text-red-500' : 'text-blue-500'}`}>Tagihan: Rp {formatIDR(s.total - s.paid)}</p>
                                          <p className={`text-[10px] font-black px-2 py-0.5 rounded ${isLate ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                             {isLate ? `TELAT ${Math.abs(daysLeft)} HARI` : `TEMPO: ${formatDate(s.dueDate)}`}
                                          </p>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}

                           {/* 2. KELOMPOK UTANG JATUH TEMPO */}
                           {incomingDebts.map(p => {
                              const daysLeft = Math.ceil((new Date(p.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                              const isLate = daysLeft < 0;
                              return (
                                 <div key={`debt-${p.id}`} className={`p-3 rounded-xl ${isLate ? 'bg-red-500/5 border-red-500/20' : 'bg-purple-500/5 border-purple-500/20'} border flex gap-2 min-w-0 shadow-sm`}>
                                    <Calendar size={16} className={`${isLate ? 'text-red-500' : 'text-purple-500'} shrink-0 mt-0.5`} />
                                    <div className="min-w-0 flex-1">
                                       <p className={`text-xs font-bold ${colors.text} truncate`}>Utang Toko ke: {p.supplier}</p>
                                       <p className={`text-[10px] ${colors.textMuted}`}>Nota: {p.nota}</p>
                                       <div className="flex justify-between items-center mt-1">
                                          <p className={`text-[10px] font-bold ${isLate ? 'text-red-500' : 'text-purple-500'}`}>Kurang Bayar: Rp {formatIDR(p.total - p.paid)}</p>
                                          <p className={`text-[10px] font-black px-2 py-0.5 rounded ${isLate ? 'bg-red-500/10 text-red-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                             {isLate ? `TELAT ${Math.abs(daysLeft)} HARI` : `TEMPO: ${formatDate(p.dueDate)}`}
                                          </p>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}

                           {/* 3. KELOMPOK BARANG HABIS (BY SUPPLIER) */}
                           {groupedLowStock.map((group, idx) => (
                              <div key={`stock-${idx}`} className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 flex flex-col gap-2 shadow-sm">
                                 <div className="flex justify-between items-center border-b border-orange-500/20 pb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                       <Package size={16} className="text-orange-500 shrink-0" />
                                       <span className={`text-xs font-bold ${colors.text} truncate`}>Order ke: {group.supplier.name}</span>
                                    </div>
                                    <button onClick={() => handleSendBulkSupplierWA(group)} className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 text-[10px] font-bold shadow-sm shrink-0">
                                       <Send size={12}/> Pesan Semua
                                    </button>
                                 </div>
                                 <div className="pl-6 space-y-1">
                                    {group.items.map(item => (
                                       <div key={item.id} className="flex justify-between text-[10px]">
                                          <span className={`${colors.textMuted} truncate pr-2`}>• {item.name}</span>
                                          <span className="text-red-500 font-bold shrink-0">Sisa {String(item.stock).replace('.', ',')}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           ))}

                           {/* 4. KELOMPOK KEDALUWARSA */}
                           {expiringItems.map(item => {
                              const daysLeft = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                              const isExpired = daysLeft <= 0;
                              return (
                                 <div key={`exp-${item.id}`} className={`p-3 rounded-xl ${isExpired ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'} border flex gap-2 min-w-0 shadow-sm`}>
                                    <AlertTriangle size={16} className={`${isExpired ? 'text-red-500' : 'text-yellow-500'} shrink-0 mt-0.5`} />
                                    <div className="min-w-0">
                                       <p className={`text-xs font-bold ${colors.text} truncate`}>{item.name}</p>
                                       <p className={`text-[10px] font-black uppercase ${isExpired ? 'text-red-500' : 'text-yellow-600'}`}>
                                          {isExpired ? 'TELAH KEDALUWARSA!' : `KEDALUWARSA DALAM ${daysLeft} HARI`}
                                       </p>
                                    </div>
                                 </div>
                              );
                           })}
                         </>
                      )}
                   </div>
                </div>
             )}
          </div>

          <button onClick={() => { playSound('pop', isSoundOn); setTheme(theme === 'light' ? 'dark' : 'light'); }} className={`p-2 rounded-full border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors`}>
            {theme === 'light' ? <Moon size={18} className={colors.text} /> : <Sun size={18} className={colors.gold} />}
          </button>

          <div className={`h-8 w-[1px] ${colors.border} mx-1`}></div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => { playSound('pop', isSoundOn); setShowProfile(true); }} className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors`}>
               <div className={`w-7 h-7 rounded-full ${colors.goldBg} text-[#18181B] flex items-center justify-center font-bold text-xs overflow-hidden`}>
                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="ava"/> : user.name?.charAt(0).toUpperCase() || 'U'}
               </div>
               <span className={`text-sm font-semibold hidden sm:block ${colors.text}`}>{user.name}</span>
            </button>
            <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Logout">
               <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {showProfile && <ProfileModal user={user} setUser={setUser} users={users} setUsers={setUsers} colors={colors} isSoundOn={isSoundOn} showToast={showToast} onClose={() => setShowProfile(false)} />}
    </>
  );
}