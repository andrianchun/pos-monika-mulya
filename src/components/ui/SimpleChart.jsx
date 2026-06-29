import React from 'react';
import { formatIDR } from '../../utils/helpers'; // Import dari fungsi helper yang tadi dibuat

export default function SimpleChart({ chartData, chartType, theme, colors, heightClass="h-48", chartMode="line", labels=[] }) {
  const generateLinePath = () => {
    if(chartData.length === 0) return '';
    if(chartData.length === 1) return `M 50,50`;
    
    const values = chartData.map(d => d.value);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values);
    const range = maxVal - minVal;
    
    const points = chartData.map((d, i) => {
      const x = 2 + (i / (chartData.length - 1)) * 96;
      const norm = range === 0 ? 0.5 : (d.value - minVal) / range;
      const y = 95 - (norm * 90);
      return `${x},${y}`;
    }).join(' L ');
    return `M ${points}`;
  };

  if(chartMode === 'bar') {
     return (
        <div className={`flex flex-col w-full relative ${heightClass} pt-4`}>
           <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 z-10 w-full relative">
             {chartData.map((data, i) => (
               <div key={i} className="w-full flex flex-col justify-end group h-full relative">
                 <div className={`w-full rounded-t-sm transition-all duration-700 ${chartType === 'Customer Aktif' ? 'bg-orange-400' : colors.goldBg} opacity-90 hover:opacity-100`} style={{ height: `${Math.max(2, data.percentage)}%` }}></div>
                 <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg">
                   {chartType !== 'Transaksi' && chartType !== 'Customer Aktif' ? 'Rp ' : ''}{formatIDR(data.value)}
                 </div>
               </div>
             ))}
           </div>
           {labels.length > 0 && (
              <div className={`flex justify-between text-[9px] sm:text-[10px] font-medium ${colors.textMuted} pt-1 px-1 shrink-0`}>
                  {labels.map((l, i) => <div key={i} className="flex-1 text-center truncate px-0.5">{l}</div>)}
              </div>
           )}
           </div>
     );
  }

  return (
   <div className="w-full overflow-x-auto custom-scrollbar pb-2">
    <div className={`flex flex-col relative w-full ${heightClass} pt-2`} style={{ minWidth: chartData.length > 12 ? `${chartData.length * 40}px` : '100%' }}>
       <div className="flex-1 relative w-full overflow-hidden rounded-md">
         <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d={generateLinePath()} fill="none" stroke={chartType === 'Customer Aktif' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(212, 175, 55, 0.2)'} strokeWidth="1" className="transition-all duration-700 blur-sm transform translate-y-0.5" />
            <path d={generateLinePath()} fill="none" stroke={chartType === 'Customer Aktif' ? '#fb923c' : '#D4AF37'} strokeWidth="0.5" strokeLinejoin="round" className="transition-all duration-700" />
         </svg>
         <div className="absolute inset-0 flex justify-between">
            {chartData.map((data, i) => (
              <div key={i} className="flex-1 h-full relative group hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-crosshair">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 bg-black text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg -mt-10">
                   {chartType !== 'Transaksi' && chartType !== 'Customer Aktif' ? 'Rp ' : ''}{formatIDR(data.value)}
                </div>
              </div>
            ))}
         </div>
       </div>
       {labels.length > 0 && (
          <div className={`flex justify-between text-[9px] sm:text-[10px] font-medium ${colors.textMuted} pt-1 px-1 shrink-0`}>
              {labels.map((l, i) => <div key={i} className="flex-1 text-center truncate px-0.5">{l}</div>)}
          </div>
       )}
    </div>
   </div>
  )
}