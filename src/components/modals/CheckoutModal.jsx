import React, { useEffect } from 'react';
import { X, Save, Printer, Send } from 'lucide-react';
import { formatIDR, parseIDR, smartFormatInput, playSound } from '../../utils/helpers';

export default function CheckoutModal({ posMode, total, financialAccounts, paymentMethodId, setPaymentMethodId, dueDate, setDueDate, paymentAmount, setPaymentAmount, handleCheckout, setCheckoutModal, colors, isSoundOn }) {
  const remaining = total - (parseIDR(paymentAmount) || 0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
         e.preventDefault();
         handleCheckout(null, 'cetak');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCheckout]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
      <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] overflow-y-auto custom-scrollbar`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${colors.text}`}>Pembayaran {posMode === 'penjualan' ? 'Penjualan' : 'Pembelian'}</h2>
          <button onClick={() => { playSound('pop', isSoundOn); setCheckoutModal(false); }} className="text-red-500 hover:scale-110"><X size={24}/></button>
        </div>
        
        <div className="space-y-4">
          <div className={`p-4 rounded-xl text-center ${posMode === 'penjualan' ? colors.goldBg : '${colors.goldBg}'} text-[#18181B]`}>
            <p className="text-sm font-semibold opacity-80 mb-1">Total Tagihan</p>
            <p className="text-3xl font-black">Rp {formatIDR(total)}</p>
          </div>

          <div>
             <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Nominal Dibayar (Rp)</label>
             <input autoFocus type="text" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} text-xl font-bold focus:ring-2 focus:ring-[#D4AF37] outline-none`} placeholder="0" value={paymentAmount} onChange={e => setPaymentAmount(smartFormatInput(e.target.value))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => setPaymentAmount(formatIDR(total))} className={`py-2 border rounded-lg text-sm font-bold ${colors.text} hover:bg-gray-100 dark:hover:bg-[#27272A]`}>Uang Pas</button>
             <button onClick={() => setPaymentAmount('')} className={`py-2 border rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}>Reset</button>
          </div>

          {remaining > 0 && (
             <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-sm font-bold flex justify-between">
                <span>Kekurangan:</span><span>Rp {formatIDR(remaining)}</span>
             </div>
          )}
          {remaining < 0 && (
             <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 text-sm font-bold flex justify-between">
                <span>Kembalian:</span><span>Rp {formatIDR(Math.abs(remaining))}</span>
             </div>
          )}

          <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700">
             <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Metode Pembayaran</label>
             <select className={`w-full p-3 rounded-xl border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none`} value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)}>
                {financialAccounts.map(fa => <option key={fa.id} value={fa.id}>{fa.name}</option>)}
             </select>
          </div>

          {remaining > 0 && (
             <div>
                <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Jatuh Tempo (Kredit)</label>
                <input type="date" className={`w-full p-3 rounded-xl border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none`} value={dueDate} onChange={e => setDueDate(e.target.value)} />
             </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
             <button type="button" onClick={(e) => handleCheckout(e, 'simpan')} className="flex-1 py-3 rounded-xl font-bold bg-gray-500 hover:bg-gray-600 text-white flex justify-center items-center gap-2 transition-transform active:scale-95 text-xs"><Save size={16}/> Simpan Saja</button>
             <button type="button" onClick={(e) => handleCheckout(e, 'cetak')} className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] flex justify-center items-center gap-2 transition-transform active:scale-95 ${colors.goldBg} hover:opacity-90 text-xs`}><Printer size={16}/> [Enter] Cetak</button>
             <button type="button" onClick={(e) => handleCheckout(e, 'wa')} className="flex-1 py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white flex justify-center items-center gap-2 transition-transform active:scale-95 text-xs"><Send size={16}/> Kirim WA</button>
          </div>
        </div>
      </div>
    </div>
  );
}
