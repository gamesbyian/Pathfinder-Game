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
const REQUIRED_TIMEOUT_TELEMETRY_KEYS = [
  'maxProgress',
  'bestPhaseReached',
  'remainingMustPass',
  'remainingMustCross',
  'plateauDetected',
  'plateauNodeWindow'
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

  let parsed = null;
  try {
    parsed = JSON.parse(src.text);
  } catch {
    parsed = null;
  }
  if (!parsed || !Array.isArray(parsed?.levels)) continue;

  parsed.levels.forEach((level, levelIndex) => {
    const attempts = Array.isArray(level?.attempts) ? level.attempts : [];
    attempts.forEach((attempt, attemptIndex) => {
      const status = `${attempt?.status || ''}`.trim();
      if (status !== 'timeout') return;
      const missingKeys = REQUIRED_TIMEOUT_TELEMETRY_KEYS.filter((key) => !Object.prototype.hasOwnProperty.call(attempt, key));
      if (missingKeys.length > 0) {
        violations += 1;
        const levelLabel = Number.isFinite(Number(level?.level)) ? level.level : levelIndex + 1;
        console.error(`Timeout attempt missing telemetry keys in ${src.file} level=${levelLabel} attemptIndex=${attemptIndex}: ${missingKeys.join(', ')}`);
      }
    });
  });
}

if (violations > 0) process.exit(1);
console.log('Audit output check passed: no forbidden preExpansionAbort entries and timeout telemetry keys are present.');
