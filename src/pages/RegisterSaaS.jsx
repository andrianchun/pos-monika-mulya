import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Mail, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterSaaS() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const generateTenantId = (name) => {
    // Ubah "Kopi Senja 99" menjadi "kopi-senja-99"
    let slug = name.toString().toLowerCase()
      .replace(/\s+/g, '-')           
      .replace(/[^\w\-]+/g, '')       
      .replace(/\-\-+/g, '-')         
      .replace(/^-+/, '')             
      .replace(/-+$/, '');
    
    // Tambahkan 4 karakter acak agar unik
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${slug}-${randomSuffix}`;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.storeName || !formData.ownerName || !formData.email || !formData.password) {
      setError('Semua kolom wajib diisi!');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      // 1. Buat Akun Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // 2. Generate ID Toko Unik
      const tenantId = generateTenantId(formData.storeName);
      
      // 3. Simpan Profil ke Global Users Root (Supaya bisa deteksi tenant saat login nantinya)
      await setDoc(doc(db, "global_users", user.uid), {
        id: user.uid,
        email: formData.email,
        name: formData.ownerName,
        tenantId: tenantId,
        role: 'admin',
        permissions: ['all'],
        createdAt: new Date().toISOString()
      });
      
      // 4. Siapkan Data Awal Toko (Nama Toko) di kamar Tenant tersebut
      await setDoc(doc(db, "tenants", tenantId, "settings", "storeInfo"), {
        name: formData.storeName,
        address: '',
        phone: '',
        createdAt: new Date().toISOString()
      });
      
      setSuccess(true);
      
      // 5. Redirect ke dashboard toko barunya setelah 2 detik
      setTimeout(() => {
        navigate(`/${tenantId}`);
      }, 2000);

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email ini sudah terdaftar. Silakan gunakan email lain atau Login.');
      } else {
        setError('Gagal mendaftar: ' + err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>
      
      <div className="w-full max-w-5xl flex flex-col md:flex-row bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl overflow-hidden z-10">
        
        {/* Left Side (Banner) */}
        <div className="md:w-5/12 bg-gradient-to-br from-orange-500 to-orange-700 p-10 flex flex-col justify-between text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[50px]"></div>
           
           <div>
             <Link to="/" className="inline-flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity">
               <Store className="w-8 h-8" />
               <span className="text-2xl font-black tracking-tight">tokoto.id</span>
             </Link>
             
             <h2 className="text-4xl font-extrabold leading-tight mb-4">
               Mulai Perjalanan<br />Bisnis Hebatmu.
             </h2>
             <p className="text-orange-100 text-lg">
               Satu akun untuk mengelola ribuan transaksi dengan mudah dan aman.
             </p>
           </div>
           
           <div className="mt-12 space-y-4">
             <div className="flex items-center gap-3">
               <CheckCircle2 className="w-6 h-6 text-orange-200" />
               <span className="font-medium">Dashboard Real-time</span>
             </div>
             <div className="flex items-center gap-3">
               <CheckCircle2 className="w-6 h-6 text-orange-200" />
               <span className="font-medium">Manajemen Cabang</span>
             </div>
             <div className="flex items-center gap-3">
               <CheckCircle2 className="w-6 h-6 text-orange-200" />
               <span className="font-medium">Laporan Akuntansi</span>
             </div>
           </div>
        </div>

        {/* Right Side (Form) */}
        <div className="md:w-7/12 p-10 md:p-12">
           <h3 className="text-2xl font-bold mb-2">Buka Toko Baru</h3>
           <p className="text-slate-400 mb-8">Lengkapi form di bawah untuk membuat sistem kasir gratis Anda.</p>
           
           {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-start gap-3 mb-6">
                 <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                 <p className="text-sm">{error}</p>
              </div>
           )}

           {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-4 rounded-xl flex items-center gap-3 mb-6">
                 <CheckCircle2 className="w-5 h-5 shrink-0" />
                 <p className="text-sm font-medium">Sukses! Toko berhasil dibuat. Mengalihkan ke dashboard...</p>
              </div>
           )}

           <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Nama Toko / Cabang</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-slate-600"
                    placeholder="Misal: Kopi Senja Jakarta"
                    required
                    disabled={loading || success}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Nama Lengkap Pemilik (Owner)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-slate-600"
                    placeholder="Misal: Budi Santoso"
                    required
                    disabled={loading || success}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Alamat Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-slate-600"
                    placeholder="nama@email.com"
                    required
                    disabled={loading || success}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-slate-600"
                    placeholder="Minimal 6 karakter"
                    required
                    disabled={loading || success}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {loading ? 'Membuat Sistem...' : 'Daftar Sekarang'}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
           </form>

           <div className="mt-8 text-center text-sm text-slate-400">
             Sudah punya toko? (Sebagai Admin/Kasir)<br/>
             <span className="text-slate-300">
               Silakan minta alamat URL toko dari Owner Anda (misal: <i>tokoto-id.web.app/nama-toko</i>) untuk Login.
             </span>
           </div>
        </div>
      </div>
    </div>
  );
}
