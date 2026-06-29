const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/utils/helpers.js');
let content = fs.readFileSync(file, 'utf8');

const oldFunctions = `export const formatIDR = (val) => {
  if (val === null || val === undefined || val === '') return '';
  
  let isNegative = false;
  let processVal = val;
  
  if (typeof processVal === 'number') {
    processVal = Math.round(processVal);
    if (processVal < 0) isNegative = true;
  } else if (typeof processVal === 'string') {
    if (processVal.trim().startsWith('-')) isNegative = true;
  }
  
  const numString = processVal.toString().replace(/[^0-9]/g, '');
  if (numString === '') return '';
  
  const formatted = numString.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
  return isNegative ? \`-\${formatted}\` : formatted;
};

export const parseIDR = (val) => {
  if (!val && val !== 0) return 0;
  
  const isNegative = typeof val === 'number' ? val < 0 : val.toString().trim().startsWith('-');
  const parsed = parseInt(val.toString().replace(/[^0-9]/g, ''), 10) || 0;
  return isNegative ? -parsed : parsed;
};`;

const newFunctions = `export const parseIDR = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  let str = val.toString();
  // Strip all dots (thousands separators)
  str = str.replace(/\\./g, '');
  // Replace comma with dot for float parsing
  str = str.replace(/,/g, '.');
  let isNegative = str.trim().startsWith('-');
  // Remove anything except digits and the decimal point
  str = str.replace(/[^0-9.]/g, '');
  
  let parsed = parseFloat(str) || 0;
  return isNegative ? -parsed : parsed;
};

export const formatIDR = (val) => {
  if (val === null || val === undefined || val === '') return '';
  let numVal = typeof val === 'number' ? val : parseIDR(val);
  if (isNaN(numVal)) return '';
  
  let isNegative = numVal < 0;
  let absVal = Math.abs(numVal);
  
  let parts = absVal.toString().split('.');
  let intPart = parts[0];
  let decPart = parts.length > 1 ? parts[1] : null;
  
  let formattedInt = intPart.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
  
  let result = formattedInt;
  if (decPart !== null) {
    result += ',' + decPart;
  }
  return isNegative ? '-' + result : result;
};

// Smart string formatter for input fields (keeps trailing comma while typing)
export const smartFormatInput = (val) => {
  if (!val && val !== 0) return '';
  let str = val.toString();
  
  // MAGIC DECIMAL: If user types a dot at the very end, convert it to a comma
  if (str.endsWith('.')) {
    str = str.slice(0, -1) + ',';
  }
  
  // Clean up: allow only digits, dots, and commas
  let cleanStr = str.replace(/[^0-9,.]/g, '');
  if (!cleanStr) return '';
  
  // Keep only the FIRST comma
  let parts = cleanStr.split(',');
  let intPart = parts[0];
  let decPart = parts.length > 1 ? parts.slice(1).join('') : null;
  
  // Remove all dots from integer part (they will be rebuilt as thousands separators)
  intPart = intPart.replace(/\\./g, '');
  
  // Format integer part
  let formattedInt = intPart.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
  
  // Reattach the comma and decimal part
  if (decPart !== null) {
    return formattedInt + ',' + decPart;
  }
  return formattedInt;
};`;

content = content.replace(oldFunctions, newFunctions);
fs.writeFileSync(file, content, 'utf8');
console.log('helpers.js updated.');
