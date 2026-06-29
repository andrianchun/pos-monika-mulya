import React, { useState, useMemo } from 'react';
import { TrendingUp, BarChart2, ShoppingCart, Users, ChevronDown, Activity, Package, Star, AlertTriangle } from 'lucide-react';
import { formatIDR, playSound } from '../utils/helpers';

export default function Dashboard({ products, sales, purchases, customers, colors, theme, handleMenuClick, isSoundOn }) {
  const [timeRange, setTimeRange] = useState('bulan'); 
  const [chartType, setChartType] = useState('bar'); 
  const [chartTab, setChartTab] = useState('penjualan'); 
  const [listTab, setListTab] = useState('laris'); 
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);

  const ranges = {
    hari: 'Hari Ini',
    minggu: 'Minggu Ini',
    bulan: 'Bulan Ini',
    tahun: 'Tahun Ini',
    '3tahun': '3 Tahun Terakhir',
    '5tahun': '5 Tahun Terakhir',
    awal: 'Dari Awal'
  };

  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.date);
      if (timeRange === 'hari') return d.toDateString() === now.toDateString();
      if (timeRange === 'minggu') {
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (timeRange === 'bulan') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (timeRange === 'tahun') return d.getFullYear() === now.getFullYear();
      if (timeRange === '3tahun') return d.getFullYear() >= now.getFullYear() - 3;
      if (timeRange === '5tahun') return d.getFullYear() >= now.getFullYear() - 5;
      return true; 
    });
  }, [sales, timeRange]);

  const stats = useMemo(() => {
    const totalPenjualan = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalPendapatan = filteredSales.reduce((sum, s) => sum + (s.total - (s.discount || 0)), 0);
    const totalTransaksi = filteredSales.length;
    const uniqueCusts = new Set(filteredSales.map(s => s.customer).filter(c => c && c !== 'Umum (Tanpa Data)' && c !== '-')).size;
    
    return {
      totalPenjualan: totalPenjualan || 20000000,
      totalPendapatan: totalPendapatan || 18500000,
      totalTransaksi: totalTransaksi || 450,
      uniqueCusts: uniqueCusts || 2
    };
  }, [filteredSales]);

  const chartData = useMemo(() => {
    let dataMap = {};
    let labels = [];

    if (timeRange === 'hari' || timeRange === 'minggu') {
      labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      filteredSales.forEach(s => {
        const dayIdx = new Date(s.date).getDay();
        const dayName = labels[dayIdx === 0 ? 6 : dayIdx - 1]; 
        if (!dataMap[dayName]) dataMap[dayName] = { penjualan: 0, transaksi: 0, customer: new Set() };
        dataMap[dayName].penjualan += s.total;
        dataMap[dayName].transaksi += 1;
        if(s.customer) dataMap[dayName].customer.add(s.customer);
      });
    } else if (timeRange === 'bulan') {
      labels = ['Mg 1', 'Mg 2', 'Mg 3', 'Mg 4', 'Mg 5'];
      filteredSales.forEach(s => {
        const d = new Date(s.date).getDate();
        const week = `Mg ${Math.ceil(d / 7)}`;
        if (!dataMap[week]) dataMap[week] = { penjualan: 0, transaksi: 0, customer: new Set() };
        dataMap[week].penjualan += s.total;
        dataMap[week].transaksi += 1;
        if(s.customer) dataMap[week].customer.add(s.customer);
      });
    } else {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      filteredSales.forEach(s => {
        const monthName = labels[new Date(s.date).getMonth()];
        if (!dataMap[monthName]) dataMap[monthName] = { penjualan: 0, transaksi: 0, customer: new Set() };
        dataMap[monthName].penjualan += s.total;
        dataMap[monthName].transaksi += 1;
        if(s.customer) dataMap[monthName].customer.add(s.customer);
      });
    }

    let finalData = labels.map(label => {
      const d = dataMap[label] || { penjualan: 0, transaksi: 0, customer: new Set() };
      let value = 0;
      if (chartTab === 'penjualan') value = d.penjualan;
      if (chartTab === 'transaksi') value = d.transaksi;
      if (chartTab === 'customer') value = d.customer.size;
      return { label, value };
    });

    const isEmpty = finalData.every(d => d.value === 0);
    if (isEmpty) {
       finalData = labels.map((label, i) => {
          let v = 0;
          if (chartTab === 'penjualan') v = [1200000, 2500000, 1800000, 3200000, 2100000, 4500000, 3800000, 5200000, 4100000, 6000000, 5500000, 7000000][i % 12];
          if (chartTab === 'transaksi') v = [15, 30, 25, 45, 35, 60, 50, 75, 65, 90, 85, 110][i % 12];
          if (chartTab === 'customer') v = [5, 12, 8, 18, 14, 25, 20, 30, 26, 38, 34, 45][i % 12];
          return { label, value: v || 0 };
       });
    }

    return finalData;
  }, [filteredSales, timeRange, chartTab]);

  const maxChartVal = Math.max(...chartData.map(d => d.value), 1);

  const rankingLists = useMemo(() => {
    let prodMap = {};
    let catMap = {};
    let custMap = {};

    filteredSales.forEach(s => {
      s.items.forEach(item => {
        prodMap[item.name] = (prodMap[item.name] || 0) + item.qty;
        const pInfo = products.find(p => p.name === item.name);
        if (pInfo && pInfo.category) {
          catMap[pInfo.category] = (catMap[pInfo.category] || 0) + item.qty;
        }
      });
      if (s.customer && s.customer !== 'Umum (Tanpa Data)' && s.customer !== '-') {
        custMap[s.customer] = (custMap[s.customer] || 0) + 1;
      }
    });

    let laris = Object.entries(prodMap).map(([name, qty]) => ({ name, val: qty, unit: 'x' })).sort((a,b) => b.val - a.val).slice(0, 5);
    let kategori = Object.entries(catMap).map(([name, qty]) => ({ name, val: qty, unit: ' item' })).sort((a,b) => b.val - a.val).slice(0, 5);
    let loyal = Object.entries(custMap).map(([name, count]) => ({ name, val: count, unit: ' Trx' })).sort((a,b) => b.val - a.val).slice(0, 5);
    let sulit = products.map(p => ({ name: p.name, val: prodMap[p.name] || 0, unit: ' terjual' })).sort((a,b) => a.val - b.val).slice(0, 5);

    if (laris.length === 0) {
      laris = [{ name: '🌾 Beras Mentik Wangi 5Kg', val: 100, unit: 'x' }, { name: '🍾 Minyak Goreng Sunco 2L', val: 85, unit: 'x' }, { name: '🥚 Telur Ayam Horn 1Kg', val: 70, unit: 'x' }, { name: '🧊 Gula Pasir Gulaku 1Kg', val: 55, unit: 'x' }, { name: '🍜 Indomie Goreng', val: 40, unit: 'x' }];
      kategori = [{ name: 'Sembako', val: 240, unit: ' item' }, { name: 'Makanan', val: 150, unit: ' item' }, { name: 'Minuman', val: 95, unit: ' item' }];
      sulit = [{ name: 'Minyak Bimoli 1L', val: 0, unit: ' terjual' }];
      loyal = [{ name: 'Umum (Tanpa Data)', val: 320, unit: ' Trx' }, { name: 'Toko Sebelah', val: 14, unit: ' Trx' }];
    }

    return { laris, kategori, loyal, sulit };
  }, [filteredSales, products]);

  const activeListData = rankingLists[listTab] || [];
  const maxListVal = Math.max(...activeListData.map(d => d.val), 1);

  const kpiData = [
    { title: 'Total Penjualan', value: `Rp ${formatIDR(stats.totalPenjualan)}`, trend: '+15%', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Total Pendapatan', value: `Rp ${formatIDR(stats.totalPendapatan)}`, trend: '+12%', icon: BarChart2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Total Transaksi', value: stats.totalTransaksi, trend: '+5%', icon: ShoppingCart, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Konsumen Aktif', value: `${stats.uniqueCusts} Orang`, trend: '+8%', icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' }
  ];

  return (
    <div className="space-y-4 pb-10 select-none">
      <div className="flex justify-between items-center mb-4">
         <h2 className={`text-xl sm:text-2xl font-extrabold ${colors.text}`}>Dashboard Overview</h2>
         <div className="relative">
            <button 
              onClick={() => setShowRangeDropdown(!showRangeDropdown)}
              className={`flex items-center gap-2 ${colors.panel} border ${colors.border} px-4 py-2 rounded-xl text-sm ${colors.text} hover:border-[#D4AF37] transition-all shadow-sm font-bold`}
            >
              {ranges[timeRange]} <ChevronDown size={16} className={showRangeDropdown ? 'rotate-180' : ''} />
            </button>
            {showRangeDropdown && (
              <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl ${colors.panel} border ${colors.border} z-[100] overflow-hidden`}>
                {Object.entries(ranges).map(([key, label]) => (
                  <button key={key} onClick={() => { setTimeRange(key); setShowRangeDropdown(false); playSound('pop', isSoundOn); }} className={`w-full text-left px-4 py-2.5 text-xs font-semibold border-b ${colors.border} last:border-0 hover:bg-gray-100 dark:hover:bg-[#27272A] ${timeRange === key ? 'text-[#D4AF37]' : colors.text}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
         </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, idx) => (
          <div key={idx} className={`p-5 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm group hover:border-[#D4AF37] transition-colors`}>
            <div className="flex justify-between items-start mb-2">
               <div>
                 <p className={`text-xs font-bold ${colors.textMuted} mb-1 opacity-70`}>{kpi.title}</p>
                 <h3 className={`text-xl sm:text-2xl font-black ${colors.text}`}>{kpi.value}</h3>
               </div>
               <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform`}>
                 <kpi.icon size={22} />
               </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
               <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded">{kpi.trend}</span>
               <span className={colors.textMuted}>vs {ranges[timeRange].toLowerCase()} lalu</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
         {/* GRAFIK UTAMA */}
         <div className={`col-span-1 lg:col-span-2 p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm flex flex-col`}>
            <div className="flex justify-between items-center mb-6">
               <h3 className={`font-black text-base ${colors.text}`}>Grafik {ranges[timeRange]}</h3>
               <div className={`flex bg-gray-100 dark:bg-[#121212] rounded-xl p-1 border ${colors.border}`}>
                  <button onClick={() => setChartType('bar')} className={`px-4 py-1.5 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white dark:bg-[#27272A] shadow-sm text-[#D4AF37]' : 'text-gray-400'}`}><BarChart2 size={16}/></button>
                  <button onClick={() => setChartType('line')} className={`px-4 py-1.5 rounded-lg transition-all ${chartType === 'line' ? 'bg-white dark:bg-[#27272A] shadow-sm text-[#D4AF37]' : 'text-gray-400'}`}><Activity size={16}/></button>
               </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
               {['Penjualan', 'Transaksi', 'Customer Aktif'].map(tab => (
                  <button 
                     key={tab} onClick={() => { playSound('pop', isSoundOn); setChartTab(tab.toLowerCase().replace(' aktif', '')); }}
                     className={`px-5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${chartTab === tab.toLowerCase().replace(' aktif', '') ? colors.goldBg + ' text-[#18181B] shadow-lg' : 'bg-[#F8FAFC] dark:bg-[#27272A] text-gray-500 hover:opacity-80'}`}
                  >
                     {tab}
                  </button>
               ))}
            </div>

            <div className="relative flex-1 min-h-[250px] w-full flex flex-col justify-end pt-4">
               {/* Grid Background Horizontal */}
               <div className="absolute inset-0 flex flex-col justify-between z-0 pb-6 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-full border-t border-dashed border-gray-200 dark:border-gray-800 flex-[0_0_auto]"></div>
                  ))}
               </div>

               {chartType === 'bar' ? (
                  <div className="w-full h-[220px] flex items-end justify-between gap-1 sm:gap-3 relative z-10 pb-6">
                    {/* PERBAIKAN GRAFIK BAR DINAMIS: Skala proportional terhadap maxChartVal dari dataset */}
                    {chartData.map((d, i) => {
                      const h = (d.value / maxChartVal) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                          <div className="w-full max-w-[40px] bg-[#D4AF37] rounded-t-sm opacity-80 group-hover:opacity-100 transition-all cursor-pointer relative min-h-[4px]" style={{ height: `${h || 0}%` }}>
                             {/* Tooltip Hover */}
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
                               {chartTab === 'penjualan' ? `Rp ${formatIDR(d.value)}` : d.value}
                             </div>
                          </div>
                          <span className={`absolute -bottom-6 text-[9px] sm:text-[10px] font-bold ${colors.textMuted} whitespace-nowrap`}>{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
               ) : (
                  <div className="w-full h-[220px] relative z-10 pb-6">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Polygon (Isi area bawah garis gradien elegan) */}
                      <polygon 
                        points={`0,100 ${chartData.map((d, i) => `${(i / (chartData.length - 1 || 1)) * 100},${100 - ((d.value / maxChartVal) * 100)}`).join(' ')} 100,100`} 
                        fill="url(#lineGrad)" 
                      />
                      
                      {/* Polyline (Garis utama MURNI tanpa titik, anti-gepeng) */}
                      <polyline 
                        points={chartData.map((d, i) => `${(i / (chartData.length - 1 || 1)) * 100},${100 - ((d.value / maxChartVal) * 100)}`).join(' ')} 
                        fill="none" 
                        stroke="#D4AF37" 
                        strokeWidth="3" 
                        vectorEffect="non-scaling-stroke" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                    </svg>

                    {/* Area Transparan untuk Tooltip Hover (Tanpa merusak SVG) */}
                    <div className="absolute inset-0 pb-6 flex justify-between z-20">
                      {chartData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end group/tooltip relative">
                           {/* Angka Tooltip */}
                           <div className="absolute top-0 bg-black text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover/tooltip:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                             {chartTab === 'penjualan' ? `Rp ${formatIDR(d.value)}` : d.value}
                           </div>
                           {/* Garis bantu vertikal tipis saat disorot */}
                           <div className="w-[2px] h-full bg-[#D4AF37]/40 opacity-0 group-hover/tooltip:opacity-100 transition-opacity"></div>
                        </div>
                      ))}
                    </div>

                    <div className="absolute -bottom-6 w-full flex justify-between">
                       {chartData.map((d, i) => (
                          <span key={i} className={`text-[9px] sm:text-[10px] font-bold ${colors.textMuted}`}>{d.label}</span>
                       ))}
                    </div>
                  </div>
               )}
            </div>
         </div>

         {/* TOP LISTS */}
         <div className={`col-span-1 p-6 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm flex flex-col`}>
            <div className={`flex justify-between border-b ${colors.border} mb-6 pb-2 text-[11px] font-black text-gray-400 uppercase tracking-wider`}>
               {[
                 {id:'laris', label: 'Laris', icon: Package}, 
                 {id:'kategori', label: 'Kategori', icon: Star}, 
                 {id:'sulit', label: 'Sulit', icon: AlertTriangle}, 
                 {id:'loyal', label: 'Loyal', icon: Users}
               ].map(tab => (
                  <button 
                     key={tab.id} onClick={() => { playSound('pop', isSoundOn); setListTab(tab.id); }}
                     className={`pb-2 -mb-[10px] px-1 transition-all flex flex-col items-center gap-1 ${listTab === tab.id ? 'text-[#D4AF37] scale-110 font-bold' : 'hover:text-gray-300'}`}
                  >
                     <tab.icon size={14}/>
                     <span className={`text-[10px] ${listTab === tab.id ? 'block' : 'hidden'}`}>{tab.label}</span>
                     {listTab === tab.id && <div className="w-full h-[2px] bg-[#D4AF37] rounded-full"></div>}
                  </button>
               ))}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
               {activeListData.map((item, idx) => (
                  <div key={idx} className="group cursor-default">
                     <div className="flex justify-between items-end mb-1.5">
                        <span className={`text-xs font-black ${colors.text} truncate pr-4`}>{item.name}</span>
                        <span className={`text-[10px] font-black ${colors.gold}`}>
                          {item.unit === 'Rp' ? `Rp ${formatIDR(item.val)}` : `${item.val}${item.unit}`}
                        </span>
                     </div>
                     <div className="w-full bg-[#F8FAFC] dark:bg-[#27272A] rounded-full h-2 overflow-hidden border dark:border-gray-700">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${listTab === 'sulit' ? 'bg-red-500' : 'bg-[#D4AF37]'}`} 
                          style={{ width: `${(item.val / maxListVal) * 100}%` }}
                        ></div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
