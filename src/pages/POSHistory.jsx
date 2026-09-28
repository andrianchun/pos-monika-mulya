import React, { useState, useEffect, useMemo } from 'react';
// PERBAIKAN 1: Import Share2 untuk icon Kirim WA
import { Printer, Edit, RotateCcw, Send, Calendar, X } from 'lucide-react';
import { formatIDR, playSound, formatDate } from '../utils/helpers';
import DataTable from '../components/ui/DataTable';
import DateInput from '../components/DateInput';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';
import DocumentReceiptModal from '../components/modals/DocumentReceiptModal';
import DocumentReturnModal from '../components/modals/DocumentReturnModal';
import TransactionEditModal from '../components/modals/TransactionEditModal';

export default function POSHistory({ 
  sales, setSales, purchases, setPurchases, colors, showToast, 
  isSoundOn, products, setProducts, storeInfo, accounting, setAccounting, 
  customers, setCustomers, suppliers, financialAccounts, globalMode, setGlobalMode, editIntent, user, recordActivity
}) {
  const tab = globalMode;
  const setTab = setGlobalMode;

  const canEdit = user?.role === 'admin' || (user?.permissions || []).includes(tab === 'penjualan' ? 'riwayat_penjualan_edit' : 'riwayat_pembelian_edit');
  const canDelete = user?.role === 'admin' || (user?.permissions || []).includes(tab === 'penjualan' ? 'riwayat_penjualan_delete' : 'riwayat_pembelian_delete');
  const canViewPembelian = user?.role === 'admin' || (user?.permissions || []).includes('riwayat_pembelian');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [returnDoc, setReturnDoc] = useState(null); 
  const [editDoc, setEditDoc] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); 

  // Filter Rentang Tanggal
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');

  const activeData = useMemo(() => {
    const raw = tab === 'penjualan' ? sales : purchases;
    if (!startDate && !endDate) return raw;

    const startTs = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
    const endTs = endDate ? new Date(endDate + 'T23:59:59.999').getTime() : Infinity;

    return raw.filter(item => {
      const t = new Date(item.date).getTime();
      return t >= startTs && t <= endTs;
    });
  }, [sales, purchases, tab, startDate, endDate]); 

  useEffect(() => {
     if (editIntent && editIntent.menu === 'riwayat') {
        const doc = activeData.find(d => d.id === editIntent.id);
        if (doc) {
           setEditDoc(doc);
           if (editIntent.clearIntent) editIntent.clearIntent();
        }
     }
  }, [editIntent, activeData]);

  

  const confirmDeleteAction = () => {
    playSound('pop', isSoundOn);
    let doc = sales.find(s => s.id === deleteConfirmId);
    let isSale = true;
    if(!doc) { doc = purchases.find(s => s.id === deleteConfirmId); isSale = false; }
    
    if(doc) {
       const updatedProducts = products.map(p => {
         const cartItems = doc.items.filter(c => c.id === p.id);
         if (cartItems.length > 0) {
            // Revert stok dengan konversi multi-satuan, sama seperti saat checkout
            const totalQtyImpact = cartItems.reduce((sum, cItem) => {
               let conversion = 1;
               if (cItem.selectedMultiUnitId && cItem.multiUnits) {
                  const mu = cItem.multiUnits.find(u => String(u.id) === String(cItem.selectedMultiUnitId));
                  if (mu) conversion = Number(mu.conversion) || 1;
               }
               return sum + (Number(cItem.qty) * conversion);
            }, 0);
            return { ...p, stock: isSale ? p.stock + totalQtyImpact : Math.max(0, p.stock - totalQtyImpact) };
         }
         return p;
       });
       setProducts(updatedProducts);
       
       if (accounting) {
           // ✅ FIX: Buat reversal terpisah PER entry paymentHistory ke akun yang benar
           // (sebelumnya hanya satu reversal ke accountId pertama saja)
           const reversalEntries = [];
           let totalDepositToRevert = 0;

           (doc.paymentHistory || []).forEach((ph, i) => {
               if (ph.method === 'Saldo Deposit') {
                   totalDepositToRevert += ph.amount;
               } else if (ph.method !== 'Retur' && ph.method !== 'Tukar Poin' && ph.amount !== 0) {
                   reversalEntries.push({
                       id: Date.now() + i,
                       accountId: ph.accountId || null,
                       type: 'kas',
                       name: `Hapus Nota ${doc.nota}`,
                       amount: isSale ? -(ph.amount) : ph.amount,
                       date: new Date().toISOString()
                   });
               }
           });

           if (reversalEntries.length > 0) {
               setAccounting([...accounting, ...reversalEntries]);
           }

           if (isSale && totalDepositToRevert > 0 && setCustomers) {
                // ✅ Prioritas: cari by ID (dari paymentHistory), fallback ke name-match
                const depositPayment = (doc.paymentHistory || []).find(ph => ph.method === 'Saldo Deposit');
                const custIdFromDoc = depositPayment?.customerId || null;
                setCustomers(prev => prev.map(c => {
                    const matchById = custIdFromDoc && String(c.id) === String(custIdFromDoc);
                    const matchByName = !custIdFromDoc && c.name === doc.customer;
                    if (matchById || matchByName) {
                        return { ...c, deposit: (c.deposit || 0) + totalDepositToRevert };
                    }
                    return c;
                }));
           }
       }

       // ✅ FIX: Revert poin customer saat hapus transaksi penjualan
       if (isSale && setCustomers && (doc.earnedPoints || doc.pointsRedeemed)) {
           const earned = doc.earnedPoints || 0;
           const redeemed = doc.pointsRedeemed || 0;
           if (earned !== 0 || redeemed !== 0) {
               setCustomers(prev => prev.map(c => {
                   if (c.name === doc.customer) {
                       // Kembalikan: kurangi poin yang diearn, tambah balik poin yang ditukar
                       return { ...c, points: Math.max(0, (c.points || 0) - earned + redeemed) };
                   }
                   return c;
               }));
           }
       }
       if(isSale) setSales(sales.filter(s => s.id !== deleteConfirmId));
       else setPurchases(purchases.filter(s => s.id !== deleteConfirmId));

       if (recordActivity) {
          recordActivity('Hapus Transaksi', `Menghapus permanen (Void) nota ${doc.nota} bernilai Rp${formatIDR(doc.total)}`);
       }
    }
    setDeleteConfirmId(null); 
    showToast('Transaksi dihapus permanen.', 'success');
  };

  const handleProcessReturn = (returnedItems, totalAmount) => {
    const isSale = tab === 'penjualan';
    let doc = returnDoc;
    let newItems = doc.items.map(item => {
       const retItem = returnedItems.find(r => r.id === item.id);
       if(retItem) return { ...item, qty: item.qty - retItem.returnQty, subtotal: item.subtotal - (retItem.returnQty * (item.unitPrice || (isSale ? item.price : item.cost))) };
       return item;
    }).filter(item => item.qty > 0);

    const newSubtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    const newTotal = newSubtotal - doc.discount + (doc.ongkir || 0);
    const newPaymentHistory = [...(doc.paymentHistory||[]), { date: new Date().toISOString(), amount: -totalAmount, method: 'Retur' }];
    const newPaid = newPaymentHistory.reduce((sum, h) => sum + h.amount, 0);
    const finalizedDoc = { ...doc, items: newItems, subtotal: newSubtotal, total: newTotal, paymentHistory: newPaymentHistory, paid: newPaid, status: newPaid >= newTotal ? 'Lunas' : 'Tempo' };

    const updatedProducts = products.map(p => {
       const retItem = returnedItems.find(r => r.id === p.id);
       if(retItem) {
          let conversion = 1;
          if (retItem.selectedMultiUnitId && retItem.multiUnits) {
             const mu = retItem.multiUnits.find(u => String(u.id) === String(retItem.selectedMultiUnitId));
             if (mu) conversion = Number(mu.conversion) || 1;
          }
          const qtyImpact = Number(retItem.returnQty) * conversion;
          return { ...p, stock: isSale ? p.stock + qtyImpact : Math.max(0, p.stock - qtyImpact) };
       }
       return p;
    });

    setProducts(updatedProducts);
    if(isSale) setSales(sales.map(s => s.id === finalizedDoc.id ? finalizedDoc : s));
    else setPurchases(purchases.map(s => s.id === finalizedDoc.id ? finalizedDoc : s));
    
    if (accounting) {
        // Hitung berapa uang tunai yang perlu dikembalikan (refund) jika lunas
        // Jika nota aslinya Piutang (ngutang), retur hanya mengurangi tagihan, tidak keluar uang kas.
        const prevPaid = doc.paid || 0;
        const refundAmount = Math.max(0, prevPaid - newTotal);
        
        if (refundAmount > 0) {
            const origAccId = (doc.paymentHistory || [])[0]?.accountId || null;
            setAccounting([...accounting, { id: Date.now(), type: 'kas', accountId: origAccId, name: `Retur ${doc.nota}`, amount: isSale ? -refundAmount : refundAmount, date: new Date().toISOString() }]);
        }
    }
    if (recordActivity) {
        recordActivity('Retur Transaksi', `Memproses retur senilai Rp${formatIDR(totalAmount)} pada nota ${doc.nota}`);
    }
    setReturnDoc(null); 
    showToast(`Retur terekam presisi.`, 'success');
  };

  // Memoize columns agar filterOptions tidak di-compute ulang setiap render
  const columns = useMemo(() => [
    { key: 'nota', label: 'No. Nota', render: (r) => <span className={`font-bold ${colors.gold} cursor-pointer hover:underline`} onClick={() => setSelectedDoc(r)}>{r.nota}</span> },
    { key: 'date', label: 'Tanggal & Waktu', render: (r) => new Date(r.date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { 
       key: tab === 'penjualan' ? 'customer' : 'supplier', 
       label: tab === 'penjualan' ? 'Customer' : 'Supplier',
       filterOptions: Array.from(new Set(activeData.map(r => tab === 'penjualan' ? r.customer : r.supplier))).filter(Boolean).sort()
    },
    { key: 'total', label: 'Total', render: (r) => <span className={`font-bold ${colors.gold}`}>Rp {formatIDR(r.total)}</span> },
    { 
       key: 'status', 
       label: 'Status', 
       filterOptions: ['Lunas', 'Tempo'],
       render: (r) => <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.status}</span> 
    }
  ], [activeData, tab, colors.gold]);

  // PERBAIKAN 2: Seragamkan aksi Print dan tambahkan aksi Kirim WA pakai trik autoAction
  const actions = [
    { 
      icon: Printer, 
      label: 'Lihat / Cetak', 
      colorClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200', 
      onClick: (r) => { playSound('pop', isSoundOn); setSelectedDoc(r); } 
    },
    { 
      icon: Send, 
      label: 'Kirim WA', 
      colorClass: 'bg-green-100 text-green-600 hover:bg-green-200', 
      onClick: (r) => { 
          const rawPhone = String(r.phone || '').replace(/\D/g, '');
          if (rawPhone.length < 9) {
              showToast('Nomor WhatsApp tidak valid. Silakan isi nomor dengan benar di pengaturan kontak.', 'error');
              return;
          }
          
          playSound('pop', isSoundOn); 
          setSelectedDoc({ ...r, autoAction: 'wa' }); 
      } 
    },
    ...(canEdit ? [{ 
        icon: Edit, 
        label: 'Edit Transaksi', 
        colorClass: `${colors.active} hover:opacity-80 transition-opacity`, 
        onClick: (r) => { playSound('pop', isSoundOn); setEditDoc(r); } 
      }] : []),
    ...(canEdit ? [{ 
      icon: RotateCcw, 
      label: 'Retur Barang', 
      colorClass: 'bg-orange-100 text-orange-600 hover:bg-orange-200', 
      onClick: (r) => { playSound('pop', isSoundOn); setReturnDoc(r); } 
    }] : [])
  ];

  const handleOpenDateModal = () => {
    playSound('pop', isSoundOn);
    setTempStart(startDate);
    setTempEnd(endDate);
    setShowDateModal(true);
  };

  const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const applyPreset = (preset) => {
    playSound('pop', isSoundOn);
    const todayStr = getLocalDateStr(new Date());

    if (preset === 'today') {
      setTempStart(todayStr);
      setTempEnd(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      setTempStart(getLocalDateStr(past7));
      setTempEnd(todayStr);
    } else if (preset === 'month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setTempStart(getLocalDateStr(firstDay));
      setTempEnd(todayStr);
    } else if (preset === 'all') {
      setTempStart('');
      setTempEnd('');
    }
  };

  const handleApplyFilter = () => {
    playSound('pop', isSoundOn);
    setStartDate(tempStart);
    setEndDate(tempEnd);
    setShowDateModal(false);
  };

  const handleResetFilter = () => {
    playSound('pop', isSoundOn);
    setStartDate('');
    setEndDate('');
    setTempStart('');
    setTempEnd('');
    setShowDateModal(false);
  };

  const isDateFiltered = Boolean(startDate || endDate);

  const customHeaderRight = (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {isDateFiltered && (
        <div className="flex items-center gap-1.5 h-[44px] px-2.5 sm:px-3 rounded-xl border border-[#D4AF37] bg-[#D4AF37]/10 text-xs font-bold text-[#D4AF37] shadow-sm select-none">
          <Calendar size={15} className="shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-[200px]">
            {startDate ? formatDate(startDate) : 'Awal'} - {endDate ? formatDate(endDate) : 'Sekarang'}
          </span>
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              playSound('pop', isSoundOn); 
              setStartDate(''); 
              setEndDate(''); 
            }}
            className="p-1 hover:bg-[#D4AF37]/20 rounded-full transition-colors ml-0.5 cursor-pointer"
            title="Hapus filter rentang tanggal"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpenDateModal}
        className={`flex items-center gap-1.5 h-[44px] px-3 rounded-xl border ${
          isDateFiltered 
            ? 'border-[#D4AF37] bg-[#D4AF37] text-[#18181B]' 
            : `${colors.border} bg-white dark:bg-[#18181B] ${colors.text} hover:bg-gray-100 dark:hover:bg-[#27272A]`
        } text-xs font-bold shrink-0 shadow-sm transition-all active:scale-95 cursor-pointer`}
        title="Filter rentang tanggal"
      >
        <Calendar size={16} className={isDateFiltered ? 'text-[#18181B]' : colors.gold} />
        <span className="hidden sm:inline">Rentang Tanggal</span>
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden -m-4 md:-m-6 print:m-0 bg-gray-50 dark:bg-[#121212]">
      <div className="flex-1 overflow-hidden print:hidden p-2 sm:p-4">
         <DataTable 
            title={
              <div className={`flex items-center ${colors.creamBg} p-1 rounded-lg w-fit h-fit shrink-0 border ${colors.border}`}>
                <button onClick={() => setTab('penjualan')} className={`w-[95px] sm:w-[120px] py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center ${tab === 'penjualan' ? colors.goldBg + ' text-[#18181B] shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Penjualan</button>
                {canViewPembelian && (
                   <button onClick={() => setTab('pembelian')} className={`w-[95px] sm:w-[120px] py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center ${tab === 'pembelian' ? 'bg-blue-600 text-white shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Pembelian</button>
                )}
              </div>
            }
            headerRight={customHeaderRight}
            columns={columns} data={activeData} colors={colors} 
            searchPlaceholder="Cari nota, customer, atau tanggal..."
            posLayout={true}
            onDelete={canDelete ? (r) => { playSound('pop', isSoundOn); setDeleteConfirmId(r.id); } : undefined} 
            actions={actions} 
            defaultSort={{key: 'date', direction: 'desc'}}
         />
      </div>

      {showDateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className={`w-full max-w-sm rounded-2xl border ${colors.border} bg-white dark:bg-[#18181B] shadow-2xl overflow-hidden flex flex-col`}>
              <div className={`p-4 border-b ${colors.border} flex justify-between items-center bg-gray-50/50 dark:bg-[#202024]`}>
                 <div className="flex items-center gap-2">
                    <Calendar size={18} className={colors.gold} />
                    <h3 className={`font-black text-sm ${colors.text}`}>Filter Rentang Tanggal</h3>
                 </div>
                 <button onClick={() => setShowDateModal(false)} className={`p-1 rounded-lg text-gray-400 hover:${colors.text} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors cursor-pointer`}>
                    <X size={18} />
                 </button>
              </div>

              <div className="p-4 space-y-4">
                 <div>
                    <label className={`text-[11px] font-bold ${colors.textMuted} mb-1.5 block`}>Pilihan Cepat:</label>
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                         type="button" 
                         onClick={() => applyPreset('today')} 
                         className={`py-2 px-2.5 text-xs font-bold rounded-lg border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] ${colors.text} transition-colors cursor-pointer`}
                       >
                         Hari Ini
                       </button>
                       <button 
                         type="button" 
                         onClick={() => applyPreset('7days')} 
                         className={`py-2 px-2.5 text-xs font-bold rounded-lg border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] ${colors.text} transition-colors cursor-pointer`}
                       >
                         7 Hari Terakhir
                       </button>
                       <button 
                         type="button" 
                         onClick={() => applyPreset('month')} 
                         className={`py-2 px-2.5 text-xs font-bold rounded-lg border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] ${colors.text} transition-colors cursor-pointer`}
                       >
                         Bulan Ini
                       </button>
                       <button 
                         type="button" 
                         onClick={() => applyPreset('all')} 
                         className={`py-2 px-2.5 text-xs font-bold rounded-lg border border-dashed ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] text-gray-500 transition-colors cursor-pointer`}
                       >
                         Semua (Reset)
                       </button>
                    </div>
                 </div>

                 <div className="space-y-3 pt-1">
                    <div>
                       <label className={`text-[11px] font-bold ${colors.textMuted} mb-1 block`}>Dari Tanggal:</label>
                       <DateInput 
                          value={tempStart} 
                          onChange={(e) => setTempStart(e.target.value)} 
                          max={tempEnd || undefined}
                          className={`h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border ${colors.border} bg-white dark:bg-[#121212] ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} 
                       />
                    </div>
                    <div>
                       <label className={`text-[11px] font-bold ${colors.textMuted} mb-1 block`}>Sampai Tanggal:</label>
                       <DateInput 
                          value={tempEnd} 
                          onChange={(e) => setTempEnd(e.target.value)} 
                          min={tempStart || undefined}
                          className={`h-10 px-3 text-xs sm:text-sm font-semibold rounded-xl border ${colors.border} bg-white dark:bg-[#121212] ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} 
                       />
                    </div>
                 </div>
              </div>

              <div className={`p-4 border-t ${colors.border} bg-gray-50/50 dark:bg-[#202024] flex gap-2`}>
                 <button 
                   type="button" 
                   onClick={handleResetFilter} 
                   className={`flex-1 py-2.5 text-xs font-bold rounded-xl border ${colors.border} ${colors.text} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors cursor-pointer`}
                 >
                   Reset
                 </button>
                 <button 
                   type="button" 
                   onClick={handleApplyFilter} 
                   className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${colors.goldBg} text-[#18181B] shadow hover:opacity-90 transition-opacity cursor-pointer`}
                 >
                   Terapkan
                 </button>
              </div>
           </div>
        </div>
      )}

      {deleteConfirmId && <DeleteConfirmModal title="Hapus Permanen Transaksi?" desc="Stok dan data pembukuan kas akan dikembalikan (di-revert) seperti sebelum transaksi ini. Apakah Anda yakin?" onConfirm={confirmDeleteAction} onCancel={() => setDeleteConfirmId(null)} colors={colors} isSoundOn={isSoundOn} />}
      
      {selectedDoc && !returnDoc && <DocumentReceiptModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} storeInfo={storeInfo} colors={colors} isSoundOn={isSoundOn} showToast={showToast} />}
      
      {returnDoc && <DocumentReturnModal doc={returnDoc} onClose={() => setReturnDoc(null)} onSaveReturn={handleProcessReturn} colors={colors} isSoundOn={isSoundOn} />}
      
      {editDoc && <TransactionEditModal doc={editDoc} onClose={() => setEditDoc(null)} tab={tab} sales={sales} setSales={setSales} purchases={purchases} setPurchases={setPurchases} products={products} setProducts={setProducts} accounting={accounting} setAccounting={setAccounting} customers={customers} setCustomers={setCustomers} suppliers={suppliers} financialAccounts={financialAccounts} colors={colors} isSoundOn={isSoundOn} showToast={showToast} recordActivity={recordActivity} />} 
    </div>
  );
}