import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import DataTable from '../components/ui/DataTable';

export default function ActivityLogPage({ activityLogs, colors }) {
  const columns = [
    { key: 'timestamp', label: 'Waktu', render: (r) => new Date(r.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
    { key: 'user', label: 'Pengguna', render: (r) => <span className="font-bold">{r.user}</span> },
    { key: 'role', label: 'Role', filterOptions: ['admin', 'kasir'], render: (r) => <span className={`px-2 py-1 rounded text-xs font-bold ${r.role === 'admin' ? colors.goldBg + ' text-[#18181B]' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>{r.role?.toUpperCase()}</span> },
    { key: 'action', label: 'Tindakan', filterOptions: Array.from(new Set(activityLogs.map(l => l.action))).filter(Boolean).sort() },
    { key: 'details', label: 'Keterangan' }
  ];

  const sortedData = useMemo(() => {
    return [...activityLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [activityLogs]);

  return (
    <div className="h-full flex flex-col relative overflow-hidden -m-4 md:-m-6 bg-gray-50 dark:bg-[#121212]">
      <div className="flex-1 overflow-hidden p-2 sm:p-4">
        <DataTable 
          title={
            <div className="flex items-center gap-2">
              <Activity size={24} className={colors.gold} />
              <h2 className={`text-lg sm:text-xl font-bold ${colors.text}`}>Log Aktivitas Sistem</h2>
            </div>
          }
          columns={columns} 
          data={sortedData} 
          colors={colors} 
          searchPlaceholder="Cari pengguna, tindakan, atau keterangan..."
          posLayout={true}
        />
      </div>
    </div>
  );
}
