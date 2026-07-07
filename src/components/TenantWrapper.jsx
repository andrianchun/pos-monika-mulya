import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocsFromServer } from 'firebase/firestore';
import { Loader2, AlertTriangle } from 'lucide-react';
import PosApp from '../PosApp';

export default function TenantWrapper() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [tenantValid, setTenantValid] = useState('checking'); 
  const [tenantGlobalInfo, setTenantGlobalInfo] = useState(null);

  useEffect(() => {
    if (!tenantId) {
      setTenantValid('invalid');
      return;
    }
    const checkTenant = async () => {
      try {
        const q = query(collection(db, "global_users"), where("tenantId", "==", tenantId));
        const snap = await getDocsFromServer(q);
        if (snap.empty) {
          setTenantValid('invalid');
        } else {
          setTenantValid('valid');
          setTenantGlobalInfo(snap.docs[0].data());
        }
      } catch (e) {
        // Jika error jaringan atau permission (misal aturan diubah), asumsikan valid sementara
        setTenantValid('valid');
      }
    };
    checkTenant();
  }, [tenantId]);

  if (tenantValid === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <p className="text-slate-400 font-medium tracking-wide">Mencari Toko...</p>
      </div>
    );
  }

  if (tenantValid === 'invalid') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl mx-auto">
          <AlertTriangle className="w-10 h-10 text-orange-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Toko Tidak Ditemukan</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
          URL toko <b>{tenantId}</b> tidak terdaftar di sistem kami.
        </p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold rounded-xl transition-all">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  // Jika valid, teruskan ke PosApp beserta informasi global (supaya nama toko di Login Screen tidak ngawur)
  return <PosApp tenantGlobalInfo={tenantGlobalInfo} />;
}
