import React from 'react';

export default function KPICard({ title, value, icon: Icon, trend, compareText, colors, colorClass, onClick }) {
  return (
    <div onClick={onClick} className={`p-5 rounded-2xl shadow-sm border ${colors.border} ${colors.panel} flex flex-col justify-between hover:border-[#D4AF37] transition-colors group ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
           <p className={`text-sm font-semibold ${colors.textMuted}`}>{title}</p>
           <h3 className={`text-xl lg:text-2xl font-bold mt-1 ${colors.text} tracking-tight`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-opacity-10 group-hover:scale-110 transition-transform ${colorClass.replace('text-', 'bg-')} ${colorClass}`}>
           <Icon size={24} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className={`${trend.startsWith('+') ? 'text-green-500 bg-green-50 dark:bg-green-900/30' : 'text-red-500 bg-red-50 dark:bg-red-900/30'} px-2 py-0.5 rounded`}>{trend}</span>
        <span className={colors.textMuted}>{compareText}</span>
      </div>
    </div>
  );
}