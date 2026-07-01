const fs = require('fs');
const path = require('path');
const files = ['src/components/modals/ShiftCloseModal.jsx', 'src/components/modals/ShiftOpenModal.jsx'];

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
  // Assuming the function declaration looks like: function ShiftCloseModal({ isOpen, onClose, ... })
  if (!content.includes('colors,')) {
    content = content.replace(/function\s+\w+\(\s*\{/, '$& colors, ');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Reverted untracked file ${file}`);
});
