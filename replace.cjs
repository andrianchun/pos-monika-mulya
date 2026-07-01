const fs = require('fs');

const processFile = (filePath, importPath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('DateInput')) return;
    
    // Add import after first import
    content = content.replace(/(import React.*?;\n)/, `$1import DateInput from '${importPath}';\n`);
    
    // Replace <input type="date"
    let matched = false;
    content = content.replace(/<input([^>]*?)type=["']date["']([^>]*?)>/g, (match, p1, p2) => {
        matched = true;
        // ensure it ends with />
        if (p2.endsWith('/')) {
            p2 = p2.slice(0, -1);
        }
        return `<DateInput${p1}${p2}/>`;
    });
    
    if (matched) {
        fs.writeFileSync(filePath, content);
        console.log(`Modified ${filePath}`);
    } else {
        console.log(`No match in ${filePath}`);
    }
};

processFile('src/pages/POS.jsx', '../components/DateInput');
processFile('src/pages/Reports.jsx', '../components/DateInput');
processFile('src/pages/SettingsPage.jsx', '../components/DateInput');
processFile('src/components/modals/CheckoutModal.jsx', '../DateInput');
processFile('src/components/modals/TransactionEditModal.jsx', '../DateInput');
