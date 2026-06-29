const fs = require('fs');
const path = require('path');

// 1. CheckoutModal.jsx
const checkoutFile = path.join(__dirname, 'src/components/modals/CheckoutModal.jsx');
if (fs.existsSync(checkoutFile)) {
    let content = fs.readFileSync(checkoutFile, 'utf8');
    content = content.replace('formatIDR, parseIDR', 'formatIDR, parseIDR, smartFormatInput');
    content = content.replace('onChange={e => setPaymentAmount(formatIDR(e.target.value))}', 'onChange={e => setPaymentAmount(smartFormatInput(e.target.value))}');
    fs.writeFileSync(checkoutFile, content, 'utf8');
}

// 2. POS.jsx
const posFile = path.join(__dirname, 'src/pages/POS.jsx');
if (fs.existsSync(posFile)) {
    let content = fs.readFileSync(posFile, 'utf8');
    if (!content.includes('smartFormatInput')) {
        content = content.replace('formatIDR, parseIDR, playSound, calculateDynamicPrice', 'formatIDR, parseIDR, playSound, calculateDynamicPrice, smartFormatInput');
    }
    
    // posOngkirStr
    content = content.replace('onChange={e => setPosOngkirStr(e.target.value.replace(/[^0-9]/g, \'\'))}', 'onChange={e => setPosOngkirStr(smartFormatInput(e.target.value))}');
    
    // posDiscountStr
    const oldDisc = `onChange={e => { let v = e.target.value; if(v.includes('%')) setPosDiscountStr(v.replace(/[^0-9%]/g, '')); else setPosDiscountStr(v.replace(/[^0-9]/g, '')); }}`;
    const newDisc = `onChange={e => { let v = e.target.value; if(v.includes('%')) { let c = v.replace(/[^0-9,.%]/g, ''); if(c.endsWith('.')) c = c.slice(0,-1)+','; setPosDiscountStr(c); } else { setPosDiscountStr(smartFormatInput(v)); } }}`;
    content = content.replace(oldDisc, newDisc);
    
    // updateCartQtyString
    const oldQtyStr = `const cleanStr = strVal.replace(/[^0-9,]/g, '');`;
    const newQtyStr = `let cleanStr = strVal.replace(/[^0-9,.]/g, ''); if(cleanStr.endsWith('.')) cleanStr = cleanStr.slice(0,-1)+','; cleanStr = cleanStr.replace(/\\./g, '');`;
    content = content.replace(oldQtyStr, newQtyStr);

    fs.writeFileSync(posFile, content, 'utf8');
}

// 3. SettingsPage.jsx (Ongkir)
const setFile = path.join(__dirname, 'src/pages/SettingsPage.jsx');
if (fs.existsSync(setFile)) {
    let content = fs.readFileSync(setFile, 'utf8');
    if (!content.includes('smartFormatInput')) {
        content = content.replace('formatIDR, parseIDR', 'formatIDR, parseIDR, smartFormatInput');
    }
    const oldOngkir = `value={formatIDR(storeInfo.ongkirPerKm)} onChange={e=>setStoreInfo({...storeInfo, ongkirPerKm: parseIDR(e.target.value)})}`;
    const newOngkir = `value={storeInfo.ongkirPerKmStr !== undefined ? storeInfo.ongkirPerKmStr : formatIDR(storeInfo.ongkirPerKm)} onChange={e=>setStoreInfo({...storeInfo, ongkirPerKm: parseIDR(e.target.value), ongkirPerKmStr: smartFormatInput(e.target.value)})}`;
    content = content.replace(oldOngkir, newOngkir);
    fs.writeFileSync(setFile, content, 'utf8');
}

// 4. ProductManager.jsx
const pmFile = path.join(__dirname, 'src/pages/ProductManager.jsx');
if (fs.existsSync(pmFile)) {
    let content = fs.readFileSync(pmFile, 'utf8');
    if (!content.includes('smartFormatInput')) {
        content = content.replace('formatIDR, parseIDR', 'formatIDR, parseIDR, smartFormatInput');
    }
    
    // Stock (change type="number" to type="text" inputMode="decimal")
    const oldStock = `type="number" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})}`;
    const newStock = `type="text" inputMode="decimal" required className={\`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-transparent \${colors.text} \${colors.border}\`} value={form.stockStr !== undefined ? form.stockStr : (form.stock ? String(form.stock).replace('.', ',') : '')} onChange={e => setForm({...form, stock: parseIDR(e.target.value), stockStr: smartFormatInput(e.target.value)})}`;
    content = content.replace(oldStock, newStock);
    
    // Cost
    const oldCost = `value={formatIDR(form.cost)} onChange={e => setForm({...form, cost: parseIDR(e.target.value)})}`;
    const newCost = `value={form.costStr !== undefined ? form.costStr : formatIDR(form.cost)} onChange={e => setForm({...form, cost: parseIDR(e.target.value), costStr: smartFormatInput(e.target.value)})}`;
    content = content.replace(oldCost, newCost);
    
    // Price
    const oldPrice = `value={formatIDR(form.price)} onChange={e => setForm({...form, price: parseIDR(e.target.value)})}`;
    const newPrice = `value={form.priceStr !== undefined ? form.priceStr : formatIDR(form.price)} onChange={e => setForm({...form, price: parseIDR(e.target.value), priceStr: smartFormatInput(e.target.value)})}`;
    content = content.replace(oldPrice, newPrice);
    
    fs.writeFileSync(pmFile, content, 'utf8');
}

console.log('Smart inputs applied successfully.');
