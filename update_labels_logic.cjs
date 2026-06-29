const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, 'src/pages/Dashboard.jsx');
let dashContent = fs.readFileSync(dashFile, 'utf8');

// 1. Update 'bulan' chart logic
const oldBulanLogic = `    } else if (timeRange === 'bulan') {
      labels = [];
      const tempMap = {};
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const key = \`\${d.getDate()}/\${d.getMonth()+1}\`;
        labels.push(key);
        tempMap[key] = { penjualan: 0, transaksi: 0, customer: new Set() };
      }
      filteredSales.forEach(s => {
        const d = new Date(s.date);
        const key = \`\${d.getDate()}/\${d.getMonth()+1}\`;
        if (tempMap[key]) {
           tempMap[key].penjualan += s.total;
           tempMap[key].transaksi += 1;
           if(s.customer) tempMap[key].customer.add(s.customer);
        }
      });
      dataMap = tempMap;`;

const newBulanLogic = `    } else if (timeRange === 'bulan') {
      labels = [];
      const tempMap = {};
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const key = \`\${d.getFullYear()}-\${d.getMonth()}-\${d.getDate()}\`;
        let displayLabel = String(d.getDate());
        if (d.getDate() === 1 || i === 29) {
           displayLabel = \`\${d.getDate()} \${monthNames[d.getMonth()]}\`;
        }
        labels.push({ key, display: displayLabel });
        tempMap[key] = { penjualan: 0, transaksi: 0, customer: new Set() };
      }
      filteredSales.forEach(s => {
        const d = new Date(s.date);
        const key = \`\${d.getFullYear()}-\${d.getMonth()}-\${d.getDate()}\`;
        if (tempMap[key]) {
           tempMap[key].penjualan += s.total;
           tempMap[key].transaksi += 1;
           if(s.customer) tempMap[key].customer.add(s.customer);
        }
      });
      dataMap = tempMap;`;
dashContent = dashContent.replace(oldBulanLogic, newBulanLogic);


// 2. Update finalData mapping logic
const oldFinalDataLogic = `    let finalData = labels.map(label => {
      const d = dataMap[label] || { penjualan: 0, transaksi: 0, customer: new Set() };
      let value = 0;
      if (chartTab === 'penjualan') value = d.penjualan;
      if (chartTab === 'transaksi') value = d.transaksi;
      if (chartTab === 'customer') value = d.customer.size;
      return { label, value };
    });`;

const newFinalDataLogic = `    let finalData = labels.map(labelItem => {
      const isObj = typeof labelItem === 'object';
      const key = isObj ? labelItem.key : labelItem;
      const display = isObj ? labelItem.display : labelItem;
      
      const d = dataMap[key] || { penjualan: 0, transaksi: 0, customer: new Set() };
      let value = 0;
      if (chartTab === 'penjualan') value = d.penjualan;
      if (chartTab === 'transaksi') value = d.transaksi;
      if (chartTab === 'customer') value = d.customer.size;
      return { label: display, value };
    });`;
dashContent = dashContent.replace(oldFinalDataLogic, newFinalDataLogic);

fs.writeFileSync(dashFile, dashContent, 'utf8');
console.log('Dashboard labels updated to use boundary separators.');
