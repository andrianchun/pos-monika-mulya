const fs = require('fs');
const files = [
  'src/components/Sidebar.jsx',
  'src/components/Header.jsx',
  'src/components/modals/ShiftCloseModal.jsx',
  'src/components/modals/ShiftOpenModal.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Fix exact className="${colors.gold}" to className={colors.gold}
  content = content.replace(/className="\$\{colors\.([^}]+)\}"/g, 'className={colors.$1}');
  
  // 2. Fix className="... ${colors...} ..." to className={`... ${colors...} ...`}
  content = content.replace(/className="([^"]*\$\{colors\.[^"]*)"/g, 'className={`$1`}');
  
  // 3. Fix double nested ${'${colors.panel}'}
  content = content.replace(/\$\{'(\$\{colors\.[^}]+})'\}/g, '$1');
  
  // 4. Fix string literals assigned to variables like const activeBg = '${colors.goldBg}'
  content = content.replace(/'\$\{colors\.([^}]+)\}'/g, 'colors.$1');
  
  // 5. Fix group-hover:${colors.goldBg}/10 inside strings that are ALREADY backticked!
  // wait, if it was already backticked, it's correct! But wait, is it backticked?
  // Let's check: className={`...`} handles it. But what if it's not a className, just a string?
  
  fs.writeFileSync(file, content);
  console.log('Fixed quotes in', file);
});
