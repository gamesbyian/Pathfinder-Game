import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildResearchQueryGraph } from './research-query-lib.mjs';
import { buildAnswerabilityView } from './research-query-views-lib.mjs';

const key = ref => ref.type + ':' + ref.id;
const edgeKey = edge => [key(edge.from), edge.relation, key(edge.to)].join('|');

export function buildResearchQuerySnapshot(graph) {
    const answerability = buildAnswerabilityView(graph);
    const gates = [
        ...answerability.noFreshSolverExecution,
        ...answerability.instrumentOnly,
        ...answerability.boundedCompute,
        ...answerability.dormantOrConditional,
        ...answerability.unclassified,
    ].map(row => ({
        workstreamId: row.workstreamId,
        questionRef: row.questionRef,
        executionState: row.executionState,
        gateClass: row.gateClass,
    })).sort((a, b) => String(a.workstreamId).localeCompare(String(b.workstreamId)));

    return {
        schemaVersion: 1,
        nodes: graph.nodes.map(node => ({ type: node.type, id: node.id }))
            .sort((a, b) => key(a).localeCompare(key(b))),
        edges: graph.edges.map(edge => ({
            from: edge.from,
            relation: edge.relation,
            to: edge.to,
            strength: edge.strength ?? 'authored',
        })).sort((a, b) => edgeKey(a).localeCompare(edgeKey(b))),
        gates,
    };
}

export function buildResearchQuerySnapshotFromGitRef(root, ref, { discoverArtifacts = false } = {}) {
    const gitRef = String(ref ?? '').trim();
    if (!gitRef) throw new Error('git ref is required');
    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'pathfinder-research-query-ref-'));
    const worktree = path.join(tempRoot, 'repo');
    let added = false;
    try {
        execFileSync('git', ['worktree', 'add', '--detach', '--quiet', worktree, gitRef], {
            cwd: gitRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        added = true;
        const graph = buildResearchQueryGraph(worktree, {
            discoverArtifacts,
            allowHistoricalWorkstreamTable: true,
        });
        return buildResearchQuerySnapshot(graph);
    } catch (error) {
        const detail = String(error?.stderr ?? error?.message ?? error).trim();
        throw new Error('failed to reconstruct research query snapshot for git ref '
            + gitRef + (detail ? ': ' + detail : ''));
    } finally {
        if (added) {
            try {
                execFileSync('git', ['worktree', 'remove', '--force', worktree], {
                    cwd: gitRoot,
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
            } catch {
                // Best-effort cleanup; tempRoot removal below handles ordinary filesystem residue.
            }
        }
        rmSync(tempRoot, { recursive: true, force: true });
    }
}

export function diffResearchQuerySnapshots(before, after) {
    if (before?.schemaVersion !== 1 || after?.schemaVersion !== 1) {
        throw new Error('research query snapshot schemaVersion must be 1');
    }
    const beforeNodes = new Map(before.nodes.map(node => [key(node), node]));
    const afterNodes = new Map(after.nodes.map(node => [key(node), node]));
    const beforeEdges = new Map(before.edges.map(edge => [edgeKey(edge), edge]));
    const afterEdges = new Map(after.edges.map(edge => [edgeKey(edge), edge]));
    const beforeGates = new Map((before.gates ?? []).map(row => [String(row.workstreamId), row]));
    const afterGates = new Map((after.gates ?? []).map(row => [String(row.workstreamId), row]));

    const gateChanges = [];
    for (const [id, current] of afterGates) {
        const previous = beforeGates.get(id);
        if (!previous) {
            gateChanges.push({ workstreamId: current.workstreamId, before: null, after: current });
            continue;
        }
        if (previous.gateClass !== current.gateClass
            || previous.executionState !== current.executionState
            || previous.questionRef !== current.questionRef) {
            gateChanges.push({ workstreamId: current.workstreamId, before: previous, after: current });
        }
    }
    for (const [id, previous] of beforeGates) {
        if (!afterGates.has(id)) gateChanges.push({ workstreamId: previous.workstreamId, before: previous, after: null });
    }

    const noFreshExecution = new Set(['existing-data', 'design', 'implementation']);
    return {
        schemaVersion: 1,
        addedNodes: [...afterNodes.entries()].filter(([id]) => !beforeNodes.has(id)).map(([, row]) => row),
        removedNodes: [...beforeNodes.entries()].filter(([id]) => !afterNodes.has(id)).map(([, row]) => row),
        addedEdges: [...afterEdges.entries()].filter(([id]) => !beforeEdges.has(id)).map(([, row]) => row),
        removedEdges: [...beforeEdges.entries()].filter(([id]) => !afterEdges.has(id)).map(([, row]) => row),
        gateChanges,
        newlyNoFreshSolverExecution: gateChanges.filter(row =>
            row.after && noFreshExecution.has(row.after.gateClass)
            && (!row.before || !noFreshExecution.has(row.before.gateClass))),
        newlyInstrumentOnly: gateChanges.filter(row =>
            row.after?.gateClass === 'instrument-only' && row.before?.gateClass !== 'instrument-only'),
        newlyBoundedCompute: gateChanges.filter(row =>
            row.after?.gateClass === 'bounded-compute' && row.before?.gateClass !== 'bounded-compute'),
    };
}
