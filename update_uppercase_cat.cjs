const fs = require('fs');
const path = require('path');

// 1. UPDATE App.jsx
const appFile = path.join(__dirname, 'src/App.jsx');
let appContent = fs.readFileSync(appFile, 'utf8');

// App.jsx: products mapping
appContent = appContent.replace(
  `if (obj.category && typeof obj.category === 'string') obj.category = obj.category.toLowerCase().trim();`,
  `if (obj.category && typeof obj.category === 'string') obj.category = obj.category.toUpperCase().trim();`
);
appContent = appContent.replace(
  `else obj.category = 'lainnya';`,
  `else obj.category = 'LAINNYA';`
);

// App.jsx: categories fetching
appContent = appContent.replace(
  `const lowerCats = Array.from(new Set(cats.map(c => typeof c === 'string' ? c.toLowerCase().trim() : c))).sort();`,
  `const lowerCats = Array.from(new Set(cats.map(c => typeof c === 'string' ? c.toUpperCase().trim() : c))).sort();`
);

fs.writeFileSync(appFile, appContent, 'utf8');


// 2. UPDATE SettingsPage.jsx
const setFile = path.join(__dirname, 'src/pages/SettingsPage.jsx');
let setContent = fs.readFileSync(setFile, 'utf8');

// SettingsPage: edit category
setContent = setContent.replace(
  `const newLabel = editGenericModal.val1.trim().toLowerCase();`,
  `const newLabel = editGenericModal.val1.trim().toUpperCase();`
);
setContent = setContent.replace(
  `if (categories.map(getLabel).map(c=>c.toLowerCase()).filter(c => c !== oldLabel.toLowerCase()).includes(newLabel)) {`,
  `if (categories.map(getLabel).map(c=>c.toUpperCase()).filter(c => c !== oldLabel.toUpperCase()).includes(newLabel)) {`
);
setContent = setContent.replace(
  `const newCats = Array.from(new Set(categories.map(c => getLabel(c).toLowerCase() === oldLabel.toLowerCase() ? newLabel : getLabel(c).toLowerCase()))).sort();`,
  `const newCats = Array.from(new Set(categories.map(c => getLabel(c).toUpperCase() === oldLabel.toUpperCase() ? newLabel : getLabel(c).toUpperCase()))).sort();`
);
setContent = setContent.replace(
  `setProducts(products.map(p => p.category?.toLowerCase() === oldLabel.toLowerCase() ? { ...p, category: newLabel } : p));`,
  `setProducts(products.map(p => p.category?.toUpperCase() === oldLabel.toUpperCase() ? { ...p, category: newLabel } : p));`
);

// SettingsPage: add category
setContent = setContent.replace(
  `onClick={() => { if(newCat){ const cleanCat = newCat.trim().toLowerCase(); if(categories.map(getLabel).map(c=>c.toLowerCase()).includes(cleanCat)) { showToast('Kategori sudah ada!', 'error'); return; } setCategories(Array.from(new Set([...(categories||[]).map(getLabel).map(c=>c.toLowerCase()), cleanCat])).sort()); setNewCat(''); playSound('pop', isSoundOn); } }}`,
  `onClick={() => { if(newCat){ const cleanCat = newCat.trim().toUpperCase(); if(categories.map(getLabel).map(c=>c.toUpperCase()).includes(cleanCat)) { showToast('Kategori sudah ada!', 'error'); return; } setCategories(Array.from(new Set([...(categories||[]).map(getLabel).map(c=>c.toUpperCase()), cleanCat])).sort()); setNewCat(''); playSound('pop', isSoundOn); } }}`
);

// SettingsPage: handleDeleteCat
setContent = setContent.replace(
  `if (label.toLowerCase() === 'lainnya') {`,
  `if (label.toUpperCase() === 'LAINNYA') {`
);
setContent = setContent.replace(
  `if (!newArr.includes('Lainnya')) newArr.push('Lainnya');`,
  `if (!newArr.includes('LAINNYA')) newArr.push('LAINNYA');`
);
setContent = setContent.replace(
  `setProducts(products.map(p => p.category === label ? { ...p, category: 'Lainnya' } : p));`,
  `setProducts(products.map(p => p.category === label ? { ...p, category: 'LAINNYA' } : p));`
);

fs.writeFileSync(setFile, setContent, 'utf8');

console.log('Categories uppercase applied.');
