import React, { useState, useEffect } from 'react';
import { LogOut, DollarSign, Calculator, ArrowRight, Printer, X, Send } from 'lucide-react';
import { formatIDR, parseIDR, formatDate } from '../../utils/helpers';

export default function ShiftCloseModal({ colors,  
   activeShift, setActiveShift, shiftHistory, setShiftHistory, 
   onClose, accounting, setAccounting, user, storeInfo 
}) {
   const [step, setStep] = useState(1);
   const [actualCashStr, setActualCashStr] = useState('');
   const [closeType, setCloseType] = useState('handover'); // 'handover' | 'endofday'
   const [dropCashStr, setDropCashStr] = useState('');
   
   const [summary, setSummary] = useState(null);

   const expectedCash = activeShift?.expectedCash || 0;

   const handleCalculate = (e) => {
      e.preventDefault();
      const actualCash = parseIDR(actualCashStr);
      const selisih = actualCash - expectedCash;
      
      let nextStartingCash = actualCash;
      let dropCash = 0;
      
      if (closeType === 'endofday') {
          dropCash = parseIDR(dropCashStr);
          nextStartingCash = actualCash - dropCash;
      }
      
      const shiftSummary = {
          ...activeShift,
          endTime: new Date().toISOString(),
          actualCash,
          selisih,
          closeType,
          dropCash,
          nextStartingCash,
          status: 'CLOSED'
      };
      
      setSummary(shiftSummary);
      setStep(2);
   };
   
   const handleFinalize = () => {
       if (!summary) return;
       
       // Create Accounting Entries for shortages/overages if any
       let newAccounting = [...accounting];
       const accId = Date.now();
       const operatorName = user?.email || '(anonim)';
       
       if (summary.selisih !== 0) {
           newAccounting.push({
               id: accId,
               date: summary.endTime,
               type: summary.selisih < 0 ? 'expense' : 'income',
               category: summary.selisih < 0 ? 'Selisih Shift (Minus)' : 'Selisih Shift (Plus)',
               description: `Selisih kasir ${operatorName}`,
               amount: Math.abs(summary.selisih),
               accountId: 'laci_kasir',
               isSystemGenerated: true
           });
       }
       
       // Record drop cash if end of day
       if (summary.closeType === 'endofday' && summary.dropCash > 0) {
           newAccounting.push({
               id: accId + 1,
               date: summary.endTime,
               type: 'transfer_out',
               category: 'Setoran Kas',
               description: `Setoran kasir ${operatorName} (Tutup Toko)`,
               amount: summary.dropCash,
               accountId: 'laci_kasir',
               isSystemGenerated: true
           });
       }
       
       if (newAccounting.length > accounting.length) {
           setAccounting(newAccounting);
       }
       
       // Save to history
       const newHistory = [summary, ...shiftHistory].slice(0, 50); // Keep last 50
       setShiftHistory(newHistory);
       
       // Close active shift
       setActiveShift(null);
       
       if (onClose) onClose();
   };

   const generateWaText = () => {
      if (!summary) return '';
      const s = summary;
      let text = `*Z-REPORT / RINGKASAN SHIFT*\n`;
      text += `Toko: ${storeInfo?.name || 'Kasir'}\n`;
      text += `Kasir: ${s.cashierName}\n`;
      text += `Buka: ${formatDate(s.startTime)}\n`;
      text += `Tutup: ${formatDate(s.endTime)}\n\n`;
      
      text += `*--- FISIK LACI ---*\n`;
      text += `Modal Awal: Rp ${formatIDR(s.startingCash)}\n`;
      text += `Total Penjualan Tunai: Rp ${formatIDR(s.salesCash)}\n`;
      if (s.cashIn > 0) text += `Kas Masuk Laci: Rp ${formatIDR(s.cashIn)}\n`;
      if (s.cashOut > 0) text += `Kas Keluar Laci: Rp ${formatIDR(s.cashOut)}\n`;
      text += `Uang Fisik Dihitung: Rp ${formatIDR(s.actualCash)}\n`;
      if (s.selisih !== 0) {
          text += `*Selisih Laci: Rp ${formatIDR(s.selisih)}* ${s.selisih < 0 ? '(MINUS)' : '(PLUS)'}\n`;
      } else {
          text += `*Selisih Laci: PAS (Rp 0)*\n`;
      }
      text += `\n*--- PENJUALAN NON-TUNAI ---*\n`;
      text += `Total Penjualan QRIS: Rp ${formatIDR(s.salesQRIS)}\n`;
      text += `Total Penjualan Bank/Transfer: Rp ${formatIDR(s.salesTransfer)}\n\n`;
      
      if (s.closeType === 'endofday') {
          text += `*--- SETORAN TUTUP TOKO ---*\n`;
          text += `Uang Disetor/Diambil: Rp ${formatIDR(s.dropCash)}\n`;
          text += `Modal Laci Besok: Rp ${formatIDR(s.nextStartingCash)}\n`;
      } else {
          text += `*--- SERAH TERIMA SHIFT ---*\n`;
          text += `Modal Laci Kasir Berikutnya: Rp ${formatIDR(s.nextStartingCash)}\n`;
      }
      
      return encodeURIComponent(text);
   };

   return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <div className="bg-white dark:bg-[#18181B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-[#27272A] max-h-[90vh] flex flex-col">
            <div className={`p-4 ${'${colors.panel}'} text-white flex justify-between items-center shrink-0`}>
               <div className="flex items-center gap-2">
                  <LogOut size={20} />
                  <h3 className="font-bold text-lg">Tutup Shift Kasir</h3>
               </div>
               {onClose && step === 1 && (
                   <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
                       <X size={20} />
                   </button>
               )}
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
               {step === 1 ? (
                   <form onSubmit={handleCalculate}>
                       <div className="text-center mb-6">
                          <div className="w-16 h-16 ${colors.goldBg}/20 rounded-full flex items-center justify-center mx-auto mb-3">
                             <Calculator size={32} className="${colors.gold}" />
                          </div>
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Hitung Fisik Laci (Blind Close)</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                             Hitung uang kertas dan koin di dalam laci Anda sekarang. Transaksi Non-Tunai otomatis dihitung sistem.
                          </p>
                       </div>
                       
                       <div className="space-y-4">
                           <div>
                               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Total Uang Fisik Saat Ini
                               </label>
                               <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                                  <input
                                     type="text"
                                     required
                                     className="w-full pl-10 p-3 bg-gray-50 dark:bg-[#27272A] border border-gray-200 dark:border-[#3F3F46] rounded-xl focus:ring-2 ${colors.goldRing} focus:border-transparent outline-none transition-all dark:text-white font-bold text-xl"
                                     value={actualCashStr}
                                     onChange={(e) => setActualCashStr(formatIDR(e.target.value))}
                                     placeholder="0"
                                     autoFocus
                                  />
                               </div>
                           </div>
                           
                           <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Pilih Jenis Penutupan:
                               </label>
                               <div className="grid grid-cols-2 gap-3">
                                   <label className={`border rounded-xl p-3 cursor-pointer text-center flex flex-col gap-1 transition-all ${closeType === 'handover' ? 'border-gold ${colors.goldBg}/10 ${colors.gold}' : 'border-gray-200 dark:border-[#27272A] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272A]'}`}>
                                       <input type="radio" className="hidden" checked={closeType === 'handover'} onChange={() => setCloseType('handover')} />
                                       <span className="font-semibold">Serah Terima</span>
                                       <span className="text-xs opacity-75">Ganti Kasir</span>
                                   </label>
                                   <label className={`border rounded-xl p-3 cursor-pointer text-center flex flex-col gap-1 transition-all ${closeType === 'endofday' ? 'border-gold ${colors.goldBg}/10 ${colors.gold}' : 'border-gray-200 dark:border-[#27272A] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272A]'}`}>
                                       <input type="radio" className="hidden" checked={closeType === 'endofday'} onChange={() => setCloseType('endofday')} />
                                       <span className="font-semibold">Tutup Toko</span>
                                       <span className="text-xs opacity-75">Selesai Hari Ini</span>
                                   </label>
                               </div>
                           </div>
                           
                           {closeType === 'endofday' && (
                               <div className="animate-fade-in ${colors.goldBg}/10 p-4 rounded-xl border border-gold/50">
                                   <label className="block text-sm font-medium ${colors.gold} mb-1">
                                      Uang Fisik yang Disetorkan (Diambil dari Laci)
                                   </label>
                                   <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 ${colors.gold} font-medium">Rp</span>
                                      <input
                                         type="text"
                                         required={closeType === 'endofday'}
                                         className="w-full pl-10 p-3 bg-white dark:bg-[#18181B] border border-gold/50 rounded-xl focus:ring-2 ${colors.goldRing} outline-none dark:text-white font-semibold"
                                         value={dropCashStr}
                                         onChange={(e) => setDropCashStr(formatIDR(e.target.value))}
                                         placeholder="0"
                                      />
                                   </div>
                               </div>
                           )}
                       </div>
                       
                       <button
                          type="submit"
                          className={`mt-8 w-full p-4 ${colors.button} rounded-xl font-bold shadow-lg hover:opacity-90 transition-all flex justify-center items-center gap-2`}
                       >
                          Hitung & Proses
                          <ArrowRight size={18} />
                       </button>
                   </form>
               ) : (
                   <div>
                       <div className="text-center mb-6">
                           <h4 className="font-bold text-xl text-gray-800 dark:text-white mb-1">Ringkasan Shift</h4>
                           <p className="text-sm text-gray-500">Z-Report Kasir</p>
                       </div>
                       
                       <div className="bg-gray-50 dark:bg-[#27272A]/50 rounded-xl p-4 mb-6 space-y-3 font-mono text-sm dark:text-gray-200">
                           <div className="flex justify-between">
                               <span>Modal Awal Laci</span>
                               <span>{formatIDR(summary.startingCash)}</span>
                           </div>
                           <div className="flex justify-between">
                               <span>Penjualan Tunai</span>
                               <span>{formatIDR(summary.salesCash)}</span>
                           </div>
                           <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                               <span>Kas Masuk / Keluar</span>
                               <span>{formatIDR(summary.cashIn - summary.cashOut)}</span>
                           </div>
                           <div className="flex justify-between font-semibold pt-1 text-gray-500 dark:text-gray-400">
                               <span>Expected Uang Laci</span>
                               <span>{formatIDR(summary.expectedCash)}</span>
                           </div>
                           <div className="flex justify-between font-bold text-lg pt-2">
                               <span>Uang Fisik Dihitung</span>
                               <span>{formatIDR(summary.actualCash)}</span>
                           </div>
                           <div className={`flex justify-between font-bold p-2 rounded-lg ${summary.selisih === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                               <span>Selisih</span>
                               <span>{summary.selisih < 0 ? '-' : (summary.selisih > 0 ? '+' : '')}{formatIDR(Math.abs(summary.selisih))}</span>
                           </div>
                           
                           <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                               <p className="text-xs text-gray-400 mb-1">Non-Tunai (Otomatis):</p>
                               <div className="flex justify-between">
                                   <span>QRIS</span>
                                   <span>{formatIDR(summary.salesQRIS)}</span>
                               </div>
                               <div className="flex justify-between">
                                   <span>Bank / Transfer</span>
                                   <span>{formatIDR(summary.salesTransfer)}</span>
                               </div>
                           </div>
                           
                           {summary.closeType === 'endofday' && (
                               <div className="border-t border-dashed border-gray-300 dark:border-gray-500 pt-3 mt-3 ${colors.gold} font-semibold">
                                   <div className="flex justify-between">
                                       <span>Disetor/Diambil</span>
                                       <span>-{formatIDR(summary.dropCash)}</span>
                                   </div>
                                   <div className="flex justify-between mt-1">
                                       <span>Sisa Modal Besok</span>
                                       <span>{formatIDR(summary.nextStartingCash)}</span>
                                   </div>
                               </div>
                           )}
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3 mb-6">
                           <button onClick={() => window.print()} className="p-3 bg-gray-100 dark:bg-[#27272A] hover:bg-gray-200 dark:hover:bg-[#3F3F46] rounded-xl text-gray-700 dark:text-gray-200 font-semibold flex items-center justify-center gap-2 transition-colors">
                               <Printer size={18} /> Print
                           </button>
                           <a href={`https://wa.me/?text=${generateWaText()}`} target="_blank" rel="noopener noreferrer" className={`p-3 ${colors.goldBg} hover:opacity-90 rounded-xl text-[#18181B] font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-gold/30`}>
                               <Send size={18} /> Kirim WA
                           </a>
                       </div>
                       
                       <button
                          onClick={handleFinalize}
                          className={`w-full p-4 ${colors.button} rounded-xl font-bold shadow-lg hover:opacity-90 transition-all transform active:scale-[0.98] flex justify-center items-center gap-2`}
                       >
                          Selesai & Akhiri Shift
                       </button>
                   </div>
               )}
            </div>
         </div>
      </div>
   );
}
