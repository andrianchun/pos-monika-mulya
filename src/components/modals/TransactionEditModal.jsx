import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import DateInput from '../DateInput';
import { formatIDR, playSound } from '../../utils/helpers';
import SearchableSelect from '../ui/SearchableSelect';

export default function TransactionEditModal({ 
  doc, onClose, tab, sales, setSales, purchases, setPurchases, 
  products, setProducts, accounting, setAccounting, customers, 
  suppliers, financialAccounts, colors, isSoundOn, showToast 
}) {
  const [editedDoc, setEditedDoc] = useState(() => {
     const parsed = JSON.parse(JSON.stringify(doc));
     
     let ph = parsed.paymentHistory || [];
     if (ph.length === 0 && parsed.paid > 0) {
         ph = [{ date: parsed.date, amount: parsed.paid, method: 'Tunai (Migrasi)', accountId: financialAccounts[0]?.id || 1 }];
     }

     parsed.paymentHistory = ph.map((p, i) => ({ ...p, _tmpId: i }));
     parsed.items = (parsed.items || []).map(it => {
         const priceToUse = it.unitPrice !== undefined ? it.unitPrice : (tab === 'penjualan' ? it.price : it.cost);
         return { ...it, unitPrice: priceToUse, subtotal: it.qty * priceToUse };
     });
     return parsed;
  });
  const [activeSubTab, setActiveSubTab] = useState('items'); 
  const [newPayment, setNewPayment] = useState({ date: new Date().toISOString().split('T')[0], amount: '', accountId: financialAccounts[0]?.id || '' });

  const isSale = tab === 'penjualan';

  useEffect(() => {
     const newSub = (editedDoc.items || []).reduce((s, i) => s + (i.qty * i.unitPrice), 0);
     const newTot = newSub - editedDoc.discount + (editedDoc.ongkir || 0);
     const newPaid = (editedDoc.paymentHistory || []).reduce((s, p) => s + p.amount, 0);
     setEditedDoc(prev => ({ ...prev, subtotal: newSub, total: newTot, paid: newPaid, status: newPaid >= newTot ? 'Lunas' : 'Tempo' }));
  }, [editedDoc.items, editedDoc.discount, editedDoc.ongkir, editedDoc.paymentHistory]);

  const handleSaveEdit = () => {
     const diffs = {};
     (doc.items || []).forEach(i => diffs[i.id] = (diffs[i.id] || 0) + (isSale ? i.qty : -i.qty));
     (editedDoc.items || []).forEach(i => diffs[i.id] = (diffs[i.id] || 0) - (isSale ? i.qty : -i.qty));

     const updatedProducts = products.map(p => {
         if(diffs[p.id] !== undefined && diffs[p.id] !== 0) return { ...p, stock: Math.max(0, p.stock + diffs[p.id]) };
         return p;
     });
     setProducts(updatedProducts);

     const originalIds = (doc.paymentHistory || []).map((_, i) => i);
     const keptIds = editedDoc.paymentHistory.filter(p => p._tmpId !== undefined).map(p => p._tmpId);
     const removedIds = originalIds.filter(id => !keptIds.includes(id));
     const addedPayments = editedDoc.paymentHistory.filter(p => p._tmpId === undefined);

     let newAccounting = [...(accounting || [])];

     if(removedIds.length > 0 && setAccounting) {
         const reversingEntries = removedIds.map((id, i) => {
             const pmt = (doc.paymentHistory || [])[id];
             return {
                  id: Date.now() + 1000 + i, type: 'kas', accountId: pmt?.accountId || null,
                  name: `Batal Bayar Nota ${editedDoc.nota}`,
                  amount: isSale ? -(pmt?.amount || 0) : (pmt?.amount || 0),
                  date: new Date().toISOString()
             };
         });
         newAccounting = [...newAccounting, ...reversingEntries];
     }

     if(addedPayments.length > 0 && setAccounting) {
         const addedAcc = addedPayments.map((pmt, i) => {
             const fAcc = financialAccounts.find(a => a.id === pmt.accountId);
             return {
                 id: Date.now() + 2000 + i, type: 'kas', accountId: pmt.accountId,
                 name: `${isSale ? 'Pelunasan/Cicilan' : 'Bayar Cicilan'} Nota ${editedDoc.nota} (${fAcc ? fAcc.name : '-'})`,
                 amount: isSale ? pmt.amount : -pmt.amount,
                 date: new Date(pmt.date).toISOString()
             };
         });
         newAccounting = [...newAccounting, ...addedAcc];
     }

     if((removedIds.length > 0 || addedPayments.length > 0) && setAccounting) {
         setAccounting(newAccounting);
     }

     const finalDoc = {
         ...editedDoc,
         paymentHistory: editedDoc.paymentHistory.map(p => {
             const copy = {...p};
             delete copy._tmpId;
             return copy;
         })
     };

     if(isSale) setSales(sales.map(s => s.id === doc.id ? finalDoc : s));
     else setPurchases(purchases.map(p => p.id === doc.id ? finalDoc : p));

     playSound('success', isSoundOn); showToast('Perubahan berhasil disimpan', 'success'); onClose();
  };

  const updateItemQty = (id, change) => {
     setEditedDoc(prev => {
        const updatedItems = prev.items.map(it => {
           if(it.id === id) {
               const nq = Math.max(1, it.qty + change);
               let prc = it.unitPrice;
               return { ...it, qty: nq, unitPrice: prc, subtotal: nq * prc };
           }
           return it;
        });
        return { ...prev, items: updatedItems };
     });
  };

  const removeItem = (id) => {
     setEditedDoc(prev => ({ ...prev, items: prev.items.filter(it => it.id !== id) }));
  };

  const addPayment = (e) => {
     e.preventDefault();
     const amt = parseInt(newPayment.amount.replace(/[^0-9]/g, ''), 10) || 0;
     if(amt <= 0) { showToast('Nominal tidak valid!', 'error'); return; }
     const methName = financialAccounts.find(a => a.id === Number(newPayment.accountId))?.name || 'Unknown';
     const pmtObj = { date: new Date(newPayment.date).toISOString(), amount: amt, method: methName, accountId: Number(newPayment.accountId) };
     setEditedDoc(prev => ({ ...prev, paymentHistory: [...prev.paymentHistory, pmtObj] }));
     setNewPayment({ ...newPayment, amount: '' });
     playSound('cash', isSoundOn);
     showToast('Pembayaran ditambahkan ke antrian simpan', 'success');
  };

  const deletePayment = (index) => {
     setEditedDoc(prev => ({ ...prev, paymentHistory: prev.paymentHistory.filter((_, i) => i !== index) }));
  };

  const handleAddProduct = (prodId) => {
     const p = products.find(x => x.id === Number(prodId));
     if(!p) return;
     setEditedDoc(prev => {
         const existing = prev.items.find(it => it.id === p.id);
         if(existing) {
             const nq = existing.qty + 1;
             return { ...prev, items: prev.items.map(it => it.id === p.id ? { ...it, qty: nq, subtotal: nq * existing.unitPrice } : it) };
         } else {
             const prc = isSale ? p.price : p.cost;
             const newIt = { ...p, qty: 1, unitPrice: prc, subtotal: prc, isWholesale: false, isPromo: false, basePrice: isSale ? p.price : p.cost };
             return { ...prev, items: [...prev.items, newIt] };
         }
     });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
       <div className={`w-full max-w-4xl p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} flex flex-col max-h-[95vh]`}>
          <div className="flex justify-between items-center mb-4 shrink-0">
             <div>
                <h3 className={`text-xl font-bold ${colors.text}`}>Edit {editedDoc.nota}</h3>
                <p className={`text-xs ${colors.textMuted}`}>{isSale ? 'Pelanggan: ' + editedDoc.customer : 'Supplier: ' + editedDoc.supplier} | Status: <span className={editedDoc.status === 'Lunas' ? 'text-green-500' : 'text-orange-500'}>{editedDoc.status}</span></p>
             </div>
             <button onClick={() => { playSound('pop', isSoundOn); onClose(); }} className="text-red-500 hover:scale-110"><X size={24}/></button>
          </div>

          <div className={`flex border-b ${colors.border} mb-4 shrink-0`}>
             <button onClick={() => setActiveSubTab('items')} className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${activeSubTab === 'items' ? `border-[#D4AF37] ${colors.gold}` : `border-transparent ${colors.textMuted}`}`}>Data Transaksi</button>
             <button onClick={() => setActiveSubTab('payments')} className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${activeSubTab === 'payments' ? `border-[#D4AF37] ${colors.gold}` : `border-transparent ${colors.textMuted}`}`}>Pembayaran & Cicilan</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
             {activeSubTab === 'items' ? (
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Waktu Transaksi</label>
                         <input type="datetime-local" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none [color-scheme:light] dark:[color-scheme:dark]`} value={new Date(new Date(editedDoc.date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setEditedDoc({...editedDoc, date: new Date(e.target.value).toISOString()})} />
                      </div>
                      <div>
                         <label className={`block text-xs font-bold mb-1 ${colors.text}`}>{isSale ? 'Customer' : 'Supplier'}</label>
                         <SearchableSelect
                            options={isSale ? customers.map(c => ({ ...c, name: c.phone && c.phone !== '-' && String(c.id) !== '1' ? `${c.name} (${c.phone})` : c.name })) : suppliers.map(s => ({ ...s, name: s.phone && s.phone !== '-' ? `${s.name} (${s.phone})` : s.name }))}
                            value={isSale ? (customers.find(c=>c.name===editedDoc.customer)?.id || '') : (suppliers.find(s=>s.name===editedDoc.supplier)?.id || '')}
                            onChange={(id) => {
                               if (isSale) {
                                  const cust = customers.find(c => c.id === id);
                                  setEditedDoc({ ...editedDoc, customer: cust ? cust.name : '', phone: cust ? cust.phone : '' });
                               } else {
                                  const sup = suppliers.find(s => s.id === id);
                                  setEditedDoc({ ...editedDoc, supplier: sup ? sup.name : '', phone: sup ? sup.phone : '' });
                               }
                            }}
                            placeholder={isSale ? 'Pilih Customer...' : 'Pilih Supplier...'}
                            colors={colors}
                         />
                      </div>
                   </div>
                   
                   <div className={`p-4 rounded-xl border ${colors.border} bg-[#F8FAFC] dark:bg-[#27272A]`}>
                      <h4 className={`font-bold text-sm mb-3 ${colors.text}`}>Detail Item</h4>
                      <div className="mb-3">
                         <SearchableSelect 
                            options={products.map(p => ({id: p.id, name: `${p.name} - Rp ${formatIDR(isSale ? p.price : p.cost)}`}))}
                            value={''}
                            onChange={(val) => { if(val) handleAddProduct(val); }}
                            placeholder="+ Ketik & Cari Produk untuk Ditambah..."
                            colors={colors} 
                         />
                      </div>
                      <div className="space-y-2">
                         {editedDoc.items.map(it => (
                            <div key={it.id} className={`flex items-center justify-between p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e]`}>
                               <div className="flex-1 pr-2">
                                  <p className={`font-semibold text-sm ${colors.text}`}>{it.name}</p>
                                  <p className={`text-[10px] ${colors.textMuted}`}>Rp {formatIDR(it.unitPrice)} / {it.unit}</p>
                               </div>
                               <div className="flex items-center gap-3">
                                  <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700">
                                     <button onClick={() => updateItemQty(it.id, -1)} className={`px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 ${colors.text}`}>-</button>
                                     <span className={`w-8 text-center font-bold text-sm ${colors.text}`}>{it.qty}</span>
                                     <button onClick={() => updateItemQty(it.id, 1)} className={`px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 ${colors.text}`}>+</button>
                                  </div>
                                  <span className={`font-bold text-sm w-24 text-right ${colors.text}`}>Rp {formatIDR(it.subtotal)}</span>
                                  <button onClick={() => removeItem(it.id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                               </div>
                            </div>
                         ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600 space-y-2 text-sm">
                         <div className="flex justify-between"><span className={colors.textMuted}>Subtotal</span><span className={`font-bold ${colors.text}`}>Rp {formatIDR(editedDoc.subtotal)}</span></div>
                         <div className="flex justify-between items-center"><span className={colors.textMuted}>Diskon (Rp)</span><input type="text" className={`w-28 text-right p-1 rounded border ${colors.border} bg-white dark:bg-[#1e1e1e] outline-none`} value={editedDoc.discount ? formatIDR(editedDoc.discount) : ''} onChange={e => setEditedDoc({...editedDoc, discount: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0})} /></div>
                         <div className="flex justify-between items-center"><span className={colors.textMuted}>Ongkir/Lain (Rp)</span><input type="text" className={`w-28 text-right p-1 rounded border ${colors.border} bg-white dark:bg-[#1e1e1e] outline-none`} value={editedDoc.ongkir ? formatIDR(editedDoc.ongkir) : ''} onChange={e => setEditedDoc({...editedDoc, ongkir: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0})} /></div>
                         <div className="flex justify-between pt-2 border-t border-gray-300 font-bold text-lg"><span className={colors.text}>TOTAL AKHIR</span><span className={isSale ? colors.gold : '${colors.gold}'}>Rp {formatIDR(editedDoc.total)}</span></div>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="space-y-4">
                   <div className={`p-4 rounded-xl border ${colors.border} bg-[#F8FAFC] dark:bg-[#27272A]`}>
                      <h4 className={`font-bold text-sm mb-3 ${colors.text}`}>Riwayat Pembayaran</h4>
                      <div className="space-y-2 mb-4">
                         {editedDoc.paymentHistory.map((ph, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e]`}>
                               <div>
                                  <p className={`font-semibold text-sm ${colors.text}`}>{new Date(ph.date).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</p>
                                  <p className={`text-[10px] ${colors.textMuted}`}>Metode: {ph.method}</p>
                               </div>
                               <div className="flex items-center gap-3">
                                  <span className={`font-bold ${ph.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>{ph.amount < 0 ? '-' : ''}Rp {formatIDR(Math.abs(ph.amount))}</span>
                                  <button onClick={() => deletePayment(idx)} className="text-red-500 p-1 hover:bg-red-50 rounded" title="Hapus Pembayaran"><X size={16}/></button>
                               </div>
                            </div>
                         ))}
                      </div>
                      <div className={`flex justify-between p-2 rounded-lg ${colors.creamBg} font-bold text-sm border ${colors.border}`}>
                         <span className={colors.text}>TOTAL TERBAYAR:</span><span className="text-green-600">Rp {formatIDR(editedDoc.paid)}</span>
                      </div>
                      {editedDoc.total > editedDoc.paid && (
                         <div className={`flex justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20 font-bold text-sm text-red-500 mt-2`}>
                            <span>KEKURANGAN / SISA:</span><span>Rp {formatIDR(editedDoc.total - editedDoc.paid)}</span>
                         </div>
                      )}
                      {editedDoc.total < editedDoc.paid && (
                         <div className={`flex justify-between p-2 rounded-lg bg-orange-500/5 border border-orange-500/20 font-bold text-sm text-orange-500 mt-2`}>
                            <span>KEMBALIAN / LEBIH BAYAR:</span><span>Rp {formatIDR(editedDoc.paid - editedDoc.total)}</span>
                         </div>
                      )}
                   </div>

                   {editedDoc.total > editedDoc.paid && (
                      <form onSubmit={addPayment} className={`p-4 rounded-xl border ${colors.border} ${colors.creamBg}`}>
                         <h4 className={`font-bold text-sm ${colors.text} mb-3`}>Tambah Cicilan / Pelunasan</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div><label className={`block text-xs font-semibold mb-1 ${colors.text}`}>Tanggal Bayar</label><DateInput required className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none [color-scheme:light] dark:[color-scheme:dark]`} value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} /></div>
                            <div><label className={`block text-xs font-semibold mb-1 ${colors.text}`}>Akun Keuangan</label><select required className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none`} value={newPayment.accountId} onChange={e => setNewPayment({...newPayment, accountId: e.target.value})}>{financialAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                             <div>
                                <label className={`block text-xs font-semibold mb-1 ${colors.text}`}>Nominal (Rp)</label>
                                <div className="flex gap-2">
                                   <input type="text" required className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none font-bold placeholder-gray-300 dark:placeholder-gray-600`} value={newPayment.amount ? formatIDR(newPayment.amount) : ''} onChange={e => setNewPayment({...newPayment, amount: e.target.value.replace(/[^0-9]/g, '')})} placeholder={formatIDR(editedDoc.total - editedDoc.paid)} />
                                   <button type="button" onClick={() => setNewPayment({...newPayment, amount: editedDoc.total - editedDoc.paid})} className={`${colors.goldBg} text-[#18181B] text-xs px-3 rounded-lg font-bold hover:opacity-90 shrink-0 shadow-sm`}>Lunasi</button>
                                </div>
                             </div>
                         </div>
                         <button type="submit" className={`w-full py-2 ${colors.goldBg} hover:opacity-90 text-[#18181B] font-bold rounded-lg shadow-sm`}>Tambahkan Pembayaran</button>
                      </form>
                   )}
                </div>
             )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700 shrink-0">
             <button onClick={() => { playSound('pop', isSoundOn); onClose(); }} className={`flex-1 py-3 border rounded-xl font-bold ${colors.text} ${colors.border} hover:bg-[#F8FAFC] dark:bg-[#27272A]`}>Batal</button>
             <button onClick={handleSaveEdit} className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90`}>Simpan Perubahan</button>
          </div>
       </div>
    </div>
  );
}