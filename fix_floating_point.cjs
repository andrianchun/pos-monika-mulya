const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/utils/helpers.js');
let content = fs.readFileSync(file, 'utf8');

const oldFormatIDR = `export const formatIDR = (val) => {
  if (val === null || val === undefined || val === '') return '';
  let numVal = typeof val === 'number' ? val : parseIDR(val);
  if (isNaN(numVal)) return '';
  
  let isNegative = numVal < 0;
  let absVal = Math.abs(numVal);
  
  let parts = absVal.toString().split('.');`;

const newFormatIDR = `export const formatIDR = (val) => {
  if (val === null || val === undefined || val === '') return '';
  let numVal = typeof val === 'number' ? val : parseIDR(val);
  if (isNaN(numVal)) return '';
  
  let isNegative = numVal < 0;
  let absVal = Math.abs(numVal);
  
  // SMART ROUNDING:
  // 1. Remove JavaScript floating point imprecision (e.g. 0.1+0.2=0.30000000000000004)
  absVal = parseFloat(absVal.toFixed(10));
  // 2. Cap to maximum 4 decimal places for business logic consistency
  absVal = Math.round(absVal * 10000) / 10000;
  
  let parts = absVal.toString().split('.');`;

content = content.replace(oldFormatIDR, newFormatIDR);

fs.writeFileSync(file, content, 'utf8');
console.log('Floating point fix applied to formatIDR.');
