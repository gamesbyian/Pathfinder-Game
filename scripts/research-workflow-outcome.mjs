import fs from 'node:fs';
import path from 'node:path';

export const RESEARCH_WORKFLOW_OUTCOMES = Object.freeze([
  'completed-positive',
  'completed-negative',
  'invariant-violation',
  'harness-error',
  'infrastructure-error',
  'timeout',
]);

export function validateResearchWorkflowOutcome(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('research outcome must be an object');
  }
  if (value.schemaVersion != null && value.schemaVersion !== 1) {
    throw new Error(`unsupported research outcome schemaVersion ${JSON.stringify(value.schemaVersion)}`);
  }
  if (!RESEARCH_WORKFLOW_OUTCOMES.includes(value.outcome)) {
    throw new Error(`unknown research outcome ${JSON.stringify(value.outcome)}; expected one of ${RESEARCH_WORKFLOW_OUTCOMES.join(', ')}`);
  }
  if (typeof value.reason !== 'string' || !value.reason.trim()) {
    throw new Error('research outcome reason must be a non-empty string');
  }
  if (/\r|\n/u.test(value.reason)) {
    throw new Error('research outcome reason must be a single line');
  }
  return { schemaVersion: 1, outcome: value.outcome, reason: value.reason.trim() };
}

export function writeResearchWorkflowOutcome(file, value) {
  const validated = validateResearchWorkflowOutcome(value);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(validated, null, 2)}\n`);
  return validated;
}

export function readResearchWorkflowOutcome(file) {
  return validateResearchWorkflowOutcome(JSON.parse(fs.readFileSync(file, 'utf8')));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const values = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('='))
    .map(arg => { const [key, ...parts] = arg.slice(2).split('='); return [key, parts.join('=')]; }));
  const out = values.get('out');
  if (!out) {
    console.error('Usage: research-workflow-outcome.mjs --out=<path> --outcome=<class> --reason=<text>');
    process.exit(2);
  }
  try {
    const written = writeResearchWorkflowOutcome(out, {
      outcome: values.get('outcome'),
      reason: values.get('reason'),
    });
    console.log(`${written.outcome}: ${written.reason}`);
  } catch (error) {
    console.error(`research-workflow-outcome: ${error.message}`);
    process.exit(2);
  }
}
