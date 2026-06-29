import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { playSound } from '../../utils/helpers';

export default function PasswordConfirmModal({ onConfirm, onCancel, colors, isSoundOn, title = "Verifikasi Keamanan" }) {
  const [pwd, setPwd] = useState('');
  
  return (
     <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
        <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} text-center`}>
           <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
           <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>{title}</h3>
           <p className={`text-sm mb-4 ${colors.textMuted}`}>Tindakan ini sangat berisiko. Masukkan password admin (akun Anda) untuk melanjutkan.</p>
           <input type="password" autoFocus className={`w-full p-3 mb-6 rounded-xl border text-center font-bold ${colors.border} bg-transparent ${colors.text} focus:ring-2 focus:ring-[#D4AF37] outline-none`} placeholder="Password Anda" value={pwd} onChange={e => setPwd(e.target.value)} />
           <div className="flex gap-3">
             <button onClick={() => { playSound('pop', isSoundOn); onCancel(); }} className={`flex-1 py-2 rounded-xl border font-semibold ${colors.text} ${colors.border}`}>Batal</button>
             <button onClick={() => { playSound('pop', isSoundOn); onConfirm(pwd); }} className="flex-1 py-2 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md">Lanjutkan</button>
           </div>
        </div>
     </div>
  )
}