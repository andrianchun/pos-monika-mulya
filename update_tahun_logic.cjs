const fs = require('fs');
const path = require('path');

const dashFile = path.join(__dirname, 'src/pages/Dashboard.jsx');
let dashContent = fs.readFileSync(dashFile, 'utf8');

// --- Replace filteredSales timeRange logic for tahun ---
const oldFilteredSalesTahun = `      if (timeRange === 'tahun') return d.getFullYear() === now.getFullYear();`;
const newFilteredSalesTahun = `      if (timeRange === 'tahun') {
        const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        yearAgo.setHours(0,0,0,0);
        return d >= yearAgo;
      }`;
dashContent = dashContent.replace(oldFilteredSalesTahun, newFilteredSalesTahun);


// --- Replace previousSales timeRange logic for tahun ---
const oldPrevSalesTahun = `      if (timeRange === 'tahun') {
        return d.getFullYear() === now.getFullYear() - 1;
      }`;
const newPrevSalesTahun = `      if (timeRange === 'tahun') {
        const twoYearsAgo = new Date(now.getFullYear(), now.getMonth() - 23, 1);
        const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        twoYearsAgo.setHours(0,0,0,0); yearAgo.setHours(0,0,0,0);
        return d >= twoYearsAgo && d < yearAgo;
      }`;
dashContent = dashContent.replace(oldPrevSalesTahun, newPrevSalesTahun);


// --- Replace chart data map logic for tahun ---
const oldChartMapTahun = `    } else if (timeRange === 'tahun') {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      filteredSales.forEach(s => {
        const monthName = labels[new Date(s.date).getMonth()];
        if (!dataMap[monthName]) dataMap[monthName] = { penjualan: 0, transaksi: 0, customer: new Set() };
        dataMap[monthName].penjualan += s.total;
        dataMap[monthName].transaksi += 1;
        if(s.customer) dataMap[monthName].customer.add(s.customer);
      });
    }`;

const newChartMapTahun = `    } else if (timeRange === 'tahun') {
      labels = [];
      const tempMap = {};
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const name = monthNames[d.getMonth()];
        labels.push(name);
        tempMap[name] = { penjualan: 0, transaksi: 0, customer: new Set() };
      }
      filteredSales.forEach(s => {
        const name = monthNames[new Date(s.date).getMonth()];
        if (tempMap[name]) {
          tempMap[name].penjualan += s.total;
          tempMap[name].transaksi += 1;
          if(s.customer) tempMap[name].customer.add(s.customer);
        }
      });
      dataMap = tempMap;
    }`;
dashContent = dashContent.replace(oldChartMapTahun, newChartMapTahun);

fs.writeFileSync(dashFile, dashContent, 'utf8');
console.log('Rolling 12 months logic applied to Dashboard.');
