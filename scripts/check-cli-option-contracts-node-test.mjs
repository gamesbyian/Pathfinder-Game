import assert from 'node:assert/strict';
import { cliOptionContractIssues } from './check-cli-option-contracts.mjs';

assert.deepEqual(cliOptionContractIssues(`
const args = new Map(process.argv.slice(2).map(arg => {
  const [key, value] = arg.slice(2).split('=');
  return [key, value];
}));
args.get('control');
`), []);

assert.ok(cliOptionContractIssues(`
const args = new Map(process.argv.slice(2).map(arg => {
  const [key, value] = arg.slice(2).split('=');
  return [key, value];
}));
args.get('--control');
`).length > 0);

assert.deepEqual(cliOptionContractIssues(`
const args = new Map([['--control', 'x']]);
args.get('--control');
`), []);

console.log('CLI option contract guard tests passed');
