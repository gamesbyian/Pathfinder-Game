import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';

// Allowlist of classes that are either dynamic hooks or don't need explicit CSS definitions
const ALLOWLIST = new Set([
  // Dynamic state classes manipulated by JavaScript
  'hidden', 'show', 'selected', 'active', 'disabled', 'open',

  // Pure hook classes (no visual style, used for JS selectors)
  'export-action-btn', 'palette-group-icon', 'palette-tool', 'published-level-checkbox',
  'layout-left-pane', 'layout-right-pane',

  // Pseudo-class hooks
  'focus', 'hover', 'group-hover', 'focus-visible', 'focus-within',
]);

// Extract class tokens from a string (HTML or JS)
function extractClassTokens(content) {
  const tokens = new Set();

  // Match class="..." patterns in HTML
  const htmlClassRegex = /class=["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = htmlClassRegex.exec(content)) !== null) {
    const classString = match[1];
    classString.split(/\s+/).forEach(cls => {
      if (cls && !cls.includes('${')) tokens.add(cls);
    });
  }

  // Match classList.add/toggle with string literals
  const classListRegex = /classList\.(add|toggle|remove)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  while ((match = classListRegex.exec(content)) !== null) {
    if (!match[2].includes('${')) tokens.add(match[2]);
  }

  // Match className = "..." patterns
  const classNameRegex = /className\s*[:=]\s*['"`]([^'"`]+)['"`]/g;
  while ((match = classNameRegex.exec(content)) !== null) {
    const classString = match[1];
    classString.split(/\s+/).forEach(cls => {
      if (cls && !cls.includes('${')) tokens.add(cls);
    });
  }

  // Match class: ... patterns (object literals)
  const classObjRegex = /class:\s*['"`]([^'"`]+)['"`]/g;
  while ((match = classObjRegex.exec(content)) !== null) {
    const classString = match[1];
    classString.split(/\s+/).forEach(cls => {
      if (cls && !cls.includes('${')) tokens.add(cls);
    });
  }

  return tokens;
}

// Extract class selectors from CSS, handling escaped characters and @import statements
function extractCssClasses(cssFilePath, visitedPaths = new Set()) {
  // Avoid infinite loops from circular imports
  const realPath = resolve(cssFilePath);
  if (visitedPaths.has(realPath)) return new Set();
  visitedPaths.add(realPath);

  const cssContent = readFileSync(cssFilePath, 'utf8');
  const classes = new Set();

  // Follow @import statements
  const importRegex = /@import\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(cssContent)) !== null) {
    const importPath = resolve(dirname(cssFilePath), match[1]);
    const importedClasses = extractCssClasses(importPath, visitedPaths);
    importedClasses.forEach(cls => classes.add(cls));
  }

  // Match .classname selectors (including escaped characters like \.)
  // Matches: .classname or .\!h-10 or .gap-1\.5 etc.
  const classRegex = /\.([\\A-Za-z_-][\\A-Za-z0-9_:\-\.!]*)/g;
  while ((match = classRegex.exec(cssContent)) !== null) {
    // Unescape backslashes to get the actual class name
    // .gap-1\.5 becomes gap-1.5
    const className = match[1].replace(/\\/g, '');
    classes.add(className);
  }

  return classes;
}

// Main check
function main() {
  const htmlContent = readFileSync('index.html', 'utf8');
  const usedClasses = new Set([...extractClassTokens(htmlContent)]);

  // Extract classes from all JS modules
  const modulesDir = 'modules';
  function walkDir(dir) {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = resolve(dir, file.name);
      if (file.isDirectory()) {
        walkDir(fullPath);
      } else if (file.name.endsWith('.js')) {
        const content = readFileSync(fullPath, 'utf8');
        extractClassTokens(content).forEach(cls => usedClasses.add(cls));
      }
    }
  }
  walkDir(modulesDir);

  const definedClasses = extractCssClasses('styles/app.css');

  const missing = [];
  const ignored = [];

  for (const cls of usedClasses) {
    if (ALLOWLIST.has(cls) || definedClasses.has(cls)) {
      continue;
    }

    // Check for arbitrary value classes with brackets or variables
    if (cls.includes('[') || cls.includes('{') || cls.includes('(')) {
      ignored.push(cls);
      continue;
    }

    // Check for pseudo-class/element variants with colons/slashes
    if (cls.includes(':') || cls.includes('/')) {
      ignored.push(cls);
      continue;
    }

    missing.push(cls);
  }

  if (missing.length > 0) {
    console.error('ERROR: CSS class coverage check failed.');
    console.error(`Found ${missing.length} class(es) used in HTML/JS but not defined in styles/app.css:`);
    missing.sort().forEach(cls => console.error(`  .${cls}`));
    console.error('\nAdd these classes to styles/app.css or add them to ALLOWLIST in check-css-class-coverage.mjs');
    process.exit(1);
  }

  console.log('✓ CSS class coverage check passed');
  console.log(`  ${usedClasses.size} unique class tokens found in HTML/JS`);
  console.log(`  ${definedClasses.size} unique class selectors defined in CSS`);
  if (ignored.length > 0) {
    console.log(`  ${ignored.length} dynamic/variant/arbitrary classes ignored (expected)`);
  }
}

main();
