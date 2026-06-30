import React from 'react';
import { formatIDR } from '../../utils/helpers'; // Import dari fungsi helper yang tadi dibuat

export default function SimpleChart({ chartData, chartType, theme, colors, heightClass="h-48", chartMode="line", labels=[], accentColor="#D4AF37" }) {
  const generatePoints = () => {
    if(chartData.length === 0) return '';
    if(chartData.length === 1) return `50,50`;
    
    const values = chartData.map(d => d.value);
    const maxVal = Math.max(...values, 1);
    
    return chartData.map((d, i) => {
       const x = (i / (chartData.length - 1)) * 100;
       const y = 100 - ((d.value / maxVal) * 100);
       return `${x},${y}`;
    }).join(' ');
  };

  const isCustomer = chartType === 'Customer Aktif';
  const colorToUse = isCustomer ? '#fb923c' : accentColor;

  return (
   <div className="w-full overflow-x-auto custom-scrollbar pb-2">
    <div className={`flex flex-col relative w-full ${heightClass} pt-2`} style={{ minWidth: chartData.length > 12 ? `${chartData.length * 40}px` : '100%' }}>
       
       <div className="flex-1 relative w-full overflow-hidden rounded-md">
         {chartMode === 'line' ? (
           <>
             <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                   <linearGradient id={`lineGradSimple-${colorToUse.replace('#','')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={colorToUse} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={colorToUse} stopOpacity="0" />
                   </linearGradient>
                </defs>
                <polygon 
                   points={`0,100 ${generatePoints()} 100,100`} 
                   fill={`url(#lineGradSimple-${colorToUse.replace('#','')})`} 
                />
                <polyline 
                   points={generatePoints()} 
                   fill="none" 
                   stroke={colorToUse} 
                   strokeWidth="3" 
                   vectorEffect="non-scaling-stroke" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                />
             </svg>
             <div className="absolute inset-0 flex justify-between">
                {chartData.map((data, i) => (
                  <div key={i} className="flex-1 h-full relative group hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-crosshair">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 bg-black text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg -mt-10">
                       {chartType !== 'Transaksi' && !isCustomer ? 'Rp ' : ''}{formatIDR(data.value)}
                    </div>
                  </div>
                ))}
             </div>
           </>
         ) : (
           <div className={`flex items-end justify-between w-full h-full gap-1 pt-4`}>
             {chartData.map((d, i) => {
                const maxVal = Math.max(...chartData.map(cd => cd.value), 1);
                const h = Math.max(5, (d.value / maxVal) * 100);
                return (
                   <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end">
                      <div className="absolute top-1/2 transform -translate-y-1/2 bg-black text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-20 pointer-events-none">
                         {chartType !== 'Transaksi' && !isCustomer ? 'Rp ' : ''}{formatIDR(d.value)}
                      </div>
                      <div className="w-full max-w-[40px] rounded-t-sm opacity-80 group-hover:opacity-100 transition-all relative min-h-[4px]" style={{ height: `${h}%`, backgroundColor: colorToUse }}>
                         <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                   </div>
                )
             })}
           </div>
         )}
       </div>
       
       {labels.length > 0 && (
          <div className={`flex justify-between text-[9px] sm:text-[10px] font-medium ${colors.textMuted} pt-2 px-1 shrink-0`}>
              {labels.map((l, i) => <div key={i} className="flex-1 text-center truncate px-0.5">{l}</div>)}
          </div>
       )}

    </div>
   </div>
  )
}