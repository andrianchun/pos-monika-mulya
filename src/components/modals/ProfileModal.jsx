import React, { useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { playSound, handleImageUpload } from '../../utils/helpers';
import { auth } from '../../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function ProfileModal({ user, setUser, users, setUsers, colors, isSoundOn, showToast, onClose, handleLogout }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [avatar, setAvatar] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    let updatedUser = { ...user, name, avatar };

    if (newPass || confPass || oldPass) {
       if (newPass !== confPass) { playSound('pop', isSoundOn); showToast('Konfirmasi password tidak cocok!', 'error'); return; }
       if (newPass.length < 6) { playSound('pop', isSoundOn); showToast('Password baru minimal 6 karakter!', 'error'); return; }
       setIsSaving(true);
       try {
          // Verifikasi password lama & ganti password di Firebase Auth
          // (password tidak lagi disimpan di database)
          const cred = EmailAuthProvider.credential(auth.currentUser.email, oldPass);
          await reauthenticateWithCredential(auth.currentUser, cred);
          await updatePassword(auth.currentUser, newPass);
       } catch (err) {
          setIsSaving(false);
          playSound('pop', isSoundOn);
          const code = err?.code || '';
          if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') showToast('Password lama salah!', 'error');
          else if (code === 'auth/network-request-failed') showToast('Ganti password butuh koneksi internet.', 'error');
          else showToast('Gagal ganti password: ' + (err?.message || 'Error'), 'error');
          return;
       }
       setIsSaving(false);
    }
    playSound('success', isSoundOn);

    setUser(updatedUser);
    setUsers(users.map(u => u.id === user.id ? updatedUser : u));

    showToast('Profil diperbarui', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className={`w-full max-w-md p-4 sm:p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${colors.text}`}>Pengaturan Akun</h2>
          <button onClick={() => { playSound('pop', isSoundOn); onClose(); }} className="text-red-500 hover:scale-110"><X size={24}/></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col items-center mb-4">
            <label className={`relative w-24 h-24 rounded-full ${colors.goldBg} flex items-center justify-center text-[#18181B] text-3xl font-bold shadow-md cursor-pointer hover:opacity-90 overflow-hidden group`} title="Ubah Foto Profil">
               {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="Ava" /> : name.charAt(0).toUpperCase()}
               <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs text-white text-center p-2">Ubah Foto</div>
               <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setAvatar, showToast)} />
            </label>
            <p className="text-[10px] text-gray-500 mt-2">Maks 20MB. Otomatis dikompresi sistem.</p>
          </div>
          <div><label className={`block text-xs font-medium mb-1 ${colors.text}`}>Nama Lengkap</label><input type="text" className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={name} onChange={e => setName(e.target.value)} required /></div>
          <div><label className={`block text-xs font-medium mb-1 ${colors.text}`}>Email Login (tidak bisa diubah)</label><input type="email" className={`w-full p-2.5 rounded-xl border bg-transparent opacity-60 cursor-not-allowed ${colors.text} ${colors.border}`} value={email} disabled readOnly /></div>
          <div><label className={`block text-xs font-medium mb-1 ${colors.text}`}>Password Lama</label><input type="password" className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} placeholder="Kosongkan jika tak diubah" value={oldPass} onChange={e => setOldPass(e.target.value)} /></div>
          <div><label className={`block text-xs font-medium mb-1 ${colors.text}`}>Password Baru</label><input type="password" className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
          <div><label className={`block text-xs font-medium mb-1 ${colors.text}`}>Konfirmasi Password Baru</label><input type="password" className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={confPass} onChange={e => setConfPass(e.target.value)} /></div>
          <div className="flex gap-3 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700">
             <button type="button" onClick={() => { playSound('pop', isSoundOn); onClose(); }} className={`flex-1 py-2.5 border rounded-xl font-bold ${colors.text} ${colors.border}`}>Batal</button>
             <button type="submit" disabled={isSaving} className={`flex-1 py-2.5 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90 ${isSaving ? 'opacity-60 cursor-wait' : ''}`}>{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
          <button type="button" onClick={() => { onClose(); if (handleLogout) handleLogout(); }} className="w-full py-2.5 mt-2 rounded-xl font-bold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 transition-colors flex items-center justify-center gap-2">
             <LogOut size={18} />
             Keluar dari Aplikasi
          </button>
        </form>
      </div>
    </div>
  );
}
