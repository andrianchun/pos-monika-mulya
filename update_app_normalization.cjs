const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/App.jsx');
let content = fs.readFileSync(file, 'utf8');

// Update setupRealtime to normalize products
const oldSetupRealtime = `      const setupRealtime = (colName, setter, sortDesc = false) => {
         return onSnapshot(collection(db, colName), (snap) => {
            let data = snap.docs.map(d => {
               let obj = d.data();
               if (obj.name === 'Umum (Tanpa Data)') obj.name = '(anonim)';
               if (obj.customer === 'Umum (Tanpa Data)') obj.customer = '(anonim)';
               if (obj.supplier === 'Umum (Tanpa Data)') obj.supplier = '(anonim)';
               return obj;
            });`;

const newSetupRealtime = `      const setupRealtime = (colName, setter, sortDesc = false) => {
         return onSnapshot(collection(db, colName), (snap) => {
            let data = snap.docs.map(d => {
               let obj = d.data();
               if (obj.name === 'Umum (Tanpa Data)') obj.name = '(anonim)';
               if (obj.customer === 'Umum (Tanpa Data)') obj.customer = '(anonim)';
               if (obj.supplier === 'Umum (Tanpa Data)') obj.supplier = '(anonim)';
               
               if (colName === 'products') {
                  if (obj.unit && typeof obj.unit === 'string') obj.unit = obj.unit.toLowerCase().trim();
                  else obj.unit = 'pcs';
                  if (obj.category && typeof obj.category === 'string') obj.category = obj.category.toLowerCase().trim();
                  else obj.category = 'lainnya';
               }
               
               return obj;
            });`;

content = content.replace(oldSetupRealtime, newSetupRealtime);


// Update settings onSnapshot to normalize units and categories
const oldSettingsSnapshot = `      unsubs.push(onSnapshot(collection(db, "settings"), (snap) => {
         if (!snap.empty) {
            snap.docs.forEach(d => {
               if(d.id === 'storeInfo') setStoreInfo(prev => ({...prev, ...d.data()}));
               if(d.id === 'categories') setCategories(d.data().values || []);
               if(d.id === 'units') setUnits(d.data().values || []);
            });
         }
      }));`;

const newSettingsSnapshot = `      unsubs.push(onSnapshot(collection(db, "settings"), (snap) => {
         if (!snap.empty) {
            snap.docs.forEach(d => {
               if(d.id === 'storeInfo') setStoreInfo(prev => ({...prev, ...d.data()}));
               if(d.id === 'categories') {
                  const cats = d.data().values || [];
                  const lowerCats = Array.from(new Set(cats.map(c => typeof c === 'string' ? c.toLowerCase().trim() : c))).sort();
                  setCategories(lowerCats);
               }
               if(d.id === 'units') {
                  const us = d.data().values || [];
                  const lowerUs = Array.from(new Set(us.map(u => typeof u === 'string' ? u.toLowerCase().trim() : u))).sort();
                  setUnits(lowerUs);
               }
            });
         }
      }));`;

content = content.replace(oldSettingsSnapshot, newSettingsSnapshot);

fs.writeFileSync(file, content, 'utf8');
console.log('App.jsx updated.');
