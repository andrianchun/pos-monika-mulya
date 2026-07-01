import React, { useState, useEffect } from 'react';
import { LogIn, DollarSign, X } from 'lucide-react';
import { formatIDR, parseIDR } from '../../utils/helpers';

export default function ShiftOpenModal({ colors,  onClose, setActiveShift, user, lastShiftRemaining = 0 }) {
   const [startingCashStr, setStartingCashStr] = useState(formatIDR(lastShiftRemaining || 0));

   const handleOpenShift = (e) => {
      e.preventDefault();
      const startingCash = parseIDR(startingCashStr);
      const newShift = {
         id: 'shift-' + Date.now(),
         startTime: new Date().toISOString(),
         cashierId: user?.uid || 'unknown',
         cashierName: user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : '(anonim)'),
         startingCash: parseIDR(startingCashStr),
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

   return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${colors.panel} border ${colors.border}`}>
            <div className={`p-4 flex justify-between items-center border-b ${colors.border}`}>
               <div className="flex items-center gap-2">
                  <LogIn size={20} className={colors.gold} />
                  <h3 className={`font-bold text-lg ${colors.text}`}>Buka Shift Kasir</h3>
               </div>
               {onClose && (
                  <button onClick={onClose} className="text-red-500 hover:scale-110 transition-transform">
                     <X size={24} />
                  </button>
               )}
            </div>
            
            <div className="p-6">
               <div className="text-center mb-6">
                  <div className={`w-16 h-16 ${colors.goldBg}/20 rounded-full flex items-center justify-center mx-auto mb-3`}>
                     <DollarSign size={32} className={colors.gold} />
                  </div>
                  <h4 className={`font-semibold ${colors.text}`}>Hitung Modal Awal Laci</h4>
                  <p className="text-sm text-gray-500 mt-1">
                     Silakan hitung uang fisik (receh/kembalian) yang ada di dalam laci kasir saat ini.
                  </p>
               </div>

               <form onSubmit={handleOpenShift}>
                  <div className="mb-6">
                     <label className={`block text-sm font-medium ${colors.text} mb-1`}>
                        Modal Awal (Rp)
                     </label>
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                        <input
                           type="text"
                           required
                           className={`w-full pl-10 p-3 bg-transparent border ${colors.border} rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all ${colors.text} font-semibold text-lg`}
                           value={startingCashStr}
                           onChange={(e) => setStartingCashStr(formatIDR(e.target.value))}
                           placeholder="0"
                           autoFocus
                        />
                     </div>
                     {lastShiftRemaining > 0 && (
                        <button 
                           type="button"
                           onClick={() => setStartingCashStr(formatIDR(lastShiftRemaining))}
                           className="w-full text-xs text-green-600 dark:text-green-400 mt-2 flex justify-between items-center bg-green-500/10 hover:bg-green-500/20 p-2.5 rounded-lg transition-colors border border-green-500/20 cursor-pointer active:scale-[0.98]"
                        >
                           <span>Sisa dari shift sebelumnya (klik untuk isi):</span>
                           <span className="font-bold">Rp {formatIDR(lastShiftRemaining)}</span>
                        </button>
                     )}
                  </div>

                  <button
                     type="submit"
                     className={`w-full p-4 ${colors.goldBg} text-[#18181B] rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform active:scale-[0.98] flex justify-center items-center gap-2`}
                  >
                     <LogIn size={20} />
                     Buka Shift & Mulai Jualan
                  </button>
               </form>
            </div>
         </div>
      </div>
   );
}
