const fs = require('fs');
const path = require('path');

// 1. REPORTS.JSX
const repFile = path.join(__dirname, 'src/pages/Reports.jsx');
let repContent = fs.readFileSync(repFile, 'utf8');

// Fix start date for "Minggu Ini" in Reports
repContent = repContent.replace(
  `} else if (filterMode === 'Minggu Ini') { start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);`,
  `} else if (filterMode === 'Minggu Ini') { const d = now.getDay() || 7; start.setDate(now.getDate() - d + 1); start.setHours(0,0,0,0); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);`
);
fs.writeFileSync(repFile, repContent, 'utf8');


// 2. DASHBOARD.JSX
const dashFile = path.join(__dirname, 'src/pages/Dashboard.jsx');
let dashContent = fs.readFileSync(dashFile, 'utf8');

// --- Replace filteredSales timeRange logic ---
const oldFilteredSales = `      if (timeRange === 'minggu') {
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (timeRange === 'bulan') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();`;

const newFilteredSales = `      if (timeRange === 'minggu') {
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 6);
        weekAgo.setHours(0,0,0,0);
        return d >= weekAgo;
      }
      if (timeRange === 'bulan') {
        const monthAgo = new Date(); monthAgo.setDate(now.getDate() - 29);
        monthAgo.setHours(0,0,0,0);
        return d >= monthAgo;
      }`;
dashContent = dashContent.replace(oldFilteredSales, newFilteredSales);


// --- Replace previousSales timeRange logic ---
const oldPrevSales = `      if (timeRange === 'minggu') {
        const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14);
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return d >= twoWeeksAgo && d < weekAgo;
      }
      if (timeRange === 'bulan') {
        let prevMonth = now.getMonth() - 1; let prevYear = now.getFullYear();
        if (prevMonth < 0) { prevMonth = 11; prevYear--; }
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      }`;

const newPrevSales = `      if (timeRange === 'minggu') {
        const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 13);
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6);
        twoWeeksAgo.setHours(0,0,0,0); weekAgo.setHours(0,0,0,0);
        return d >= twoWeeksAgo && d < weekAgo;
      }
      if (timeRange === 'bulan') {
        const twoMonthsAgo = new Date(now); twoMonthsAgo.setDate(now.getDate() - 59);
        const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 29);
        twoMonthsAgo.setHours(0,0,0,0); monthAgo.setHours(0,0,0,0);
        return d >= twoMonthsAgo && d < monthAgo;
      }`;
dashContent = dashContent.replace(oldPrevSales, newPrevSales);


// --- Replace chart data map logic for minggu & bulan ---
const oldChartMapMingguBulan = `    } else if (timeRange === 'minggu') {
      labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      filteredSales.forEach(s => {
        const dayIdx = new Date(s.date).getDay();
        const dayName = labels[dayIdx === 0 ? 6 : dayIdx - 1]; 
        if (!dataMap[dayName]) dataMap[dayName] = { penjualan: 0, transaksi: 0, customer: new Set() };
        dataMap[dayName].penjualan += s.total;
        dataMap[dayName].transaksi += 1;
        if(s.customer) dataMap[dayName].customer.add(s.customer);
      });
    } else if (timeRange === 'bulan') {
      // PERBAIKAN: Menampilkan label per Tanggal (1 sampai 30/31)
      const now = new Date();
      labels = Array.from({length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}, (_, i) => String(i + 1));
      filteredSales.forEach(s => {
        const dayDate = String(new Date(s.date).getDate());
        if (!dataMap[dayDate]) dataMap[dayDate] = { penjualan: 0, transaksi: 0, customer: new Set() };
        dataMap[dayDate].penjualan += s.total;
        dataMap[dayDate].transaksi += 1;
        if(s.customer) dataMap[dayDate].customer.add(s.customer);
      });
    }`;

const newChartMapMingguBulan = `    } else if (timeRange === 'minggu') {
      labels = [];
      const tempMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const name = dayNames[d.getDay()];
        labels.push(name);
        tempMap[name] = { penjualan: 0, transaksi: 0, customer: new Set() };
      }
      filteredSales.forEach(s => {
        const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(s.date).getDay()];
        if (tempMap[dayName]) {
          tempMap[dayName].penjualan += s.total;
          tempMap[dayName].transaksi += 1;
          if(s.customer) tempMap[dayName].customer.add(s.customer);
        }
      });
      dataMap = tempMap;
    } else if (timeRange === 'bulan') {
      labels = [];
      const tempMap = {};
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
      dataMap = tempMap;
    }`;
dashContent = dashContent.replace(oldChartMapMingguBulan, newChartMapMingguBulan);

fs.writeFileSync(dashFile, dashContent, 'utf8');

console.log('Hybrid logic applied to Reports and Dashboard.');
