const fs = require('fs');
const path = require('path');
const files = ['temp/Sidebar.jsx', 'temp/Header.jsx', 'temp/ShiftCloseModal.jsx'];

const map = {
  'bg-app': '${colors.bg}',
  'bg-panel/40 backdrop-blur-xl': '${colors.panel}',
  'bg-panel': '${colors.panel}',
  'text-text-custom': '${colors.text}',
  'text-text-muted': '${colors.textMuted}',
  'border-border-custom/50': '${colors.border}',
  'border-border-custom': '${colors.border}',
  'bg-cream-bg/40': '${colors.creamBg}',
  'bg-cream-bg': '${colors.creamBg}',
  'text-gold': '${colors.gold}',
  'bg-gold text-[#18181B]': '${colors.button}',
  'bg-gold': '${colors.goldBg}',
  'hover:text-gold': '${colors.goldHoverText}',
  'hover:border-gold': '${colors.goldHoverBorder}',
  'focus:ring-gold': '${colors.goldRing}'
};

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  Object.keys(map).forEach(key => {
    // replace literal strings that we added
    const regex = new RegExp(key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    content = content.replace(regex, map[key]);
  });
  
  // also add colors to props if missing
  if (!content.includes('colors,')) {
    content = content.replace(/function\s+\w+\(\s*\{/, '$& colors, ');
  }

  // Then write it back
  fs.writeFileSync(filePath, content, 'utf8');
  
  // Copy to original locations
  if (file.includes('Sidebar.jsx')) fs.copyFileSync(filePath, path.join(__dirname, 'src/components/Sidebar.jsx'));
  if (file.includes('Header.jsx')) fs.copyFileSync(filePath, path.join(__dirname, 'src/components/Header.jsx'));
  if (file.includes('ShiftCloseModal.jsx')) fs.copyFileSync(filePath, path.join(__dirname, 'src/components/modals/ShiftCloseModal.jsx'));
  
  console.log(`Reverted and copied ${file}`);
});
