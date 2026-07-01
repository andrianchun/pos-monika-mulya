import React from 'react';
import { AlertCircle } from 'lucide-react';
import { playSound } from '../../utils/helpers';

export default function DeleteConfirmModal({ onConfirm, onCancel, colors, isSoundOn, title = "Yakin Hapus Data?", desc = "Tindakan ini tidak dapat dibatalkan.", btnText = "Hapus Data" }) {
  return (
     <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
        <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} text-center`}>
           <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
           <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>{title}</h3>
           <p className={`text-sm mb-6 whitespace-pre-wrap ${colors.textMuted}`}>{desc}</p>
           <div className="flex gap-3">
             <button onClick={() => { playSound('pop', isSoundOn); onCancel(); }} className={`flex-1 py-2 rounded-xl border font-semibold ${colors.text} ${colors.border}`}>Batal</button>
             <button onClick={() => { playSound('pop', isSoundOn); onConfirm(); }} className="flex-1 py-2 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600">{btnText}</button>
           </div>
        </div>
     </div>
  )
}