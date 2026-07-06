import React, { useState } from 'react';
import { X, LogOut, Mail } from 'lucide-react';
import { playSound, handleImageUpload } from '../../utils/helpers';
import { auth, AUTH_EMAIL_DOMAIN } from '../../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, verifyBeforeUpdateEmail } from 'firebase/auth';

export default function ProfileModal({ user, setUser, users, setUsers, colors, isSoundOn, showToast, onClose, handleLogout }) {
  const [name, setName] = useState(user.name);
  const isRealEmail = user.email && !user.email.endsWith('@' + AUTH_EMAIL_DOMAIN);
  const [newEmail, setNewEmail] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [avatar, setAvatar] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    let updatedUser = { ...user, name, avatar };

    const wantsEmailChange = newEmail.trim() && newEmail.trim().toLowerCase() !== user.email;
    const wantsPasswordChange = newPass || confPass; // Hanya ganti pass kalau field baru diisi

    if (wantsEmailChange || wantsPasswordChange) {
       // Operasi sensitif di Firebase selalu butuh re-autentikasi pakai password lama
       if (!oldPass) { playSound('pop', isSoundOn); showToast('Masukkan Password Lama Anda untuk konfirmasi perubahan rahasia!', 'error'); return; }
       if (wantsPasswordChange) {
          if (newPass !== confPass) { playSound('pop', isSoundOn); showToast('Konfirmasi password tidak cocok!', 'error'); return; }
          if (newPass.length < 6) { playSound('pop', isSoundOn); showToast('Password baru minimal 6 karakter!', 'error'); return; }
       }
       setIsSaving(true);
       try {
          // Verifikasi identitas dulu sebelum operasi sensitif (ganti email/password)
          const cred = EmailAuthProvider.credential(auth.currentUser.email, oldPass);
          await reauthenticateWithCredential(auth.currentUser, cred);

          if (wantsPasswordChange) {
             await updatePassword(auth.currentUser, newPass);
          }
          if (wantsEmailChange) {
             // Email TIDAK langsung berubah — Firebase kirim link verifikasi ke
             // alamat baru dulu; baru aktif setelah link itu diklik.
             await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim());
             showToast(`Link verifikasi dikirim ke ${newEmail.trim()}. Klik link itu, lalu logout & login lagi.`, 'success');
          }
       } catch (err) {
          setIsSaving(false);
          playSound('pop', isSoundOn);
          const code = err?.code || '';
          if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') showToast('Password lama salah!', 'error');
          else if (code === 'auth/network-request-failed') showToast('Butuh koneksi internet.', 'error');
          else if (code === 'auth/email-already-in-use') showToast('Email itu sudah dipakai akun lain!', 'error');
          else if (code === 'auth/invalid-email') showToast('Format email tidak valid!', 'error');
          else showToast('Gagal menyimpan: ' + (err?.message || 'Error'), 'error');
          return;
       }
       setIsSaving(false);
    }
    playSound('success', isSoundOn);

    setUser(updatedUser);
    setUsers(users.map(u => u.id === user.id ? updatedUser : u));

    if (!wantsEmailChange) showToast('Profil diperbarui', 'success');
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

          {/* KOTAK EMAIL RECOVERY */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
             <label className={`block text-xs font-bold ${colors.text} flex items-center gap-1`}><Mail size={12}/> Email Pemulihan (Untuk fitur Lupa Password)</label>
             <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">Jika disetel, Anda bisa mereset sandi mandiri dari layar Login saat lupa sandi.</p>
             <input type="email" className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-400 bg-transparent ${colors.text} ${colors.border}`} placeholder={isRealEmail ? user.email : "cth: nama@gmail.com"} value={newEmail} onChange={e => setNewEmail(e.target.value)} />
             {newEmail.trim() && <p className="text-[10px] text-orange-500 font-medium">⚠️ Firebase akan mengirim link ke email ini. Email baru terganti SETELAH Anda klik link tersebut di kotak masuk Anda.</p>}
          </div>

          {/* KOTAK GANTI PASSWORD */}
          <div className="p-3 bg-stone-500/10 border border-stone-500/20 rounded-xl space-y-3">
             <label className={`block text-xs font-bold ${colors.text} flex items-center gap-1`}><X size={12} className="opacity-0"/> Ganti Password (Langsung berubah, tanpa verifikasi email)</label>
             <div className="flex gap-2">
                <div className="flex-1">
                   <label className={`block text-[10px] font-medium mb-1 ${colors.text}`}>Password Baru (Opsional)</label>
                   <input type="password" className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-stone-400 bg-transparent ${colors.text} ${colors.border}`} placeholder="Sandi baru..." value={newPass} onChange={e => setNewPass(e.target.value)} />
                </div>
                <div className="flex-1">
                   <label className={`block text-[10px] font-medium mb-1 ${colors.text}`}>Konfirmasi Sandi Baru</label>
                   <input type="password" className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-stone-400 bg-transparent ${colors.text} ${colors.border}`} placeholder="Ulangi..." value={confPass} onChange={e => setConfPass(e.target.value)} />
                </div>
             </div>
          </div>

          {/* PASSWORD LAMA WAJIB */}
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
             <label className={`block text-xs font-bold mb-1 text-red-600 dark:text-red-400`}>Password Lama (Wajib diisi jika ganti email/password)</label>
             <input type="password" className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-red-400 bg-transparent ${colors.text} ${colors.border}`} placeholder="Ketik sandi saat ini untuk konfirmasi..." value={oldPass} onChange={e => setOldPass(e.target.value)} />
          </div>

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
