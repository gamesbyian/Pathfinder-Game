#!/usr/bin/env node
/**
 * PG-L prospective independent *SOURCE ONLY* cohort freeze.
 * No solver invocation, hint read, history winner use or outcomes.
 * Before replay-source canary verdict influences any sample selection.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const CORPUS='data/stress/stress-levels-random.json';
const PRIOR='reports/stress/pg-l-independent-dispatch-holdout-20261018-population.json';
const EXPECTED='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb';
const N=24,START=281,STEP=137;
const assert=(ok,m)=>{if(!ok)throw Error(m)};
const hash=s=>createHash('sha256').update(s).digest('hex');
if(process.argv.includes('--self-test')){
 const seq=Array.from({length:1700},(_,i)=>(START+STEP*i)%1700);
 assert(new Set(seq).size===1700,'source index permutation not invertible');
 assert(seq[0]===281&&seq[1]===418,'source start');
 console.log('PG-L prospective source-only permutation self-test passed');
 process.exit(0);
}
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
assert(out,'--out expected');
const b=readFileSync(CORPUS);
assert(hash(b)===EXPECTED,'Corpus2 frozen source SHA mismatch');
const doc=JSON.parse(b),levels=Array.isArray(doc)?doc:doc.levels;
assert(Array.isArray(levels)&&levels.length===1700,'source level count changed');
const src=JSON.parse(readFileSync(PRIOR,'utf8'));
assert(src.selected?.length===24&&src.corpusSha256===EXPECTED,'previous source-only roster changed');
const prior=new Set(src.selected.map(x=>x.id));
for(const id of ['R02781','R02676','R02929','R02579','R02024','R02857','R02037','R03004'])prior.add(id);
const chosen=[];
for(let j=0;j<1700 && chosen.length<N;j++){
 const index=(START+STEP*j)%1700;
 const record=levels[index];
 assert(record&&typeof record.id==='string','missing source-only id');
 if(prior.has(record.id))continue;
 chosen.push({ordinal:chosen.length+1,sourceIndex:index,id:record.id});
}
assert(chosen.length===N && new Set(chosen.map(x=>x.id)).size===N,'source-only selection incomplete');
assert(chosen.every(x=>!prior.has(x.id)),'historical parent overlap');
const result={schema:'pathfinder.pg-l-flood-replay-prospective-corpus2-24-source-freeze/v1',
 evidenceRole:'source-only-prospective',sourceExecutionSha:process.env.GITHUB_SHA??null,
 corpusFile:CORPUS,corpusSha256:EXPECTED,
 priorPopulationFile:PRIOR,priorExcludedCount:prior.size,
 selector:{n:N,start:START,step:STEP,corpusRecords:1700,
  order:'cycle through source index permutation, exclude prior source-only parents and original eight, retain first 24',
  noSolverResultsAccess:true,noHints:true,sourceFrozenBeforeTreatmentResults:true},
 independentParentCount:chosen.length,selected:chosen};
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(path.resolve(out),JSON.stringify(result,null,2)+'\n');
console.log('PG-L HOLDOUT SOURCE FREEZE '+JSON.stringify({count:chosen.length,first:chosen.slice(0,4),last:chosen.at(-1)}));
