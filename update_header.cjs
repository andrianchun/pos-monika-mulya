const fs = require('fs');
const path = require('path');

const headerFile = path.join(__dirname, 'src/components/Header.jsx');
let headerContent = fs.readFileSync(headerFile, 'utf8');

// 1. SMART SUPPLIER DETECTION
// Replace the old useMemo for groupedLowStock
const oldGroupedLowStock = `  const groupedLowStock = useMemo(() => {
    const groups = {};
    lowStockItems.forEach(item => {
      const supp = suppliers.find(s => 
         s.id === item.supplierId || 
         s.name === item.supplier || 
         s.name.toLowerCase().includes(item.category?.toLowerCase())
      ) || suppliers[0] || { name: 'Supplier Umum', phone: '' };
      const suppName = supp.name;
      if (!groups[suppName]) {
         groups[suppName] = { supplier: supp, items: [] };
      }
      groups[suppName].items.push(item);
    });
    return Object.values(groups);
  }, [lowStockItems, suppliers]);`;

const newGroupedLowStock = `  const groupedLowStock = useMemo(() => {
    const groups = {};
    lowStockItems.forEach(item => {
      let lastSupplierName = null;
      
      // Deteksi dari riwayat pembelian (dari terbaru ke terlama)
      if (purchases && purchases.length > 0) {
         for (let i = 0; i < purchases.length; i++) {
            const p = purchases[i];
            if (p.items && p.items.some(prod => prod.id === item.id)) {
                lastSupplierName = p.supplier;
                break;
            }
         }
      }

      const supp = suppliers.find(s => 
         (lastSupplierName && s.name === lastSupplierName) ||
         s.id === item.supplierId || 
         s.name === item.supplier || 
         (item.category && s.name.toLowerCase().includes(item.category.toLowerCase()))
      ) || suppliers[0] || { name: 'Supplier Umum', phone: '' };
      
      const suppName = supp.name;
      if (!groups[suppName]) {
         groups[suppName] = { supplier: supp, items: [] };
      }
      groups[suppName].items.push(item);
    });
    return Object.values(groups);
  }, [lowStockItems, suppliers, purchases]);`;

headerContent = headerContent.replace(oldGroupedLowStock, newGroupedLowStock);

// 2. WA LINK STANDARDIZATION
// Replace handleSendBulkSupplierWA
const oldWA = `    const handleSendBulkSupplierWA = (group) => {
      playSound('pop', isSoundOn);
      const text = \`Halo \${group.supplier.name},\nKami dari \${storeInfo.name} ingin memesan stok berikut karena sudah menipis:\n\n\` + 
         group.items.map((i, idx) => \`\${idx+1}. \${i.name} (Stok Sisa: \${i.stock})\`).join('\\n') + 
         \`\n\nMohon info ketersediaan dan harganya. Terima kasih.\`;
      
      let phone = group.supplier.phone || '';
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      phone = phone.replace(/\\D/g, '');
      
      const waUrl = phone ? \`https://api.whatsapp.com/send?phone=\${phone}&text=\${encodeURIComponent(text)}\` : \`https://api.whatsapp.com/send?text=\${encodeURIComponent(text)}\`;
      
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.click();
    };`;

const newWA = `    const handleSendBulkSupplierWA = (group) => {
      playSound('pop', isSoundOn);
      const text = \`Halo \${group.supplier.name},\nKami dari \${storeInfo.name} ingin memesan stok berikut karena sudah menipis:\n\n\` + 
         group.items.map((i, idx) => \`\${idx+1}. \${i.name} (Stok Sisa: \${i.stock})\`).join('\\n') + 
         \`\n\nMohon info ketersediaan dan harganya. Terima kasih.\`;
      
      let phone = group.supplier.phone || '';
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      phone = phone.replace(/\\D/g, '');
      
      const waUrl = phone ? \`https://wa.me/\${phone}?text=\${encodeURIComponent(text)}\` : \`https://wa.me/?text=\${encodeURIComponent(text)}\`;
      window.open(waUrl, '_blank');
    };`;

headerContent = headerContent.replace(oldWA, newWA);

fs.writeFileSync(headerFile, headerContent, 'utf8');
console.log('Header WA and Smart Supplier updated successfully');
