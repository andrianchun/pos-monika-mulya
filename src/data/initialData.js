export const defaultPromo = { active: false, type: 'percent', value: 0, endDate: '' };
export const defaultWholesale = { minQty: 0, price: 0 };

export const initialProducts = [
  { id: 1, barcode: '89912345', name: 'Beras Mentik Wangi 5Kg', category: 'Sembako', unit: 'Sak', stock: 8, cost: 65000, price: 72000, img: '🌾', supplier: 'CV. Pangan Makmur', expDate: '2026-12-31', promo: {...defaultPromo}, wholesale: { minQty: 5, price: 70000 } },
  { id: 2, barcode: '89912346', name: 'Minyak Goreng Sunco 2L', category: 'Sembako', unit: 'Pcs', stock: 15, cost: 30000, price: 34000, img: '🍾', supplier: 'Agen Minyak Jaya', expDate: '2027-05-12', promo: { active: true, type: 'nominal', value: 2000, endDate: '2026-12-31' }, wholesale: {...defaultWholesale} },
  { id: 3, barcode: '89912347', name: 'Gula Pasir Gulaku 1Kg', category: 'Sembako', unit: 'Pcs', stock: 3, cost: 14000, price: 16000, img: '🧊', supplier: 'CV. Pangan Makmur', expDate: '', promo: {...defaultPromo}, wholesale: {...defaultWholesale} },
  { id: 4, barcode: '89912348', name: 'Telur Ayam Horn 1Kg', category: 'Sembako', unit: 'Kg', stock: 25, cost: 24000, price: 27000, img: '🥚', supplier: 'Peternakan Ayam Sejahtera', expDate: '2026-06-15', promo: {...defaultPromo}, wholesale: { minQty: 10, price: 25500 } },
  { id: 5, barcode: '89912349', name: 'Indomie Goreng', category: 'Makanan', unit: 'Pcs', stock: 120, cost: 2500, price: 3000, img: '🍜', supplier: 'Grosir Sembako Utama', expDate: '2028-01-01', promo: { active: true, type: 'percent', value: 10, endDate: '2026-12-31' }, wholesale: { minQty: 40, price: 2700 } },
];

export const initialCustomers = [
  { id: 1, name: '(anonim)', address: '-', phone: '-', points: 0, distance: 0 },
  { id: 2, name: 'Ibu Ratna', address: 'Jl. Merdeka No. 10', phone: '08123456789', points: 150, distance: 2.5 },
  { id: 3, name: 'Bapak Budi', address: 'Perum Indah Blok B', phone: '08987654321', points: 320, distance: 5.2 },
];

export const initialSuppliers = [
  { id: 1, name: 'CV. Pangan Makmur', address: 'Kawasan Industri Rungkut', phone: '08111222333', distance: 15.5 },
  { id: 2, name: 'Agen Minyak Jaya', address: 'Pasar Induk Kramat Jati', phone: '08222333444', distance: 8.0 },
];

export const initialUsers = [
  { id: 1, username: 'admin', email: 'admin@monikamulya.com', name: 'Admin Master', role: 'admin', permissions: ['all'], avatar: null },
  { id: 2, username: 'kasira', email: 'kasir@monikamulya.com', name: 'Kasir A', role: 'kasir', permissions: ['dashboard', 'pos'], avatar: null }
];

export const initialFinancialAccounts = [
  { id: 1, name: 'Kas Tunai Laci', type: 'tunai' },
  { id: 2, name: 'Bank BCA Toko', type: 'bank' },
  { id: 3, name: 'QRIS Gopay/Ovo', type: 'ewallet' }
];

export const initialAccounting = [
  { id: 1, accountId: 1, type: 'kas', name: 'Modal Awal Tunai Laci', amount: 5000000, date: new Date().toISOString() },
  { id: 2, accountId: 2, type: 'kas', name: 'Saldo Awal Bank BCA', amount: 15000000, date: new Date().toISOString() },
  { id: 3, accountId: null, type: 'aset_tetap', name: 'Etalase Rak Besi & Timbangan', amount: 3500000, date: new Date().toISOString() },
  { id: 4, accountId: null, type: 'ekuitas', name: 'Modal Pemilik', amount: 23500000, date: new Date().toISOString() },
];