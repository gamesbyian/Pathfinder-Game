#!/usr/bin/env node
/**
 * Guard the engine, input, and ui consumer layers against reintroducing direct ENGINE
 * state writes that should flow through the state-action helpers re-exported by
 * modules/state-actions.js (implemented under modules/state/actions/).
 *
 * Scope note: the implementation layers that legitimately own raw mutation — the
 * state-action slice modules (modules/state/actions/), the runtime step processor
 * (modules/runtime/), and the editor history helpers — are intentionally NOT scanned.
 * This check covers the consumer controllers, which must always go through state-actions.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const assignmentOperator = String.raw`(?:\+=|-=|\*=|/=|(?<![=!<>])=(?!=))`;

const bannedPatterns = [
  { pattern: new RegExp(String.raw`state\.ENGINE\.[\w.]+\s*${assignmentOperator}`), reason: 'write through a state action instead of state.ENGINE' },
  { pattern: /state\.ENGINE\.[\w.]+\.(?:push|pop|splice|clear|add|delete|reverse)\s*\(/, reason: 'mutate state collections through state actions' },
  { pattern: new RegExp(String.raw`engineState\.editor\.[\w.]+\s*${assignmentOperator}`), reason: 'use editor state actions for engineState.editor writes' },
  { pattern: new RegExp(String.raw`nav\.(?:path|isPortalJump|activeGateKey|lastFlipTime)\s*${assignmentOperator}`), reason: 'use navigation state actions for nav field writes' },
  { pattern: /nav\.path\.(?:splice|reverse)\s*\(/, reason: 'use navigation state actions for path mutations' }
];

const listJsRecursive = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsRecursive(full));
    else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) out.push(full);
  }
  return out;
};

const filesToCheck = [
  'modules/engine.js',
  ...listJsRecursive('modules/engine'),
  ...listJsRecursive('modules/input'),
  ...listJsRecursive('modules/ui'),
];

const violations = [];
for (const file of filesToCheck) {
  const source = fs.readFileSync(file, 'utf8');
  source.split(/\r?\n/).forEach((line, index) => {
    for (const { pattern, reason } of bannedPatterns) {
      if (pattern.test(line)) violations.push({ file, line: index + 1, text: line.trim(), reason });
    }
  });
}

if (violations.length > 0) {
  console.error('Direct engine state mutations are not allowed in engine/input/ui modules:');
  for (const violation of violations) {
    console.error(`  - ${violation.file}:${violation.line}: ${violation.text}`);
    console.error(`    ${violation.reason}`);
  }
  console.error('\nAdd or reuse a helper from modules/state-actions.js (modules/state/actions/) instead.');
  process.exit(1);
}

console.log(`Engine state boundary check passed: ${filesToCheck.length} engine/input/ui files use state-action helpers for guarded mutations.`);
