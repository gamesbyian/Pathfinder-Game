#!/usr/bin/env node
/** Cross-platform CLI entrypoint contract for the esbuild-based solver launcher. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function run(args) {
    const result = spawnSync(process.execPath, args, {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 30_000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    return result;
}

const invoked = run([
    'scripts/run-bundled.mjs',
    'scripts/test-lib/run-bundled-cli-fixture.mjs',
    '--fixture=invoked',
]);
assert.equal(invoked.status, 0, invoked.stderr);
assert.match(invoked.stdout, /PATHFINDER_BUNDLED_CLI_FIXTURE --fixture=invoked/);

const imported = run([
    '--input-type=module',
    '--eval',
    "import './scripts/run-bundled.mjs'; console.log('PATHFINDER_IMPORT_ONLY');",
]);
assert.equal(imported.status, 0, imported.stderr);
assert.equal(imported.stdout.trim(), 'PATHFINDER_IMPORT_ONLY');

console.log('PASS: bundled CLI executes directly and stays inert when imported');
