#!/usr/bin/env node
/**
 * Join canonical broad-run derived evidence after a stress refresh + technique census.
 *
 * This is a reconciliation consumer, not another evidence authority. It preserves
 * the distinct meanings of production participation, equal-work pricing, deep
 * isolated capability and the frozen WS1 continuation challenge.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const ratio = (a,b) => b ? a / b : null;

function getCensusTechniques(census) {
  const pop=census?.techniqueBudgetCurves?.populations?.productionUnsolved
    ?? census?.budgetCurves?.populations?.productionUnsolved
    ?? census?.populations?.productionUnsolved;
  if (!pop || !Array.isArray(pop.techniques)) return new Map();
  return new Map(pop.techniques.map(row=>[row.technique,row]));
}

function getCensusEconomics(census) {
  return new Map((census?.isolatedTechniqueEconomics ?? []).map(row=>[row.technique,row]));
}

function getEw1Techniques(ew1) {
  return new Map((ew1?.techniques ?? []).map(row=>[row.attemptConfigIdentity,row]));
}

function summarizeStageParticipation(ew1) {
  const stages=new Map();
  for (const technique of ew1?.techniques ?? []) {
    for (const stage of technique?.production?.stages ?? []) {
      const current=stages.get(stage.stageId) ?? {
        stageId:stage.stageId, attempts:0, successfulAttempts:0, work:0,
        techniqueIdentities:new Set(),
      };
      current.attempts += num(stage.attempts);
      current.successfulAttempts += num(stage.successfulAttempts);
      current.work += num(stage.work);
      current.techniqueIdentities.add(technique.attemptConfigIdentity);
      stages.set(stage.stageId,current);
    }
  }
  return [...stages.values()].map(row=>({
    stageId:row.stageId,
    attempts:row.attempts,
    successfulAttempts:row.successfulAttempts,
    work:row.work,
    successRate:ratio(row.successfulAttempts,row.attempts),
    techniqueIdentities:[...row.techniqueIdentities].sort(),
  })).sort((a,b)=>b.work-a.work || a.stageId.localeCompare(b.stageId));
}

export function reconcileBroadEvidence({productionSummary=null, equalWorkReach, censusAnalysis, ws1Challenge=null, sources={}}) {
  if (!equalWorkReach || !Array.isArray(equalWorkReach.techniques)) throw new Error('equalWorkReach.techniques is required');
  if (!censusAnalysis) throw new Error('censusAnalysis is required');

  const ew1=getEw1Techniques(equalWorkReach);
  const censusCurves=getCensusTechniques(censusAnalysis);
  const censusEconomics=getCensusEconomics(censusAnalysis);
  const identities=[...new Set([...ew1.keys(),...censusCurves.keys(),...censusEconomics.keys()])].sort();

  const techniques=identities.map(identity=>{
    const e=ew1.get(identity) ?? null;
    const curve=censusCurves.get(identity) ?? null;
    const econ=censusEconomics.get(identity) ?? null;
    const fullBudgetSolves=num(curve?.fullBudgetSolves ?? econ?.solved);
    const ew1Solved=num(e?.equalWork?.solvedLevels ?? e?.equalWork?.solvedCells);
    const productionWins=num(e?.production?.winningLevels);
    const productionWork=num(e?.production?.work);
    const productionAttempts=num(e?.production?.attempts);
    const productionReached=num(e?.production?.reachedLevels);

    const observations=[];
    if (ew1Solved>0) observations.push('cheap-isolated-capability-observed-on-ew1-sample');
    if (fullBudgetSolves>0) observations.push('deep-isolated-capability-observed');
    if (productionWins>0) observations.push('production-winning-capability-observed');
    if (productionAttempts>0 && productionWins===0) observations.push('production-participation-with-zero-recorded-wins');
    if (fullBudgetSolves>0 && ew1Solved===0) observations.push('deep-capability-with-no-ew1-sample-win');
    if (ew1Solved>0 && productionWins===0) observations.push('cheap-isolated-capability-with-zero-recorded-production-wins');

    return {
      technique:identity,
      observations,
      ew1:e ? {
        eligibleCells:num(e.equalWork?.eligibleCells),
        solvedLevels:ew1Solved,
        meanWork:e.equalWork?.meanWork ?? null,
        workBudgetReached:num(e.equalWork?.workBudgetReached),
        naturallyExhausted:num(e.equalWork?.naturallyExhausted),
      } : null,
      deepT1:curve || econ ? {
        fullBudgetSolves,
        fullObservedNodeSpend:curve?.fullObservedNodeSpend ?? null,
        terminationCounts:curve?.terminationCounts ?? null,
        meanAttemptNodes:econ?.meanAttemptNodes ?? null,
        unsharedWithCheaper:econ?.unsharedWithCheaper ?? null,
        substitutionRate:econ?.substitutionRate ?? null,
      } : null,
      production:e ? {
        reachedLevels:productionReached,
        winningLevels:productionWins,
        attempts:productionAttempts,
        work:productionWork,
        meanAttemptWork:e.production?.meanAttemptWork ?? null,
      } : null,
    };
  });

  const cheapMissCandidates=techniques.filter(t=>t.observations.includes('cheap-isolated-capability-with-zero-recorded-production-wins'));
  const zeroWinParticipants=techniques.filter(t=>t.observations.includes('production-participation-with-zero-recorded-wins'));
  const deepNoCheapSample=techniques.filter(t=>t.observations.includes('deep-capability-with-no-ew1-sample-win'));

  const ws1=ws1Challenge ? {
    actionBoundaryDigest:ws1Challenge.actionBoundaryDigest ?? null,
    combined:ws1Challenge.combined ? {
      capturedPreWinnerWorkShare:ws1Challenge.combined.capturedPreWinnerWorkShare ?? null,
      endangeredWinnerLevels:ws1Challenge.combined.endangeredWinnerLevels ?? null,
      validationSolvedLevels:ws1Challenge.combined.validationSolvedLevels ?? null,
      nominatedSameStageContinuationWorkShare:ws1Challenge.combined.diagnostics?.nominatedSameStageContinuationWorkShare ?? null,
      nominatedByPriorOutcome:ws1Challenge.combined.diagnostics?.nominatedByPriorOutcome ?? null,
    } : null,
  } : null;

  const corpora=['corpus1','corpus2'];
  const production=productionSummary ? Object.fromEntries(corpora.map(c=>[c,productionSummary[c] ? {
    total:productionSummary[c].total ?? null,
    solved:productionSummary[c].solved ?? null,
    work:productionSummary[c].work ?? null,
    nodes:productionSummary[c].nodes ?? null,
    commitSha:productionSummary[c].commitSha ?? productionSummary.solverRef ?? null,
  }:null])) : null;

  return {
    schemaVersion:1,
    kind:'pathfinder-broad-evidence-reconciliation',
    evidenceRole:'derived-reconciliation',
    sources,
    production,
    protocolChecks:{
      equalWorkDecisionBearing:equalWorkReach.decisionBearing ?? null,
      equalWorkBlockers:equalWorkReach.blockers ?? [],
      equalWorkProductionCommits:equalWorkReach.production?.commits ?? [],
      equalWorkCurrentHead:equalWorkReach.production?.currentHead ?? null,
      equalWorkMissingMatchedAttemptWork:equalWorkReach.production?.missingMatchedAttemptWork ?? null,
    },
    summary:{
      techniques:techniques.length,
      cheapMissCandidates:cheapMissCandidates.length,
      zeroWinProductionParticipants:zeroWinParticipants.length,
      deepCapabilityNoEw1SampleWin:deepNoCheapSample.length,
      productionStageCount:summarizeStageParticipation(equalWorkReach).length,
    },
    ws1,
    stages:summarizeStageParticipation(equalWorkReach),
    techniques,
    nominations:{
      cheapMissCandidates,
      zeroWinProductionParticipants,
      deepCapabilityNoEw1SampleWin:deepNoCheapSample,
    },
    interpretation:{
      allowed:[
        'identify mismatches among production participation, shallow equal-work isolated capability, and deep isolated capability',
        'nominate techniques/stages for follow-up allocation, continuation, or obsolescence questions',
        'reconcile the frozen WS1 challenge alongside the same broad production evidence',
      ],
      forbidden:[
        'declare a zero-win production stage removable without causal/substitutability and removable-work evidence',
        'treat no EW1 solve on a 60-level sample as absence of cheap capability globally',
        'compare deep T1 node economics directly against EW1 or production canonical work as if currencies were interchangeable',
        'promote scheduler or budget changes from this reconciliation artifact alone',
      ],
    },
  };
}

function main(){
  const args=new Map(process.argv.slice(2).map(arg=>arg.split('=',2)));
  const required=name=>{
    const value=args.get(name);
    if(!value) throw new Error(`${name}=<path> is required`);
    return value;
  };
  const ew1Path=required('--equal-work-reach');
  const censusPath=required('--census-analysis');
  const outPath=required('--out');
  const productionPath=args.get('--production-summary') ?? null;
  const ws1Path=args.get('--ws1-challenge') ?? null;
  const input={
    equalWorkReach:JSON.parse(readFileSync(ew1Path,'utf8')),
    censusAnalysis:JSON.parse(readFileSync(censusPath,'utf8')),
    productionSummary:productionPath ? JSON.parse(readFileSync(productionPath,'utf8')) : null,
    ws1Challenge:ws1Path ? JSON.parse(readFileSync(ws1Path,'utf8')) : null,
    sources:{equalWorkReach:ew1Path,censusAnalysis:censusPath,productionSummary:productionPath,ws1Challenge:ws1Path},
  };
  const result=reconcileBroadEvidence(input);
  mkdirSync(path.dirname(path.resolve(outPath)),{recursive:true});
  writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main();
