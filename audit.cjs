const fs = require('fs');
const path = require('path');
const errors = [];
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      const code = fs.readFileSync(fullPath, 'utf-8');
      
      const importedVars = new Set(['React', 'Suspense', 'lazy', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'Fragment']);
      const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))(?:\s+from)?\s+['"][^'"]+['"]/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        if (match[1]) {
           match[1].split(',').forEach(v => {
              const name = v.trim().split(/\s+as\s+/)[0].trim();
              if (name) importedVars.add(name);
           });
        }
        if (match[2]) importedVars.add(match[2].trim());
      }
      
      ['Route', 'Link', 'Routes', 'BrowserRouter', 'Navigate'].forEach(v => importedVars.add(v));
      
      const componentRegex = /<([A-Z][a-zA-Z0-9_]*)/g;
      let compMatch;
      while ((compMatch = componentRegex.exec(code)) !== null) {
        const compName = compMatch[1];
        if (!importedVars.has(compName) && !code.includes('const ' + compName + ' =') && !code.includes('function ' + compName) && !code.includes('class ' + compName)) {
           errors.push({ file: fullPath, component: compName });
        }
      }
    }
  }
}
walk('./src');
console.log('Potensi Missing Imports:');
console.table(errors);
