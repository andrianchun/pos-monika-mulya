import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, ChevronLeft, ChevronRight, X, Trash2, Calendar, Ticket, Gift } from 'lucide-react';
import { formatIDR, parseIDR, playSound, calculateDynamicPrice, smartFormatInput } from '../utils/helpers';
import useDebounce from '../hooks/useDebounce';
import SearchableSelect from '../components/ui/SearchableSelect';
import CheckoutModal from '../components/modals/CheckoutModal';
import DocumentReceiptModal from '../components/modals/DocumentReceiptModal';

function ModeToggle({ mode, setMode, colors, isSoundOn }) {
  return (
     <div className={`flex items-center ${colors.creamBg} p-1 rounded-lg w-fit h-fit shrink-0 border ${colors.border}`}>
        <button onClick={() => { playSound('pop', isSoundOn); setMode('penjualan') }} className={`px-4 sm:px-6 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'penjualan' ? colors.goldBg + ' text-[#18181B] shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Penjualan</button>
        <button onClick={() => { playSound('pop', isSoundOn); setMode('pembelian') }} className={`px-4 sm:px-6 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'pembelian' ? 'bg-blue-600 text-white shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Pembelian</button>
     </div>
  );
}

export default function POS({ products, setProducts, customers, setCustomers, suppliers, sales, setSales, purchases, setPurchases, colors: baseColors, showToast, user, isSoundOn, theme, storeInfo, setStoreInfo, accounting, setAccounting, financialAccounts }) {
  const [posMode, setPosMode] = useState('penjualan'); 
  
  const colors = useMemo(() => {
    if (posMode === 'pembelian') {
      return {
        ...baseColors,
        gold: 'text-blue-500',
        goldBg: 'bg-blue-500',
        goldHoverText: 'hover:text-blue-500',
        goldHoverBorder: 'hover:border-blue-500',
        goldRing: 'focus:ring-blue-500'
      };
    }
    return {
      ...baseColors,
      goldHoverText: 'hover:text-[#D4AF37]',
      goldHoverBorder: 'hover:border-[#D4AF37]',
      goldRing: 'focus:ring-[#D4AF37]'
    };
  }, [posMode, baseColors]);

  const [salesCart, setSalesCart] = useState([]);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const debouncedPosSearch = useDebounce(posSearch, 300);
  const [posDiscountStr, setPosDiscountStr] = useState('');
  const [posOngkirStr, setPosOngkirStr] = useState('');
  const [useAutoOngkir, setUseAutoOngkir] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]?.id || '');
  const [selectedSupplier, setSelectedSupplier] = useState(1);
  const getTodayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const [transactionDate, setTransactionDate] = useState(getTodayStr()); 
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState(financialAccounts[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [completedDoc, setCompletedDoc] = useState(null);

  const cart = posMode === 'penjualan' ? salesCart : purchaseCart;
  const setCart = posMode === 'penjualan' ? setSalesCart : setPurchaseCart;

  const handleModeChange = (mode) => { setPosMode(mode); setPosDiscountStr(''); setPosOngkirStr(''); setUseAutoOngkir(false); };

  // =========================================================================
  // 🔥 TRIK ALFAMART: SEARCH BY WA (Menggabungkan Nama + No WA di Dropdown)
  // =========================================================================
  const customerOptions = customers.map(c => ({
     ...c,
     name: c.phone && c.phone !== '-' && String(c.id) !== '1' ? `${c.name} (${c.phone})` : c.name
  }));

  const supplierOptions = [
    { id: 1, name: '(anonim)' },
    ...suppliers.map(s => ({
       ...s,
       name: s.phone && s.phone !== '-' ? `${s.name} (${s.phone})` : s.name
    }))
  ];
  // =========================================================================

  useEffect(() => {
     if(!useAutoOngkir) return;
     const cust = customers.find(c => c.id === selectedCustomer);
     if (cust && cust.distance > 0 && cart.length > 0) setPosOngkirStr(Math.ceil(cust.distance * storeInfo.ongkirPerKm).toString());
     else if (cust?.id === 1) setPosOngkirStr('');
  }, [selectedCustomer, storeInfo.ongkirPerKm, useAutoOngkir, cart.length, customers]); 

  // PERBAIKAN: Mengurutkan list barang grid POS secara abjad dan optimasi performa (useMemo + dictionary cart)
  const displayProducts = useMemo(() => {
     // Buat map (dictionary) untuk cart agar lookup O(1) alih-alih O(N) menggunakan .find() pada setiap produk
     const cartMap = new Map();
     for (let i = 0; i < cart.length; i++) {
        cartMap.set(cart[i].id, Number(cart[i].qty) || 0);
     }
     
     const lowerSearch = debouncedPosSearch.toLowerCase();

     return products.map(p => {
        const qtyInCart = cartMap.get(p.id) || 0;
        return { ...p, currentStock: posMode === 'penjualan' ? p.stock - qtyInCart : p.stock };
     }).filter(p => {
        if (!lowerSearch) return true;
        return p.name.toLowerCase().includes(lowerSearch) || (p.barcode && p.barcode.includes(debouncedPosSearch));
     }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, cart, posMode, debouncedPosSearch]);

  const calcItemPricing = (product, newQty) => {
    if (posMode !== 'penjualan') return { unitPrice: product.cost, isWholesale: false, basePrice: product.cost, appliedPromo: null };
    
    let isWholesale = false;
    let basePrice = product.price;
    let unitPrice = basePrice;

    const wholesales = storeInfo.wholesales || [];
    const ruleGrosir = wholesales.find(w => String(w.productId) === String(product.id));
    if (ruleGrosir && newQty >= Number(ruleGrosir.minQty)) {
       unitPrice = Number(ruleGrosir.wholesalePrice);
       isWholesale = true;
    }

    const promos = storeInfo.promos || [];
    const today = new Date();
    today.setHours(0,0,0,0);

    let activePromo = null;
    let maxDiscountVal = 0;

    promos.forEach(pr => {
       const start = new Date(pr.startDate); start.setHours(0,0,0,0);
       const end = new Date(pr.endDate); end.setHours(23,59,59,999);
       
       if (today >= start && today <= end) {
          const tItems = pr.targetItems || (pr.targetItem ? [pr.targetItem] : []);
          const matchProd = pr.targetType === 'semua' || tItems.includes(String(product.id));
          
          const tCusts = pr.targetCustomers || (pr.targetCustomer && pr.targetCustomer !== 'semua' ? [pr.targetCustomer] : []);
          const matchCust = pr.targetCustomerType === 'semua' || tCusts.includes(String(selectedCustomer));

          if (matchProd && matchCust) {
             const discAmt = pr.discType === '%' ? (unitPrice * pr.discValue / 100) : Number(pr.discValue);
             if (discAmt > maxDiscountVal) {
                maxDiscountVal = discAmt;
                activePromo = pr;
             }
          }
       }
    });

    if (activePromo) {
       unitPrice = Math.max(0, unitPrice - maxDiscountVal);
    }

    return { unitPrice, isWholesale, basePrice, appliedPromo: activePromo };
  };

  const addToCart = (product) => {
    if (posMode === 'penjualan' && product.currentStock <= 0) { 
      playSound('pop', isSoundOn); 
      showToast('Stok habis! Mengalihkan ke mode Pembelian.', 'warning'); 
      setPosMode('pembelian');
      return; 
    }
    playSound('drop', isSoundOn);
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const newQty = existing ? Number(existing.qty) + 1 : 1;
      const pricing = calcItemPricing(product, newQty);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: newQty, subtotal: newQty * pricing.unitPrice, ...pricing } : item);
      return [...prev, { ...product, qty: 1, subtotal: pricing.unitPrice, ...pricing }];
    });
  };

  const updateCartQtyString = (id, strVal) => {
    let cleanStr = strVal.replace(/[^0-9,.]/g, ''); if(cleanStr.endsWith('.')) cleanStr = cleanStr.slice(0,-1)+','; cleanStr = cleanStr.replace(/\./g, '');
    setCart(prev => prev.map(item => item.id === id ? { ...item, qtyString: cleanStr } : item));
    if (cleanStr === '') return;
    const floatVal = parseFloat(cleanStr.replace(',', '.'));
    if (isNaN(floatVal) || floatVal <= 0) return;
    const product = products.find(p => p.id === id);
    if (posMode === 'penjualan' && floatVal > product.stock) { 
      showToast('Melebihi sisa stok! Mengalihkan ke mode Pembelian.', 'warning'); 
      setPosMode('pembelian');
      return;
    }
    setCart(prev => prev.map(item => {
       if (item.id === id) {
           const pricing = calcItemPricing(product, floatVal);
           return { ...item, qty: floatVal, subtotal: floatVal * pricing.unitPrice, ...pricing };
       }
       return item;
    }));
  };

  const adjustQtyStep = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const currentQty = Number(item.qty) || 0;
    const nextQty = Math.max(0, currentQty + delta);
    if (nextQty <= 0) { removeFromCart(id); return; }
    const product = products.find(p => p.id === id);
    if (posMode === 'penjualan' && nextQty > product.stock) { showToast('Melebihi sisa stok!', 'error'); return; }
    playSound(delta > 0 ? 'drop' : 'pop', isSoundOn);
    setCart(prev => prev.map(i => {
       if (i.id === id) {
          const pricing = calcItemPricing(product, nextQty);
          return { ...i, qty: nextQty, qtyString: String(nextQty).replace('.', ','), subtotal: nextQty * pricing.unitPrice, ...pricing };
       }
       return i;
    }));
  };

  useEffect(() => {
     if (cart.length > 0) {
        setCart(prev => prev.map(item => {
           const product = products.find(p => p.id === item.id);
           if (!product) return item;
           const pricing = calcItemPricing(product, item.qty);
           return { ...item, ...pricing, subtotal: item.qty * pricing.unitPrice };
        }));
     }
  }, [selectedCustomer]);

  const removeFromCart = (id) => { playSound('pop', isSoundOn); setCart(prev => prev.filter(item => item.id !== id)); }
  const clearCart = () => { playSound('pop', isSoundOn); setCart([]); setPosDiscountStr(''); setPosOngkirStr(''); showToast('Keranjang dibersihkan', 'success'); }

  const subTotal = cart.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  let actualDiscount = posDiscountStr.includes('%') ? (subTotal * (parseFloat(posDiscountStr) || 0)) / 100 : parseIDR(posDiscountStr || 0);
  const actualOngkir = parseIDR(posOngkirStr || 0);
  const total = subTotal - actualDiscount + actualOngkir;

  const ptMultiplier = storeInfo.pointMultiplier || 10000;
  const ptReward = storeInfo.pointReward || 1;
  const isCustomerUmum = String(selectedCustomer) === '1' || selectedCustomer === '';
  const earnedPoints = posMode === 'penjualan' && !isCustomerUmum ? Math.floor(total / ptMultiplier) * ptReward : 0;

  const handleCheckout = (e, action, depositUsed = 0, depositAdded = 0) => {
    if(e) e.preventDefault();
    const paidCash = paymentAmount === '' ? 0 : parseIDR(paymentAmount);
    const totalPaid = paidCash + depositUsed;
    if(paidCash < 0) { showToast('Masukkan nominal valid!', 'error'); return; }
    
    const isLunas = totalPaid >= total;
    
    // Hitung uang fisik yang benar-benar masuk laci kasir (potong kembalian jika tidak masuk deposit)
    let actualCashToKas = paidCash;
    if (totalPaid > total && depositAdded === 0) {
      const kembalian = totalPaid - total;
      actualCashToKas = paidCash - kembalian;
    }
    
    // --- TAMBAHAN VALIDASI PIUTANG / UTANG ---
    if (!isLunas) {
      if (!dueDate) {
        showToast('Tanggal Jatuh Tempo WAJIB diisi untuk transaksi Tempo/Piutang/Utang!', 'error');
        return;
      }
      if (posMode === 'penjualan') {
        const custObj = customers.find(c => String(c.id) === String(selectedCustomer));
        if (!custObj || String(custObj.id) === '1' || !custObj.name || custObj.name === '(anonim)' || !custObj.phone) {
          showToast('Transaksi PIUTANG wajib memilih Pelanggan dengan Nama & No. HP!', 'error');
          return;
        }
      } else {
        const suppObj = suppliers.find(c => String(c.id) === String(selectedSupplier));
        if (!suppObj || String(suppObj.id) === '1' || !suppObj.name || suppObj.name === '(anonim)' || !suppObj.phone) {
          showToast('Transaksi UTANG wajib memilih Supplier dengan Nama & No. HP!', 'error');
          return;
        }
      }
    }
    // -----------------------------------------

    playSound('cash', isSoundOn);
    
    const docDate = transactionDate ? new Date(transactionDate) : new Date();
    const dstr = `${String(docDate.getDate()).padStart(2,'0')}${String(docDate.getMonth()+1).padStart(2,'0')}${docDate.getFullYear()}`;
    let genNota = posMode === 'penjualan' ? `${storeInfo.prefixSales}${dstr}-${String(storeInfo.nextSeqSales).padStart(4,'0')}` : `${storeInfo.prefixPurchase}${dstr}-${String(storeInfo.nextSeqPurchase).padStart(4,'0')}`;
    
    const custObj = customers.find(c => String(c.id) === String(selectedCustomer));
    const suppObj = suppliers.find(c => String(c.id) === String(selectedSupplier));
    const cName = custObj?.name || '-';
    const sName = suppObj?.name || '-';
    const activeAccount = financialAccounts.find(a => a.id === Number(paymentMethodId));

    const newRecord = {
      id: Date.now(), nota: genNota, date: docDate.toISOString(),
      customer: posMode === 'penjualan' ? cName : undefined, supplier: posMode === 'pembelian' ? sName : undefined,
      phone: posMode === 'penjualan' ? custObj?.phone : suppObj?.phone, 
      items: cart, subtotal: subTotal, discount: actualDiscount, ongkir: actualOngkir, total, paid: totalPaid, status: isLunas ? 'Lunas' : 'Tempo', dueDate: isLunas ? null : dueDate,
      depositUsed, depositAdded,
      kasir: user.name, earnedPoints,
      paymentHistory: [
         ...(depositUsed > 0 ? [{ date: docDate.toISOString(), amount: depositUsed, method: 'Saldo Deposit', accountId: null }] : []),
         ...(paidCash > 0 ? [{ date: docDate.toISOString(), amount: paidCash, method: activeAccount ? activeAccount.name : 'Unknown', accountId: Number(paymentMethodId) }] : [])
      ]
    };

    setCheckoutModal(false); 
    setShowMobileCart(false); 
    setCart([]); 
    setPosDiscountStr(''); 
    setPosOngkirStr(''); 
    setPaymentAmount(''); 
    setDueDate(''); 
    setTransactionDate(getTodayStr()); 
    setPaymentMethodId(financialAccounts[0]?.id || '');
    setUseAutoOngkir(false);
    setSelectedCustomer(customers[0]?.id || '');
    setSelectedSupplier(1);

    if (action === 'simpan') {
       setCompletedDoc(null);
       showToast(`Transaksi Berhasil! ${earnedPoints > 0 ? `(+${earnedPoints} Poin)` : ''}`, 'success');
    } else if (action === 'cetak') {
       setCompletedDoc({ ...newRecord, autoAction: 'cetak' });
    } else if (action === 'wa') {
       setCompletedDoc({ ...newRecord, autoAction: 'wa' });
    }

    setTimeout(() => {
        if(posMode === 'penjualan') setStoreInfo({...storeInfo, nextSeqSales: storeInfo.nextSeqSales + 1});
        else setStoreInfo({...storeInfo, nextSeqPurchase: storeInfo.nextSeqPurchase + 1});

        setProducts(prevProducts => prevProducts.map(p => {
          const cartItem = cart.find(c => c.id === p.id);
          if (cartItem) return { ...p, stock: posMode === 'penjualan' ? p.stock - Number(cartItem.qty) : p.stock + Number(cartItem.qty) };
          return p;
        }));
        
        if (posMode === 'penjualan' && (!isCustomerUmum || depositUsed > 0 || depositAdded > 0)) {
           setCustomers(prevCusts => prevCusts.map(c => {
             if (String(c.id) === String(selectedCustomer)) {
                 const updatedPoints = earnedPoints > 0 ? (c.points || 0) + earnedPoints : c.points;
                 const updatedDeposit = (c.deposit || 0) - depositUsed + depositAdded;
                 return { ...c, points: updatedPoints, deposit: updatedDeposit };
             }
             return c;
           }));
        }

        if (actualCashToKas > 0 && activeAccount) {
            setAccounting(prev => [...prev, { id: Date.now()+1, type: 'kas', accountId: activeAccount.id, name: posMode === 'penjualan' ? `Penerimaan Nota ${genNota}` : `Pembayaran Nota ${genNota}`, amount: posMode === 'penjualan' ? actualCashToKas : -actualCashToKas, date: docDate.toISOString() }]);
        }

        if(posMode === 'penjualan') setSales(prev => [newRecord, ...prev]); 
        else setPurchases(prev => [newRecord, ...prev]);

    }, 50); 
  };

  const handleSearchKeyDown = (e) => {
     if(e.key === 'Enter' && posSearch.trim() !== '') {
        const exactProd = products.find(p => p.barcode === posSearch.trim() || p.name.toLowerCase() === posSearch.trim().toLowerCase());
        if(exactProd) { addToCart(exactProd); setPosSearch(''); } 
        else if (displayProducts.length === 1) { addToCart(displayProducts[0]); setPosSearch(''); } 
        else { showToast('Produk tidak ditemukan', 'error'); playSound('pop', isSoundOn); }
     }
  }

  return (
    <div className="h-full flex flex-col -m-4 lg:-m-6 print:m-0">
      <div className="flex-1 overflow-hidden print:overflow-visible bg-gray-50 dark:bg-[#121212]">
        <div className="flex flex-col lg:flex-row h-full relative overflow-hidden">
          <div className={`flex-1 flex-col p-2 sm:p-4 border-b lg:border-b-0 lg:border-r ${colors.border} ${colors.panel} h-full lg:h-auto overflow-hidden ${showMobileCart ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex flex-col gap-3 mb-4 shrink-0">
              <div className="flex justify-start items-center gap-2">
                 <ModeToggle mode={posMode} setMode={handleModeChange} colors={colors} isSoundOn={isSoundOn} />
              </div>
              <div className="relative w-full">
                 <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textMuted}`} size={20} />
                 <input type="text" placeholder="Cari nama atau Barcode..." className={`w-full pl-10 pr-4 py-3 rounded-xl border ${colors.border} ${colors.creamBg} ${colors.text} focus:outline-none focus:ring-2 ${colors.goldRing}`} value={posSearch} onChange={e => setPosSearch(e.target.value)} onKeyDown={handleSearchKeyDown} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-10">
                {displayProducts.map(p => (
                     <div key={p.id} onClick={() => addToCart(p)} className={`bg-black/10 dark:bg-black/30 backdrop-blur-md border ${colors.border} rounded-2xl cursor-pointer hover:border-[#D4AF37]/50 transition-all active:scale-95 relative overflow-hidden group min-h-[140px] sm:min-h-[160px] flex flex-col justify-end`}>
                       
                       {/* Background Image Layer */}
                       <div className="absolute inset-0 z-0 bg-white/10 dark:bg-[#1e1e1e]/40 flex items-center justify-center overflow-hidden">
                          {p.img && p.img.startsWith('data:image') ? (
                             <img src={p.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 dark:opacity-75" alt={p.name} />
                          ) : (
                             <span className="text-6xl opacity-20 filter grayscale transition-transform duration-700 group-hover:scale-110">📦</span>
                          )}
                          {/* Gradient Overlay for Text Visibility */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-[#18181B]/60 to-transparent"></div>
                       </div>

                       {posMode === 'penjualan' && p.currentStock <= 0 && <div className="absolute inset-0 bg-white/60 dark:bg-black/60 z-20 flex items-center justify-center font-black text-xl text-red-600 backdrop-blur-[2px] tracking-widest">HABIS</div>}
                       
                       {/* Content Layer */}
                       <div className="relative z-10 p-3 sm:p-4 text-left w-full">
                         <div className={`font-bold text-[11px] sm:text-sm leading-tight mb-2 line-clamp-2 text-white drop-shadow-md group-hover:text-[#D4AF37] transition-colors`}>{p.name}</div>
                         
                         <div className="flex justify-between items-end">
                            <div className={`font-black text-[13px] sm:text-base ${posMode === 'penjualan' ? 'text-[#D4AF37]' : 'text-blue-500'} drop-shadow-md`}>Rp {formatIDR(posMode === 'penjualan' ? calcItemPricing(p, 1).unitPrice : p.cost)}</div>
                            <div className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm bg-black/40 border border-white/10 ${posMode === 'penjualan' && p.currentStock < 5 ? 'text-red-400 font-bold border-red-500/30' : 'text-gray-300 font-medium'}`}>{String(p.currentStock).replace('.', ',')} {p.unit}</div>
                         </div>
                       </div>
                     </div>
                ))}
              </div>
            </div>
            <div className="lg:hidden mt-2 shrink-0">
               <button onClick={() => { playSound('pop', isSoundOn); setShowMobileCart(true); }} className={`w-full py-3.5 rounded-xl font-bold text-[#18181B] shadow-md flex justify-between items-center px-4 active:scale-95 transition-transform ${posMode === 'penjualan' ? colors.goldBg : colors.goldBg}`}>
                  <span className="flex items-center gap-2"><ShoppingCart size={18}/> {cart.length} Item</span><span className="flex items-center gap-1">Rp {formatIDR(total)} <ChevronRight size={18}/></span>
               </button>
            </div>
          </div>
          <div className={`w-full lg:w-[400px] xl:w-[450px] flex-col ${colors.panel} shrink-0 h-full border-t lg:border-t-0 shadow-lg lg:shadow-none z-10 relative overflow-hidden ${showMobileCart ? 'flex' : 'hidden lg:flex'}`}>
            {storeInfo?.banner && (
               <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10 mix-blend-overlay" 
                    style={{ backgroundImage: `url(${storeInfo.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
               </div>
            )}
            <div className="lg:hidden flex items-center p-2 border-b border-gray-200 dark:border-gray-800 bg-[#F8FAFC] dark:bg-[#27272A] shrink-0 relative z-10">
               <button onClick={() => { playSound('pop', isSoundOn); setShowMobileCart(false); }} className={`flex items-center gap-1 font-bold text-sm py-1.5 px-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ${colors.text}`}><ChevronLeft size={18}/> Kembali</button>
            </div>
            <div className={`p-3 sm:p-4 border-b ${colors.border} flex flex-col gap-3 bg-transparent shrink-0 relative z-30`}>
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                   <label className={`text-[10px] sm:text-xs font-semibold mb-1 block ${colors.textMuted}`}>{posMode === 'penjualan' ? 'Pilih Customer' : 'Pilih Supplier'}</label>
                   <SearchableSelect options={posMode === 'penjualan' ? customerOptions : supplierOptions} value={posMode === 'penjualan' ? selectedCustomer : selectedSupplier} onChange={posMode === 'penjualan' ? setSelectedCustomer : setSelectedSupplier} placeholder={`Pilih ${posMode === 'penjualan' ? 'Customer' : 'Supplier'}...`} colors={colors} />
                   
                   {(posMode === 'penjualan' && earnedPoints > 0) && (
                      <div className="absolute top-0 right-0 flex items-center gap-1 text-[9px] font-bold bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded shadow-sm animate-pulse">
                         <Gift size={10}/> +{earnedPoints} Poin
                      </div>
                   )}
                </div>
                <div className="w-[120px]">
                   <label className={`text-[10px] sm:text-xs font-semibold mb-1 block ${colors.textMuted}`}>Tanggal</label>
                   <input type="date" className={`w-full p-[9px] rounded-xl border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none text-xs [color-scheme:light] dark:[color-scheme:dark]`} value={transactionDate} onChange={e => setTransactionDate(e.target.value)} />
                </div>
                <button onClick={clearCart} className={`p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors h-[42px]`}><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 custom-scrollbar bg-transparent relative z-10">
              {cart.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full ${colors.textMuted}`}><ShoppingCart size={40} className="mb-2 opacity-30" /><p className="text-sm">Keranjang kosong</p></div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className={`flex gap-2 sm:gap-3 p-2 sm:p-3 border rounded-xl shadow-sm ${colors.border} bg-white/15 dark:bg-[#1e1e1e]/15 backdrop-blur-md relative overflow-hidden`}>
                    {(item.isWholesale || item.appliedPromo) && (
                       <div className={`absolute top-0 left-0 w-1 h-full ${item.appliedPromo ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                    )}
                    
                    <div className="flex-1 pl-1 min-w-0">
                      <h4 className={`font-semibold text-xs sm:text-sm truncate ${colors.text}`}>{item.name}</h4>
                      <div className={`text-[10px] sm:text-xs truncate ${colors.textMuted}`}>
                         {item.isWholesale ? <span className="${colors.gold} font-bold mr-1">GROSIR</span> : ''} 
                         {item.appliedPromo ? <span className="${colors.gold} font-bold mr-1"><Ticket size={10} className="inline mb-0.5"/> PROMO</span> : ''} 
                         
                         {item.isWholesale || item.appliedPromo ? (
                            <><span className="line-through opacity-50 mr-1">Rp {formatIDR(item.basePrice)}</span> Rp {formatIDR(item.unitPrice)} / {item.unit}</>
                         ) : (
                            <>Rp {formatIDR(item.unitPrice)} / {item.unit}</>
                         )}
                      </div>
                      <div className={`font-bold mt-1 text-sm ${colors.gold}`}>Rp {formatIDR(item.subtotal)}</div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between shrink-0 ml-1">
                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><X size={16} /></button>
                      <div className="flex items-center gap-1 border rounded-lg bg-[#F8FAFC] dark:bg-[#27272A] mt-1 overflow-hidden shrink-0">
                        <button type="button" onClick={() => adjustQtyStep(item.id, -1)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 bg-[#F8FAFC] dark:bg-[#27272A] transition-colors font-bold">-</button>
                        <input 
                           type="text" 
                           inputMode="decimal"
                           className={`w-12 sm:w-14 text-center bg-transparent text-xs sm:text-sm font-semibold outline-none ${colors.text}`} 
                           value={item.qtyString !== undefined ? item.qtyString : String(item.qty).replace('.', ',')} 
                           onChange={(e) => updateCartQtyString(item.id, e.target.value)}
                           onBlur={(e) => { if(!e.target.value || parseFloat(e.target.value.replace(',','.')) <= 0) removeFromCart(item.id); }}
                           onFocus={(e) => e.target.select()}
                        />
                        <button type="button" onClick={() => adjustQtyStep(item.id, 1)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 bg-[#F8FAFC] dark:bg-[#27272A] transition-colors font-bold">+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className={`p-3 sm:p-4 border-t ${colors.border} bg-transparent shrink-0 relative z-10`}>
              <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 text-[11px] sm:text-sm">
                <div className="flex justify-between"><span className={colors.textMuted}>Subtotal</span><span className={`font-semibold ${colors.text}`}>Rp {formatIDR(subTotal)}</span></div>
                <div className="flex justify-between items-center"><span className={colors.textMuted}>Diskon (%, Rp)</span><input type="text" className={`w-32 sm:w-40 text-right p-1 sm:p-1.5 rounded border ${colors.border} bg-white/10 dark:bg-[#1e1e1e]/10 outline-none placeholder-gray-400/50 dark:placeholder-gray-500/40`} placeholder="Cth: 10% atau 5000" value={posDiscountStr} onChange={e => { let v = e.target.value; if(v.includes('%')) { let c = v.replace(/[^0-9,.%]/g, ''); if(c.endsWith('.')) c = c.slice(0,-1)+','; setPosDiscountStr(c); } else { setPosDiscountStr(smartFormatInput(v)); } }} /></div>
                {actualDiscount > 0 && <div className="flex justify-between text-[10px] text-red-500"><span>Potongan:</span><span>- Rp {formatIDR(actualDiscount)}</span></div>}
                <div className="flex justify-between items-center mt-1">
                  <span className={colors.textMuted}>Ongkir/Lain (Rp){(selectedCustomer !== 1 && posMode === 'penjualan') && (<label className="flex items-center gap-1 mt-0.5 cursor-pointer text-[10px] text-green-500"><input type="checkbox" checked={useAutoOngkir} onChange={(e) => setUseAutoOngkir(e.target.checked)} className="rounded w-3 h-3 text-green-500 focus:ring-green-500 border-green-500" />Auto ({customers.find(c=>String(c.id)===String(selectedCustomer))?.distance}km)</label>)}</span>
                  <input type="text" className={`w-32 sm:w-40 text-right p-1 sm:p-1.5 rounded border ${colors.border} bg-white/10 dark:bg-[#1e1e1e]/10 outline-none placeholder-gray-400/50 dark:placeholder-gray-500/40`} placeholder="0" value={posOngkirStr} onChange={e => { setUseAutoOngkir(false); setPosOngkirStr(smartFormatInput(e.target.value)); }} />
                </div>
                <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-dashed border-gray-300 dark:border-gray-600"><span className={colors.text}>TOTAL</span><span className={posMode === 'penjualan' ? colors.gold : 'text-blue-600'}>Rp {formatIDR(total)}</span></div>
              </div>
              <button disabled={cart.length === 0} onClick={() => { 
                  if (posMode === 'pembelian' && String(selectedSupplier) === '1') {
                      showToast('Nama supplier wajib dipilih!', 'error');
                      return;
                  }
                  playSound('pop', isSoundOn); setCheckoutModal(true); 
              }} className={`w-full py-3 sm:py-4 rounded-xl font-bold text-[#18181B] text-base sm:text-lg transition-transform ${cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : posMode === 'penjualan' ? `${colors.goldBg} hover:scale-[1.02] shadow-lg` : `${colors.goldBg} hover:scale-[1.02] shadow-lg`}`}>{posMode === 'penjualan' ? 'BAYAR SEKARANG' : 'PROSES PEMBELIAN'}</button>
            </div>
          </div>
        </div>
      </div>
      {checkoutModal && <CheckoutModal posMode={posMode} total={total} financialAccounts={financialAccounts} paymentMethodId={paymentMethodId} setPaymentMethodId={setPaymentMethodId} dueDate={dueDate} setDueDate={setDueDate} paymentAmount={paymentAmount} setPaymentAmount={setPaymentAmount} handleCheckout={handleCheckout} setCheckoutModal={setCheckoutModal} colors={colors} isSoundOn={isSoundOn} activeCustomerDeposit={customers.find(c => String(c.id) === String(selectedCustomer))?.deposit || 0} isCustomerUmum={isCustomerUmum} />}
      {completedDoc && <DocumentReceiptModal doc={completedDoc} onClose={() => setCompletedDoc(null)} storeInfo={storeInfo} colors={colors} isSoundOn={isSoundOn} />}
    </div>
  );
}
