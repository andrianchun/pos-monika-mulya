import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, DollarSign, Calculator, ArrowRight, Printer, X, Send } from 'lucide-react';
import { formatIDR, parseIDR, formatDate, formatDateTime } from '../../utils/helpers';

export default function ShiftCloseModal({ colors,  
   activeShift, setActiveShift, shiftHistory, setShiftHistory, 
   onClose, accounting, setAccounting, user, storeInfo,
   sales = [], financialAccounts = []
}) {
   const [step, setStep] = useState(1);
   const [actualCashStr, setActualCashStr] = useState('');
   const [dropCashStr, setDropCashStr] = useState('');
   
   const [summary, setSummary] = useState(null);

   const { calculatedSalesCash, calculatedSalesNonTunai } = useMemo(() => {
       let sCash = 0, sNonTunai = 0;
       if (!activeShift || !sales || !financialAccounts) return { calculatedSalesCash: 0, calculatedSalesNonTunai: 0 };
       
       const shiftStart = new Date(activeShift.startTime).getTime();
       
       const shiftSales = sales.filter(s => {
           const saleTime = new Date(s.date).getTime();
           return saleTime >= shiftStart;
       });
       
       shiftSales.forEach(sale => {
           if (sale.paymentHistory) {
               sale.paymentHistory.forEach(ph => {
                   const accId = ph.accountId;
                   if (accId) {
                       const account = financialAccounts.find(a => String(a.id) === String(accId));
                       if (account) {
                           if (account.type === 'tunai') sCash += ph.amount;
                           else if (account.type === 'non-tunai' || account.type === 'ewallet' || account.type === 'bank') sNonTunai += ph.amount;
                       }
                   }
               });
           }
       });
       
       return { calculatedSalesCash: sCash, calculatedSalesNonTunai: sNonTunai };
   }, [activeShift, sales, financialAccounts]);

   const expectedCash = activeShift ? (activeShift.startingCash + calculatedSalesCash + activeShift.cashIn - activeShift.cashOut) : 0;
   const actualCashNum = parseIDR(actualCashStr);
   const dropCashNum = parseIDR(dropCashStr);
   const sisaDiLaci = actualCashNum - dropCashNum;
   
   // Handle when no active shift (viewing last report)
   useEffect(() => {
       if (!activeShift && shiftHistory && shiftHistory.length > 0 && !summary) {
           setSummary(shiftHistory[0]);
           setStep(2);
       }
   }, [activeShift, shiftHistory, summary]);

   const handleCalculate = (e) => {
      e.preventDefault();
      const actualCash = parseIDR(actualCashStr);
      const selisih = actualCash - expectedCash;
      const dropCash = parseIDR(dropCashStr);
      const nextStartingCash = actualCash - dropCash;
      
      const shiftSummary = {
          ...activeShift,
          endTime: new Date().toISOString(),
          salesCash: calculatedSalesCash,
          salesNonTunai: calculatedSalesNonTunai,
          expectedCash,
          actualCash,
          selisih,
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
               type: 'kas',
               category: summary.selisih < 0 ? 'Selisih Shift (Minus)' : 'Selisih Shift (Plus)',
               name: `Selisih Shift kasir ${operatorName}`,
               amount: summary.selisih,
               accountId: financialAccounts[0]?.id || 1,
               isSystemGenerated: true
           });
       }
       
       // Record drop cash
       if (summary.dropCash > 0) {
           newAccounting.push({
               id: accId + 1,
               date: summary.endTime,
               type: 'kas',
               category: 'Setoran Kas',
               name: `Setoran Shift kasir ${operatorName}`,
               amount: -summary.dropCash,
               accountId: financialAccounts[0]?.id || 1,
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
      let text = `*LAPORAN SHIFT / RINGKASAN*\n`;
      text += `Tanggal: ${formatDate(new Date())}\n`;
      text += `Toko: ${storeInfo?.name || 'Kasir'}\n`;
      text += `Kasir: ${s.cashierName}\n`;
      text += `Buka: ${formatDateTime(s.startTime)}\n`;
      text += `Tutup: ${formatDateTime(s.endTime)}\n\n`;
      
      text += `*--- FISIK LACI ---*\n`;
      text += `Modal Awal: Rp ${formatIDR(s.startingCash)}\n`;
      text += `Penjualan Tunai: Rp ${formatIDR(s.salesCash)}\n`;
      text += `Kas Masuk: Rp ${formatIDR(s.cashIn || 0)}\n`;
      text += `Kas Keluar: Rp ${formatIDR(s.cashOut || 0)}\n`;
      text += `Total Harusnya: Rp ${formatIDR(s.expectedCash)}\n`;
      text += `Total Fisik: Rp ${formatIDR(s.actualCash)}\n`;
      text += `Selisih: Rp ${formatIDR(s.selisih)}\n\n`;
      
      text += `*--- NON-TUNAI ---*\n`;
      text += `Penjualan Non-Tunai: Rp ${formatIDR(s.salesNonTunai)}\n\n`;
      
      text += `*--- SETORAN & SISA LACI ---*\n`;
      text += `Uang Disetor ke Pemilik: Rp ${formatIDR(s.dropCash)}\n`;
      text += `Sisa di Laci (Modal Shift Berikutnya): Rp ${formatIDR(s.nextStartingCash)}\n`;
      
      return encodeURIComponent(text);
   };

   return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <div className="bg-white dark:bg-[#18181B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-[#27272A] max-h-[90vh] flex flex-col">
            <div className={`p-4 ${colors.panel} text-white flex justify-between items-center shrink-0`}>
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
                {!activeShift && !summary ? (
                    <div className="text-center py-8">
                        <Calculator size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">Tidak ada shift aktif dan riwayat kosong.</p>
                    </div>
                ) : step === 1 ? (
                   <form onSubmit={handleCalculate}>
                       <div className="text-center mb-6">
                          <div className={`w-16 h-16 ${colors.goldBg}/20 rounded-full flex items-center justify-center mx-auto mb-3`}>
                             <Calculator size={32} className={colors.gold} />
                          </div>
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200">Uang Tunai Akhir Shift</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                             Hitung uang kertas dan koin di dalam laci Anda sekarang.
                          </p>
                       </div>
                       
                       <div className="space-y-4">
                           <div>
                               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Total Uang Tunai di Laci Saat Ini
                               </label>
                               <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                                  <input
                                     type="text"
                                     required
                                     className={`w-full pl-10 p-3 bg-gray-50 dark:bg-[#27272A] border border-gray-200 dark:border-[#3F3F46] rounded-xl focus:ring-2 ${colors.goldRing} focus:border-transparent outline-none transition-all dark:text-white font-bold text-xl`}
                                     value={actualCashStr}
                                     onChange={(e) => setActualCashStr(formatIDR(e.target.value))}
                                     placeholder="0"
                                     autoFocus
                                  />
                               </div>
                           </div>
                           
                           <div>
                               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Uang yang Disetor ke Pemilik (Toko)
                               </label>
                               <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                                  <input
                                     type="text"
                                     className={`w-full pl-10 p-3 bg-gray-50 dark:bg-[#27272A] border border-gray-200 dark:border-[#3F3F46] rounded-xl focus:ring-2 ${colors.goldRing} focus:border-transparent outline-none transition-all dark:text-white font-bold text-xl`}
                                     value={dropCashStr}
                                     onChange={(e) => setDropCashStr(formatIDR(e.target.value))}
                                     placeholder="0"
                                  />
                               </div>
                           </div>

                           <div className={`mt-4 p-4 rounded-xl border ${sisaDiLaci >= 0 ? `border-[#D4AF37]/30 bg-[#D4AF37]/5` : `border-red-500/30 bg-red-500/5`}`}>
                               <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                     Sisa di laci untuk shift selanjutnya:
                                  </span>
                                  <span className={`text-lg font-bold ${sisaDiLaci >= 0 ? colors.gold : 'text-red-500'}`}>
                                     Rp {formatIDR(Math.max(0, sisaDiLaci))}
                                  </span>
                               </div>
                           </div>
                       </div>
                       
                       <button
                          type="submit"
                          className={`mt-6 w-full p-4 ${colors.goldBg} text-[#18181B] rounded-xl font-bold shadow-lg hover:opacity-90 transition-all flex justify-center items-center gap-2`}
                       >
                          Hitung & Proses
                          <ArrowRight size={18} />
                       </button>
                   </form>
               ) : (
                   <div>
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-black dark:text-white mb-2">Validasi Tutup Shift</h2>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs bg-gray-100 dark:bg-[#3f3f46] px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                                    Buka: {formatDateTime(summary.startTime)}
                                </span>
                                <span className="text-xs bg-gray-100 dark:bg-[#3f3f46] px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                                    Tutup: {formatDateTime(summary.endTime)}
                                </span>
                            </div>
                        </div>
                       
                       <div className="bg-gray-50 dark:bg-[#27272A]/50 rounded-xl p-4 mb-6 space-y-3 text-sm dark:text-gray-200">
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
                               <span>Ekspektasi Uang Laci</span>
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
                                   <span>Penjualan Non-Tunai</span>
                                   <span>{formatIDR(summary.salesNonTunai)}</span>
                               </div>
                           </div>
                           
                           <div className={`border-t border-dashed border-gray-300 dark:border-gray-500 pt-3 mt-3 ${colors.gold} font-semibold`}>
                               <div className="flex justify-between">
                                   <span>Disetor/Diambil</span>
                                   <span>-{formatIDR(summary.dropCash)}</span>
                               </div>
                               <div className="flex justify-between mt-1">
                                   <span>Sisa Modal Laci Berikutnya</span>
                                   <span>{formatIDR(summary.nextStartingCash)}</span>
                               </div>
                           </div>
                       </div>
                       
                       {activeShift ? (
                            <button
                               onClick={handleFinalize}
                               className={`w-full p-4 ${colors.button} rounded-xl font-bold shadow-lg hover:opacity-90 transition-all transform active:scale-[0.98] flex justify-center items-center gap-2`}
                            >
                               Selesai & Akhiri Shift
                            </button>
                        ) : (
                            <button
                               onClick={onClose}
                               className={`w-full p-4 bg-gray-200 dark:bg-[#3F3F46] hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl font-bold text-gray-800 dark:text-white transition-all transform active:scale-[0.98] flex justify-center items-center gap-2`}
                            >
                               Tutup Modal
                            </button>
                        )}
                   </div>
               )}
            </div>
         </div>
      </div>
   );
}
