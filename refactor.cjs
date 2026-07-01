const fs = require('fs');
const path = require('path');

const dirs = [
  'src',
  'src/components',
  'src/components/modals',
  'src/components/ui',
  'src/pages'
];

const replacements = [
  { regex: /\$\{colors\.bg\}/g, replacement: 'bg-app' },
  { regex: /\$\{colors\.panel\}/g, replacement: 'bg-panel' },
  { regex: /\$\{colors\.text\}/g, replacement: 'text-text-custom' },
  { regex: /\$\{colors\.textMuted\}/g, replacement: 'text-text-muted' },
  { regex: /\$\{colors\.border\}/g, replacement: 'border-border-custom' },
  { regex: /\$\{colors\.creamBg\}/g, replacement: 'bg-cream-bg' },
  { regex: /\$\{colors\.gold\}/g, replacement: 'text-gold' },
  { regex: /\$\{colors\.goldBg\}/g, replacement: 'bg-gold' },
  { regex: /\$\{colors\.goldHoverText\}/g, replacement: 'hover:text-gold' },
  { regex: /\$\{colors\.goldHoverBorder\}/g, replacement: 'hover:border-gold' },
  { regex: /\$\{colors\.goldRing\}/g, replacement: 'focus:ring-gold' },
  { regex: /\$\{colors\.button\}/g, replacement: 'bg-gold text-[#18181B]' },
  
  { regex: /className=\{colors\.bg\}/g, replacement: 'className="bg-app"' },
  { regex: /className=\{colors\.panel\}/g, replacement: 'className="bg-panel"' },
  
  // Clean up specific hex codes that shouldn't be hardcoded anymore
  { regex: /bg-\[\#D4AF37\]/g, replacement: 'bg-gold' },
  { regex: /text-\[\#D4AF37\]/g, replacement: 'text-gold' },
  { regex: /border-\[\#D4AF37\]/g, replacement: 'border-gold' },
  { regex: /ring-\[\#D4AF37\]/g, replacement: 'ring-gold' },
  { regex: /shadow-\[\#D4AF37\]/g, replacement: 'shadow-gold' },
  { regex: /from-\[\#D4AF37\]/g, replacement: 'from-gold' }
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) return;
  
  const files = fs.readdirSync(fullPath);
  files.forEach(file => {
    if (file.endsWith('.jsx') && !file.includes('- Copy')) {
      const filePath = path.join(fullPath, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      let modified = false;
      replacements.forEach(r => {
        if (content.match(r.regex)) {
          content = content.replace(r.regex, r.replacement);
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  });
});
