const fs = require('fs');
const path = require('path');

const prodFile = path.join(__dirname, 'src/pages/ProductManager.jsx');
let prodContent = fs.readFileSync(prodFile, 'utf8');

const oldInputs = `                 <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Beli (Modal) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.costStr !== undefined ? form.costStr : formatIDR(form.cost)} onChange={e => {
                    const newCost = parseIDR(e.target.value);
                    const currentPrice = form.price || 0;
                    const newMargin = newCost > 0 ? ((currentPrice - newCost) / newCost * 100) : 0;
                    setForm({...form, cost: newCost, costStr: smartFormatInput(e.target.value), margin: newMargin, marginStr: String(Number(newMargin.toFixed(2))).replace('.', ',')});
                 }} /></div>
                 <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Target Laba (%)</label><input type="text" inputMode="decimal" className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.marginStr !== undefined ? form.marginStr : (form.margin !== undefined ? String(Number(form.margin.toFixed(2))).replace('.', ',') : '')} onChange={e => {
                    const rawVal = e.target.value;
                    const newMargin = parseIDR(rawVal);
                    const currentCost = form.cost || 0;
                    const newPrice = Math.round(currentCost * (1 + newMargin / 100));
                    setForm({...form, margin: newMargin, marginStr: smartFormatInput(rawVal), price: newPrice, priceStr: formatIDR(newPrice)});
                 }} placeholder="Cth: 25" /></div>
                 <div className="md:col-span-2"><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Jual (Rp) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.priceStr !== undefined ? form.priceStr : formatIDR(form.price)} onChange={e => {
                    const newPrice = parseIDR(e.target.value);
                    const currentCost = form.cost || 0;
                    const newMargin = currentCost > 0 ? ((newPrice - currentCost) / currentCost * 100) : 0;
                    setForm({...form, price: newPrice, priceStr: smartFormatInput(e.target.value), margin: newMargin, marginStr: String(Number(newMargin.toFixed(2))).replace('.', ',')});
                 }} /></div>`;

const newInputs = `                 <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Beli (Modal) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.costStr !== undefined ? form.costStr : formatIDR(form.cost)} onChange={e => {
                    const newCost = parseIDR(e.target.value);
                    const currentPrice = form.price || 0;
                    const newMargin = newCost > 0 ? ((currentPrice - newCost) / newCost * 100) : 0;
                    setForm({...form, cost: newCost, costStr: smartFormatInput(e.target.value), margin: newMargin, marginStr: String(Number(newMargin.toFixed(2))).replace('.', ',')});
                 }} /></div>
                 <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Jual (Rp) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.priceStr !== undefined ? form.priceStr : formatIDR(form.price)} onChange={e => {
                    const newPrice = parseIDR(e.target.value);
                    const currentCost = form.cost || 0;
                    const newMargin = currentCost > 0 ? ((newPrice - currentCost) / currentCost * 100) : 0;
                    setForm({...form, price: newPrice, priceStr: smartFormatInput(e.target.value), margin: newMargin, marginStr: String(Number(newMargin.toFixed(2))).replace('.', ',')});
                 }} /></div>
                 <div className="md:col-span-2"><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Target Laba (%) - <span className="font-normal italic text-[10px]">Otomatis Terkalkulasi</span></label><input type="text" inputMode="decimal" className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 font-bold \${colors.text} border-[#D4AF37]/50\`} value={form.marginStr !== undefined ? form.marginStr : (form.margin !== undefined ? String(Number(form.margin.toFixed(2))).replace('.', ',') : '')} onChange={e => {
                    const rawVal = e.target.value;
                    const newMargin = parseIDR(rawVal);
                    const currentCost = form.cost || 0;
                    const newPrice = Math.round(currentCost * (1 + newMargin / 100));
                    setForm({...form, margin: newMargin, marginStr: smartFormatInput(rawVal), price: newPrice, priceStr: formatIDR(newPrice)});
                 }} placeholder="Cth: 25" /></div>`;

prodContent = prodContent.replace(oldInputs, newInputs);

fs.writeFileSync(prodFile, prodContent, 'utf8');
console.log('UI rearranged successfully');
