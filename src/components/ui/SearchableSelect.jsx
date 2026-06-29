import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SearchableSelect({ options, value, onChange, placeholder, colors }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => { 
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); 
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    (o.phone && o.phone.toLowerCase().includes(search.toLowerCase()))
  );
  const selected = options.find(o => o.id === value);

  return (
    <div className="relative w-full text-sm" ref={ref}>
      <div className={`p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} cursor-pointer flex justify-between items-center`} onClick={() => setIsOpen(!isOpen)}>
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <ChevronDown size={14}/>
      </div>
      {isOpen && (
        <div className={`absolute z-[100] w-full mt-1 border ${colors.border} rounded-lg shadow-lg bg-white dark:bg-[#1e1e1e] max-h-48 overflow-y-auto custom-scrollbar`}>
           <div className={`p-2 sticky top-0 ${colors.panel} border-b border-gray-200 dark:border-gray-700 z-10`}>
              <input type="text" autoFocus className={`w-full p-1.5 text-xs border rounded ${colors.creamBg} ${colors.text} outline-none focus:border-[#D4AF37]`} placeholder="Cari nama / no HP..." value={search} onChange={e => setSearch(e.target.value)} />
           </div>
           {filtered.map(o => (
              <div key={o.id} className={`p-2 text-xs cursor-pointer hover:opacity-70 ${value === o.id ? `${colors.creamBg} font-bold` : ''} ${colors.text}`} onClick={() => { onChange(o.id); setIsOpen(false); setSearch(''); }}>
                 {o.name}
              </div>
           ))}
           {filtered.length === 0 && <div className="p-2 text-xs text-gray-500 text-center">Tidak ditemukan</div>}
        </div>
      )}
    </div>
  )
}