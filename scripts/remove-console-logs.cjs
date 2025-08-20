#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to process
const patterns = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx'
];

// Statistics
let totalRemoved = 0;
let filesModified = 0;
const fileStats = {};

// Function to remove console statements
function removeConsoleLogs(content, filePath) {
  const lines = content.split('\n');
  const newLines = [];
  let removedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line contains console.log, console.error, console.warn, console.debug
    if (line.match(/^\s*console\.(log|error|warn|debug|info|trace|table|time|timeEnd|group|groupEnd)\(/)) {
      // Skip single-line console statements
      removedCount++;
      continue;
    }
    
    // Check for multi-line console statements
    if (line.match(/console\.(log|error|warn|debug|info|trace|table|time|timeEnd|group|groupEnd)\(/)) {
      // If it's not a complete statement (doesn't end with ;), skip multiple lines
      if (!line.includes(';')) {
        let j = i + 1;
        while (j < lines.length && !lines[j].includes(';')) {
          j++;
        }
        if (j < lines.length) {
          removedCount += (j - i + 1);
          i = j; // Skip to the end of the console statement
          continue;
        }
      } else {
        // Single line console statement embedded in the line
        const cleanedLine = line.replace(/console\.(log|error|warn|debug|info|trace|table|time|timeEnd|group|groupEnd)\([^;]*\);?/g, '');
        if (cleanedLine.trim()) {
          newLines.push(cleanedLine);
        } else {
          removedCount++;
          continue;
        }
      }
    } else {
      newLines.push(line);
    }
  }
  
  if (removedCount > 0) {
    fileStats[filePath] = removedCount;
    totalRemoved += removedCount;
    filesModified++;
  }
  
  return newLines.join('\n');
}

// Process all files
console.log('🧹 Starting console.log cleanup...\n');

patterns.forEach(pattern => {
  const files = glob.sync(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] });
  
  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeConsoleLogs(content, filePath);
    
    if (fileStats[filePath]) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      console.log(`✓ ${filePath}: Removed ${fileStats[filePath]} console statements`);
    }
  });
});

console.log('\n📊 Cleanup Summary:');
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total console statements removed: ${totalRemoved}`);

// Show top offenders
if (Object.keys(fileStats).length > 0) {
  console.log('\n🔝 Top files cleaned:');
  const sorted = Object.entries(fileStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sorted.forEach(([file, count]) => {
    console.log(`   ${count.toString().padStart(3)} | ${file}`);
  });
}

console.log('\n✅ Console cleanup complete!');