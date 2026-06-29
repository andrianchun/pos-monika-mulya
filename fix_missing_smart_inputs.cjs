const fs = require('fs');
const path = require('path');

// 1. POS.jsx
const posFile = path.join(__dirname, 'src/pages/POS.jsx');
let posContent = fs.readFileSync(posFile, 'utf8');

// Fix posDiscountStr
posContent = posContent.replace(
  `value={posDiscountStr.includes('%') ? posDiscountStr : formatIDR(posDiscountStr)}`,
  `value={posDiscountStr}`
);

// Fix posOngkirStr
const oldOngkir = `value={posOngkirStr ? formatIDR(posOngkirStr) : ''} onChange={e => { setUseAutoOngkir(false); setPosOngkirStr(e.target.value.replace(/[^0-9]/g, '')); }}`;
const newOngkir = `value={posOngkirStr} onChange={e => { setUseAutoOngkir(false); setPosOngkirStr(smartFormatInput(e.target.value)); }}`;
posContent = posContent.replace(oldOngkir, newOngkir);

fs.writeFileSync(posFile, posContent, 'utf8');

// 2. SettingsPage.jsx
const setFile = path.join(__dirname, 'src/pages/SettingsPage.jsx');
let setContent = fs.readFileSync(setFile, 'utf8');

// Fix wForm.wholesalePrice
setContent = setContent.replace(
  `value={wForm.wholesalePrice} onChange={e=>setWForm({...wForm, wholesalePrice: formatIDR(e.target.value)})} />`,
  `value={wForm.wholesalePrice} onChange={e=>setWForm({...wForm, wholesalePrice: smartFormatInput(e.target.value)})} />`
);
setContent = setContent.replace(
  `type="text" placeholder="Harus di bawah harga awal"`,
  `type="text" inputMode="decimal" placeholder="Harus di bawah harga awal"`
);

// Fix wForm.minQty
setContent = setContent.replace(
  `type="number" placeholder="Cth: 12" className={\`w-full p-2.5 rounded-xl border \${colors.border} bg-transparent outline-none text-sm\`} value={wForm.minQty} onChange={e=>setWForm({...wForm, minQty: e.target.value})} />`,
  `type="text" inputMode="decimal" placeholder="Cth: 12" className={\`w-full p-2.5 rounded-xl border \${colors.border} bg-transparent outline-none text-sm\`} value={wForm.minQtyStr !== undefined ? wForm.minQtyStr : (wForm.minQty || '')} onChange={e=>setWForm({...wForm, minQty: parseIDR(e.target.value), minQtyStr: smartFormatInput(e.target.value)})} />`
);

// Fix pForm.discValue
setContent = setContent.replace(
  `type="number" placeholder={pForm.discType==='%' ? 'Cth: 10' : 'Cth: 5000'} className={\`w-full p-2.5 rounded-xl border \${colors.border} bg-transparent outline-none text-sm\`} value={pForm.discValue} onChange={e=>setPForm({...pForm, discValue: e.target.value})} />`,
  `type="text" inputMode="decimal" placeholder={pForm.discType==='%' ? 'Cth: 10' : 'Cth: 5000'} className={\`w-full p-2.5 rounded-xl border \${colors.border} bg-transparent outline-none text-sm\`} value={pForm.discValueStr !== undefined ? pForm.discValueStr : (pForm.discValue || '')} onChange={e=>{ let v = e.target.value; if(pForm.discType==='%'){ let c = v.replace(/[^0-9,.%]/g, ''); if(c.endsWith('.')) c=c.slice(0,-1)+','; setPForm({...pForm, discValue: parseIDR(c), discValueStr: c}); } else { setPForm({...pForm, discValue: parseIDR(v), discValueStr: smartFormatInput(v)}); } }} />`
);

// Fix sPointRew
setContent = setContent.replace(
  `type="number" className={\`w-full p-3 rounded-xl border \${colors.border} bg-transparent \${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]\`} value={sPointRew} onChange={e => setSPointRew(e.target.value)} />`,
  `type="text" inputMode="decimal" className={\`w-full p-3 rounded-xl border \${colors.border} bg-transparent \${colors.text} outline-none focus:ring-1 focus:ring-[#D4AF37]\`} value={sPointRewStr !== undefined ? sPointRewStr : (sPointRew || '')} onChange={e => { setSPointRew(parseIDR(e.target.value)); setSPointRewStr(smartFormatInput(e.target.value)); }} />`
);
// We need to declare sPointRewStr state in SettingsPage
if (!setContent.includes('sPointRewStr')) {
  setContent = setContent.replace(
    `const [sPointRew, setSPointRew] = useState(storeInfo.rewardPoints || 0);`,
    `const [sPointRew, setSPointRew] = useState(storeInfo.rewardPoints || 0);\n    const [sPointRewStr, setSPointRewStr] = useState(undefined);`
  );
}

fs.writeFileSync(setFile, setContent, 'utf8');

console.log('Missed inputs fixed.');
