#!/usr/bin/env node
/** PG-L out-of-sample dispatch holdout population only; NEVER reads hints/solver results. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const file='data/stress/stress-levels-random.json';
const bytes=readFileSync(file);
const sha=createHash('sha256').update(bytes).digest('hex');
if(sha!=='d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb')throw Error('source corpus changed');
const doc=JSON.parse(bytes),levels=Array.isArray(doc)?doc:doc.levels;
if(!Array.isArray(levels)||levels.length!==1700)throw Error('source sample size changed');
const excluded=['R02781','R02676','R02929','R02579','R02024','R02857','R02037','R03004'];
const excludedIds=new Set(excluded),selected=[],ids=new Set();
for(let k=0;k<levels.length&&selected.length<24;k++){
 const idx=(41+73*k)%levels.length;
 const id=String(levels[idx]?.id||'');
 if(!id||excludedIds.has(id)||ids.has(id))continue;
 ids.add(id);selected.push({id,index:idx});
}
if(selected.length!==24)throw Error('population not complete');
const manifest={
 schema:'pathfinder.pg-l-independent-dispatch-population/v1',
 role:'source-only selection; no search outcomes or historical hints in selection',
 corpusFile:file,corpusSha256:sha,corpusRows:levels.length,
 excludedOriginalEight:excluded,
 selectionRule:'zero-based source index (41 + 73*k) modulo 1700; skip excluded old-eight IDs and duplicate IDs; first 24 eligible',
 selected,
 independentParentCount:selected.length,
 populationIdentity:'Frozen 24 out-of-original-eight Corpus-2 independent parent IDs, selected from physical source order before any new solve/execution result.'
};
const arg=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
if(!arg)throw Error('an explicit --out=file is required');
mkdirSync(path.dirname(path.resolve(arg)),{recursive:true});
writeFileSync(path.resolve(arg),JSON.stringify(manifest,null,2)+'\n');
console.log('PG-L INDEPENDENT MANIFEST '+JSON.stringify(manifest));
