import React, { useState } from 'react';
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
  customers, setCustomers, suppliers, financialAccounts 
}) {
  const [tab, setTab] = useState('penjualan');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [returnDoc, setReturnDoc] = useState(null); 
  const [editDoc, setEditDoc] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); 

  const activeData = tab === 'penjualan' ? sales : purchases; 
  
  const confirmDeleteAction = () => {
    playSound('pop', isSoundOn);
    let doc = sales.find(s => s.id === deleteConfirmId);
    let isSale = true;
    if(!doc) { doc = purchases.find(s => s.id === deleteConfirmId); isSale = false; }
    
    if(doc) {
       const updatedProducts = products.map(p => {
         const cartItem = doc.items.find(c => c.id === p.id);
         if (cartItem) return { ...p, stock: isSale ? p.stock + cartItem.qty : Math.max(0, p.stock - cartItem.qty) };
         return p;
       });
       setProducts(updatedProducts);
       
       if (accounting) {
           let totalKasToRevert = 0;
           let totalDepositToRevert = 0;
           
           (doc.paymentHistory || []).forEach(ph => {
               if (ph.method === 'Saldo Deposit') {
                   totalDepositToRevert += ph.amount;
               } else if (ph.method !== 'Retur') {
                   totalKasToRevert += ph.amount;
               }
           });
           
           if (totalKasToRevert !== 0) {
               const origAccId = (doc.paymentHistory || [])[0]?.accountId || null;
               setAccounting([...accounting, { id: Date.now(), accountId: origAccId, type: 'kas', name: `Hapus Nota ${doc.nota}`, amount: isSale ? -totalKasToRevert : totalKasToRevert, date: new Date().toISOString() }]);
           }
           
           if (isSale && totalDepositToRevert > 0 && setCustomers) {
               setCustomers(prev => prev.map(c => {
                   if (c.name === doc.customer) {
                       return { ...c, deposit: (c.deposit || 0) + totalDepositToRevert };
                   }
                   return c;
               }));
           }
       }
       if(isSale) setSales(sales.filter(s => s.id !== deleteConfirmId));
       else setPurchases(purchases.filter(s => s.id !== deleteConfirmId));
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
       if(retItem) return { ...p, stock: isSale ? p.stock + retItem.returnQty : Math.max(0, p.stock - retItem.returnQty) };
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
    setReturnDoc(null); 
    showToast(`Retur terekam presisi.`, 'success');
  };

  const columns = [
    { key: 'nota', label: 'No. Nota', render: (r) => <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => setSelectedDoc(r)}>{r.nota}</span> },
    { key: 'date', label: 'Tanggal & Waktu', render: (r) => new Date(r.date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { key: tab === 'penjualan' ? 'customer' : 'supplier', label: tab === 'penjualan' ? 'Customer' : 'Supplier' },
    { key: 'total', label: 'Total', render: (r) => <span className="font-bold text-blue-600">Rp {formatIDR(r.total)}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.status}</span> }
  ];

  // PERBAIKAN 2: Seragamkan aksi Print dan tambahkan aksi Kirim WA pakai trik autoAction
  const actions = [
    { 
      icon: Printer, 
      label: 'Print Ulang', 
      colorClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200', 
      onClick: (r) => { playSound('pop', isSoundOn); setSelectedDoc({ ...r, autoAction: 'cetak' }); } 
    },
    { 
      icon: Send, 
      label: 'Kirim WA', 
      colorClass: 'bg-green-100 text-green-600 hover:bg-green-200', 
      onClick: (r) => { playSound('pop', isSoundOn); setSelectedDoc({ ...r, autoAction: 'wa' }); } 
    },
    { 
      icon: Edit, 
      label: 'Edit Transaksi', 
      colorClass: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:bg-blue-200', 
      onClick: (r) => { playSound('pop', isSoundOn); setEditDoc(r); } 
    },
    { 
      icon: RotateCcw, 
      label: 'Retur Barang', 
      colorClass: 'bg-orange-100 text-orange-600 hover:bg-orange-200', 
      onClick: (r) => { playSound('pop', isSoundOn); setReturnDoc(r); } 
    }
  ];

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-hidden print:hidden">
         <DataTable 
            title={
              <div className="flex gap-2">
                <button onClick={() => setTab('penjualan')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${tab==='penjualan' ? colors.goldBg + ' text-[#18181B]' : colors.panel + ' ' + colors.text + ' border ' + colors.border}`}>Penjualan</button>
                <button onClick={() => setTab('pembelian')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${tab==='pembelian' ? 'bg-blue-600 text-white' : colors.panel + ' ' + colors.text + ' border ' + colors.border}`}>Pembelian</button>
              </div>
            } 
            columns={columns} data={activeData} colors={colors} 
            onDelete={(r) => { playSound('pop', isSoundOn); setDeleteConfirmId(r.id); }} 
            actions={actions} 
            defaultSort={{key: 'date', direction: 'desc'}}
         />
      </div>

      {deleteConfirmId && <DeleteConfirmModal title="Hapus Permanen Transaksi?" desc="Stok dan data pembukuan kas akan dikembalikan (di-revert) seperti sebelum transaksi ini. Apakah Anda yakin?" onConfirm={confirmDeleteAction} onCancel={() => setDeleteConfirmId(null)} colors={colors} isSoundOn={isSoundOn} />}
      
      {selectedDoc && !returnDoc && <DocumentReceiptModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} storeInfo={storeInfo} colors={colors} isSoundOn={isSoundOn} />}
      
      {returnDoc && <DocumentReturnModal doc={returnDoc} onClose={() => setReturnDoc(null)} onSaveReturn={handleProcessReturn} colors={colors} isSoundOn={isSoundOn} />}
      
      {editDoc && <TransactionEditModal doc={editDoc} onClose={() => setEditDoc(null)} tab={tab} sales={sales} setSales={setSales} purchases={purchases} setPurchases={setPurchases} products={products} setProducts={setProducts} accounting={accounting} setAccounting={setAccounting} customers={customers} suppliers={suppliers} financialAccounts={financialAccounts} colors={colors} isSoundOn={isSoundOn} showToast={showToast} />} 
    </div>
  );
}