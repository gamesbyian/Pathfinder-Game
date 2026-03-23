import { readFile } from 'node:fs/promises';
import process from 'node:process';

const args = process.argv.slice(2);
let sources = [];

if (args.length > 0) {
  sources = await Promise.all(args.map(async (file) => ({ file, text: await readFile(file, 'utf8') })));
} else {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  sources = [{ file: 'stdin', text: Buffer.concat(chunks).toString('utf8') }];
}

const forbiddenPatterns = [
  /preExpansionAbort\.code\s*={1,3}\s*['"]unexpected-exception['"]/i,
  /preExpansionAbortCode\s*[:=]\s*['"]unexpected-exception['"]/i,
  /"preExpansionAbort"\s*:\s*\{[^}]*"code"\s*:\s*"unexpected-exception"/is
];

let violations = 0;
for (const src of sources) {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(src.text)) {
      violations += 1;
      console.error(`Forbidden unexpected-exception preExpansionAbort detected in ${src.file}.`);
      break;
    }
  }
}

if (violations > 0) process.exit(1);
console.log('Audit output check passed: no unexpected-exception preExpansionAbort entries found.');
