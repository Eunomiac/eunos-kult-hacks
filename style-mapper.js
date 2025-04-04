// Style-to-DOM Mapper
// This script helps map SCSS styles to their DOM elements

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

async function findStyleSelectors(stylePath) {
  try {
    const content = await readFileAsync(stylePath, 'utf8');
    const selectors = [];
    
    // Simple regex to extract selectors (not perfect but works for basic cases)
    const selectorRegex = /([.#][a-zA-Z0-9_-]+)(?:\s*[,{])/g;
    let match;
    
    while ((match = selectorRegex.exec(content)) !== null) {
      selectors.push(match[1]);
    }
    
    // Also look for ID selectors in the form #ID-NAME
    const idRegex = /#([A-Z0-9_-]+)(?:\s*[,{])/g;
    while ((match = idRegex.exec(content)) !== null) {
      selectors.push(`#${match[1]}`);
    }
    
    return [...new Set(selectors)]; // Remove duplicates
  } catch (error) {
    console.error(`Error reading style file ${stylePath}:`, error.message);
    return [];
  }
}

async function findSelectorsInTemplates(selectors, templatesDir = './static/templates') {
  const results = {};
  
  for (const selector of selectors) {
    results[selector] = [];
  }
  
  async function searchDirectory(dir) {
    try {
      const entries = await readdirAsync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = await statAsync(fullPath);
        
        if (stat.isDirectory()) {
          await searchDirectory(fullPath);
        } else if (path.extname(entry).toLowerCase() === '.hbs') {
          try {
            const content = await readFileAsync(fullPath, 'utf8');
            
            for (const selector of selectors) {
              // For class selectors
              if (selector.startsWith('.')) {
                const className = selector.substring(1);
                if (content.includes(`class="${className}"`) || 
                    content.includes(`class="${className} `) || 
                    content.includes(` ${className}"`) || 
                    content.includes(`class='${className}'`) || 
                    content.includes(`class='${className} `) || 
                    content.includes(` ${className}'`)) {
                  results[selector].push({
                    file: fullPath,
                    type: 'Class Attribute'
                  });
                }
                
                // Check for dynamic classes
                if (content.includes(`{{#if`) && content.includes(className)) {
                  results[selector].push({
                    file: fullPath,
                    type: 'Potential Dynamic Class'
                  });
                }
              }
              
              // For ID selectors
              if (selector.startsWith('#')) {
                const idName = selector.substring(1);
                if (content.includes(`id="${idName}"`) || 
                    content.includes(`id='${idName}'`)) {
                  results[selector].push({
                    file: fullPath,
                    type: 'ID Attribute'
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error reading template file ${fullPath}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
  }
  
  await searchDirectory(templatesDir);
  return results;
}

async function findSelectorsInJSTS(selectors, sourceDir = './src') {
  const results = {};
  
  for (const selector of selectors) {
    results[selector] = [];
  }
  
  async function searchDirectory(dir) {
    try {
      const entries = await readdirAsync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = await statAsync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', '.git', '.typescript-build'].includes(entry)) {
            await searchDirectory(fullPath);
          }
        } else if (['.ts', '.js'].includes(path.extname(entry).toLowerCase())) {
          try {
            const content = await readFileAsync(fullPath, 'utf8');
            
            for (const selector of selectors) {
              // For class selectors
              if (selector.startsWith('.')) {
                const className = selector.substring(1);
                if (content.includes(`"${className}"`) || 
                    content.includes(`'${className}'`) || 
                    content.includes(`addClass("${className}")`) || 
                    content.includes(`addClass('${className}')`)) {
                  results[selector].push({
                    file: fullPath,
                    type: 'String Reference'
                  });
                }
              }
              
              // For ID selectors
              if (selector.startsWith('#')) {
                const idName = selector.substring(1);
                if (content.includes(`"${idName}"`) || 
                    content.includes(`'${idName}'`) || 
                    content.includes(`$("#${idName}")`) || 
                    content.includes(`$('#${idName}')`)) {
                  results[selector].push({
                    file: fullPath,
                    type: 'String Reference'
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error reading source file ${fullPath}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
  }
  
  await searchDirectory(sourceDir);
  return results;
}

async function mapStyleToDOM(stylePath, templatesDir = './static/templates', sourceDir = './src') {
  const selectors = await findStyleSelectors(stylePath);
  const templateUsage = await findSelectorsInTemplates(selectors, templatesDir);
  const sourceUsage = await findSelectorsInJSTS(selectors, sourceDir);
  
  const results = {};
  
  for (const selector of selectors) {
    results[selector] = {
      templates: templateUsage[selector],
      sources: sourceUsage[selector]
    };
  }
  
  return results;
}

// Export functions for use in other scripts
module.exports = { findStyleSelectors, findSelectorsInTemplates, findSelectorsInJSTS, mapStyleToDOM };

// If run directly from command line
if (require.main === module) {
  const stylePath = process.argv[2];
  
  if (!stylePath) {
    console.error('Please provide a style file path to analyze');
    process.exit(1);
  }
  
  mapStyleToDOM(stylePath)
    .then(mapping => {
      console.log(`Style-to-DOM mapping for "${stylePath}":`);
      
      Object.entries(mapping).forEach(([selector, usage]) => {
        console.log(`\nSelector: ${selector}`);
        
        console.log('  Template Usage:');
        if (usage.templates.length === 0) {
          console.log('    No direct usage found in templates');
        } else {
          usage.templates.forEach(item => {
            console.log(`    - ${item.file} (${item.type})`);
          });
        }
        
        console.log('  Source Code Usage:');
        if (usage.sources.length === 0) {
          console.log('    No direct usage found in source code');
        } else {
          usage.sources.forEach(item => {
            console.log(`    - ${item.file} (${item.type})`);
          });
        }
      });
    })
    .catch(error => {
      console.error('Error:', error);
    });
}
