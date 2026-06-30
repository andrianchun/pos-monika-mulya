import React from 'react';
import { X, PackageCheck, ShoppingBag, Clock, CheckCircle, Wallet, Plus } from 'lucide-react';
import { formatIDR } from '../../utils/helpers';

export default function ContactProfileModal({ contact, type, sales, purchases, onClose, onTopUpDeposit, colors }) {
  if (!contact) return null;

  // Calculate statistics
  let history = [];
  let totalBelanja = 0;
  let totalHutang = 0;

  if (type === 'customer') {
    history = sales.filter(s => s.customer === contact.name).sort((a, b) => new Date(b.date) - new Date(a.date));
    totalBelanja = history.reduce((sum, s) => sum + s.total, 0);
    totalHutang = history.reduce((sum, s) => sum + (s.status === 'Tempo' ? (s.total - s.paid) : 0), 0);
  } else {
    history = purchases.filter(p => p.supplier === contact.name).sort((a, b) => new Date(b.date) - new Date(a.date));
    totalBelanja = history.reduce((sum, p) => sum + p.total, 0);
    totalHutang = history.reduce((sum, p) => sum + (p.status === 'Tempo' ? (p.total - p.paid) : 0), 0);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl p-6 rounded-3xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div className="flex gap-4 items-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${colors.goldBg} text-[#18181B] shadow-lg`}>
               {contact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className={`text-2xl font-black ${colors.text}`}>{contact.name}</h2>
              <p className={`text-sm ${colors.textMuted}`}>{contact.phone || 'Tanpa Nomor HP'}</p>
              {contact.address && <p className={`text-xs ${colors.textMuted} mt-1`}>{contact.address}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-red-500 hover:scale-110 p-2"><X size={24}/></button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
             <div className={`text-xs font-bold mb-1 ${colors.textMuted}`}>Total Transaksi</div>
             <div className={`text-xl font-black ${colors.text}`}>Rp {formatIDR(totalBelanja)}</div>
             <div className={`text-xs mt-1 ${colors.textMuted}`}>{history.length} Nota</div>
          </div>
          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${totalHutang > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5'}`}>
             <div>
                <div className={`text-xs font-bold mb-1 ${totalHutang > 0 ? 'text-red-600 dark:text-red-400' : colors.textMuted}`}>{type === 'customer' ? 'Piutang Belum Lunas' : 'Utang Belum Lunas'}</div>
                <div className={`text-xl font-black ${totalHutang > 0 ? 'text-red-600 dark:text-red-400' : colors.text}`}>Rp {formatIDR(totalHutang)}</div>
             </div>
          </div>
          {type === 'customer' && (
             <>
                <div className={`p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex flex-col justify-between`}>
                   <div>
                      <div className="text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 flex items-center gap-1"><Wallet size={12}/> Saldo Deposit</div>
                      <div className="text-xl font-black text-blue-800 dark:text-blue-400">Rp {formatIDR(contact.deposit || 0)}</div>
                   </div>
                   <button onClick={() => {
                      const val = prompt('Masukkan nominal Top-Up Saldo untuk ' + contact.name + ':');
                      if (val) {
                         const num = parseInt(val.replace(/\D/g, ''), 10);
                         if (num > 0) onTopUpDeposit(contact, num);
                      }
                   }} className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-colors">
                      <Plus size={14}/> Top-Up
                   </button>
                </div>
                <div className={`p-4 rounded-2xl ${colors.goldBg} text-[#18181B] shadow-sm flex flex-col justify-between`}>
                   <div>
                      <div className="text-xs font-bold mb-1 opacity-80">Poin Loyalty</div>
                      <div className="text-xl font-black">{contact.points || 0} Pts</div>
                   </div>
                </div>
             </>
          )}
        </div>

        {/* History Table */}
        <div className="flex-1 overflow-hidden flex flex-col">
           <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${colors.text}`}><Clock size={16}/> Riwayat Transaksi</h3>
           <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-xl border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                 <thead className="bg-gray-100 dark:bg-[#27272A] sticky top-0">
                    <tr>
                       <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 rounded-tl-xl">Tanggal</th>
                       <th className="p-3 font-semibold text-gray-600 dark:text-gray-300">Nota</th>
                       <th className="p-3 font-semibold text-gray-600 dark:text-gray-300">Total</th>
                       <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 rounded-tr-xl">Status Bayar</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {history.map(h => (
                       <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-[#1e1e1e]/50">
                          <td className={`p-3 ${colors.textMuted}`}>{new Date(h.date).toLocaleDateString('id-ID')}</td>
                          <td className={`p-3 font-bold ${colors.text}`}>{h.nota}</td>
                          <td className={`p-3 font-semibold ${colors.text}`}>Rp {formatIDR(h.total)}</td>
                          <td className="p-3">
                             <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${h.status === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{h.status}</span>
                          </td>
                       </tr>
                    ))}
                    {history.length === 0 && (
                       <tr>
                          <td colSpan="4" className={`p-8 text-center ${colors.textMuted}`}>Belum ada transaksi</td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
