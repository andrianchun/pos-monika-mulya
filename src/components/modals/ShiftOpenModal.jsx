import React, { useState } from 'react';
import { LogIn, Coins, X } from 'lucide-react';
import { formatIDR, parseIDR } from '../../utils/helpers';

export default function ShiftOpenModal({ colors, onClose, setActiveShift, user, lastShiftRemaining = 0 }) {
   const [startingCashStr, setStartingCashStr] = useState(formatIDR(lastShiftRemaining || 0));

   const handleOpenShift = (e) => {
      e.preventDefault();
      const startingCash = parseIDR(startingCashStr);
      const newShift = {
         id: 'shift-' + Date.now(),
         startTime: new Date().toISOString(),
         cashierId: user?.uid || 'unknown',
         cashierName: user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : '(anonim)'),
         startingCash,
         expectedCash: startingCash,
         salesCash: 0,
         salesQRIS: 0,
         salesTransfer: 0,
         cashIn: 0,
         cashOut: 0,
         status: 'OPEN'
      };
      setActiveShift(newShift);
      if (onClose) onClose();
   };

   const cashierName = user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : 'Kasir');

   const presets = [
      ...(lastShiftRemaining > 0 ? [{ label: `Sisa Shift (Rp ${formatIDR(lastShiftRemaining)})`, val: lastShiftRemaining }] : []),
      { label: 'Rp 50.000', val: 50000 },
      { label: 'Rp 100.000', val: 100000 },
      { label: 'Rp 200.000', val: 200000 },
      { label: 'Rp 0', val: 0 }
   ];

   const currentVal = parseIDR(startingCashStr);

   return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${colors.panel} border ${colors.border} animate-in fade-in zoom-in-95 duration-200`}>
            {/* Header Modal Ringkas */}
            <div className={`px-5 py-4 flex justify-between items-center border-b ${colors.border}`}>
               <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                     <Coins size={18} />
                  </div>
                  <div>
                     <h3 className={`font-bold text-base leading-tight ${colors.text}`}>Buka Shift Kasir</h3>
                     <p className={`text-[11px] ${colors.textMuted} font-medium`}>Kasir: <span className="font-semibold text-gray-700 dark:text-gray-300">{cashierName}</span></p>
                  </div>
               </div>
               {onClose && (
                  <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                     <X size={18} />
                  </button>
               )}
            </div>
            
            <form onSubmit={handleOpenShift} className="p-5 space-y-4">
               <div>
                  <div className="flex items-center justify-between mb-1.5">
                     <label className={`text-xs font-semibold ${colors.textMuted}`}>
                        Modal Awal di Laci
                     </label>
                     {lastShiftRemaining > 0 && (
                        <button
                           type="button"
                           onClick={() => setStartingCashStr(formatIDR(lastShiftRemaining))}
                           className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                           title="Gunakan sisa saldo shift sebelumnya"
                        >
                           Sisa lalu: Rp {formatIDR(lastShiftRemaining)}
                        </button>
                     )}
                  </div>

                  {/* Input Angka Besar */}
                  <div className="relative">
                     <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span>
                     <input
                        type="text"
                        required
                        className={`w-full pl-11 pr-10 py-3 bg-gray-50/50 dark:bg-black/20 border ${colors.border} rounded-xl focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none transition-all ${colors.text} font-bold text-xl tracking-tight`}
                        value={startingCashStr}
                        onChange={(e) => setStartingCashStr(formatIDR(e.target.value))}
                        placeholder="0"
                        autoFocus
                     />
                     {currentVal > 0 && (
                        <button
                           type="button"
                           onClick={() => setStartingCashStr('0')}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 transition-colors"
                           title="Kosongkan (Rp 0)"
                        >
                           <X size={16} />
                        </button>
                     )}
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                     Hitung uang tunai fisik yang ada di laci saat ini sebagai modal kembalian.
                  </p>
               </div>

               {/* Pilihan Cepat Nominal */}
               <div className="space-y-1.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${colors.textMuted}`}>
                     Pilihan Cepat
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                     {presets.map((preset) => {
                        const isActive = currentVal === preset.val;
                        return (
                           <button
                              key={preset.label}
                              type="button"
                              onClick={() => setStartingCashStr(formatIDR(preset.val))}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                 isActive
                                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37] font-bold shadow-sm'
                                    : `bg-transparent ${colors.border} ${colors.textMuted} hover:${colors.text} hover:bg-gray-100 dark:hover:bg-gray-800`
                              }`}
                           >
                              {preset.label}
                           </button>
                        );
                     })}
                  </div>
               </div>

               {/* Tombol Eksekusi Buka Shift */}
               <button
                  type="submit"
                  className={`w-full py-3 px-4 ${colors.goldBg} text-[#18181B] rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] flex justify-center items-center gap-2 mt-2`}
               >
                  <LogIn size={18} />
                  Buka Shift &amp; Mulai Transaksi
               </button>
            </form>
         </div>
      </div>
   );
}
