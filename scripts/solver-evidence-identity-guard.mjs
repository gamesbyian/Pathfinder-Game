#!/usr/bin/env node
/**
 * Narrow regression guard for the identity-layer conflation repaired during hint-evidence Phase 2.
 *
 * A protocol hash may be *derived from* configuration identity plus execution semantics, but must
 * never again be assigned directly from configurationHash. This checker scans maintained source
 * files only; historical reports/docs are evidence and may truthfully describe the old defect.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOTS = ['scripts', 'modules'];
const EXTENSIONS = new Set(['.mjs', '.js', '.ts', '.tsx']);
const offenders = [];

function visit(relative) {
    const full = path.join(process.cwd(), relative);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
        for (const name of fs.readdirSync(full)) {
            if (name === 'node_modules' || name === 'dist') continue;
            visit(path.join(relative, name));
        }
        return;
    }
    if (!EXTENSIONS.has(path.extname(full))) return;
    const text = fs.readFileSync(full, 'utf8');
    const lines = text.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
            /protocolHash\s*:\s*[^,;\n]*configurationHash/u.test(line)
            || /protocolHash\s*=\s*[^;\n]*configurationHash/u.test(line)
        ) {
            // The canonical hashExecutionProtocol implementation is allowed to *include* a
            // configurationHash field in its input object. The prohibited shape is only assigning
            // protocolHash itself from configurationHash, so no exception is needed for that owner.
            offenders.push(`${relative}:${i + 1}: ${line.trim()}`);
        }
    }
}

for (const root of ROOTS) visit(root);

if (offenders.length) {
    console.error('Protocol/configuration identity conflation found:');
    for (const offender of offenders) console.error(`  - ${offender}`);
    console.error('Use the canonical execution-protocol identity owner instead of copying configurationHash.');
    process.exit(1);
}
console.log('solver-evidence-identity-guard: no direct protocolHash <- configurationHash assignments');
