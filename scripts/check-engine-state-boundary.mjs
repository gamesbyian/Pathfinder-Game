#!/usr/bin/env node
/**
 * Guard engine.js against reintroducing direct state writes that should flow
 * through modules/state-actions.js command helpers.
 */
import fs from 'node:fs';
import process from 'node:process';

const file = 'modules/engine.js';
const source = fs.readFileSync(file, 'utf8');

const assignmentOperator = String.raw`(?:\+=|-=|\*=|/=|(?<![=!<>])=(?!=))`;

const bannedPatterns = [
  { pattern: new RegExp(String.raw`state\.ENGINE\.[\w.]+\s*${assignmentOperator}`), reason: 'write through a state action instead of state.ENGINE' },
  { pattern: /state\.ENGINE\.[\w.]+\.(?:push|pop|splice|clear|add|delete|reverse)\s*\(/, reason: 'mutate state collections through state actions' },
  { pattern: new RegExp(String.raw`engineState\.editor\.[\w.]+\s*${assignmentOperator}`), reason: 'use editor state actions for engineState.editor writes' },
  { pattern: new RegExp(String.raw`nav\.(?:path|isPortalJump|activeGateKey|lastFlipTime)\s*${assignmentOperator}`), reason: 'use navigation state actions for nav field writes' },
  { pattern: /nav\.path\.(?:splice|reverse)\s*\(/, reason: 'use navigation state actions for path mutations' }
];

const violations = [];
source.split(/\r?\n/).forEach((line, index) => {
  for (const { pattern, reason } of bannedPatterns) {
    if (pattern.test(line)) violations.push({ line: index + 1, text: line.trim(), reason });
  }
});

if (violations.length > 0) {
  console.error('Direct engine state mutations are not allowed in modules/engine.js:');
  for (const violation of violations) {
    console.error(`  - ${file}:${violation.line}: ${violation.text}`);
    console.error(`    ${violation.reason}`);
  }
  console.error('\nAdd or reuse a helper in modules/state-actions.js instead.');
  process.exit(1);
}

console.log('Engine state boundary check passed: engine.js uses state-action helpers for guarded mutations.');
