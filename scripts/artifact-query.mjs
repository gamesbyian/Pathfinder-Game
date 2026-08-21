#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const metadata = JSON.parse(readFileSync('logs/artifact-metadata.json', 'utf8'));
const query = value('query').toLowerCase();
const role = value('role').toLowerCase();
const entries = metadata.artifacts.filter(entry =>
    (!role || entry.role.toLowerCase() === role) &&
    (!query || JSON.stringify(entry).toLowerCase().includes(query))
).map(entry => ({
    selector: entry.selector,
    role: entry.role,
    canonicalInput: entry.canonicalInput,
    generator: entry.generator,
    consumers: entry.consumers,
    supersededBy: entry.supersededBy,
    safeToDelete: entry.safeToDelete,
    safeToRegenerate: entry.safeToRegenerate,
    regenerationCommand: entry.regenerationCommand,
}));
console.log(JSON.stringify({ count: entries.length, artifacts: entries }, null, 2));
