const fs = require('fs');
const path = require('path');

const headerFile = path.join(__dirname, 'src/components/Header.jsx');
let headerContent = fs.readFileSync(headerFile, 'utf8');

// 1. Piutang Pelanggan
const oldPiutang = `                                  <div key={\`rec-\${s.id}\`} className={\`p-3 rounded-xl \${isLate ? 'bg-red-500/5 border-red-500/20' : 'bg-blue-500/5 border-blue-500/20'} border flex gap-2 min-w-0 shadow-sm\`}>
                                     <Calendar size={16} className={\`\${isLate ? 'text-red-500' : 'text-blue-500'} shrink-0 mt-0.5\`} />
                                     <div className="min-w-0 flex-1">
                                        <p className={\`text-xs font-bold \${colors.text} truncate\`}>Piutang Pelanggan: {s.customer}</p>
                                        <p className={\`text-[10px] \${colors.textMuted}\`}>Nota: {s.nota}</p>
                                        <div className="flex justify-between items-center mt-1">
                                           <p className={\`text-[10px] font-bold \${isLate ? 'text-red-500' : 'text-blue-500'}\`}>Tagihan: Rp {formatIDR(s.total - s.paid)}</p>
                                           <p className={\`text-[10px] font-black px-2 py-0.5 rounded \${isLate ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}\`}>`;

const newPiutang = `                                  <div key={\`rec-\${s.id}\`} className={\`p-3 rounded-xl \${isLate ? 'bg-red-500/5 border-red-500/20' : \`\${colors.creamBg} \${colors.border}\`} border flex gap-2 min-w-0 shadow-sm\`}>
                                     <Calendar size={16} className={\`\${isLate ? 'text-red-500' : 'text-[#D4AF37]'} shrink-0 mt-0.5\`} />
                                     <div className="min-w-0 flex-1">
                                        <p className={\`text-xs font-bold \${colors.text} truncate\`}>Piutang Pelanggan: {s.customer}</p>
                                        <p className={\`text-[10px] \${colors.textMuted}\`}>Nota: {s.nota}</p>
                                        <div className="flex justify-between items-center mt-1">
                                           <p className={\`text-[10px] font-bold \${isLate ? 'text-red-500' : 'text-[#D4AF37]'}\`}>Tagihan: Rp {formatIDR(s.total - s.paid)}</p>
                                           <p className={\`text-[10px] font-black px-2 py-0.5 rounded \${isLate ? 'bg-red-500/10 text-red-500' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}\`}>`;
headerContent = headerContent.replace(oldPiutang, newPiutang);

// 2. Utang Toko
const oldUtang = `                                  <div key={\`debt-\${p.id}\`} className={\`p-3 rounded-xl \${isLate ? 'bg-red-500/5 border-red-500/20' : 'bg-purple-500/5 border-purple-500/20'} border flex gap-2 min-w-0 shadow-sm\`}>
                                     <Calendar size={16} className={\`\${isLate ? 'text-red-500' : 'text-purple-500'} shrink-0 mt-0.5\`} />
                                     <div className="min-w-0 flex-1">
                                        <p className={\`text-xs font-bold \${colors.text} truncate\`}>Utang Toko ke: {p.supplier}</p>
                                        <p className={\`text-[10px] \${colors.textMuted}\`}>Nota: {p.nota}</p>
                                        <div className="flex justify-between items-center mt-1">
                                           <p className={\`text-[10px] font-bold \${isLate ? 'text-red-500' : 'text-purple-500'}\`}>Kurang Bayar: Rp {formatIDR(p.total - p.paid)}</p>
                                           <p className={\`text-[10px] font-black px-2 py-0.5 rounded \${isLate ? 'bg-red-500/10 text-red-500' : 'bg-purple-500/10 text-purple-500'}\`}>`;

const newUtang = `                                  <div key={\`debt-\${p.id}\`} className={\`p-3 rounded-xl \${isLate ? 'bg-red-500/5 border-red-500/20' : \`\${colors.creamBg} \${colors.border}\`} border flex gap-2 min-w-0 shadow-sm\`}>
                                     <Calendar size={16} className={\`\${isLate ? 'text-red-500' : 'text-[#D4AF37]'} shrink-0 mt-0.5\`} />
                                     <div className="min-w-0 flex-1">
                                        <p className={\`text-xs font-bold \${colors.text} truncate\`}>Utang Toko ke: {p.supplier}</p>
                                        <p className={\`text-[10px] \${colors.textMuted}\`}>Nota: {p.nota}</p>
                                        <div className="flex justify-between items-center mt-1">
                                           <p className={\`text-[10px] font-bold \${isLate ? 'text-red-500' : 'text-[#D4AF37]'}\`}>Kurang Bayar: Rp {formatIDR(p.total - p.paid)}</p>
                                           <p className={\`text-[10px] font-black px-2 py-0.5 rounded \${isLate ? 'bg-red-500/10 text-red-500' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}\`}>`;
headerContent = headerContent.replace(oldUtang, newUtang);

// 3. Barang Habis
const oldStok = `                               <div key={\`stock-\${idx}\`} className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 flex flex-col gap-2 shadow-sm">
                                  <div className="flex justify-between items-center border-b border-orange-500/20 pb-2">
                                     <div className="flex items-center gap-2 min-w-0">
                                        <Package size={16} className="text-orange-500 shrink-0" />
                                        <span className={\`text-xs font-bold \${colors.text} truncate\`}>Order ke: {group.supplier.name}</span>
                                     </div>
                                     <button onClick={() => handleSendBulkSupplierWA(group)} className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 text-[10px] font-bold shadow-sm shrink-0">
                                        <Send size={12}/> Pesan Semua
                                     </button>
                                  </div>`;

const newStok = `                               <div key={\`stock-\${idx}\`} className={\`p-3 rounded-xl \${colors.creamBg} \${colors.border} border flex flex-col gap-2 shadow-sm\`}>
                                  <div className={\`flex justify-between items-center border-b \${colors.border} pb-2\`}>
                                     <div className="flex items-center gap-2 min-w-0">
                                        <Package size={16} className="text-[#D4AF37] shrink-0" />
                                        <span className={\`text-xs font-bold \${colors.text} truncate\`}>Order ke: {group.supplier.name}</span>
                                     </div>
                                     <button onClick={() => handleSendBulkSupplierWA(group)} className={\`px-3 py-1.5 \${colors.goldBg} text-[#18181B] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 text-[10px] font-bold shadow-sm shrink-0\`}>
                                        <Send size={12}/> Pesan
                                     </button>
                                  </div>`;
headerContent = headerContent.replace(oldStok, newStok);

// 4. Barang Kedaluwarsa
const oldExp = `                                  <div key={\`exp-\${item.id}\`} className={\`p-3 rounded-xl \${isExpired ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'} border flex gap-2 min-w-0 shadow-sm\`}>
                                     <AlertTriangle size={16} className={\`\${isExpired ? 'text-red-500' : 'text-yellow-500'} shrink-0 mt-0.5\`} />
                                     <div className="min-w-0">
                                        <p className={\`text-xs font-bold \${colors.text} truncate\`}>{item.name}</p>
                                        <p className={\`text-[10px] font-black uppercase \${isExpired ? 'text-red-500' : 'text-yellow-600'}\`}>`;

const newExp = `                                  <div key={\`exp-\${item.id}\`} className={\`p-3 rounded-xl \${isExpired ? 'bg-red-500/5 border-red-500/20' : \`\${colors.creamBg} \${colors.border}\`} border flex gap-2 min-w-0 shadow-sm\`}>
                                     <AlertTriangle size={16} className={\`\${isExpired ? 'text-red-500' : 'text-[#D4AF37]'} shrink-0 mt-0.5\`} />
                                     <div className="min-w-0">
                                        <p className={\`text-xs font-bold \${colors.text} truncate\`}>{item.name}</p>
                                        <p className={\`text-[10px] font-black uppercase \${isExpired ? 'text-red-500' : 'text-[#D4AF37]'}\`}>`;
headerContent = headerContent.replace(oldExp, newExp);

fs.writeFileSync(headerFile, headerContent, 'utf8');
console.log('Notification colors updated successfully');
