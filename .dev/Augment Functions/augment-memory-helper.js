// Augment Memory Helper
// This script helps create a memory of the codebase structure for Augment AI

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function createCodebaseMemory(directory = '.', outputFile = 'codebase-memory.json') {
  const memory = {
    components: {},
    templates: {},
    styles: {},
    relationships: {}
  };
  
  // Find TypeScript classes
  async function findTSClasses(dir) {
    const classes = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.typescript-build'].includes(entry.name)) {
          classes.push(...await findTSClasses(fullPath));
        }
      } else if (['.ts', '.js'].includes(path.extname(entry.name).toLowerCase())) {
        try {
          const content = await readFileAsync(fullPath, 'utf8');
          const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
          let match;
          
          while ((match = classRegex.exec(content)) !== null) {
            classes.push({
              name: match[1],
              extends: match[2] || null,
              file: fullPath
            });
          }
        } catch (error) {
          console.error(`Error reading file ${fullPath}:`, error.message);
        }
      }
    }
    
    return classes;
  }
  
  // Find templates
  async function findTemplates(dir = './static/templates') {
    const templates = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          templates.push(...await findTemplates(fullPath));
        } else if (path.extname(entry.name).toLowerCase() === '.hbs') {
          templates.push({
            name: entry.name,
            path: fullPath
          });
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
    
    return templates;
  }
  
  // Find styles
  async function findStyles(dir = './src/styles') {
    const styles = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          styles.push(...await findStyles(fullPath));
        } else if (['.scss', '.css'].includes(path.extname(entry.name).toLowerCase())) {
          styles.push({
            name: entry.name,
            path: fullPath
          });
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
    
    return styles;
  }
  
  // Find relationships between components, templates, and styles
  async function findRelationships(classes, templates, styles) {
    const relationships = {};
    
    for (const cls of classes) {
      relationships[cls.name] = {
        templates: [],
        styles: []
      };
      
      try {
        const content = await readFileAsync(cls.file, 'utf8');
        
        // Find template references
        for (const template of templates) {
          const templateBaseName = path.basename(template.path, '.hbs');
          if (content.includes(template.path) || content.includes(templateBaseName)) {
            relationships[cls.name].templates.push(template.path);
          }
        }
        
        // Find style references (this is more of a guess based on naming conventions)
        for (const style of styles) {
          const styleBaseName = path.basename(style.path, path.extname(style.path));
          const classNameLower = cls.name.toLowerCase();
          
          if (styleBaseName.includes(classNameLower) || 
              content.includes(styleBaseName) || 
              styleBaseName === '_' + classNameLower) {
            relationships[cls.name].styles.push(style.path);
          }
        }
      } catch (error) {
        console.error(`Error analyzing relationships for ${cls.name}:`, error.message);
      }
    }
    
    return relationships;
  }
  
  // Execute the analysis
  const classes = await findTSClasses(directory);
  const templates = await findTemplates();
  const styles = await findStyles();
  const relationships = await findRelationships(classes, templates, styles);
  
  // Build the memory object
  memory.components = classes.reduce((acc, cls) => {
    acc[cls.name] = {
      file: cls.file,
      extends: cls.extends
    };
    return acc;
  }, {});
  
  memory.templates = templates.reduce((acc, tpl) => {
    acc[tpl.path] = {
      name: tpl.name
    };
    return acc;
  }, {});
  
  memory.styles = styles.reduce((acc, style) => {
    acc[style.path] = {
      name: style.name
    };
    return acc;
  }, {});
  
  memory.relationships = relationships;
  
  // Write to file
  await writeFileAsync(outputFile, JSON.stringify(memory, null, 2));
  
  return memory;
}

// Export the function for use in other scripts
module.exports = { createCodebaseMemory };

// If run directly from command line
if (require.main === module) {
  createCodebaseMemory()
    .then(memory => {
      console.log('Codebase memory created successfully!');
      console.log(`Found ${Object.keys(memory.components).length} components`);
      console.log(`Found ${Object.keys(memory.templates).length} templates`);
      console.log(`Found ${Object.keys(memory.styles).length} styles`);
    })
    .catch(error => {
      console.error('Error creating codebase memory:', error);
    });
}
