const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/SettingsPage.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Fix handleSaveEditGeneric
const oldEditLogic = `    const handleSaveEditGeneric = () => {
       playSound('pop', isSoundOn);
       if (editGenericModal.type === 'cat') {
          const oldLabel = editGenericModal.idOrIdx;
          const newLabel = editGenericModal.val1;
  
          const newCats = Array.from(new Set(categories.map(c => getLabel(c) === oldLabel ? newLabel : getLabel(c)))).sort();
          setCategories(newCats); 
  
          if (setProducts && products.length > 0) {
             setProducts(products.map(p => p.category === oldLabel ? { ...p, category: newLabel } : p));
          }
          showToast('Kategori diperbarui & disinkronisasi', 'success');
       } else if (editGenericModal.type === 'unit') {
          const oldLabel = editGenericModal.idOrIdx;
          const newLabel = editGenericModal.val1;
  
          const newUnits = Array.from(new Set(units.map(u => getLabel(u) === oldLabel ? newLabel : getLabel(u)))).sort();
          setUnits(newUnits); 
  
          if (setProducts && products.length > 0) {
             setProducts(products.map(p => p.unit === oldLabel ? { ...p, unit: newLabel } : p));
          }
          showToast('Satuan diperbarui & disinkronisasi', 'success');
       }
       setEditGenericModal(null);
    };`;

const newEditLogic = `    const handleSaveEditGeneric = () => {
       playSound('pop', isSoundOn);
       if (editGenericModal.type === 'cat') {
          const oldLabel = editGenericModal.idOrIdx;
          const newLabel = editGenericModal.val1.trim().toLowerCase();
          
          if (categories.map(getLabel).map(c=>c.toLowerCase()).filter(c => c !== oldLabel.toLowerCase()).includes(newLabel)) {
             showToast('Kategori sudah ada!', 'error');
             return;
          }
  
          const newCats = Array.from(new Set(categories.map(c => getLabel(c).toLowerCase() === oldLabel.toLowerCase() ? newLabel : getLabel(c).toLowerCase()))).sort();
          setCategories(newCats); 
  
          if (setProducts && products.length > 0) {
             setProducts(products.map(p => p.category?.toLowerCase() === oldLabel.toLowerCase() ? { ...p, category: newLabel } : p));
          }
          showToast('Kategori diperbarui & disinkronisasi', 'success');
       } else if (editGenericModal.type === 'unit') {
          const oldLabel = editGenericModal.idOrIdx;
          const newLabel = editGenericModal.val1.trim().toLowerCase();
          
          if (units.map(getLabel).map(u=>u.toLowerCase()).filter(u => u !== oldLabel.toLowerCase()).includes(newLabel)) {
             showToast('Satuan sudah ada!', 'error');
             return;
          }
  
          const newUnits = Array.from(new Set(units.map(u => getLabel(u).toLowerCase() === oldLabel.toLowerCase() ? newLabel : getLabel(u).toLowerCase()))).sort();
          setUnits(newUnits); 
  
          if (setProducts && products.length > 0) {
             setProducts(products.map(p => p.unit?.toLowerCase() === oldLabel.toLowerCase() ? { ...p, unit: newLabel } : p));
          }
          showToast('Satuan diperbarui & disinkronisasi', 'success');
       }
       setEditGenericModal(null);
    };`;

content = content.replace(oldEditLogic, newEditLogic);

// 2. Fix Add Category
content = content.replace(
  `onClick={() => { if(newCat){ setCategories(Array.from(new Set([...(categories||[]).map(getLabel), newCat])).sort()); setNewCat(''); playSound('pop', isSoundOn); } }}`,
  `onClick={() => { if(newCat){ const cleanCat = newCat.trim().toLowerCase(); if(categories.map(getLabel).map(c=>c.toLowerCase()).includes(cleanCat)) { showToast('Kategori sudah ada!', 'error'); return; } setCategories(Array.from(new Set([...(categories||[]).map(getLabel).map(c=>c.toLowerCase()), cleanCat])).sort()); setNewCat(''); playSound('pop', isSoundOn); } }}`
);

// 3. Fix Add Unit
content = content.replace(
  `onClick={() => { if(newUnit){ setUnits(Array.from(new Set([...(units||[]).map(getLabel), newUnit])).sort()); setNewUnit(''); playSound('pop', isSoundOn); } }}`,
  `onClick={() => { if(newUnit){ const cleanUnit = newUnit.trim().toLowerCase(); if(units.map(getLabel).map(u=>u.toLowerCase()).includes(cleanUnit)) { showToast('Satuan sudah ada!', 'error'); return; } setUnits(Array.from(new Set([...(units||[]).map(getLabel).map(u=>u.toLowerCase()), cleanUnit])).sort()); setNewUnit(''); playSound('pop', isSoundOn); } }}`
);

fs.writeFileSync(file, content, 'utf8');
console.log('SettingsPage updated.');
