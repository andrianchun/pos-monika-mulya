const fs = require('fs');
const path = require('path');
const dirs = ['src', 'src/components', 'src/components/modals', 'src/components/ui', 'src/pages'];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) return;
  const files = fs.readdirSync(fullPath);
  files.forEach(file => {
    if (file.endsWith('.jsx') && !file.includes('- Copy')) {
      const filePath = path.join(fullPath, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      let modified = false;

      // Ensure we don't accidentally replace already fixed ones
      // Use negative lookahead to avoid replacing bg-panel/40 if it's already there
      const panelRegex = /bg-panel(?!\/40)/g;
      if (content.match(panelRegex)) {
        content = content.replace(panelRegex, 'bg-panel/40 backdrop-blur-xl');
        modified = true;
      }

      const creamBgRegex = /bg-cream-bg(?!\/40)/g;
      if (content.match(creamBgRegex)) {
        content = content.replace(creamBgRegex, 'bg-cream-bg/40');
        modified = true;
      }

      const borderRegex = /border-border-custom(?!\/50)/g;
      if (content.match(borderRegex)) {
        content = content.replace(borderRegex, 'border-border-custom/50');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Restored opacities in ${file}`);
      }
    }
  });
});
