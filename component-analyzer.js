// Component Relationship Analyzer
// This script helps identify relationships between components in the codebase

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

async function analyzeComponentRelationships(componentName, directory = '.') {
  const results = {
    tsImplementations: [],
    templates: [],
    styles: [],
    references: []
  };
  
  // Define patterns to look for
  const patterns = {
    tsClass: new RegExp(`class\\s+${componentName}\\s*`, 'i'),
    tsReference: new RegExp(`\\b${componentName}\\b`, 'i'),
    templateReference: new RegExp(`templates/.*${componentName.toLowerCase()}.*\\.hbs`, 'i'),
    styleReference: new RegExp(`_${componentName.toLowerCase()}\\.scss|${componentName.toLowerCase()}`, 'i')
  };
  
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
      
      const ext = path.extname(entry.name).toLowerCase();
      
      try {
        const content = await readFileAsync(fullPath, 'utf8');
        
        // Check TypeScript/JavaScript files
        if (['.ts', '.js'].includes(ext)) {
          if (patterns.tsClass.test(content)) {
            results.tsImplementations.push({
              file: fullPath,
              type: 'Class Definition'
            });
          } else if (patterns.tsReference.test(content)) {
            results.references.push({
              file: fullPath,
              type: 'TypeScript Reference'
            });
          }
          
          // Look for template references
          if (patterns.templateReference.test(content)) {
            const templateMatches = content.match(new RegExp(`["']templates/.*${componentName.toLowerCase()}.*\\.hbs["']`, 'gi'));
            if (templateMatches) {
              templateMatches.forEach(match => {
                results.templates.push({
                  file: fullPath,
                  template: match.replace(/["']/g, '')
                });
              });
            }
          }
        }
        
        // Check template files
        if (ext === '.hbs') {
          const fileName = path.basename(fullPath, ext);
          if (fileName.toLowerCase().includes(componentName.toLowerCase())) {
            results.templates.push({
              file: fullPath,
              type: 'Handlebars Template'
            });
          }
        }
        
        // Check style files
        if (ext === '.scss' || ext === '.css') {
          if (patterns.styleReference.test(content) || 
              path.basename(fullPath, ext).toLowerCase().includes(componentName.toLowerCase())) {
            results.styles.push({
              file: fullPath,
              type: 'Style Definition'
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
module.exports = { analyzeComponentRelationships };

// If run directly from command line
if (require.main === module) {
  const componentName = process.argv[2];
  
  if (!componentName) {
    console.error('Please provide a component name to analyze');
    process.exit(1);
  }
  
  analyzeComponentRelationships(componentName)
    .then(results => {
      console.log(`Analysis for component "${componentName}":`);
      
      console.log('\nTS/JS Implementations:');
      results.tsImplementations.forEach(item => {
        console.log(`- ${item.file} (${item.type})`);
      });
      
      console.log('\nTemplates:');
      results.templates.forEach(item => {
        console.log(`- ${item.file} ${item.template ? `(Referenced as: ${item.template})` : `(${item.type})`}`);
      });
      
      console.log('\nStyles:');
      results.styles.forEach(item => {
        console.log(`- ${item.file} (${item.type})`);
      });
      
      console.log('\nOther References:');
      results.references.forEach(item => {
        console.log(`- ${item.file} (${item.type})`);
      });
    })
    .catch(error => {
      console.error('Error:', error);
    });
}
