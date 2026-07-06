import React, { useState, useEffect, useMemo } from 'react';
// PERBAIKAN 1: Import Share2 untuk icon Kirim WA
import { Printer, Edit, RotateCcw, Send } from 'lucide-react';
import { formatIDR, playSound } from '../utils/helpers';
import DataTable from '../components/ui/DataTable';
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

  const activeData = tab === 'penjualan' ? sales : purchases; 

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

  return (
    <div className="h-full flex flex-col relative overflow-hidden -m-4 md:-m-6 print:m-0 bg-gray-50 dark:bg-[#121212]">
      <div className="flex-1 overflow-hidden print:hidden p-2 sm:p-4">
         <DataTable 
            title={
              <div className={`flex items-center ${colors.creamBg} p-1 rounded-lg w-fit h-fit shrink-0 border ${colors.border}`}>
                <button onClick={() => setTab('penjualan')} className={`w-[110px] sm:w-[130px] py-1.5 text-sm font-bold rounded-md transition-all flex items-center justify-center ${tab === 'penjualan' ? colors.goldBg + ' text-[#18181B] shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Penjualan</button>
                {canViewPembelian && (
                   <button onClick={() => setTab('pembelian')} className={`w-[110px] sm:w-[130px] py-1.5 text-sm font-bold rounded-md transition-all flex items-center justify-center ${tab === 'pembelian' ? 'bg-blue-600 text-white shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Pembelian</button>
                )}
              </div>
            }
            columns={columns} data={activeData} colors={colors} 
            searchPlaceholder="Cari"
            posLayout={true}
            onDelete={canDelete ? (r) => { playSound('pop', isSoundOn); setDeleteConfirmId(r.id); } : undefined} 
            actions={actions} 
            defaultSort={{key: 'date', direction: 'desc'}}
         />
      </div>

      {deleteConfirmId && <DeleteConfirmModal title="Hapus Permanen Transaksi?" desc="Stok dan data pembukuan kas akan dikembalikan (di-revert) seperti sebelum transaksi ini. Apakah Anda yakin?" onConfirm={confirmDeleteAction} onCancel={() => setDeleteConfirmId(null)} colors={colors} isSoundOn={isSoundOn} />}
      
      {selectedDoc && !returnDoc && <DocumentReceiptModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} storeInfo={storeInfo} colors={colors} isSoundOn={isSoundOn} showToast={showToast} />}
      
      {returnDoc && <DocumentReturnModal doc={returnDoc} onClose={() => setReturnDoc(null)} onSaveReturn={handleProcessReturn} colors={colors} isSoundOn={isSoundOn} />}
      
      {editDoc && <TransactionEditModal doc={editDoc} onClose={() => setEditDoc(null)} tab={tab} sales={sales} setSales={setSales} purchases={purchases} setPurchases={setPurchases} products={products} setProducts={setProducts} accounting={accounting} setAccounting={setAccounting} customers={customers} setCustomers={setCustomers} suppliers={suppliers} financialAccounts={financialAccounts} colors={colors} isSoundOn={isSoundOn} showToast={showToast} recordActivity={recordActivity} />} 
    </div>
  );
}