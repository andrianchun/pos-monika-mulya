import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Trash2, PowerOff, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { auth, db } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function SuperAdminApp() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Cek apakah user adalah superadmin
        try {
          const userSnap = await getDocs(collection(db, "global_users"));
          let isAdmin = false;
          const tenantList = [];
          
          userSnap.forEach((d) => {
            const data = d.data();
            if (d.id === currentUser.uid && data.role === 'superadmin') {
              isAdmin = true;
            }
            // Kita anggap semua global_users dengan role 'admin' adalah pemilik toko (tenant)
            if (data.role === 'admin' && data.tenantId) {
              tenantList.push(data);
            }
          });
          
          if (isAdmin) {
            setIsSuperAdmin(true);
            setTenants(tenantList);
          } else {
            setError('Akses Ditolak: Anda bukan Super Admin.');
            // Logout jika bukan superadmin mencoba masuk
            await signOut(auth);
          }
        } catch (err) {
          setError('Gagal memuat data: ' + err.message);
        }
      } else {
        // Jika belum login, seharusnya diarahkan ke halaman login superadmin khusus
        // Untuk sekarang kita lempar ke Landing Page
        navigate('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

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
      // 1. Hapus profil owner dari global_users
      await deleteDoc(doc(db, "global_users", uid));
      
      // 2. Idealnya, panggil Cloud Function untuk menghapus SELURUH SUB-COLLECTION di tenants/{tenantId}
      // karena SDK web (Client) tidak bisa menghapus sub-koleksi secara rekursif.
      // (Fitur ini akan kita serahkan ke Cloud Function nanti).
      alert("Profil owner berhasil dihapus. (Catatan: Penghapusan isi data toko secara rekursif memerlukan eksekusi Cloud Function yang akan dipasang nanti).");
      
      setTenants(tenants.filter(t => t.id !== uid));
    } catch (err) {
      alert("Gagal menghapus toko: " + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>;

  if (error) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-red-500 p-6 text-center">
      <ShieldAlert className="w-16 h-16 mb-4" />
      <h1 className="text-2xl font-bold mb-2">AKSES DITOLAK</h1>
      <p>{error}</p>
      <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-full">Kembali</button>
    </div>
  );

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
              <p className="text-sm text-slate-500">Ruang Kendali Pusat Tokoto.id SaaS</p>
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
