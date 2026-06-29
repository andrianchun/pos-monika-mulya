const fs = require('fs');
const path = require('path');

const prodFile = path.join(__dirname, 'src/pages/ProductManager.jsx');
let prodContent = fs.readFileSync(prodFile, 'utf8');

// 1. Update defaultForm
prodContent = prodContent.replace(
  `const defaultForm = { barcode: '', name: '', category: sortedCats[0] || 'Lainnya', unit: sortedUnits[0] || 'Pcs', stock: 0, minStock: 5, cost: 0, price: 0, img: 'dY"' };`,
  `const defaultForm = { barcode: '', name: '', category: sortedCats[0] || 'Lainnya', unit: sortedUnits[0] || 'Pcs', stock: 0, minStock: 5, cost: 0, price: 0, margin: 0, marginStr: '0', img: 'dY"' };`
);

// 2. Update handleEdit
const oldHandleEdit = `    const handleEdit = (prod) => {
      playSound('pop', isSoundOn);
      setEditingId(prod.id);
      setForm({ barcode: prod.barcode || '', name: prod.name, category: prod.category, unit: prod.unit, stock: prod.stock, minStock: prod.minStock !== undefined ? prod.minStock : 5, cost: prod.cost, price: prod.price, img: prod.img });
      setIsModalOpen(true);
    };`;

const newHandleEdit = `    const handleEdit = (prod) => {
      playSound('pop', isSoundOn);
      setEditingId(prod.id);
      const mCost = prod.cost || 0;
      const mPrice = prod.price || 0;
      const initialMargin = mCost > 0 ? ((mPrice - mCost) / mCost * 100) : 0;
      setForm({ barcode: prod.barcode || '', name: prod.name, category: prod.category, unit: prod.unit, stock: prod.stock, minStock: prod.minStock !== undefined ? prod.minStock : 5, cost: mCost, price: mPrice, margin: initialMargin, marginStr: String(Number(initialMargin.toFixed(2))).replace('.', ','), img: prod.img });
      setIsModalOpen(true);
    };`;
prodContent = prodContent.replace(oldHandleEdit, newHandleEdit);


// 3. Update Form UI inputs
const oldInputs = `                 <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Beli (Modal) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.costStr !== undefined ? form.costStr : formatIDR(form.cost)} onChange={e => setForm({...form, cost: parseIDR(e.target.value), costStr: smartFormatInput(e.target.value)})} /></div>
                 <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Jual (Rp) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.priceStr !== undefined ? form.priceStr : formatIDR(form.price)} onChange={e => setForm({...form, price: parseIDR(e.target.value), priceStr: smartFormatInput(e.target.value)})} /></div>`;

const newInputs = `                 <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Beli (Modal) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.costStr !== undefined ? form.costStr : formatIDR(form.cost)} onChange={e => {
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
prodContent = prodContent.replace(oldInputs, newInputs);

fs.writeFileSync(prodFile, prodContent, 'utf8');
console.log('Margin logic added successfully.');
