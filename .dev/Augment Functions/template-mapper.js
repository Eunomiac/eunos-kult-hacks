// Template-to-Code Mapper
// This script helps map Handlebars templates to their usage in code

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

async function findAllTemplates(directory = './static/templates') {
  const templates = [];
  
  async function searchDirectory(dir) {
    try {
      const entries = await readdirAsync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = await statAsync(fullPath);
        
        if (stat.isDirectory()) {
          await searchDirectory(fullPath);
        } else if (path.extname(entry).toLowerCase() === '.hbs') {
          templates.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
  }
  
  await searchDirectory(directory);
  return templates;
}

async function findTemplateUsage(templatePath, directory = './src') {
  const results = [];
  const templateRelativePath = templatePath.replace(/^\.\//, '');
  const templateName = path.basename(templatePath);
  
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
            
            // Look for exact template path
            if (content.includes(templateRelativePath)) {
              results.push({
                file: fullPath,
                type: 'Exact Path Reference',
                reference: templateRelativePath
              });
            }
            
            // Look for template name
            if (content.includes(templateName)) {
              results.push({
                file: fullPath,
                type: 'Template Name Reference',
                reference: templateName
              });
            }
            
            // Look for renderTemplate calls that might use this template
            const renderTemplateRegex = /renderTemplate\s*\(\s*["']([^"']+)["']/g;
            let match;
            while ((match = renderTemplateRegex.exec(content)) !== null) {
              const templateRef = match[1];
              if (templateRef.includes(path.basename(templateName, '.hbs'))) {
                results.push({
                  file: fullPath,
                  type: 'renderTemplate Call',
                  reference: templateRef
                });
              }
            }
            
          } catch (error) {
            console.error(`Error reading file ${fullPath}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
  }
  
  await searchDirectory(directory);
  return results;
}

async function mapAllTemplates(templatesDir = './static/templates', sourceDir = './src') {
  const templates = await findAllTemplates(templatesDir);
  const mapping = {};
  
  for (const template of templates) {
    const usage = await findTemplateUsage(template, sourceDir);
    mapping[template] = usage;
  }
  
  return mapping;
}

// Export functions for use in other scripts
module.exports = { findAllTemplates, findTemplateUsage, mapAllTemplates };

// If run directly from command line
if (require.main === module) {
  const templatePath = process.argv[2];
  
  if (!templatePath) {
    console.log('No template specified, mapping all templates...');
    mapAllTemplates()
      .then(mapping => {
        console.log('Template to Code Mapping:');
        Object.entries(mapping).forEach(([template, usages]) => {
          console.log(`\nTemplate: ${template}`);
          if (usages.length === 0) {
            console.log('  No direct usage found');
          } else {
            usages.forEach(usage => {
              console.log(`  - ${usage.file} (${usage.type}: ${usage.reference})`);
            });
          }
        });
      })
      .catch(error => {
        console.error('Error:', error);
      });
  } else {
    findTemplateUsage(templatePath)
      .then(results => {
        console.log(`Usage of template "${templatePath}":`);
        if (results.length === 0) {
          console.log('No direct usage found');
        } else {
          results.forEach(result => {
            console.log(`- ${result.file} (${result.type}: ${result.reference})`);
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }
}
