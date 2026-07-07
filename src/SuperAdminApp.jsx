import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Trash2, PowerOff, CheckCircle2, AlertCircle, LogOut, Key, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { auth, db } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function SuperAdminApp() {
  const navigate = useNavigate();
  
  // State Data
  const [tenants, setTenants] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // State UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        checkAdminAccess(user.uid);
      } else {
        // Jika tidak login, jangan lempar ke '/', biarkan mereka melihat Form Login Superadmin
        setLoading(false);
        setIsSuperAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const checkAdminAccess = async (uid) => {
    setLoading(true);
    try {
      const userSnap = await getDocs(collection(db, "global_users"));
      let isAdmin = false;
      let totalSuperAdmins = 0;
      const tenantList = [];
      
      userSnap.forEach((d) => {
        const data = d.data();
        if (data.role === 'superadmin') {
          totalSuperAdmins++;
          if (d.id === uid) isAdmin = true;
        }
        if (data.role === 'admin' && data.tenantId) {
          tenantList.push({ id: d.id, ...data });
        }
      });
      
      // AUTO-RECOVERY LOGIC
      // Jika ternyata bukan admin (karena UID beda), tapi emailnya SAMA dengan superadmin lama
      if (totalSuperAdmins > 0 && !isAdmin) {
         const currentUserEmail = auth.currentUser?.email;
         const oldSuperAdmins = [];
         
         userSnap.forEach((d) => {
            if (d.data().role === 'superadmin' && d.data().email === currentUserEmail) {
               oldSuperAdmins.push(d.id);
            }
         });
         
         if (oldSuperAdmins.length > 0) {
            // Hapus dokumen superadmin usang
            for (const oldUid of oldSuperAdmins) {
               await deleteDoc(doc(db, "global_users", oldUid));
            }
            // Jadikan UID baru ini sebagai superadmin
            await setDoc(doc(db, "global_users", uid), {
               id: uid,
               email: currentUserEmail,
               name: auth.currentUser?.displayName || "Super Admin",
               role: "superadmin",
               createdAt: new Date().toISOString()
            });
            isAdmin = true;
            totalSuperAdmins = 1;
            alert("Aura Raja terdeteksi! Akun Superadmin telah dipulihkan karena email cocok.");
         }
      }

      if (totalSuperAdmins === 0) {
        setIsFirstRun(true);
      } else if (isAdmin) {
        setIsFirstRun(false);
        setIsSuperAdmin(true);
        setTenants(tenantList);
        setError('');
      } else {
        setError('Akses Ditolak: Akun Anda bukan Super Admin.');
        // HAPUS AUTOLOGOUT AGAR TIDAK BINGUNG
        setIsSuperAdmin(false);
        setIsFirstRun(false);
      }
    } catch (err) {
      setError('Gagal memuat data: ' + err.message);
    }
    setLoading(false);
  };

  const handleClaimSuperAdmin = async () => {
    setLoading(true);
    try {
      if (!currentUser) return;
      await setDoc(doc(db, "global_users", currentUser.uid), {
        role: 'superadmin'
      }, { merge: true });
      // Reload akses
      await checkAdminAccess(currentUser.uid);
    } catch (err) {
      setError('Gagal mengklaim hak akses: ' + err.message);
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged akan tertrigger otomatis
    } catch (err) {
      setError('Gagal login: Email atau password salah.');
    }
    setIsLoggingIn(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Pastikan akun Google terdaftar di global_users jika belum
      const userDocRef = doc(db, "global_users", result.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        // Buat profil dasar jika ini email baru yang login via Google
        await setDoc(userDocRef, {
          id: result.user.uid,
          email: result.user.email,
          name: result.user.displayName || "Google User",
          role: "user", // Jika first run, role akan diupdate di layar Klaim Takhta
          createdAt: new Date().toISOString()
        });
      }
      
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Gagal login Google: Pastikan Sign-In Google sudah diaktifkan di Firebase Console.');
      }
    }
    setIsLoggingIn(false);
  };

  const toggleSuspend = async (uid, currentStatus) => {
    if (!window.confirm(`Yakin ingin ${currentStatus === 'suspended' ? 'MENGAKTIFKAN' : 'MEMATIKAN'} toko ini?`)) return;
    try {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      await updateDoc(doc(db, "global_users", uid), { status: newStatus });
      setTenants(tenants.map(t => t.id === uid ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert("Gagal mengupdate status: " + err.message);
    }
  };

  const handleDeleteTenant = async (uid, tenantId) => {
    if (!window.confirm(`PERINGATAN BAHAYA!\n\nAnda yakin ingin MENGHAPUS PERMANEN seluruh data toko "${tenantId}"? Data yang dihapus tidak bisa dikembalikan!`)) return;
    try {
      await deleteDoc(doc(db, "global_users", uid));
      alert("Profil owner berhasil dihapus. Data toko sudah tidak bisa diakses.");
      setTenants(tenants.filter(t => t.id !== uid));
    } catch (err) {
      alert("Gagal menghapus toko: " + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsSuperAdmin(false);
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>;

  // LAYAR KLAIM TAKHTA SUPER ADMIN (FIRST RUN SETUP)
  if (isFirstRun) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-1 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
          <div className="bg-slate-900 rounded-[22px] p-8 text-center">
            <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Key size={40} />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Klaim Takhta Super Admin</h1>
            <p className="text-slate-400 mb-8">
              Sistem mendeteksi belum ada Raja (Super Admin) yang berkuasa di database Tokoto.id ini.<br/><br/>
              Sebagai akun yang sedang login saat ini (<b>{currentUser?.email}</b>), Anda berhak mengklaim hak akses tertinggi ini secara permanen.
            </p>
            
            {error && <div className="text-red-400 mb-4">{error}</div>}

            <button 
              onClick={handleClaimSuperAdmin} 
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Key size={20} />
              {loading ? 'Menobatkan...' : 'Klaim Takhta Sekarang'}
            </button>
            <button onClick={handleLogout} className="mt-4 text-slate-500 hover:text-slate-300 text-sm">
              Batalkan dan Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LAYAR AKSES DITOLAK
  if (currentUser && !isSuperAdmin && !isFirstRun) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">AKSES DITOLAK</h1>
        <p className="text-slate-400 mb-6">{error || 'Akun ini tidak memiliki hak akses Super Admin.'}</p>
        <p className="text-sm text-slate-500 mb-8">Anda masuk sebagai: <b>{currentUser.email}</b></p>
        <button onClick={handleLogout} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-bold">
          Logout & Ganti Akun
        </button>
      </div>
    );
  }

  // LAYAR LOGIN KHUSUS SUPER ADMIN
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Login Super Admin</h1>
            <p className="text-slate-400 mt-2">Ruang Kendali Khusus CEO Tokoto.id</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 flex gap-2 items-start">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-4 py-3 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Email Admin"
                  required
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-12 py-3 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoggingIn} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-colors mt-2">
              {isLoggingIn ? 'Memeriksa Akses...' : 'Masuk Panel'}
            </button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <span className="relative bg-slate-900 px-4 text-xs text-slate-500 uppercase font-bold">ATAU</span>
          </div>

          <button onClick={handleGoogleLogin} disabled={isLoggingIn} className="w-full bg-white hover:bg-gray-100 text-slate-900 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
            Lanjutkan dengan Google
          </button>
        </div>
      </div>
    );
  }

  // LAYAR DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-2xl mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Super Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Pusat Kendali Tokoto.id SaaS</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl transition-colors font-medium">
            <LogOut size={18} /> Logout
          </button>
        </div>

        {/* Tabel Tenants */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Daftar Toko (Tenants)</h2>
            <div className="bg-slate-800 text-xs px-3 py-1 rounded-full font-medium">
              Total: {tenants.length} Toko
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 text-sm">
                  <th className="p-4 font-medium">URL Toko (Tenant ID)</th>
                  <th className="p-4 font-medium">Owner / Email</th>
                  <th className="p-4 font-medium">Status Langganan</th>
                  <th className="p-4 font-medium text-right">Aksi (Kill Switch)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{t.tenantId}</div>
                      <a href={`/${t.tenantId}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">Buka Toko ↗</a>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.email}</div>
                    </td>
                    <td className="p-4">
                      {t.status === 'suspended' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold">
                          <AlertCircle size={14} /> SUSPENDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                          <CheckCircle2 size={14} /> ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleSuspend(t.id, t.status)}
                          className={`p-2 rounded-lg transition-colors ${t.status === 'suspended' ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-500'}`}
                          title={t.status === 'suspended' ? 'Aktifkan Kembali' : 'Matikan Layanan'}
                        >
                          <PowerOff size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTenant(t.id, t.tenantId)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                          title="Hapus Permanen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500">
                      Belum ada toko yang mendaftar.
                    </td>
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
