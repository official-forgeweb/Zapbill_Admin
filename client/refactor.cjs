const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Text colors
  content = content.replace(/text-white/g, 'text-slate-900');
  
  // Revert buttons to text-white
  content = content.replace(/bg-gradient-to-r([^">]+)text-slate-900/g, 'bg-gradient-to-r$1text-white');
  content = content.replace(/bg-primary-500([^">]+)text-slate-900/g, 'bg-primary-500$1text-white');
  content = content.replace(/Zap size=\{32\} className="text-slate-900"/g, 'Zap size={32} className="text-white"');
  content = content.replace(/Zap size=\{20\} className="text-slate-900"/g, 'Zap size={20} className="text-white"');
  
  // Backgrounds
  content = content.replace(/bg-dark-950/g, 'bg-slate-50');
  content = content.replace(/bg-dark-900\/80/g, 'bg-white/80');
  content = content.replace(/bg-dark-900\/50/g, 'bg-white/50');
  content = content.replace(/bg-dark-800\/80/g, 'bg-slate-50/80');
  content = content.replace(/bg-dark-900/g, 'bg-white');
  content = content.replace(/bg-dark-800/g, 'bg-slate-50');
  content = content.replace(/bg-dark-700/g, 'bg-slate-200');
  
  // Borders
  content = content.replace(/border-dark-800/g, 'border-slate-200');
  content = content.replace(/border-dark-700/g, 'border-slate-300');
  
  // Text colors based on original dark numbers
  content = content.replace(/text-dark-100/g, 'text-slate-800');
  content = content.replace(/text-dark-200/g, 'text-slate-700');
  content = content.replace(/text-dark-300/g, 'text-slate-600');
  content = content.replace(/text-dark-400/g, 'text-slate-500');
  content = content.replace(/text-dark-500/g, 'text-slate-400');
  content = content.replace(/text-dark-600/g, 'text-slate-400');
  
  // Placeholders
  content = content.replace(/placeholder-dark-500/g, 'placeholder-slate-400');

  // Specific corrections
  content = content.replace(/hover:bg-dark-800/g, 'hover:bg-slate-100');
  content = content.replace(/hover:bg-dark-700/g, 'hover:bg-slate-200');

  fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      replaceInFile(fullPath);
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
console.log('Class mapping complete!');
