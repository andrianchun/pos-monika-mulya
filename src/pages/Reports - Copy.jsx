import React, { useState } from 'react';
import { FileText, Package, PieChart, ChevronLeft, Filter, BarChart, TrendingUp, Wallet, Store, CreditCard, Edit, Trash2, X } from 'lucide-react';
import { formatIDR, parseIDR, playSound } from '../utils/helpers';
import SimpleChart from '../components/ui/SimpleChart';
import DataTable from '../components/ui/DataTable';
import DonutChart from '../components/ui/DonutChart';
import DocumentReceiptModal from '../components/modals/DocumentReceiptModal';
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal';

export default function Reports({ sales, purchases, products, accounting, setAccounting, financialAccounts, colors, isSoundOn, theme, storeInfo, showToast }) {
  const [activeReport, setActiveReport] = useState(null); 
  const [filterMode, setFilterMode] = useState('Bulan Ini'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [chartMode, setChartMode] = useState('line');
  const [showAccModal, setShowAccModal] = useState(false);
  const [deleteAccData, setDeleteAccData] = useState(null);
  const [accForm, setAccForm] = useState({ id: '', type: 'kas', accountId: financialAccounts[0]?.id || '', name: '', amount: '', date: new Date().toISOString().split('T')[0], isExpense: false });

  const getFilteredData = (dataArray) => {
     if(filterMode === 'Keseluruhan') return dataArray;
     const now = new Date(); let start = new Date(now); let end = new Date(now);
     if (filterMode === 'Manual') {
        start = startDate ? new Date(startDate) : new Date(0);
        end = endDate ? new Date(endDate) : new Date(); end.setHours(23, 59, 59, 999);
     } else if (filterMode === 'Hari Ini') { start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
     } else if (filterMode === 'Minggu Ini') { start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
     } else if (filterMode === 'Bulan Ini') { start.setDate(1); start.setHours(0,0,0,0); end.setMonth(start.getMonth() + 1); end.setDate(0); end.setHours(23, 59, 59, 999);
     } else if (filterMode === 'Tahun Ini') { start.setMonth(0, 1); start.setHours(0,0,0,0); end.setMonth(11, 31); end.setHours(23, 59, 59, 999); }
     return dataArray.filter(d => { const t = new Date(d.date).getTime(); return t >= start.getTime() && t <= end.getTime(); });
  };

  const filteredSales = getFilteredData(sales); 
  const filteredPurchases = getFilteredData(purchases);
  const activeDataArray = activeReport === 'pembelian' ? filteredPurchases : filteredSales;
  
  const totalHppAll = activeDataArray.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + (i.cost * i.qty), 0), 0);
  const totalNetoAll = activeDataArray.reduce((acc, s) => acc + s.total, 0);
  const totalLabaAll = activeReport === 'penjualan' ? (totalNetoAll - totalHppAll) : 0;

  // PERBAIKAN 1: Pengelompokan Label yang lebih dinamis
  const repChartLabels = () => {
      if (filterMode === 'Hari Ini') return ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      if (filterMode === 'Minggu Ini') return ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      if (filterMode === 'Bulan Ini') return ['Mg 1', 'Mg 2', 'Mg 3', 'Mg 4', 'Mg 5']; // Ditambah Mg 5 karena beberapa bulan melebihi 4 minggu
      if (filterMode === 'Tahun Ini') return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      return ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5']; // Fallback untuk Manual/Keseluruhan
  };

  // PERBAIKAN 2: Agregasi (Penjumlahan) dan Kalkulasi Tinggi Bar yang proporsional
  const generateChartData = (dataArray) => {
     const labels = repChartLabels();
     let bucketSums = new Array(labels.length).fill(0);

     if (dataArray.length > 0) {
        dataArray.forEach(s => {
           const d = new Date(s.date);
           let idx = 0;
           
           if (filterMode === 'Hari Ini') {
              const h = d.getHours();
              if (h < 10) idx = 0;
              else if (h < 12) idx = 1;
              else if (h < 14) idx = 2;
              else if (h < 16) idx = 3;
              else if (h < 18) idx = 4;
              else if (h < 20) idx = 5;
              else idx = 6;
           } else if (filterMode === 'Minggu Ini') {
              idx = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0 (Minggu) dipindah ke index 6
           } else if (filterMode === 'Bulan Ini') {
              idx = Math.min(Math.floor((d.getDate() - 1) / 7), labels.length - 1);
           } else if (filterMode === 'Tahun Ini') {
              idx = d.getMonth();
           } else {
              idx = d.getDate() % labels.length; // Distribusi simpel untuk mode Manual
           }

           if (idx >= 0 && idx < labels.length) {
              bucketSums[idx] += s.total;
           }
        });

        // Mencari nilai tertinggi dari kelompok yang sudah diagregasi untuk menentukan skala
        const maxData = Math.max(...bucketSums, 1);
        return bucketSums.map(sum => ({ value: sum, percentage: (sum / maxData) * 100 }));
     }

     // Dummy data saat kosong
     let baseData = labels.map(() => Math.max(10, Math.floor(Math.random() * 100)));
     const maxVal = Math.max(...baseData, 1); 
     return baseData.map(val => ({ value: val * 100000, percentage: (val / maxVal) * 100 }));
  }

  const repChartData = generateChartData(activeReport === 'pembelian' ? filteredPurchases : filteredSales);

  const calculateLeaderboard = (dataArray) => {
     let map = {};
     dataArray.forEach(doc => { doc.items.forEach(item => { if(!map[item.id]) map[item.id] = { name: item.name, total: 0 }; map[item.id].total += item.qty; }); });
     return Object.values(map).sort((a,b) => b.total - a.total);
  };
  const leaderboardFull = calculateLeaderboard(activeReport === 'pembelian' ? filteredPurchases : filteredSales);
  const topItems = leaderboardFull.slice(0, 5); const slowestItems = [...leaderboardFull].reverse().slice(0, 5);

  const calculateNeraca = () => {
     const totalPenjualan = filteredSales.reduce((sum, s) => sum + s.total, 0);
     const totalHPP = filteredSales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + (item.cost * item.qty), 0), 0);
     const labaKotor = totalPenjualan - totalHPP;
     const persediaan = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
     const piutang = sales.reduce((sum, s) => sum + (s.total > s.paid ? s.total - s.paid : 0), 0);
     const utang = purchases.reduce((sum, p) => sum + (p.total > p.paid ? p.total - p.paid : 0), 0);
     
     const kasBalances = financialAccounts.map(acc => ({ name: acc.name, balance: accounting.filter(a => a.type === 'kas' && a.accountId === acc.id).reduce((sum, a) => sum + a.amount, 0) }));
     const totalKas = kasBalances.reduce((sum, k) => sum + k.balance, 0);
     const asetTetap = accounting.filter(a => a.type === 'aset_tetap').reduce((sum, a) => sum + a.amount, 0);
     const modalAwal = accounting.filter(a => a.type === 'ekuitas').reduce((sum, a) => sum + a.amount, 0);
     const liabLain = accounting.filter(a => a.type === 'liabilitas').reduce((sum, a) => sum + a.amount, 0);

     const asetLancarTotal = totalKas + piutang + persediaan;
     
     const bebanOperasional = accounting.filter(a => a.type === 'kas' && a.amount < 0 && !a.name.toLowerCase().includes('bayar nota')).reduce((sum, a) => sum + Math.abs(a.amount), 0);
     const pendapatanLain = accounting.filter(a => a.type === 'kas' && a.amount > 0 && !a.name.toLowerCase().includes('terima nota') && !a.name.toLowerCase().includes('modal') && !a.name.toLowerCase().includes('saldo')).reduce((sum, a) => sum + a.amount, 0);
     const pendapatanBersih = labaKotor + pendapatanLain - bebanOperasional;

     return { totalPenjualan, totalHPP, labaKotor, persediaan, piutang, utang, kasBalances, totalKas, asetTetap, modalAwal, liabLain, totalAset: asetLancarTotal + asetTetap, totalLiabilitas: utang + liabLain, totalEkuitas: modalAwal + labaKotor, pendapatanBersih };
  };
  const neraca = calculateNeraca();

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
     if(a.type === 'kas') { const accData = financialAccounts.find(fa => fa.id === a.accountId); if(accData) typeDisplay = `Kas/Bank (${accData.name})`; }
     return { ...a, accNameDisplay: typeDisplay };
  });

  const accColumns = [
    { key: 'date', label: 'Tanggal', render: r => new Date(r.date).toLocaleDateString('id-ID') },
    { key: 'accNameDisplay', label: 'Jenis Akun', render: r => <span className="capitalize text-[10px] font-semibold px-2 py-1 rounded bg-[#F8FAFC] dark:bg-[#27272A] whitespace-nowrap">{r.accNameDisplay}</span> },
    { key: 'name', label: 'Keterangan' },
    { key: 'amount', label: 'Nominal', render: r => <span className={`font-bold ${r.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>{r.amount < 0 ? '-' : ''} Rp {formatIDR(Math.abs(r.amount))}</span> }
  ];

  if (!activeReport) {
    return (
      <div className="space-y-6">
        <h2 className={`text-2xl font-bold ${colors.text}`}>Laporan & Analitik Terpadu</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => { playSound('pop', isSoundOn); setActiveReport('penjualan'); }} className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm flex flex-col items-center justify-center text-center h-48 cursor-pointer hover:border-[#D4AF37] transition-all group`}><FileText size={48} className={`mb-3 ${colors.gold} group-hover:scale-110 transition-transform`} /><h3 className={`font-bold text-lg ${colors.text}`}>Laporan Penjualan</h3><p className={`text-sm ${colors.textMuted}`}>Detail omset harian, bulanan & laba per nota.</p></div>
          <div onClick={() => { playSound('pop', isSoundOn); setActiveReport('pembelian'); }} className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm flex flex-col items-center justify-center text-center h-48 cursor-pointer border-blue-500 hover:shadow-blue-500/20 transition-all group`}><Package size={48} className={`mb-3 text-blue-500 group-hover:scale-110 transition-transform`} /><h3 className={`font-bold text-lg ${colors.text}`}>Laporan Pembelian</h3><p className={`text-sm ${colors.textMuted}`}>History kulakan, hutang supplier, nilai aset stok.</p></div>
          <div onClick={() => { playSound('pop', isSoundOn); setActiveReport('neraca'); }} className={`p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm flex flex-col items-center justify-center text-center h-48 cursor-pointer border-purple-500 hover:shadow-purple-500/20 transition-all group`}><PieChart size={48} className={`mb-3 text-purple-500 group-hover:scale-110 transition-transform`} /><h3 className={`font-bold text-lg ${colors.text}`}>Neraca Keuangan</h3><p className={`text-sm ${colors.textMuted}`}>Pembukuan, aset, liabilitas & ekuitas toko.</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
       <div className={`p-4 rounded-xl border ${colors.border} ${colors.panel} flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4`}>
         <div className="flex items-center gap-4">
            <button onClick={() => { playSound('pop', isSoundOn); setActiveReport(null); }} className={`p-2 rounded-full hover:bg-[#F8FAFC] dark:bg-[#27272A] ${colors.text}`}><ChevronLeft size={24}/></button>
            <h2 className={`text-xl font-bold ${colors.text} capitalize`}>Laporan {activeReport}</h2>
         </div>
         <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className={colors.textMuted}/>
            <select className={`p-2 rounded-lg text-sm border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={filterMode} onChange={e => { playSound('pop', isSoundOn); setFilterMode(e.target.value); }}>
               <option>Hari Ini</option><option>Minggu Ini</option><option>Bulan Ini</option><option>Tahun Ini</option><option>Keseluruhan</option><option>Manual</option>
            </select>
            {filterMode === 'Manual' && (
               <div className="flex items-center gap-1">
                  <input type="date" className={`p-2 text-sm rounded border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <span className={colors.textMuted}>-</span>
                  <input type="date" className={`p-2 text-sm rounded border ${colors.border} bg-white dark:bg-[#1e1e1e] ${colors.text}`} value={endDate} onChange={e => setEndDate(e.target.value)} />
               </div>
            )}
         </div>
       </div>

       <div className={`flex-1 rounded-xl border ${colors.border} ${colors.panel} p-4 sm:p-6 overflow-y-auto custom-scrollbar`}>
          {(activeReport === 'penjualan' || activeReport === 'pembelian') && (
             <div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                   <div className={`lg:col-span-2 p-4 border rounded-xl ${colors.border} bg-gray-50 dark:bg-[#2a2a24]`}>
                      <div className="flex justify-between items-center mb-2">
                         <h3 className={`font-bold text-sm ${colors.text}`}>Grafik {activeReport} ({filterMode})</h3>
                         <div className="flex gap-1 bg-[#E2E8F0] dark:bg-[#27272A] rounded p-0.5">
                            <button onClick={() => { playSound('pop', isSoundOn); setChartMode('bar'); }} className={`p-1 rounded ${chartMode === 'bar' ? colors.goldBg + ' text-[#18181B]' : colors.textMuted}`}><BarChart size={12}/></button>
                            <button onClick={() => { playSound('pop', isSoundOn); setChartMode('line'); }} className={`p-1 rounded ${chartMode === 'line' ? colors.goldBg + ' text-[#18181B]' : colors.textMuted}`}><TrendingUp size={12}/></button>
                         </div>
                      </div>
                      <SimpleChart chartData={repChartData} chartType={activeReport === 'pembelian' ? 'Pembelian' : 'Penjualan'} chartMode={chartMode} labels={repChartLabels()} theme={theme} colors={colors} heightClass="h-72"/>
                   </div>
                   <div className={`p-4 border rounded-xl ${colors.border} bg-gray-50 dark:bg-[#2a2a24] flex flex-col justify-between`}>
                      <div>
                         <h3 className={`font-bold text-sm mb-2 ${colors.text}`}>Item Paling {activeReport === 'penjualan' ? 'Laris' : 'Banyak Dibeli'}</h3>
                         <div className="space-y-2">
                            {topItems.map((item, i) => (
                              <div key={i} className={`flex justify-between items-center p-2 rounded bg-white dark:bg-[#1e1e1e] border ${colors.border} text-sm shadow-sm`}>
                                <span className={`font-semibold line-clamp-1 ${colors.text}`}>{i+1}. {item.name}</span><span className={`font-bold ${activeReport === 'penjualan' ? colors.gold : 'text-blue-500'}`}>{item.total}x</span>
                              </div>
                            ))}
                            {topItems.length === 0 && <p className="text-xs text-gray-500 text-center py-2">Tidak ada data di periode ini.</p>}
                         </div>
                      </div>
                      {activeReport === 'penjualan' && slowestItems.length > 0 && (
                         <div className="mt-4">
                            <h3 className={`font-bold text-xs mb-2 text-red-500`}>Item Paling Lambat Terjual</h3>
                            <div className="space-y-2">
                               {slowestItems.slice(0,3).map((item, i) => (
                                 <div key={i} className={`flex justify-between items-center px-2 py-1 rounded bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-xs`}>
                                   <span className={`line-clamp-1 ${colors.textMuted}`}>{item.name}</span><span className="font-bold text-red-400">{item.total}x</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                      )}
                   </div>
                </div>

                {activeDataArray.length > 0 && (
                   <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 rounded-xl border ${colors.border} ${activeReport === 'pembelian' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                      <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Total Transaksi</span><span className={`text-lg font-bold ${colors.text}`}>{activeDataArray.length} Nota</span></div>
                      <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Modal Pokok (HPP)</span><span className={`text-lg font-bold ${colors.text}`}>Rp {formatIDR(totalHppAll)}</span></div>
                      <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Total Neto (Omset)</span><span className={`text-lg font-bold ${activeReport === 'pembelian' ? 'text-blue-600' : 'text-green-600'}`}>Rp {formatIDR(totalNetoAll)}</span></div>
                      {activeReport === 'penjualan' && (
                         <div className="flex flex-col"><span className={`text-xs font-semibold ${colors.textMuted}`}>Laba Kotor</span><span className={`text-lg font-bold text-purple-600`}>Rp {formatIDR(totalLabaAll)}</span></div>
                      )}
                   </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                   <table className={`w-full text-sm text-left ${colors.text} mb-0`}>
                      <thead className={`text-xs uppercase ${activeReport === 'pembelian' ? 'bg-blue-50 dark:bg-blue-900/20' : colors.creamBg} border-b ${colors.border}`}>
                        <tr><th className="px-4 py-3">Tgl</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Item</th><th className="px-4 py-3 text-right">Modal Pokok</th><th className="px-4 py-3 text-right">Total (Neto)</th>{activeReport==='penjualan' && <th className="px-4 py-3 text-right">Laba</th>}</tr>
                      </thead>
                      <tbody>
                        {activeDataArray.length === 0 ? (
                           <tr><td colSpan={6} className="text-center py-10 italic text-gray-500 border-b border-gray-200 dark:border-gray-800">Tidak ada data di periode ini.</td></tr>
                        ) : (
                           activeDataArray.map(s => {
                              const hpp = s.items.reduce((sum, i) => sum + (i.cost * i.qty), 0);
                              return (
                                 <tr key={s.id} className={`border-b ${colors.border} hover:${colors.creamBg}`}>
                                    <td className="px-4 py-3">{new Date(s.date).toLocaleDateString('id-ID')}</td>
                                    <td className="px-4 py-3 font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => setSelectedDoc(s)}>{s.nota}</td>
                                    <td className="px-4 py-3">{s.items.length} Macam</td>
                                    <td className="px-4 py-3 text-right">Rp {formatIDR(hpp)}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${activeReport === 'pembelian' ? 'text-blue-600' : 'text-green-600'}`}>Rp {formatIDR(s.total)}</td>
                                    {activeReport==='penjualan' && <td className="px-4 py-3 text-right font-bold text-purple-600">Rp {formatIDR(s.total - hpp)}</td>}
                                 </tr>
                              )
                           })
                        )}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {activeReport === 'neraca' && (
             <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                   <h3 className={`text-xl font-bold ${colors.text}`}>Neraca Keuangan Toko (Buku Besar)</h3>
                   <button onClick={() => { playSound('pop', isSoundOn); setAccForm({ id: '', type: 'kas', accountId: financialAccounts[0]?.id||'', name: '', amount: '', date: new Date().toISOString().split('T')[0], isExpense: false }); setShowAccModal(true); }} className={`flex-1 sm:flex-none px-4 py-2 font-bold text-[#18181B] rounded-lg shadow-sm ${colors.goldBg} hover:opacity-90`}>Input Data</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div className={`p-5 rounded-2xl border ${colors.border} bg-gray-50 dark:bg-[#2a2a24] shadow-sm relative overflow-hidden`}>
                         <div className="absolute top-4 right-4 opacity-50 hidden sm:block">
                            <DonutChart data={[
                               { label: 'Kas & Bank', value: neraca.totalKas, color: '#22c55e' },
                               { label: 'Piutang', value: neraca.piutang, color: '#eab308' },
                               { label: 'Persediaan', value: neraca.persediaan, color: '#3b82f6' },
                               { label: 'Aset Tetap', value: neraca.asetTetap, color: '#a855f7' }
                            ]} colors={colors} />
                         </div>
                         <h4 className={`font-bold text-lg mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 ${colors.text}`}>1. Aset Lancar</h4>
                         <div className="space-y-2 text-sm relative z-10">
                            <div className="flex justify-between sm:w-2/3 pr-2"><span className={colors.textMuted}>Kas & Bank (Saldo Total)</span><span className="font-semibold text-green-600">Rp {formatIDR(neraca.totalKas)}</span></div>
                            <div className="pl-3 border-l-2 border-green-200 dark:border-green-900 space-y-1 my-2 sm:w-2/3 pr-2">
                               {neraca.kasBalances.map((k, i) => (<div key={i} className="flex justify-between text-xs"><span className={colors.textMuted}>- {k.name}</span><span className="font-semibold">Rp {formatIDR(k.balance)}</span></div>))}
                            </div>
                            <div className="flex justify-between sm:w-2/3 pr-2"><span className={colors.textMuted}>Piutang Usaha (Bon)</span><span className="font-semibold">Rp {formatIDR(neraca.piutang)}</span></div>
                            <div className="flex justify-between sm:w-2/3 pr-2"><span className={colors.textMuted}>Persediaan (Inventory)</span><span className="font-semibold text-blue-600">Rp {formatIDR(neraca.persediaan)}</span></div>
                         </div>
                         <div className="flex justify-between mt-3 pt-2 border-t border-dashed font-bold"><span>Total Aset Lancar</span><span>Rp {formatIDR(neraca.totalKas + neraca.piutang + neraca.persediaan)}</span></div>
                      </div>
                      <div className={`p-5 rounded-2xl border ${colors.border} bg-gray-50 dark:bg-[#2a2a24] shadow-sm`}>
                         <h4 className={`font-bold text-lg mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 ${colors.text}`}>2. Aset Tetap</h4>
                         <div className="space-y-2 text-sm">
                            {accounting.filter(a => a.type === 'aset_tetap').map(a => (<div key={a.id} className="flex justify-between"><span className={colors.textMuted}>{a.name}</span><span className="font-semibold">Rp {formatIDR(a.amount)}</span></div>))}
                         </div>
                         <div className="flex justify-between mt-3 pt-2 border-t border-dashed font-bold"><span>Total Aset Tetap</span><span>Rp {formatIDR(neraca.asetTetap)}</span></div>
                      </div>
                      <div className={`p-4 rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 flex justify-between font-black text-lg shadow-sm`}>
                         <span>TOTAL ASET (HARTA)</span><span>Rp {formatIDR(neraca.totalAset)}</span>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className={`p-5 rounded-2xl border ${colors.border} bg-gray-50 dark:bg-[#2a2a24] shadow-sm relative overflow-hidden`}>
                         <div className="absolute top-4 right-4 opacity-50 hidden sm:block">
                            <DonutChart data={[
                               { label: 'Utang Usaha', value: neraca.utang, color: '#ef4444' },
                               { label: 'Liab. Lain', value: neraca.liabLain, color: '#f97316' },
                               { label: 'Modal', value: neraca.modalAwal, color: '#3b82f6' },
                               { label: 'Laba Ditahan', value: neraca.labaKotor, color: '#a855f7' }
                            ]} colors={colors} />
                         </div>
                         <h4 className={`font-bold text-lg mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 ${colors.text}`}>3. Liabilitas (Kewajiban)</h4>
                         <div className="space-y-2 text-sm relative z-10">
                            <div className="flex justify-between sm:w-2/3 pr-2"><span className={colors.textMuted}>Utang Usaha (Ke Supplier)</span><span className="font-semibold text-red-500">Rp {formatIDR(neraca.utang)}</span></div>
                            {accounting.filter(a => a.type === 'liabilitas').map(a => (<div key={a.id} className="flex justify-between sm:w-2/3 pr-2"><span className={colors.textMuted}>{a.name}</span><span className="font-semibold text-red-500">Rp {formatIDR(a.amount)}</span></div>))}
                         </div>
                         <div className="flex justify-between mt-3 pt-2 border-t border-dashed font-bold"><span>Total Liabilitas</span><span>Rp {formatIDR(neraca.totalLiabilitas)}</span></div>
                      </div>
                      <div className={`p-5 rounded-2xl border ${colors.border} bg-gray-50 dark:bg-[#2a2a24] shadow-sm`}>
                         <h4 className={`font-bold text-lg mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 ${colors.text}`}>4. Ekuitas (Modal & Laba)</h4>
                         <div className="space-y-2 text-sm">
                            {accounting.filter(a => a.type === 'ekuitas').map(a => (<div key={a.id} className="flex justify-between"><span className={colors.textMuted}>{a.name}</span><span className="font-semibold">Rp {formatIDR(a.amount)}</span></div>))}
                            <div className="flex justify-between"><span className={colors.textMuted}>Laba Ditahan / Laba Kotor</span><span className="font-semibold text-purple-600">Rp {formatIDR(neraca.labaKotor)}</span></div>
                         </div>
                         <div className="flex justify-between mt-3 pt-2 border-t border-dashed font-bold"><span>Total Ekuitas</span><span>Rp {formatIDR(neraca.totalEkuitas)}</span></div>
                         <div className="flex justify-between mt-4 pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                            <span className={`font-bold ${colors.text}`}>Pendapatan Bersih (Net Income)</span>
                            <span className="font-black text-green-600">Rp {formatIDR(neraca.pendapatanBersih)}</span>
                         </div>
                      </div>
                      <div className={`p-4 rounded-xl border-2 border-[#D4AF37] bg-yellow-50 dark:bg-[#D4AF37]/20 ${colors.gold} flex justify-between font-black text-lg shadow-sm`}>
                         <span>TOTAL LIAB. + EKUITAS</span><span>Rp {formatIDR(neraca.totalLiabilitas + neraca.totalEkuitas)}</span>
                      </div>
                   </div>
                </div>

                <div className="mt-8">
                   <DataTable title="Rincian Jurnal Pembukuan" columns={accColumns} data={enrichedAccounting} defaultSort={{key: 'date', direction: 'desc'}} colors={colors} actions={[
                     { icon: Edit, label: 'Edit', colorClass: 'bg-blue-100 text-blue-600 hover:bg-blue-200', onClick: (a) => { playSound('pop', isSoundOn); setAccForm({...a, amount: Math.abs(a.amount).toString(), isExpense: a.amount < 0, date: new Date(a.date).toISOString().split('T')[0] }); setShowAccModal(true); } }
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
                   <label className={`block text-xs font-semibold mb-2 ${colors.textMuted}`}>Tanggal</label>
                   <input type="date" required className={`w-full p-3 rounded-xl border ${colors.border} bg-transparent ${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]`} value={accForm.date} onChange={e=>setAccForm({...accForm, date: e.target.value})} />
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
                           <div className="flex items-center gap-1 font-bold text-sm text-blue-600 dark:text-blue-400"><type.icon size={14}/> {type.label}</div>
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
  );
}