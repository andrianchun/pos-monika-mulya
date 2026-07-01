const fs = require('fs');
const path = require('path');
const dirs = ['src', 'src/components', 'src/components/modals', 'src/components/ui', 'src/pages'];

const map = {
  'colors.bg': "'bg-app'",
  'colors.panel': "'bg-panel'",
  'colors.text': "'text-text-custom'",
  'colors.textMuted': "'text-text-muted'",
  'colors.border': "'border-border-custom'",
  'colors.creamBg': "'bg-cream-bg'",
  'colors.gold': "'text-gold'",
  'colors.goldBg': "'bg-gold'",
  'colors.goldHoverText': "'hover:text-gold'",
  'colors.goldHoverBorder': "'hover:border-gold'",
  'colors.goldRing': "'focus:ring-gold'",
  'colors.button': "'bg-gold text-[#18181B]'",
  'colors.header': "'bg-panel'"
};

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) return;
  const files = fs.readdirSync(fullPath);
  files.forEach(file => {
    if (file.endsWith('.jsx') && !file.includes('- Copy')) {
      const filePath = path.join(fullPath, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      let modified = false;
      Object.keys(map).forEach(key => {
        const regex = new RegExp(`(?<![a-zA-Z0-9_])${key.replace(/\\./g, '\\\\.')}(?![a-zA-Z0-9_])`, 'g');
        if (content.match(regex)) {
          content = content.replace(regex, map[key]);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated remaining colors in ${file}`);
      }
    }
  });
});
