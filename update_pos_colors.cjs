const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/POS.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add useMemo
content = content.replace(
  "import React, { useState, useEffect } from 'react';", 
  "import React, { useState, useEffect, useMemo } from 'react';"
);

// 2. Fix ModeToggle
content = content.replace(
  /hover:text-\[\#D4AF37\]/g, 
  "${colors.goldHoverText}"
);

// 3. Rename colors to baseColors in POS props
content = content.replace(
  "purchases, setPurchases, colors, showToast", 
  "purchases, setPurchases, colors: baseColors, showToast"
);

// 4. Add dynamic colors useMemo
const colorDef = `  const [posMode, setPosMode] = useState('penjualan'); 
  
  const colors = useMemo(() => {
    if (posMode === 'pembelian') {
      return {
        ...baseColors,
        gold: 'text-blue-500',
        goldBg: 'bg-blue-500',
        goldHoverText: 'hover:text-blue-500',
        goldHoverBorder: 'hover:border-blue-500',
        goldRing: 'focus:ring-blue-500'
      };
    }
    return {
      ...baseColors,
      goldHoverText: 'hover:text-[#D4AF37]',
      goldHoverBorder: 'hover:border-[#D4AF37]',
      goldRing: 'focus:ring-[#D4AF37]'
    };
  }, [posMode, baseColors]);
`;
content = content.replace(
  "  const [posMode, setPosMode] = useState('penjualan'); ", 
  colorDef
);

// 5. Replace remaining hardcoded D4AF37 instances
content = content.replace(/hover:border-\[\#D4AF37\]/g, "${colors.goldHoverBorder}");
content = content.replace(/focus:ring-\[\#D4AF37\]/g, "${colors.goldRing}");
content = content.replace(/group-hover:text-\[\#D4AF37\]/g, "${colors.goldHoverText.replace('hover:', 'group-hover:')}");

// 6. Fix the bug in the subtotal string: ${posMode === 'penjualan' ? colors.gold : '${colors.gold}'}
content = content.replace(
  /\$\{posMode === 'penjualan' \? colors\.gold : '\$\{colors\.gold\}'\}/g, 
  "${colors.gold}"
);

fs.writeFileSync(file, content, 'utf8');
console.log('POS.jsx updated.');
