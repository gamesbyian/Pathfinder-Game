#!/usr/bin/env node
/**
 * Guard engine.js and all modules/engine/ sub-controllers against reintroducing
 * direct state writes that should flow through modules/state-actions.js helpers.
 */
import fs from 'node:fs';
import process from 'node:process';

const assignmentOperator = String.raw`(?:\+=|-=|\*=|/=|(?<![=!<>])=(?!=))`;

const bannedPatterns = [
  { pattern: new RegExp(String.raw`state\.ENGINE\.[\w.]+\s*${assignmentOperator}`), reason: 'write through a state action instead of state.ENGINE' },
  { pattern: /state\.ENGINE\.[\w.]+\.(?:push|pop|splice|clear|add|delete|reverse)\s*\(/, reason: 'mutate state collections through state actions' },
  { pattern: new RegExp(String.raw`engineState\.editor\.[\w.]+\s*${assignmentOperator}`), reason: 'use editor state actions for engineState.editor writes' },
  { pattern: new RegExp(String.raw`nav\.(?:path|isPortalJump|activeGateKey|lastFlipTime)\s*${assignmentOperator}`), reason: 'use navigation state actions for nav field writes' },
  { pattern: /nav\.path\.(?:splice|reverse)\s*\(/, reason: 'use navigation state actions for path mutations' }
];

const filesToCheck = [
  'modules/engine.js',
  ...fs.readdirSync('modules/engine').map(f => `modules/engine/${f}`).filter(f => f.endsWith('.js')),
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
  console.error('Direct engine state mutations are not allowed in engine modules:');
  for (const violation of violations) {
    console.error(`  - ${violation.file}:${violation.line}: ${violation.text}`);
    console.error(`    ${violation.reason}`);
  }
  console.error('\nAdd or reuse a helper in modules/state-actions.js instead.');
  process.exit(1);
}

console.log('Engine state boundary check passed: engine.js uses state-action helpers for guarded mutations.');
