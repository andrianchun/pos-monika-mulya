import React, { useState, useEffect, useRef } from 'react';
import { initialProducts, initialCustomers, initialSuppliers, initialUsers, initialFinancialAccounts, initialAccounting } from './data/initialData';
import { playSound } from './utils/helpers';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './pages/LoginScreen';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import ProductManager from './pages/ProductManager';
import ContactManager from './pages/ContactManager';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import POSHistory from './pages/POSHistory';

import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

const defaultStoreInfo = { name: 'MONIKA MULYA', tagline: 'Bismillah', address: 'Jl. Raya Blitar No. 1', phone: '081234567890', logo: null, ongkirPerKm: 2500, prefixSales: 'INV', prefixPurchase: 'PO', nextSeqSales: 1, nextSeqPurchase: 1 };
const getInitialStoreInfo = () => {
    try {
        const cached = localStorage.getItem('mmpos_storeInfo');
        if (cached) return JSON.parse(cached);
    } catch(e) {}
    return defaultStoreInfo;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [syncCount, setSyncCount] = useState(0); 
  
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [accounting, setAccounting] = useState([]);
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [storeInfo, setStoreInfo] = useState(getInitialStoreInfo);
  const [categories, setCategories] = useState(['Sembako', 'Makanan', 'Minuman']);
  const [units, setUnits] = useState(['Pcs', 'Kg', 'Sak']);
  const [users, setUsers] = useState([]);

  const stateRef = useRef({ products, customers, suppliers, sales, purchases, accounting, financialAccounts, users, storeInfo, categories, units });
  
  useEffect(() => {
    stateRef.current = { products, customers, suppliers, sales, purchases, accounting, financialAccounts, users, storeInfo, categories, units };
  }, [products, customers, suppliers, sales, purchases, accounting, financialAccounts, users, storeInfo, categories, units]);

  useEffect(() => {
    if (storeInfo?.name) {
      document.title = `POS ${storeInfo.name}`;
    }
    if (storeInfo?.logo) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = storeInfo.logo;
      
      // Dynamic PWA Manifest untuk "Save to Home Screen"
      let manifestLink = document.querySelector("link[rel='manifest']");
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.getElementsByTagName('head')[0].appendChild(manifestLink);
      }
      const manifest = {
        name: `POS ${storeInfo.name}`,
        short_name: storeInfo.name,
        start_url: window.location.origin + "/",
        display: "standalone",
        background_color: "#121212",
        theme_color: "#D4AF37",
        icons: [{ src: storeInfo.logo, sizes: "192x192 512x512", type: "image/png" }]
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      manifestLink.href = URL.createObjectURL(blob);
    }
  }, [storeInfo?.name, storeInfo?.logo]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Gembok Anti-Refresh selama badge biru masih menyala
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (syncCount > 0) {
        e.preventDefault();
        e.returnValue = 'Data sedang dikunci ke Cloud. Jika Anda merefresh sekarang, data mungkin gagal tersimpan. Yakin ingin keluar?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncCount]);

  useEffect(() => {
    let unsubs = []; 
    let loadedCount = 0;
    const safetyTimer = setTimeout(() => { setLoading(false); }, 3000);
    const checkLoaded = () => { loadedCount++; if(loadedCount >= 8) { clearTimeout(safetyTimer); setLoading(false); } };

    const initializeAndListen = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        if (usersSnap.empty) {
            const seed = async (colName, dataArr) => {
               if(!dataArr || dataArr.length === 0) return;
               let batch = writeBatch(db);
               dataArr.forEach(item => batch.set(doc(db, colName, String(item.id)), JSON.parse(JSON.stringify(item))));
               await batch.commit();
            };
            await seed("products", initialProducts);
            await seed("customers", initialCustomers);
            await seed("suppliers", initialSuppliers);
            await seed("accounting", initialAccounting);
            await seed("financialAccounts", initialFinancialAccounts);
            await seed("users", initialUsers);
            
            const defInfo = { name: 'MONIKA MULYA', tagline: 'Bismillah', address: 'Jl. Raya Blitar No. 1', phone: '081234567890', logo: null, ongkirPerKm: 2500, prefixSales: 'INV', prefixPurchase: 'PO', nextSeqSales: 1, nextSeqPurchase: 1 };
            await setDoc(doc(db, "settings", "storeInfo"), defInfo);
            await setDoc(doc(db, "settings", "categories"), { values: ['Sembako', 'Makanan', 'Minuman'] });
            await setDoc(doc(db, "settings", "units"), { values: ['Pcs', 'Kg', 'Sak'] });
        }
      } catch (e) {}

      const setupRealtime = (colName, setter, sortDesc = false) => {
         return onSnapshot(collection(db, colName), (snap) => {
            let data = snap.docs.map(d => {
               let obj = d.data();
               if (obj.name === 'Umum (Tanpa Data)') obj.name = '(anonim)';
               if (obj.customer === 'Umum (Tanpa Data)') obj.customer = '(anonim)';
               if (obj.supplier === 'Umum (Tanpa Data)') obj.supplier = '(anonim)';
               
               if (colName === 'products') {
                  if (obj.unit && typeof obj.unit === 'string') obj.unit = obj.unit.toLowerCase().trim();
                  else obj.unit = 'pcs';
                  if (obj.category && typeof obj.category === 'string') obj.category = obj.category.toUpperCase().trim();
                  else obj.category = 'LAINNYA';
               }
               
               return obj;
            });
            if (sortDesc) data.sort((a, b) => b.id - a.id);
            setter(data);
            checkLoaded();
         }, (error) => { clearTimeout(safetyTimer); setLoading(false); });
      };

      unsubs.push(setupRealtime("products", setProducts));
      unsubs.push(setupRealtime("customers", setCustomers));
      unsubs.push(setupRealtime("suppliers", setSuppliers));
      unsubs.push(setupRealtime("sales", setSales, true)); 
      unsubs.push(setupRealtime("purchases", setPurchases, true));
      unsubs.push(setupRealtime("accounting", setAccounting));
      unsubs.push(setupRealtime("financialAccounts", setFinancialAccounts));
      unsubs.push(setupRealtime("users", setUsers));

      unsubs.push(onSnapshot(collection(db, "settings"), (snap) => {
         if (!snap.empty) {
            snap.docs.forEach(d => {
               if(d.id === 'storeInfo') {
                  const dData = d.data();
                  setStoreInfo(prev => {
                     const n = {...prev, ...dData};
                     localStorage.setItem('mmpos_storeInfo', JSON.stringify(n));
                     return n;
                  });
               }
               if(d.id === 'categories') {
                  const cats = d.data().values || [];
                  const lowerCats = Array.from(new Set(cats.map(c => typeof c === 'string' ? c.toUpperCase().trim() : c))).sort();
                  setCategories(lowerCats);
               }
               if(d.id === 'units') {
                  const us = d.data().values || [];
                  const lowerUs = Array.from(new Set(us.map(u => typeof u === 'string' ? u.toLowerCase().trim() : u))).sort();
                  setUnits(lowerUs);
               }
            });
         }
      }));
    };
    
    // Trik "Akun Satpam"
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await initializeAndListen();
      }
    });
    
    signInWithEmailAndPassword(auth, 'satpam@monikamulya.com', 'satpam12345').catch(err => {
      console.error("Gagal login pintu satpam:", err);
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(u => u());
    };
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('mmpos_user');
      const lastActive = localStorage.getItem('mmpos_last_active');
      if (storedUser && lastActive) {
        const now = Date.now();
        if (now - parseInt(lastActive, 10) > 5 * 60 * 60 * 1000) {
          localStorage.removeItem('mmpos_user'); localStorage.removeItem('mmpos_last_active'); setUser(null);
        } else {
          setUser(JSON.parse(storedUser)); localStorage.setItem('mmpos_last_active', now.toString());
        }
      }
    };
    checkAuth();
    const updateActivity = () => { if (localStorage.getItem('mmpos_user')) localStorage.setItem('mmpos_last_active', Date.now().toString()); };
    window.addEventListener('mousemove', updateActivity); window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', () => { if(window.audioCtx && window.audioCtx.state === 'suspended') window.audioCtx.resume(); });
    return () => { window.removeEventListener('mousemove', updateActivity); window.removeEventListener('keydown', updateActivity); };
  }, []);

  // ====================================================================================
  // 🔥 PERBAIKAN FINAL: Tracking Upload Mutlak. Badge biru TIDAK AKAN HILANG
  // sebelum data 100% selamat mendarat di awan Firebase.
  // ====================================================================================
  const syncCollection = (collectionName, resolvedArray, oldArray) => {
    try {
      const resolvedIds = new Set(resolvedArray.map(i => String(i.id)));
      const oldMap = new Map(oldArray.map(i => [String(i.id), i]));
      
      const itemsToDelete = oldArray.filter(item => !resolvedIds.has(String(item.id)));
      const itemsToSet = resolvedArray.filter(item => {
        const oldItem = oldMap.get(String(item.id));
        if (!oldItem) return true; 
        if (oldItem === item) return false; 
        return JSON.stringify(oldItem) !== JSON.stringify(item); 
      });

      // Jika tidak ada perubahan, langsung sudahi proses (0 detik delay)
      if (itemsToDelete.length === 0 && itemsToSet.length === 0) return Promise.resolve(); 

      // === [SAFETY NET] PERLINDUNGAN DATA ===
      // 1. Blokir Pengosongan Total (Anti-Wipeout)
      // Jika data lokal tiba-tiba menjadi array kosong padahal sebelumnya ada isi (karena bug / cache terhapus)
      if (resolvedArray.length === 0 && oldArray.length > 0) {
          console.error(`☠️ BLOKIR KEAMANAN: Upaya untuk mengosongkan seluruh koleksi ${collectionName} diblokir!`);
          showToast(`Keamanan: Upaya mengosongkan data ${collectionName} diblokir!`, "error");
          return Promise.resolve(); // Abaikan eksekusi ke Firebase
      }
      
      // 2. Blokir Hapus Massal (> 20 item)
      // Mencegah peretasan atau bug yang menghapus banyak data sekaligus.
      if (itemsToDelete.length > 20) {
          console.error(`☠️ BLOKIR KEAMANAN: Upaya menghapus massal ${itemsToDelete.length} item di ${collectionName} diblokir!`);
          showToast(`Keamanan: Hapus massal ${collectionName} diblokir!`, "error");
          return Promise.resolve(); // Abaikan eksekusi ke Firebase
      }
      // ======================================

      setSyncCount(prev => prev + 1); 
      let batch = writeBatch(db);
      let count = 0;
      const promises = [];

      for (const item of itemsToDelete) { 
          batch.delete(doc(db, collectionName, String(item.id))); 
          count++; 
          if (count === 400) { promises.push(batch.commit()); batch = writeBatch(db); count = 0; } 
      }
      for (const item of itemsToSet) { 
          batch.set(doc(db, collectionName, String(item.id)), JSON.parse(JSON.stringify(item))); 
          count++; 
          if (count === 400) { promises.push(batch.commit()); batch = writeBatch(db); count = 0; } 
      }
      if (count > 0) promises.push(batch.commit());

      return Promise.all(promises)
        .catch(err => {
           console.error(`Sync error di ${collectionName}:`, err); 
           const errMsg = err.message ? err.message.toLowerCase() : '';
           if (errMsg.includes('quota')) showToast("⚠️ CLOUD FULL: Kuota Firebase Habis!", "error");
           else if (errMsg.includes('permission')) showToast("❌ AKSES DITOLAK: Aturan Firebase Memblokir.", "error");
           else showToast(`🚨 ERROR CLOUD: ${err.message}`, "error");
           throw err;
        })
        .finally(() => {
           setSyncCount(prev => Math.max(0, prev - 1)); 
        });

    } catch (err) { 
      console.error(`Sync compute error:`, err); 
      return Promise.resolve();
    }
  };

  const customSetProducts = (next) => { const cur = stateRef.current.products; const res = typeof next === 'function' ? next(cur) : next; setProducts(res); syncCollection("products", res, cur); };
  const customSetCustomers = (next) => { const cur = stateRef.current.customers; const res = typeof next === 'function' ? next(cur) : next; setCustomers(res); syncCollection("customers", res, cur); };
  const customSetSuppliers = (next) => { const cur = stateRef.current.suppliers; const res = typeof next === 'function' ? next(cur) : next; setSuppliers(res); syncCollection("suppliers", res, cur); };
  const customSetSales = (next) => { const cur = stateRef.current.sales; const res = typeof next === 'function' ? next(cur) : next; setSales(res); syncCollection("sales", res, cur); };
  const customSetPurchases = (next) => { const cur = stateRef.current.purchases; const res = typeof next === 'function' ? next(cur) : next; setPurchases(res); syncCollection("purchases", res, cur); };
  const customSetAccounting = (next) => { const cur = stateRef.current.accounting; const res = typeof next === 'function' ? next(cur) : next; setAccounting(res); syncCollection("accounting", res, cur); };
  const customSetFinancialAccounts = (next) => { const cur = stateRef.current.financialAccounts; const res = typeof next === 'function' ? next(cur) : next; setFinancialAccounts(res); syncCollection("financialAccounts", res, cur); };
  const customSetUsers = (next) => { const cur = stateRef.current.users; const res = typeof next === 'function' ? next(cur) : next; setUsers(res); syncCollection("users", res, cur); };

  const customSetStoreInfo = (next) => { 
     const res = typeof next === 'function' ? next(stateRef.current.storeInfo) : next; 
     setStoreInfo(res);
     try { localStorage.setItem('mmpos_storeInfo', JSON.stringify(res)); } catch (e) {}
     setSyncCount(p=>p+1); 
     return setDoc(doc(db, "settings", "storeInfo"), JSON.parse(JSON.stringify(res)))
       .catch(e => { console.error(e); throw e; })
       .finally(() => setSyncCount(p=>Math.max(0,p-1))); 
  };
  
  const customSetCategories = (next) => { 
     const res = typeof next === 'function' ? next(stateRef.current.categories) : next; 
     setCategories(res); 
     setSyncCount(p=>p+1); 
     return setDoc(doc(db, "settings", "categories"), { values: JSON.parse(JSON.stringify(res)) })
       .catch(e => { console.error(e); throw e; })
       .finally(() => setSyncCount(p=>Math.max(0,p-1))); 
  };
  
  const customSetUnits = (next) => { 
     const res = typeof next === 'function' ? next(stateRef.current.units) : next; 
     setUnits(res); 
     setSyncCount(p=>p+1); 
     return setDoc(doc(db, "settings", "units"), { values: JSON.parse(JSON.stringify(res)) })
       .catch(e => { console.error(e); throw e; })
       .finally(() => setSyncCount(p=>Math.max(0,p-1))); 
  };

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const handleRestoreDatabase = (parsedData) => {
    showToast("Memulihkan data ke layar. Upload berjalan di latar belakang...", "success");
    try {
      // 1. UPDATE LAYAR INSTAN (Tampil 0 detik)
      if (parsedData.products) setProducts(parsedData.products);
      if (parsedData.customers) setCustomers(parsedData.customers);
      if (parsedData.suppliers) setSuppliers(parsedData.suppliers);
      if (parsedData.sales) setSales(parsedData.sales);
      if (parsedData.purchases) setPurchases(parsedData.purchases);
      if (parsedData.accounting) setAccounting(parsedData.accounting);
      if (parsedData.financialAccounts) setFinancialAccounts(parsedData.financialAccounts);
      if (parsedData.users) setUsers(parsedData.users);

      // 2. TEMBAK KE CLOUD (Dipantau oleh Badge Biru)
      const syncProms = [];
      if (parsedData.products) syncProms.push(syncCollection("products", parsedData.products, stateRef.current.products));
      if (parsedData.customers) syncProms.push(syncCollection("customers", parsedData.customers, stateRef.current.customers));
      if (parsedData.suppliers) syncProms.push(syncCollection("suppliers", parsedData.suppliers, stateRef.current.suppliers));
      if (parsedData.sales) syncProms.push(syncCollection("sales", parsedData.sales, stateRef.current.sales));
      if (parsedData.purchases) syncProms.push(syncCollection("purchases", parsedData.purchases, stateRef.current.purchases));
      if (parsedData.accounting) syncProms.push(syncCollection("accounting", parsedData.accounting, stateRef.current.accounting));
      if (parsedData.financialAccounts) syncProms.push(syncCollection("financialAccounts", parsedData.financialAccounts, stateRef.current.financialAccounts));
      if (parsedData.users) syncProms.push(syncCollection("users", parsedData.users, stateRef.current.users));
      
      if (parsedData.storeInfo) syncProms.push(customSetStoreInfo(parsedData.storeInfo));
      if (parsedData.categories) syncProms.push(customSetCategories(parsedData.categories));
      if (parsedData.units) syncProms.push(customSetUnits(parsedData.units));

      // Laporan sukses hanya muncul JIKA BENAR-BENAR sukses upload
      Promise.all(syncProms)
        .then(() => {
           showToast("Semua data sukses dikunci permanen ke Cloud!", "success");
        })
        .catch(() => {
           showToast("Sebagian data gagal tersinkron ke Cloud. Periksa koneksi Anda.", "error");
        });

    } catch (err) { 
      showToast("Gagal sinkronisasi. Format data rusak.", "error"); 
    }
  };

  const themeColors = { 
     bg: theme === 'dark' ? 'bg-[#09090B]' : 'bg-[#F4F4F5]', 
     panel: theme === 'dark' ? 'bg-[#18181B]/40 backdrop-blur-xl' : 'bg-white/40 backdrop-blur-xl', 
     text: theme === 'dark' ? 'text-[#FAFAFA]' : 'text-[#18181B]', 
     textMuted: theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]', 
     gold: 'text-[#D4AF37]', 
     goldBg: 'bg-[#D4AF37]', 
     border: theme === 'dark' ? 'border-[#27272A]/50' : 'border-[#E4E4E7]/50', 
     creamBg: theme === 'dark' ? 'bg-[#27272A]/40' : 'bg-[#F8FAFC]/40' 
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setActiveMenu(loggedInUser.role === 'kasir' ? 'pos' : 'dashboard');
  };

  if (loading) return (
    <div className="min-h-screen w-full bg-[#121212] flex flex-col items-center justify-center font-sans relative overflow-hidden">
       {storeInfo?.banner && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40 transition-opacity duration-1000" 
               style={{ 
                  backgroundImage: `url(${storeInfo.banner})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'bottom',
                  maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
               }}>
          </div>
       )}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,transparent_60%)]"></div>
       <div className="relative z-10 flex flex-col items-center animate-pulse">
          {storeInfo?.logo ? (
             <img src={storeInfo.logo} alt="Logo" className="w-24 h-24 object-cover rounded-2xl mb-6 shadow-[0_0_30px_rgba(212,175,55,0.3)]" />
          ) : (
             <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                <span className="text-4xl font-black text-[#121212]">{storeInfo?.name ? storeInfo.name.charAt(0) : 'M'}</span>
             </div>
          )}
          <h1 className="text-[#D4AF37] font-black text-2xl tracking-widest uppercase mb-2">{storeInfo?.name || 'MONIKA MULYA'}</h1>
          <p className="text-gray-400 text-xs tracking-[0.2em] uppercase">Memuat Sistem...</p>
       </div>
       <div className="absolute bottom-8 text-center text-[10px] text-gray-500 font-medium tracking-wide">
          <span className="text-[#D4AF37]">HXPOS</span> by andrian chun &copy; 2026
       </div>
    </div>
  );
  if (!user) return <LoginScreen onLogin={handleLogin} users={users} colors={themeColors} theme={theme} setTheme={setTheme} isSoundOn={true} storeInfo={storeInfo} showToast={showToast} />;

  return (
    <div className={`flex h-screen w-full ${themeColors.bg} ${themeColors.text} overflow-hidden relative`}>
      {storeInfo?.banner && (
         <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 transition-opacity duration-1000" 
              style={{ 
                 backgroundImage: `url(${storeInfo.banner})`, 
                 backgroundSize: 'cover', 
                 backgroundPosition: 'bottom',
                 maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                 WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
              }}>
         </div>
      )}
      
      {syncCount > 0 && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-5 py-2 rounded-full shadow-2xl z-[9999] flex items-center gap-2 text-xs font-bold border border-blue-400">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Menyinkronkan ke Cloud... ({syncCount})
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} activeMenu={activeMenu} handleMenuClick={setActiveMenu} colors={themeColors} user={user} storeInfo={storeInfo} />
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
         <Header 
            user={user} setUser={setUser} users={users} setUsers={customSetUsers} 
            theme={theme} setTheme={setTheme} colors={themeColors} isSoundOn={true} 
            storeInfo={storeInfo} showToast={showToast} 
            isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
            products={products} sales={sales} purchases={purchases} suppliers={suppliers} 
         />
         
         <main className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar relative">
             <div className={activeMenu === 'pos' ? 'block h-full' : 'hidden'}>
                <POS products={products} setProducts={customSetProducts} customers={customers} setCustomers={customSetCustomers} suppliers={suppliers} sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} colors={themeColors} user={user} storeInfo={storeInfo} setStoreInfo={customSetStoreInfo} accounting={accounting} setAccounting={customSetAccounting} financialAccounts={financialAccounts} isSoundOn={true} showToast={showToast} theme={theme} />
             </div>
             
             {activeMenu === 'dashboard' && <Dashboard products={products} sales={sales} purchases={purchases} customers={customers} colors={themeColors} theme={theme} handleMenuClick={setActiveMenu} isSoundOn={true} />}
             {activeMenu === 'produk' && <ProductManager products={products} setProducts={customSetProducts} categories={categories} units={units} colors={themeColors} user={user} isSoundOn={true} showToast={showToast} />}
             {activeMenu === 'penjualan' && <POSHistory tab="penjualan" sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} products={products} setProducts={customSetProducts} colors={themeColors} accounting={accounting} setAccounting={customSetAccounting} customers={customers} setCustomers={customSetCustomers} suppliers={suppliers} financialAccounts={financialAccounts} storeInfo={storeInfo} isSoundOn={true} showToast={showToast} />}
             {activeMenu === 'pembelian' && <POSHistory tab="pembelian" sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} products={products} setProducts={customSetProducts} colors={themeColors} accounting={accounting} setAccounting={customSetAccounting} customers={customers} setCustomers={customSetCustomers} suppliers={suppliers} financialAccounts={financialAccounts} storeInfo={storeInfo} isSoundOn={true} showToast={showToast} />}
             {activeMenu === 'kontak' && <ContactManager customers={customers} setCustomers={customSetCustomers} suppliers={suppliers} setSuppliers={customSetSuppliers} sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} products={products} setProducts={customSetProducts} colors={themeColors} isSoundOn={true} showToast={showToast} />}
             {activeMenu === 'laporan' && <Reports sales={sales} purchases={purchases} products={products} accounting={accounting} setAccounting={customSetAccounting} financialAccounts={financialAccounts} customers={customers} colors={themeColors} storeInfo={storeInfo} isSoundOn={true} showToast={showToast} theme={theme} />}
             
             {activeMenu === 'pengaturan' && (
                <SettingsPage 
                   colors={themeColors} user={user} 
                   storeInfo={storeInfo} setStoreInfo={customSetStoreInfo} 
                   users={users} setUsers={customSetUsers} 
                   categories={categories} setCategories={customSetCategories} 
                   units={units} setUnits={customSetUnits} 
                   financialAccounts={financialAccounts} setFinancialAccounts={customSetFinancialAccounts} 
                   products={products} setProducts={customSetProducts} customers={customers} suppliers={suppliers} 
                   sales={sales} purchases={purchases} accounting={accounting} 
                   setAllDatabase={handleRestoreDatabase} isSoundOn={true} showToast={showToast} 
                />
             )}
         </main>
      </div>
      {toast && (<div className={`fixed top-12 left-1/2 transform -translate-x-1/2 px-8 py-3.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] z-[9999] font-bold transition-all text-white ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>{toast.msg}</div>)}
    </div>
  );
}