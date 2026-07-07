const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'PosApp.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rename fungsi utama & tambahkan useParams
content = content.replace(/function App\(\) \{/, 'export default function PosApp() {\n  const { tenantId } = require("react-router-dom").useParams();\n  const navigate = require("react-router-dom").useNavigate();\n  \n  // Pastikan URL tenant valid\n  if (!tenantId) return <div>Invalid Tenant URL</div>;\n');

// 2. Buat Helper Fungsi Koleksi
const helperCode = `
  const getTenantCollection = (colName) => {
    // Koleksi users dan settings sekarang pindah ke tenant
    return collection(db, "tenants", tenantId, colName);
  };
`;
// Sisipkan helper di awal PosApp (setelah useState deklarasi)
content = content.replace(/const \[user, setUser\] = useState\(null\);/, `const [user, setUser] = useState(null);\n${helperCode}`);

// 3. Refactor Pemanggilan collection(db, "users") di awal onAuthStateChanged 
// Sebenarnya kita butuh memvalidasi global_users untuk admin (jika perlu), tapi untuk saat ini
// PosApp hanya mengurusi UI kasir, dan jika user masuk, dia membaca dari tenants/{tenantId}/users
content = content.replace(/collection\(db, "users"\)/g, 'getTenantCollection("users")');
content = content.replace(/collection\(db, "settings"\)/g, 'getTenantCollection("settings")');
content = content.replace(/collection\(db, colName\)/g, 'getTenantCollection(colName)');

// 4. Refactor fungsi customSet (Products, dll) yang menggunakan `syncCollection("nama")`
// syncCollection memiliki deklarasi: const syncCollection = async (colName, data, prevData) => {
// Di dalam syncCollection ada getDocsFromServer(collection(db, colName)).
// Karena kita ubah collection(db, colName) ke getTenantCollection(colName), otomatis syncCollection juga ter-update!
content = content.replace(/collection\(db, 'settings'\)/g, 'getTenantCollection("settings")');
content = content.replace(/doc\(db, colName, /g, 'doc(db, "tenants", tenantId, colName, ');

// Fix import App di main.jsx tidak perlu diubah jika kita membuat App.jsx baru
// Tapi tunggu, default export dari PosApp.jsx dulunya "export default App;". Kita hapus export lama.
content = content.replace(/export default App;/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('PosApp.jsx refactored for Multi-Tenant routing.');
