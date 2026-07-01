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
      // Remove colors={...} from JSX tags
      if (content.match(/colors=\{[^}]+\}/g)) {
        content = content.replace(/\s+colors=\{[^}]+\}/g, '');
        modified = true;
      }
      
      // Remove baseColors={...} from JSX tags
      if (content.match(/baseColors=\{[^}]+\}/g)) {
        content = content.replace(/\s+baseColors=\{[^}]+\}/g, '');
        modified = true;
      }
      
      // Remove colors from destructuring props
      if (content.match(/,\s*colors\s*(?=,|})/g)) {
         content = content.replace(/,\s*colors\s*(?=,|})/g, '');
         modified = true;
      }
      if (content.match(/\{\s*colors\s*,/g)) {
         content = content.replace(/\{\s*colors\s*,/g, '{ ');
         modified = true;
      }
      if (content.match(/\{\s*colors\s*\}/g)) {
         content = content.replace(/\{\s*colors\s*\}/g, '{}');
         modified = true;
      }
      
      // Remove baseColors from destructuring props
      if (content.match(/,\s*baseColors\s*(?=,|})/g)) {
         content = content.replace(/,\s*baseColors\s*(?=,|})/g, '');
         modified = true;
      }
      if (content.match(/\{\s*baseColors\s*,/g)) {
         content = content.replace(/\{\s*baseColors\s*,/g, '{ ');
         modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated props in ${file}`);
      }
    }
  });
});
