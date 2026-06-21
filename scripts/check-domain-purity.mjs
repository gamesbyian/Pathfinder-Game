#!/usr/bin/env node
/**
 * Layer-boundary check: the pure domain/service layer must stay browser-free (see
 * docs/architecture.md). `modules/domain/`, `modules/runtime/`, and `modules/solver/`
 * contain puzzle rules, path/state transitions, and the solver — they must run in Node and
 * must not reach for DOM/browser-host globals, audio, Firebase, or the adapter/controller
 * layers. Side effects belong behind injected adapters.
 *
 * The two solver Web Worker files are the explicit worker-host boundary and are exempt.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PURE_DIRS = ['modules/domain', 'modules/runtime', 'modules/solver'];
const EXEMPT = new Set([
  // The Worker host boundary: the worker script itself + its client adapter.
  'modules/solver/worker.js',
  'modules/solver/solver-worker-client.js',
]);

// Browser-host globals a pure module must not use.
const BANNED_GLOBALS = [
  'document', 'window', 'localStorage', 'sessionStorage', 'navigator', 'indexedDB',
  'DOMParser', 'requestAnimationFrame', 'cancelAnimationFrame', 'Worker',
  'HTMLElement', 'SVGElement', 'Tone', 'firebase', 'fetch', 'alert', 'confirm', 'prompt',
];
const globalRe = new RegExp(String.raw`(?<![.\w$])(${BANNED_GLOBALS.join('|')})\b`);

// Imports into adapter/controller layers a pure module must not make.
const importRe = /\b(?:import|export)\b[^\n]*?from\s*['"]([^'"]+)['"]/;
const BANNED_IMPORT = /(?:^|\/)(ui|render|renderer|persistence|input|engine|app|boot|loader|core|editor|state-actions|state)(?:\.js)?$|\/(ui|render|persistence|input|engine|editor)\//;

function listJs(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listJs(full, acc);
    else if (e.isFile() && e.name.endsWith('.js')) acc.push(full);
  }
  return acc;
}

// Strip line + block comments and string/template contents so matches are real code.
function stripNonCode(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

const violations = [];
for (const dir of PURE_DIRS) {
  for (const file of listJs(dir)) {
    const rel = path.normalize(file);
    if (EXEMPT.has(rel)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const code = stripNonCode(raw);

    raw.split(/\r?\n/).forEach((line, i) => {
      // Imports keep their specifier (it's inside quotes we stripped, so check raw).
      const imp = line.match(importRe);
      if (imp && BANNED_IMPORT.test(imp[1])) {
        violations.push({ file: rel, line: i + 1, reason: `imports adapter/controller layer "${imp[1]}"` });
      }
    });
    code.split(/\r?\n/).forEach((line, i) => {
      const g = line.match(globalRe);
      if (g) violations.push({ file: rel, line: i + 1, reason: `uses browser-host global "${g[1]}"` });
    });
  }
}

if (violations.length > 0) {
  console.error('Domain/runtime/solver layer must stay browser-free (see docs/architecture.md):');
  for (const v of violations) console.error(`  - ${v.file}:${v.line}: ${v.reason}`);
  console.error('\nMove the side effect behind an injected adapter, or relocate the module out of the pure layer.');
  process.exit(1);
}

console.log(`Domain purity check passed: ${PURE_DIRS.join(', ')} are browser-free.`);
