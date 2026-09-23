import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
    compareExperimentArms,
    EXPERIMENT_BUDGET_PROTOCOLS,
    levelSelectionHash,
    validateExperimentManifest,
} from './experiment-manifest-lib.mjs';
import { loadResearchQuestionRegistry } from './research-question-relations-lib.mjs';
import { defaultConfig } from '../modules/solver/ablation-config.js';

function argumentMap(argv) {
    return new Map(argv.filter(x => x.startsWith('--')).map(x => {
        const [key, ...value] = x.split('=');
        return [key, value.join('=')];
    }));
}

function parseAssignments(raw, { coerceBooleans = false } = {}) {
    return Object.fromEntries((raw ?? '').split(',').filter(Boolean).map(entry => {
        const [key, ...rest] = entry.split('=');
        if (!key || rest.length === 0) throw new Error(`invalid assignment ${entry}`);
        const rawValue = rest.join('=');
        const value = coerceBooleans
            ? (rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue)
            : rawValue;
        return [key, value];
    }));
}

function parseWorkflowInputs(args) {
    if (args.has('--workflow-inputs-json')) {
        const value = JSON.parse(args.get('--workflow-inputs-json'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('--workflow-inputs-json must decode to an object');
        }
        return value;
    }
    return parseAssignments(args.get('--workflow-inputs'));
}

function resolveInput(root, filename) {
    return path.isAbsolute(filename) ? filename : path.resolve(root, filename);
}

export function prepareSolverExperimentPreflight(
    argv,
    {
        root = process.cwd(),
        productionFlags = defaultConfig(),
        now = () => new Date().toISOString(),
        git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' }).trim(),
    } = {},
) {
    const args = argumentMap(argv);
    const required = key => {
        const value = args.get(key);
        if (!value) throw new Error(`missing ${key}`);
        return value;
    };

    if (args.has('--compare-control') || args.has('--compare-treatment')) {
        for (const key of ['--compare-control', '--compare-treatment', '--target-flag']) {
            if (!args.get(key)) throw new Error(`missing ${key}`);
        }
        const control = JSON.parse(readFileSync(resolveInput(root, args.get('--compare-control')), 'utf8'));
        const treatment = JSON.parse(readFileSync(resolveInput(root, args.get('--compare-treatment')), 'utf8'));
        const allowedWorkflowInputDifferences = (args.get('--allow-workflow-input-differences') ?? '')
            .split(',').filter(Boolean);
        const result = compareExperimentArms(
            control,
            treatment,
            args.get('--target-flag'),
            { allowedWorkflowInputDifferences },
        );
        return { kind: 'compare', result };
    }

    const corpus = required('--corpus');
    const arm = required('--arm');
    const output = required('--output');
    const document = JSON.parse(readFileSync(resolveInput(root, corpus), 'utf8'));
    const levels = Array.isArray(document) ? document : document.levels;
    const requested = args.get('--level-ids')?.split(',').filter(Boolean) ?? levels.map(x => String(x.id));
    const available = new Set(levels.map(x => String(x.id)));
    const missing = requested.filter(id => !available.has(id));
    if (missing.length) throw new Error(`selected levels absent from corpus: ${missing.slice(0, 5).join(',')}`);

    const flags = parseAssignments(args.get('--flags'), { coerceBooleans: true });
    const unknownFlags = Object.keys(flags).filter(key => !(key in productionFlags));
    if (unknownFlags.length) throw new Error(`unknown solver flags: ${unknownFlags.join(',')}`);

    const workflow = args.get('--workflow') ?? 'direct';
    const workflowInputs = parseWorkflowInputs(args);
    const solverFlags = { ...productionFlags, ...flags };
    const budgetProtocol = args.get('--budget-protocol') ?? 'production-additive';

    const researchQuestionInputs = {
        questionId: args.get('--question-id'),
        liveAmbiguity: args.get('--live-ambiguity'),
        discriminatingObservable: args.get('--discriminating-observable'),
        outcomeInterpretation: args.get('--outcome-interpretation-json'),
        measurementOpportunity: args.get('--measurement-opportunity'),
    };
    const hasResearchQuestionInput = Object.values(researchQuestionInputs).some(value => value != null);
    let researchQuestion;
    if (hasResearchQuestionInput) {
        for (const key of ['questionId', 'liveAmbiguity', 'discriminatingObservable', 'outcomeInterpretation']) {
            if (!researchQuestionInputs[key]) {
                throw new Error(
                    `incomplete research question metadata: missing --${key.replace(/[A-Z]/gu, c => `-${c.toLowerCase()}`)}`,
                );
            }
        }
        const questionRegistry = loadResearchQuestionRegistry(root);
        const registeredQuestion = questionRegistry.questions
            .find(question => question.id === researchQuestionInputs.questionId);
        if (!registeredQuestion) {
            throw new Error(`unknown research question id: ${researchQuestionInputs.questionId}`);
        }
        if (researchQuestionInputs.measurementOpportunity) {
            const measurementRegistry = JSON.parse(readFileSync(
                path.join(root, 'docs', 'solver-premise-map-measurement-opportunities.json'),
                'utf8',
            ));
            if (!(measurementRegistry.opportunities ?? [])
                .some(opportunity => opportunity.id === researchQuestionInputs.measurementOpportunity)) {
                throw new Error(`unknown measurement opportunity: ${researchQuestionInputs.measurementOpportunity}`);
            }
            if ((registeredQuestion.measurementOpportunities ?? []).length
                && !registeredQuestion.measurementOpportunities
                    .includes(researchQuestionInputs.measurementOpportunity)) {
                throw new Error(
                    `measurement opportunity ${researchQuestionInputs.measurementOpportunity} `
                    + `is not mapped to research question ${registeredQuestion.id}`,
                );
            }
        }
        researchQuestion = {
            questionId: researchQuestionInputs.questionId,
            liveAmbiguity: researchQuestionInputs.liveAmbiguity,
            discriminatingObservable: researchQuestionInputs.discriminatingObservable,
            outcomeInterpretation: JSON.parse(researchQuestionInputs.outcomeInterpretation),
            ...(researchQuestionInputs.measurementOpportunity
                ? { measurementOpportunity: researchQuestionInputs.measurementOpportunity }
                : {}),
        };
    }

    if (!EXPERIMENT_BUDGET_PROTOCOLS.includes(budgetProtocol)) {
        throw new Error(`--budget-protocol must be one of: ${EXPERIMENT_BUDGET_PROTOCOLS.join(', ')}`);
    }

    if (workflow === 'solver-stress-refresh') {
        const enabled = (workflowInputs.enable_flags ?? '').split(',').filter(Boolean);
        const disabled = (workflowInputs.disable_flags ?? '').split(',').filter(Boolean);
        const unknownDispatchFlags = [...enabled, ...disabled].filter(flag => !(flag in productionFlags));
        if (unknownDispatchFlags.length) {
            throw new Error(
                `unknown solver flags in workflow inputs: ${[...new Set(unknownDispatchFlags)].join(',')}`,
            );
        }
        const overlap = enabled.filter(flag => disabled.includes(flag));
        if (overlap.length) {
            throw new Error(
                `workflow enables and disables the same solver flag: ${[...new Set(overlap)].join(',')}`,
            );
        }
        const workflowConfig = { ...productionFlags };
        for (const flag of enabled) workflowConfig[flag] = true;
        for (const flag of disabled) workflowConfig[flag] = false;
        const drift = Object.keys(productionFlags)
            .filter(flag => workflowConfig[flag] !== solverFlags[flag]);
        if (drift.length) {
            throw new Error(
                `solverFlags disagree with solver-stress-refresh enable/disable inputs: ${drift.join(',')}`,
            );
        }
    }

    if (git('status', '--porcelain') && !args.has('--allow-dirty')) {
        throw new Error('refusing experiment preflight from a dirty worktree');
    }

    const manifest = validateExperimentManifest({
        schemaVersion: 2,
        experimentId: required('--experiment-id'),
        runId: required('--run-id'),
        solverRef: git('rev-parse', 'HEAD'),
        corpus,
        levelIds: requested,
        levelSelectionHash: levelSelectionHash(requested),
        arm,
        solverFlags,
        workflow,
        workflowInputs,
        seeds: (args.get('--seeds') ?? '').split(',').filter(Boolean).map(Number),
        canonicalWorkBudget: Number(required('--work-budget')),
        wallDeadlineMs: Number(required('--wall-deadline-ms')),
        budgetProtocol,
        ...(researchQuestion ? { researchQuestion } : {}),
        profile: required('--profile'),
        instrumentation: args.get('--instrumentation') ?? 'off',
        output,
        createdAt: now(),
    });

    return { kind: 'manifest', manifest, output };
}
