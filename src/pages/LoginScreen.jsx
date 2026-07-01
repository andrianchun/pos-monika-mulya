import React, { useState } from 'react';
import { ShoppingCart, AlertCircle, User, Lock, Moon, Sun, ShieldAlert } from 'lucide-react';
import { playSound } from '../utils/helpers';

export default function LoginScreen({ onLogin, users, colors, theme, setTheme, isSoundOn, showToast, storeInfo }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
  
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    const matchedUser = users.find(u => u.username === username);
    if (!matchedUser) { playSound('pop', isSoundOn); setError('Username tidak ditemukan'); return; }
    if (matchedUser.password !== password) { playSound('pop', isSoundOn); setError('Password Anda Salah'); return; }

    playSound('success', isSoundOn); 
    if(remember) {
        localStorage.setItem('mmpos_user', JSON.stringify(matchedUser));
        localStorage.setItem('mmpos_last_active', Date.now().toString());
    }
    onLogin(matchedUser);
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
            <button type="button" onClick={() => { playSound('pop', isSoundOn); setShowForgotModal(true); }} className={`${colors.gold} hover:underline`}>Lupa Password?</button>
          </div>
          <button type="submit" className={`w-full py-3 rounded-xl font-bold text-[#18181B] transition-transform active:scale-95 ${colors.goldBg} hover:opacity-90 shadow-md`}>Masuk</button>
        </form>
      </div>

      {showForgotModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border}`}>
             <div className="flex items-center gap-2 mb-4">
               <ShieldAlert className="text-orange-500" size={28} />
               <h3 className={`text-xl font-bold ${colors.text}`}>Lupa Password?</h3>
             </div>
             
             <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl mb-6">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-semibold mb-2">Panduan Reset Tanpa Server Berbayar:</p>
                <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-2 list-disc pl-4">
                  <li><strong>Jika Kasir Lupa:</strong> Hubungi Admin (Pemilik) untuk mengubah password dari menu Pengaturan Akun.</li>
                  <li><strong>Jika Admin Lupa:</strong> Login ke <em>Firebase Console</em> &rarr; <em>Firestore Database</em> &rarr; Buka koleksi <code>users</code>. Anda bisa melihat & mengubah password secara langsung di sana!</li>
                </ul>
             </div>
             <button type="button" onClick={() => { playSound('pop', isSoundOn); setShowForgotModal(false); }} className={`w-full py-2.5 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90`}>Saya Mengerti</button>
           </div>
         </div>
      )}
    </div>
  );
}