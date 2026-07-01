import React, { useState } from 'react';
import { Wallet, ArrowDown, ArrowUp, X } from 'lucide-react';
import { formatIDR, parseIDR } from '../../utils/helpers';

export default function KasEkstraModal({ colors, activeShift, setActiveShift, onClose, showToast, accounting, setAccounting, financialAccounts }) {
    const [amountStr, setAmountStr] = useState('');
    const [type, setType] = useState('in'); // 'in' or 'out'
    const [desc, setDesc] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const amount = parseIDR(amountStr);
        if (amount <= 0) {
            showToast('Nominal harus lebih dari 0', 'error');
            return;
        }

        if (activeShift) {
            const updatedShift = { ...activeShift };
            if (type === 'in') {
                updatedShift.cashIn = (updatedShift.cashIn || 0) + amount;
                updatedShift.expectedCash += amount;
            } else {
                updatedShift.cashOut = (updatedShift.cashOut || 0) + amount;
                updatedShift.expectedCash -= amount;
            }
            setActiveShift(updatedShift);

            // ✅ PERBAIKAN: Catat ke jurnal akuntansi agar tampil di Laporan
            if (setAccounting && accounting) {
                const tunaiAcc = (financialAccounts || []).find(a => a.type === 'tunai');
                const accId = tunaiAcc?.id || (financialAccounts || [])[0]?.id || null;
                const keterangan = desc.trim()
                    ? `Kas ${type === 'in' ? 'Masuk' : 'Keluar'} Shift – ${desc.trim()}`
                    : `Kas ${type === 'in' ? 'Masuk' : 'Keluar'} Shift (Manual)`;
                setAccounting([
                    ...accounting,
                    {
                        id: Date.now(),
                        type: 'kas',
                        accountId: accId,
                        name: keterangan,
                        amount: type === 'in' ? amount : -amount,
                        date: new Date().toISOString(),
                        isSystemGenerated: false
                    }
                ]);
            }

            showToast(`Kas ${type === 'in' ? 'Masuk' : 'Keluar'} berhasil dicatat`, 'success');
        } else {
            showToast('Tidak ada shift aktif', 'error');
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-white dark:bg-[#18181B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border ${colors.border} flex flex-col`}>
                <div className={`p-4 ${colors.panel} text-white flex justify-between items-center shrink-0`}>
                    <div className="flex items-center gap-2">
                        <Wallet size={20} />
                        <h3 className="font-bold text-lg">Kas Ekstra Laci</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`border rounded-xl p-3 cursor-pointer text-center flex flex-col gap-1 transition-all ${type === 'in' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-[#27272A] text-gray-500'}`}>
                                <input type="radio" className="hidden" checked={type === 'in'} onChange={() => setType('in')} />
                                <ArrowDown className="mx-auto" size={24} />
                                <span className="font-bold">Kas Masuk</span>
                                <span className="text-xs">Modal tambahan</span>
                            </label>
                            <label className={`border rounded-xl p-3 cursor-pointer text-center flex flex-col gap-1 transition-all ${type === 'out' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-gray-200 dark:border-[#27272A] text-gray-500'}`}>
                                <input type="radio" className="hidden" checked={type === 'out'} onChange={() => setType('out')} />
                                <ArrowUp className="mx-auto" size={24} />
                                <span className="font-bold">Kas Keluar</span>
                                <span className="text-xs">Pengeluaran laci</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nominal (Rp)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                                <input
                                    type="text"
                                    required
                                    className={`w-full pl-10 p-3 bg-gray-50 dark:bg-[#27272A] border border-gray-200 dark:border-[#3F3F46] rounded-xl focus:ring-2 ${colors.goldRing} focus:border-transparent outline-none transition-all dark:text-white font-bold text-xl`}
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(formatIDR(e.target.value))}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keterangan (Opsional)</label>
                            <input
                                type="text"
                                className={`w-full p-3 bg-gray-50 dark:bg-[#27272A] border border-gray-200 dark:border-[#3F3F46] rounded-xl focus:ring-2 ${colors.goldRing} outline-none dark:text-white`}
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                placeholder="Contoh: Beli es, modal tambahan..."
                            />
                        </div>

                        <button type="submit" className={`mt-6 w-full p-4 ${colors.button} rounded-xl font-bold shadow-lg hover:opacity-90 transition-all`}>
                            Simpan Kas {type === 'in' ? 'Masuk' : 'Keluar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
