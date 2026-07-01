import React, { useState, useRef, useMemo } from 'react';
import { Lock, Store, Plus, Edit, Trash2, X, DownloadCloud, UploadCloud, Tags, Gift, Ticket, Camera, CheckSquare, Square, Image } from 'lucide-react';
import { formatIDR, parseIDR, smartFormatInput, playSound, handleImageUpload, formatWhatsAppNumber } from '../utils/helpers';
import DateInput from '../components/DateInput';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';
import SearchableSelect from '../components/ui/SearchableSelect';

export default function SettingsPage({ 
  colors, user, showToast, isSoundOn, 
  storeInfo = {}, setStoreInfo, users = [], setUsers, categories = [], setCategories, units = [], setUnits, 
  financialAccounts = [], setFinancialAccounts, setAllDatabase, products = [], setProducts, customers = [],
  sales = [], purchases = [], accounting = [], suppliers = []
}) {
  if (!user || user.role !== 'admin') return <div className="p-10 text-center text-red-500 font-bold text-2xl mt-20 flex flex-col items-center"><Lock size={64} className="mb-4 opacity-50"/>Akses Ditolak. Khusus Admin.</div>;
  
  const [activeTab, setActiveTab] = useState('toko');
  const importDbRef = useRef(null);

  const [pendingTabSwitch, setPendingTabSwitch] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // --- SELF-HEALING: PURGE GHOST USERS ---
  React.useEffect(() => {
     if (users && users.length > 0) {
        const validUsers = users.filter(u => u && u.id && u.username && String(u.username).trim() !== '' && u.name && String(u.name).trim() !== '');
        if (validUsers.length < users.length) {
           setUsers(validUsers);
        }
     }
  }, [users, setUsers]);

  // --- STATE PROFIL TOKO ---
  const [sName, setSName] = useState(storeInfo.name || 'MONIKA MULYA');
  const [sTagline, setSTagline] = useState(storeInfo.tagline || '');
  const [sAddress, setSAddress] = useState(storeInfo.address || '');
  const [sPhone, setSPhone] = useState(storeInfo.phone || '');
  const [sLogo, setSLogo] = useState(storeInfo.logo || null);
  const [sLogoNota, setSLogoNota] = useState(storeInfo.logoNota || null);
  const [sBanner, setSBanner] = useState(storeInfo.banner || null);
  const [sOngkir, setSOngkir] = useState(storeInfo.ongkirPerKm || 0);
  
  const [sPrefSales, setSPrefSales] = useState(storeInfo.prefixSales || 'INV');
  const [sPrefPurch, setSPrefPurch] = useState(storeInfo.prefixPurchase || 'PO');
  const [sPointMult, setSPointMult] = useState(storeInfo.pointMultiplier || 10000);
  const [sPointMultStr, setSPointMultStr] = useState(formatIDR(storeInfo.pointMultiplier || 10000));
  const [sPointRew, setSPointRew] = useState(storeInfo.pointReward || 1);
  const [sPointRewStr, setSPointRewStr] = useState(formatIDR(storeInfo.pointReward || 1));
  const [sPointValue, setSPointValue] = useState(storeInfo.pointValue || 100);
  const [sPointValueStr, setSPointValueStr] = useState(formatIDR(storeInfo.pointValue || 100));
  const [sMinPointRedeem, setSMinPointRedeem] = useState(storeInfo.minPointRedeem || 100);
  const [sMinPointRedeemStr, setSMinPointRedeemStr] = useState(formatIDR(storeInfo.minPointRedeem || 100));

  const [deleteUsr, setDeleteUsr] = useState(null);
  const [deleteFin, setDeleteFin] = useState(null);

  const isTokoChanged = 
     sName !== (storeInfo.name || 'MONIKA MULYA') ||
     sTagline !== (storeInfo.tagline || '') ||
     sAddress !== (storeInfo.address || '') ||
     sPhone !== (storeInfo.phone || '') ||
     sLogo !== (storeInfo.logo || null) ||
     sLogoNota !== (storeInfo.logoNota || null) ||
     sBanner !== (storeInfo.banner || null) ||
     sPrefSales !== (storeInfo.prefixSales || 'INV') ||
     sPrefPurch !== (storeInfo.prefixPurchase || 'PO');

  const isHargaChanged = 
     Number(sPointMult) !== (storeInfo.pointMultiplier || 10000) ||
     Number(sPointRew) !== (storeInfo.pointReward || 1) ||
     Number(sPointValue) !== (storeInfo.pointValue || 100) ||
     Number(sMinPointRedeem) !== (storeInfo.minPointRedeem || 100) ||
     Number(sOngkir) !== (storeInfo.ongkirPerKm || 0);

  const resetTokoState = () => {
     setSName(storeInfo.name || 'MONIKA MULYA');
     setSTagline(storeInfo.tagline || '');
     setSAddress(storeInfo.address || '');
     setSPhone(storeInfo.phone || '');
     setSLogo(storeInfo.logo || null);
     setSLogoNota(storeInfo.logoNota || null);
     setSBanner(storeInfo.banner || null);
     setSPrefSales(storeInfo.prefixSales || 'INV');
     setSPrefPurch(storeInfo.prefixPurchase || 'PO');
  };

  const resetHargaState = () => {
     setSPointMult(storeInfo.pointMultiplier || 10000);
     setSPointRew(storeInfo.pointReward || 1);
     setSPointRewStr(formatIDR(storeInfo.pointReward || 1));
     setSOngkir(storeInfo.ongkirPerKm || 0);
  };

  const handleTabClick = (tabId) => {
      playSound('pop', isSoundOn);
      if (activeTab === tabId) return;

      let hasChanges = false;
      if (activeTab === 'toko' && isTokoChanged) hasChanges = true;
      if (activeTab === 'harga' && isHargaChanged) hasChanges = true;

      if (hasChanges) {
          setPendingTabSwitch(tabId);
          setShowUnsavedModal(true);
      } else {
          if (activeTab === 'toko') resetTokoState();
          if (activeTab === 'harga') resetHargaState();
          setActiveTab(tabId);
      }
  };

  const saveHargaSettings = (e) => {
     if(e) e.preventDefault();
     playSound('success', isSoundOn);
     setStoreInfo({ 
         ...storeInfo, 
         pointMultiplier: Number(sPointMult), 
         pointReward: Number(sPointRew),
         pointValue: Number(sPointValue),
         minPointRedeem: Number(sMinPointRedeem),
         ongkirPerKm: Number(sOngkir) || 0
     });
     showToast('Pengaturan poin & ongkir diperbarui.', 'success');
  };

  const saveStoreInfo = (e) => {
     e.preventDefault(); 
     playSound('success', isSoundOn);
     setStoreInfo({ 
       ...storeInfo, name: sName, tagline: sTagline, address: sAddress, phone: sPhone, logo: sLogo, logoNota: sLogoNota, banner: sBanner,
       ongkirPerKm: Number(sOngkir) || 0, prefixSales: sPrefSales, prefixPurchase: sPrefPurch
     });
     showToast('Pengaturan profil & kode nota berhasil diperbarui.', 'success');
  };

  // --- LOGIKA HARGA GROSIR ---
  const wholesales = storeInfo.wholesales || [];
  const [isGrosirModal, setIsGrosirModal] = useState(false);
  const [wForm, setWForm] = useState({ productId: '', tiers: [{ id: '', minQty: '', wholesalePrice: '' }] });

  const selectedProductOriginalPrice = useMemo(() => {
     if (!wForm.productId) return 0;
     const prod = products.find(p => String(p.id) === String(wForm.productId));
     return prod ? prod.price : 0;
  }, [wForm.productId, products]);

  const selectedProductCostPrice = useMemo(() => {
     if (!wForm.productId) return 0;
     const prod = products.find(p => String(p.id) === String(wForm.productId));
     return prod ? (prod.cost || 0) : 0;
  }, [wForm.productId, products]);

  const saveWholesale = (e) => {
     e.preventDefault(); 
     playSound('success', isSoundOn);
     let newWholesales = [...wholesales];
     if (!wForm.productId) { showToast('Pilih produk terlebih dahulu!', 'error'); return; }
     
     if (!wForm.tiers || wForm.tiers.length === 0) { showToast('Tambahkan minimal 1 lapis grosir!', 'error'); return; }

     for (let t of wForm.tiers) {
        if (!t.minQty || !t.wholesalePrice) { showToast('Harap lengkapi semua baris lapis grosir!', 'error'); return; }
        const minQ = Number(parseIDR(t.minQty));
        const wP = Number(parseIDR(t.wholesalePrice));
        if (minQ <= 1) { showToast('Minimal beli harus lebih dari 1!', 'error'); return; }
        if (wP >= selectedProductOriginalPrice) { showToast(`Harga grosir (min ${minQ}) harus di bawah harga ritel!`, 'error'); return; }
        if (wP <= selectedProductCostPrice) { showToast(`Harga grosir (min ${minQ}) harus di atas harga modal!`, 'error'); return; }
     }

     const minQtys = wForm.tiers.map(t => Number(parseIDR(t.minQty)));
     if (new Set(minQtys).size !== minQtys.length) {
        showToast('Terdapat Minimal Beli yang sama di dalam aturan ini!', 'error'); return;
     }

     newWholesales = newWholesales.filter(w => String(w.productId) !== String(wForm.productId));
     
     const timestamp = Date.now();
     wForm.tiers.forEach((t, i) => {
        newWholesales.push({
           id: t.id || `${timestamp}_${i}`,
           productId: wForm.productId,
           minQty: Number(parseIDR(t.minQty)),
           wholesalePrice: Number(parseIDR(t.wholesalePrice))
        });
     });

     setStoreInfo({ ...storeInfo, wholesales: newWholesales });
     setIsGrosirModal(false);
     showToast('Aturan grosir disimpan', 'success');
  };

  const deleteWholesalesByProduct = (productId) => {
     playSound('pop', isSoundOn);
     setStoreInfo({ ...storeInfo, wholesales: wholesales.filter(w => String(w.productId) !== String(productId)) });
     showToast('Semua aturan grosir produk dihapus', 'success');
  };



  // --- LOGIKA DISKON PROMO ---
  const promos = storeInfo.promos || [];
  const [isPromoModal, setIsPromoModal] = useState(false);
  const [pForm, setPForm] = useState({ id: '', name: '', targetType: 'semua', targetItems: [], targetCustomerType: 'semua', targetCustomers: [], startDate: '', endDate: '', discType: '%', discValue: '' });
  const [promoSimProductId, setPromoSimProductId] = useState('');

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
    <div className="h-full flex flex-col relative overflow-hidden -m-4 md:-m-6 bg-gray-50 dark:bg-[#121212]">
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar">
        <div className="flex flex-col w-full pb-10 select-none">
        
        <div className="flex items-center shrink-0 mb-4 overflow-x-auto custom-scrollbar pb-2 sm:pb-0 min-h-[44px]">
           <div className={`flex items-center rounded-lg p-1 ${colors.creamBg} border ${colors.border} w-fit h-fit shrink-0`}>
           {[
             { id: 'toko', label: 'Profil Toko' }, 
             { id: 'harga', label: 'Harga & Poin' }, 
             { id: 'akun', label: 'Akun & Akses' }, 
             { id: 'kategori', label: 'Kategori & Satuan' }, 
             { id: 'database', label: 'Database' }
           ].map(t => (
             <button 
               key={t.id} 
               onClick={() => handleTabClick(t.id)} 
               className={`w-[110px] sm:w-[130px] py-1.5 text-[13px] sm:text-sm font-bold rounded-md transition-all flex items-center justify-center whitespace-nowrap overflow-hidden text-ellipsis ${activeTab === t.id ? `${colors.goldBg} text-[#18181B] shadow` : `${colors.textMuted} ${colors.goldHoverText}`}`}
             >
               {t.label}
             </button>
           ))}
           </div>
        </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
         
         {/* 1. PROFIL TOKO & ATURAN KODE NOTA */}
         {activeTab === 'toko' && (
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm w-full`}>
               <form onSubmit={saveStoreInfo} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Kiri: Gambar, Alamat, No WA */}
                    <div className="md:col-span-5 flex flex-col gap-4">
                       <div className="flex flex-wrap gap-4 items-end mb-2">
                         <div className="flex flex-col items-start">
                           <label className={`relative w-24 h-24 rounded-xl ${colors.creamBg} border-2 border-dashed ${colors.border} flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors overflow-hidden group`}>
                              {sLogo ? <img src={sLogo} className="w-full h-full object-cover" alt="Logo" /> : <Store size={32} />}
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setSLogo, showToast, 600, 0.85)} />
                           </label>
                           <span className="text-[10px] mt-2 text-gray-400 font-bold uppercase w-full text-center">Logo Aplikasi</span>
                         </div>
                         <div className="flex flex-col items-start">
                           <label className={`relative w-24 h-24 rounded-xl ${colors.creamBg} border-2 border-dashed ${colors.border} flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors overflow-hidden group`}>
                              {sLogoNota ? <img src={sLogoNota} className="w-full h-full object-cover" alt="Logo Nota" /> : <Store size={32} />}
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setSLogoNota, showToast, 600, 0.85)} />
                           </label>
                           <span className="text-[10px] mt-2 text-gray-400 font-bold uppercase w-full text-center">Logo Nota</span>
                         </div>
                         <div className="flex flex-col items-start flex-1">
                           <label className={`relative w-full h-24 rounded-xl ${colors.creamBg} border-2 border-dashed ${colors.border} flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors overflow-hidden group`}>
                              {sBanner ? <img src={sBanner} className="w-full h-full object-cover" alt="Banner" /> : <Image size={32} />}
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setSBanner, showToast, 1920, 0.85)} />
                           </label>
                           <span className="text-[10px] mt-2 text-gray-400 font-bold uppercase w-full text-center">Banner Latar</span>
                         </div>
                       </div>
                       
                       <div>
                          <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Alamat Lengkap Toko</label>
                          <textarea rows="3" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sAddress} onChange={e => setSAddress(e.target.value)}></textarea>
                       </div>
                       <div>
                          <label className={`block text-xs font-bold mb-1 ${colors.text}`}>No. WhatsApp Toko</label>
                          <input type="text" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sPhone} onChange={e => setSPhone(formatWhatsAppNumber(e.target.value))} placeholder="08..." />
                       </div>
                    </div>

                    {/* Kanan: Nama, Tagline, Kode Nota */}
                    <div className="md:col-span-7 flex flex-col gap-4">
                       <div>
                          <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nama Toko</label>
                          <input required type="text" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none font-black text-xl focus:ring-1 focus:ring-[#D4AF37]`} value={sName} onChange={e => setSName(e.target.value)} />
                       </div>
                       <div>
                          <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Tagline / Moto Toko</label>
                          <input type="text" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sTagline} onChange={e => setSTagline(e.target.value)} placeholder="Bismillah / Melayani Grosir & Ritel" />
                       </div>
                       
                       <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-6 mt-4">
                          <h4 className="text-sm font-extrabold mb-4 text-[#D4AF37]">Konfigurasi Penomoran Kode Nota Kasir</h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Prefix Nota Jual (Sales)</label>
                                <input required type="text" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} font-mono uppercase outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sPrefSales} onChange={e => setSPrefSales(e.target.value)} placeholder="Cth: INV" />
                             </div>
                             <div>
                                <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Prefix Nota Beli (Purchase)</label>
                                <input required type="text" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} font-mono uppercase outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sPrefPurch} onChange={e => setSPrefPurch(e.target.value)} placeholder="Cth: PO" />
                             </div>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-3 italic">Profil toko akan ditampilkan pada aplikasi dan nota.</p>
                       </div>
                    </div>
                 </div>
                 <button type="submit" disabled={!isTokoChanged} className={`w-full py-3.5 rounded-xl text-center font-bold text-base shadow-md transition-all ${isTokoChanged ? `${colors.goldBg} text-[#18181B] hover:opacity-90` : 'bg-gray-300 dark:bg-[#27272A] text-gray-500 opacity-50 cursor-not-allowed'}`}>Simpan</button>
               </form>
            </div>
         )}

         {/* 2. TAB HARGA & PROMO */}
         {activeTab === 'harga' && (
            <div className="space-y-6 w-full">
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm w-full`}>
               <div className="flex justify-between items-center mb-6">
                  <h3 className={`font-bold text-lg flex items-center gap-2 ${colors.text}`}><Tags className={colors.gold}/> Harga Grosir</h3>
                  <button onClick={() => { playSound('pop', isSoundOn); setWForm({productId:'', tiers: [{ id: '', minQty: '', wholesalePrice: '' }]}); setIsGrosirModal(true); }} className={`px-4 py-2 rounded-xl text-[#18181B] text-sm font-bold ${colors.goldBg} hover:opacity-90 flex items-center gap-1 shadow-sm`}><Plus size={16}/> Tambah Aturan</button>
               </div>
               
               <div className="space-y-3">
                  {wholesales.length === 0 ? (
                     <p className="text-sm text-gray-500 italic text-center py-6">Belum ada aturan grosir aktif.</p>
                  ) : (
                     <table className={`w-full text-sm text-left ${colors.text}`}>
                        <thead className={`text-xs uppercase ${colors.creamBg} border-b ${colors.border}`}>
                           <tr>
                              <th className="py-3 px-4">Nama Produk</th>
                              <th className="py-3 px-4 text-right">Harga Ritel</th>
                              <th className="py-3 px-4 text-center">Lapis Grosir</th>
                              <th className="py-3 px-4 text-right">Harga Terendah</th>
                              <th className="py-3 px-4 text-center">Aksi</th>
                           </tr>
                        </thead>
                        <tbody>
                           {Object.values(wholesales.reduce((acc, w) => {
                               if(!acc[w.productId]) acc[w.productId] = [];
                               acc[w.productId].push(w);
                               return acc;
                           }, {})).map((productTiers, i) => {
                              const pInfo = products?.find(p => String(p.id) === String(productTiers[0].productId));
                              productTiers.sort((a,b) => b.minQty - a.minQty);
                              return (
                                 <tr key={i} className={`border-b border-dashed ${colors.border}`}>
                                    <td className="py-3 px-4 font-bold">{pInfo ? pInfo.name : 'Produk Tidak Ditemukan'}</td>
                                    <td className="py-3 px-4 text-right text-gray-400">Rp {formatIDR(pInfo?.price || 0)}</td>
                                    <td className={`py-3 px-4 text-center font-bold ${colors.gold}`}>{productTiers.length} Lapis</td>
                                    <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">Rp {formatIDR(productTiers[0].wholesalePrice)}</td>
                                    <td className="py-3 px-4 text-center">
                                       <div className="flex justify-center gap-2">
                                          <button onClick={() => { 
                                             playSound('pop', isSoundOn); 
                                             setWForm({
                                                productId: productTiers[0].productId,
                                                tiers: productTiers.map(t => ({ id: t.id, minQty: t.minQty, wholesalePrice: smartFormatInput(t.wholesalePrice) })).sort((a,b) => a.minQty - b.minQty)
                                             }); 
                                             setIsGrosirModal(true); 
                                          }} className="p-1.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:scale-105"><Edit size={16}/></button>
                                          <button onClick={() => deleteWholesalesByProduct(productTiers[0].productId)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-105"><Trash2 size={16}/></button>
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
         {/* 3. TAB PROMO DISKON OTOMATIS */}
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm w-full`}>
               <div className="flex justify-between items-center mb-6">
                  <h3 className={`font-bold text-lg flex items-center gap-2 ${colors.text}`}><Ticket className={colors.gold}/> Promo & Diskon</h3>
                  <button onClick={() => { playSound('pop', isSoundOn); setPForm({id:'', name:'', targetType:'semua', targetItems:[], targetCustomerType:'semua', targetCustomers:[], startDate:'', endDate:'', discType:'%', discValue:''}); setPromoSimProductId(''); setIsPromoModal(true); }} className={`px-4 py-2 rounded-xl text-[#18181B] text-sm font-bold ${colors.goldBg} hover:opacity-90 flex items-center gap-1 shadow-sm`}><Plus size={16}/> Tambah Promo</button>
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
                                          <button onClick={() => { playSound('pop', isSoundOn); setPForm({ ...pr, targetItems: tItems, targetCustomers: tCusts, targetCustomerType: pr.targetCustomerType || (pr.targetCustomer==='semua' ? 'semua':'spesifik') }); setPromoSimProductId(''); setIsPromoModal(true); }} className="p-1.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:scale-105"><Edit size={16}/></button>
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
         {/* 4. TAB POIN LOYALITAS CUSTOMER */}
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm w-full`}>
               <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${colors.text}`}><Gift className="text-orange-500"/> Poin Customer</h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div>
                        <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Setiap Kelipatan Belanja (Rp)</label>
                        <input required type="text" inputMode="decimal" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sPointMultStr !== undefined ? sPointMultStr : (sPointMult || '')} onChange={e => { setSPointMult(parseIDR(e.target.value)); setSPointMultStr(smartFormatInput(e.target.value)); }} />
                     </div>
                     <div>
                        <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Dapat Reward Poin Sejumlah</label>
                        <input required type="text" inputMode="decimal" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sPointRewStr !== undefined ? sPointRewStr : (sPointRew || '')} onChange={e => { setSPointRew(parseIDR(e.target.value)); setSPointRewStr(smartFormatInput(e.target.value)); }} />
                     </div>
                     <div>
                        <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Nilai Tukar 1 Poin (Rp)</label>
                        <input required type="text" inputMode="decimal" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sPointValueStr !== undefined ? sPointValueStr : (sPointValue || '')} onChange={e => { setSPointValue(parseIDR(e.target.value)); setSPointValueStr(smartFormatInput(e.target.value)); }} />
                     </div>
                     <div>
                        <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Minimal Poin untuk Ditukar</label>
                        <input required type="text" inputMode="decimal" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sMinPointRedeemStr !== undefined ? sMinPointRedeemStr : (sMinPointRedeem || '')} onChange={e => { setSMinPointRedeem(parseIDR(e.target.value)); setSMinPointRedeemStr(smartFormatInput(e.target.value)); }} />
                     </div>
                  </div>
                  <div className="p-3 bg-orange-500/5 rounded-xl border border-orange-500/20 text-[11px] text-gray-500 italic space-y-1">
                     <p><strong>[Perolehan]</strong> Sistem di Kasir otomatis menghitung total belanja pembeli. Misal diatur Rp 10.000 = 1 Poin, pembeli dengan total belanja Rp 35.000 otomatis tercatat mendapatkan 3 Poin tambahan.</p>
                     <p><strong>[Penukaran]</strong> Saat pelanggan memiliki poin mencapai batas Minimal Penukaran, fitur Tukar Poin akan muncul di halaman Kasir yang berfungsi sebagai potongan diskon (1 Poin memotong harga senilai Nilai Tukar).</p>
                  </div>
               </div>
            </div>
            
         {/* 5. TAB ONGKIR PENGIRIMAN */}
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm w-full`}>
               <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${colors.text}`}><Store className="text-blue-500"/> Ongkos Kirim</h3>
               <div className="space-y-4">
                  <div>
                     <label className={`block text-xs font-bold mb-2 ${colors.text}`}>Tarif Dasar Ongkir (Per Kilometer)</label>
                     <input required type="number" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={sOngkir} onChange={e => setSOngkir(e.target.value)} />
                  </div>
                  <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 text-[11px] text-gray-500 italic">
                     Biaya ini akan digunakan ketika Anda mengaktifkan opsi "Hitung Ongkir Otomatis (Maps)" di layar POS saat proses Checkout. Biaya akan dikalikan dengan estimasi jarak dari toko ke alamat pengiriman.
                  </div>
               </div>
            </div>
            <button type="button" onClick={saveHargaSettings} disabled={!isHargaChanged} className={`w-full py-3.5 rounded-xl text-center font-bold text-base shadow-md transition-all ${isHargaChanged ? `${colors.goldBg} text-[#18181B] hover:opacity-90` : 'bg-gray-300 dark:bg-[#27272A] text-gray-500 opacity-50 cursor-not-allowed'}`}>Simpan</button>
            </div>
         )}

         {/* 5. HAK AKSES USER & AKUN KEUANGAN */}
         {activeTab === 'akun' && (
            <div className="space-y-6 w-full">
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
                         <td className="py-3 px-4 font-bold text-xs">{u.role === 'admin' ? <span className={"font-extrabold " + colors.gold}>ADMIN</span> : <span className={"font-medium " + colors.textMuted}>STAFF</span>}</td>
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
         {/* 6. TAB AKUN KEUANGAN (SAFE GUARDED) */}
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm w-full`}>
               <h3 className={`font-bold text-lg mb-2 ${colors.text}`}>Kelola Akun Keuangan</h3>
               <div className="flex gap-3 mb-6">
                  <div className="flex-1 flex gap-2">
                     <input type="text" className={`flex-1 p-2.5 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none`} placeholder="Ketik Nama Akun Baru..." value={newAccName} onChange={e=>setNewAccName(e.target.value)} />
                     <select className={`w-1/3 p-2.5 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none`} value={newAccType} onChange={e=>setNewAccType(e.target.value)}>
                         <option value="tunai">Tunai</option>
                         <option value="non-tunai">Non-Tunai</option>
                     </select>
                  </div>
                  <button onClick={addFinAccount} className={`px-5 py-2.5 font-bold text-[#18181B] rounded-lg ${colors.goldBg} flex gap-1 items-center shadow-sm shrink-0`}><Plus size={16}/> Tambah</button>
               </div>
               <div className="space-y-3">
                  {(financialAccounts || []).map(fa => (
                     <div key={fa.id} className={`flex justify-between items-center p-3 rounded-lg border ${colors.border} bg-gray-50 dark:bg-[#1e1e1e]`}>
                        <div className="flex items-center gap-2">
                           <p className={`font-bold ${colors.text}`}>{fa.name}</p>
                           <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${fa.type==='tunai'?'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                              {fa.type === 'non-tunai' ? 'Non-Tunai' : 'Tunai'}
                           </span>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => { playSound('pop', isSoundOn); setEditGenericModal({type:'fin', idOrIdx: fa.id, val1: fa.name, val2: fa.type || 'tunai'}); }} className="p-1.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:scale-105"><Edit size={16}/></button>
                           {fa.id !== 1 && <button onClick={() => setDeleteFin(fa.id)} className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-105"><Trash2 size={16}/></button>}
                        </div>
                     </div>
                  ))}
               </div>
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
                              <button onClick={() => { playSound('pop', isSoundOn); setEditGenericModal({type:'cat', idOrIdx: label, val1: label}); }} className={`${colors.gold} hover:scale-110`}><Edit size={16}/></button>
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
                              <button onClick={() => { playSound('pop', isSoundOn); setEditGenericModal({type:'unit', idOrIdx: label, val1: label}); }} className={`${colors.gold} hover:scale-110`}><Edit size={16}/></button>
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
            <div className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm w-full`}>
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
                  <div className="flex flex-col justify-center p-5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/10 h-full">
                     <UploadCloud size={40} className="mb-3 text-blue-500 mx-auto" />
                     <h4 className={`font-black text-center text-sm mb-1 ${colors.text}`}>Impor / Pulihkan Data</h4>
                     <p className="text-[10px] text-center text-gray-500 mb-4 leading-normal">Unggah file JSON cadangan untuk memperbarui database tokomu.</p>
                     <input type="file" accept=".json" className="hidden" ref={importDbRef} onChange={handleImportDB} />
                     <button type="button" onClick={() => { playSound('pop', isSoundOn); importDbRef.current.click(); }} className="px-4 py-2.5 bg-blue-500 text-white font-black rounded-xl text-xs w-full shadow-sm hover:bg-blue-600 transition-colors">Pilih File Backup</button>
                  </div>
               </div>
            </div>
         )}
      </div>

      {/* MODAL TAMBAH/EDIT GROSIR */}
      {isGrosirModal && (
         <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
            <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] overflow-y-auto custom-scrollbar`}>
               <div className="flex justify-between items-center mb-4 border-b border-solid border-gray-200 dark:border-gray-800 pb-2">
                 <h3 className={`text-lg font-bold flex items-center gap-2 ${colors.text}`}><Tags size={20} className={colors.gold}/> Kelola Lapis Grosir</h3>
                 <button onClick={() => setIsGrosirModal(false)} className="text-red-500"><X size={20}/></button>
               </div>
               
               <form onSubmit={saveWholesale} className="space-y-4">
                  <div>
                      <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Pilih Produk</label>
                     <div className="w-full">
                        {wForm.tiers && wForm.tiers.length > 0 && wForm.tiers[0].id !== '' ? (
                            <div className={`p-2.5 rounded-xl border ${colors.border} bg-gray-100 dark:bg-[#1e1e1e] text-sm opacity-70 cursor-not-allowed`}>
                               {products.find(p => String(p.id) === String(wForm.productId))?.name || 'Produk Tidak Ditemukan'}
                            </div>
                        ) : (
                            <SearchableSelect 
                                options={products} 
                                value={wForm.productId} 
                                onChange={(val) => setWForm({...wForm, productId: val})} 
                                placeholder="-- Cari Produk --" 
                                colors={colors} 
                            />
                        )}
                     </div>
                  </div>
                  
                  {selectedProductOriginalPrice > 0 && (
                     <div className="p-3 bg-[#F8FAFC] dark:bg-[#27272A]/40 border border-dashed rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between border-b pb-1 border-gray-200 dark:border-gray-800">
                           <span className="text-gray-400 font-medium">Harga Pokok (HPP):</span>
                           <span className="font-bold text-gray-700 dark:text-gray-300">Rp {formatIDR(selectedProductCostPrice)}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1 border-gray-200 dark:border-gray-800">
                           <span className="text-gray-400 font-medium">Harga Jual (Ritel):</span>
                           <span className="font-bold text-[#D4AF37]">Rp {formatIDR(selectedProductOriginalPrice)}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                           <span className="text-gray-400 font-medium">Margin Ritel Saat Ini:</span>
                           <span className="font-bold text-green-500">Rp {formatIDR(selectedProductOriginalPrice - selectedProductCostPrice)} ({Math.round(((selectedProductOriginalPrice - selectedProductCostPrice)/selectedProductCostPrice)*100) || 0}%)</span>
                        </div>
                     </div>
                  )}

                  {selectedProductOriginalPrice > 0 && (
                     <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 text-xs">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300">Bantu Hitung Harga Grosir (Strategi):</h4>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mb-2">Hitung rekomendasi harga dan salin hasilnya ke lapis grosir di bawah.</p>
                        
                        <div className="flex gap-2">
                           <div className="flex-1 relative">
                             <label className="text-[10px] text-gray-500 mb-1 block">Diskon dari Ritel</label>
                             <div className="relative">
                                <input id="calcDisc" type="number" placeholder="Cth: 10%" className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] outline-none text-xs`} onChange={(e) => {
                                   const p = Number(e.target.value);
                                   const resEl = document.getElementById('calcDiscRes');
                                   if(p > 0 && resEl) {
                                      const newPrice = selectedProductOriginalPrice - (selectedProductOriginalPrice * p / 100);
                                      resEl.textContent = 'Rp ' + formatIDR(newPrice);
                                   } else if (resEl) {
                                      resEl.textContent = '-';
                                   }
                                }} />
                                <span id="calcDiscRes" className="absolute right-2 top-2 text-[10px] font-bold text-green-600">-</span>
                             </div>
                           </div>
                           <div className="flex-1 relative">
                             <label className="text-[10px] text-gray-500 mb-1 block">Margin dari HPP</label>
                             <div className="relative">
                                <input id="calcMarg" type="number" placeholder="Cth: 15%" className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] outline-none text-xs`} onChange={(e) => {
                                   const p = Number(e.target.value);
                                   const resEl = document.getElementById('calcMargRes');
                                   if(p > 0 && resEl) {
                                      const newPrice = selectedProductCostPrice + (selectedProductCostPrice * p / 100);
                                      resEl.textContent = 'Rp ' + formatIDR(newPrice);
                                   } else if (resEl) {
                                      resEl.textContent = '-';
                                   }
                                }} />
                                <span id="calcMargRes" className="absolute right-2 top-2 text-[10px] font-bold text-green-600">-</span>
                             </div>
                           </div>
                        </div>
                     </div>
                  )}

                  <div className="space-y-3">
                     <div className={`flex justify-between items-center border-b pb-2 ${colors.border}`}>
                        <h4 className={`text-sm font-bold ${colors.text}`}>Lapisan (Tiers) Grosir</h4>
                        <button type="button" onClick={() => setWForm({...wForm, tiers: [...wForm.tiers, { id: '', minQty: '', wholesalePrice: '' }]})} className={`px-3 py-1 rounded text-xs font-bold ${colors.goldBg} text-[#18181B] hover:opacity-90`}>+ Tambah Lapis</button>
                     </div>
                     
                     <div className="max-h-[30vh] overflow-y-auto custom-scrollbar space-y-3 pr-1">
                        {wForm.tiers.map((t, idx) => (
                           <div key={idx} className={`p-3 rounded-xl border border-dashed ${colors.border} bg-gray-100 dark:bg-[#27272A] flex items-start gap-3`}>
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                 <div>
                                    <label className="block text-[10px] font-bold mb-1 text-gray-500">Minimal Beli</label>
                                    <input required type="text" inputMode="decimal" placeholder="Cth: 12" className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] outline-none text-xs placeholder-gray-400 dark:placeholder-gray-600`} value={t.minQtyStr !== undefined ? t.minQtyStr : (t.minQty || '')} onChange={e => {
                                       const newTiers = [...wForm.tiers];
                                       newTiers[idx] = { ...t, minQty: parseIDR(e.target.value), minQtyStr: smartFormatInput(e.target.value) };
                                       setWForm({...wForm, tiers: newTiers});
                                    }} />
                                 </div>
                                 <div>
                                    <label className="block text-[10px] font-bold mb-1 text-gray-500">Harga Grosir</label>
                                    <input required type="text" inputMode="decimal" placeholder="Di bawah ritel" className={`w-full p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#1e1e1e] outline-none text-xs font-bold text-blue-600 dark:text-blue-400 placeholder-gray-400 dark:placeholder-gray-600`} value={t.wholesalePrice} onChange={e => {
                                       const newTiers = [...wForm.tiers];
                                       newTiers[idx] = { ...t, wholesalePrice: smartFormatInput(e.target.value) };
                                       setWForm({...wForm, tiers: newTiers});
                                    }} />
                                 </div>
                              </div>
                              <button type="button" onClick={() => {
                                 const newTiers = [...wForm.tiers];
                                 newTiers.splice(idx, 1);
                                 setWForm({...wForm, tiers: newTiers});
                              }} className="p-2 mt-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16}/></button>
                           </div>
                        ))}
                        {wForm.tiers.length === 0 && (
                           <div className="text-center py-4 text-xs text-red-500 italic">Tambahkan minimal 1 lapis grosir!</div>
                        )}
                     </div>
                  </div>

                  <button type="submit" disabled={wForm.tiers.length === 0} className={`w-full py-3.5 mt-2 rounded-xl text-[#18181B] font-bold ${colors.goldBg} shadow-md disabled:opacity-50`}>Simpan Aturan</button>
               </form>
            </div>
         </div>
      )}

      {/* MODAL EDIT/BUAT DISKON PROMO */}
      {isPromoModal && (
         <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
            <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] overflow-y-auto custom-scrollbar`}>
               <div className="flex justify-between items-center mb-4 border-b border-solid border-gray-200 dark:border-gray-800 pb-2">
                 <h3 className={`text-xl font-bold flex items-center gap-2 ${colors.text}`}><Ticket size={20} className={colors.gold}/> {pForm.id ? 'Edit' : 'Buat'} Promo Diskon</h3>
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
                           <SearchableSelect 
                               options={products.filter(p => !(pForm.targetItems||[]).includes(String(p.id)))} 
                               value="" 
                               onChange={(val) => { if(val) addPromoItem(val); }} 
                               placeholder="-- Cari Produk ke Promo --" 
                               colors={colors} 
                           />
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
                           <SearchableSelect 
                               options={customers.filter(c => c.id !== 1 && !(pForm.targetCustomers||[]).includes(String(c.id)))} 
                               value="" 
                               onChange={(val) => { if(val) addPromoCustomer(val); }} 
                               placeholder="-- Cari Member ke Promo --" 
                               colors={colors} 
                           />
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
                     <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Tgl Mulai</label><DateInput className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm [color-scheme:light] dark:[color-scheme:dark]`} value={pForm.startDate} onChange={e=>setPForm({...pForm, startDate: e.target.value})} /></div>
                     <div><label className={`block text-xs font-bold mb-1 ${colors.text}`}>Tgl Selesai</label><DateInput className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm [color-scheme:light] dark:[color-scheme:dark]`} value={pForm.endDate} onChange={e=>setPForm({...pForm, endDate: e.target.value})} /></div>
                  </div>
                  <div>
                     <label className={`block text-xs font-bold mb-1 ${colors.text}`}>Nilai Diskon (Ketik % jika persentase)</label>
                     <input required type="text" inputMode="text" placeholder="Cth: 10% atau 5000" className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent outline-none text-sm placeholder-gray-400 dark:placeholder-gray-500`} value={pForm.discValueStr !== undefined ? pForm.discValueStr : (pForm.discType === '%' ? (pForm.discValue ? `${pForm.discValue}%` : '') : smartFormatInput(pForm.discValue))} onChange={e=>{ let v = e.target.value; let isPercent = v.includes('%'); let numVal = parseIDR(v); let formatted = isPercent ? v.replace(/[^0-9,.%]/g, '') : (v ? smartFormatInput(v) : ''); setPForm({...pForm, discType: isPercent ? '%' : 'Rp', discValue: numVal, discValueStr: formatted}); }} />
                  </div>

                  {(() => {
                     const isSingle = pForm.targetType === 'spesifik' && (pForm.targetItems || []).length === 1;
                     const simId = isSingle ? pForm.targetItems[0] : promoSimProductId;
                     const simProd = products.find(p => String(p.id) === String(simId));
                     
                     return (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 text-xs mt-4">
                           <div className="flex justify-between items-center mb-1">
                              <h4 className="font-bold text-blue-800 dark:text-blue-300">Kalkulator Margin Promo:</h4>
                           </div>
                           
                           {!isSingle && (
                              <div className="mb-2">
                                 <label className="block text-[10px] font-bold text-gray-500 mb-1">Pilih Produk untuk Disimulasikan</label>
                                 <SearchableSelect 
                                    options={pForm.targetType === 'semua' ? products : products.filter(p => (pForm.targetItems||[]).includes(String(p.id)))} 
                                    value={promoSimProductId} 
                                    onChange={(val) => setPromoSimProductId(val)} 
                                    placeholder="-- Pilih Produk Contoh --" 
                                    colors={colors} 
                                 />
                              </div>
                           )}

                           {simProd ? (() => {
                              const retail = simProd.price || 0;
                              const cost = simProd.cost || 0;
                              let finalPrice = retail;
                              
                              if (pForm.discType === '%') {
                                 finalPrice = retail - (retail * ((pForm.discValue || 0) / 100));
                              } else {
                                 finalPrice = retail - (pForm.discValue || 0);
                              }
                              
                              const marginPromo = finalPrice - cost;
                              const isError = finalPrice < cost;

                              return (
                                 <div className="space-y-1">
                                    <div className="flex justify-between border-b pb-1 border-gray-200 dark:border-gray-700/50">
                                       <span className="text-gray-500">Harga Modal (HPP):</span>
                                       <span className="font-bold text-gray-700 dark:text-gray-300">Rp {formatIDR(cost)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-gray-200 dark:border-gray-700/50">
                                       <span className="text-gray-500">Harga Normal (Ritel):</span>
                                       <span className="font-bold text-gray-700 dark:text-gray-300">Rp {formatIDR(retail)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-gray-200 dark:border-gray-700/50">
                                       <span className="text-gray-500">Harga Setelah Promo:</span>
                                       <span className={`font-bold ${isError ? 'text-red-500' : 'text-[#D4AF37]'}`}>Rp {formatIDR(finalPrice)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                       <span className="text-gray-500">Margin Setelah Promo:</span>
                                       <span className={`font-bold ${isError ? 'text-red-500' : 'text-green-500'}`}>
                                          Rp {formatIDR(marginPromo)} ({cost > 0 ? Math.round((marginPromo / cost) * 100) : 0}%)
                                       </span>
                                    </div>
                                    {isError && <p className="text-[10px] text-red-500 italic mt-1">Peringatan: Harga promo di bawah harga modal (rugi)!</p>}
                                 </div>
                              );
                           })() : (
                              !isSingle && <p className="text-[10px] text-blue-600 dark:text-blue-400 italic">Pilih produk di atas untuk melihat simulasi marginnya.</p>
                           )}
                        </div>
                     );
                  })()}

                  <button type="submit" className={`w-full py-3.5 mt-2 rounded-xl text-[#18181B] font-bold ${colors.goldBg} shadow-md hover:opacity-90`}>Simpan Aturan Promo</button>
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
                        <option value="kasir">STAFF (Bisa Kustom Akses)</option><option value="admin">ADMIN (Full Akses)</option>
                   </select>
                </div>
                {uForm.role === 'kasir' && (
                  <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700">
                     <label className={`block text-xs font-bold mb-2 ${colors.textMuted}`}>Hak Akses Menu</label>
                     <div className="grid grid-cols-2 gap-2">
                        {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'pos', label: 'Kasir POS' }, { id: 'produk', label: 'Stok' }, { id: 'riwayat', label: 'Riwayat' }, { id: 'kontak', label: 'Kontak' }, { id: 'laporan', label: 'Laporan' }].map(mod => (
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
                  {editGenericModal.type === 'fin' && (
                  <div>
                     <label className={`block text-xs font-bold mb-1 mt-3 ${colors.text}`}>Kategori Akun</label>
                     <select className={`w-full p-2.5 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none`} value={editGenericModal.val2 || 'tunai'} onChange={e=>setEditGenericModal({...editGenericModal, val2: e.target.value})}>
                          <option value="tunai" className="bg-white dark:bg-[#1e1e1e]">Tunai</option>
                          <option value="non-tunai" className="bg-white dark:bg-[#1e1e1e]">Non-Tunai</option>
                     </select>
                  </div>
                  )}
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

      {/* Modal Unsaved Changes */}
      {showUnsavedModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
              <div className={`w-full max-w-sm rounded-2xl p-6 ${colors.panel} shadow-xl border ${colors.border}`}>
                  <h3 className={`text-lg font-black mb-2 ${colors.text}`}>Simpan Perubahan?</h3>
                  <p className="text-sm text-gray-500 mb-6">Anda memiliki perubahan yang belum disimpan. Apakah Anda ingin menyimpannya sebelum pindah tab?</p>
                  <div className="flex flex-col gap-2">
                      <button 
                          onClick={(e) => {
                              if (activeTab === 'toko') saveStoreInfo(e);
                              if (activeTab === 'harga') saveHargaSettings(e);
                              setActiveTab(pendingTabSwitch);
                              setShowUnsavedModal(false);
                              setPendingTabSwitch(null);
                          }} 
                          className={`w-full py-2.5 rounded-xl text-[#18181B] font-bold shadow-md hover:opacity-90 transition-all ${colors.goldBg}`}
                      >
                          Ya, Simpan & Pindah
                      </button>
                      <button 
                          onClick={() => {
                              playSound('pop', isSoundOn);
                              if (activeTab === 'toko') resetTokoState();
                              if (activeTab === 'harga') resetHargaState();
                              setActiveTab(pendingTabSwitch);
                              setShowUnsavedModal(false);
                              setPendingTabSwitch(null);
                          }} 
                          className={`w-full py-2.5 rounded-xl font-bold border ${colors.border} ${colors.text} hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 transition-all`}
                      >
                          Abaikan & Pindah
                      </button>
                      <button 
                          onClick={() => {
                              playSound('pop', isSoundOn);
                              setShowUnsavedModal(false);
                              setPendingTabSwitch(null);
                          }} 
                          className="w-full py-2 text-sm font-bold text-gray-400 hover:text-gray-500"
                      >
                          Batal
                      </button>
                  </div>
              </div>
          </div>
      )}
        </div>
      </div>
    </div>
  );
}
