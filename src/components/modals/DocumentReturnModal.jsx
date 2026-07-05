import React, { useState } from 'react';
import { X } from 'lucide-react';
import { formatIDR, playSound } from '../../utils/helpers';

export default function DocumentReturnModal({ doc, onClose, onSaveReturn, colors, isSoundOn }) {
  const [returnItems, setReturnItems] = useState(doc.items.map(i => ({...i, returnQty: 0})));
  const isSale = doc.nota.includes('INV') || doc.nota.startsWith('INV'); 
  const totalReturnAmount = returnItems.reduce((sum, item) => sum + (item.returnQty * (item.unitPrice || (isSale ? item.price : item.cost))), 0);

  const handleReturChange = (id, change, max) => {
     setReturnItems(prev => prev.map(item => {
        if(item.id === id) { return {...item, returnQty: Math.max(0, Math.min(max, item.returnQty + change))}; }
        return item;
     }));
  }

  const submitReturn = () => {
     if(totalReturnAmount === 0) return; playSound('success', isSoundOn);
     onSaveReturn(returnItems.filter(i => i.returnQty > 0), totalReturnAmount);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl p-4 sm:p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border}`}>
        <div className="flex justify-between items-center mb-4">
           <h3 className={`text-xl font-bold ${colors.text}`}>Retur Barang - {doc.nota}</h3>
           <button onClick={() => { playSound('pop', isSoundOn); onClose(); }} className="text-red-500 hover:scale-110"><X size={24}/></button>
        </div>
        <p className={`text-sm mb-4 ${colors.textMuted}`}>Pilih barang yang diretur/dikembalikan. Stok otomatis bertambah kembali dan total nota serta omset disesuaikan secara presisi.</p>
        
        <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
           {returnItems.map(item => (
              <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${colors.border} bg-[#F8FAFC] dark:bg-[#27272A]`}>
                 <div className="flex-1">
                    <p className={`font-bold ${colors.text}`}>{item.name}</p>
                    <p className={`text-xs ${colors.textMuted}`}>Tersedia di Nota: {item.qty} {item.unit} x Rp {formatIDR(item.unitPrice || (isSale ? item.price : item.cost))}</p>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-orange-500">Qty Retur:</span>
                    <div className="flex items-center border rounded-lg bg-white dark:bg-gray-700 overflow-hidden">
                       <button onClick={() => handleReturChange(item.id, -1, item.qty)} className={`px-3 py-1 hover:bg-gray-200 dark:bg-gray-600 ${colors.text}`}>-</button>
                       <span className={`w-8 text-center font-bold ${colors.text}`}>{item.returnQty}</span>
                       <button onClick={() => handleReturChange(item.id, 1, item.qty)} className={`px-3 py-1 hover:bg-gray-200 dark:bg-gray-600 ${colors.text}`}>+</button>
                    </div>
                 </div>
              </div>
           ))}
        </div>
        <div className={`pt-4 border-t ${colors.border} flex justify-between items-center mb-4`}>
           <span className={`font-bold ${colors.text}`}>Total Nilai Diretur:</span>
           <span className="font-black text-red-500 text-xl">- Rp {formatIDR(totalReturnAmount)}</span>
        </div>
        <div className="flex gap-3">
           <button onClick={() => { playSound('pop', isSoundOn); onClose(); }} className={`flex-1 py-3 rounded-xl border font-semibold ${colors.text} ${colors.border}`}>Batal</button>
           <button onClick={submitReturn} disabled={totalReturnAmount === 0} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-md ${totalReturnAmount === 0 ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'} active:scale-95 transition-transform`}>Proses Retur</button>
        </div>
      </div>
    </div>
  )
}