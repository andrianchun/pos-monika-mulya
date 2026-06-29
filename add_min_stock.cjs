const fs = require('fs');
const path = require('path');

// 1. Update Header.jsx
const headFile = path.join(__dirname, 'src/components/Header.jsx');
let headContent = fs.readFileSync(headFile, 'utf8');

headContent = headContent.replace(
  `const lowStockItems = useMemo(() => products.filter(p => Number(p.stock) <= 5), [products]);`,
  `const lowStockItems = useMemo(() => products.filter(p => Number(p.stock) <= (p.minStock !== undefined && p.minStock !== null && p.minStock !== '' ? Number(p.minStock) : 5)), [products]);`
);
fs.writeFileSync(headFile, headContent, 'utf8');


// 2. Update ProductManager.jsx
const prodFile = path.join(__dirname, 'src/pages/ProductManager.jsx');
let prodContent = fs.readFileSync(prodFile, 'utf8');

// Update defaultForm
prodContent = prodContent.replace(
  `const defaultForm = { barcode: '', name: '', category: sortedCats[0] || 'Lainnya', unit: sortedUnits[0] || 'Pcs', stock: 0, cost: 0, price: 0, img: 'dY"' };`,
  `const defaultForm = { barcode: '', name: '', category: sortedCats[0] || 'Lainnya', unit: sortedUnits[0] || 'Pcs', stock: 0, minStock: 5, cost: 0, price: 0, img: 'dY"' };`
);

// Update handleEdit
prodContent = prodContent.replace(
  `setForm({ barcode: prod.barcode || '', name: prod.name, category: prod.category, unit: prod.unit, stock: prod.stock, cost: prod.cost, price: prod.price, img: prod.img });`,
  `setForm({ barcode: prod.barcode || '', name: prod.name, category: prod.category, unit: prod.unit, stock: prod.stock, minStock: prod.minStock !== undefined ? prod.minStock : 5, cost: prod.cost, price: prod.price, img: prod.img });`
);

// Add input to form UI
const oldStockUI = `                   <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Stok Saat Ini *</label><input type="text" inputMode="decimal" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.stockStr !== undefined ? form.stockStr : (form.stock ? String(form.stock).replace('.', ',') : '')} onChange={e => setForm({...form, stock: parseIDR(e.target.value), stockStr: smartFormatInput(e.target.value)})} /></div>
                   <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Beli / Modal (Rp) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.costStr !== undefined ? form.costStr : formatIDR(form.cost)} onChange={e => setForm({...form, cost: parseIDR(e.target.value), costStr: smartFormatInput(e.target.value)})} /></div>
                   <div className="md:col-span-2"><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Jual (Rp) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.priceStr !== undefined ? form.priceStr : formatIDR(form.price)} onChange={e => setForm({...form, price: parseIDR(e.target.value), priceStr: smartFormatInput(e.target.value)})} /></div>`;

const newStockUI = `                   <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Stok Saat Ini *</label><input type="text" inputMode="decimal" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.stockStr !== undefined ? form.stockStr : (form.stock !== undefined && form.stock !== null && form.stock !== '' ? String(form.stock).replace('.', ',') : '')} onChange={e => setForm({...form, stock: parseIDR(e.target.value), stockStr: smartFormatInput(e.target.value)})} /></div>
                   <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Batas Notif Habis</label><input type="text" inputMode="decimal" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.minStockStr !== undefined ? form.minStockStr : (form.minStock !== undefined && form.minStock !== null && form.minStock !== '' ? String(form.minStock).replace('.', ',') : '')} onChange={e => setForm({...form, minStock: parseIDR(e.target.value), minStockStr: smartFormatInput(e.target.value)})} placeholder="Default: 5" /></div>
                   <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Beli (Modal) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.costStr !== undefined ? form.costStr : formatIDR(form.cost)} onChange={e => setForm({...form, cost: parseIDR(e.target.value), costStr: smartFormatInput(e.target.value)})} /></div>
                   <div><label className={\`block text-xs font-bold mb-1 \${colors.text}\`}>Harga Jual (Rp) *</label><input type="text" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.priceStr !== undefined ? form.priceStr : formatIDR(form.price)} onChange={e => setForm({...form, price: parseIDR(e.target.value), priceStr: smartFormatInput(e.target.value)})} /></div>`;
prodContent = prodContent.replace(oldStockUI, newStockUI);

fs.writeFileSync(prodFile, prodContent, 'utf8');
console.log('minStock property added to ProductManager and Header logic.');
