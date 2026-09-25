#!/usr/bin/env node
/**
 * Retained-evidence shadow analysis for WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE.
 *
 * Builds action-boundary rows from an existing production sweep and evaluates
 * deliberately simple, runtime-legal signature families on a deterministic
 * level-held-out split. This does not execute the solver and does not claim
 * counterfactual scheduler savings.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const success = a => a?.ok === true || a?.outcome === 'success' || a?.outcome === 'solved' || a?.status === 'success';
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const ratio = (a,b) => b > 0 ? a / b : null;
const splitRole = id => (Number.parseInt(createHash('sha256').update(String(id)).digest('hex').slice(0,8),16) % 10) < 7 ? 'development' : 'validation';

function outcomeClass(a) {
  if (!a) return 'start';
  if (success(a)) return 'success';
  const raw = String(a.outcome ?? a.status ?? a.reason ?? a.stopReason ?? '').toLowerCase();
  if (a.censored === true || a.timedOut === true || a.deadlineTruncated === true || /timeout|timed-out|deadline|budget|starved|censor|cap/.test(raw)) return 'censored';
  if (/exhaust|complete|finished/.test(raw)) return 'exhausted';
  if (/unsupported|error|invalid/.test(raw)) return 'invalid';
  return 'failed';
}
function stage(a) { return String(a?.stageId ?? '(unknown-stage)'); }
function configFamily(a) {
  const raw = String(a?.actionKey ?? a?.configurationKey ?? a?.configKey ?? '');
  if (!raw) return '(unknown-config)';
  return raw.split('|').slice(1,3).join('|') || raw;
}
function workBand(work) {
  const n=num(work);
  if (n <= 0) return '0';
  if (n < 100000) return '<100k';
  if (n < 1000000) return '100k-1m';
  if (n < 10000000) return '1m-10m';
  return '>=10m';
}

export function buildActionBoundaryDataset(document, { source='input' }={}) {
  const levels = Array.isArray(document) ? document : (document?.levels ?? document?.data?.levels ?? []);
  const rows=[];
  for (const level of levels) {
    const levelId=String(level?.id ?? level?.level ?? '');
    const attempts=Array.isArray(level?.attempts) ? level.attempts : [];
    const winnerIndex=attempts.findIndex(success);
    let cumulativeWork=0;
    const reachableAttemptCount = winnerIndex >= 0 ? winnerIndex + 1 : attempts.length;
    for (let i=0;i<reachableAttemptCount;i++) {
      const next=attempts[i], prev=i>0 ? attempts[i-1] : null;
      rows.push({
        source, levelId, split:splitRole(levelId), boundaryIndex:i,
        nextStage:stage(next), nextConfigFamily:configFamily(next),
        priorStage:stage(prev), priorOutcome:outcomeClass(prev),
        priorWorkBand:workBand(prev?.workSpent), cumulativeWorkBand:workBand(cumulativeWork),
        nextAttemptWork:num(next?.workSpent),
        offlineIsWinner:winnerIndex === i,
        offlinePreWinner:winnerIndex >= 0 && i < winnerIndex,
        levelSolved:winnerIndex >= 0,
      });
      cumulativeWork += num(next?.workSpent);
    }
  }
  return {schemaVersion:1,kind:'pathfinder-action-boundary-retained-evidence',source,split:'sha256(levelId) first32bits mod10: 0-6 development, 7-9 validation',rows};
}

export const signatureFamilies = {
  'next-stage': r => [r.nextStage],
  'prior-response+next-stage': r => [r.priorStage,r.priorOutcome,r.nextStage],
  'prior-response+work+next-stage': r => [r.priorStage,r.priorOutcome,r.priorWorkBand,r.cumulativeWorkBand,r.nextStage],
  'prior-response+next-config-family': r => [r.priorStage,r.priorOutcome,r.nextStage,r.nextConfigFamily],
};

function keyOf(parts){return parts.join('\u001f');}

export function actionBoundaryDigest(dataset) {
  const rows=(dataset?.rows ?? []).map(r=>[
    r.levelId,
    r.boundaryIndex,
    r.nextStage,
    r.nextConfigFamily,
    r.priorStage,
    r.priorOutcome,
    r.priorWorkBand,
    r.cumulativeWorkBand,
    r.nextAttemptWork,
    r.offlineIsWinner,
    r.offlinePreWinner,
    r.levelSolved,
  ]);
  return `sha256:${createHash('sha256').update(JSON.stringify(rows)).digest('hex')}`;
}


export function applyFrozenLegalSignalModel(dataset, model) {
  const rows=dataset.rows ?? [];
  const family=String(model?.family ?? '');
  const fn=signatureFamilies[family];
  if (!fn) throw new Error(`unknown frozen model family: ${family || '(missing)'}`);
  if (!Array.isArray(model?.signatures) || !model.signatures.length) {
    throw new Error('frozen model must contain non-empty signatures[]');
  }

  const allowed=new Set(model.signatures.map(entry=>keyOf(entry.signature ?? entry)));
  const val=rows.filter(r=>r.split==='validation');
  const preWinnerRows=val.filter(r=>r.offlinePreWinner);
  const nominated=val.filter(r=>allowed.has(keyOf(fn(r))));
  const nominatedPreWinner=nominated.filter(r=>r.offlinePreWinner);
  const nominatedPreWinnerLevels=new Set(nominatedPreWinner.map(r=>r.levelId));
  const endangeredLevels=new Set(nominated.filter(r=>r.offlineIsWinner).map(r=>r.levelId));
  const validationSolvedLevels=new Set(val.filter(r=>r.levelSolved).map(r=>r.levelId));
  const preWinnerWork=preWinnerRows.reduce((sum,r)=>sum+r.nextAttemptWork,0);
  const nominatedPreWinnerWork=nominatedPreWinner.reduce((sum,r)=>sum+r.nextAttemptWork,0);

  const workBreakdown=(sourceRows,keyFn,total)=> {
    const groups=new Map();
    for (const r of sourceRows) {
      const key=keyFn(r);
      const g=groups.get(key) ?? {key,work:0,attempts:0,levels:new Set()};
      g.work += r.nextAttemptWork;
      g.attempts++;
      g.levels.add(r.levelId);
      groups.set(key,g);
    }
    return [...groups.values()]
      .map(g=>({key:g.key,work:g.work,workShare:ratio(g.work,total),attempts:g.attempts,levels:g.levels.size}))
      .sort((a,b)=>b.work-a.work || String(a.key).localeCompare(String(b.key)));
  };

  const sameStageWork=nominatedPreWinner
    .filter(r=>r.priorStage===r.nextStage)
    .reduce((sum,r)=>sum+r.nextAttemptWork,0);
  const baselineSameStageWork=preWinnerRows
    .filter(r=>r.priorStage===r.nextStage)
    .reduce((sum,r)=>sum+r.nextAttemptWork,0);
  const nominatedByLevel=workBreakdown(nominatedPreWinner,r=>r.levelId,nominatedPreWinnerWork);
  const maxNominatedParentWorkShare=nominatedByLevel.length
    ? Math.max(...nominatedByLevel.map(row=>Number(row.workShare) || 0))
    : null;

  return {
    schemaVersion:1,
    kind:'pathfinder-action-selection-frozen-legal-signal-evaluation',
    model:{
      kind:model.kind ?? null,
      family,
      minDevelopmentSupport:model.minDevelopmentSupport ?? null,
      signatureCount:model.signatures.length,
      source:model.source ?? null,
    },
    validationSolvedLevels:validationSolvedLevels.size,
    validationRows:val.length,
    preWinnerWork,
    nominatedPreWinnerWork,
    nominatedPreWinnerLevels:nominatedPreWinnerLevels.size,
    capturedPreWinnerWorkShare:ratio(nominatedPreWinnerWork,preWinnerWork),
    endangeredWinnerLevels:endangeredLevels.size,
    endangeredWinnerRate:ratio(endangeredLevels.size,validationSolvedLevels.size),
    diagnostics:{
      nominatedSameStageContinuationWork:sameStageWork,
      nominatedSameStageContinuationWorkShare:ratio(sameStageWork,nominatedPreWinnerWork),
      baselineSameStageContinuationWorkShare:ratio(baselineSameStageWork,preWinnerWork),
      maxNominatedParentWorkShare,
      nominatedByLevel,
      nominatedByPriorOutcome:workBreakdown(nominatedPreWinner,r=>r.priorOutcome,nominatedPreWinnerWork),
      baselineByPriorOutcome:workBreakdown(preWinnerRows,r=>r.priorOutcome,preWinnerWork),
      nominatedByNextStage:workBreakdown(nominatedPreWinner,r=>r.nextStage,nominatedPreWinnerWork),
    },
    interpretation:{
      allowed:'apply an already-frozen legal-signal membership rule unchanged to retained validation action boundaries',
      forbidden:'refit signature membership/support on this challenge population or infer live scheduler counterfactual savings',
    },
  };
}

export function analyzeLegalSignalCapture(dataset,{minSupports=[10,50,100]}={}) {
  const rows=dataset.rows ?? [];
  const dev=rows.filter(r=>r.split==='development');
  const val=rows.filter(r=>r.split==='validation');
  const families=[];
  for (const [family,fn] of Object.entries(signatureFamilies)) {
    const stats=new Map();
    for (const r of dev) {
      const k=keyOf(fn(r));
      const s=stats.get(k) ?? {support:0,wins:0};
      s.support++; if (r.offlineIsWinner) s.wins++;
      stats.set(k,s);
    }
    const thresholds=minSupports.map(minSupport=>{
      let preWinnerWork=0,nominatedPreWinnerWork=0,nominatedAttempts=0;
      const endangeredLevels=new Set(), validationSolvedLevels=new Set();
      const nominatedPreWinnerRows=[], allPreWinnerRows=[];
      for (const r of val) {
        if (r.levelSolved) validationSolvedLevels.add(r.levelId);
        if (r.offlinePreWinner) {
          preWinnerWork += r.nextAttemptWork;
          allPreWinnerRows.push(r);
        }
        const s=stats.get(keyOf(fn(r)));
        const nominate=!!s && s.support>=minSupport && s.wins===0;
        if (!nominate) continue;
        nominatedAttempts++;
        if (r.offlinePreWinner) {
          nominatedPreWinnerWork += r.nextAttemptWork;
          nominatedPreWinnerRows.push(r);
        }
        if (r.offlineIsWinner) endangeredLevels.add(r.levelId);
      }

      const workBreakdown=(rows,keyFn,total)=> {
        const groups=new Map();
        for (const r of rows) {
          const key=keyFn(r);
          const g=groups.get(key) ?? {key,work:0,attempts:0,levels:new Set()};
          g.work += r.nextAttemptWork;
          g.attempts++;
          g.levels.add(r.levelId);
          groups.set(key,g);
        }
        return [...groups.values()]
          .map(g=>({key:g.key,work:g.work,workShare:ratio(g.work,total),attempts:g.attempts,levels:g.levels.size}))
          .sort((a,b)=>b.work-a.work || String(a.key).localeCompare(String(b.key)));
      };

      const sameStageWork=nominatedPreWinnerRows
        .filter(r=>r.priorStage===r.nextStage)
        .reduce((sum,r)=>sum+r.nextAttemptWork,0);
      const baselineSameStageWork=allPreWinnerRows
        .filter(r=>r.priorStage===r.nextStage)
        .reduce((sum,r)=>sum+r.nextAttemptWork,0);

      const signatureGroups=new Map();
      for (const r of nominatedPreWinnerRows) {
        const parts=fn(r), key=keyOf(parts);
        const g=signatureGroups.get(key) ?? {
          signature:parts,
          developmentSupport:stats.get(key)?.support ?? 0,
          developmentWins:stats.get(key)?.wins ?? 0,
          work:0,attempts:0,levels:new Set(),
        };
        g.work += r.nextAttemptWork;
        g.attempts++;
        g.levels.add(r.levelId);
        signatureGroups.set(key,g);
      }
      const topSignatures=[...signatureGroups.values()]
        .map(g=>({
          signature:g.signature,
          developmentSupport:g.developmentSupport,
          developmentWins:g.developmentWins,
          work:g.work,
          workShare:ratio(g.work,nominatedPreWinnerWork),
          attempts:g.attempts,
          levels:g.levels.size,
        }))
        .sort((a,b)=>b.work-a.work || keyOf(a.signature).localeCompare(keyOf(b.signature)))
        .slice(0,10);

      return {
        minDevelopmentSupport:minSupport,
        validationSolvedLevels:validationSolvedLevels.size,
        nominatedAttempts,
        preWinnerWork,
        nominatedPreWinnerWork,
        capturedPreWinnerWorkShare:ratio(nominatedPreWinnerWork,preWinnerWork),
        endangeredWinnerLevels:endangeredLevels.size,
        endangeredWinnerRate:ratio(endangeredLevels.size,validationSolvedLevels.size),
        diagnostics:{
          nominatedSameStageContinuationWork:sameStageWork,
          nominatedSameStageContinuationWorkShare:ratio(sameStageWork,nominatedPreWinnerWork),
          baselineSameStageContinuationWorkShare:ratio(baselineSameStageWork,preWinnerWork),
          nominatedByPriorOutcome:workBreakdown(nominatedPreWinnerRows,r=>r.priorOutcome,nominatedPreWinnerWork),
          baselineByPriorOutcome:workBreakdown(allPreWinnerRows,r=>r.priorOutcome,preWinnerWork),
          nominatedByNextStage:workBreakdown(nominatedPreWinnerRows,r=>r.nextStage,nominatedPreWinnerWork),
          topSignatures,
        },
      };
    });
    families.push({family,developmentDistinctSignatures:stats.size,thresholds});
  }
  return {
    schemaVersion:1,kind:'pathfinder-action-selection-legal-signal-shadow',
    evidenceRole:'existing-data-analysis',
    interpretation:{
      allowed:'held-out shadow upper bound for simple runtime-legal signature families over recorded action boundaries',
      forbidden:'claim that nominated attempts can be skipped live without changing downstream state, budget, context, or solve outcome',
    },
    population:{rows:rows.length,developmentRows:dev.length,validationRows:val.length},
    families,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv=process.argv.slice(2);
  const arg=n=>argv.find(v=>v.startsWith(`--${n}=`))?.slice(n.length+3) ?? null;
  const inputs=String(arg('inputs') ?? '').split(',').map(v=>v.trim()).filter(Boolean);
  const out=arg('out');
  const datasetOut=arg('dataset-out');
  if (!inputs.length || !out) throw new Error('--inputs=<a.json,b.json> and --out=<result.json> are required');
  const merged={schemaVersion:1,kind:'pathfinder-action-boundary-retained-evidence',split:'sha256(levelId) first32bits mod10: 0-6 development, 7-9 validation',rows:[]};
  for (const input of inputs) {
    const doc=JSON.parse(readFileSync(input,'utf8'));
    merged.rows.push(...buildActionBoundaryDataset(doc,{source:input}).rows);
  }
  const sources=[...new Set(merged.rows.map(r=>r.source))];
  const result={
    ...analyzeLegalSignalCapture(merged),
    bySource:Object.fromEntries(sources.map(source=>[source,analyzeLegalSignalCapture({...merged,rows:merged.rows.filter(r=>r.source===source)})])),
  };
  mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
  writeFileSync(out,`${JSON.stringify(result,null,2)}\n`);
  if (datasetOut) {
    mkdirSync(path.dirname(path.resolve(datasetOut)),{recursive:true});
    writeFileSync(datasetOut,`${JSON.stringify(merged,null,2)}\n`);
  }
  console.log(JSON.stringify(result,null,2));
}
