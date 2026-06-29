const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else {
      if (dirPath.endsWith('.jsx')) {
        callback(dirPath);
      }
    }
  });
}

const dir = path.join(__dirname, 'src');
let filesChanged = 0;

walk(dir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Comprehensive replacements to eliminate the bluish gray-800 tailwind color in dark mode
  content = content.replace(/bg-gray-50 dark:bg-gray-800\/40/g, 'bg-[#F8FAFC] dark:bg-[#1F1F22]/40');
  content = content.replace(/bg-gray-100 dark:bg-gray-800\/40/g, 'bg-[#F8FAFC] dark:bg-[#1F1F22]/40');
  
  content = content.replace(/bg-gray-50 dark:bg-gray-800/g, 'bg-[#F8FAFC] dark:bg-[#1F1F22]');
  content = content.replace(/bg-gray-100 dark:bg-gray-800/g, 'bg-[#F8FAFC] dark:bg-[#1F1F22]');
  content = content.replace(/bg-gray-200 dark:bg-gray-800/g, 'bg-[#E2E8F0] dark:bg-[#1F1F22]');
  content = content.replace(/bg-gray-300 dark:bg-gray-800/g, 'bg-[#CBD5E1] dark:bg-[#1F1F22]');
  
  content = content.replace(/dark:hover:bg-gray-800/g, 'dark:hover:bg-[#1F1F22]');
  content = content.replace(/hover:bg-gray-100 dark:bg-gray-800/g, 'hover:bg-[#F8FAFC] dark:bg-[#1F1F22]');
  
  content = content.replace(/dark:bg-gray-800/g, 'dark:bg-[#1F1F22]');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesChanged++;
    console.log('Fixed:', filePath);
  }
});

console.log(`Finished. Fixed ${filesChanged} files.`);
