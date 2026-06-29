import React, { useState, useMemo } from 'react';
import { TrendingUp, BarChart2, ShoppingCart, Users, ChevronDown, Activity, Package, Star, AlertTriangle, Wallet } from 'lucide-react';
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
    semua: 'Semua'
  };

  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.date);
      if (timeRange === 'hari') return d.toDateString() === now.toDateString();
      if (timeRange === 'minggu') {
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 6);
        weekAgo.setHours(0,0,0,0);
        return d >= weekAgo;
      }
      if (timeRange === 'bulan') {
        const monthAgo = new Date(); monthAgo.setDate(now.getDate() - 29);
        monthAgo.setHours(0,0,0,0);
        return d >= monthAgo;
      }
      if (timeRange === 'tahun') {
        const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        yearAgo.setHours(0,0,0,0);
        return d >= yearAgo;
      }
      if (timeRange === 'semua') return true; 
      return true; 
    });
  }, [sales, timeRange]);

  const stats = useMemo(() => {
    const totalPenjualan = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalHPP = filteredSales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + ((item.cost || 0) * item.qty), 0), 0);
    const totalLaba = totalPenjualan - totalHPP;
    const totalTransaksi = filteredSales.length;
    const uniqueCusts = new Set(filteredSales.map(s => s.customer).filter(c => c && c !== '(anonim)' && c !== '-')).size;
    
    const now = new Date();
    const prevSales = sales.filter(s => {
      const d = new Date(s.date);
      if (timeRange === 'hari') {
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        return d.toDateString() === yesterday.toDateString();
      }
      if (timeRange === 'minggu') {
        const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 13);
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6);
        twoWeeksAgo.setHours(0,0,0,0); weekAgo.setHours(0,0,0,0);
        return d >= twoWeeksAgo && d < weekAgo;
      }
      if (timeRange === 'bulan') {
        const twoMonthsAgo = new Date(now); twoMonthsAgo.setDate(now.getDate() - 59);
        const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 29);
        twoMonthsAgo.setHours(0,0,0,0); monthAgo.setHours(0,0,0,0);
        return d >= twoMonthsAgo && d < monthAgo;
      }
      if (timeRange === 'tahun') {
        const twoYearsAgo = new Date(now.getFullYear(), now.getMonth() - 23, 1);
        const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        twoYearsAgo.setHours(0,0,0,0); yearAgo.setHours(0,0,0,0);
        return d >= twoYearsAgo && d < yearAgo;
      }
      return false; 
    });

    const prevPenjualan = prevSales.reduce((sum, s) => sum + s.total, 0);
    const prevHPP = prevSales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + ((item.cost || 0) * item.qty), 0), 0);
    const prevLaba = prevPenjualan - prevHPP;
    const prevTransaksi = prevSales.length;
    const prevUniqueCusts = new Set(prevSales.map(s => s.customer).filter(c => c && c !== '(anonim)' && c !== '-')).size;

    const calcTrend = (curr, prev) => {
      if (timeRange === 'semua') return null;
      if (prev === 0 && curr > 0) return 100;
      if (prev === 0 && curr === 0) return 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      totalPenjualan: totalPenjualan || 0,
      totalLaba: totalLaba || 0,
      totalTransaksi: totalTransaksi || 0,
      uniqueCusts: uniqueCusts || 0,
      trends: {
        penjualan: calcTrend(totalPenjualan, prevPenjualan),
        laba: calcTrend(totalLaba, prevLaba),
        transaksi: calcTrend(totalTransaksi, prevTransaksi),
        customer: calcTrend(uniqueCusts, prevUniqueCusts)
      }
    };
  }, [filteredSales, sales, timeRange]);

  const chartData = useMemo(() => {
    let dataMap = {};
    let labels = [];

    if (timeRange === 'hari') {
      const hourMap = {};
      filteredSales.forEach(s => {
        const h = new Date(s.date).getHours();
        const hLabel = `${String(h).padStart(2, '0')}:00`;
        if (!hourMap[hLabel]) hourMap[hLabel] = { penjualan: 0, transaksi: 0, customer: new Set() };
        hourMap[hLabel].penjualan += s.total;
        hourMap[hLabel].transaksi += 1;
        if(s.customer) hourMap[hLabel].customer.add(s.customer);
      });
      
      labels = Object.keys(hourMap).sort();
      if (labels.length === 0) labels = ['08:00', '12:00', '16:00', '20:00']; 
      dataMap = hourMap;
      
    } else if (timeRange === 'minggu') {
      labels = [];
      const tempMap = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const name = dayNames[d.getDay()];
        labels.push(name);
        tempMap[name] = { penjualan: 0, transaksi: 0, customer: new Set() };
      }
      filteredSales.forEach(s => {
        const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(s.date).getDay()];
        if (tempMap[dayName]) {
          tempMap[dayName].penjualan += s.total;
          tempMap[dayName].transaksi += 1;
          if(s.customer) tempMap[dayName].customer.add(s.customer);
        }
      });
      dataMap = tempMap;
    } else if (timeRange === 'bulan') {
      labels = [];
      const tempMap = {};
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        let displayLabel = String(d.getDate());
        if (d.getDate() === 1 || i === 29) {
           displayLabel = `${d.getDate()} ${monthNames[d.getMonth()]}`;
        }
        labels.push({ key, display: displayLabel });
        tempMap[key] = { penjualan: 0, transaksi: 0, customer: new Set() };
      }
      filteredSales.forEach(s => {
        const d = new Date(s.date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (tempMap[key]) {
           tempMap[key].penjualan += s.total;
           tempMap[key].transaksi += 1;
           if(s.customer) tempMap[key].customer.add(s.customer);
        }
      });
      dataMap = tempMap;
    } else if (timeRange === 'tahun') {
      labels = [];
      const tempMap = {};
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const name = monthNames[d.getMonth()];
        labels.push(name);
        tempMap[name] = { penjualan: 0, transaksi: 0, customer: new Set() };
      }
      filteredSales.forEach(s => {
        const name = monthNames[new Date(s.date).getMonth()];
        if (tempMap[name]) {
          tempMap[name].penjualan += s.total;
          tempMap[name].transaksi += 1;
          if(s.customer) tempMap[name].customer.add(s.customer);
        }
      });
      dataMap = tempMap;
    } else if (timeRange === 'semua') {
      filteredSales.forEach(s => {
        const year = new Date(s.date).getFullYear().toString();
        if (!labels.includes(year)) labels.push(year);
        if (!dataMap[year]) dataMap[year] = { penjualan: 0, transaksi: 0, customer: new Set() };
        dataMap[year].penjualan += s.total;
        dataMap[year].transaksi += 1;
        if(s.customer) dataMap[year].customer.add(s.customer);
      });
      labels.sort();
    }

    let finalData = labels.map(labelItem => {
      const isObj = typeof labelItem === 'object';
      const key = isObj ? labelItem.key : labelItem;
      const display = isObj ? labelItem.display : labelItem;
      
      const d = dataMap[key] || { penjualan: 0, transaksi: 0, customer: new Set() };
      let value = 0;
      if (chartTab === 'penjualan') value = d.penjualan;
      if (chartTab === 'transaksi') value = d.transaksi;
      if (chartTab === 'customer') value = d.customer.size;
      return { label: display, value };
    });
    

    return finalData.filter(d => d.value > 0);
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
      if (s.customer && s.customer !== '(anonim)' && s.customer !== '-') {
        custMap[s.customer] = (custMap[s.customer] || 0) + 1;
      }
    });

    let laris = Object.entries(prodMap).map(([name, qty]) => ({ name, val: qty, unit: 'x' })).sort((a,b) => b.val - a.val).slice(0, 5);
    let kategori = Object.entries(catMap).map(([name, qty]) => ({ name, val: qty, unit: ' item' })).sort((a,b) => b.val - a.val).slice(0, 5);
    let sulit = products.map(p => ({ name: p.name, val: prodMap[p.name] || 0, unit: ' terjual' })).sort((a,b) => a.val - b.val).slice(0, 10);
    
    let loyal = [];
    if (customers && customers.length > 0) {
      loyal = customers
        .filter(c => c.name !== '(anonim)' && c.name !== '-')
        .map(c => ({ 
           name: c.name, 
           val: (c.points !== undefined && c.points !== null) ? Number(c.points) : 0, 
           unit: ' Poin' 
        }))
        .sort((a,b) => b.val - a.val)
        .slice(0, 5);
    } else {
      loyal = Object.entries(custMap).map(([name, count]) => ({ name, val: count, unit: ' Trx' })).sort((a,b) => b.val - a.val).slice(0, 5);
    }

    return { laris, kategori, loyal, sulit };
  }, [filteredSales, products, customers]);

  const activeListData = rankingLists[listTab] || [];
  const maxListVal = Math.max(...activeListData.map(d => d.val), 1);

  const getTrendBadge = (val) => {
      if (val === null) return { text: '-', color: 'text-gray-500', bg: 'bg-gray-500/10' };
      const formatted = val % 1 === 0 ? val : val.toFixed(1);
      if (val > 0) return { text: `+${formatted}%`, color: 'text-emerald-600 dark:text-emerald-500/90', bg: 'bg-emerald-500/10' };
      if (val < 0) return { text: `${formatted}%`, color: 'text-rose-600 dark:text-rose-500/90', bg: 'bg-rose-500/10' };
      return { text: `0%`, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    };

    const kpiData = [
      { title: 'Total Penjualan', value: `Rp ${formatIDR(stats.totalPenjualan)}`, trend: getTrendBadge(stats.trends.penjualan), icon: TrendingUp },
      { title: 'Total Laba', value: `Rp ${formatIDR(stats.totalLaba)}`, trend: getTrendBadge(stats.trends.laba), icon: Wallet },
      { title: 'Total Transaksi', value: stats.totalTransaksi, trend: getTrendBadge(stats.trends.transaksi), icon: ShoppingCart },
      { title: 'Konsumen Aktif', value: `${stats.uniqueCusts} Orang`, trend: getTrendBadge(stats.trends.customer), icon: Users }
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
          <div key={idx} className={`relative overflow-hidden p-5 rounded-2xl border ${colors.border} ${colors.panel} shadow-sm group hover:border-[#D4AF37] transition-colors`}>
            <div className="flex justify-between items-start mb-2">
               <div>
                 <p className={`text-xs font-bold ${colors.textMuted} mb-1 opacity-70`}>{kpi.title}</p>
                 <h3 className={`text-xl sm:text-2xl font-black ${colors.text}`}>{kpi.value}</h3>
               </div>
               <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 group-hover:scale-110 transition-all pointer-events-none">
                   <kpi.icon size={100} className={colors.text} />
                 </div>
            </div>
            {stats.totalPenjualan > 0 && (
               <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
                  <span className={`${kpi.trend.bg} ${kpi.trend.color} px-2 py-0.5 rounded`}>{kpi.trend.text}</span>
                  <span className={colors.textMuted}>
                    {timeRange === 'hari' ? 'dibanding kemarin' :
                     timeRange === 'minggu' ? 'dibanding minggu lalu' :
                     timeRange === 'bulan' ? 'dibanding bulan lalu' :
                     timeRange === 'tahun' ? 'dibanding tahun lalu' :
                     'sepanjang waktu'}
                  </span>
               </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
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
                     className={`px-5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${chartTab === tab.toLowerCase().replace(' aktif', '') ? `bg-[#D4AF37] text-[#18181B] shadow-lg` : `${colors.creamBg} border ${colors.border} ${colors.textMuted} hover:opacity-80`}`}
                  >
                     {tab}
                  </button>
               ))}
            </div>

            <div className="relative flex-1 min-h-[250px] w-full flex flex-col justify-end pt-4">
               <div className="absolute inset-0 flex flex-col justify-between z-0 pb-6 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-full border-t border-dashed border-gray-200 dark:border-gray-800 flex-[0_0_auto]"></div>
                  ))}
               </div>

               {chartType === 'bar' ? (
                  <div className="w-full h-[220px] flex items-end justify-between gap-1 sm:gap-3 relative z-10 pb-6">
                    {chartData.map((d, i) => {
                      const h = (d.value / maxChartVal) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                          <div className="w-full max-w-[40px] bg-[#D4AF37] rounded-t-sm opacity-80 group-hover:opacity-100 transition-all cursor-pointer relative min-h-[4px]" style={{ height: `${h || 0}%` }}>
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
                      
                      <polygon 
                        points={`0,100 ${chartData.map((d, i) => d.value > 0 ? `${(i / (chartData.length - 1 || 1)) * 100},${100 - ((d.value / maxChartVal) * 100)}` : '').filter(Boolean).join(' ')} 100,100`} 
                        fill="url(#lineGrad)" 
                      />
                      
                      <polyline 
                        points={chartData.map((d, i) => d.value > 0 ? `${(i / (chartData.length - 1 || 1)) * 100},${100 - ((d.value / maxChartVal) * 100)}` : '').filter(Boolean).join(' ')} 
                        fill="none" 
                        stroke="#D4AF37" 
                        strokeWidth="3" 
                        vectorEffect="non-scaling-stroke" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                    </svg>

                    <div className="absolute inset-0 pb-6 flex justify-between z-20">
                      {chartData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end group/tooltip relative">
                           <div className="absolute top-0 bg-black text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover/tooltip:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                             {chartTab === 'penjualan' ? `Rp ${formatIDR(d.value)}` : d.value}
                           </div>
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
                     className={`pb-2 -mb-[10px] px-1 transition-all flex flex-col items-center gap-1 ${listTab === tab.id ? 'text-[#D4AF37] scale-110 font-bold' : `${colors.textMuted} hover:opacity-80`}`}
                  >
                     <tab.icon size={14}/>
                     <span className={`text-[10px] ${listTab === tab.id ? 'block' : 'hidden'}`}>{tab.label}</span>
                     {listTab === tab.id && <div className="w-full h-[2px] bg-[#D4AF37] rounded-full"></div>}
                  </button>
               ))}
            </div>

            {listTab === 'kategori' && (
              <div className="flex flex-col items-center justify-center h-full pb-4 flex-1 overflow-y-auto">
                {activeListData.length > 0 ? (
                  <>
                    <div 
                      className="w-32 h-32 rounded-full mb-6 shadow-sm border border-gray-200 dark:border-gray-700" 
                      style={{
                        background: `conic-gradient(${
                          activeListData.map((item, i, arr) => {
                            const total = arr.reduce((acc, curr) => acc + curr.val, 0);
                            const percent = (item.val / total) * 100;
                            const prevPercent = arr.slice(0, i).reduce((acc, curr) => acc + (curr.val / total) * 100, 0);
                            const palette = ['#D4AF37', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'];
                            return `${palette[i % palette.length]} ${prevPercent}% ${prevPercent + percent}%`;
                          }).join(', ')
                        })`
                      }}
                    ></div>
                    <div className="w-full grid grid-cols-2 gap-3 text-[10px]">
                        {activeListData.map((item, i) => {
                          const palette = ['#D4AF37', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'];
                          const total = activeListData.reduce((acc, curr) => acc + curr.val, 0);
                          const percent = ((item.val / total) * 100).toFixed(1);
                          return (
                            <div key={i} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette[i % palette.length] }}></div>
                              <span className={`truncate font-bold ${colors.text}`}>{item.name} ({percent}%)</span>
                            </div>
                          )
                        })}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-gray-500 font-bold mt-10">Belum ada data kategori terjual.</span>
                )}
              </div>
            )}

            {listTab === 'sulit' && (
              <div className="grid grid-cols-2 gap-3 h-full pb-2 content-start flex-1 overflow-y-auto custom-scrollbar pr-1">
                {activeListData.length > 0 ? activeListData.map((item, idx) => (
                    <div key={idx} className={`p-2 rounded-xl border border-red-500/20 bg-red-500/5 group cursor-default flex flex-col justify-center shadow-sm`}>
                      <span className={`text-[10px] font-black ${colors.text} truncate mb-1`}>{item.name}</span>
                      <span className={`text-[10px] font-bold text-red-500`}>
                        {item.val} {item.unit}
                      </span>
                    </div>
                )) : <span className="text-xs text-gray-500 col-span-2 text-center mt-10 font-bold">Belum ada data penjualan.</span>}
              </div>
            )}

            {listTab !== 'kategori' && listTab !== 'sulit' && (
              <div className="flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
                {activeListData.length > 0 ? activeListData.map((item, idx) => (
                    <div key={idx} className="group cursor-default">
                      <div className="flex justify-between items-end mb-1.5">
                          <span className={`text-xs font-black ${colors.text} truncate pr-4`}>{item.name}</span>
                          <span className={`text-[10px] font-black text-[#D4AF37]`}>
                            {item.unit === 'Rp' ? `Rp ${formatIDR(item.val)}` : `${item.val}${item.unit}`}
                          </span>
                      </div>
                      <div className={`w-full ${colors.creamBg} rounded-full h-2 overflow-hidden border ${colors.border}`}>
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out bg-[#D4AF37]" 
                            style={{ width: `${(item.val / maxListVal) * 100}%` }}
                          ></div>
                      </div>
                    </div>
                )) : <span className="text-xs text-gray-500 block text-center mt-10 font-bold">Belum ada data di periode ini.</span>}
              </div>
            )}
         </div>
      </div>
    </div>
  );
}