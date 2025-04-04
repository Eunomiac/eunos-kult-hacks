// Function Finder
// This script helps locate function implementations across the codebase

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

async function findFunctionReferences(functionName, directory = '.', extensions = ['.ts', '.js', '.scss', '.hbs']) {
  const results = [];
  
  async function searchDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules, dist, and .git directories
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.typescript-build'].includes(entry.name)) {
          await searchDirectory(fullPath);
        }
        continue;
      }
      
      // Check if file has one of the target extensions
      const ext = path.extname(entry.name).toLowerCase();
      if (!extensions.includes(ext)) continue;
      
      try {
        const content = await readFileAsync(fullPath, 'utf8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(functionName)) {
            results.push({
              file: fullPath,
              line: i + 1,
              content: lines[i].trim(),
              context: lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n')
            });
          }
        }
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error.message);
      }
    }
  }
  
  await searchDirectory(directory);
  return results;
}

// Export the function for use in other scripts
module.exports = { findFunctionReferences };

// If run directly from command line
if (require.main === module) {
  const functionName = process.argv[2];
  
  if (!functionName) {
    console.error('Please provide a function name to search for');
    process.exit(1);
  }
  
  findFunctionReferences(functionName)
    .then(results => {
      console.log(`Found ${results.length} references to "${functionName}":`);
      results.forEach(result => {
        console.log(`\nFile: ${result.file}`);
        console.log(`Line: ${result.line}`);
        console.log(`Content: ${result.content}`);
        console.log('Context:');
        console.log(result.context);
        console.log('-'.repeat(80));
      });
    })
    .catch(error => {
      console.error('Error:', error);
    });
}
