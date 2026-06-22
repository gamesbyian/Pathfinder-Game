// Shared test harness for the Node-run unit/integration suites (modernization-plan §6 Phase 3).
//
// Register-then-run model (handles sync + async tests uniformly, unlike the immediate-execution
// harness each suite used to inline):
//
//   import { test, run, assert } from './test-lib/harness.mjs';
//   test('does a thing', () => { assert.equal(1 + 1, 2); });
//   test('does an async thing', async () => { assert.ok(await something()); });
//   await run('My suite');   // prints "  ✓/✗ name" lines + a summary; sets exit code on failure
//
// `run()` awaits each test in registration order, prints a consistent pass/fail summary, and sets
// `process.exitCode = 1` on any failure (so CI sees a non-zero exit while output still flushes).
import assert from 'node:assert/strict';

/** @typedef {{ name: string, fn: () => (void | Promise<void>) }} RegisteredTest */
/** @type {RegisteredTest[]} */
const registered = [];

/** Register a test. @param {string} name @param {() => (void | Promise<void>)} fn */
export function test(name, fn) {
  registered.push({ name, fn });
}

/**
 * Run all registered tests in order, print a summary, and set the process exit code on failure.
 * @param {string} suiteName @returns {Promise<boolean>} true if all passed
 */
export async function run(suiteName) {
  let passed = 0;
  let failed = 0;
  for (const { name, fn } of registered) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed += 1;
    } catch (error) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${(error && error.stack) || (error && error.message) || error}`);
      failed += 1;
    }
  }
  registered.length = 0;
  const line = `\n${suiteName}: ${passed} passed, ${failed} failed`;
  if (failed > 0) {
    console.error(line);
    process.exitCode = 1;
    return false;
  }
  console.log(line);
  return true;
}

export { assert };
