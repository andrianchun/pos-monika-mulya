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

import { db } from './firebase';
import { collection, doc, setDoc, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';

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
  const [storeInfo, setStoreInfo] = useState({ name: 'MONIKA MULYA', tagline: 'Bismillah', address: 'Jl. Raya Blitar No. 1', phone: '081234567890', logo: null, ongkirPerKm: 2500, prefixSales: 'INV', prefixPurchase: 'PO', nextSeqSales: 1, nextSeqPurchase: 1 });
  const [categories, setCategories] = useState(['Sembako', 'Makanan', 'Minuman']);
  const [units, setUnits] = useState(['Pcs', 'Kg', 'Sak']);
  const [users, setUsers] = useState([]);

  const stateRef = useRef({ products, customers, suppliers, sales, purchases, accounting, financialAccounts, users, storeInfo, categories, units });
  
  useEffect(() => {
    stateRef.current = { products, customers, suppliers, sales, purchases, accounting, financialAccounts, users, storeInfo, categories, units };
  }, [products, customers, suppliers, sales, purchases, accounting, financialAccounts, users, storeInfo, categories, units]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (syncCount > 0) {
        e.preventDefault();
        e.returnValue = 'Data sedang disimpan ke Cloud. Jika Anda merefresh sekarang, data mungkin tidak tersimpan. Yakin ingin keluar?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncCount]);

  useEffect(() => {
    let unsubs = []; 
    let loadedCount = 0;
    const safetyTimer = setTimeout(() => { setLoading(false); }, 6000);

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
            let data = snap.docs.map(d => d.data());
            if (sortDesc) data.sort((a, b) => b.id - a.id);
            setter(data);
            loadedCount++;
            if(loadedCount >= 8) { clearTimeout(safetyTimer); setLoading(false); }
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
               if(d.id === 'storeInfo') setStoreInfo(prev => ({...prev, ...d.data()}));
               if(d.id === 'categories') setCategories(d.data().values || []);
               if(d.id === 'units') setUnits(d.data().values || []);
            });
         }
      }));
    };

    initializeAndListen();
    return () => unsubs.forEach(u => u());
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

  const syncCollection = async (collectionName, resolvedArray, oldArray) => {
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

      if (itemsToDelete.length === 0 && itemsToSet.length === 0) return; 

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

      const timeoutBypass = new Promise(resolve => setTimeout(() => resolve('TIMEOUT_OK'), 3000));
      const result = await Promise.race([Promise.all(promises), timeoutBypass]);

      if (result === 'TIMEOUT_OK') {
         console.log(`[Offline-First] Menunggu sinkronisasi background untuk: ${collectionName}`);
      }

    } catch (err) { 
      console.error(`Sync compute error:`, err); 
      const errMsg = err.message ? err.message.toLowerCase() : '';
      if (errMsg.includes('quota')) showToast("⚠️ CLOUD FULL: Kuota Firebase Habis!", "error");
      else if (errMsg.includes('permission')) showToast("❌ AKSES DITOLAK: Aturan Firebase Memblokir.", "error");
      else showToast(`🚨 ERROR CLOUD: ${err.message}`, "error");
    } finally {
      setSyncCount(prev => Math.max(0, prev - 1)); 
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

  const customSetStoreInfo = async (next) => { 
     const res = typeof next === 'function' ? next(stateRef.current.storeInfo) : next; 
     setStoreInfo(res); 
     try { 
        setSyncCount(p=>p+1); 
        const writeProm = setDoc(doc(db, "settings", "storeInfo"), JSON.parse(JSON.stringify(res))); 
        const timeoutBypass = new Promise(resolve => setTimeout(() => resolve('TIMEOUT_OK'), 3000));
        await Promise.race([writeProm, timeoutBypass]);
     } catch (e) {} finally { setSyncCount(p=>Math.max(0,p-1)); } 
  };
  
  const customSetCategories = async (next) => { 
     const res = typeof next === 'function' ? next(stateRef.current.categories) : next; 
     setCategories(res); 
     try { 
        setSyncCount(p=>p+1); 
        const writeProm = setDoc(doc(db, "settings", "categories"), { values: JSON.parse(JSON.stringify(res)) }); 
        const timeoutBypass = new Promise(resolve => setTimeout(() => resolve('TIMEOUT_OK'), 3000));
        await Promise.race([writeProm, timeoutBypass]);
     } catch (e) {} finally { setSyncCount(p=>Math.max(0,p-1)); } 
  };
  
  const customSetUnits = async (next) => { 
     const res = typeof next === 'function' ? next(stateRef.current.units) : next; 
     setUnits(res); 
     try { 
        setSyncCount(p=>p+1); 
        const writeProm = setDoc(doc(db, "settings", "units"), { values: JSON.parse(JSON.stringify(res)) }); 
        const timeoutBypass = new Promise(resolve => setTimeout(() => resolve('TIMEOUT_OK'), 3000));
        await Promise.race([writeProm, timeoutBypass]);
     } catch (e) {} finally { setSyncCount(p=>Math.max(0,p-1)); } 
  };

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  // ====================================================================================
  // 🔥 PERBAIKAN: Fungsi Restore kini mengisi layar DULUAN (Instan), baru upload ke awan
  // ====================================================================================
  const handleRestoreDatabase = async (parsedData) => {
    showToast("Memulihkan data ke layar & Cloud...", "success");
    try {
      // 1. UPDATE LAYAR INSTAN (Optimistic UI - Data langsung muncul 0 detik)
      if (parsedData.products) setProducts(parsedData.products);
      if (parsedData.customers) setCustomers(parsedData.customers);
      if (parsedData.suppliers) setSuppliers(parsedData.suppliers);
      if (parsedData.sales) setSales(parsedData.sales);
      if (parsedData.purchases) setPurchases(parsedData.purchases);
      if (parsedData.accounting) setAccounting(parsedData.accounting);
      if (parsedData.financialAccounts) setFinancialAccounts(parsedData.financialAccounts);
      if (parsedData.users) setUsers(parsedData.users);

      // 2. KIRIM KE CLOUD DI BACKGROUND
      if (parsedData.products) await syncCollection("products", parsedData.products, stateRef.current.products);
      if (parsedData.customers) await syncCollection("customers", parsedData.customers, stateRef.current.customers);
      if (parsedData.suppliers) await syncCollection("suppliers", parsedData.suppliers, stateRef.current.suppliers);
      if (parsedData.sales) await syncCollection("sales", parsedData.sales, stateRef.current.sales);
      if (parsedData.purchases) await syncCollection("purchases", parsedData.purchases, stateRef.current.purchases);
      if (parsedData.accounting) await syncCollection("accounting", parsedData.accounting, stateRef.current.accounting);
      if (parsedData.financialAccounts) await syncCollection("financialAccounts", parsedData.financialAccounts, stateRef.current.financialAccounts);
      if (parsedData.users) await syncCollection("users", parsedData.users, stateRef.current.users);
      
      // Untuk settings, fungsi custom ini otomatis update layar & cloud
      if (parsedData.storeInfo) await customSetStoreInfo(parsedData.storeInfo);
      if (parsedData.categories) await customSetCategories(parsedData.categories);
      if (parsedData.units) await customSetUnits(parsedData.units);
      
      showToast("Data sukses dipulihkan & disinkronkan ke Cloud!", "success");
    } catch (err) { 
      showToast("Gagal menyinkronkan beberapa data.", "error"); 
    }
  };
  // ====================================================================================

  const themeColors = { bg: theme === 'dark' ? 'bg-[#121212]' : 'bg-[#f4f6f8]', panel: theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white', text: theme === 'dark' ? 'text-[#FFFDD0]' : 'text-gray-800', textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-500', gold: 'text-[#D4AF37]', goldBg: 'bg-[#D4AF37]', border: theme === 'dark' ? 'border-[#333]' : 'border-gray-200', creamBg: theme === 'dark' ? 'bg-[#2a2a24]' : 'bg-[#fffdf0]' };

  if (loading) return (<div className="min-h-screen w-full bg-[#121212] flex flex-col items-center justify-center font-sans"><div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-[#FFFDD0] font-bold text-sm tracking-widest animate-pulse uppercase">Menghubungkan ke Cloud Server...</p></div>);
  if (!user) return <LoginScreen onLogin={setUser} users={users} colors={themeColors} theme={theme} setTheme={setTheme} isSoundOn={true} storeInfo={storeInfo} showToast={showToast} />;

  return (
    <div className={`flex h-screen w-full ${themeColors.bg} ${themeColors.text} overflow-hidden relative`}>
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
             {activeMenu === 'penjualan' && <POSHistory tab="penjualan" sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} products={products} setProducts={customSetProducts} colors={themeColors} accounting={accounting} setAccounting={customSetAccounting} customers={customers} suppliers={suppliers} financialAccounts={financialAccounts} storeInfo={storeInfo} isSoundOn={true} showToast={showToast} />}
             {activeMenu === 'pembelian' && <POSHistory tab="pembelian" sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} products={products} setProducts={customSetProducts} colors={themeColors} accounting={accounting} setAccounting={customSetAccounting} customers={customers} suppliers={suppliers} financialAccounts={financialAccounts} storeInfo={storeInfo} isSoundOn={true} showToast={showToast} />}
             {activeMenu === 'kontak' && <ContactManager customers={customers} setCustomers={customSetCustomers} suppliers={suppliers} setSuppliers={customSetSuppliers} colors={themeColors} isSoundOn={true} showToast={showToast} />}
             {activeMenu === 'laporan' && <Reports sales={sales} purchases={purchases} products={products} accounting={accounting} setAccounting={customSetAccounting} financialAccounts={financialAccounts} colors={themeColors} storeInfo={storeInfo} isSoundOn={true} showToast={showToast} theme={theme} />}
             
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
      {toast && (<div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl z-[200] font-bold text-white transform transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>)}
    </div>
  );
}