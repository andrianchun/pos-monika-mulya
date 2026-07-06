const fs = require('fs');
let c = fs.readFileSync('src/components/Header.jsx', 'utf8');
// Fix the broken template literal - single quotes wrapping ${colors.goldBg}/10 ${colors.gold}
const broken = "'${colors.goldBg}/10 ${colors.gold}'";
const fixed = '`bg-[#D4AF37]/10 text-[#D4AF37]`';
const count = (c.match(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
c = c.split(broken).join(fixed);
fs.writeFileSync('src/components/Header.jsx', c, 'utf8');
console.log('Fixed', count, 'occurrences of broken template literal in Header.jsx');
