import React, { useState, useRef, useMemo } from 'react';
import { Lock, Store, Plus, Edit, Trash2, X, DownloadCloud, UploadCloud, Tags, Gift, Ticket, Camera, CheckSquare, Square, Image } from 'lucide-react';
import { formatIDR, parseIDR, smartFormatInput, playSound, handleImageUpload } from '../utils/helpers';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';

export default function SettingsPage({ 
  colors, user, showToast, isSoundOn, 
  storeInfo = {}, setStoreInfo, users = [], setUsers, categories = [], setCategories, units = [], setUnits, 
  financialAccounts = [], setFinancialAccounts, setAllDatabase, products = [], setProducts, customers = [],
  sales = [], purchases = [], accounting = [], suppliers = []
}) {
  if (!user || user.role !== 'admin') return <div className="p-10 text-center text-red-500 font-bold text-2xl mt-20 flex flex-col items-center"><Lock size={64} className="mb-4 opacity-50"/>Akses Ditolak. Khusus Admin.</div>;
  
  const [activeTab, setActiveTab] = useState('toko');
  const importDbRef = useRef(null);

  // --- STATE PROFIL TOKO ---
  const [sName, setSName] = useState(storeInfo.name || 'MONIKA MULYA');
  const [sTagline, setSTagline] = useState(storeInfo.tagline || '');
  const [sAddress, setSAddress] = useState(storeInfo.address || '');
  const [sPhone, setSPhone] = useState(storeInfo.phone || '');
  const [sLogo, setSLogo] = useState(storeInfo.logo || null);
  const [sBanner, setSBanner] = useState(storeInfo.banner || null);
  const [sOngkir, setSOngkir] = useState(storeInfo.ongkirPerKm || 0);
  
  const [sPrefSales, setSPrefSales] = useState(storeInfo.prefixSales || 'INV');
  const [sPrefPurch, setSPrefPurch] = useState(storeInfo.prefixPurchase || 'PO');
  const [sNextSeqSales, setSNextSeqSales] = useState(storeInfo.nextSeqSales || 1);
  const [sNextSeqPurch, setSNextSeqPurch] = useState(storeInfo.nextSeqPurchase || 1);

  const [deleteUsr, setDeleteUsr] = useState(null);
  const [deleteFin, setDeleteFin] = useState(null);

  const saveStoreInfo = (e) => {
     e.preventDefault(); 
     playSound('success', isSoundOn);
     setStoreInfo({ 
       ...storeInfo, name: sName, tagline: sTagline, address: sAddress, phone: sPhone, logo: sLogo, banner: sBanner,
       ongkirPerKm: Number(sOngkir) || 0, prefixSales: sPrefSales, prefixPurchase: sPrefPurch,
       nextSeqSales: Number(sNextSeqSales) || 1, nextSeqPurchase: Number(sNextSeqPurch) || 1
     });
     showToast('Pengaturan profil & kode nota berhasil diperbarui.', 'success');
  };

  // --- LOGIKA HARGA GROSIR ---
  const wholesales = storeInfo.wholesales || [];
  const [isGrosirModal, setIsGrosirModal] = useState(false);
  const [wForm, setWForm] = useState({ id: '', productId: '', minQty: '', wholesalePrice: '' });

  const selectedProductOriginalPrice = useMemo(() => {
     if (!wForm.productId) return 0;
     const prod = products.find(p => String(p.id) === String(wForm.productId));
     return prod ? prod.price : 0;
  }, [wForm.productId, products]);

  const saveWholesale = (e) => {
     e.preventDefault(); 
     playSound('success', isSoundOn);
     let newWholesales = [...wholesales];
     if (!wForm.productId) { showToast('Pilih produk terlebih dahulu!', 'error'); return; }

     if (wForm.id) {
       newWholesales = newWholesales.map(w => w.id === wForm.id ? { ...wForm, minQty: Number(wForm.minQty), wholesalePrice: parseIDR(wForm.wholesalePrice) } : w);
     } else {
       if (newWholesales.find(w => String(w.productId) === String(wForm.productId))) {
          showToast('Aturan grosir untuk produk ini sudah ada!', 'error'); return;
       }
       newWholesales.push({ ...wForm, id: Date.now(), minQty: Number(wForm.minQty), wholesalePrice: parseIDR(wForm.wholesalePrice) });
     }
     setStoreInfo({ ...storeInfo, wholesales: newWholesales });
     setIsGrosirModal(false);
     showToast('Aturan grosir disimpan', 'success');
  };

  const deleteWholesale = (id) => {
     playSound('pop', isSoundOn);
     setStoreInfo({ ...storeInfo, wholesales: wholesales.filter(w => w.id !== id) });
     showToast('Aturan grosir dihapus', 'success');
  };

  // --- LOGIKA POIN LOYALITAS ---
  const [sPointMult, setSPointMult] = useState(storeInfo.pointMultiplier || 10000);
  const [sPointRew, setSPointRew] = useState(storeInfo.pointReward || 1);

  const savePointsInfo = (e) => {
     e.preventDefault(); 
     playSound('success', isSoundOn);
     setStoreInfo({ ...storeInfo, pointMultiplier: Number(sPointMult), pointReward: Number(sPointRew) });
     showToast('Aturan poin loyalitas diperbarui.', 'success');
  };

  // --- LOGIKA DISKON PROMO ---
  const promos = storeInfo.promos || [];
  const [isPromoModal, setIsPromoModal] = useState(false);
  const [pForm, setPForm] = useState({ id: '', name: '', targetType: 'semua', targetItems: [], targetCustomerType: 'semua', targetCustomers: [], startDate: '', endDate: '', discType: '%', discValue: '' });

  const savePromo = (e) => {
     e.preventDefault(); 
     playSound('success', isSoundOn);
     if (pForm.targetType === 'spesifik' && (!pForm.targetItems || pForm.targetItems.length === 0)) { showToast('Pilih minimal 1 produk', 'error'); return; }
     if (pForm.targetCustomerType === 'spesifik' && (!pForm.targetCustomers || pForm.targetCustomers.length === 0)) { showToast('Pilih minimal 1 pelanggan', 'error'); return; }

     let newPromos = [...promos];
     const cleanPromo = { ...pForm, discValue: Number(pForm.discValue) };

     if (pForm.id) newPromos = newPromos.map(pr => pr.id === pForm.id ? cleanPromo : pr);
     else newPromos.push({ ...cleanPromo, id: Date.now() });

     setStoreInfo({ ...storeInfo, promos: newPromos });
     setIsPromoModal(false);
     showToast('Promo otomatis berhasil disimpan', 'success');
  };

  const deletePromo = (id) => {
     playSound('pop', isSoundOn);
     setStoreInfo({ ...storeInfo, promos: promos.filter(pr => pr.id !== id) });
     showToast('Promo berhasil dihapus', 'success');
  };

  const addPromoItem = (id) => { if (!(pForm.targetItems || []).includes(id)) setPForm({...pForm, targetItems: [...(pForm.targetItems || []), id]}); };
  const removePromoItem = (id) => setPForm({...pForm, targetItems: (pForm.targetItems || []).filter(i => i !== id)});
  const addPromoCustomer = (id) => { if (!(pForm.targetCustomers || []).includes(id)) setPForm({...pForm, targetCustomers: [...(pForm.targetCustomers || []), id]}); };
  const removePromoCustomer = (id) => setPForm({...pForm, targetCustomers: (pForm.targetCustomers || []).filter(i => i !== id)});

  // --- LOGIKA MANAJEMEN AKUN USER ---
  const [isUserModal, setIsUserModal] = useState(false);
  const [uForm, setUForm] = useState({ id: '', username: '', email: '', name: '', role: 'kasir', permissions: [], password: '', avatar: null });
  
  const handlePermissionToggle = (module) => {
     setUForm(prev => {
        let perms = [...(prev.permissions || [])];
        if(perms.includes(module)) perms = perms.filter(p => p !== module);
        else perms.push(module);
        return {...prev, permissions: perms};
     });
  };

  const saveUser = (e) => {
     e.preventDefault(); 
     playSound('success', isSoundOn);
     const finalForm = {...uForm, permissions: uForm.role === 'admin' ? ['all'] : (uForm.permissions || [])};
     if(finalForm.id) setUsers(users.map(u => u.id === finalForm.id ? finalForm : u));
     else setUsers([...(users||[]), { ...finalForm, id: Date.now() }]);
     setIsUserModal(false); 
     showToast('Akun user berhasil disimpan', 'success');
  };

  // --- LOGIKA KEUANGAN, KATEGORI, SATUAN (CASCADING & ALPHABETICAL) ---
  const [editGenericModal, setEditGenericModal] = useState(null); 
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('tunai');
  const [newCat, setNewCat] = useState('');
  const [newUnit, setNewUnit] = useState('');

  const addFinAccount = () => {
     if(!newAccName) return; 
     playSound('pop', isSoundOn);
     setFinancialAccounts([...(financialAccounts || []), { id: Date.now(), name: newAccName, type: newAccType }]);
     setNewAccName(''); 
     showToast('Akun keuangan ditambahkan', 'success');
  };

  const getLabel = (item) => {
     if (typeof item === 'string') return item;
     if (item && typeof item === 'object') return item.name || item.value || JSON.stringify(item);
     return String(item);
  };

  const saveGenericEdit = (e) => {
     e.preventDefault(); 
     playSound('success', isSoundOn);
     
     if (editGenericModal.type === 'fin') {
        setFinancialAccounts((financialAccounts || []).map(f => f.id === editGenericModal.idOrIdx ? { ...f, name: editGenericModal.val1, type: editGenericModal.val2 } : f));
        showToast('Akun Keuangan diperbarui', 'success');
     } 
     else if (editGenericModal.type === 'cat') {
        const oldLabel = editGenericModal.idOrIdx; 
        const newLabel = editGenericModal.val1;
        
        const newCats = Array.from(new Set(categories.map(c => getLabel(c) === oldLabel ? newLabel : getLabel(c)))).sort();
        setCategories(newCats); 

        if (setProducts && products.length > 0) {
           setProducts(products.map(p => p.category === oldLabel ? { ...p, category: newLabel } : p));
        }
        showToast('Kategori diperbarui & disinkronisasi', 'success');
     } 
     else if (editGenericModal.type === 'unit') {
        const oldLabel = editGenericModal.idOrIdx;
        const newLabel = editGenericModal.val1;

        const newUnits = Array.from(new Set(units.map(u => getLabel(u) === oldLabel ? newLabel : getLabel(u)))).sort();
        setUnits(newUnits); 

        if (setProducts && products.length > 0) {
           setProducts(products.map(p => p.unit === oldLabel ? { ...p, unit: newLabel } : p));
        }
        showToast('Satuan diperbarui & disinkronisasi', 'success');
     }
     setEditGenericModal(null);
  };

  const handleDeleteCat = (label) => {
     if (label.toUpperCase() === 'TANPA KATEGORI') {
        playSound('pop', isSoundOn);
        showToast('Kategori default "Tanpa Kategori" tidak boleh dihapus!', 'error');
        return;
     }
     if (!window.confirm(`Yakin hapus kategori "${label}"?\n\nSemua produk di kategori ini akan otomatis dipindahkan ke "Tanpa Kategori".`)) return;

     playSound('pop', isSoundOn);
     const newArr = categories.filter(c => c !== label);
     if (!newArr.some(c => c.toLowerCase() === 'tanpa kategori')) newArr.push('Tanpa Kategori');
     setCategories(newArr.sort());
     
     if (products && setProducts) {
        setProducts(products.map(p => p.category === label ? { ...p, category: 'Tanpa Kategori' } : p));
     }
     showToast(`Kategori dihapus. Produk dialihkan ke "Tanpa Kategori"`, 'success');
  };

  const handleDeleteUnit = (label) => {
     if (label.toLowerCase() === 'pcs') {
         playSound('pop', isSoundOn);
         showToast('Satuan default "Pcs" tidak boleh dihapus!', 'error');
         return;
     }
     if (!window.confirm(`Yakin hapus satuan "${label}"?\n\nSemua produk dengan satuan ini akan otomatis dipindahkan ke "Pcs".`)) return;

     playSound('pop', isSoundOn);
     let newArr = units.map(getLabel).filter(u => u !== label);
     if (!newArr.includes('Pcs')) newArr.push('Pcs');
     setUnits(newArr.sort());
     
     if (setProducts && products.length > 0) {
         setProducts(products.map(p => p.unit === label ? { ...p, unit: 'Pcs' } : p));
     }
     showToast(`Satuan dihapus. Produk dialihkan ke "Pcs"`, 'success');
  };

  // =========================================================================
  // 🔥 FITUR UTAMA: EKSPOR MULTISELECT REAL DATA (JSON BLOB DOWNLOAD)
  // =========================================================================
  const exportOptionsList = [
    { id: 'produk', label: 'Data Produk & Stok', key: 'products' },
    { id: 'penjualan', label: 'Data Penjualan (History)', key: 'sales' },
    { id: 'pembelian', label: 'Data Pembelian (History)', key: 'purchases' },
    { id: 'kontak', label: 'Kontak (Customer & Supplier)', key: 'contacts' },
    { id: 'laporan', label: 'Laporan Keuangan (Jurnal)', key: 'accounting' },
    { id: 'setting', label: 'Pengaturan & Profil Toko', key: 'settings' }
  ];

  const [selectedExports, setSelectedExports] = useState(['produk', 'penjualan', 'pembelian', 'kontak', 'laporan', 'setting']);

  const toggleExportOption = (id) => {
     playSound('pop', isSoundOn);
     if (selectedExports.includes(id)) {
        setSelectedExports(selectedExports.filter(x => x !== id));
     } else {
        setSelectedExports([...selectedExports, id]);
     }
  };

  const handleSelectAllExports = () => {
     playSound('pop', isSoundOn);
     if (selectedExports.length === exportOptionsList.length) {
        setSelectedExports([]);
     } else {
        setSelectedExports(exportOptionsList.map(x => x.id));
     }
  };

  const handleExportDB = () => {
    if (selectedExports.length === 0) {
       showToast('Pilih minimal 1 data yang ingin diekspor!', 'error');
       playSound('pop', isSoundOn);
       return;
    }

    playSound('success', isSoundOn);
    const backupData = {};

    if (selectedExports.includes('setting')) {
       backupData.storeInfo = storeInfo;
       backupData.categories = categories;
       backupData.units = units;
       backupData.financialAccounts = financialAccounts;
    }
    if (selectedExports.includes('produk')) backupData.products = products;
    if (selectedExports.includes('penjualan')) backupData.sales = sales;
    if (selectedExports.includes('pembelian')) backupData.purchases = purchases;
    if (selectedExports.includes('kontak')) {
       backupData.customers = customers;
       backupData.suppliers = suppliers;
    }
    if (selectedExports.includes('laporan')) backupData.accounting = accounting;
    
    backupData.users = users;

    try {
       const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       const dateStr = new Date().toISOString().split('T')[0];
       
       a.href = url;
       a.download = `HXPOS_Backup_${dateStr}.json`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);

       showToast(`${selectedExports.length} Modul Data Berhasil Diekspor!`, 'success');
    } catch (err) {
       showToast('Gagal meluncurkan ekspor database.', 'error');
    }
  };

  const handleImportDB = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
         const parsedData = JSON.parse(evt.target.result); 
         if (parsedData) {
            setAllDatabase(parsedData);
            playSound('cash', isSoundOn);
            showToast('Database berhasil dipulihkan!', 'success');
         } else { 
            showToast('Format File Backup Tidak Dikenali!', 'error'); 
         }
      } catch(err) { 
         showToast('File backup invalid atau corrupt.', 'error'); 
      }
    };
    reader.readAsText(file);
    if (importDbRef.current) importDbRef.current.value = '';
  };

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto pb-10 select-none">
      <h2 className={`text-2xl font-bold mb-4 shrink-0 ${colors.text}`}>Pengaturan Sistem</h2>
      <div className={`flex overflow-x-auto custom-scrollbar border-b ${colors.border} mb-6 shrink-0`}>
        {[
          { id: 'toko', label: 'Profil Toko' }, 
          { id: 'grosir', label: 'Harga Grosir' }, 
          { id: 'promo', label: 'Promo Diskon' }, 
          { id: 'loyalitas', label: 'Poin Pelanggan' }, 
          { id: 'akun', label: 'Hak Akses User' }, 
          { id: 'finance', label: 'Akun Keuangan' }, 
          { id: 'kategori', label: 'Kategori/Satuan' }, 
          { id: 'database', label: 'Database & Backup' }
        ].map(t => (
          <button key={t.id} onClick={() => { playSound('pop', isSoundOn); setActiveTab(t.id); }} className={`px-4 sm:px-6 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === t.id ? `border-[#D4AF37] ${colors.gold}` : `border-transparent ${colors.textMuted} hover:${colors.text}`}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
         
         {/* 1. PROFIL TOKO & ATURAN KODE NOTA */}
         {activeTab === 'toko' && (
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm max-w-3xl`}>
               <form onSubmit={saveStoreInfo} className="space-y-6">
                 <div className="flex justify-center gap-6 mb-4">
                   <div className="flex flex-col items-center">
                     <label className={`relative w-24 h-24 rounded-xl ${colors.creamBg} border-2 border-dashed ${colors.border} flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors overflow-hidden group`}>
                        {sLogo ? <img src={sLogo} className="w-full h-full object-cover" alt="Logo" /> : <Store size={32} />}
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setSLogo, showToast, 600, 0.85)} />
                     </label>
                     <span className="text-[10px] mt-2 text-gray-400 font-bold uppercase">Logo Toko</span>
                   </div>
                   <div className="flex flex-col items-center">
                     <label className={`relative w-48 h-24 rounded-xl ${colors.creamBg} border-2 border-dashed ${colors.border} flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors overflow-hidden group`}>
                        {sBanner ? <img src={sBanner} className="w-full h-full object-cover" alt="Banner" /> : <Image size={32} />}
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setSBanner, showToast, 1920, 0.85)} />
                     </label>
                     <span className="text-[10px] mt-2 text-gray-400 font-bold uppercase">Banner Latar</span>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nama Toko</label><input required type="text" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={sName} onChange={e => setSName(e.target.value)} /></div>
                    <div className="md:col-span-2"><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Tagline / Moto Toko</label><input type="text" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={sTagline} onChange={e => setSTagline(e.target.value)} placeholder="Bismillah / Melayani Grosir & Ritel" /></div>
                    <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Alamat Toko</label><textarea rows="2" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={sAddress} onChange={e => setSAddress(e.target.value)}></textarea></div>
                    <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>No. WhatsApp Toko</label><input type="text" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={sPhone} onChange={e => setSPhone(e.target.value)} /></div>
                    <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Tarif Ongkir (Per Km)</label><input type="number" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={sOngkir} onChange={e => setSOngkir(e.target.value)} /></div>
                    
                    <div className="md:col-span-2 border-t border-dashed border-gray-300 dark:border-gray-700 pt-4 mt-2">
                       <h4 className="text-sm font-extrabold mb-3 text-[#D4AF37]">Konfigurasi Penomoran Kode Nota Kasir</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Prefix Nota Jual (Sales)</label>
                             <input required type="text" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} font-mono uppercase outline-none`} value={sPrefSales} onChange={e => setSPrefSales(e.target.value)} placeholder="Cth: INV" />
                          </div>
                          <div>
                             <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nomor Urut Jual Berikutnya</label>
                             <input required type="number" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={sNextSeqSales} onChange={e => setSNextSeqSales(e.target.value)} />
                          </div>
                          <div>
                             <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Prefix Nota Beli (Purchase)</label>
                             <input required type="text" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} font-mono uppercase outline-none`} value={sPrefPurch} onChange={e => setSPrefPurch(e.target.value)} placeholder="Cth: PO" />
                          </div>
                          <div>
                             <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nomor Urut Beli Berikutnya</label>
                             <input required type="number" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={sNextSeqPurch} onChange={e => setSNextSeqPurch(e.target.value)} />
                          </div>
                       </div>
                    </div>
                 </div>
                 <button type="submit" className={`w-full py-3.5 rounded-xl text-[#18181B] font-bold text-base shadow-md ${colors.goldBg}`}>Simpan Profil & Struktur Nota</button>
               </form>
            </div>
         )}

         {/* 2. TAB HARGA GROSIR */}
         {activeTab === 'grosir' && (
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm max-w-4xl`}>
               <div className="flex justify-between items-center mb-6">
                  <h3 className={`font-bold text-lg flex items-center gap-2 ${colors.text}`}><Tags className="${colors.gold}"/> Aturan Harga Grosir Sentral</h3>
                  <button onClick={() => { playSound('pop', isSoundOn); setWForm({id:'', productId:'', minQty:'', wholesalePrice:''}); setIsGrosirModal(true); }} className="px-4 py-2 rounded-xl text-[#18181B] text-sm font-bold ${colors.goldBg} hover:opacity-90 flex items-center gap-1 shadow-sm"><Plus size={16}/> Tambah Aturan</button>
               </div>
               
               <div className="space-y-3">
                  {wholesales.length === 0 ? (
                     <p className="text-sm text-gray-500 italic text-center py-6">Belum ada aturan grosir aktif.</p>
                  ) : (
                     <table className={`w-full text-sm text-left ${colors.text}`}>
                        <thead className={`text-xs uppercase ${colors.creamBg} border-b ${colors.border}`}>
                           <tr>
                              <th className="py-3 px-4">Nama Produk</th>
                              <th className="py-3 px-4 text-right">Harga Ritel (Awal)</th>
                              <th className="py-3 px-4 text-center">Minimal Beli</th>
                              <th className="py-3 px-4 text-right">Harga Grosir (Baru)</th>
                              <th className="py-3 px-4 text-center">Aksi</th>
                           </tr>
                        </thead>
                        <tbody>
                           {wholesales.map((w, i) => {
                              const pInfo = products?.find(p => String(p.id) === String(w.productId));
                              return (
                                 <tr key={w.id ? `${w.id}_${i}` : i} className={`border-b border-dashed ${colors.border}`}>
                                    <td className="py-3 px-4 font-bold">{pInfo ? pInfo.name : 'Produk Tidak Ditemukan'}</td>
                                    <td className="py-3 px-4 text-right text-gray-400">Rp {formatIDR(pInfo?.price || 0)}</td>
                                    <td className="py-3 px-4 text-center font-bold ${colors.gold} bg-black/5 dark:bg-white/5 rounded-lg">{w.minQty} {pInfo?.unit || 'Pcs'}</td>
                                    <td className="py-3 px-4 text-right font-bold text-green-500">Rp {formatIDR(w.wholesalePrice)}</td>
                                    <td className="py-3 px-4 text-center">
                                       <div className="flex justify-center gap-2">
                                          <button onClick={() => { playSound('pop', isSoundOn); setWForm({...w, wholesalePrice: formatIDR(w.wholesalePrice)}); setIsGrosirModal(true); }} className="p-1.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:scale-105"><Edit size={16}/></button>
                                          <button onClick={() => deleteWholesale(w.id)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-105"><Trash2 size={16}/></button>
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  )}
               </div>
            </div>
         )}

         {/* 3. TAB PROMO DISKON OTOMATIS */}
         {activeTab === 'promo' && (
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm max-w-4xl`}>
               <div className="flex justify-between items-center mb-6">
                  <h3 className={`font-bold text-lg flex items-center gap-2 ${colors.text}`}><Ticket className="${colors.gold}"/> Aturan Promo & Diskon Otomatis</h3>
                  <button onClick={() => { playSound('pop', isSoundOn); setPForm({id:'', name:'', targetType:'semua', targetItems:[], targetCustomerType:'semua', targetCustomers:[], startDate:'', endDate:'', discType:'%', discValue:''}); setIsPromoModal(true); }} className="px-4 py-2 rounded-xl text-[#18181B] text-sm font-bold ${colors.goldBg} hover:opacity-90 flex items-center gap-1 shadow-sm"><Plus size={16}/> Tambah Promo</button>
               </div>
               
               <div className="space-y-3">
                  {promos.length === 0 ? (
                     <p className="text-sm text-gray-500 italic text-center py-6">Belum ada promo diskon otomatis aktif.</p>
                  ) : (
                     <table className={`w-full text-sm text-left ${colors.text}`}>
                        <thead className={`text-xs uppercase ${colors.creamBg} border-b ${colors.border}`}>
                           <tr>
                              <th className="py-3 px-4">Nama Event</th>
                              <th className="py-3 px-4">Berlaku Untuk</th>
                              <th className="py-3 px-4 text-center">Sasaran Pembeli</th>
                              <th className="py-3 px-4 text-right">Potongan</th>
                              <th className="py-3 px-4 text-center">Periode Waktu</th>
                              <th className="py-3 px-4 text-center">Aksi</th>
                           </tr>
                        </thead>
                        <tbody>
                           {promos.map((pr, i) => {
                              const tItems = pr.targetItems || (pr.targetItem ? [pr.targetItem] : []);
                              const tCusts = pr.targetCustomers || (pr.targetCustomer && pr.targetCustomer !== 'semua' ? [pr.targetCustomer] : []);
                              
                              return (
                                 <tr key={pr.id ? `${pr.id}_${i}` : i} className={`border-b border-dashed ${colors.border}`}>
                                    <td className="py-3 px-4 font-bold">{pr.name}</td>
                                    <td className="py-3 px-4 text-xs font-medium">{pr.targetType === 'semua' ? 'Semua Produk' : `${tItems.length} Produk Dipilih`}</td>
                                    <td className="py-3 px-4 text-center text-xs font-bold text-stone-500 dark:text-stone-400">{pr.targetCustomerType === 'semua' ? 'Semua Pelanggan' : `${tCusts.length} Member Dipilih`}</td>
                                    <td className="py-3 px-4 text-right font-bold text-red-500">{pr.discType === '%' ? `${pr.discValue}%` : `Rp ${formatIDR(pr.discValue)}`}</td>
                                    <td className="py-3 px-4 text-center text-xs text-gray-400 font-medium">{pr.startDate.split('-').reverse().join('-')} s/d {pr.endDate.split('-').reverse().join('-')}</td>
                                    <td className="py-3 px-4 text-center">
                                       <div className="flex justify-center gap-2">
                                          <button onClick={() => { playSound('pop', isSoundOn); setPForm({ ...pr, targetItems: tItems, targetCustomers: tCusts, targetCustomerType: pr.targetCustomerType || (pr.targetCustomer==='semua' ? 'semua':'spesifik') }); setIsPromoModal(true); }} className="p-1.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:scale-105"><Edit size={16}/></button>
                                          <button onClick={() => deletePromo(pr.id)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-105"><Trash2 size={16}/></button>
                                       </div>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  )}
               </div>
            </div>
         )}

         {/* 4. TAB POIN LOYALITAS CUSTOMER */}
         {activeTab === 'loyalitas' && (
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm max-w-xl`}>
               <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${colors.text}`}><Gift className="text-orange-500"/> Aturan Poin Kelipatan Belanja</h3>
               <form onSubmit={savePointsInfo} className="space-y-4">
                  <div>
                     <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Setiap Nominal Belanja Kelipatan (Rp)</label>
                     <input required type="number" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sPointMult} onChange={e => setSPointMult(e.target.value)} />
                  </div>
                  <div>
                     <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Berikan Reward Poin Sejumlah</label>
                     <input required type="text" inputMode="decimal" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sPointRewStr !== undefined ? sPointRewStr : (sPointRew || '')} onChange={e => { setSPointRew(parseIDR(e.target.value)); setSPointRewStr(smartFormatInput(e.target.value)); }} />
                  </div>
                  <div className="p-3 bg-orange-500/5 rounded-xl border border-orange-500/20 text-[11px] text-gray-500 italic">
                     Sistem di Kasir otomatis menghitung total belanja pembeli. Misal diatur Rp 10.000 = 1 Poin, pembeli dengan total belanja Rp 35.000 otomatis tercatat mendapatkan 3 Poin tambahan.
                  </div>
                  <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-md">Simpan Konfigurasi Poin</button>
               </form>
            </div>
         )}

         {/* 5. HAK AKSES USER */}
         {activeTab === 'akun' && (
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm`}>
               <div className="flex justify-between items-center mb-4">
                  <h3 className={`font-bold text-lg ${colors.text}`}>Hak Akses & Manajemen User</h3>
                  <button onClick={() => { playSound('pop', isSoundOn); setUForm({ id: '', username: '', email: '', name: '', role: 'kasir', permissions: ['dashboard', 'pos'], password: '', avatar: null }); setIsUserModal(true); }} className={`px-4 py-2 rounded-lg text-[#18181B] text-sm font-bold flex items-center gap-2 ${colors.goldBg} hover:opacity-90`}><Plus size={16}/> Akun Baru</button>
               </div>
               <table className={`w-full text-sm text-left ${colors.text}`}>
                 <thead className={`text-xs uppercase ${colors.creamBg} border-b ${colors.border}`}><tr><th className="py-3 px-4">Nama Lengkap</th><th className="py-3 px-4">Role</th><th className="py-3 px-4">Username Login</th><th className="py-3 px-4 text-center">Aksi</th></tr></thead>
                 <tbody>
                   {(users || []).map((u, i) => (
                      <tr key={u.id ? `${u.id}_${i}` : i} className={`border-b border-dashed ${colors.border}`}>
                         <td className="py-3 px-4 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${colors.goldBg} text-[#18181B] font-bold flex items-center justify-center overflow-hidden`}>
                               {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="ava"/> : u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                               <p className="font-semibold">{u.name}</p>
                               <p className="text-[10px] text-gray-500">{u.email || '-'}</p>
                            </div>
                         </td>
                         <td className="py-3 px-4 font-bold text-xs">{u.role === 'admin' ? <span className={"font-extrabold " + colors.gold}>ADMIN MASTER</span> : <span className={"font-medium " + colors.textMuted}>KASIR / STAFF</span>}</td>
                         <td className="py-3 px-4 font-mono text-gray-500">{u.username}</td>
                         <td className="py-3 px-4">
                            <div className="flex justify-center gap-2">
                               <button onClick={() => { playSound('pop', isSoundOn); setUForm({ ...u, email: u.email || '', avatar: u.avatar || null }); setIsUserModal(true); }} className="p-1.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:scale-105"><Edit size={16}/></button>
                               {u.id !== 1 && <button onClick={() => setDeleteUsr(u)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-105"><Trash2 size={16}/></button>}
                            </div>
                         </td>
                      </tr>
                   ))}
                 </tbody>
               </table>
            </div>
         )}

         {/* 6. TAB AKUN KEUANGAN (SAFE GUARDED) */}
         {activeTab === 'finance' && (
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm max-w-3xl`}>
               <h3 className={`font-bold text-lg mb-2 ${colors.text}`}>Kelola Akun Keuangan</h3>
               <div className="flex gap-3 mb-6">
                   <input type="text" className={`flex-1 p-2.5 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none`} placeholder="Ketik Nama Akun Baru..." value={newAccName} onChange={e=>setNewAccName(e.target.value)} />
                   <button onClick={addFinAccount} className={`px-5 py-2.5 font-bold text-[#18181B] rounded-lg ${colors.goldBg} flex gap-1 items-center shadow-sm shrink-0`}><Plus size={16}/> Tambah</button>
               </div>
               <div className="space-y-3">
                  {(financialAccounts || []).map(fa => (
                     <div key={fa.id} className={`flex justify-between items-center p-3 rounded-lg border ${colors.border} bg-gray-50 dark:bg-[#1e1e1e]`}>
                        <div>
                           <p className={`font-bold ${colors.text}`}>{fa.name}</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => { playSound('pop', isSoundOn); setEditGenericModal({type:'fin', idOrIdx: fa.id, val1: fa.name}); }} className="p-1.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:scale-105"><Edit size={16}/></button>
                           {fa.id !== 1 && <button onClick={() => setDeleteFin(fa.id)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-105"><Trash2 size={16}/></button>}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}
         
         {/* 7. KATEGORI & SATUAN (ALPHABETICAL & CASCADING DELETE) */}
         {activeTab === 'kategori' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm`}>
                  <h3 className={`font-bold text-lg mb-4 ${colors.text}`}>Daftar Kategori</h3>
                  <div className="flex gap-2 mb-4">
                     <input type="text" className={`flex-1 p-2 rounded-lg border ${colors.border} bg-transparent ${colors.text} outline-none`} placeholder="Kategori Baru..." value={newCat} onChange={e=>setNewCat(e.target.value)} />
                     <button onClick={() => { if(newCat){ const cleanCat = newCat.trim().toUpperCase(); if(categories.map(getLabel).map(c=>c.toUpperCase()).includes(cleanCat)) { showToast('Kategori sudah ada!', 'error'); return; } setCategories(Array.from(new Set([...(categories||[]).map(getLabel).map(c=>c.toUpperCase()), cleanCat])).sort()); setNewCat(''); playSound('pop', isSoundOn); } }} className={`px-4 py-2 font-bold text-[#18181B] rounded-lg ${colors.goldBg}`}><Plus size={16}/></button>
                  </div>
                  <div className="flex flex-col gap-2">
                     {Array.from(new Set((categories || []).map(getLabel))).sort().map((label, i) => (
                        <div key={i} className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex justify-between items-center border ${colors.border} bg-[#F8FAFC] dark:bg-[#27272A]`}>
                           {label} 
                           <div className="flex gap-2">
                              <button onClick={() => { playSound('pop', isSoundOn); setEditGenericModal({type:'cat', idOrIdx: label, val1: label}); }} className="${colors.gold} hover:scale-110"><Edit size={16}/></button>
                              <button onClick={() => handleDeleteCat(label)} className="text-red-500 hover:scale-110"><Trash2 size={16}/></button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm`}>
                  <h3 className={`font-bold text-lg mb-4 ${colors.text}`}>Daftar Satuan (Unit)</h3>
                  <div className="flex gap-2 mb-4">
                     <input type="text" className={`flex-1 p-2 rounded-lg border ${colors.border} bg-transparent ${colors.text} outline-none`} placeholder="Satuan Baru..." value={newUnit} onChange={e=>setNewUnit(e.target.value)} />
                     <button onClick={() => { if(newUnit){ const cleanUnit = newUnit.trim().toLowerCase(); if(units.map(getLabel).map(u=>u.toLowerCase()).includes(cleanUnit)) { showToast('Satuan sudah ada!', 'error'); return; } setUnits(Array.from(new Set([...(units||[]).map(getLabel).map(u=>u.toLowerCase()), cleanUnit])).sort()); setNewUnit(''); playSound('pop', isSoundOn); } }} className={`px-4 py-2 font-bold text-[#18181B] rounded-lg ${colors.goldBg}`}><Plus size={16}/></button>
                  </div>
                  <div className="flex flex-col gap-2">
                     {Array.from(new Set((units || []).map(getLabel))).sort().map((label, i) => (
                        <div key={i} className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex justify-between items-center border ${colors.border} bg-[#F8FAFC] dark:bg-[#27272A]`}>
                           {label} 
                           <div className="flex gap-2">
                              <button onClick={() => { playSound('pop', isSoundOn); setEditGenericModal({type:'unit', idOrIdx: label, val1: label}); }} className="${colors.gold} hover:scale-110"><Edit size={16}/></button>
                              <button onClick={() => handleDeleteUnit(label)} className="text-red-500 hover:scale-110"><Trash2 size={16}/></button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {/* 8. TAB DATABASE & BACKUP (MULTISELECT AKTIF & WORKING) */}
         {activeTab === 'database' && (
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm max-w-4xl`}>
               <h3 className={`font-bold text-lg mb-2 ${colors.text}`}>Ekspor & Impor Parsial Database Utama</h3>
               <p className="text-xs text-gray-400 mb-6 leading-relaxed">Pilih modul data apa saja yang ingin kamu simpan ke dalam file backup .json secara dinamis.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Kiri: Kotak Seleksi Checkbox */}
                  <div className="md:col-span-2 space-y-4 border-r pr-0 md:pr-6 border-dashed border-gray-200 dark:border-gray-800">
                     <div className="flex justify-between items-center bg-[#F8FAFC] dark:bg-[#27272A]/40 p-3 rounded-xl border">
                        <span className={`text-xs font-bold ${colors.text}`}>Pilih Modul Cadangan Data</span>
                        <button type="button" onClick={handleSelectAllExports} className="text-xs font-black text-[#D4AF37] hover:underline">
                           {selectedExports.length === exportOptionsList.length ? 'Batalkan Semua' : 'Pilih Semua Modul'}
                        </button>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {exportOptionsList.map(item => {
                           const isChecked = selectedExports.includes(item.id);
                           return (
                              <div 
                                 key={item.id} 
                                 onClick={() => toggleExportOption(item.id)}
                                 className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:border-[#D4AF37] ${isChecked ? 'border-[#D4AF37] bg-yellow-500/5' : 'bg-transparent'}`}
                              >
                                 <span className={`text-xs font-semibold ${colors.text}`}>{item.label}</span>
                                 {isChecked ? (
                                    <CheckSquare size={18} className="text-[#D4AF37]" />
                                 ) : (
                                    <Square size={18} className="text-gray-400" />
                                 )}
                              </div>
                           )
                        })}
                     </div>

                     <button 
                        type="button" 
                        onClick={handleExportDB} 
                        className={`w-full py-3 rounded-xl font-bold text-[#18181B] shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] ${selectedExports.length === 0 ? 'bg-gray-400 cursor-not-allowed' : colors.goldBg}`}
                        disabled={selectedExports.length === 0}
                     >
                        <DownloadCloud size={18}/> Download {selectedExports.length} Modul Terpilih (.json)
                     </button>
                  </div>

                  {/* Kanan: Kotak Restore / Impor */}
                  <div className="flex flex-col justify-center p-5 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-900/10 h-fit my-auto">
                     <UploadCloud size={40} className="mb-3 text-orange-500 mx-auto" />
                     <h4 className={`font-black text-center text-sm mb-1 ${colors.text}`}>Impor / Pulihkan Data</h4>
                     <p className="text-[10px] text-center text-gray-500 mb-4 leading-normal">Unggah file JSON cadangan untuk memperbarui database tokomu.</p>
                     <input type="file" accept=".json" className="hidden" ref={importDbRef} onChange={handleImportDB} />
                     <button type="button" onClick={() => { playSound('pop', isSoundOn); importDbRef.current.click(); }} className="px-4 py-2.5 bg-orange-500 text-white font-black rounded-xl text-xs w-full shadow-sm hover:bg-orange-600 transition-colors">Pilih File Backup</button>
                  </div>
               </div>
            </div>
         )}
      </div>

      {/* MODAL TAMBAH/EDIT GROSIR */}
      {isGrosirModal && (
         <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border}`}>
               <div className="flex justify-between items-center mb-4 border-b border-solid border-gray-200 dark:border-gray-800 pb-2">
                 <h3 className={`text-lg font-bold flex items-center gap-2 ${colors.text}`}><Tags size={20} className="${colors.gold}"/> {wForm.id ? 'Edit' : 'Buat'} Aturan Grosir</h3>
                 <button onClick={() => setIsGrosirModal(false)} className="text-red-500"><X size={20}/></button>
               </div>
               
               <form onSubmit={saveWholesale} className="space-y-4">
                  <div>
                     <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Pilih Produk</label>
                     <select required className={`w-full p-2.5 rounded-xl border ${colors.border} bg-white dark:bg-[#1e1e1e] outline-none text-sm`} value={wForm.productId} onChange={e=>setWForm({...wForm, productId: e.target.value})} disabled={wForm.id !== ''}>
                        <option value="">-- Cari Produk --</option>
                        {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                  </div>
                  
                  {selectedProductOriginalPrice > 0 && (
                     <div className="p-3 bg-[#F8FAFC] dark:bg-[#27272A]/40 border border-dashed rounded-xl flex justify-between text-xs">
                        <span className="text-gray-400 font-medium">Harga Ritel Saat Ini:</span>
                        <span className="font-black text-[#D4AF37]">Rp {formatIDR(selectedProductOriginalPrice)}</span>
                     </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Minimal Beli</label>
                        <input required type="text" inputMode="decimal" placeholder="Cth: 12" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm`} value={wForm.minQtyStr !== undefined ? wForm.minQtyStr : (wForm.minQty || '')} onChange={e=>setWForm({...wForm, minQty: parseIDR(e.target.value), minQtyStr: smartFormatInput(e.target.value)})} />
                     </div>
                     <div>
                        <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Harga Jadi Satuan</label>
                        <input required type="text" inputMode="decimal" placeholder="Harus di bawah harga awal" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm font-bold text-green-500`} value={wForm.wholesalePrice} onChange={e=>setWForm({...wForm, wholesalePrice: smartFormatInput(e.target.value)})} />
                     </div>
                  </div>
                  <button type="submit" className="w-full py-3.5 mt-2 rounded-xl text-[#18181B] font-bold ${colors.goldBg} shadow-md">Simpan Aturan</button>
               </form>
            </div>
         </div>
      )}

      {/* MODAL EDIT/BUAT DISKON PROMO */}
      {isPromoModal && (
         <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
            <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] overflow-y-auto custom-scrollbar`}>
               <div className="flex justify-between items-center mb-4 border-b border-solid border-gray-200 dark:border-gray-800 pb-2">
                 <h3 className={`text-xl font-bold flex items-center gap-2 ${colors.text}`}><Ticket size={20} className="${colors.gold}"/> {pForm.id ? 'Edit' : 'Buat'} Promo Diskon</h3>
                 <button type="button" onClick={() => setIsPromoModal(false)} className="text-red-500"><X size={20}/></button>
               </div>
               
               <form onSubmit={savePromo} className="space-y-4">
                  <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nama Event Promo</label><input required type="text" placeholder="Misal: Promo Akhir Tahun" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm`} value={pForm.name} onChange={e=>setPForm({...pForm, name: e.target.value})} /></div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-[#1e1e1e] border border-dashed rounded-xl border-gray-300 dark:border-gray-700">
                     <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Target Produk</label>
                     <select className={`w-full p-2.5 mb-2 rounded-xl border ${colors.border} bg-white dark:bg-[#2a2a24] outline-none text-sm`} value={pForm.targetType} onChange={e=>setPForm({...pForm, targetType: e.target.value, targetItems: e.target.value === 'semua' ? [] : (pForm.targetItems || [])})}>
                        <option value="semua">Berlaku Untuk Semua Produk</option>
                        <option value="spesifik">Pilih Produk Spesifik (Multi-select)</option>
                     </select>

                     {pForm.targetType === 'spesifik' && (
                        <div className="space-y-2">
                           <select className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#2a2a24] outline-none text-xs`} onChange={(e) => { if(e.target.value) { addPromoItem(e.target.value); e.target.value = ''; } }}>
                              <option value="">+ Klik untuk Tambah Produk ke Daftar Promo</option>
                              {products?.filter(p => !(pForm.targetItems || []).includes(p.id.toString())).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                           <div className="flex flex-wrap gap-1 mt-2">
                              {(pForm.targetItems || []).map(id => {
                                 const pInfo = products?.find(x => String(x.id) === String(id));
                                 return <span key={id} className="bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">{pInfo?.name} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removePromoItem(id)}/></span>
                              })}
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-[#1e1e1e] border border-dashed rounded-xl border-gray-300 dark:border-gray-700">
                     <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Target Pelanggan</label>
                     <select className={`w-full p-2.5 mb-2 rounded-xl border ${colors.border} bg-white dark:bg-[#2a2a24] outline-none text-sm`} value={pForm.targetCustomerType} onChange={e=>setPForm({...pForm, targetCustomerType: e.target.value, targetCustomers: e.target.value === 'semua' ? [] : (pForm.targetCustomers || [])})}>
                        <option value="semua">Berlaku Untuk Semua Pembeli</option>
                        <option value="spesifik">Khusus Member Tertentu (Multi-select)</option>
                     </select>

                     {pForm.targetCustomerType === 'spesifik' && (
                        <div className="space-y-2">
                           <select className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#2a2a24] outline-none text-xs`} onChange={(e) => { if(e.target.value) { addPromoCustomer(e.target.value); e.target.value = ''; } }}>
                              <option value="">+ Klik untuk Tambah Member ke Daftar Promo</option>
                              {customers?.filter(c => c.id !== 1 && !(pForm.targetCustomers || []).includes(c.id.toString())).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                           <div className="flex flex-wrap gap-1 mt-2">
                              {(pForm.targetCustomers || []).map(id => {
                                 const cInfo = customers?.find(x => String(x.id) === String(id));
                                 return <span key={id} className="bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">{cInfo?.name} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removePromoCustomer(id)}/></span>
                              })}
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Tgl Mulai</label><input required type="date" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm [color-scheme:light] dark:[color-scheme:dark]`} value={pForm.startDate} onChange={e=>setPForm({...pForm, startDate: e.target.value})} /></div>
                     <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Tgl Selesai</label><input required type="date" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm [color-scheme:light] dark:[color-scheme:dark]`} value={pForm.endDate} onChange={e=>setPForm({...pForm, endDate: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Tipe Diskon</label>
                        <select className={`w-full p-2.5 rounded-xl border ${colors.border} bg-white dark:bg-[#1e1e1e] outline-none text-sm`} value={pForm.discType} onChange={e=>setPForm({...pForm, discType: e.target.value})}>
                           <option value="%">Persentase (%)</option><option value="Rp">Nominal (Rp)</option>
                        </select>
                     </div>
                     <div>
                        <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nilai Diskon</label>
                        <input required type="text" inputMode="decimal" placeholder={pForm.discType==='%' ? 'Cth: 10' : 'Cth: 5000'} className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm`} value={pForm.discValueStr !== undefined ? pForm.discValueStr : (pForm.discValue || '')} onChange={e=>{ let v = e.target.value; if(pForm.discType==='%'){ let c = v.replace(/[^0-9,.%]/g, ''); if(c.endsWith('.')) c=c.slice(0,-1)+','; setPForm({...pForm, discValue: parseIDR(c), discValueStr: c}); } else { setPForm({...pForm, discValue: parseIDR(v), discValueStr: smartFormatInput(v)}); } }} />
                     </div>
                  </div>
                  <button type="submit" className="w-full py-3.5 mt-2 rounded-xl text-[#18181B] font-bold ${colors.goldBg} shadow-md hover:bg-blue-700">Simpan Aturan Promo</button>
               </form>
            </div>
         </div>
      )}

      {/* MODAL USER / HAK AKSES */}
      {isUserModal && (
         <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] overflow-y-auto custom-scrollbar`}>
              <h3 className={`text-xl font-bold mb-4 ${colors.text}`}>Manajemen Akun User</h3>
              <form onSubmit={saveUser} className="space-y-4">
                <div className="flex flex-col items-center mb-2">
                   <label className={`relative w-20 h-20 rounded-full ${colors.creamBg} border-2 border-dashed ${colors.border} flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors overflow-hidden group`}>
                      {uForm.avatar ? <img src={uForm.avatar} className="w-full h-full object-cover" alt="Ava" /> : <Camera size={24} />}
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, (res) => setUForm({...uForm, avatar: res}), showToast)} />
                   </label>
                   <span className="text-[10px] mt-1 text-gray-400">Foto Profil</span>
                </div>
                <div><label className={`block text-xs mb-1 ${colors.textMuted}`}>Nama Lengkap</label><input required type="text" className={`w-full p-2 border rounded-lg bg-transparent ${colors.text} ${colors.border} outline-none`} value={uForm.name} onChange={e=>setUForm({...uForm, name: e.target.value})} /></div>
                <div><label className={`block text-xs mb-1 ${colors.textMuted}`}>Username Login</label><input required type="text" className={`w-full p-2 border rounded-lg bg-transparent ${colors.text} ${colors.border} outline-none font-mono lowercase`} value={uForm.username} onChange={e=>setUForm({...uForm, username: e.target.value})} disabled={uForm.id === 1} /></div>
                <div><label className={`block text-xs mb-1 ${colors.textMuted}`}>Email (Opsional)</label><input type="email" className={`w-full p-2 border rounded-lg bg-transparent ${colors.text} ${colors.border} outline-none`} value={uForm.email} onChange={e=>setUForm({...uForm, email: e.target.value})} /></div>
                <div><label className={`block text-xs mb-1 ${colors.textMuted}`}>Password</label><input type="text" className={`w-full p-2 border rounded-lg bg-transparent ${colors.text} ${colors.border} outline-none`} value={uForm.password} onChange={e=>setUForm({...uForm, password: e.target.value})} placeholder={uForm.id ? "Kosongkan jika tidak diganti" : "Ketik Password..."} required={!uForm.id} /></div>
                <div>
                   <label className={`block text-xs mb-1 ${colors.textMuted}`}>Tipe Akun Dasar</label>
                   <select className={`w-full p-2 border rounded-lg bg-white dark:bg-[#1e1e1e] ${colors.text} ${colors.border} outline-none`} value={uForm.role} onChange={e=>setUForm({...uForm, role: e.target.value})} disabled={uForm.id === 1}>
                      <option value="kasir">Staff (Bisa Kustom Akses)</option><option value="admin">Admin Master (Full Akses)</option>
                   </select>
                </div>
                {uForm.role === 'kasir' && (
                  <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700">
                     <label className={`block text-xs font-bold mb-2 ${colors.textMuted}`}>Hak Akses Menu</label>
                     <div className="grid grid-cols-2 gap-2">
                        {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'pos', label: 'Kasir POS' }, { id: 'produk', label: 'Stok' }, { id: 'penjualan', label: 'Penjualan' }, { id: 'pembelian', label: 'Pembelian' }, { id: 'kontak', label: 'Kontak' }, { id: 'laporan', label: 'Laporan' }].map(mod => (
                           <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={(uForm.permissions || []).includes(mod.id)} onChange={() => handlePermissionToggle(mod.id)} className="rounded text-[#D4AF37] focus:ring-[#D4AF37]" /><span className={colors.text}>{mod.label}</span></label>
                        ))}
                     </div>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { playSound('pop', isSoundOn); setIsUserModal(false); }} className={`flex-1 py-3 border rounded-xl font-bold ${colors.text} ${colors.border}`}>Batal</button>
                  <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg}`}>Simpan User</button>
                </div>
              </form>
            </div>
         </div>
      )}

      {/* MODAL EDIT INLINE RENAME (FINANCE, KATEGORI, SATUAN) */}
      {editGenericModal && (
         <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
            <form onSubmit={saveGenericEdit} className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border}`}>
               <h3 className={`text-lg font-bold mb-4 ${colors.text}`}>Edit Data</h3>
               <div className="space-y-4">
                  <div>
                     <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nama Baru</label>
                     <input required autoFocus type="text" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={editGenericModal.val1} onChange={e=>setEditGenericModal({...editGenericModal, val1: e.target.value})} />
                  </div>
               </div>
               <div className="flex gap-3 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700 mt-4">
                 <button type="button" onClick={() => setEditGenericModal(null)} className={`flex-1 py-2 border rounded-xl font-bold ${colors.text} ${colors.border} hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors`}>Batal</button>
                 <button type="submit" className={`flex-1 py-2 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90 transition-colors`}>Simpan</button>
               </div>
            </form>
         </div>
      )}

      {deleteUsr && <DeleteConfirmModal title="Hapus Akun User?" desc="Yakin hapus akun ini?" btnText="Hapus" onConfirm={() => { setUsers((users||[]).filter(u => u !== deleteUsr)); setDeleteUsr(null); showToast('User dihapus', 'success'); }} onCancel={() => setDeleteUsr(null)} colors={colors} isSoundOn={isSoundOn} />}
      {deleteFin && <DeleteConfirmModal title="Hapus Akun Keuangan?" desc="Yakin hapus akun ini?" btnText="Hapus" onConfirm={() => { setFinancialAccounts((financialAccounts||[]).filter(f => f.id !== deleteFin)); setDeleteFin(null); showToast('Akun dihapus', 'success'); }} onCancel={() => setDeleteFin(null)} colors={colors} isSoundOn={isSoundOn} />}
    </div>
  );
}
