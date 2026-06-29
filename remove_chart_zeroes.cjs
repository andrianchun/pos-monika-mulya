const fs = require('fs');
const path = require('path');

// 1. Dashboard.jsx
const dashFile = path.join(__dirname, 'src/pages/Dashboard.jsx');
let dashContent = fs.readFileSync(dashFile, 'utf8');

dashContent = dashContent.replace(
  `      return finalData;
  }, [filteredSales, timeRange, chartTab]);`,
  `      return finalData.filter(d => d.value > 0);
  }, [filteredSales, timeRange, chartTab]);`
);
fs.writeFileSync(dashFile, dashContent, 'utf8');

// 2. Reports.jsx
const repFile = path.join(__dirname, 'src/pages/Reports.jsx');
let repContent = fs.readFileSync(repFile, 'utf8');

const oldRepChart = `     const maxData = Math.max(...labels.map(l => dataMap[l] || 0), 1);
     const data = labels.map(label => {
        const sum = dataMap[label] || 0;
        return { value: sum, percentage: (sum / maxData) * 100 };
     });

     return { labels, data };
  }, [activeDataArray, filterMode, startDate, endDate]);`;

const newRepChart = `     let validLabels = [];
     let validDataRaw = [];
     labels.forEach(label => {
        const sum = dataMap[label] || 0;
        if (sum > 0) {
           validLabels.push(label);
           validDataRaw.push(sum);
        }
     });
     
     const maxData = Math.max(...validDataRaw, 1);
     const data = validDataRaw.map(sum => ({ value: sum, percentage: (sum / maxData) * 100 }));

     return { labels: validLabels, data };
  }, [activeDataArray, filterMode, startDate, endDate]);`;

repContent = repContent.replace(oldRepChart, newRepChart);
fs.writeFileSync(repFile, repContent, 'utf8');

console.log('Chart zeroes removed.');
