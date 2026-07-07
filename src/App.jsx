import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { initialProducts, initialCustomers, initialSuppliers, initialUsers, initialFinancialAccounts, initialAccounting } from './data/initialData';
import { playSound } from './utils/helpers';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './pages/LoginScreen';
import POS from './pages/POS';
import { generateDynamicManifest } from './utils/pwaHelper';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductManager = lazy(() => import('./pages/ProductManager'));
const ContactManager = lazy(() => import('./pages/ContactManager'));
const Reports = lazy(() => import('./pages/Reports'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const POSHistory = lazy(() => import('./pages/POSHistory'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
import ShiftCloseModal from './components/modals/ShiftCloseModal';
import ShiftOpenModal from './components/modals/ShiftOpenModal';
import ReloadPrompt from './components/ui/ReloadPrompt';

import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocsFromServer, writeBatch, onSnapshot, query, where, limit } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
  const [authUid, setAuthUid] = useState(null); // UID Firebase Auth yang sedang login
  const justLoggedInRef = useRef(false); // true hanya saat login manual dari LoginScreen
  const [theme, setTheme] = useState('dark');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [globalMode, setGlobalMode] = useState('penjualan');
  const [globalChartMode, setGlobalChartMode] = useState('line');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    // Generate dynamic manifest with user's logo on load
    generateDynamicManifest();

    // Catch PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const [editIntent, setEditIntent] = useState(null);
  const handleNavigateAndEdit = (menu, id, mode = null) => {
     setActiveMenu(menu);
     if (mode) setGlobalMode(mode);
     setEditIntent({ menu, id, clearIntent: () => setEditIntent(null) });
  };
  
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

  // Sync logged in user profile changes instantly
  useEffect(() => {
    if (user && users && users.length > 0) {
      const updatedUser = users.find(u => String(u.id) === String(user.id));
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(user)) {
        setUser(updatedUser);
      }
    }
  }, [users, user]);

  // Resolusi profil: setelah Firebase Auth berhasil, profil dicari di koleksi
  // users dengan ID dokumen = UID Auth (hasil migrasi migrate-auth.cjs).
  useEffect(() => {
    // Tunggu sampai authUid ada, user belum di-set, dan listener Firestore sudah selesai memuat awal (loading = false)
    if (!authUid || user || loading) return;
    
    let profile = (users || []).find(u => String(u.id) === String(authUid));

    // Fallback: Jika pakai UID auth tidak ketemu, cari berdasarkan email (dari legacy data atau belum sinkron UID)
    if (!profile && auth.currentUser?.email) {
       profile = (users || []).find(u => u.email === auth.currentUser.email);
    }

    // Fallback Darurat: Jika tabel users Firestore KOSONG atau profil tetap tak ditemukan,
    // periksa dari initialUsers lokal (penting untuk instalasi baru).
    if (!profile && auth.currentUser?.email) {
       const initialProfile = initialUsers.find(u => u.email === auth.currentUser.email);
       if (initialProfile) {
          profile = { ...initialProfile, id: authUid };
          // Otomatis seed profil ini ke Firestore agar dikenali listener selanjutnya
          setDoc(doc(db, "users", authUid), profile).catch(console.error);
       }
    }

    if (profile) {
      setUser(profile);
      setActiveMenu(profile.role === 'kasir' ? 'pos' : 'dashboard');
      // Kalau user baru saja memverifikasi ganti ke email asli (lewat menu
      // profil) lalu login lagi, email di Firestore masih yang lama —
      // sinkronkan supaya resolveLoginEmail & tampilan profil ikut update.
      if (auth.currentUser?.email && auth.currentUser.email !== profile.email) {
        const newEmail = auth.currentUser.email;
        customSetUsers(prev => prev.map(u => String(u.id) === String(authUid) ? { ...u, email: newEmail } : u));
      }
      if (justLoggedInRef.current) {
        justLoggedInRef.current = false;
        (async () => {
          try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            const location = `${data.city || 'Unknown City'}, ${data.country_name || 'Unknown Country'} (IP: ${data.ip || 'Unknown'})`;
            recordActivity('Login Sistem', `Akun diakses dari ${location}`, profile);
          } catch (e) {
            recordActivity('Login Sistem', `Akun diakses (Gagal melacak lokasi/IP)`, profile);
          }
        })();
      }
    } else {
      showToast('Profil akun tidak ditemukan di database. Hubungi admin.', 'error');
      signOut(auth).catch(() => {});
    }
  }, [authUid, users, user, loading]);

  const [activeShift, setActiveShift] = useState(() => {
    try { const cached = localStorage.getItem('mmpos_activeShift'); if (cached) return JSON.parse(cached); } catch(e) {}
    return null;
  });

  const [shiftHistory, setShiftHistory] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const recordActivity = async (action, details, overrideUser = null) => {
      try {
          const id = Date.now().toString();
          const targetUser = overrideUser || user;
          await setDoc(doc(db, "activityLogs", id), {
              id,
              action,
              details,
              user: targetUser?.name || targetUser?.username || 'Unknown',
              role: targetUser?.role || 'Unknown',
              timestamp: new Date().toISOString()
          });
      } catch (e) {
          console.error("Failed to record activity", e);
      }
  };

  const [showShiftCloseModal, setShowShiftCloseModal] = useState(false);
  const [showShiftOpenModal, setShowShiftOpenModal] = useState(false);

  // Auto Logout 5 Jam
  useEffect(() => {
    if (!user) return;
    
    let timeoutId;
    const FIVE_HOURS = 5 * 60 * 60 * 1000;
    
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
         recordActivity('Logout Sistem', 'Sistem Logout Otomatis (Timeout/Idle)', user);
         localStorage.removeItem('mmpos_user');
         setUser(null);
         signOut(auth).catch(() => {});
         showToast('Sesi Anda telah berakhir karena tidak ada aktivitas.', 'error');
      }, FIVE_HOURS);
    };

    resetTimer();
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(name => window.addEventListener(name, resetTimer, true));
    
    return () => {
      clearTimeout(timeoutId);
      events.forEach(name => window.removeEventListener(name, resetTimer, true));
    };
  }, [user]);


  useEffect(() => {
     if (activeShift) localStorage.setItem('mmpos_activeShift', JSON.stringify(activeShift));
     else localStorage.removeItem('mmpos_activeShift');
  }, [activeShift]);

  // shiftHistory is now synced to Firebase

  // Penanda bahwa storeInfo sudah benar-benar termuat dari cloud.
  // Sebelum ini true, penulisan storeInfo ke cloud diblokir agar setelan
  // default tidak menimpa pengaturan asli (mis. checkout di perangkat baru).
  const storeInfoLoadedRef = useRef(false);

  const stateRef = useRef({ products, customers, suppliers, sales, purchases, accounting, financialAccounts, users, storeInfo, categories, units, shiftHistory });
  
  useEffect(() => {
    stateRef.current = { products, customers, suppliers, sales, purchases, accounting, financialAccounts, users, storeInfo, categories, units, shiftHistory };
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

  // Gembok Anti-Refresh selama badge biru masih menyala atau shift masih buka
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (syncCount > 0) {
        e.preventDefault();
        e.returnValue = 'Data sedang dikunci ke Cloud. Jika Anda merefresh sekarang, data mungkin gagal tersimpan. Yakin ingin keluar?';
      } else if (activeShift && activeShift.status === 'OPEN') {
        e.preventDefault();
        e.returnValue = 'Shift masih terbuka. Harap tutup shift  sebelum keluar.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncCount, activeShift]);

  useEffect(() => {
    let unsubs = []; 
    let loadedCount = 0;
    const safetyTimer = setTimeout(() => { setLoading(false); }, 3000);
    const checkLoaded = () => { loadedCount++; if(loadedCount >= 8) { clearTimeout(safetyTimer); setLoading(false); } };

    const initializeAndListen = async () => {
      try {
        // PENTING: cek WAJIB langsung ke server (bukan cache lokal).
        // getDocs biasa menjawab dari cache saat offline — di perangkat baru cache
        // masih kosong, aplikasi mengira database baru, lalu menimpa pengaturan &
        // akun dengan setelan pabrik begitu koneksi kembali. getDocsFromServer
        // melempar error saat offline sehingga seeding otomatis dibatalkan.
        const usersSnap = await getDocsFromServer(query(collection(db, "users"), limit(1)));
        const settingsSnap = await getDocsFromServer(query(collection(db, "settings"), limit(1)));
        if (usersSnap.empty && settingsSnap.empty) {
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
            // CATATAN: users TIDAK di-seed lagi — akun dibuat via Firebase
            // Authentication (script migrate-auth.cjs / menu Pengaturan Akun),
            // password tidak pernah disimpan di Firestore.

            const defInfo = { name: 'MONIKA MULYA', tagline: 'Bismillah', address: 'Jl. Raya Blitar No. 1', phone: '081234567890', logo: null, ongkirPerKm: 2500, prefixSales: 'INV', prefixPurchase: 'PO', nextSeqSales: 1, nextSeqPurchase: 1 };
            await setDoc(doc(db, "settings", "storeInfo"), defInfo);
            await setDoc(doc(db, "settings", "categories"), { values: ['Sembako', 'Makanan', 'Minuman'] });
            await setDoc(doc(db, "settings", "units"), { values: ['Pcs', 'Kg', 'Sak'] });
        }
      } catch (e) {}

      const normalizeObj = (colName, obj) => {
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
      };

      const sortDescById = (data) => data.sort((a, b) => {
         if (typeof a.id === 'string' && typeof b.id === 'string') return b.id.localeCompare(a.id);
         return b.id - a.id;
      });

      // Firestore menganggap permission-denied sebagai error PERMANEN dan tidak
      // pernah otomatis mencoba lagi — beda dari error jaringan yang di-retry
      // sendiri. Di login pertama pada perangkat/tab yang benar-benar baru
      // (tanpa cache IndexedDB), ada celah waktu singkat di mana listener
      // pertama terpasang sebelum token auth sepenuhnya "nyantol" di SDK
      // Firestore, sehingga sempat ditolak walau usernya valid. Karena semua
      // user yang login selalu diizinkan baca (lihat firestore.rules), sebuah
      // permission-denied di titik ini nyaris pasti kejadian sesaat itu —
      // aman untuk dicoba ulang beberapa kali sebelum benar-benar menyerah.
      const withRetryOnDenied = (attach) => {
         let attempt = 0;
         let unsub = () => {};
         const tryAttach = () => {
            unsub = attach((error) => {
               if (error?.code === 'permission-denied' && attempt < 4) {
                  attempt++;
                  setTimeout(tryAttach, attempt * 500);
               } else {
                  clearTimeout(safetyTimer); setLoading(false);
               }
            });
         };
         tryAttach();
         return () => unsub();
      };

      const setupRealtime = (colName, setter, sortDesc = false, limitDate = false) => {
         let q = collection(db, colName);
         if (limitDate) {
             const historyLimitMonths = parseInt(localStorage.getItem('mmpos_historyLimitMonths') || '6', 10);
             const limitDateObj = new Date();
             limitDateObj.setMonth(limitDateObj.getMonth() - historyLimitMonths);
             const cutoffISO = limitDateObj.toISOString();

             let dateField = 'date';
             if (colName === 'activityLogs') dateField = 'timestamp';
             else if (colName === 'shiftHistory') dateField = 'startTime';

             q = query(q, where(dateField, '>=', cutoffISO));
         }

         return withRetryOnDenied((onError) => onSnapshot(q, (snap) => {
             let data = snap.docs.map(d => normalizeObj(colName, d.data()));
            if (sortDesc) sortDescById(data);
            setter(data);
            checkLoaded();
         }, onError));
      };

      // Untuk sales & purchases: gabungkan 2 query —
      // (1) transaksi terbaru sesuai limit riwayat, DAN
      // (2) SEMUA nota berstatus Tempo berapapun umurnya.
      // Dengan ini piutang/utang lama tidak pernah hilang dari Neraca,
      // riwayat, dan profil kontak meski melewati limit riwayat.
      const setupTransactionRealtime = (colName, setter) => {
         const historyLimitMonths = parseInt(localStorage.getItem('mmpos_historyLimitMonths') || '6', 10);
         const limitDateObj = new Date();
         limitDateObj.setMonth(limitDateObj.getMonth() - historyLimitMonths);
         const cutoffISO = limitDateObj.toISOString();

         let recentMap = null;
         let tempoMap = null;
         const publish = () => {
            if (recentMap === null && tempoMap === null) return;
            const merged = new Map([...(tempoMap || new Map()), ...(recentMap || new Map())]);
            const data = sortDescById(Array.from(merged.values()));
            setter(data);
         };

         unsubs.push(withRetryOnDenied((onError) => onSnapshot(query(collection(db, colName), where('date', '>=', cutoffISO)), (snap) => {
            recentMap = new Map(snap.docs.map(d => [d.id, normalizeObj(colName, d.data())]));
            publish();
            checkLoaded();
         }, onError)));

         unsubs.push(withRetryOnDenied((onError) => onSnapshot(query(collection(db, colName), where('status', '==', 'Tempo')), (snap) => {
            tempoMap = new Map(snap.docs.map(d => [d.id, normalizeObj(colName, d.data())]));
            publish();
         }, (error) => { if (error?.code !== 'permission-denied') return; onError(error); })));
      };

      unsubs.push(setupRealtime("products", setProducts));
      unsubs.push(setupRealtime("customers", setCustomers));
      unsubs.push(setupRealtime("suppliers", setSuppliers));
      setupTransactionRealtime("sales", setSales);
      setupTransactionRealtime("purchases", setPurchases);
      // Jurnal accounting TANPA limit tanggal: ini sumber kebenaran saldo
      // kas/bank di Neraca — kalau dipotong, saldonya jadi salah.
      unsubs.push(setupRealtime("accounting", setAccounting));
      unsubs.push(setupRealtime("financialAccounts", setFinancialAccounts));
      unsubs.push(setupRealtime("users", setUsers));
      unsubs.push(setupRealtime("shiftHistory", setShiftHistory, true, true));
      unsubs.push(setupRealtime("activityLogs", setActivityLogs, true, true));

      unsubs.push(withRetryOnDenied((onError) => onSnapshot(collection(db, "settings"), (snap) => {
         if (!snap.empty) {
            snap.docs.forEach(d => {
               if(d.id === 'storeInfo') {
                  const dData = d.data();
                  storeInfoLoadedRef.current = true;
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
      }, (error) => { if (error?.code !== 'permission-denied') return; onError(error); })));
    };
    
    // Auth per pengguna: listener data hanya jalan setelah user login sungguhan.
    // (Akun bersama "satpam" sudah dihapus — kredensial tidak lagi ada di kode.)
    let hasInitialized = false; // cegah init/seeding-check ganda saat auth refresh
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setAuthUid(firebaseUser.uid);
        if (!hasInitialized) {
          hasInitialized = true;
          setLoading(true);
          // Pastikan token auth benar-benar sudah "nyantol" di SDK sebelum
          // memasang listener Firestore — mengurangi peluang permission-denied
          // sesaat pada login pertama di perangkat/tab yang cache-nya kosong.
          await firebaseUser.getIdToken().catch(() => {});
          await initializeAndListen();
        }
      } else {
        setAuthUid(null);
        setUser(null);
        setLoading(false); // tidak ada sesi tersimpan → langsung tampilkan layar login
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(u => u());
    };
  }, []);

  useEffect(() => {
    // Sesi login sekarang dikelola Firebase Auth (persistence). Di sini hanya
    // cek idle: kalau terakhir aktif > 5 jam lalu, paksa keluar dari sesi tersimpan.
    const lastActive = localStorage.getItem('mmpos_last_active');
    if (lastActive && Date.now() - parseInt(lastActive, 10) > 5 * 60 * 60 * 1000) {
      localStorage.removeItem('mmpos_user');
      localStorage.removeItem('mmpos_last_active');
      signOut(auth).catch(() => {});
    } else {
      localStorage.setItem('mmpos_last_active', Date.now().toString());
    }
    const updateActivity = () => { localStorage.setItem('mmpos_last_active', Date.now().toString()); };
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
      showToast(`Sinkronisasi Error: ${err.message}`, "error");
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
  const customSetShiftHistory = (next) => { const cur = stateRef.current.shiftHistory; const res = typeof next === 'function' ? next(cur) : next; setShiftHistory(res); syncCollection("shiftHistory", res, cur); };

  const customSetStoreInfo = (next) => {
     const res = typeof next === 'function' ? next(stateRef.current.storeInfo) : next;
     setStoreInfo(res);
     try { localStorage.setItem('mmpos_storeInfo', JSON.stringify(res)); } catch (e) {}
     if (!storeInfoLoadedRef.current) {
        console.warn("☠️ BLOKIR KEAMANAN: Penulisan storeInfo ke cloud diblokir karena pengaturan asli belum termuat dari server.");
        return Promise.resolve();
     }
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
      // Backup lama bisa berisi password plaintext — jangan pernah tulis balik ke cloud
      if (parsedData.users) parsedData.users = parsedData.users.map(({ password, ...rest }) => rest);
      // 1. UPDATE LAYAR INSTAN (Tampil 0 detik)
      if (parsedData.products) setProducts(parsedData.products);
      if (parsedData.customers) setCustomers(parsedData.customers);
      if (parsedData.suppliers) setSuppliers(parsedData.suppliers);
      if (parsedData.sales) setSales(parsedData.sales);
      if (parsedData.purchases) setPurchases(parsedData.purchases);
      if (parsedData.accounting) setAccounting(parsedData.accounting);
      if (parsedData.financialAccounts) setFinancialAccounts(parsedData.financialAccounts);
      if (parsedData.users) setUsers(parsedData.users);
      if (parsedData.shiftHistory) setShiftHistory(parsedData.shiftHistory);

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
      if (parsedData.shiftHistory) syncProms.push(syncCollection("shiftHistory", parsedData.shiftHistory, stateRef.current.shiftHistory));
      
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

  useEffect(() => {
     if (users && users.length > 0) {
        let needsMigration = false;
        const migratedUsers = users.map(u => {
           if (u.permissions && (u.permissions.includes('penjualan') || u.permissions.includes('pembelian'))) {
               needsMigration = true;
               const newPerms = u.permissions.filter(p => p !== 'penjualan' && p !== 'pembelian');
               if (!newPerms.includes('riwayat')) newPerms.push('riwayat');
               return { ...u, permissions: newPerms };
           }
           return u;
        });
        if (needsMigration) {
           customSetUsers(migratedUsers);
        }
     }
  }, [users]);

  const baseThemeColors = useMemo(() => {
    return {
       bg: theme === 'dark' ? 'bg-[#09090B]' : 'bg-[#F4F4F5]', 
       panel: theme === 'dark' ? 'bg-[#18181B]/40 backdrop-blur-xl' : 'bg-white/40 backdrop-blur-xl', 
       text: theme === 'dark' ? 'text-[#FAFAFA]' : 'text-[#18181B]', 
       textMuted: theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]', 
       border: theme === 'dark' ? 'border-[#27272A]/50' : 'border-[#E4E4E7]/50', 
       creamBg: theme === 'dark' ? 'bg-[#27272A]/40' : 'bg-[#F8FAFC]/40',
       gold: 'text-[#D4AF37]', 
       goldBg: 'bg-[#D4AF37]', 
       goldHoverText: 'hover:text-[#D4AF37]',
       goldHoverBorder: 'hover:border-[#D4AF37]',
       goldRing: 'focus:ring-[#D4AF37]'
    };
  }, [theme]);

  const themeColors = useMemo(() => {
    const base = { 
       bg: theme === 'dark' ? 'bg-[#09090B]' : 'bg-[#F4F4F5]', 
       panel: theme === 'dark' ? 'bg-[#18181B]/40 backdrop-blur-xl' : 'bg-white/40 backdrop-blur-xl', 
       text: theme === 'dark' ? 'text-[#FAFAFA]' : 'text-[#18181B]', 
       textMuted: theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]', 
       border: theme === 'dark' ? 'border-[#27272A]/50' : 'border-[#E4E4E7]/50', 
       creamBg: theme === 'dark' ? 'bg-[#27272A]/40' : 'bg-[#F8FAFC]/40' 
    };
    if (globalMode === 'pembelian') {
       return {
          ...base,
          gold: 'text-blue-500', 
          goldBg: 'bg-blue-600', 
          goldHoverText: 'hover:text-blue-500',
          goldHoverBorder: 'hover:border-blue-500',
          goldRing: 'focus:ring-blue-500'
       };
    }
    return {
       ...base,
       gold: 'text-[#D4AF37]', 
       goldBg: 'bg-[#D4AF37]', 
       goldHoverText: 'hover:text-[#D4AF37]',
       goldHoverBorder: 'hover:border-[#D4AF37]',
       goldRing: 'focus:ring-[#D4AF37]'
    };
  }, [theme, globalMode]);

  const handleLogin = () => {
    // Firebase Auth sudah berhasil di LoginScreen. Profil user akan
    // ter-resolve otomatis dari koleksi users (lihat effect di atas);
    // flag ini memastikan aktivitas login tercatat sekali.
    justLoggedInRef.current = true;
  };

  useEffect(() => {
    if (products && products.length > 0 && categories && units) {
      const prodCats = products.map(p => p.category).filter(Boolean);
      const prodUnits = products.map(p => p.unit).filter(Boolean);
      
      const uniqueCats = Array.from(new Set([...categories, ...prodCats].map(c => typeof c === 'string' ? c.toUpperCase().trim() : c))).sort();
      const uniqueUnits = Array.from(new Set([...units, ...prodUnits].map(u => typeof u === 'string' ? u.toLowerCase().trim() : u))).sort();
      
      let changedCats = false;
      let changedUnits = false;
      
      if (uniqueCats.length > categories.length) {
         setCategories(uniqueCats);
         changedCats = true;
      }
      if (uniqueUnits.length > units.length) {
         setUnits(uniqueUnits);
         changedUnits = true;
      }
      
      if (changedCats) {
         setDoc(doc(db, "settings", "categories"), { values: JSON.parse(JSON.stringify(uniqueCats)) }).catch(console.error);
      }
      if (changedUnits) {
         setDoc(doc(db, "settings", "units"), { values: JSON.parse(JSON.stringify(uniqueUnits)) }).catch(console.error);
      }
    }
  }, [products, categories, units]);

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
             <img src={storeInfo.logo} alt="Logo" className="w-28 h-28 object-contain mb-6 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
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
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} activeMenu={activeMenu} handleMenuClick={(menu) => { setActiveMenu(menu); if (menu === 'laporan') setGlobalMode('neraca'); }} colors={themeColors} user={user} storeInfo={storeInfo} />
      <div className="flex-1 flex flex-col min-w-0 relative">
         <Header activeMenu={activeMenu} user={user} setUser={setUser} 
            isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
            theme={theme} setTheme={setTheme} colors={themeColors} isSoundOn={true} 
            storeInfo={storeInfo} onNavigateAndEdit={handleNavigateAndEdit}
            products={products} sales={sales} purchases={purchases} suppliers={suppliers} 
            syncCount={syncCount}
            users={users} setUsers={customSetUsers}
            showToast={showToast}
            activeShift={activeShift} setShowShiftOpenModal={setShowShiftOpenModal} setShowShiftCloseModal={setShowShiftCloseModal}
            shiftHistory={shiftHistory} recordActivity={recordActivity}
            installPrompt={installPrompt}
         />
         
         <main className="flex-1 overflow-auto p-4 pb-0 md:p-6 md:pb-0 custom-scrollbar relative">
             <div className={activeMenu === 'pos' ? 'block h-full' : 'hidden'}>
                <POS products={products} setProducts={customSetProducts} customers={customers} setCustomers={customSetCustomers} suppliers={suppliers} sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} colors={themeColors} user={user} storeInfo={storeInfo} setStoreInfo={customSetStoreInfo} accounting={accounting} setAccounting={customSetAccounting} financialAccounts={financialAccounts} isSoundOn={true} showToast={showToast} theme={theme} globalMode={globalMode} setGlobalMode={setGlobalMode} activeShift={activeShift} setActiveShift={setActiveShift} setShowShiftOpenModal={setShowShiftOpenModal} recordActivity={recordActivity} />
             </div>
             
             <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-white"></div></div>}>
                 {activeMenu === 'dashboard' && <Dashboard products={products} sales={sales} purchases={purchases} customers={customers} colors={baseThemeColors} theme={theme} handleMenuClick={setActiveMenu} isSoundOn={true} globalChartMode={globalChartMode} setGlobalChartMode={setGlobalChartMode} />}
             {activeMenu === 'produk' && <ProductManager products={products} setProducts={customSetProducts} categories={categories} units={units} sales={sales} colors={baseThemeColors} user={user} isSoundOn={true} showToast={showToast} editIntent={editIntent} recordActivity={recordActivity} storeInfo={storeInfo} setStoreInfo={customSetStoreInfo} />}
             {activeMenu === 'riwayat' && <POSHistory sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} products={products} setProducts={customSetProducts} colors={themeColors} accounting={accounting} setAccounting={customSetAccounting} customers={customers} setCustomers={customSetCustomers} suppliers={suppliers} financialAccounts={financialAccounts} storeInfo={storeInfo} isSoundOn={true} showToast={showToast} globalMode={globalMode} setGlobalMode={setGlobalMode} editIntent={editIntent} user={user} recordActivity={recordActivity} />}
               {activeMenu === 'kontak' && <ContactManager customers={customers} setCustomers={customSetCustomers} suppliers={suppliers} setSuppliers={customSetSuppliers} sales={sales} setSales={customSetSales} purchases={purchases} setPurchases={customSetPurchases} products={products} setProducts={customSetProducts} colors={themeColors} isSoundOn={true} showToast={showToast} globalMode={globalMode} setGlobalMode={setGlobalMode} handleNavigateAndEdit={handleNavigateAndEdit} user={user} accounting={accounting} setAccounting={customSetAccounting} financialAccounts={financialAccounts} />}
             {activeMenu === 'laporan' && <Reports sales={sales} purchases={purchases} products={products} accounting={accounting} setAccounting={customSetAccounting} financialAccounts={financialAccounts} customers={customers} colors={themeColors} baseColors={baseThemeColors} storeInfo={storeInfo} isSoundOn={true} showToast={showToast} theme={theme} globalMode={globalMode} setGlobalMode={setGlobalMode} globalChartMode={globalChartMode} setGlobalChartMode={setGlobalChartMode} user={user} />}
             {activeMenu === 'aktivitas' && <ActivityLogPage activityLogs={activityLogs} shiftHistory={shiftHistory} colors={themeColors} />}
             
             {activeMenu === 'pengaturan' && (
                <SettingsPage 
                   colors={baseThemeColors} user={user} 
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
             </Suspense>
         </main>
      </div>
        {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 slide-up-animation ${
          toast.type === 'success' ? 'bg-[#D4AF37] text-[#18181B]' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="font-semibold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* PWA Prompt Updater (elegan) */}
      <ReloadPrompt />
      
      {showShiftCloseModal && (
          <ShiftCloseModal 
              colors={themeColors}
              activeShift={activeShift}
              setActiveShift={setActiveShift}
              shiftHistory={shiftHistory}
              setShiftHistory={customSetShiftHistory}
              onClose={() => setShowShiftCloseModal(false)}
              accounting={accounting}
              setAccounting={customSetAccounting}
              user={user}
              storeInfo={storeInfo}
              sales={sales}
              financialAccounts={financialAccounts}
          />
      )}

      {showShiftOpenModal && (
          <ShiftOpenModal 
              colors={themeColors}
              onClose={() => setShowShiftOpenModal(false)}
              setActiveShift={setActiveShift}
              user={user}
              lastShiftRemaining={shiftHistory.length > 0 ? (shiftHistory[0].actualCash - (shiftHistory[0].dropCash || 0)) : 0}
          />
      )}
      </div>
    );
}