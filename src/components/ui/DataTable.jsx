import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';

export default function DataTable({ columns, data, onDelete, colors, title, actions = [], onAdd, defaultSort = { key: null, direction: 'asc' }, posLayout = false, headerRight }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState(defaultSort);
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return sortedData;
    const lowerSearch = debouncedSearch.toLowerCase();
    return sortedData.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(lowerSearch)));
  }, [sortedData, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);
  
  return (
    <div className={`flex flex-col h-full bg-transparent ${posLayout ? 'p-0' : ''}`}>
      {posLayout ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 shrink-0">
          {title && (
            <div className="shrink-0">
              {typeof title === 'string' ? <h2 className={`text-lg sm:text-xl font-bold ${colors.text}`}>{title}</h2> : title}
            </div>
          )}
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textMuted}`} size={20} />
            <input 
              type="text" 
              placeholder="Cari nama atau Barcode..." 
              className={`w-full pl-10 pr-4 py-3 sm:py-1.5 h-[44px] rounded-xl border ${colors.border} ${colors.creamBg} ${colors.text} focus:outline-none focus:ring-2 ${colors.goldRing}`} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          {headerRight && (
            <div className="shrink-0 flex items-center gap-2">
              {headerRight}
            </div>
          )}
          {onAdd && (
            <button onClick={onAdd} className={`w-[110px] sm:w-[130px] h-[44px] text-sm font-bold rounded-lg transition-all flex items-center justify-center ${colors.goldBg} text-[#18181B] shadow hover:opacity-90 shrink-0`}><Plus size={16} className="mr-1"/> Tambah</button>
          )}
        </div>
      ) : (
        <div className={`flex flex-col md:flex-row justify-between items-center mb-4 gap-4 p-4 rounded-xl ${colors.panel} border ${colors.border}`}>
          {typeof title === 'string' ? (
            <h2 className={`text-lg sm:text-xl font-bold ${colors.text} shrink-0`}>{title}</h2>
          ) : (
            <div className="shrink-0">{title}</div>
          )}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textMuted}`} size={18} />
              <input type="text" placeholder="Cari / Filter..." className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border ${colors.border} bg-transparent ${colors.text} focus:ring-1 focus:ring-[#D4AF37] outline-none`} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {onAdd && <button onClick={onAdd} className={`w-full sm:w-auto px-4 py-2 rounded-lg text-[#18181B] text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 ${colors.goldBg} hover:opacity-90`}><Plus size={16}/> {typeof onAdd === 'function' ? 'Tambah Data' : onAdd.label}</button>}
          </div>
        </div>
      )}
      <div className={`flex-1 overflow-hidden rounded-xl border ${colors.border} ${colors.panel} flex flex-col shadow-sm`}>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className={`w-full text-sm text-left ${colors.text}`}>
            <thead className={`text-xs uppercase sticky top-0 ${colors.creamBg} border-b ${colors.border} shadow-sm z-10`}>
              <tr>
                <th className="px-2 sm:px-4 py-3 text-center w-8 sm:w-12">No</th>
                {columns.map(c => (
                  <th key={c.key} onClick={() => handleSort(c.key)} className="px-2 sm:px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                     <div className="flex items-center gap-1">
                        {c.label}
                        <span className={`text-[10px] ${sortConfig.key === c.key ? colors.gold : 'text-transparent group-hover:text-gray-400'}`}>
                           {sortConfig.key === c.key && sortConfig.direction === 'desc' ? '▼' : '▲'}
                        </span>
                     </div>
                  </th>
                ))}
                {(onDelete || actions.length > 0) && <th className="px-2 sm:px-4 py-3 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="text-center py-10 italic text-gray-500">Data tidak ditemukan</td></tr>
              ) : (
                paginated.map((row, i) => (
                  <tr key={row.id} className={`border-b ${colors.border} hover:${colors.creamBg}`}>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{(page - 1) * limit + i + 1}</td>
                    {columns.map(c => <td key={c.key} className="px-2 sm:px-4 py-2 sm:py-3">{c.render ? c.render(row) : row[c.key]}</td>)}
                    {(onDelete || actions.length > 0) && (
                      <td className="px-2 sm:px-4 py-2 sm:py-3 flex justify-center gap-1 sm:gap-2">
                        {actions.map((act, idx) => <button key={idx} onClick={() => act.onClick(row)} className={`p-1.5 rounded ${act.colorClass}`} title={act.label}><act.icon size={16} /></button>)}
                        {onDelete && <button onClick={() => onDelete(row)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:bg-red-200" title="Hapus"><Trash2 size={16}/></button>}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={`p-3 sm:p-4 border-t ${colors.border} flex justify-between items-center text-xs sm:text-sm shrink-0`}>
          <span className={colors.textMuted}>Halaman {page} dari {totalPages || 1}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={`p-2 rounded border ${colors.border} disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-[#27272A]`}><ChevronLeft size={16}/></button>
            <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)} className={`p-2 rounded border ${colors.border} disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-[#27272A]`}><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}