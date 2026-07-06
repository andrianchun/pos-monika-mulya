import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Edit, DownloadCloud, UploadCloud, Trash2, X, Plus } from 'lucide-react';
import { formatIDR, parseIDR, smartFormatInput, playSound, handleImageUpload } from '../utils/helpers';
import { auth } from '../firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import DataTable from '../components/ui/DataTable';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';
import PasswordConfirmModal from '../components/modals/PasswordConfirmModal';

export default function ProductManager({ products, setProducts, categories, units, sales, colors, showToast, user, isSoundOn, editIntent, recordActivity, storeInfo, setStoreInfo }) {
  const canCreate = user?.role === 'admin' || (user?.permissions || []).includes('produk_create');
  const canEdit = user?.role === 'admin' || (user?.permissions || []).includes('produk_edit');
  const canDelete = user?.role === 'admin' || (user?.permissions || []).includes('produk_delete');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteProdId, setDeleteProdId] = useState(null);
  
  const sortedCats = Array.from(new Set((categories || []).map(c => typeof c === 'string' ? c : c.name)));
  if (!sortedCats.some(c => c.toLowerCase() === 'tanpa kategori')) sortedCats.push('Tanpa Kategori');
  sortedCats.sort();
  
  const sortedUnits = Array.from(new Set((units || []).map(u => typeof u === 'string' ? u : u.name)));
  if (!sortedUnits.some(u => u.toLowerCase() === 'pcs')) sortedUnits.push('Pcs');
  sortedUnits.sort();

  const defaultCat = sortedCats.find(c => c.toLowerCase() === 'tanpa kategori') || 'Tanpa Kategori';
  const defaultUnit = sortedUnits.find(u => u.toLowerCase() === 'pcs') || 'Pcs';
  const defaultForm = { barcode: '', name: '', category: defaultCat, unit: defaultUnit, stock: 0, cost: 0, price: 0, img: '', margin: 0, marginStr: '0' };
  const [form, setForm] = useState(defaultForm);
  const importRef = useRef(null);

  useEffect(() => {
     if (editIntent && editIntent.menu === 'produk') {
        const prod = products.find(p => p.id === editIntent.id);
        if (prod) {
           setEditingId(prod.id);
           setForm(prod);
           setIsModalOpen(true);
           if (editIntent.clearIntent) editIntent.clearIntent();
        }
     }
  }, [editIntent, products]);

  useEffect(() => {
     if (products && products.length > 0) {
        let needsMigration = false;
        const newProducts = products.map(p => {
           if (p.category && (p.category.toUpperCase() === 'LAINNYA' || p.category.toLowerCase() === 'lainnya')) {
              needsMigration = true;
              return { ...p, category: 'Tanpa Kategori' };
           }
           return p;
        });
        if (needsMigration) {
           setProducts(newProducts);
        }
     }
  }, [products, setProducts]);

  const columns = [
    { key: 'name', label: 'Nama Produk' },
    { key: 'category', label: 'Kategori', filterOptions: sortedCats },
    { key: 'stock', label: 'Stok', render: r => `${r.stock} ${r.unit}` },
    { key: 'cost', label: 'Harga Beli', render: r => `Rp ${formatIDR(r.cost)}` },
    { key: 'price', label: 'Harga Jual', render: r => `Rp ${formatIDR(r.price)}` }
  ];

  const displayProducts = useMemo(() => {
    const popMap = {};
    if (sales && sales.length > 0) {
      sales.forEach(s => {
        const list = s.items || s.cart;
        if (list) {
           list.forEach(item => {
              popMap[item.id] = (popMap[item.id] || 0) + Number(item.qty || 0);
           });
        }
      });
    }
    return products.map(p => ({
       ...p,
       popularity: popMap[p.id] || 0
    }));
  }, [products, sales]);

  const handleSave = (e) => {
    e.preventDefault();
    if (parseIDR(form.price) < parseIDR(form.cost)) {
      playSound('pop', isSoundOn);
      showToast('Harga jual tidak boleh lebih kecil dari harga beli!', 'error');
      return;
    }
    
    if (form.hasMultiUnit && form.multiUnits?.length > 0) {
       for (let mu of form.multiUnits) {
           if (!mu.price || mu.price <= 0) {
               playSound('pop', isSoundOn);
               showToast(`Harga jual Satuan Turunan (${mu.unit || 'Baru'}) wajib diisi & valid!`, 'error');
               return;
           }
       }
    }

    playSound('success', isSoundOn);
    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? { ...p, ...form, hppChanged: false } : p));
      const oldProd = products.find(p => p.id === editingId);
      const changes = [];
      if (oldProd?.price !== form.price) changes.push(`harga jual dari Rp${formatIDR(oldProd?.price || 0)} ke Rp${formatIDR(form.price)}`);
      if (oldProd?.basePrice !== form.basePrice) changes.push(`HPP dari Rp${formatIDR(oldProd?.basePrice || 0)} ke Rp${formatIDR(form.basePrice)}`);
      if (oldProd?.stock !== form.stock) changes.push(`stok dari ${oldProd?.stock} ke ${form.stock}`);
      const changeStr = changes.length > 0 ? ` (${changes.join(', ')})` : '';
      if (recordActivity) recordActivity('Edit Produk', `Mengubah data produk "${form.name}"${changeStr}`);
      showToast('Produk diperbarui', 'success');
    } else {
      setProducts([{ ...form, id: Date.now(), promo: {active: false, type: 'percent', value: 0, endDate: ''}, wholesale: {minQty: 0, price: 0} }, ...products]);
      if (recordActivity) recordActivity('Tambah Produk', `Menambahkan produk baru "${form.name}" (Stok: ${form.stock})`);
      showToast('Produk ditambahkan', 'success');
    }
    setIsModalOpen(false);
  };

  const handleEdit = (prod) => {
    playSound('pop', isSoundOn);
    setEditingId(prod.id);
    const margin = prod.cost > 0 ? ((prod.price - prod.cost) / prod.cost * 100) : 0;
    setForm({ 
       barcode: prod.barcode || '', name: prod.name, category: prod.category, unit: prod.unit, 
       stock: prod.stock, minStock: prod.minStock !== undefined ? prod.minStock : 5, 
       cost: prod.cost, price: prod.price, img: prod.img || '📦', 
       margin: margin, marginStr: String(Number(margin.toFixed(2))).replace('.', ','),
       hasMultiUnit: prod.hasMultiUnit || false,
       multiUnits: prod.multiUnits ? prod.multiUnits.map(mu => ({...mu, conversionStr: String(mu.conversion).replace('.', ','), priceStr: formatIDR(mu.price)})) : []
    });
    setIsModalOpen(true);
  };

  const handleDeleteAll = async (pwd) => {
    try {
      // Verifikasi password admin via Firebase Auth (bukan lagi dari database)
      const cred = EmailAuthProvider.credential(auth.currentUser.email, pwd);
      await reauthenticateWithCredential(auth.currentUser, cred);
    } catch (err) {
      playSound('pop', isSoundOn); showToast('Password admin salah!', 'error'); return;
    }
    playSound('success', isSoundOn);
    setProducts([]);
    if (recordActivity) recordActivity('Hapus Semua Produk', 'Mengosongkan semua data produk di sistem');
    setIsDeleteAllOpen(false);
    showToast('Semua data produk dihapus', 'success');
  };

  const exportToExcel = () => {
    playSound('pop', isSoundOn);
    
    const header = ["Barcode", "Nama Produk", "Kategori", "Satuan", "Stok", "Harga Beli", "Harga Jual"];
    
    const csvRows = products.map(p => {
       return [
          p.barcode || '',
          (p.name || '').replace(/;/g, '').replace(/"/g, ''),
          p.category || '',
          p.unit || '',
          p.stock || 0,
          p.cost || 0,
          p.price || 0
       ].join(';');
    });

    const csvContent = header.join(';') + '\n' + csvRows.join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `Data_Produk_HXPOS_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); 
    a.remove(); 
    URL.revokeObjectURL(url);
    showToast('Data produk berhasil diekspor', 'success');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target.result;
          let updatedCount = 0;
          let newCount = 0;
          const currentProducts = [...products];
          
          const processCols = (cols) => {
             const barcode = cols[0]?.textContent?.trim() ?? cols[0]?.trim() ?? '';
             const name = cols[1]?.textContent?.trim() ?? cols[1]?.trim() ?? '';
             if (!name || name.toUpperCase() === 'NAMA PRODUK' || name.toUpperCase() === 'NAMA') return;
             
             const category = cols[2]?.textContent?.trim() ?? cols[2]?.trim() ?? sortedCats[0] ?? 'Lainnya';
             const unit = cols[3]?.textContent?.trim() ?? cols[3]?.trim() ?? sortedUnits[0] ?? 'Pcs';
             
             const stockStr = cols[4]?.textContent ?? cols[4] ?? '0';
             const costStr = cols[5]?.textContent ?? cols[5] ?? '0';
             const priceStr = cols[6]?.textContent ?? cols[6] ?? '0';

             const stock = Number(stockStr.toString().replace(/\./g, '').replace(/,/g, '.')) || 0;
             const cost = Number(costStr.toString().replace(/\./g, '').replace(/,/g, '')) || 0;
             const price = Number(priceStr.toString().replace(/\./g, '').replace(/,/g, '')) || 0;

             const existingIdx = currentProducts.findIndex(p => 
                (barcode && p.barcode === barcode) || (!barcode && p.name.toLowerCase() === name.toLowerCase())
             );

             if (existingIdx > -1) {
                currentProducts[existingIdx] = {
                   ...currentProducts[existingIdx],
                   barcode: barcode || currentProducts[existingIdx].barcode,
                   name, category, unit, stock, cost, price
                };
                updatedCount++;
             } else {
                currentProducts.push({
                  id: Date.now() + Math.floor(Math.random() * 1000) + newCount, 
                  barcode, name, category, unit, stock, cost, price, img: '📦',
                  promo: {active: false, type: 'percent', value: 0, endDate: ''},
                  wholesale: { minQty: 0, price: 0 }
                });
                newCount++;
             }
          };

          if (text.includes('<table') && text.includes('<tr')) {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const rows = doc.querySelectorAll('tr');
            for (let i = 1; i < rows.length; i++) {
              const cols = rows[i].querySelectorAll('td, th');
              if (cols.length >= 6) processCols(cols);
            }
          } else {
            const delimiter = text.indexOf(';') > -1 ? ';' : (text.indexOf('\t') > -1 ? '\t' : ',');
            const lines = text.split(/\r\n|\n/);
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const cols = lines[i].split(delimiter);
              if (cols.length >= 6) processCols(cols);
            }
          }

          if (updatedCount > 0 || newCount > 0) {
            setProducts(currentProducts);
            playSound('success', isSoundOn);
            showToast(`${updatedCount} Diperbarui, ${newCount} Ditambahkan`, 'success');
          } else { showToast('Format data tidak sesuai atau kosong', 'error'); }
        } catch (err) { showToast('Gagal memproses file. Pastikan file tidak rusak.', 'error'); }
      };
      reader.readAsText(file);
    }
    if(importRef.current) importRef.current.value = '';
  };

  const customHeaderRight = (
    <>
       <button onClick={() => { playSound('pop', isSoundOn); exportToExcel(); }} className={`px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg border ${colors.border} flex items-center gap-1.5 ${colors.textMuted} hover:${colors.text} hover:border-[#D4AF37] transition-all whitespace-nowrap`}><DownloadCloud size={16}/> Template Excel</button>
       <button onClick={() => { playSound('pop', isSoundOn); importRef.current?.click(); }} className={`px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg border ${colors.border} flex items-center gap-1.5 ${colors.textMuted} hover:${colors.text} hover:border-blue-500 transition-all whitespace-nowrap`}><UploadCloud size={16}/> Impor Excel</button>
       {canDelete && (
         <button onClick={() => { playSound('pop', isSoundOn); setIsDeleteAllOpen(true); }} className={`px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 transition-all flex items-center gap-1.5 whitespace-nowrap`}><Trash2 size={16}/> Kosongkan</button>
       )}
       <input type="file" accept=".xls,.csv,.txt" className="hidden" ref={importRef} onChange={handleImport} />
    </>
  );

  return (
    <div className="h-full flex flex-col relative -m-4 md:-m-6 print:m-0 bg-gray-50 dark:bg-[#121212]">
      <div className="flex-1 overflow-hidden print:hidden p-2 sm:p-4">
        <DataTable 
          title="Kelola Produk" 
          headerRight={customHeaderRight}
          posLayout={true}
          columns={columns} 
          data={displayProducts}
          defaultSort={{ key: 'popularity', direction: 'desc' }}
          noSortKey="popularity"
          colors={colors} 
          onAdd={canCreate ? () => { playSound('pop', isSoundOn); setEditingId(null); setForm(defaultForm); setIsModalOpen(true); } : undefined} 
          actions={canEdit ? [ { icon: Edit, label: 'Edit', colorClass: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:bg-stone-300', onClick: handleEdit } ] : []}
          onDelete={canDelete ? (prod) => { playSound('pop', isSoundOn); setDeleteProdId(prod.id); } : undefined}
        />
      </div>
      
      {deleteProdId && (
        <DeleteConfirmModal 
           title="Hapus Produk?" 
           desc="Yakin ingin menghapus produk ini dari database?" 
           btnText="Hapus"
           onConfirm={() => { 
               const prod = products.find(p => p.id === deleteProdId);
               const pName = prod?.name;
               if (recordActivity) recordActivity('Hapus Produk', `Menghapus produk "${pName}"`);
               setProducts(products.filter(p => p.id !== deleteProdId)); 
               // ✅ Bersihkan aturan grosir & promo yang terkait produk ini
               if (setStoreInfo && storeInfo) {
                  const needsClean = 
                     (storeInfo.wholesales || []).some(w => String(w.productId) === String(deleteProdId)) ||
                     (storeInfo.promos || []).some(p => (p.targetItems || []).includes(String(deleteProdId)));
                  if (needsClean) {
                     setStoreInfo({
                        ...storeInfo,
                        wholesales: (storeInfo.wholesales || []).filter(w => String(w.productId) !== String(deleteProdId)),
                        promos: (storeInfo.promos || []).map(pr => ({
                           ...pr,
                           targetItems: (pr.targetItems || []).filter(id => id !== String(deleteProdId))
                        })).filter(pr => pr.targetType !== 'spesifik' || (pr.targetItems || []).length > 0)
                     });
                  }
               }
               setDeleteProdId(null); 
               showToast('Produk dihapus', 'success'); 
               playSound('pop', isSoundOn); 
           }} 
           onCancel={() => setDeleteProdId(null)} 
           colors={colors} isSoundOn={isSoundOn} 
        />
      )}

      {isDeleteAllOpen && (
        <PasswordConfirmModal title="Hapus Semua Produk?" onConfirm={handleDeleteAll} onCancel={() => setIsDeleteAllOpen(false)} colors={colors} isSoundOn={isSoundOn} />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-2 sm:p-4">
              <div className={`w-full max-w-5xl p-6 sm:p-8 rounded-3xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[95vh] flex flex-col`}>
                 <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className={`text-xl font-bold ${colors.text}`}>{editingId ? 'Edit Produk' : 'Tambah Produk'}</h3>
                     <div className="flex items-center gap-2">
                        <button onClick={() => { playSound('pop', isSoundOn); setIsModalOpen(false); }} className="text-red-500 hover:scale-110 p-1"><X size={24}/></button>
                     </div>
                 </div>
                 <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-1 sm:px-3 pb-4">
                    <form id="productForm" onSubmit={handleSave} className="space-y-5">
              <div className="flex flex-col items-center mb-4">
                 <label className={`relative w-24 h-24 rounded-xl ${colors.creamBg} border-2 border-dashed ${colors.border} flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors overflow-hidden group shrink-0`} title="Upload Thumbnail Produk">
                    {form.img && form.img.startsWith('data:image') ? <img src={form.img} className="w-full h-full object-cover" alt="Thumb" /> : <span className="text-4xl">{form.img}</span>}
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs text-white text-center p-2 font-bold">Ubah Gambar</div>
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, (res) => setForm({...form, img: res}), showToast)} />
                 </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Barcode (Opsional)</label><input type="text" className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Scan/ketik barcode" /></div>
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nama Produk *</label><input type="text" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                 <div>
                    <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Kategori *</label>
                    <select required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white dark:bg-[#1e1e1e] ${colors.text} ${colors.border}`} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                       {sortedCats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div>
                     <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Satuan Dasar *</label>
                     <select required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white dark:bg-[#1e1e1e] ${colors.text} ${colors.border}`} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                        {sortedUnits.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                  </div>
                  
                  <div className="sm:col-span-2 md:col-span-4 mt-2 border-t border-dashed pt-4 border-gray-300 dark:border-gray-700">
                     <label className={`flex items-center gap-2 cursor-pointer ${colors.text} text-sm font-bold`}>
                        <input type="checkbox" checked={form.hasMultiUnit || false} onChange={e => {
                           const checked = e.target.checked;
                           let newMulti = form.multiUnits || [];
                           if (checked && newMulti.length === 0) newMulti = [{ id: Date.now(), unit: sortedUnits.find(u => u !== form.unit) || sortedUnits[0] || '', conversion: 1, price: 0, barcode: '', conversionStr: '1', priceStr: '0' }];
                           setForm({...form, hasMultiUnit: checked, multiUnits: newMulti});
                        }} className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37] accent-[#D4AF37]" />
                        Aktifkan Multi-Satuan
                     </label>
                  </div>

                  {form.hasMultiUnit && form.multiUnits?.map((mu, index) => (
                     <div key={mu.id} className={`sm:col-span-2 md:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 mt-2 mb-2 mx-1 rounded-xl border ${colors.border} relative bg-black/5 dark:bg-white/5`}>
                        <button type="button" onClick={() => {
                           const m = [...form.multiUnits];
                           m.splice(index, 1);
                           setForm({...form, multiUnits: m});
                        }} className="absolute -top-3 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg z-10"><X size={16}/></button>
                        <div className="md:col-span-1">
                           <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Satuan Turunan</label>
                           <select required className={`w-full p-2.5 rounded-lg border bg-white dark:bg-[#1e1e1e] ${colors.text} ${colors.border} focus:ring-1 focus:ring-[#D4AF37] outline-none`} value={mu.unit} onChange={e => {
                              const m = [...form.multiUnits];
                              m[index].unit = e.target.value;
                              setForm({...form, multiUnits: m});
                           }}>
                              {sortedUnits.map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                        </div>
                        <div className="md:col-span-1">
                           <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Isi = ... {form.unit}</label>
                           <input type="text" inputMode="decimal" required className={`w-full p-2.5 rounded-lg border bg-transparent ${colors.text} ${colors.border} focus:ring-1 focus:ring-[#D4AF37] outline-none`} value={mu.conversionStr !== undefined ? mu.conversionStr : mu.conversion} onChange={e => {
                              const m = [...form.multiUnits];
                              m[index].conversion = parseIDR(e.target.value);
                              m[index].conversionStr = smartFormatInput(e.target.value);
                              setForm({...form, multiUnits: m});
                           }} placeholder="Contoh: 100" />
                        </div>
                        <div className="md:col-span-1">
                           <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Harga Jual *</label>
                           <input type="text" inputMode="numeric" required className={`w-full p-2.5 rounded-lg border bg-transparent ${colors.text} ${colors.border} focus:ring-1 focus:ring-[#D4AF37] outline-none`} value={mu.priceStr !== undefined ? mu.priceStr : formatIDR(mu.price)} onChange={e => {
                              const m = [...form.multiUnits];
                              m[index].price = parseIDR(e.target.value);
                              m[index].priceStr = formatIDR(e.target.value);
                              setForm({...form, multiUnits: m});
                           }} />
                        </div>
                        <div className="sm:col-span-3 lg:col-span-2">
                           <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Barcode Khusus (Opsional)</label>
                           <input type="text" className={`w-full p-2.5 rounded-lg border bg-transparent ${colors.text} ${colors.border} focus:ring-1 focus:ring-[#D4AF37] outline-none`} value={mu.barcode || ''} onChange={e => {
                              const m = [...form.multiUnits];
                              m[index].barcode = e.target.value;
                              setForm({...form, multiUnits: m});
                           }} placeholder="Scan barcode satuan ini" />
                        </div>
                     </div>
                  ))}
                  {form.hasMultiUnit && (
                     <div className="sm:col-span-2 md:col-span-4">
                        <button type="button" onClick={() => {
                           const m = [...(form.multiUnits || [])];
                           m.push({ id: Date.now(), unit: sortedUnits.find(u => u !== form.unit) || sortedUnits[0] || '', conversion: 1, price: 0, barcode: '', conversionStr: '1', priceStr: '0' });
                           setForm({...form, multiUnits: m});
                        }} className={`w-full py-2 border-2 border-dashed ${colors.border} rounded-xl text-xs font-bold ${colors.textMuted} hover:${colors.text} hover:border-[#D4AF37] transition-all flex items-center justify-center gap-1`}><Plus size={16}/> Tambah Satuan Lain</button>
                     </div>
                  )}
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Stok Saat Ini *</label><input type="text" inputMode="decimal" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.stockStr !== undefined ? form.stockStr : (form.stock !== undefined && form.stock !== null && form.stock !== '' ? String(form.stock).replace('.', ',') : '')} onChange={e => setForm({...form, stock: parseIDR(e.target.value), stockStr: smartFormatInput(e.target.value)})} /></div>
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Stok Minimum</label><input type="text" inputMode="decimal" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.minStockStr !== undefined ? form.minStockStr : (form.minStock !== undefined && form.minStock !== null && form.minStock !== '' ? String(form.minStock).replace('.', ',') : '')} onChange={e => setForm({...form, minStock: parseIDR(e.target.value), minStockStr: smartFormatInput(e.target.value)})} placeholder="Default: 5" /></div>
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Harga Beli (Modal) *</label><input type="text" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.costStr !== undefined ? form.costStr : formatIDR(form.cost)} onChange={e => {
                      const newCost = parseIDR(e.target.value);
                      const currentPrice = form.price || 0;
                      const newMargin = newCost > 0 ? ((currentPrice - newCost) / newCost * 100) : 0;
                      setForm({...form, cost: newCost, costStr: smartFormatInput(e.target.value), margin: newMargin, marginStr: String(Number(newMargin.toFixed(2))).replace('.', ',')});
                   }} /></div>
                   <div>
                      <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Harga Jual & Laba *</label>
                      <div className={`flex flex-col border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#D4AF37] ${colors.border}`}>
                         <div className="flex items-center bg-transparent">
                            <span className={`pl-3 pr-1 text-sm font-bold ${colors.textMuted}`}>Rp</span>
                            <input type="text" required className={`w-full p-2.5 bg-transparent border-none focus:ring-0 outline-none focus:outline-none text-base font-bold ${colors.text}`} value={form.priceStr !== undefined ? form.priceStr : formatIDR(form.price)} onChange={e => {
                               const newPrice = parseIDR(e.target.value);
                               const currentCost = form.cost || 0;
                               const newMargin = currentCost > 0 ? ((newPrice - currentCost) / currentCost * 100) : 0;
                               setForm({...form, price: newPrice, priceStr: smartFormatInput(e.target.value), margin: newMargin, marginStr: String(Number(newMargin.toFixed(2))).replace('.', ',')});
                            }} />
                         </div>
                         <div className="flex items-center border-t border-dashed border-[#D4AF37]/50 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20">
                            <span className="pl-3 pr-1 text-xs text-[#D4AF37] font-bold">Laba:</span>
                            <input type="text" inputMode="decimal" className="w-full p-2 bg-transparent border-none focus:ring-0 outline-none focus:outline-none text-[#D4AF37] text-sm font-semibold" value={form.marginStr !== undefined ? form.marginStr : (form.margin !== undefined ? String(Number(form.margin.toFixed(2))).replace('.', ',') : '')} onChange={e => {
                               const rawVal = e.target.value;
                               const newMargin = parseIDR(rawVal);
                               const currentCost = form.cost || 0;
                               const newPrice = Math.round(currentCost * (1 + newMargin / 100));
                               setForm({...form, margin: newMargin, marginStr: smartFormatInput(rawVal), price: newPrice, priceStr: formatIDR(newPrice)});
                            }} placeholder="Cth: 25" />
                            <span className="pr-3 text-xs text-[#D4AF37] font-bold">%</span>
                         </div>
                      </div>
                   </div>
              </div>
              <div className="flex gap-3 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700 mt-4 shrink-0">
                 <button type="button" onClick={() => { playSound('pop', isSoundOn); setIsModalOpen(false); }} className={`flex-1 py-3 border rounded-xl font-bold ${colors.text} ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A]`}>Batal</button>
                 <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90`}>Simpan</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
