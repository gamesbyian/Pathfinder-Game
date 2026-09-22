import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { buildResearchRelations, RESEARCH_RELATION_CONTRACTS } from './research-relations-lib.mjs';
import { currentDocumentationReferences } from './documentation-index-lib.mjs';
import { parseResearchCloseoutCapsule } from './investigation-report-metadata.mjs';
import { auditResearchIntegration } from './research-integration-audit-lib.mjs';
import { researchQuestionLifecycleClass } from './research-question-relations-lib.mjs';

const normalize = value => value.split(path.sep).join('/');
const isLocalImport = value => value.startsWith('./') || value.startsWith('../');

function walk(root, relative, predicate, out = []) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) return out;
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
        for (const name of readdirSync(absolute).sort()) walk(root, path.join(relative, name), predicate, out);
    } else if (predicate(relative, stat)) {
        out.push(normalize(relative));
    }
    return out;
}

function packageScripts(root) {
    const document = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    return document.scripts ?? {};
}

function commandScriptPath(command) {
    const tokens = String(command).trim().split(/\s+/u);
    const scriptTokens = tokens.filter(token => token.endsWith('.mjs'));
    if (scriptTokens.length === 0) return null;
    if (scriptTokens[0] === 'scripts/run-bundled.mjs' && scriptTokens[1]) return scriptTokens[1];
    return scriptTokens[0];
}

function localImports(root, relative) {
    if (!relative || !existsSync(path.join(root, relative))) return [];
    const source = readFileSync(path.join(root, relative), 'utf8');
    const imports = [];
    for (const match of source.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/gu)) {
        const target = match[2];
        if (!isLocalImport(target)) continue;
        const resolved = normalize(path.relative(root, path.resolve(root, path.dirname(relative), target)));
        imports.push(resolved);
    }
    for (const match of source.matchAll(/^\s*import\s+(['"])([^'"]+)\1/gu)) {
        const target = match[2];
        if (!isLocalImport(target)) continue;
        const resolved = normalize(path.relative(root, path.resolve(root, path.dirname(relative), target)));
        imports.push(resolved);
    }
    return [...new Set(imports)].sort();
}

function researchCommandRoots(root) {
    const scripts = packageScripts(root);
    const rows = Object.entries(scripts)
        .filter(([name, command]) => /(?:research|experiment|evidence|premise|question|family|hint|failure|exact|reference)/iu.test(`${name} ${command}`))
        .map(([name, command]) => ({ name, command, entrypoint: commandScriptPath(command) }))
        .filter(row => row.entrypoint && existsSync(path.join(root, row.entrypoint)));
    return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function dependencyClosure(root, entrypoint) {
    const seen = new Set();
    const stack = [entrypoint];
    while (stack.length) {
        const current = stack.pop();
        if (!current || seen.has(current) || !existsSync(path.join(root, current))) continue;
        seen.add(current);
        for (const imported of localImports(root, current)) {
            if (imported.endsWith('.mjs') && existsSync(path.join(root, imported))) stack.push(imported);
        }
    }
    return [...seen].sort();
}

function documentationRoles(root, currentReferences) {
    const currentPaths = new Set(currentReferences.map(row => row.path));
    const markdown = [
        ...walk(root, 'docs', relative => relative.endsWith('.md')),
        ...walk(root, 'reports', relative => relative.endsWith('.md')),
    ];
    return [...new Set(markdown)].sort().map(relative => {
        const source = readFileSync(path.join(root, relative), 'utf8');
        let role;
        if (relative.startsWith('docs/archive/') || relative.startsWith('docs/history/')) {
            role = 'historical/archive';
        } else if (currentPaths.has(relative) && lifecycleCandidate(relative)) {
            role = 'active-execution-reference';
        } else if (currentPaths.has(relative)) {
            role = 'canonical-current';
        } else if (/^reports\/\d{4}-\d{2}-\d{2}-.+\.md$/u.test(relative)) {
            role = 'dated-evidence';
        } else {
            role = source.includes('<!-- generated-current-state -->')
                ? 'generated-current-state'
                : 'retained-reference-or-evidence';
        }
        const status = /^> \*\*Status:\*\* (.+)$/mu.exec(source)?.[1]?.trim() ?? null;
        let closeout = null;
        let closeoutError = null;
        try {
            closeout = parseResearchCloseoutCapsule(source);
        } catch (error) {
            closeoutError = error.message;
        }
        const statusText = String(status ?? '').toLowerCase();
        const claimsCurrentAuthority = /(?:canonical|current authority|live authority)/u.test(statusText);
        const claimsActive = /(?:^|\b)active(?:\b|$)/u.test(statusText);
        return {
            path: relative,
            role,
            bytes: statSync(path.join(root, relative)).size,
            status,
            claimsCurrentAuthority,
            claimsActive,
            currentAuthorityClaimOutsideIndex: claimsCurrentAuthority && !currentPaths.has(relative),
            closeout,
            closeoutError,
        };
    });
}

function lifecycleCandidate(relative) {
    const name = path.basename(relative);
    return /(?:-plan|-preflight|-handoff)\.md$/u.test(name);
}

function lifecycleDisposition(status) {
    const text = String(status ?? '').trim().toLowerCase();
    if (!text) return 'unknown';
    if (/(?:complete|completed|concluded|superseded|historical|retired|cancelled)/u.test(text)) return 'concluded-or-historical';
    if (/(?:blocked|conditional|await|waiting|deferred)/u.test(text)) return 'blocked-or-conditional';
    if (/(?:active|implementation|in progress|proposed implementation plan|live)/u.test(text)) return 'active-execution';
    return 'unknown';
}

function planLifecycle(root, currentReferences = currentDocumentationReferences(root)) {
    const currentReferencePaths = new Set(currentReferences.map(row => row.path));
    const files = [
        ...walk(root, 'docs', relative => lifecycleCandidate(normalize(relative))),
        ...walk(root, 'docs/archive', relative => lifecycleCandidate(normalize(relative))),
    ];
    const unique = [...new Set(files)].sort();
    return unique.map(relative => {
        const source = readFileSync(path.join(root, relative), 'utf8');
        const status = /^> \*\*Status:\*\* (.+)$/mu.exec(source)?.[1]?.trim() ?? null;
        const implementationProgress = /^> \*\*Implementation progress[^:]*:\*\* (.+)$/mu.exec(source)?.[1]?.trim() ?? null;
        const disposition = lifecycleDisposition(status);
        const appearsConcluded = disposition === 'concluded-or-historical';
        return {
            path: relative,
            kind: path.basename(relative).includes('-preflight') ? 'preflight'
                : path.basename(relative).includes('-handoff') ? 'handoff'
                    : 'plan',
            archived: relative.startsWith('docs/archive/'),
            currentReference: currentReferencePaths.has(relative),
            status,
            lifecycleDisposition: disposition,
            implementationProgress,
            lifecycleBasis: status ? 'structured-status-line' : 'filename/path-only',
            fragileProse: !status,
            appearsConcluded,
            currentReferenceMismatch: currentReferencePaths.has(relative) && appearsConcluded,
        };
    });
}

function exportedContractFunctions(root, relative) {
    if (!relative || !existsSync(path.join(root, relative))) return [];
    const source = readFileSync(path.join(root, relative), 'utf8');
    const names = [];
    for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gu)) {
        if (/^(?:build|validate|assert|write|format|parse|canonicalize)/u.test(match[1])) names.push(match[1]);
    }
    return [...new Set(names)].sort();
}

function sharedDependencies(root, commands) {
    const owners = new Map();
    for (const command of commands) {
        for (const dependency of dependencyClosure(root, command.entrypoint)) {
            if (dependency === command.entrypoint) continue;
            const list = owners.get(dependency) ?? [];
            list.push(command.name);
            owners.set(dependency, list);
        }
    }
    return [...owners.entries()]
        .filter(([, names]) => names.length >= 2)
        .map(([dependency, names]) => ({
            dependency,
            consumerCount: names.length,
            consumers: [...new Set(names)].sort(),
            contractFunctions: exportedContractFunctions(root, dependency),
        }))
        .sort((a, b) => b.consumerCount - a.consumerCount || a.dependency.localeCompare(b.dependency));
}

const WORKFLOW_ROLES = new Set(['operational', 'evidence-producing']);
const WORKFLOW_STATUSES = new Set(['maintained', 'retiring']);

function workflowInventory(root) {
    const lifecyclePath = path.join(root, 'docs/solver-workflow-lifecycle.json');
    if (!existsSync(lifecyclePath)) return [];
    const lifecycle = JSON.parse(readFileSync(lifecyclePath, 'utf8'));
    const packageScriptNames = new Set(Object.keys(packageScripts(root)));
    const seen = new Set();
    return (lifecycle.workflows ?? []).map(row => {
        if (!row.workflow || seen.has(row.workflow)) {
            throw new Error(`${lifecyclePath}: workflow identity is missing or duplicated: ${row.workflow ?? '(missing)'}`);
        }
        seen.add(row.workflow);
        if (!WORKFLOW_ROLES.has(row.role)) {
            throw new Error(`${lifecyclePath}: unknown workflow role ${row.role ?? '(missing)'} for ${row.workflow}`);
        }
        if (!WORKFLOW_STATUSES.has(row.status)) {
            throw new Error(`${lifecyclePath}: unknown workflow status ${row.status ?? '(missing)'} for ${row.workflow}`);
        }
        const workflowPath = normalize(path.join('.github/workflows', row.workflow));
        const absolute = path.join(root, workflowPath);
        const source = existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
        const scriptEntrypoints = [...new Set([...source.matchAll(/(?:^|\s)(scripts\/[A-Za-z0-9_./-]+\.mjs)(?=\s|$|['"])/gmu)]
            .map(match => match[1]))].sort();
        const npmAliases = [...new Set([...source.matchAll(/npm\s+run\s+([A-Za-z0-9:_-]+)/gu)]
            .map(match => match[1]).filter(name => packageScriptNames.has(name)))].sort();
        return {
            workflow: row.workflow,
            path: workflowPath,
            role: row.role,
            status: row.status,
            currentConsumer: row.currentConsumer,
            retirementTrigger: row.retirementTrigger,
            scriptEntrypoints,
            npmAliases,
        };
    }).sort((a, b) => a.workflow.localeCompare(b.workflow));
}

function attachWorkflowConsumers(commands, workflows) {
    return commands.map(command => {
        const consumers = workflows.filter(workflow =>
            workflow.npmAliases.includes(command.name)
            || (command.entrypoint && workflow.scriptEntrypoints.includes(command.entrypoint)));
        return {
            ...command,
            workflowConsumerCount: consumers.length,
            workflowConsumers: consumers.map(row => row.workflow).sort(),
            invocationSurface: consumers.length ? 'workflow-and-cli' : 'direct-cli-or-library',
        };
    });
}

function retiredWorkflowInventory(root) {
    const lifecyclePath = path.join(root, 'docs/solver-workflow-lifecycle.json');
    if (!existsSync(lifecyclePath)) return [];
    const lifecycle = JSON.parse(readFileSync(lifecyclePath, 'utf8'));
    return (lifecycle.retiredWorkflows ?? []).map(row => ({
        workflow: row.workflow,
        reason: row.reason ?? null,
        status: 'retired',
        presentOnDisk: existsSync(path.join(root, '.github/workflows', row.workflow)),
    })).sort((a, b) => a.workflow.localeCompare(b.workflow));
}

function relationInventory(model) {
    return Object.entries(RESEARCH_RELATION_CONTRACTS).map(([relation, contract]) => ({
        relation,
        identity: contract.identity,
        source: contract.source,
        rows: model.relations[relation]?.length ?? 0,
        authorityKind: / via |\*|\*\*/u.test(contract.source) ? 'derived/composed' : 'structured-source',
        stableIdentityDomain: `${relation}:${contract.identity}`,
        primaryJoinKey: contract.identity,
        canonicalSource: contract.source,
    })).sort((a, b) => a.relation.localeCompare(b.relation));
}

function queueQuestionRelation(row, question) {
    if (!row.questionRef) return 'unlinked';
    if (!question) return 'missing-question';
    const state = String(question.state ?? '').trim().toLowerCase();
    const lifecycle = researchQuestionLifecycleClass(state);
    if (lifecycle === 'active') return 'active-question';
    if (state === 'deferred-reopen') return 'reopen-trigger-gate';
    if (['closed', 'concluded'].includes(lifecycle)) return 'terminal-question';
    return 'nonterminal-nonactive-question';
}

function frontDoorInputs(model, plans, documentRoles = []) {
    const questions = model.relations.questions ?? [];
    const questionById = new Map(questions.map(question => [String(question.id), question]));
    const liveQueue = (model.relations.queue ?? [])
        .filter(row => !['closed', 'subsumed', 'method-complete'].includes(
            String(row.executionState ?? '').trim(),
        ))
        .map(row => {
            const question = row.questionRef ? questionById.get(String(row.questionRef)) ?? null : null;
            return {
                workstreamId: row.workstreamId ?? null,
                question: row.question ?? null,
                executionState: row.executionState ?? null,
                gateClass: row.gateClass ?? null,
                state: row.state ?? row.status ?? null,
                remainingGate: row.remainingGate ?? null,
                questionRef: row.questionRef ?? null,
                questionState: question?.state ?? null,
                questionReopensOn: question?.reopensOn ?? null,
                questionExecutionRelation: queueQuestionRelation(row, question),
            };
        });
    const deferredReopenQuestions = questions
        .filter(question => String(question.state ?? '').toLowerCase() === 'deferred-reopen')
        .map(question => ({
            id: question.id,
            owner: question.owner ?? null,
            question: question.question ?? null,
            acquisitionNeed: question.acquisitionNeed ?? null,
            reopensOn: question.reopensOn ?? null,
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const unfinishedLifecycle = plans
        .filter(row => row.currentReference && !row.appearsConcluded)
        .map(row => ({
            path: row.path,
            kind: row.kind,
            status: row.status,
            fragileProse: row.fragileProse,
        }));
    const structuredCloseouts = documentRoles
        .filter(row => row.closeout)
        .map(row => ({ path: row.path, ...row.closeout }))
        .sort((a, b) => String(b.lastEvidenceDate).localeCompare(String(a.lastEvidenceDate)) || a.path.localeCompare(b.path))
        .slice(0, 25);
    return { liveQueue, deferredReopenQuestions, unfinishedLifecycle, structuredCloseouts };
}

function inventoryFindings({
    currentAuthorityClaimOutsideIndex,
    currentReferenceLifecycleMismatches,
    fragilePlans,
    unknownLifecycle,
    dependencies,
    retiredWorkflows,
    liveQueue,
}) {
    return {
        authority: [
            ...currentAuthorityClaimOutsideIndex.map(row => ({
                kind: 'current-authority-claim-outside-index',
                path: row.path,
                status: row.status,
            })),
            ...(liveQueue ?? []).flatMap(row => {
                const active = row.executionState === 'active' || row.status === 'active';
                if (!active) return [];
                if (row.questionExecutionRelation === 'missing-question') {
                    return [{
                        kind: 'active-workstream-references-missing-question',
                        workstreamId: row.workstreamId,
                        questionRef: row.questionRef,
                    }];
                }
                if (row.questionExecutionRelation === 'terminal-question') {
                    return [{
                        kind: 'active-workstream-references-terminal-question',
                        workstreamId: row.workstreamId,
                        questionRef: row.questionRef,
                        questionState: row.questionState,
                    }];
                }
                if (row.questionExecutionRelation === 'unlinked') {
                    return [{
                        kind: 'active-workstream-without-stable-question-ref',
                        workstreamId: row.workstreamId,
                    }];
                }
                return [];
            }),
        ],
        lifecycle: [
            ...currentReferenceLifecycleMismatches.map(row => ({
                kind: 'concluded-current-reference',
                path: row.path,
                status: row.status,
            })),
            ...retiredWorkflows.filter(row => row.presentOnDisk).map(row => ({
                kind: 'retired-workflow-reappeared',
                path: `.github/workflows/${row.workflow}`,
                status: 'retired',
            })),
        ],
        fragileProse: [
            ...fragilePlans.map(row => ({
                kind: 'missing-structured-status',
                path: row.path,
                detail: 'lifecycle falls back to filename/path inference',
            })),
            ...unknownLifecycle.filter(row => !row.fragileProse).map(row => ({
                kind: 'unclassified-structured-status',
                path: row.path,
                detail: row.status,
            })),
        ],
        sharedFailureModes: dependencies.slice(0, 25).map(row => ({
            dependency: row.dependency,
            consumerCount: row.consumerCount,
            consumers: row.consumers,
            contractFunctions: row.contractFunctions,
        })),
    };
}

function currentState(model) {
    const questions = model.relations.questions ?? [];
    const queue = model.relations.queue ?? [];
    const promotions = model.relations.promotions ?? [];
    const evidence = model.relations.evidence ?? [];
    return {
        queueEntries: queue.length,
        activeQueueEntries: queue.filter(row => row.executionState === 'active' || row.status === 'active').length,
        questions: questions.length,
        activeQuestions: questions.filter(row => researchQuestionLifecycleClass(String(row.state ?? '').toLowerCase()) === 'active').length,
        deferredQuestions: questions.filter(row => String(row.state ?? '').toLowerCase() === 'deferred-reopen').length,
        authoredAcquisitionRelations: questions.filter(row => Boolean(row.acquisitionNeed)).length,
        evidenceReports: evidence.length,
        evidenceReportsWithStructuredSourceArtifacts: evidence.filter(row => (row.sourceArtifacts ?? []).length > 0).length,
        durableEvidenceBundles: model.relations.durableEvidence?.length ?? 0,
        promotions: promotions.length,
        promotionsWithDecisionEvidence: promotions.filter(row => Boolean(row.decisionEvidenceRef)).length,
        researchBlocks: model.relations.researchBlocks?.length ?? 0,
        measurementOpportunities: model.relations.measurementOpportunities?.length ?? 0,
        assets: model.relations.assets?.length ?? 0,
    };
}

export function buildResearchSystemInventory(root = process.cwd(), { allowHistoricalWorkstreamTable = false } = {}) {
    const model = buildResearchRelations(root, {
        discoverArtifacts: true,
        allowHistoricalWorkstreamTable,
    });
    const rawCommands = researchCommandRoots(root);
    const currentReferences = currentDocumentationReferences(root);
    const plans = planLifecycle(root, currentReferences);
    const fragilePlans = plans.filter(row => row.fragileProse);
    const unknownLifecycle = plans.filter(row => row.lifecycleDisposition === 'unknown');
    const currentReferenceLifecycleMismatches = plans.filter(row => row.currentReferenceMismatch);
    const currentMarkdownReferences = currentReferences.filter(row => row.path.endsWith('.md') && existsSync(path.join(root, row.path)));
    const currentMarkdownBytes = currentMarkdownReferences.reduce((sum, row) =>
        sum + statSync(path.join(root, row.path)).size, 0);
    const documentRoles = documentationRoles(root, currentReferences);
    const closeoutParseErrors = documentRoles.filter(row => row.closeoutError);
    const structuredCloseoutCount = documentRoles.filter(row => row.closeout).length;
    const roleCounts = Object.fromEntries([...new Set(documentRoles.map(row => row.role))].sort()
        .map(role => [role, documentRoles.filter(row => row.role === role).length]));
    const currentAuthorityClaimOutsideIndex = documentRoles.filter(row => row.currentAuthorityClaimOutsideIndex);
    const missingCurrentReferences = currentReferences.filter(row => !existsSync(path.join(root, row.path)));
    const reportMetadataSources = model.relations.evidence ?? [];
    const structuredCloseoutEvidenceCount = reportMetadataSources
        .filter(row => row.metadataSource === 'structured-closeout').length;
    const legacyStatusBlockEvidenceCount = reportMetadataSources
        .filter(row => row.metadataSource === 'legacy-status-block').length;
    const structuredWorkstreamExecutionStateCount = (model.relations.queue ?? [])
        .filter(row => Boolean(row.executionState)).length;
    const structuredWorkstreamGateClassCount = (model.relations.queue ?? [])
        .filter(row => Boolean(row.gateClass)).length;
    const structuredExperimentPromotionStateCount = (model.relations.experiments ?? [])
        .filter(row => Boolean(row.promotionState)).length;
    const deferredQuestionCount = (model.relations.questions ?? [])
        .filter(row => String(row.state ?? '').toLowerCase() === 'deferred-reopen').length;
    const authoredAcquisitionRelationCount = (model.relations.questions ?? [])
        .filter(row => Boolean(row.acquisitionNeed)).length;
    const promotionDecisionEvidenceRelationCount = (model.relations.promotions ?? [])
        .filter(row => Boolean(row.decisionEvidenceRef)).length;
    const structuredSourceArtifactEvidenceCount = reportMetadataSources
        .filter(row => (row.sourceArtifacts ?? []).length > 0).length;
    const relations = relationInventory(model);
    const workflows = workflowInventory(root);
    const retiredWorkflows = retiredWorkflowInventory(root);
    const commands = attachWorkflowConsumers(rawCommands, workflows);
    const dependencies = sharedDependencies(root, commands);
    const contractOwners = dependencies.filter(row => row.contractFunctions.length > 0);
    const integrationAudit = auditResearchIntegration(root, { model });
    const architectureFindings = {
        missingCurrentReferences: missingCurrentReferences.map(row => ({
            kind: 'missing-current-reference-target',
            path: row.path,
            ownership: row.ownership,
        })),
        missingMaintainedWorkflows: workflows
            .filter(row => row.status === 'maintained' && !existsSync(path.join(root, row.path)))
            .map(row => ({ kind: 'missing-maintained-workflow', path: row.path, role: row.role })),
        opaqueWorkflowInvocations: workflows
            .filter(row => row.status === 'maintained' && row.scriptEntrypoints.length === 0 && row.npmAliases.length === 0)
            .map(row => ({ kind: 'opaque-workflow-invocation', path: row.path, role: row.role })),
        emptyRelationSurfaces: relations
            .filter(row => row.rows === 0)
            .map(row => ({ kind: 'empty-relation-surface', relation: row.relation, source: row.canonicalSource })),
    };
    const frontDoor = frontDoorInputs(model, plans, documentRoles);
    const findings = inventoryFindings({
        currentAuthorityClaimOutsideIndex,
        currentReferenceLifecycleMismatches,
        fragilePlans,
        unknownLifecycle,
        dependencies,
        retiredWorkflows,
        liveQueue: frontDoor.liveQueue,
    });
    return {
        schemaVersion: 1,
        authority: {
            kind: 'derived-read-only',
            priorityAuthority: 'docs/solver-optimization-workstreams.md',
            methodAuthority: 'docs/solver-research-operating-model.md',
        },
        currentState: currentState(model),
        frontDoorInputs: frontDoor,
        findings,
        architectureFindings,
        integrationHealth: {
            errorCount: integrationAudit.errorCount,
            warningCount: integrationAudit.warningCount,
            errors: integrationAudit.errors,
            warnings: integrationAudit.warnings,
            semanticJoinCoverage: integrationAudit.semanticJoinCoverage ?? null,
            premiseCount: integrationAudit.premiseCount ?? null,
            premiseRelationCount: integrationAudit.premiseRelationCount ?? null,
            questionCount: integrationAudit.questionCount ?? null,
        },
        relations,
        commands,
        workflows,
        retiredWorkflows,
        sharedImplementationDependencies: dependencies,
        contractOwnership: contractOwners,
        documentation: {
            currentReferences,
            currentReferenceCount: currentReferences.length,
            currentMarkdownReferenceCount: currentMarkdownReferences.length,
            currentMarkdownBytes,
            roleCounts,
            roles: documentRoles,
            statusClaimCounts: {
                currentAuthority: documentRoles.filter(row => row.claimsCurrentAuthority).length,
                active: documentRoles.filter(row => row.claimsActive).length,
            },
            currentAuthorityClaimOutsideIndexCount: currentAuthorityClaimOutsideIndex.length,
            currentAuthorityClaimOutsideIndexPaths: currentAuthorityClaimOutsideIndex.map(row => row.path),
            missingCurrentReferenceCount: missingCurrentReferences.length,
            missingCurrentReferencePaths: missingCurrentReferences.map(row => row.path),
            structuredCloseoutCount,
            closeoutParseErrorCount: closeoutParseErrors.length,
            structuredCloseoutEvidenceCount,
            legacyStatusBlockEvidenceCount,
            structuredWorkstreamExecutionStateCount,
            structuredWorkstreamGateClassCount,
            structuredExperimentPromotionStateCount,
            deferredQuestionCount,
            authoredAcquisitionRelationCount,
            promotionDecisionEvidenceRelationCount,
            structuredSourceArtifactEvidenceCount,
            closeoutParseErrors: closeoutParseErrors.map(row => ({ path: row.path, error: row.closeoutError })),
            lifecycleCandidateCount: plans.length,
            currentLifecycleCandidateCount: plans.filter(row => row.currentReference).length,
        },
        planLifecycle: plans,
        diagnostics: {
            fragilePlanLifecycleCount: fragilePlans.length,
            fragilePlanLifecyclePaths: fragilePlans.map(row => row.path),
            unknownLifecycleDispositionCount: unknownLifecycle.length,
            unknownLifecycleDispositionPaths: unknownLifecycle.map(row => row.path),
            currentReferenceLifecycleMismatchCount: currentReferenceLifecycleMismatches.length,
            currentReferenceLifecycleMismatchPaths: currentReferenceLifecycleMismatches.map(row => row.path),
            currentAuthorityClaimOutsideIndexCount: currentAuthorityClaimOutsideIndex.length,
            currentAuthorityClaimOutsideIndexPaths: currentAuthorityClaimOutsideIndex.map(row => row.path),
            integrationErrorCount: integrationAudit.errorCount,
            integrationWarningCount: integrationAudit.warningCount,
            sharedContractOwnerCount: contractOwners.length,
            authorityFindingCount: findings.authority.length,
            lifecycleFindingCount: findings.lifecycle.length,
            fragileProseFindingCount: findings.fragileProse.length,
            derivedRelationCount: relations.filter(row => row.authorityKind === 'derived/composed').length,
            structuredRelationCount: relations.filter(row => row.authorityKind === 'structured-source').length,
            maintainedWorkflowCount: workflows.filter(row => row.status === 'maintained').length,
            evidenceProducingWorkflowCount: workflows.filter(row => row.role === 'evidence-producing').length,
            retiredWorkflowCount: retiredWorkflows.length,
            retiredWorkflowReappearanceCount: retiredWorkflows.filter(row => row.presentOnDisk).length,
            workflowBackedResearchCommandCount: commands.filter(row => row.workflowConsumerCount > 0).length,
            directResearchCommandCount: commands.filter(row => row.workflowConsumerCount === 0).length,
            architectureGapCount: Object.values(architectureFindings).reduce((sum, rows) => sum + rows.length, 0),
            missingCurrentReferenceCount: missingCurrentReferences.length,
            structuredCloseoutCount,
            closeoutParseErrorCount: closeoutParseErrors.length,
        },
    };
}


function compactBriefValue(value, fallback = 'none') {
    const text = String(value ?? '').replace(/\s+/gu, ' ').trim();
    return text || fallback;
}

export function renderResearchSystemBrief(inventory) {
    const lines = [
        '# Solver research brief',
        '',
        '> Derived read-only orientation. It does not rank work or replace the owning authorities.',
        `> Priority authority: \`${inventory.authority.priorityAuthority}\``,
        '',
        '## Current state',
        `- queue: ${inventory.currentState.activeQueueEntries} active / ${inventory.currentState.queueEntries} total entries`,
        `- questions: ${inventory.currentState.activeQuestions} active / ${inventory.currentState.questions} total`,
        `- evidence: ${inventory.currentState.evidenceReports} reports; ${inventory.currentState.durableEvidenceBundles} durable bundles; ${inventory.currentState.researchBlocks} research blocks`,
        `- integration health: ${inventory.integrationHealth.errorCount} errors; ${inventory.integrationHealth.warningCount} warnings`,
        '',
        '## Live queue',
    ];

    const liveQueue = inventory.frontDoorInputs.liveQueue.slice(0, 8);
    if (liveQueue.length === 0) {
        lines.push('- none');
    } else {
        for (const row of liveQueue) {
            const id = row.workstreamId == null ? 'workstream ?' : `WS${row.workstreamId}`;
            const questionRef = row.questionRef ? ` / ${row.questionRef}` : '';
            const questionLifecycle = row.questionRef
                ? `; question: ${compactBriefValue(row.questionState)} (${compactBriefValue(row.questionExecutionRelation)})`
                : '';
            const gateClass = row.gateClass ? `; route: ${row.gateClass}` : '';
            lines.push(`- ${id}${questionRef} [${compactBriefValue(row.state)}]: ${compactBriefValue(row.question)}; gate: ${compactBriefValue(row.remainingGate)}${gateClass}${questionLifecycle}`);
        }
    }

    lines.push('', '## Recent structured closeouts');
    const closeouts = inventory.frontDoorInputs.structuredCloseouts.slice(0, 8);
    if (closeouts.length === 0) {
        lines.push('- none yet');
    } else {
        for (const row of closeouts) {
            const question = row.joins?.researchQuestion ? ` / ${row.joins.researchQuestion}` : '';
            lines.push(`- ${row.lastEvidenceDate} ${row.status}${question}: ${compactBriefValue(row.decision)} (gate: ${compactBriefValue(row.remainingGate)}) [${row.path}]`);
        }
    }

    lines.push('', '## Deferred/reopen questions');
    const deferred = inventory.frontDoorInputs.deferredReopenQuestions.slice(0, 6);
    if (deferred.length === 0) {
        lines.push('- none');
    } else {
        for (const row of deferred) {
            const acquisition = row.acquisitionNeed ? `; acquisition: ${row.acquisitionNeed}` : '';
            lines.push(`- ${row.id}: ${compactBriefValue(row.question)}; reopen: ${compactBriefValue(row.reopensOn)}${acquisition}`);
        }
    }

    lines.push('', '## Unfinished execution references');
    const unfinished = inventory.frontDoorInputs.unfinishedLifecycle.slice(0, 8);
    if (unfinished.length === 0) {
        lines.push('- none');
    } else {
        for (const row of unfinished) {
            lines.push(`- ${row.kind}: ${row.path} [${compactBriefValue(row.status)}]${row.fragileProse ? ' (fragile prose lifecycle)' : ''}`);
        }
    }

    lines.push('', '## Consolidation signals');
    lines.push(`- authority findings: ${inventory.findings.authority.length}`);
    lines.push(`- lifecycle findings: ${inventory.findings.lifecycle.length}`);
    lines.push(`- fragile/unknown prose findings: ${inventory.findings.fragileProse.length}`);
    lines.push(`- structured closeouts: ${inventory.diagnostics.structuredCloseoutCount}; malformed: ${inventory.diagnostics.closeoutParseErrorCount}`);
    lines.push(`- shared implementation dependencies surfaced: ${inventory.sharedImplementationDependencies.length}`);

    return lines.join('\n') + '\n';
}


export function researchSystemInventoryView(inventory, view = 'all') {
    if (view === 'all') return inventory;
    if (view === 'brief') return renderResearchSystemBrief(inventory);
    if (view === 'architecture') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            currentState: inventory.currentState,
            frontDoorInputs: inventory.frontDoorInputs,
            integrationHealth: inventory.integrationHealth,
            authoritySurfaces: inventory.documentation.currentReferences,
            relations: inventory.relations,
            commands: inventory.commands,
            workflows: inventory.workflows,
            retiredWorkflows: inventory.retiredWorkflows,
            sharedImplementationDependencies: inventory.sharedImplementationDependencies,
            architectureFindings: inventory.architectureFindings,
            contractOwnership: inventory.contractOwnership,
        };
    }
    if (view === 'lifecycle') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            documentation: inventory.documentation,
            planLifecycle: inventory.planLifecycle,
            diagnostics: {
                fragilePlanLifecycleCount: inventory.diagnostics.fragilePlanLifecycleCount,
                fragilePlanLifecyclePaths: inventory.diagnostics.fragilePlanLifecyclePaths,
                currentReferenceLifecycleMismatchCount: inventory.diagnostics.currentReferenceLifecycleMismatchCount,
                currentReferenceLifecycleMismatchPaths: inventory.diagnostics.currentReferenceLifecycleMismatchPaths,
            },
        };
    }
    if (view === 'findings') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            findings: inventory.findings,
            architectureFindings: inventory.architectureFindings,
            integrationHealth: inventory.integrationHealth,
        };
    }
    if (view === 'brief-inputs') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            currentState: inventory.currentState,
            frontDoorInputs: inventory.frontDoorInputs,
            integrationHealth: inventory.integrationHealth,
            findings: inventory.findings,
            diagnostics: {
                currentReferenceLifecycleMismatchCount: inventory.diagnostics.currentReferenceLifecycleMismatchCount,
                integrationErrorCount: inventory.diagnostics.integrationErrorCount,
                integrationWarningCount: inventory.diagnostics.integrationWarningCount,
            },
        };
    }
    if (view === 'diagnostics') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            integrationHealth: inventory.integrationHealth,
            diagnostics: inventory.diagnostics,
        };
    }
    throw new Error(`unknown research-system inventory view: ${view}`);
}
