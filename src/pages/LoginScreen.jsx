import React, { useState } from 'react';
import { ShoppingCart, AlertCircle, User, Lock, Moon, Sun, ShieldAlert, Mail, CheckCircle2 } from 'lucide-react';
import { playSound } from '../utils/helpers';
import { auth, usernameToEmail, resolveLoginEmailFn, AUTH_EMAIL_DOMAIN } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

export default function LoginScreen({ onLogin, users, colors, theme, setTheme, isSoundOn, showToast, storeInfo }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotState, setForgotState] = useState('idle'); // idle | sending | sent | no-real-email | not-found
  const [forgotEmailSentTo, setForgotEmailSentTo] = useState('');

  const resolveEmailForUsername = async (uname) => {
    try {
      const res = await resolveLoginEmailFn({ username: uname });
      return res.data.email;
    } catch (e) {
      // Cloud Function belum terjangkau (offline dsb) — jatuh ke tebakan
      // email sintetis lama, cukup untuk akun yang belum pernah ganti email.
      return usernameToEmail(uname);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      const email = await resolveEmailForUsername(username);
      // "Ingat Saya" → sesi bertahan setelah browser ditutup; jika tidak,
      // sesi hanya berlaku selama tab terbuka.
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      playSound('success', isSoundOn);
      localStorage.setItem('mmpos_last_active', Date.now().toString());
      if (onLogin) onLogin(); // profil dimuat oleh App dari koleksi users berdasarkan UID
    } catch (err) {
      playSound('pop', isSoundOn);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Username atau password salah');
      } else if (code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan gagal. Tunggu beberapa menit lalu coba lagi.');
      } else if (code === 'auth/network-request-failed') {
        setError('Tidak ada koneksi internet. Login butuh koneksi.');
      } else {
        setError('Gagal login: ' + (err?.message || 'Error tidak dikenal'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const openForgotModal = () => {
    playSound('pop', isSoundOn);
    setForgotUsername(username);
    setForgotState('idle');
    setShowForgotModal(true);
  };

  const submitForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotUsername.trim()) return;
    setForgotState('sending');
    try {
      const res = await resolveLoginEmailFn({ username: forgotUsername.trim() });
      const email = res.data.email;
      if (email.endsWith('@' + AUTH_EMAIL_DOMAIN)) {
        // Belum pernah ganti ke email asli — kirim ke sini percuma, tidak ada yang menerima.
        setForgotState('no-real-email');
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setForgotEmailSentTo(email);
      setForgotState('sent');
    } catch (err) {
      setForgotState('not-found');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${colors.bg} relative overflow-hidden transition-colors duration-500`}>
      <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 ${theme === 'dark' ? 'bg-amber-900' : 'bg-amber-200'}`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-200'}`}></div>

      <button onClick={() => { playSound('pop', isSoundOn); setTheme(theme === 'light' ? 'dark' : 'light'); }} className="absolute top-4 right-4 p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 z-50">
        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} className="text-yellow-400" />}
      </button>

      <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl z-10 ${colors.panel} border ${colors.border}`}>
        <div className="text-center mb-8">
          {storeInfo.logo ? (
            <img src={storeInfo.logo} className="w-24 h-24 mx-auto object-contain mb-4 drop-shadow-md" alt="logo"/>
          ) : (
            <div className={`w-20 h-20 mx-auto rounded-2xl ${colors.goldBg} flex items-center justify-center shadow-lg mb-4 overflow-hidden`}>
              <ShoppingCart size={40} className="text-white" />
            </div>
          )}
          <h1 className={`text-3xl font-extrabold ${colors.gold}`}>{storeInfo.name}</h1>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-600 text-sm font-semibold flex items-center gap-2"><AlertCircle size={18} /> {error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${colors.text}`}>Username</label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textMuted}`} size={20} />
              <input type="text" className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${colors.text}`}>Password</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textMuted}`} size={20} />
              <input type="password" className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm py-2">
            <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="rounded text-[#D4AF37] focus:ring-[#D4AF37]" />
               <span className={colors.textMuted}>Ingat Saya</span>
            </label>
            <button type="button" onClick={openForgotModal} className={`${colors.gold} hover:underline`}>Lupa Password?</button>
          </div>
          <button type="submit" disabled={isLoggingIn} className={`w-full py-3 rounded-xl font-bold text-[#18181B] transition-transform active:scale-95 ${colors.goldBg} hover:opacity-90 shadow-md ${isLoggingIn ? 'opacity-60 cursor-wait' : ''}`}>{isLoggingIn ? 'Memeriksa...' : 'Masuk'}</button>
        </form>
      </div>

      {showForgotModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border}`}>
             <div className="flex items-center gap-2 mb-4">
               <ShieldAlert className="text-orange-500" size={28} />
               <h3 className={`text-xl font-bold ${colors.text}`}>Lupa Password?</h3>
             </div>

             {forgotState === 'sent' ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl mb-4 text-center">
                   <CheckCircle2 className="text-green-600 mx-auto mb-2" size={32} />
                   <p className="text-sm text-green-800 dark:text-green-300 font-semibold">Link reset password sudah dikirim ke:</p>
                   <p className="text-sm text-green-700 dark:text-green-400 font-mono mt-1">{forgotEmailSentTo}</p>
                   <p className="text-xs text-green-700 dark:text-green-400 mt-2">Buka email itu &amp; klik link di dalamnya untuk membuat password baru.</p>
                </div>
             ) : (
                <form onSubmit={submitForgotPassword} className="mb-4">
                   <label className={`block text-xs font-medium mb-1 ${colors.text}`}>Username Anda</label>
                   <div className="relative mb-3">
                      <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textMuted}`} size={18} />
                      <input type="text" required className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={forgotUsername} onChange={e => setForgotUsername(e.target.value)} />
                   </div>

                   {forgotState === 'no-real-email' && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl mb-3 text-xs text-orange-800 dark:text-orange-300">
                         Akun ini belum pernah menyetel email asli, jadi reset via email tidak bisa dikirim ke mana pun. Minta Admin untuk reset lewat menu Pengaturan → Hak Akses User.
                      </div>
                   )}
                   {forgotState === 'not-found' && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-3 text-xs text-red-800 dark:text-red-300">
                         Username tidak ditemukan. Periksa lagi ejaannya.
                      </div>
                   )}

                   <button type="submit" disabled={forgotState === 'sending'} className={`w-full py-2.5 rounded-xl font-bold text-white shadow-md bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 ${forgotState === 'sending' ? 'opacity-60 cursor-wait' : ''}`}>
                      <Mail size={16}/> {forgotState === 'sending' ? 'Mengirim...' : 'Kirim Link Reset ke Email'}
                   </button>
                </form>
             )}

             <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl mb-4">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-semibold mb-2">Cara Lain:</p>
                <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-2 list-disc pl-4">
                  <li>Belum pernah setel email asli? Minta Admin reset lewat menu Pengaturan → Hak Akses User.</li>
                  <li>Ingin bisa reset sendiri lewat email lain kali? Setelah login, buka menu profil dan setel Email Asli Anda.</li>
                </ul>
             </div>
             <button type="button" onClick={() => { playSound('pop', isSoundOn); setShowForgotModal(false); }} className={`w-full py-2.5 rounded-xl font-bold ${colors.text} border ${colors.border} hover:bg-black/5 dark:hover:bg-white/5`}>Tutup</button>
           </div>
         </div>
      )}
    </div>
  );
}
