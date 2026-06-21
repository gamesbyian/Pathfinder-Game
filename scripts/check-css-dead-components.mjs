#!/usr/bin/env node
/**
 * Dead semantic-component CSS check. `check:css-class-coverage` verifies every *used* class
 * has a definition; it cannot catch the reverse — a component class *defined* in CSS but
 * applied to nothing (dead code). That gap let a stale "foundation" set of .modal-* classes
 * sit unused.
 *
 * This check is scoped to the modal/overlay component families (NOT utility classes, which are
 * legitimately defined-ahead-of-use): every `.modal-*` / `.overlay-*` class selector defined in
 * styles/ must appear as a token somewhere in index.html or modules/**\/*.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const COMPONENT_RE = /\.((?:modal|overlay)-[A-Za-z0-9_-]+)/g;

function readAll(dir, ext, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      readAll(full, ext, acc);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      acc.push(full);
    }
  }
  return acc;
}

// Defined component classes (from every styles/*.css file). Strip /* … */ comments first so a
// class name merely *mentioned* in a comment isn't mistaken for a definition.
const defined = new Set();
for (const cssFile of readAll('styles', '.css')) {
  const css = fs.readFileSync(cssFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(COMPONENT_RE)) defined.add(m[1]);
}

// Consumer surface: index.html + all module JS.
const consumerText = ['index.html', ...readAll('modules', '.js')]
  .map(f => fs.readFileSync(f, 'utf8'))
  .join('\n');

const dead = [...defined].filter(cls => {
  const re = new RegExp(`(?<![\\w-])${cls}(?![\\w-])`);
  return !re.test(consumerText);
}).sort();

if (dead.length > 0) {
  console.error('Defined-but-unused modal/overlay component classes (dead CSS):');
  for (const cls of dead) console.error(`  - .${cls}`);
  console.error('\nApply the class, or remove its rule from styles/.');
  process.exit(1);
}

console.log(`Dead-component CSS check passed: all ${defined.size} .modal-*/.overlay-* component classes are applied.`);
