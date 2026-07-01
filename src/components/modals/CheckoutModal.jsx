import React, { useState, useEffect } from 'react';
import { X, Save, Printer, Send, ChevronDown } from 'lucide-react';
import DateInput from '../DateInput';
import { formatIDR, parseIDR, smartFormatInput, playSound } from '../../utils/helpers';

export default function CheckoutModal({ posMode, total, financialAccounts, paymentMethodId, setPaymentMethodId, dueDate, setDueDate, paymentAmount, setPaymentAmount, handleCheckout, setCheckoutModal, colors, isSoundOn, activeCustomerDeposit = 0, activeCustomerPoints = 0, pointValue = 100, minPointRedeem = 100, isCustomerUmum = false, activeCustomerPhone = '', showToast }) {
  const [useDeposit, setUseDeposit] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [saveChangeAsDeposit, setSaveChangeAsDeposit] = useState(false);
  
  const depositUsed = useDeposit ? Math.min(total, activeCustomerDeposit) : 0;
  const maxPointsByTagihan = Math.floor((total - depositUsed) / pointValue);
  const maxPointsPossible = Math.min(activeCustomerPoints, maxPointsByTagihan);
  
  useEffect(() => {
    if (usePoints) setPointsToRedeem(maxPointsPossible);
    else setPointsToRedeem(0);
  }, [usePoints, maxPointsPossible]);

  const pointDiscount = usePoints ? pointsToRedeem * pointValue : 0;
  const remainingTagihan = total - depositUsed - pointDiscount;
  const remaining = remainingTagihan - (parseIDR(paymentAmount) || 0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
         e.preventDefault();
         handleCheckout(null, 'cetak', useDeposit ? depositUsed : 0, saveChangeAsDeposit ? Math.abs(remaining) : 0, usePoints ? pointsToRedeem : 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCheckout, useDeposit, depositUsed, saveChangeAsDeposit, remaining, usePoints, pointsToRedeem]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
      <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] overflow-y-auto custom-scrollbar`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${colors.text}`}>Pembayaran {posMode === 'penjualan' ? 'Penjualan' : 'Pembelian'}</h2>
          <button onClick={() => { playSound('pop', isSoundOn); setCheckoutModal(false); }} className="text-red-500 hover:scale-110"><X size={24}/></button>
        </div>
        
        <div className="space-y-4">
          <div className={`p-4 rounded-xl text-center ${posMode === 'penjualan' ? `${colors.goldBg} text-[#18181B]` : 'bg-blue-600 text-white'}`}>
            <p className="text-sm font-semibold opacity-80 mb-1">Total Tagihan</p>
            <p className="text-3xl font-black">Rp {formatIDR(total)}</p>
            {useDeposit && depositUsed > 0 && (
               <p className="text-sm font-bold text-red-700 mt-2 bg-red-100/50 inline-block px-3 py-1 rounded-full">- Rp {formatIDR(depositUsed)} (Potong Saldo)</p>
            )}
            {usePoints && pointDiscount > 0 && (
               <p className="text-sm font-bold text-orange-700 mt-2 bg-orange-100/50 inline-block px-3 py-1 rounded-full ml-1">- Rp {formatIDR(pointDiscount)} (Tukar {pointsToRedeem} Poin)</p>
            )}
            {(useDeposit || usePoints) && remainingTagihan > 0 && (
               <p className="text-lg font-bold mt-2">Sisa: Rp {formatIDR(remainingTagihan)}</p>
            )}
          </div>

          {activeCustomerDeposit > 0 && posMode === 'penjualan' && !isCustomerUmum && (
             <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl cursor-pointer" onClick={() => setUseDeposit(!useDeposit)}>
                <input type="checkbox" checked={useDeposit} readOnly className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Gunakan Saldo Deposit (Sisa: Rp {formatIDR(activeCustomerDeposit)})</span>
             </div>
          )}

          {activeCustomerPoints >= minPointRedeem && posMode === 'penjualan' && !isCustomerUmum && (
             <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setUsePoints(!usePoints)}>
                   <input type="checkbox" checked={usePoints} readOnly className="w-4 h-4 text-orange-600 rounded" />
                   <span className="text-sm font-bold text-orange-800 dark:text-orange-300">Tukar Poin (Tersedia: {activeCustomerPoints} Poin)</span>
                </div>
                {usePoints && (
                   <div className="mt-2 pl-6">
                      <label className="block text-[10px] text-orange-600 dark:text-orange-400 mb-1">Jumlah Poin Ditukar (1 Poin = Rp {formatIDR(pointValue)})</label>
                      <input type="number" className="w-full p-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-[#1e1e1e] text-xs outline-none focus:ring-1 focus:ring-orange-500" value={pointsToRedeem} onChange={(e) => {
                         let val = Number(e.target.value);
                         if (val > maxPointsPossible) val = maxPointsPossible;
                         if (val < 0) val = 0;
                         setPointsToRedeem(val);
                      }} />
                   </div>
                )}
             </div>
          )}

          <div>
             <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Nominal Dibayar (Rp)</label>
             <input autoFocus type="text" disabled={remainingTagihan <= 0} className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} text-xl font-bold focus:ring-2 focus:ring-[#D4AF37] outline-none disabled:opacity-50`} placeholder="0" value={remainingTagihan <= 0 ? '0' : paymentAmount} onChange={e => setPaymentAmount(smartFormatInput(e.target.value))} />
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
             <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex flex-col gap-2">
                <div className="text-green-600 text-sm font-bold flex justify-between items-center">
                   <span>Kembalian:</span><span>Rp {formatIDR(Math.abs(remaining))}</span>
                </div>
                {posMode === 'penjualan' && !isCustomerUmum && (
                   <label className="flex items-center gap-2 mt-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={saveChangeAsDeposit} onChange={(e) => setSaveChangeAsDeposit(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">Simpan Kembalian sebagai Deposit</span>
                   </label>
                )}
             </div>
          )}

          <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700">
             <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Metode Pembayaran</label>
             <div className="relative">
                <select className={`w-full p-3 pr-10 rounded-xl border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none appearance-none`} value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)}>
                   {financialAccounts.map(fa => <option key={fa.id} value={fa.id}>{fa.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                   <ChevronDown size={18} />
                </div>
             </div>
          </div>

          {remaining > 0 && (
             <div>
                <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Jatuh Tempo (Kredit)</label>
                <DateInput className={`w-full p-3 rounded-xl border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none [color-scheme:light] dark:[color-scheme:dark]`} value={dueDate} onChange={e => setDueDate(e.target.value)} />
             </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700">
             <button type="button" onClick={(e) => handleCheckout(e, 'simpan', useDeposit ? depositUsed : 0, saveChangeAsDeposit ? Math.abs(remaining) : 0, usePoints ? pointsToRedeem : 0)} className="flex-1 py-3 rounded-xl font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 flex justify-center items-center gap-2 transition-transform active:scale-95 text-xs"><Save size={16}/> Simpan Saja</button>
             <button type="button" onClick={(e) => handleCheckout(e, 'cetak', useDeposit ? depositUsed : 0, saveChangeAsDeposit ? Math.abs(remaining) : 0, usePoints ? pointsToRedeem : 0)} className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] flex justify-center items-center gap-2 transition-transform active:scale-95 ${colors.goldBg} hover:opacity-90 text-xs`}><Printer size={16}/> Simpan & Print</button>
             <button type="button" onClick={(e) => {
                 const rawPhone = String(activeCustomerPhone || '').replace(/\D/g, '');
                 if (rawPhone.length < 9) {
                     if (showToast) showToast('Nomor WhatsApp tidak valid. Silakan isi nomor dengan benar di pengaturan kontak.', 'error');
                     return;
                 }
                 
                 handleCheckout(e, 'wa', useDeposit ? depositUsed : 0, saveChangeAsDeposit ? Math.abs(remaining) : 0, usePoints ? pointsToRedeem : 0);
             }} className="flex-1 py-3 rounded-xl font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50 flex justify-center items-center gap-2 transition-transform active:scale-95 text-xs"><Send size={16}/> Simpan & Kirim</button>
          </div>
        </div>
      </div>
    </div>
  );
}
