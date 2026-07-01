import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, X, Filter, Check } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';

export default function DataTable({ columns, data, onDelete, canDelete, colors, title, actions = [], onAdd, defaultSort = { key: null, direction: 'asc' }, posLayout = false, headerRight, noSortKey, searchPlaceholder = 'Cari nama atau Barcode...' }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState(defaultSort);
  const [filters, setFilters] = useState({});
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;
  const wheelTimeout = useRef(null);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let temp = [...data];
    
    // Apply column filters first
    Object.keys(filters).forEach(k => {
       const activeOptions = filters[k];
       if (activeOptions && activeOptions.length > 0) {
          temp = temp.filter(row => activeOptions.includes(row[k]));
       }
    });

    return temp.sort((a, b) => {
      if (!sortConfig.key) return 0;
      const valA = Number(a[sortConfig.key]) || (typeof a[sortConfig.key] === 'string' ? a[sortConfig.key] : 0);
        const valB = Number(b[sortConfig.key]) || (typeof b[sortConfig.key] === 'string' ? b[sortConfig.key] : 0);
        
        if (typeof valA === 'string' && typeof valB === 'string') {
           return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        return sortConfig.direction === 'asc' ? (valA - valB) : (valB - valA);
    });
  }, [data, sortConfig, filters]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return sortedData;
    const lowerSearch = debouncedSearch.toLowerCase();
    const searchWords = lowerSearch.split(' ').filter(w => w.trim() !== '');

    return sortedData.filter(item => {
       const rowText = Object.values(item).map(val => String(val).toLowerCase()).join(' ');
       return searchWords.every(word => rowText.includes(word));
    });
  }, [sortedData, debouncedSearch]);

  const toggleFilter = (colKey, option) => {
    setFilters(prev => {
      const active = prev[colKey] || [];
      if (active.includes(option)) {
         return { ...prev, [colKey]: active.filter(o => o !== option) };
      } else {
         return { ...prev, [colKey]: [...active, option] };
      }
    });
  };

  const filterRef = useRef();
  useEffect(() => {
     const handleClickOutside = (e) => {
        if (filterRef.current && !filterRef.current.contains(e.target)) {
           setOpenFilterKey(null);
        }
     };
     document.addEventListener('mousedown', handleClickOutside);
     return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleTableWheel = (e) => {
      if (totalPages <= 1) return;
      if (wheelTimeout.current) return;
      
      const target = e.currentTarget;
      const isAtBottom = Math.ceil(target.scrollTop + target.clientHeight) >= target.scrollHeight - 5;
      const isAtTop = target.scrollTop <= 5;
      
      // Next page
      if (e.deltaY > 20 && isAtBottom) {
          if (page < totalPages) {
              setPage(prev => prev + 1);
              setTimeout(() => { target.scrollTop = 0; }, 50);
          }
          wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null; }, 400);
      } 
      // Prev page
      else if (e.deltaY < -20 && isAtTop) {
          if (page > 1) {
              setPage(prev => prev - 1);
              setTimeout(() => { target.scrollTop = target.scrollHeight; }, 50);
          }
          wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null; }, 400);
      }
  };
  
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
              className={`w-full pl-10 pr-10 py-3 sm:py-1.5 h-[44px] rounded-xl border ${colors.border} ${colors.creamBg} ${colors.text} focus:outline-none focus:ring-2 ${colors.goldRing}`} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18}/></button>}
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
              <input type="text" placeholder={searchPlaceholder} className={`w-full pl-9 pr-9 py-2 text-sm rounded-lg border ${colors.border} bg-transparent ${colors.text} focus:ring-1 focus:ring-[#D4AF37] outline-none`} value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"><X size={14}/></button>}
            </div>
            {onAdd && <button onClick={onAdd} className={`w-full sm:w-auto px-4 py-2 rounded-lg text-[#18181B] text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 ${colors.goldBg} hover:opacity-90`}><Plus size={16}/> {typeof onAdd === 'function' ? 'Tambah Data' : onAdd.label}</button>}
          </div>
        </div>
      )}
      <div className={`flex-1 overflow-hidden rounded-xl border ${colors.border} ${colors.panel} flex flex-col shadow-sm`}>
        <div className="flex-1 overflow-auto custom-scrollbar" onWheel={handleTableWheel}>
          <table className={`w-full text-sm text-left ${colors.text}`}>
            <thead className={`text-xs uppercase sticky top-0 bg-white dark:bg-[#1e1e1e] border-b ${colors.border} shadow-sm z-10`}>
              <tr>
                <th onClick={() => noSortKey && handleSort(noSortKey)} className={`px-2 sm:px-4 py-2 sm:py-2.5 text-center w-8 sm:w-12 ${noSortKey ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group' : ''}`}>
                   <div className="flex items-center justify-center gap-1">
                      No
                      {noSortKey && (
                         <span className={`text-[10px] ${sortConfig.key === noSortKey ? colors.gold : 'text-transparent group-hover:text-gray-400'}`}>
                            {sortConfig.key === noSortKey ? (sortConfig.direction === 'desc' ? '▼' : '▲') : ''}
                         </span>
                      )}
                   </div>
                </th>
                {columns.map(c => (
                  <th key={c.key} className="px-2 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap relative">
                     <div className="flex items-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group rounded p-1" onClick={() => c.filterOptions ? setOpenFilterKey(openFilterKey === c.key ? null : c.key) : handleSort(c.key)}>
                        {c.label}
                        {c.filterOptions ? (
                           <Filter size={12} className={filters[c.key]?.length > 0 ? colors.gold : 'text-gray-400 opacity-50 group-hover:opacity-100'} />
                        ) : (
                           <span className={`text-[10px] ${sortConfig.key === c.key ? colors.gold : 'text-transparent group-hover:text-gray-400'}`}>
                              {sortConfig.key === c.key ? (sortConfig.direction === 'desc' ? '▼' : '▲') : ''}
                           </span>
                        )}
                     </div>
                     {openFilterKey === c.key && c.filterOptions && (
                        <div ref={filterRef} className={`absolute top-full left-0 mt-1 w-48 rounded-xl shadow-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] z-50 overflow-hidden`}>
                           <div className={`p-2 border-b ${colors.border} flex justify-between items-center`}>
                              <span className={`text-xs font-bold ${colors.text}`}>Filter {c.label}</span>
                              <button onClick={() => { setFilters(prev => ({...prev, [c.key]: []})); setOpenFilterKey(null); }} className="text-[10px] text-red-500 hover:underline">Reset</button>
                           </div>
                           <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                              {c.filterOptions.map(opt => {
                                 const isChecked = (filters[c.key] || []).includes(opt);
                                 return (
                                    <div key={opt} onClick={() => toggleFilter(c.key, opt)} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 ${colors.text} text-xs`}>
                                       <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? `border-[#D4AF37] ${colors.goldBg} text-[#18181B]` : `${colors.border}`}`}>
                                          {isChecked && <Check size={12} />}
                                       </div>
                                       <span className="truncate">{opt}</span>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     )}
                  </th>
                ))}
                {(onDelete || actions.length > 0) && <th className="px-2 sm:px-4 py-2 sm:py-2.5 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="text-center py-10 italic text-gray-500">Data tidak ditemukan</td></tr>
              ) : (
                paginated.map((row, i) => (
                  <tr key={row.id} className={`border-b ${colors.border} hover:${colors.creamBg}`}>
                    <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-center">{(page - 1) * limit + i + 1}</td>
                    {columns.map(c => <td key={c.key} className="px-2 sm:px-4 py-1.5 sm:py-2">{c.render ? c.render(row) : row[c.key]}</td>)}
                    {(onDelete || actions.length > 0) && (
                      <td className="px-2 sm:px-4 py-1 sm:py-1.5 flex justify-center gap-1 sm:gap-2">
                        {actions.map((act, idx) => {
                           const isBtnDisabled = act.disabled ? act.disabled(row) : false;
                           return <button key={idx} disabled={isBtnDisabled} onClick={() => act.onClick(row)} className={`p-1.5 rounded ${act.colorClass} ${isBtnDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`} title={act.label}><act.icon size={16} /></button>
                        })}
                        {onDelete && (!canDelete || canDelete(row)) && <button onClick={() => onDelete(row)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:bg-red-200" title="Hapus"><Trash2 size={16}/></button>}
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