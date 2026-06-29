import React, { useState, useRef } from 'react';
import { Edit, DownloadCloud, UploadCloud, Trash2, X } from 'lucide-react';
import { formatIDR, parseIDR, playSound, handleImageUpload } from '../utils/helpers';
import DataTable from '../components/ui/DataTable';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';
import PasswordConfirmModal from '../components/modals/PasswordConfirmModal';

export default function ProductManager({ products, setProducts, categories, units, colors, showToast, user, isSoundOn }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteProdId, setDeleteProdId] = useState(null);
  
  // PERBAIKAN: Mengurutkan Kategori & Satuan secara Abjad
  const sortedCats = Array.from(new Set((categories || []).map(c => typeof c === 'string' ? c : c.name))).sort();
  const sortedUnits = Array.from(new Set((units || []).map(u => typeof u === 'string' ? u : u.name))).sort();

  const defaultForm = { barcode: '', name: '', category: sortedCats[0] || 'Lainnya', unit: sortedUnits[0] || 'Pcs', stock: 0, cost: 0, price: 0, img: '📦' };
  const [form, setForm] = useState(defaultForm);
  const importRef = useRef(null);

  const columns = [
    { key: 'name', label: 'Nama Produk' },
    { key: 'category', label: 'Kategori' },
    { key: 'stock', label: 'Stok', render: r => `${r.stock} ${r.unit}` },
    { key: 'cost', label: 'Harga Beli', render: r => `Rp ${formatIDR(r.cost)}` },
    { key: 'price', label: 'Harga Jual', render: r => `Rp ${formatIDR(r.price)}` }
  ];

  const handleSave = (e) => {
    e.preventDefault();
    if (parseIDR(form.price) <= parseIDR(form.cost)) {
      playSound('pop', isSoundOn);
      showToast('Harga jual harus lebih besar dari harga beli!', 'error');
      return;
    }

    playSound('success', isSoundOn);
    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? { ...p, ...form } : p));
      showToast('Produk diperbarui', 'success');
    } else {
      setProducts([{ ...form, id: Date.now(), promo: {active: false, type: 'percent', value: 0, endDate: ''}, wholesale: {minQty: 0, price: 0} }, ...products]);
      showToast('Produk ditambahkan', 'success');
    }
    setIsModalOpen(false);
  };

  const handleEdit = (prod) => {
    playSound('pop', isSoundOn);
    setEditingId(prod.id);
    setForm({ barcode: prod.barcode || '', name: prod.name, category: prod.category, unit: prod.unit, stock: prod.stock, cost: prod.cost, price: prod.price, img: prod.img });
    setIsModalOpen(true);
  };

  const handleDeleteAll = (pwd) => {
    if (pwd !== user.password) { playSound('pop', isSoundOn); showToast('Password admin salah!', 'error'); return; }
    playSound('success', isSoundOn);
    setProducts([]);
    setIsDeleteAllOpen(false);
    showToast('Semua data produk dihapus', 'success');
  };

  const downloadTemplate = () => {
    playSound('pop', isSoundOn);
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body>
        <table border="1">
          <tr>
            <th style="background-color: #D4AF37; color: white;">NAMA</th>
            <th style="background-color: #D4AF37; color: white;">SATUAN</th>
            <th style="background-color: #D4AF37; color: white;">HARGA_POKOK</th>
            <th style="background-color: #D4AF37; color: white;">HARGA_JUAL_ECER</th>
            <th style="background-color: #D4AF37; color: white;">HARGA_JUAL_GROSIR</th>
            <th style="background-color: #D4AF37; color: white;">STOK</th>
            <th style="background-color: #D4AF37; color: white;">KATEGORI</th>
            <th style="background-color: #D4AF37; color: white;">BARCODE</th>
          </tr>
          <tr><td>ARIT MALIK BESAR</td><td>Pcs</td><td>53000</td><td>60000</td><td>60000</td><td>4</td><td>Alat Tukang</td><td>899123456789</td></tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Template_Import_Produk.xls';
    a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target.result;
          const newProducts = [];
          
          if (text.includes('<table')) {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const rows = doc.querySelectorAll('tr');
            for (let i = 1; i < rows.length; i++) {
              const cols = rows[i].querySelectorAll('td, th');
              if (cols.length < 6) continue;
              
              const name = cols[0]?.textContent?.trim();
              if (!name || name === 'NAMA') continue;
              
              const unit = cols[1]?.textContent?.trim() || sortedUnits[0] || 'Pcs';
              const costStr = cols[2]?.textContent?.replace(/\./g, '') || '0';
              const priceStr = cols[3]?.textContent?.replace(/\./g, '') || '0';
              const wholesaleStr = cols[4]?.textContent?.replace(/\./g, '') || '0';
              
              const cost = Number(costStr) || 0;
              const price = Number(priceStr) || 0;
              const wholesalePrice = Number(wholesaleStr) || 0;
              const stock = Number(cols[5]?.textContent?.replace(/\./g, '')) || 0;
              const category = cols[6]?.textContent?.trim() || sortedCats[0] || 'Lainnya';
              const barcode = cols[7]?.textContent?.trim() || '';

              if (name && price > 0) {
                newProducts.push({
                  id: Date.now() + i, barcode, name, category, unit, stock, cost, price, img: '📦',
                  promo: {active: false, type: 'percent', value: 0, endDate: ''},
                  wholesale: { minQty: wholesalePrice > 0 ? 12 : 0, price: wholesalePrice }
                });
              }
            }
          } else {
            const delimiter = text.indexOf('\t') > -1 ? '\t' : (text.indexOf(';') > -1 ? ';' : ',');
            const lines = text.split(/\r\n|\n/);
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const cols = lines[i].split(delimiter);
              if (cols.length < 6) continue;
              
              const name = cols[0]?.trim();
              if (!name || name === 'NAMA') continue;

              const unit = cols[1]?.trim() || sortedUnits[0] || 'Pcs';
              const costStr = cols[2] ? cols[2].replace(/\./g, '') : '0';
              const priceStr = cols[3] ? cols[3].replace(/\./g, '') : '0';
              const wholesaleStr = cols[4] ? cols[4].replace(/\./g, '') : '0';
              
              const cost = Number(costStr) || 0;
              const price = Number(priceStr) || 0;
              const wholesalePrice = Number(wholesaleStr) || 0;
              const stock = Number(cols[5]?.replace(/\./g, '')) || 0;
              const category = cols[6]?.trim() || sortedCats[0] || 'Lainnya';
              const barcode = cols[7] ? String(cols[7]).trim() : '';

              if (name && price > 0) {
                newProducts.push({
                  id: Date.now() + i, barcode, name, category, unit, stock, cost, price, img: '📦',
                  promo: {active: false, type: 'percent', value: 0, endDate: ''},
                  wholesale: { minQty: wholesalePrice > 0 ? 12 : 0, price: wholesalePrice }
                });
              }
            }
          }

          if (newProducts.length > 0) {
            setProducts([...products, ...newProducts]);
            playSound('success', isSoundOn);
            showToast(`${newProducts.length} produk berhasil diimpor`, 'success');
          } else { showToast('Format data tidak sesuai atau kosong', 'error'); }
        } catch (err) { showToast('Gagal memproses file', 'error'); }
      };
      reader.readAsText(file);
    }
    if(importRef.current) importRef.current.value = '';
  };

  const customTitle = (
    <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full">
      <span className="whitespace-nowrap font-bold">Manajemen Produk</span>
      <div className="flex flex-row items-center gap-2 text-xs font-normal overflow-x-auto custom-scrollbar pb-1 xl:pb-0">
        <button onClick={downloadTemplate} className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 border ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] whitespace-nowrap`}><DownloadCloud size={14}/> Template Excel</button>
        <button onClick={() => { playSound('pop', isSoundOn); importRef.current.click(); }} className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 whitespace-nowrap`}><UploadCloud size={14}/> Impor Data Excel</button>
        {user.role === 'admin' && (
          <button onClick={() => { playSound('pop', isSoundOn); setIsDeleteAllOpen(true); }} className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 whitespace-nowrap`}><Trash2 size={14}/> Kosongkan Data</button>
        )}
        <input type="file" accept=".xls,.csv,.txt" className="hidden" ref={importRef} onChange={handleImport} />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative">
      <DataTable 
        title={customTitle} columns={columns} data={products} colors={colors} 
        onAdd={() => { playSound('pop', isSoundOn); setEditingId(null); setForm(defaultForm); setIsModalOpen(true); }} 
        actions={[ { icon: Edit, label: 'Edit', colorClass: 'bg-blue-100 text-blue-600 hover:bg-blue-200', onClick: handleEdit } ]}
        onDelete={(prod) => { playSound('pop', isSoundOn); setDeleteProdId(prod.id); }}
      />
      
      {deleteProdId && (
        <DeleteConfirmModal 
           title="Hapus Produk?" 
           desc="Yakin ingin menghapus produk ini dari database?" 
           btnText="Hapus"
           onConfirm={() => { setProducts(products.filter(p => p.id !== deleteProdId)); setDeleteProdId(null); showToast('Produk dihapus', 'success'); playSound('pop', isSoundOn); }} 
           onCancel={() => setDeleteProdId(null)} 
           colors={colors} isSoundOn={isSoundOn} 
        />
      )}

      {isDeleteAllOpen && (
        <PasswordConfirmModal title="Hapus Semua Produk?" onConfirm={handleDeleteAll} onCancel={() => setIsDeleteAllOpen(false)} colors={colors} isSoundOn={isSoundOn} />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] flex flex-col`}>
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className={`text-xl font-bold ${colors.text}`}>{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
              <button onClick={() => { playSound('pop', isSoundOn); setIsModalOpen(false); }} className="text-red-500 hover:scale-110"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              <div className="flex flex-col items-center mb-4">
                 <label className={`relative w-24 h-24 rounded-xl ${colors.creamBg} border-2 border-dashed ${colors.border} flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors overflow-hidden group`} title="Upload Thumbnail Produk">
                    {form.img && form.img.startsWith('data:image') ? <img src={form.img} className="w-full h-full object-cover" alt="Thumb" /> : <span className="text-4xl">{form.img}</span>}
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs text-white text-center p-2 font-bold">Ubah Gambar</div>
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, (res) => setForm({...form, img: res}), showToast)} />
                 </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Barcode (Opsional)</label><input type="text" className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Scan/ketik barcode" /></div>
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nama Produk *</label><input type="text" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                 <div>
                    <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Kategori *</label>
                    <select required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white dark:bg-[#1e1e1e] ${colors.text} ${colors.border}`} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                       {sortedCats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Satuan *</label>
                    <select required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white dark:bg-[#1e1e1e] ${colors.text} ${colors.border}`} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                       {sortedUnits.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Stok Saat Ini *</label><input type="number" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} /></div>
                 <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Harga Beli / Modal (Rp) *</label><input type="text" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={formatIDR(form.cost)} onChange={e => setForm({...form, cost: parseIDR(e.target.value)})} /></div>
                 <div className="md:col-span-2"><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Harga Jual (Rp) *</label><input type="text" required className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent ${colors.text} ${colors.border}`} value={formatIDR(form.price)} onChange={e => setForm({...form, price: parseIDR(e.target.value)})} /></div>
              </div>
              <div className="flex gap-3 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700 mt-4 shrink-0">
                 <button type="button" onClick={() => { playSound('pop', isSoundOn); setIsModalOpen(false); }} className={`flex-1 py-3 border rounded-xl font-bold ${colors.text} ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A]`}>Batal</button>
                 <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90`}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
