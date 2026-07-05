import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sun, Moon, LogOut, Settings, Menu, Bell, AlertTriangle, Package, Calendar, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import ProfileModal from './modals/ProfileModal';
import { playSound, formatIDR, formatDate } from '../utils/helpers';

const CollapsibleNotifGroup = ({ title, count, icon: Icon, colorClass, children, defaultOpen = false, colors }) => {
   const [open, setOpen] = useState(defaultOpen);
   if (count === 0) return null;
   return (
      <div className={`rounded-xl border ${colors.border} overflow-hidden shadow-sm`}>
         <div onClick={() => setOpen(!open)} className={`p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] ${colors.creamBg}`}>
            <div className="flex items-center gap-2">
               <Icon size={16} className={colorClass} />
               <span className={`text-xs font-bold ${colors.text}`}>{title}</span>
            </div>
            <div className="flex items-center gap-2">
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 ${colors.text}`}>{count}</span>
               {open ? <ChevronUp size={14} className={colors.textMuted} /> : <ChevronDown size={14} className={colors.textMuted} />}
            </div>
         </div>
         {open && (
            <div className={`p-3 bg-white dark:bg-[#18181B] border-t ${colors.border} space-y-2`}>
               {children}
            </div>
         )}
      </div>
   );
};

export default function Header({ 
  activeMenu, user, setUser, isSidebarOpen, setIsSidebarOpen, theme, setTheme, 
  colors, isSoundOn, storeInfo, onNavigateAndEdit, 
  products, sales, purchases, suppliers, syncCount,
  users, setUsers, showToast, activeShift, setShowShiftOpenModal, setShowShiftCloseModal, shiftHistory, recordActivity, installPrompt
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

  const lowStockItems = useMemo(() => products.filter(p => Number(p.stock) <= (p.minStock !== undefined && p.minStock !== null && p.minStock !== '' ? Number(p.minStock) : 5)), [products]);

  const groupedLowStock = useMemo(() => {
      const groups = {};
      lowStockItems.forEach(item => {
         let lastSupplierName = null;
         
         // Deteksi dari riwayat pembelian (dari terbaru ke terlama)
         if (purchases && purchases.length > 0) {
            for (let i = 0; i < purchases.length; i++) {
               const p = purchases[i];
               if (p.items && p.items.some(prod => prod.id === item.id)) {
                   lastSupplierName = p.supplier;
                   break;
               }
            }
         }
         
         const supp = suppliers.find(s => 
            (lastSupplierName && s.name === lastSupplierName) ||
            s.id === item.supplierId || 
            s.name === item.supplier || 
            (item.category && s.name.toLowerCase().includes(item.category.toLowerCase()))
         ) || suppliers[0] || { name: 'Supplier Umum', phone: '' };
         
         const suppName = supp.name;
         if (!groups[suppName]) {
            groups[suppName] = { supplier: supp, items: [] };
         }
         groups[suppName].items.push(item);
      });
      return Object.values(groups);
   }, [lowStockItems, suppliers, purchases]);

  const handleSendBulkSupplierWA = (group) => {
    playSound('pop', isSoundOn);
    const itemList = group.items.map(item => `- ${item.name} (Sisa Stok: ${String(item.stock).replace('.', ',')} ${item.unit})`).join('\n');
    const text = `Halo *${group.supplier.name}*,\n\nKami dari *${storeInfo.name}* ingin memesan kembali produk berikut karena stok di toko kami sudah menipis:\n\n${itemList}\n\nMohon diinfokan ketersediaan barang dan total tagihannya ya. Terima kasih.`;
    
    let phone = group.supplier.phone || '';
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    phone = phone.replace(/\D/g, '');
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        window.location.href = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    } else {
        const waUrl = phone ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}` : `whatsapp://send?text=${encodeURIComponent(text)}`;
        window.isWAFiring = true; 
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = waUrl;
        document.body.appendChild(iframe);
        setTimeout(() => {
           if (document.body.contains(iframe)) document.body.removeChild(iframe);
           window.isWAFiring = false;
        }, 3000);
    }
  };

  const incomingDebts = useMemo(() => {
    const now = new Date();
    return purchases.filter(p => {
      if (p.status !== 'Tempo' || !p.dueDate) return false;
      const daysLeft = (new Date(p.dueDate) - now) / (1000 * 60 * 60 * 24);
      return daysLeft >= -5 && daysLeft <= 7; 
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

  // --- LOGIKA BARANG KEDALUWARSA SUDAH OTOMATIS JALAN! ---
  const expiringItems = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return products.filter(p => p.expiryDate && new Date(p.expiryDate) <= thirtyDaysFromNow);
  }, [products]);

  const hppChangedItems = useMemo(() => {
    return products.filter(p => p.hppChanged === true);
  }, [products]);

  const totalNotifCount = lowStockItems.length + incomingDebts.length + incomingReceivables.length + expiringItems.length + hppChangedItems.length;

  const handleLogout = () => {
    if (activeShift && activeShift.status === 'OPEN') {
        playSound('error', isSoundOn);
        showToast('Wajib Tutup Shift sebelum logout!', 'error');
        setShowShiftCloseModal(true);
        return;
    }
    playSound('pop', isSoundOn);
    if (recordActivity) {
        recordActivity('Logout Sistem', 'Akun telah keluar dari sistem (Logout)');
    }
    localStorage.removeItem('mmpos_user');
    localStorage.removeItem('mmpos_last_active');
    setUser(null);
  };

  return (
    <>
      <header className={`h-16 flex justify-between items-center px-2 sm:px-4 shrink-0 border-b ${colors.border} ${colors.panel} z-50 print:hidden shadow-sm`}>
        <div className="flex items-center gap-3">
           <button onClick={() => { playSound('pop', isSoundOn); setIsSidebarOpen(!isSidebarOpen); }} className={`p-2 rounded-lg border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors lg:hidden`}>
              <Menu size={20} className={colors.text} />
           </button>

           <div className="hidden sm:flex items-center gap-3 ml-2">
             {storeInfo.logo ? <img src={storeInfo.logo} alt="Logo" className="w-8 h-8 rounded-md object-cover" /> : <div className={`w-8 h-8 rounded-md ${colors.goldBg} flex items-center justify-center text-[#18181B] font-bold`}>{storeInfo.name?.charAt(0) || 'M'}</div>}
             <div>
               <h1 className={`font-bold text-sm leading-tight ${colors.text}`}>{storeInfo.name}</h1>
               <p className={`text-[10px] sm:text-xs font-semibold ${colors.textMuted} tracking-wider`}>{storeInfo.tagline || 'Point of Sale System'}</p>
             </div>
           </div>
           
           {installPrompt && (
             <button onClick={async () => { 
                playSound('pop', isSoundOn); 
                installPrompt.prompt(); 
                const { outcome } = await installPrompt.userChoice; 
                if(outcome === 'accepted') { showToast('Terima kasih telah menginstal!', 'success'); } 
             }} className={`hidden sm:flex ml-4 px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#18181B] bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:opacity-90 shadow-sm animate-pulse items-center gap-1`}>
                <Send size={12} className="rotate-45 -mt-0.5" /> Install App
             </button>
           )}
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          {installPrompt && (
             <button onClick={async () => { 
                playSound('pop', isSoundOn); 
                installPrompt.prompt(); 
             }} className={`sm:hidden p-1.5 rounded-md text-[#18181B] bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:opacity-90 shadow-sm mr-1`} title="Install App">
                <Send size={14} className="rotate-45 -mt-0.5 -ml-0.5" />
             </button>
           )}
          {syncCount > 0 ? (
              <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 border border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.4)]`}>
                 <Loader2 size={12} className="animate-spin text-white" />
                 <span className="text-xs font-bold text-white">Menyinkronkan... ({syncCount})</span>
              </div>
          ) : isOnline ? (
              <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.creamBg} border ${colors.border}`}>
                 <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]"></span>
                 <span className="text-xs font-bold text-emerald-700 dark:text-emerald-500/90">Online</span>
              </div>
          ) : (
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.creamBg} border ${colors.border} animate-pulse`}>
               <span className="w-2 h-2 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.3)]"></span>
               <span className="text-xs font-bold text-rose-700 dark:text-rose-500/90">Offline</span>
            </div>
          )}

            <div className="hidden md:flex items-center gap-2">
                {activeShift && activeShift.status === 'OPEN' ? (
                    <span className={`px-2 py-1 text-xs font-bold rounded-md bg-red-500/10 text-red-500 border border-red-500/30 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors`} onClick={() => setShowShiftCloseModal(true)} title="Tutup Shift">
                        <span className={`w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]`}></span> Tutup Shift
                    </span>
                ) : (
                    <>
                        {shiftHistory.length > 0 && (
                          <span className="px-2 py-1 text-xs font-bold rounded-md bg-gray-500/10 text-gray-500 border border-gray-500/30 flex items-center gap-1 cursor-pointer hover:bg-gray-500/20 transition-colors" onClick={() => setShowShiftCloseModal(true)} title="Riwayat Laporan Shift">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Laporan Shift
                          </span>
                        )}
                    </>
                )}
            </div>

          <div className={`h-8 w-[1px] ${colors.border} hidden md:block mx-0.5`}></div>

          <div className="flex items-center gap-1 sm:gap-2">
             <div className="relative" ref={notifRef}>
             <button onClick={() => { playSound('pop', isSoundOn); setShowNotifDropdown(!showNotifDropdown); }} className={`p-2 rounded-full border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors relative`}>
                <Bell size={18} className={colors.text} />
                {totalNotifCount > 0 && (
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md">{totalNotifCount}</span>
                )}
             </button>

             {showNotifDropdown && (
                <div className={`fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 w-auto sm:w-[420px] rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_10px_50px_rgba(0,0,0,0.5)] bg-white dark:bg-[#222226] border-2 border-gray-200 dark:border-gray-700 z-[150] overflow-hidden max-h-[80vh] flex flex-col transform transition-all`}>
                   <div className="p-4 border-b border-solid border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2a2a2e] flex justify-between items-center shrink-0">
                      <h4 className={`font-black text-sm ${colors.text}`}>Notifikasi</h4>
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#222226] p-3 space-y-3">
                      {totalNotifCount === 0 ? (
                         <div className="p-8 text-center text-xs text-gray-500 font-bold">Semua sistem aman. Tidak ada pemberitahuan baru. 🛡️</div>
                      ) : (
                         <>
                           {/* 1. KELOMPOK PIUTANG JATUH TEMPO */}
                           <CollapsibleNotifGroup title="Piutang Pelanggan" count={incomingReceivables.length} icon={Calendar} colorClass="text-red-500" colors={colors}>
                              {incomingReceivables.map(s => {
                                 const daysLeft = Math.ceil((new Date(s.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                                 const isLate = daysLeft < 0;
                                   return (
                                      <div key={`rec-${s.id}`} onClick={() => { if(onNavigateAndEdit) { playSound('pop', isSoundOn); setShowNotifDropdown(false); onNavigateAndEdit('riwayat', s.id, 'penjualan'); } }} className={`p-3 rounded-xl ${isLate ? 'bg-red-500/5 border-red-500/20' : `${colors.creamBg} ${colors.border}`} border flex gap-2 min-w-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity`}>
                                         <div className="min-w-0 flex-1">
                                          <p className={`text-xs font-bold ${colors.text} truncate`}>Customer: {s.customer}</p>
                                          <p className={`text-[10px] ${colors.textMuted}`}>Nota: {s.nota}</p>
                                          <div className="flex justify-between items-center mt-1">
                                             <p className={`text-[10px] font-bold ${isLate ? 'text-red-500' : colors.gold}`}>Tagihan: Rp {formatIDR(s.total - s.paid)}</p>
                                             <p className={`text-[10px] font-black px-2 py-0.5 rounded ${isLate ? 'bg-red-500/10 text-red-500' : '${colors.goldBg}/10 ${colors.gold}'}`}>
                                                {isLate ? `TELAT ${Math.abs(daysLeft)} HARI` : `TEMPO: ${formatDate(s.dueDate)}`}
                                             </p>
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </CollapsibleNotifGroup>

                           {/* 2. KELOMPOK UTANG JATUH TEMPO */}
                           <CollapsibleNotifGroup title="Utang Toko" count={incomingDebts.length} icon={Calendar} colorClass="text-orange-500" colors={colors}>
                              {incomingDebts.map(p => {
                                 const daysLeft = Math.ceil((new Date(p.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                                 const isLate = daysLeft < 0;
                                   return (
                                      <div key={`debt-${p.id}`} onClick={() => { if(onNavigateAndEdit) { playSound('pop', isSoundOn); setShowNotifDropdown(false); onNavigateAndEdit('riwayat', p.id, 'pembelian'); } }} className={`p-3 rounded-xl ${isLate ? 'bg-red-500/5 border-red-500/20' : `${colors.creamBg} ${colors.border}`} border flex gap-2 min-w-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity`}>
                                         <div className="min-w-0 flex-1">
                                          <p className={`text-xs font-bold ${colors.text} truncate`}>Supplier: {p.supplier}</p>
                                          <p className={`text-[10px] ${colors.textMuted}`}>Nota: {p.nota}</p>
                                          <div className="flex justify-between items-center mt-1">
                                             <p className={`text-[10px] font-bold ${isLate ? 'text-red-500' : colors.gold}`}>Kurang Bayar: Rp {formatIDR(p.total - p.paid)}</p>
                                             <p className={`text-[10px] font-black px-2 py-0.5 rounded ${isLate ? 'bg-red-500/10 text-red-500' : '${colors.goldBg}/10 ${colors.gold}'}`}>
                                                {isLate ? `TELAT ${Math.abs(daysLeft)} HARI` : `TEMPO: ${formatDate(p.dueDate)}`}
                                             </p>
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </CollapsibleNotifGroup>

                           {/* 3. KELOMPOK BARANG HABIS (BY SUPPLIER) */}
                           <CollapsibleNotifGroup title="Stok Menipis" count={lowStockItems.length} icon={Package} colorClass="text-blue-500" colors={colors}>
                              {groupedLowStock.map((group, idx) => (
                                 <div key={`stock-${idx}`} className={`p-3 rounded-xl ${colors.creamBg} ${colors.border} border flex flex-col gap-2 shadow-sm`}>
                                    <div className={`flex justify-between items-center border-b ${colors.border} pb-2`}>
                                       <div className="flex items-center gap-2 min-w-0">
                                          <span className={`text-xs font-bold ${colors.text} truncate`}>Order ke: {group.supplier.name}</span>
                                       </div>
                                       <button onClick={() => handleSendBulkSupplierWA(group)} className={`px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 text-[10px] font-bold shadow-sm shrink-0`}>
                                          <Send size={12}/> Pesan
                                       </button>
                                    </div>
                                    <div className="pl-2 space-y-1">
                                       {group.items.map(item => (
                                          <div key={item.id} onClick={() => { if(onNavigateAndEdit) { playSound('pop', isSoundOn); setShowNotifDropdown(false); onNavigateAndEdit('produk', item.id); } }} className={`flex justify-between text-[10px] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3f3f46] p-1 rounded transition-colors`}>
                                             <span className={`${colors.textMuted} truncate pr-2`}>• {item.name}</span>
                                             <span className="text-red-500 font-bold shrink-0">Sisa {String(item.stock).replace('.', ',')}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ))}
                           </CollapsibleNotifGroup>

                           {/* 4. KELOMPOK KEDALUWARSA */}
                           <CollapsibleNotifGroup title="Kedaluwarsa" count={expiringItems.length} icon={AlertTriangle} colorClass="text-red-500" colors={colors}>
                              {expiringItems.map(item => {
                                  const isExpired = new Date(item.expiryDate) <= new Date();
                                  return (
                                      <div key={`exp-${item.id}`} onClick={() => { if(onNavigateAndEdit) { playSound('pop', isSoundOn); setShowNotifDropdown(false); onNavigateAndEdit('produk', item.id); } }} className={`p-3 rounded-xl ${isExpired ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'} border flex flex-col gap-1 min-w-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity`}>
                                          <div className="flex justify-between items-start gap-2">
                                              <span className={`font-bold text-[11px] truncate ${colors.text}`}>{item.name}</span>
                                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isExpired ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'} whitespace-nowrap`}>{isExpired ? 'EXPIRED' : 'Segera Habis'}</span>
                                          </div>
                                          <span className="text-[10px] text-gray-500">Exp: {formatDate(item.expiryDate)}</span>
                                      </div>
                                  );
                              })}
                           </CollapsibleNotifGroup>

                           <CollapsibleNotifGroup title="HPP Naik/Turun" count={hppChangedItems.length} icon={AlertTriangle} colorClass="text-blue-500" colors={colors} defaultOpen={true}>
                              {hppChangedItems.map(item => (
                                  <div key={`hpp-${item.id}`} onClick={() => { if(onNavigateAndEdit) { playSound('pop', isSoundOn); setShowNotifDropdown(false); onNavigateAndEdit('produk', item.id); } }} className={`p-3 rounded-xl bg-blue-500/5 border-blue-500/20 border flex flex-col gap-1 min-w-0 shadow-sm cursor-pointer hover:opacity-80 transition-opacity`}>
                                      <div className="flex justify-between items-start gap-2">
                                          <span className={`font-bold text-[11px] truncate ${colors.text}`}>{item.name}</span>
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 whitespace-nowrap`}>HPP Berubah</span>
                                      </div>
                                      <span className="text-[10px] text-gray-500">Dari: Rp{formatIDR(item.lastHpp || 0)} → Rp{formatIDR(item.basePrice || 0)}</span>
                                      <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold mt-1">Klik untuk sesuaikan Harga Jual</span>
                                  </div>
                              ))}
                           </CollapsibleNotifGroup>
                         </>
                      )}
                   </div>
                </div>
             )}
          </div>

            <button onClick={() => { playSound('pop', isSoundOn); setShowProfile(true); }} className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors`}>
               <div className={`w-7 h-7 rounded-full ${colors.button} flex items-center justify-center font-bold text-xs overflow-hidden`}>
                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="ava"/> : user.name?.charAt(0).toUpperCase() || 'U'}
               </div>
               <span className={`text-sm font-semibold hidden sm:block ${colors.text}`}>{user.name}</span>
            </button>
          </div>
        </div>
      </header>

      {showProfile && <ProfileModal user={user} setUser={setUser} users={users} setUsers={setUsers} colors={colors} isSoundOn={isSoundOn} showToast={showToast} onClose={() => setShowProfile(false)} handleLogout={handleLogout} />}
    </>
  );
}