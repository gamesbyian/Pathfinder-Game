#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const components = {
  core: ['data/levels.json', 'data/level-heatmaps.json', 'data/themes.json'],
  published_hints: ['data/hints'],
  stress_levels: [
    'data/stress/stress-levels.json',
    'data/stress/stress-levels-random.json',
    'data/stress/stress-levels-envelope.json',
  ],
  stress_hints: ['data/stress/hints'],
  stress_hints_random: ['data/stress/hints-random'],
  stress_hints_envelope: ['data/stress/hints-envelope'],
};

function gitObject(ref, path) {
  return execFileSync('git', ['rev-parse', `${ref}:${path}`], { encoding: 'utf8' }).trim();
}

function componentKey(ref, paths) {
  return paths.map(path => `${path}\t${gitObject(ref, path)}`).join('\n');
}

const ref = process.argv[2] || 'HEAD';
const out = {};
for (const [name, paths] of Object.entries(components)) {
  const material = componentKey(ref, paths);
  const key = execFileSync('sha256sum', { input: material, encoding: 'utf8' }).trim().split(/\s+/u)[0];
  out[name] = { key, paths };
}

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

const outputPath = process.env.GITHUB_OUTPUT;
if (outputPath) {
  const lines = [];
  for (const [name, value] of Object.entries(out)) {
    lines.push(`${name}_key=${value.key}`);
  }
  fs.appendFileSync(outputPath, lines.join('\n') + '\n');
}
