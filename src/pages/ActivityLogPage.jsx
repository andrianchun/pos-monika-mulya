import React, { useState, useMemo } from 'react';
import { Activity, Clock } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import { formatIDR } from '../utils/helpers';

export default function ActivityLogPage({ activityLogs, shiftHistory = [], colors }) {
  const [activeTab, setActiveTab] = useState('aktivitas');

  const columns = [
    { key: 'timestamp', label: 'Waktu', render: (r) => new Date(r.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
    { key: 'user', label: 'Pengguna', render: (r) => <span className="font-bold">{r.user}</span> },
    { key: 'role', label: 'Role', filterOptions: ['admin', 'kasir'], render: (r) => <span className={`px-2 py-1 rounded text-xs font-bold ${r.role === 'admin' ? colors.goldBg + ' text-[#18181B]' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>{r.role === 'admin' ? 'ADMIN' : 'STAFF'}</span> },
    { key: 'action', label: 'Tindakan', filterOptions: Array.from(new Set(activityLogs.map(l => l.action))).filter(Boolean).sort() },
    { key: 'details', label: 'Keterangan' }
  ];

  const shiftColumns = [
      { key: 'endTime', label: 'Waktu Shift', sortable: true, render: (s) => (
          <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-mono">B: {new Date(s.startTime).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="font-semibold text-xs font-mono">T: {new Date(s.endTime).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
      )},
      { key: 'cashierName', label: 'Kasir', sortable: true, render: (s) => {
          let name = s.cashierName || 'Kasir';
          if (name.includes('@')) name = name.split('@')[0];
          return <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md ${colors.goldBg}/20 flex items-center justify-center text-gold font-bold text-xs shadow-inner`}>
                  {name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold">{name}</span>
          </div>;
      }},
      { key: 'salesCash', label: 'Omset Tunai', render: (s) => `Rp ${formatIDR(s.salesCash)}` },
      { key: 'salesNonTunai', label: 'Omset Non-Tunai', render: (s) => `Rp ${formatIDR(s.salesNonTunai || 0)}` },
      { key: 'extraCash', label: 'Kas Ekstra', render: (s) => `Rp ${formatIDR((s.cashIn || 0) - (s.cashOut || 0))}` },
      { key: 'actualCash', label: 'Fisik Laci', render: (s) => `Rp ${formatIDR(s.actualCash)}` },
      { key: 'dropCash', label: 'Disetor', render: (s) => <span className="font-bold text-blue-600 dark:text-blue-400">Rp {formatIDR(s.dropCash || 0)}</span> },
      { key: 'selisih', label: 'Selisih', render: (s) => (
          <span className={`font-bold px-2.5 py-1 rounded-md text-xs shadow-sm ${s.selisih === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : s.selisih < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
              {s.selisih === 0 ? 'PAS' : s.selisih < 0 ? `-Rp ${formatIDR(Math.abs(s.selisih))}` : `+Rp ${formatIDR(s.selisih)}`}
          </span>
      )}
  ];

  const sortedData = useMemo(() => {
    return [...activityLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [activityLogs]);

  return (
    <div className="h-full flex flex-col relative overflow-hidden -m-4 md:-m-6 bg-gray-50 dark:bg-[#121212]">
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#18181B] px-4 pt-4 shadow-sm z-10 gap-2 shrink-0">
          <button onClick={() => setActiveTab('aktivitas')} className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'aktivitas' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <Activity size={18}/> CCTV Aktivitas
          </button>
          <button onClick={() => setActiveTab('shift')} className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'shift' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <Clock size={18}/> Riwayat Shift
          </button>
      </div>
      <div className="flex-1 overflow-hidden p-2 sm:p-4">
        {activeTab === 'aktivitas' ? (
          <DataTable 
            title={null}
            columns={columns} 
            data={sortedData} 
            colors={colors} 
            searchPlaceholder="Cari pengguna, tindakan, atau keterangan..."
            posLayout={true}
          />
        ) : (
          <DataTable 
            title={null}
            columns={shiftColumns} 
            data={shiftHistory} 
            defaultSort={{key: 'endTime', direction: 'desc'}} 
            colors={colors} 
            searchPlaceholder="Cari riwayat shift..."
            posLayout={true}
          />
        )}
      </div>
    </div>
  );
}
