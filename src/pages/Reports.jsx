import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Package, PieChart, ChevronLeft, Filter, BarChart, TrendingUp, TrendingDown, Wallet, Store, CreditCard, Edit, Trash2, X, AlertTriangle, History } from 'lucide-react';
import { formatIDR, parseIDR, playSound, calculateDateRange, formatDate, formatDateTime, smartFormatInput } from '../utils/helpers';
import DateInput from '../components/DateInput';
import SimpleChart from '../components/ui/SimpleChart';
import DataTable from '../components/ui/DataTable';
import DonutChart from '../components/ui/DonutChart';
import DocumentReceiptModal from '../components/modals/DocumentReceiptModal';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';
const getLocalDatetime = (d) => { const date = d ? new Date(d) : new Date(); const tzoffset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16); };

export default function Reports({ sales, purchases, products, accounting, setAccounting, financialAccounts, customers, colors, baseColors, isSoundOn, theme, storeInfo, showToast, globalMode, setGlobalMode, globalChartMode, setGlobalChartMode, shiftHistory = [] }) {
  const [activeReport, setActiveReport] = useState(globalMode);
  
  useEffect(() => {
     if (globalMode === 'penjualan' || globalMode === 'pembelian') {
        setActiveReport(globalMode);
     }
  }, [globalMode]);
  const [selectedAccFilter, setSelectedAccFilter] = useState(''); 
  const [selectedSysFilter, setSelectedSysFilter] = useState(''); 
  const [filterMode, setFilterMode] = useState('Bulanan'); 
  const [dateOffset, setDateOffset] = useState(0);
  const dateRangeInfo = useMemo(() => calculateDateRange(filterMode, dateOffset), [filterMode, dateOffset]); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showAccModal, setShowAccModal] = useState(false);
  const [deleteAccData, setDeleteAccData] = useState(null);
  const [accForm, setAccForm] = useState({ id: '', type: 'kas', accountId: financialAccounts[0]?.id || '', name: '', amount: '', date: getLocalDatetime(), isExpense: false });

  const getFilteredData = (dataArray) => {
     if(filterMode === 'Keseluruhan') return dataArray;
     let start, end;
     if (filterMode === 'Manual') {
        start = startDate ? new Date(startDate) : new Date(0);
        end = endDate ? new Date(endDate) : new Date(); end.setHours(23, 59, 59, 999);
     } else {
        start = dateRangeInfo.start;
        end = dateRangeInfo.end;
     }
     return dataArray.filter(d => { const t = new Date(d.date).getTime(); return t >= start.getTime() && t <= end.getTime(); });
  };

  const filteredSales = getFilteredData(sales); 
  const filteredPurchases = getFilteredData(purchases);
  const activeDataArray = activeReport === 'pembelian' ? filteredPurchases : filteredSales;
  
  const totalHppAll = activeDataArray.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + (i.cost * i.qty), 0), 0);
  const totalNetoAll = activeDataArray.reduce((acc, s) => acc + s.total, 0);
  const totalLabaAll = activeReport === 'penjualan' ? (totalNetoAll - totalHppAll) : 0;

  const chartInfo = useMemo(() => {
     let dataMap = {};
     let labels = [];
     
     let manualDiffDays = 0;
     if (filterMode === 'Manual') {
        const st = startDate ? new Date(startDate) : new Date(0);
        const en = endDate ? new Date(endDate) : new Date();
        manualDiffDays = (en - st) / (1000 * 60 * 60 * 24);
     }

     const isDaily = filterMode === 'Harian' || (filterMode === 'Manual' && manualDiffDays <= 1);
     const isWeekly = filterMode === 'Mingguan';
     const isMonthly = filterMode === 'Bulanan' || (filterMode === 'Manual' && manualDiffDays > 1 && manualDiffDays <= 31);
     const isYearly = filterMode === 'Tahunan' || (filterMode === 'Manual' && manualDiffDays > 31 && manualDiffDays <= 366);

     if (activeDataArray.length === 0) {
        if (isDaily) labels = ['08:00', '12:00', '16:00', '20:00'];
        else if (isWeekly) labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
        else if (isMonthly) labels = Array.from({length: dateRangeInfo.end.getDate()}, (_, i) => String(i + 1));
        else if (isYearly) labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        else labels = ['2024', '2025', '2026'];

        const baseData = labels.map(() => Math.max(10, Math.floor(Math.random() * 100)));
        const maxVal = Math.max(...baseData, 1); 
        return { labels, data: baseData.map(val => ({ value: val * 100000, percentage: (val / maxVal) * 100 })) };
     }

     if (isDaily) {
          activeDataArray.forEach(s => {
             const h = new Date(s.date).getHours();
             const hLabel = `${String(h).padStart(2, '0')}:00`;
             dataMap[hLabel] = (dataMap[hLabel] || 0) + s.total;
          });
          labels = Object.keys(dataMap).sort();
       } 
       else if (isWeekly) {
          labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
          if (dateOffset === 0) {
             const todayIdx = new Date().getDay();
             const sliceIdx = todayIdx === 0 ? 7 : todayIdx;
             labels = labels.slice(0, sliceIdx);
          }
          activeDataArray.forEach(s => {
             const dayIdx = new Date(s.date).getDay();
             const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dayIdx];
             if(labels.includes(dayName)) {
                dataMap[dayName] = (dataMap[dayName] || 0) + s.total;
             }
          });
       } 
       else if (isMonthly) {
          if (filterMode === 'Bulanan') {
             const endD = dateOffset === 0 ? new Date().getDate() : dateRangeInfo.end.getDate();
             labels = Array.from({length: endD}, (_, i) => String(i + 1));
             activeDataArray.forEach(s => {
                const d = String(new Date(s.date).getDate());
                if(labels.includes(d)) {
                   dataMap[d] = (dataMap[d] || 0) + s.total;
                }
             });
          } else {
             const tempMap = {};
             activeDataArray.forEach(s => {
                const d = new Date(s.date);
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                tempMap[key] = tempMap[key] || { label: `${d.getDate()} ${d.toLocaleString('id-ID', {month:'short'})}`, val: 0 };
                tempMap[key].val += s.total;
             });
             Object.keys(tempMap).sort().forEach(k => {
                labels.push(tempMap[k].label);
                dataMap[tempMap[k].label] = tempMap[k].val;
             });
          }
       } 
       else if (isYearly) {
          if (filterMode === 'Tahunan') {
             labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
             if (dateOffset === 0) {
                 labels = labels.slice(0, new Date().getMonth() + 1);
             }
             activeDataArray.forEach(s => {
                const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][new Date(s.date).getMonth()];
                if(labels.includes(monthName)) {
                   dataMap[monthName] = (dataMap[monthName] || 0) + s.total;
                }
             });
          } else {
             const tempMap = {};
             activeDataArray.forEach(s => {
                const d = new Date(s.date);
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                tempMap[key] = tempMap[key] || { label: `${d.toLocaleString('id-ID', {month:'short'})} ${String(d.getFullYear()).slice(2)}`, val: 0 };
                tempMap[key].val += s.total;
             });
             Object.keys(tempMap).sort().forEach(k => {
                labels.push(tempMap[k].label);
                dataMap[tempMap[k].label] = tempMap[k].val;
             });
          }
       } 
       else {
        activeDataArray.forEach(s => {
           const year = new Date(s.date).getFullYear().toString();
           if (!labels.includes(year)) labels.push(year);
           dataMap[year] = (dataMap[year] || 0) + s.total;
        });
        labels.sort();
     }

     let validLabels = [];
     let validDataRaw = [];
     labels.forEach(label => {
        const sum = dataMap[label] || 0;
        if (sum > 0) {
           validLabels.push(label);
           validDataRaw.push(sum);
        }
     });
     
     const maxData = Math.max(...validDataRaw, 1);
     const data = validDataRaw.map(sum => ({ value: sum, percentage: (sum / maxData) * 100 }));

     return { labels: validLabels, data };
  }, [activeDataArray, filterMode, startDate, endDate, dateRangeInfo]);

  const calculateLeaderboard = (dataArray) => {
     let map = {};
     dataArray.forEach(doc => { doc.items.forEach(item => { if(!map[item.id]) map[item.id] = { id: item.id, name: item.name, total: 0 }; map[item.id].total += item.qty; }); });
     return Object.values(map).sort((a,b) => b.total - a.total);
  };
  const leaderboardFull = calculateLeaderboard(filteredSales);
  const topItems = leaderboardFull.slice(0, 15); 
  const slowestItems = [...leaderboardFull].reverse().slice(0, 15);

  const enrichedReportData = useMemo(() => {
     return activeDataArray.map(s => {
        const hpp = s.items.reduce((sum, i) => sum + (i.cost * i.qty), 0);
        return {
           ...s,
           hpp,
           itemCount: s.items.length,
           laba: s.total - hpp
        };
     });
  }, [activeDataArray]);

  const reportColumns = [
    { key: 'date', label: 'Tgl', render: r => new Date(r.date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { key: 'nota', label: 'Nota', render: r => <span className={`font-semibold ${colors.gold} cursor-pointer hover:underline`} onClick={() => setSelectedDoc(r)}>{r.nota}</span> },
    { key: 'itemCount', label: 'Item', render: r => `${r.itemCount} Macam` }
  ];
  if (activeReport === 'penjualan') {
    reportColumns.push({ key: 'hpp', label: 'Modal Pokok', render: r => `Rp ${formatIDR(r.hpp)}` });
    reportColumns.push({ key: 'total', label: 'Total (Neto)', render: r => <span className={`font-bold ${colors.gold}`}>Rp {formatIDR(r.total)}</span> });
    reportColumns.push({ key: 'laba', label: 'Laba', render: r => <span className={`font-bold ${colors.gold}`}>Rp {formatIDR(r.laba)}</span> });
  } else if (activeReport === 'pembelian') {
    reportColumns.push({ key: 'qty', label: 'Total Kuantitas', render: r => `${r.items.reduce((sum, i) => sum + i.qty, 0)} Pcs` });
    reportColumns.push({ key: 'total', label: 'Pengeluaran', render: r => <span className={`font-bold text-blue-600`}>Rp {formatIDR(r.total)}</span> });
  }
   const calculateNeraca = () => {
      const allTimeSales = sales.reduce((sum, s) => sum + s.total, 0);
      const allTimeHPP = sales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + (item.cost * item.qty), 0), 0);
      const labaKotorAllTime = allTimeSales - allTimeHPP;
      
      const bebanOperasional = accounting.filter(a => a.type === 'kas' && a.amount < 0 && !a.name.toLowerCase().includes('pembayaran nota') && !a.name.toLowerCase().includes('bayar nota')).reduce((sum, a) => sum + Math.abs(a.amount), 0);
      const pendapatanLain = accounting.filter(a => a.type === 'kas' && a.amount > 0 && !a.name.toLowerCase().includes('penerimaan nota') && !a.name.toLowerCase().includes('terima nota') && !a.name.toLowerCase().includes('modal') && !a.name.toLowerCase().includes('saldo')).reduce((sum, a) => sum + a.amount, 0);
      const labaBersihBerjalan = labaKotorAllTime + pendapatanLain - bebanOperasional;

      const persediaan = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
      const piutang = sales.filter(s => s.status === 'Tempo').reduce((sum, s) => sum + Math.max(0, s.total - (s.paid || 0)), 0);
      const kasBalances = financialAccounts.map(acc => ({ name: acc.name, balance: accounting.filter(a => a.type === 'kas' && a.accountId === acc.id).reduce((sum, a) => sum + a.amount, 0) }));
      const totalKas = kasBalances.reduce((sum, k) => sum + k.balance, 0);
      const asetLancarTotal = totalKas + piutang + persediaan;
      const asetTetap = accounting.filter(a => a.type === 'aset_tetap').reduce((sum, a) => sum + a.amount, 0);
      const totalAset = asetLancarTotal + asetTetap;

      const utang = purchases.filter(s => s.status === 'Tempo').reduce((sum, s) => sum + Math.max(0, s.total - (s.paid || 0)), 0);
      const totalDepositPelanggan = customers?.reduce((sum, c) => sum + (Number(c.deposit) || 0), 0) || 0;
      const liabLainOnly = accounting.filter(a => a.type === 'liabilitas').reduce((sum, a) => sum + a.amount, 0);
      const totalLiabilitas = utang + totalDepositPelanggan + liabLainOnly;

      const totalEkuitas = totalAset - totalLiabilitas;
      const modalDisetor = accounting.filter(a => a.type === 'modal' || a.type === 'ekuitas').reduce((sum, a) => sum + a.amount, 0);
      const labaDitahan = totalEkuitas - modalDisetor - labaBersihBerjalan;

      return { asetLancarTotal, asetTetap, totalAset, liabLainOnly, utang, totalDepositPelanggan, totalLiabilitas, modalDisetor, labaDitahan, labaBersihBerjalan, totalEkuitas, persediaan, piutang, kasBalances };
   };

   const shiftColumns = [
       { key: 'endTime', label: 'Waktu Shift', sortable: true, render: (s) => (
           <div className="flex flex-col">
               <span className="text-[10px] text-gray-500 font-mono">B: {formatDateTime(s.startTime)}</span>
               <span className="font-semibold text-xs font-mono">T: {formatDateTime(s.endTime)}</span>
           </div>
       )},
       { key: 'cashierName', label: 'Kasir', sortable: true, render: (s) => {
           let name = s.cashierName || 'Kasir';
           if (name.includes('@')) name = name.split('@')[0];
           return <div className="flex items-center gap-2">
               <div className={`w-6 h-6 rounded-md ${colors.goldBg}/20 flex items-center justify-center text-gold font-bold text-xs shadow-inner`}>
                   {name.charAt(0).toUpperCase()}
               </div>
               <span className="font-semibold">{name}</span>
           </div>;
       }},
       { key: 'salesCash', label: 'Omset Tunai', render: (s) => `Rp ${formatIDR(s.salesCash)}` },
       { key: 'salesNonTunai', label: 'Omset Non-Tunai', render: (s) => `Rp ${formatIDR(s.salesNonTunai || 0)}` },
       { key: 'extraCash', label: 'Kas Ekstra', render: (s) => `Rp ${formatIDR((s.cashIn || 0) - (s.cashOut || 0))}` },
       { key: 'actualCash', label: 'Fisik Laci', render: (s) => `Rp ${formatIDR(s.actualCash)}` },
       { key: 'dropCash', label: 'Disetor', render: (s) => <span className="font-bold text-blue-600 dark:text-blue-400">Rp {formatIDR(s.dropCash || 0)}</span> },
       { key: 'selisih', label: 'Selisih', render: (s) => (
           <span className={`font-bold px-2.5 py-1 rounded-md text-xs shadow-sm ${s.selisih === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : s.selisih < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
               {s.selisih === 0 ? 'PAS' : s.selisih < 0 ? `-Rp ${formatIDR(Math.abs(s.selisih))}` : `+Rp ${formatIDR(s.selisih)}`}
           </span>
       )}
   ];

   const neraca = useMemo(() => calculateNeraca(), [sales, purchases, accounting, products, financialAccounts, customers]);;

  const handleDateJump = (e) => {
     if(!e.target.value) return;
     const target = new Date(e.target.value);
     const now = new Date();
     let diff = 0;
     if (filterMode === 'Harian' || filterMode === 'hari') {
        diff = Math.round((target.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
     } else if (filterMode === 'Mingguan' || filterMode === 'minggu') {
        const getW = (d) => { const x = new Date(d); const day = x.getDay() || 7; if (day !== 1) x.setHours(-24 * (day - 1)); return new Date(x.getFullYear(), x.getMonth(), x.getDate()); };
        diff = Math.round((getW(target) - getW(now)) / (1000 * 60 * 60 * 24 * 7));
     } else if (filterMode === 'Bulanan' || filterMode === 'bulan') {
        diff = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
     } else if (filterMode === 'Tahunan' || filterMode === 'tahun') {
        diff = target.getFullYear() - now.getFullYear();
     }
     setDateOffset(diff > 0 ? 0 : diff);
  };

  const handleAccSave = (e) => {
     e.preventDefault(); playSound('success', isSoundOn);
     const amtVal = parseIDR(accForm.amount);
     const finalAmt = (accForm.type === 'kas' && accForm.isExpense) ? -Math.abs(amtVal) : Math.abs(amtVal);
     const finalDate = accForm.date ? new Date(accForm.date).toISOString() : new Date().toISOString();
     if(accForm.id) { setAccounting(accounting.map(a => a.id === accForm.id ? {...accForm, amount: finalAmt, date: finalDate} : a)); } 
     else { setAccounting([...accounting, { ...accForm, id: Date.now(), amount: finalAmt, date: finalDate }]); }
     setShowAccModal(false);
  }

  const enrichedAccounting = accounting.map(a => {
     let typeDisplay = a.type.replace('_', ' ');
     if(a.type === 'kas') { const accData = financialAccounts.find(fa => fa.id === a.accountId); if(accData) typeDisplay = accData.name; }
     return { ...a, accNameDisplay: typeDisplay };
  });

  const filteredAccountingTable = enrichedAccounting.filter(a => {
     const matchAcc = selectedAccFilter === '' || a.accountId === Number(selectedAccFilter);
     const isSystem = /^(Penerimaan Nota|Pembayaran Nota|Hapus Nota|Retur|Deposit|Refund Deposit|Pembayaran Cicilan Nota|Bayar Cicilan|Pelunasan\/Cicilan|Selisih Shift|Setoran Shift|Tukar Poin)/i.test(a.name || '');
     const matchSys = selectedSysFilter === '' || (selectedSysFilter === 'otomatis' && isSystem) || (selectedSysFilter === 'manual' && !isSystem);
     return matchAcc && matchSys;
  });

  const accColumns = [
    { key: 'date', label: 'Tanggal', render: r => new Date(r.date).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { key: 'accNameDisplay', label: 'Jenis Akun', render: r => <span className="capitalize text-[10px] font-semibold px-2 py-1 rounded bg-[#F8FAFC] dark:bg-[#27272A] whitespace-nowrap">{r.accNameDisplay}</span> },
    { key: 'name', label: 'Keterangan' },
    { key: 'amount', label: 'Nominal', render: r => <span className={`font-bold ${r.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>{r.amount < 0 ? '-' : ''} Rp {formatIDR(Math.abs(r.amount))}</span> }
  ];

  return (
    <div className="h-full flex flex-col relative overflow-hidden -m-4 md:-m-6 bg-gray-50 dark:bg-[#121212]">
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4 mb-4 min-h-[44px]">
           <div className={`flex items-center rounded-lg p-1 ${colors.creamBg} border ${colors.border} w-fit h-fit shrink-0`}>
              <button onClick={() => { playSound('pop', isSoundOn); setActiveReport('penjualan'); setGlobalMode('penjualan'); }} className={`w-[110px] sm:w-[130px] py-1.5 text-sm font-bold rounded-md transition-all flex items-center justify-center ${activeReport === 'penjualan' ? `${colors.goldBg} text-[#18181B] shadow` : `${colors.textMuted} ${colors.goldHoverText}`}`}>Penjualan</button>
              <button onClick={() => { playSound('pop', isSoundOn); setActiveReport('pembelian'); setGlobalMode('pembelian'); }} className={`w-[110px] sm:w-[130px] py-1.5 text-sm font-bold rounded-md transition-all flex items-center justify-center ${activeReport === 'pembelian' ? 'bg-blue-600 text-white shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Pembelian</button>
              <button onClick={() => { playSound('pop', isSoundOn); setActiveReport('neraca'); }} className={`w-[110px] sm:w-[130px] py-1.5 text-sm font-bold rounded-md transition-all flex items-center justify-center ${activeReport === 'neraca' ? 'bg-[#D4AF37] text-[#18181B] shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Neraca</button>
              <button onClick={() => { playSound('pop', isSoundOn); setActiveReport('produk'); }} className={`w-[110px] sm:w-[130px] py-1.5 text-sm font-bold rounded-md transition-all flex items-center justify-center ${activeReport === 'produk' ? 'bg-blue-600 text-white shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Produk</button>
              <button onClick={() => { playSound('pop', isSoundOn); setActiveReport('shift'); }} className={`w-[110px] sm:w-[130px] py-1.5 text-sm font-bold rounded-md transition-all flex items-center justify-center ${activeReport === 'shift' ? 'bg-[#D4AF37] text-[#18181B] shadow' : `${colors.textMuted} ${colors.goldHoverText}`}`}>Shift</button>
           </div>
           {activeReport !== 'neraca' && activeReport !== 'shift' && (
               <div className="flex items-center gap-2 flex-wrap justify-end">
                  {filterMode !== 'Keseluruhan' && filterMode !== 'Manual' && (
                     <div className={`flex items-center border ${colors.border} rounded-lg overflow-hidden h-[38px] bg-white dark:bg-[#1e1e1e]`}>
                        <button onClick={() => { playSound('pop', isSoundOn); setDateOffset(prev => prev - 1); }} className={`px-3 h-full flex items-center hover:bg-gray-100 dark:hover:bg-[#27272A] ${colors.textMuted}`}><ChevronLeft size={16} /></button>
                        <div 
                           className="relative flex items-center justify-center flex-1 h-full cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] transition-colors min-w-[120px]"
                           onClick={(e) => { try { e.currentTarget.querySelector('input').showPicker(); } catch(err) {} }}
                        >
                           <span className={`px-2 text-xs font-semibold ${colors.text} pointer-events-none`}>{dateRangeInfo.label}</span>
                           <DateInput className="absolute inset-0 opacity-0 w-full h-full pointer-events-none" onChange={(e) => { playSound('pop', isSoundOn); handleDateJump(e); }} max={new Date().toISOString().split('T')[0]} />
                        </div>
                        <button onClick={() => { if(dateOffset < 0) { playSound('pop', isSoundOn); setDateOffset(prev => prev + 1); } }} className={`px-3 h-full flex items-center transition-colors ${dateOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-[#27272A]'} ${colors.textMuted}`} disabled={dateOffset >= 0}><ChevronLeft size={16} className="transform rotate-180" /></button>
                     </div>
                  )}
                  {filterMode === 'Manual' && (
                     <div className="flex items-center gap-1">
                        <DateInput className={`p-2 text-sm rounded border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} [color-scheme:light] dark:[color-scheme:dark]`} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <span className={colors.textMuted}>-</span>
                        <DateInput className={`p-2 text-sm rounded border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} [color-scheme:light] dark:[color-scheme:dark]`} value={endDate} onChange={e => setEndDate(e.target.value)} />
                     </div>
                  )}
                  <div className="flex items-center gap-2 ml-2">
                     <Filter size={16} className={colors.textMuted}/>
                     <select className={`p-2 rounded-lg text-sm border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={filterMode} onChange={e => { playSound('pop', isSoundOn); setFilterMode(e.target.value); setDateOffset(0); }}>
                        <option>Harian</option><option>Mingguan</option><option>Bulanan</option><option>Tahunan</option><option>Keseluruhan</option><option>Manual</option>
                     </select>
                  </div>
               </div>
            )}
         </div>

       <div className={`flex-1 rounded-xl border ${colors.border} ${colors.panel} p-4 sm:p-6 overflow-y-auto custom-scrollbar`}>
          {(activeReport === 'penjualan' || activeReport === 'pembelian') && (
             <div>
                <div className="mb-6">
                   <div className={`p-4 border rounded-xl ${colors.border} bg-gray-50 dark:bg-[#2a2a24]`}>
                      <div className="flex justify-between items-center mb-2">
                         <h3 className={`font-bold text-sm ${colors.text}`}>Grafik {activeReport} ({filterMode})</h3>
                         <div className="flex gap-1 bg-[#E2E8F0] dark:bg-[#27272A] rounded p-0.5">
                            <button onClick={() => { playSound('pop', isSoundOn); setGlobalChartMode('bar'); }} className={`p-1 rounded ${globalChartMode === 'bar' ? colors.goldBg + ' text-[#18181B]' : colors.textMuted}`}><BarChart size={12}/></button>
                            <button onClick={() => { playSound('pop', isSoundOn); setGlobalChartMode('line'); }} className={`p-1 rounded ${globalChartMode === 'line' ? colors.goldBg + ' text-[#18181B]' : colors.textMuted}`}><TrendingUp size={12}/></button>
                         </div>
                      </div>
                      <SimpleChart chartData={chartInfo.data} chartType={activeReport === 'pembelian' ? 'Pembelian' : 'Penjualan'} chartMode={globalChartMode} labels={chartInfo.labels} theme={theme} colors={colors} accentColor={activeReport === 'pembelian' ? '#3b82f6' : '#D4AF37'} heightClass="h-72"/>
                   </div>
                </div>

                {activeDataArray.length > 0 && (
                   <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 rounded-xl border ${colors.border} ${activeReport === 'pembelian' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-yellow-50 dark:bg-[#D4AF37]/10'}`}>
                      <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Total Transaksi</span><span className={`text-lg font-bold ${colors.text}`}>{activeDataArray.length} Nota</span></div>
                      {activeReport === 'penjualan' ? (
                         <>
                            <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Modal Pokok (HPP)</span><span className={`text-lg font-bold ${colors.text}`}>Rp {formatIDR(totalHppAll)}</span></div>
                            <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Total Neto (Omset)</span><span className={`text-lg font-bold ${colors.gold}`}>Rp {formatIDR(totalNetoAll)}</span></div>
                            <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Laba Kotor</span><span className={`text-lg font-bold ${colors.gold}`}>Rp {formatIDR(totalLabaAll)}</span></div>
                         </>
                      ) : (
                         <>
                            <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Total Item Dibeli</span><span className={`text-lg font-bold ${colors.text}`}>{activeDataArray.reduce((acc, curr) => acc + curr.items.reduce((sum, i) => sum + i.qty, 0), 0)} Barang</span></div>
                            <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Rata-Rata Transaksi</span><span className={`text-lg font-bold ${colors.text}`}>Rp {formatIDR(Math.round(totalNetoAll / (activeDataArray.length || 1)))}</span></div>
                            <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Total Pengeluaran</span><span className={`text-lg font-bold text-blue-600`}>Rp {formatIDR(totalNetoAll)}</span></div>
                         </>
                      )}
                   </div>
                )}

                <div className="overflow-hidden print:hidden mb-4">
                   <DataTable 
                      title="Rincian Transaksi" 
                      columns={reportColumns} 
                      data={enrichedReportData} 
                      defaultSort={{key: 'date', direction: 'desc'}} 
                      colors={colors} 
                   />
                </div>
             </div>
          )}

          {activeReport === 'produk' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full pb-10">
                <div className={`p-5 border rounded-xl ${colors.border} bg-gray-50 dark:bg-[#2a2a24] flex flex-col shadow-sm`}>
                   <h3 className={`font-black text-xl mb-4 ${colors.text} flex items-center gap-2`}>
                      <TrendingUp className="text-blue-600" size={24}/> Item Paling Laris
                   </h3>
                   <p className={`text-sm ${colors.textMuted} mb-4`}>Produk yang paling banyak dibeli oleh pelanggan pada periode ini.</p>
                   <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                      {topItems.map((item, i) => {
                         const prod = products.find(p => p.id === item.id) || { stock: 0, minStock: 5 };
                         return (
                           <div key={i} className={`flex justify-between items-center p-4 rounded-xl bg-white dark:bg-[#1e1e1e] border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}>
                             <div className="flex flex-col gap-1">
                                <span className={`font-extrabold text-base ${colors.text}`}>{i+1}. {item.name}</span>
                                <span className={`text-xs font-semibold ${colors.textMuted}`}>Sisa Stok: <span className={prod.stock <= prod.minStock ? 'text-red-500 font-bold' : 'text-blue-600'}>{prod.stock}</span></span>
                             </div>
                             <div className="flex flex-col items-end">
                                <span className={`font-black text-2xl text-blue-600`}>{item.total}</span>
                                <span className={`text-[10px] uppercase font-bold ${colors.textMuted}`}>Terjual</span>
                             </div>
                           </div>
                         );
                      })}
                      {topItems.length === 0 && <p className={`text-sm font-semibold ${colors.textMuted} text-center py-8`}>Tidak ada penjualan di periode ini.</p>}
                   </div>
                </div>

                <div className={`p-5 border rounded-xl ${colors.border} bg-gray-50 dark:bg-[#2a2a24] flex flex-col shadow-sm`}>
                   <h3 className={`font-black text-xl mb-4 ${colors.text} flex items-center gap-2`}>
                      <TrendingDown className="text-red-500" size={24}/> Item Kurang Laku
                   </h3>
                   <p className={`text-sm ${colors.textMuted} mb-4`}>Produk yang stagnan atau paling sedikit terjual pada periode ini.</p>
                   <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                      {slowestItems.map((item, i) => {
                         const prod = products.find(p => p.id === item.id) || { stock: 0 };
                         return (
                           <div key={i} className={`flex justify-between items-center p-4 rounded-xl bg-white dark:bg-[#1e1e1e] border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}>
                             <div className="flex flex-col gap-1">
                                <span className={`font-extrabold text-base ${colors.text}`}>{item.name}</span>
                                <span className={`text-xs font-semibold ${colors.textMuted}`}>Sisa Stok: <span className={prod.stock > 0 ? 'text-orange-500' : 'text-red-500'}>{prod.stock}</span></span>
                             </div>
                             <div className="flex flex-col items-end">
                                <span className={`font-black text-2xl text-red-500`}>{item.total}</span>
                                <span className={`text-[10px] uppercase font-bold ${colors.textMuted}`}>Terjual</span>
                             </div>
                           </div>
                         );
                      })}
                      {slowestItems.length === 0 && <p className={`text-sm font-semibold ${colors.textMuted} text-center py-8`}>Tidak ada penjualan di periode ini.</p>}
                   </div>
                </div>
             </div>
          )}

          {activeReport === 'shift' && (
             <div className="space-y-6 animate-fade-in">
                <div className={`p-4 sm:p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm`}>
                   <div className="flex items-center gap-3 mb-6">
                       <div className={`p-3 rounded-xl ${colors.goldBg}/20`}>
                           <History className={colors.gold} size={24} />
                       </div>
                       <div>
                           <h2 className="text-lg sm:text-xl font-bold dark:text-white">Riwayat Laporan Shift</h2>
                           <p className="text-sm text-gray-500 dark:text-gray-400">Laporan fisik laci kasir dan serah terima shift</p>
                       </div>
                   </div>
                   
                   {shiftHistory.length === 0 ? (
                       <div className="text-center py-12">
                           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-[#27272A] mb-4">
                               <History size={32} className="text-gray-400" />
                           </div>
                           <p className="text-gray-500 font-medium">Belum ada riwayat shift yang ditutup.</p>
                       </div>
                   ) : (
                       <DataTable 
                          columns={shiftColumns} 
                          data={shiftHistory} 
                          defaultSort={{key: 'endTime', direction: 'desc'}} 
                          colors={colors} 
                       />
                   )}
                </div>
             </div>
          )}

          {activeReport === 'neraca' && (
             <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <h3 className={`text-xl font-bold ${colors.text}`}>Neraca Keuangan Toko (Buku Besar)</h3>
                    <button onClick={() => { playSound('pop', isSoundOn); setAccForm({ id: '', type: 'kas', accountId: financialAccounts[0]?.id||'', name: '', amount: '', date: getLocalDatetime(), isExpense: false }); setShowAccModal(true); }} className={`flex-1 sm:flex-none px-4 py-2 font-bold text-[#18181B] rounded-lg shadow-sm bg-[#D4AF37] hover:opacity-90`}>Input Data</button>
                 </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div className={`p-5 rounded-2xl border ${colors.border} bg-gray-50 dark:bg-[#2a2a24] shadow-sm relative overflow-hidden`}>
                         <h4 className={`font-bold text-lg mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 ${colors.text}`}>1. Aset Lancar</h4>
                         <div className="space-y-2 text-base relative z-10">
                            <div className="flex justify-between"><span className={colors.textMuted}>Kas & Bank (Saldo Total)</span><span className="font-semibold text-green-600">Rp {formatIDR(neraca.totalKas)}</span></div>
                            <div className="pl-3 border-l-2 border-green-200 dark:border-green-900 space-y-1 my-2">
                               {neraca.kasBalances.map((k, i) => (<div key={i} className="flex justify-between text-sm"><span className={colors.textMuted}>- {k.name}</span><span className="font-semibold">Rp {formatIDR(k.balance)}</span></div>))}
                            </div>
                            <div className="flex justify-between"><span className={colors.textMuted}>Piutang Usaha (Bon)</span><span className="font-semibold">Rp {formatIDR(neraca.piutang)}</span></div>
                            <div className="flex justify-between"><span className={colors.textMuted}>Persediaan (Inventory)</span><span className={`font-semibold ${colors.gold}`}>Rp {formatIDR(neraca.persediaan)}</span></div>
                         </div>
                         <div className="flex justify-between mt-3 pt-2 border-t border-dashed font-bold"><span>Total Aset Lancar</span><span>Rp {formatIDR(neraca.totalKas + neraca.piutang + neraca.persediaan)}</span></div>
                      </div>
                      <div className={`p-5 rounded-2xl border ${colors.border} bg-gray-50 dark:bg-[#2a2a24] shadow-sm`}>
                         <h4 className={`font-bold text-lg mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 ${colors.text}`}>2. Aset Tetap</h4>
                         <div className="space-y-2 text-base">
                            {accounting.filter(a => a.type === 'aset_tetap').map(a => (<div key={a.id} className="flex justify-between"><span className={colors.textMuted}>{a.name}</span><span className="font-semibold">Rp {formatIDR(a.amount)}</span></div>))}
                         </div>
                         <div className="flex justify-between mt-3 pt-2 border-t border-dashed font-bold"><span>Total Aset Tetap</span><span>Rp {formatIDR(neraca.asetTetap)}</span></div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className={`p-5 rounded-2xl border ${colors.border} bg-gray-50 dark:bg-[#2a2a24] shadow-sm relative overflow-hidden`}>
                         <h4 className={`font-bold text-lg mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 ${colors.text}`}>3. Liabilitas (Kewajiban)</h4>
                         <div className="space-y-2 text-base relative z-10">
                            <div className="flex justify-between"><span className={colors.textMuted}>Utang Usaha (Ke Supplier)</span><span className="font-semibold text-red-500">Rp {formatIDR(neraca.utang)}</span></div>
                            <div className="flex justify-between"><span className={colors.textMuted}>Deposit Pelanggan</span><span className="font-semibold text-orange-500">Rp {formatIDR(neraca.totalDepositPelanggan)}</span></div>
                            {accounting.filter(a => a.type === 'liabilitas').map(a => (<div key={a.id} className="flex justify-between"><span className={colors.textMuted}>{a.name}</span><span className="font-semibold text-red-500">Rp {formatIDR(a.amount)}</span></div>))}
                         </div>
                         <div className="flex justify-between mt-3 pt-2 border-t border-dashed font-bold"><span>Total Liabilitas</span><span>Rp {formatIDR(neraca.totalLiabilitas)}</span></div>
                      </div>
                      <div className={`p-5 rounded-2xl border ${colors.border} bg-gray-50 dark:bg-[#2a2a24] shadow-sm relative overflow-hidden`}>
                         <h4 className={`font-bold text-lg mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 ${colors.text}`}>4. Ekuitas (Modal & Laba)</h4>
                         <div className="space-y-2 text-base relative z-10">
                            <div className="flex justify-between"><span className={colors.textMuted}>Modal Disetor</span><span className="font-semibold">Rp {formatIDR(neraca.modalDisetor)}</span></div>
                            <div className="flex justify-between"><span className={colors.textMuted}>Laba Bersih (Tahun Berjalan)</span><span className={`font-semibold ${neraca.labaBersihBerjalan >= 0 ? 'text-green-600' : 'text-red-500'}`}>{neraca.labaBersihBerjalan < 0 ? '-' : ''}Rp {formatIDR(Math.abs(neraca.labaBersihBerjalan))}</span></div>
                            <div className="flex justify-between"><span className={colors.textMuted}>Laba Ditahan / Penyesuaian</span><span className={`font-semibold ${colors.gold}`}>{neraca.labaDitahan < 0 ? '-' : ''}Rp {formatIDR(Math.abs(neraca.labaDitahan))}</span></div>
                         </div>
                         <div className="flex justify-between mt-3 pt-2 border-t border-dashed font-bold"><span>Total Ekuitas</span><span>Rp {formatIDR(neraca.totalEkuitas)}</span></div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                   <div className={`p-5 rounded-2xl border-4 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 flex justify-between items-center font-black text-xl shadow-md`}>
                      <span>TOTAL ASET (HARTA)</span><span>Rp {formatIDR(neraca.totalAset)}</span>
                   </div>
                   <div className={`p-5 rounded-2xl border-4 border-[#D4AF37] bg-yellow-50 dark:bg-[#D4AF37]/20 ${colors.gold} flex justify-between items-center font-black text-xl shadow-md`}>
                      <span>TOTAL LIAB. + EKUITAS</span><span>Rp {formatIDR(neraca.totalLiabilitas + neraca.totalEkuitas)}</span>
                   </div>
                </div>

                <div className="mt-8 space-y-4">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 dark:bg-[#1e1e1e] p-4 rounded-xl border border-gray-200 dark:border-gray-700 gap-4">
                        <span className={`font-bold text-sm ${colors.text}`}>Filter Jurnal Pembukuan:</span>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                           <select className={`p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#2a2a24] ${colors.text} outline-none text-sm w-full sm:w-48`} value={selectedSysFilter} onChange={e => setSelectedSysFilter(e.target.value)}>
                              <option value="">Semua Jenis (Otomatis & Manual)</option>
                              <option value="otomatis">Jurnal Otomatis Sistem</option>
                              <option value="manual">Jurnal Manual (Input Sendiri)</option>
                           </select>
                           <select className={`p-2 rounded-lg border ${colors.border} bg-white dark:bg-[#2a2a24] ${colors.text} outline-none text-sm w-full sm:w-48`} value={selectedAccFilter} onChange={e => setSelectedAccFilter(e.target.value)}>
                              <option value="">Semua Akun (Gabungan)</option>
                              {financialAccounts.map(fa => <option key={fa.id} value={fa.id}>{fa.name}</option>)}
                           </select>
                        </div>
                     </div>
                   <DataTable title="Rincian Jurnal Pembukuan" columns={accColumns} data={filteredAccountingTable} defaultSort={{key: 'date', direction: 'desc'}} colors={colors} canDelete={(a) => !/^(Penerimaan Nota|Pembayaran Nota|Hapus Nota|Retur|Deposit|Refund Deposit|Pembayaran Cicilan Nota|Bayar Cicilan|Pelunasan\/Cicilan|Selisih Shift|Setoran Shift|Tukar Poin)/i.test(a.name || '')} actions={[
                     { icon: Edit, label: 'Edit', disabled: (a) => /^(Penerimaan Nota|Pembayaran Nota|Hapus Nota|Retur|Deposit|Refund Deposit|Pembayaran Cicilan Nota|Bayar Cicilan|Pelunasan\/Cicilan|Selisih Shift|Setoran Shift|Tukar Poin)/i.test(a.name || ''), colorClass: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:bg-blue-200', onClick: (a) => { playSound('pop', isSoundOn); setAccForm({...a, amount: Math.abs(a.amount).toString(), isExpense: a.amount < 0, date: getLocalDatetime(a.date) }); setShowAccModal(true); } }
                   ]} onDelete={(a) => { playSound('pop', isSoundOn); setDeleteAccData(a); }} />
                </div>
             </div>
          )}
       </div>
       
       {deleteAccData && (
          <DeleteConfirmModal 
             title="Hapus Data Jurnal?" 
             desc={`Yakin ingin menghapus jurnal "${deleteAccData.name}" senilai Rp ${formatIDR(Math.abs(deleteAccData.amount))}?`} 
             btnText="Hapus"
             onConfirm={() => { setAccounting(accounting.filter(x => x.id !== deleteAccData.id)); setDeleteAccData(null); showToast('Data jurnal dihapus'); playSound('pop', isSoundOn); }} 
             onCancel={() => setDeleteAccData(null)} 
             colors={colors} isSoundOn={isSoundOn} 
          />
       )}

       {selectedDoc && <DocumentReceiptModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} storeInfo={storeInfo} colors={colors} isSoundOn={isSoundOn} />}
       {showAccModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
             <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border}`}>
               <div className="flex justify-between items-center mb-6">
                 <h3 className={`text-xl font-bold ${colors.text}`}>{accForm.id ? 'Edit Data Pembukuan' : 'Input Pembukuan Manual'}</h3>
                 <button onClick={() => { playSound('pop', isSoundOn); setShowAccModal(false); }} className="text-red-500 hover:scale-110"><X size={24}/></button>
               </div>
               <form onSubmit={handleAccSave} className="space-y-4">
                 <div>
                   <label className={`block text-xs font-semibold mb-2 ${colors.textMuted}`}>Waktu & Tanggal</label>
                   <DateInput type="datetime-local" required className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37] [color-scheme:light] dark:[color-scheme:dark]`} value={accForm.date} onChange={e=>setAccForm({...accForm, date: e.target.value})} />
                 </div>
                 <div>
                   <label className={`block text-xs font-semibold mb-2 ${colors.textMuted}`}>Pilih Kelompok Akun</label>
                   <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'kas', label: 'Kas & Bank', icon: Wallet, desc: 'Mutasi uang (Tunai/Bank)' },
                        { id: 'aset_tetap', label: 'Aset Tetap', icon: Store, desc: 'Beli barang inventaris' },
                        { id: 'liabilitas', label: 'Liabilitas', icon: CreditCard, desc: 'Utang / Pinjaman Bank' },
                        { id: 'ekuitas', label: 'Ekuitas', icon: PieChart, desc: 'Modal tambahan pemilik' }
                      ].map(type => (
                        <button type="button" key={type.id} onClick={() => { playSound('pop', isSoundOn); setAccForm({...accForm, type: type.id}); }} className={`p-3 border rounded-xl text-left transition-colors flex flex-col items-start gap-1 ${accForm.type === type.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : `${colors.border} hover:bg-gray-50 dark:hover:bg-[#27272A]`}`}>
                           <div className="flex items-center gap-1 font-bold text-sm text-blue-600 dark:text-stone-400"><type.icon size={14}/> {type.label}</div>
                           <span className="text-[10px] text-gray-500 leading-tight">{type.desc}</span>
                        </button>
                      ))}
                   </div>
                 </div>
                 {accForm.type === 'kas' && (
                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${colors.textMuted}`}>Pilih Akun Sumber/Tujuan</label>
                      <select required className={`w-full p-3 rounded-xl border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={accForm.accountId} onChange={e=>setAccForm({...accForm, accountId: Number(e.target.value)})}>
                         <option value="" disabled>-- Pilih Akun --</option>
                         {financialAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </div>
                 )}
                 <div>
                   <label className={`block text-xs font-semibold mb-2 ${colors.textMuted}`}>Keterangan / Judul Transaksi</label>
                   <input required type="text" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} focus:ring-1 focus:ring-[#D4AF37] outline-none`} placeholder="Cth: Bayar Listrik, Rak Baru..." value={accForm.name} onChange={e=>setAccForm({...accForm, name: e.target.value})} />
                 </div>
                 <div>
                   <label className={`block text-xs font-semibold mb-2 flex justify-between items-end ${colors.textMuted}`}>
                      <span>Nominal (Rp)</span>
                      {accForm.type === 'kas' && (
                         <label className="flex items-center gap-1 cursor-pointer bg-red-100 text-red-700 dark:bg-red-900/30 px-2 py-1 rounded">
                            <input type="checkbox" checked={accForm.isExpense} onChange={e=>setAccForm({...accForm, isExpense: e.target.checked})} className="rounded w-3 h-3 text-red-500 focus:ring-red-500 border-red-500" />
                            Pengeluaran
                         </label>
                      )}
                   </label>
                   <input required type="text" className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} focus:ring-1 focus:ring-[#D4AF37] outline-none font-bold text-lg`} value={accForm.amount ? formatIDR(accForm.amount) : ''} onChange={e=>{
                       let val = e.target.value.replace(/[^0-9]/g, '');
                       if(val==='0') val = '';
                       setAccForm({...accForm, amount: val});
                   }} />
                 </div>
                 <div className="flex gap-3 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700">
                   <button type="button" onClick={() => { playSound('pop', isSoundOn); setShowAccModal(false); }} className={`flex-1 py-3 border rounded-xl font-bold ${colors.text} ${colors.border}`}>Batal</button>
                   <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] shadow-md ${colors.goldBg} hover:opacity-90`}>Simpan Pembukuan</button>
                 </div>
               </form>
             </div>
          </div>
       )}
      </div>
    </div>
  );
}