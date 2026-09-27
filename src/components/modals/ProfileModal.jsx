import React, { useState } from 'react';
import { X, LogOut, Mail, Lock, Camera, Check } from 'lucide-react';
import { playSound, handleImageUpload } from '../../utils/helpers';
import { auth, db, AUTH_EMAIL_DOMAIN } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, verifyBeforeUpdateEmail, updateProfile } from 'firebase/auth';

export default function ProfileModal({ user, setUser, users, setUsers, colors, isSoundOn, showToast, onClose, handleLogout }) {
  const [name, setName] = useState(user?.name || '');
  const isRealEmail = user?.email && !user?.email.endsWith('@' + AUTH_EMAIL_DOMAIN);
  const [newEmail, setNewEmail] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [isSaving, setIsSaving] = useState(false);

  const tenantId = window.location.pathname.split('/')[1] || 'monikamulya';

  const wantsEmailChange = Boolean(newEmail.trim() && newEmail.trim().toLowerCase() !== user?.email?.toLowerCase());
  const wantsPasswordChange = Boolean(newPass || confPass);
  const requiresOldPassword = wantsEmailChange || wantsPasswordChange;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedUser = { 
      ...user, 
      name: name.trim() || user.name, 
      avatar: avatar || null 
    };

    try {
      // Jika ingin ganti email atau password, verifikasi password lama terlebih dahulu
      if (requiresOldPassword) {
        if (!oldPass) {
          playSound('pop', isSoundOn);
          showToast('Masukkan password saat ini untuk konfirmasi perubahan!', 'error');
          setIsSaving(false);
          return;
        }

        if (wantsPasswordChange) {
          if (newPass !== confPass) {
            playSound('pop', isSoundOn);
            showToast('Konfirmasi password baru tidak cocok!', 'error');
            setIsSaving(false);
            return;
          }
          if (newPass.length < 6) {
            playSound('pop', isSoundOn);
            showToast('Password baru minimal 6 karakter!', 'error');
            setIsSaving(false);
            return;
          }
        }

        const cred = EmailAuthProvider.credential(auth.currentUser.email, oldPass);
        await reauthenticateWithCredential(auth.currentUser, cred);

        if (wantsPasswordChange) {
          await updatePassword(auth.currentUser, newPass);
        }
        if (wantsEmailChange) {
          await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim());
          showToast(`Link verifikasi telah dikirim ke ${newEmail.trim()}.`, 'info');
        }
      }

      // 1. Simpan langsung ke Firestore dokumen tenant user
      if (user?.id) {
        const userDocRef = doc(db, "tenants", tenantId, "users", String(user.id));
        await setDoc(userDocRef, {
          name: updatedUser.name,
          avatar: updatedUser.avatar
        }, { merge: true });

        // Jika owner/admin, cerminkan juga ke global_users
        if (user.role === 'admin' || user.isFirebaseAuth) {
          const globalDocRef = doc(db, "global_users", String(user.id));
          await setDoc(globalDocRef, {
            name: updatedUser.name,
            avatar: updatedUser.avatar,
            tenantId: tenantId
          }, { merge: true }).catch(() => {});
        }
      }

      // 2. Perbarui profil Firebase Auth currentUser
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: updatedUser.name
        }).catch(() => {});
      }

      // 3. Simpan ke local cache agar langsung persist tanpa delay
      try {
        localStorage.setItem(`mmpos_user_${tenantId}`, JSON.stringify(updatedUser));
        localStorage.setItem('mmpos_user', JSON.stringify(updatedUser));
      } catch (err) {}

      // 4. Update state aplikasi
      setUser(updatedUser);
      if (setUsers && users) {
        setUsers(users.map(u => String(u.id) === String(user.id) ? updatedUser : u));
      }

      playSound('success', isSoundOn);
      showToast('Profil berhasil disimpan!', 'success');
      onClose();
    } catch (err) {
      playSound('pop', isSoundOn);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        showToast('Password saat ini salah!', 'error');
      } else if (code === 'auth/network-request-failed') {
        showToast('Koneksi internet bermasalah.', 'error');
      } else if (code === 'auth/email-already-in-use') {
        showToast('Email sudah digunakan akun lain!', 'error');
      } else {
        showToast('Gagal menyimpan: ' + (err?.message || 'Error'), 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className={`w-full max-w-sm p-5 sm:p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] overflow-y-auto custom-scrollbar`}>
        <div className="flex justify-between items-center mb-5">
          <h2 className={`text-lg font-bold ${colors.text}`}>Pengaturan Akun</h2>
          <button 
            type="button" 
            onClick={() => { playSound('pop', isSoundOn); onClose(); }} 
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
          >
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* FOTO PROFIL */}
          <div className="flex flex-col items-center">
            <label 
              className={`relative w-20 h-20 rounded-full ${colors.goldBg} flex items-center justify-center text-[#18181B] text-2xl font-bold shadow-md cursor-pointer hover:opacity-90 overflow-hidden group border-2 border-white/20`}
              title="Klik untuk ubah foto"
            >
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                name.charAt(0).toUpperCase() || 'U'
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white transition-opacity">
                <Camera size={16} className="mb-0.5" />
                <span>Ganti</span>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={e => handleImageUpload(e, setAvatar, showToast, 400, 0.8)} 
              />
            </label>
          </div>

          {/* NAMA LENGKAP */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${colors.text}`}>Nama Lengkap</label>
            <input 
              type="text" 
              className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Nama pengguna..."
              required 
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${colors.text} flex items-center gap-1`}>
              <Mail size={13} className="text-[#D4AF37]" /> Email
            </label>
            <input 
              type="email" 
              className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} 
              placeholder={isRealEmail ? user.email : "nama@gmail.com"} 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
            />
          </div>

          {/* GANTI PASSWORD (OPSIONAL) */}
          <div className="pt-2 border-t border-gray-200/20">
            <label className={`block text-xs font-semibold mb-2 ${colors.text} flex items-center gap-1`}>
              <Lock size={13} className="text-[#D4AF37]" /> Ganti Password <span className="text-[10px] font-normal text-gray-400">(Opsional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="password" 
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} 
                placeholder="Sandi baru..." 
                value={newPass} 
                onChange={e => setNewPass(e.target.value)} 
              />
              <input 
                type="password" 
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} 
                placeholder="Ulangi sandi..." 
                value={confPass} 
                onChange={e => setConfPass(e.target.value)} 
              />
            </div>
          </div>

          {/* PASSWORD SAAT INI (HANYA MUNCUL JIKA GANTI EMAIL / PASSWORD) */}
          {requiresOldPassword && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1 animate-fadeIn">
              <label className="block text-xs font-semibold text-red-500 dark:text-red-400">
                Password Saat Ini (Konfirmasi Keamanan)
              </label>
              <input 
                type="password" 
                className={`w-full px-3 py-2 text-sm rounded-lg border border-red-500/30 focus:outline-none focus:ring-1 focus:ring-red-400 bg-transparent ${colors.text}`} 
                placeholder="Ketik password saat ini..." 
                value={oldPass} 
                onChange={e => setOldPass(e.target.value)} 
                required 
              />
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 pt-3">
            <button 
              type="button" 
              onClick={() => { playSound('pop', isSoundOn); onClose(); }} 
              className={`flex-1 py-2.5 text-xs border rounded-xl font-semibold ${colors.text} ${colors.border} hover:bg-white/5 transition-colors`}
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isSaving} 
              className={`flex-1 py-2.5 text-xs rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 ${isSaving ? 'opacity-60 cursor-wait' : ''}`}
            >
              {isSaving ? 'Menyimpan...' : <><Check size={14} /> Simpan</>}
            </button>
          </div>

          {/* LOGOUT */}
          <button 
            type="button" 
            onClick={() => { onClose(); if (handleLogout) handleLogout(); }} 
            className="w-full py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors flex items-center justify-center gap-1.5 pt-2"
          >
            <LogOut size={14} />
            Keluar dari Aplikasi
          </button>
        </form>
      </div>
    </div>
  );
}
