import React from 'react';
import { formatIDR } from '../../utils/helpers';

export default function DonutChart({ data, colors }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let currentOffset = 0;
  
  return (
     <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
           <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke={colors.border} strokeWidth="3" />
           {data.map((d, i) => {
              if(d.value <= 0) return null;
              const percentage = d.value / total;
              const strokeDasharray = `${percentage * 100} ${100 - (percentage * 100)}`;
              const offset = 100 - currentOffset;
              currentOffset += percentage * 100;
              return (
                 <circle key={i} cx="18" cy="18" r="15.9155" fill="transparent" stroke={d.color} strokeWidth="4" strokeDasharray={strokeDasharray} strokeDashoffset={offset} title={`${d.label}: Rp ${formatIDR(d.value)}`} className="transition-all duration-1000 cursor-pointer hover:stroke-width-[5px] hover:opacity-80" />
              )
           })}
        </svg>
     </div>
  )
}