#!/usr/bin/env node
/** Derive PG-I independent-parent hardness/response census from canonical analysis. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {summarizeParentResponseHardness} from './parent-response-hardness-lib.mjs';
const args=new Map(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{
  const i=x.indexOf('=');return i>2?[x.slice(0,i),x.slice(i+1)]:[x,null];
}));
const input=args.get('--analysis'),output=args.get('--out');
if(!input||!output)throw Error('Use --analysis=<analysis.json> --out=<summary.json>');
const source=JSON.parse(readFileSync(path.resolve(input),'utf8'));
if(source.kind!=='pathfinder-family-technique-response-analysis'||!Array.isArray(source.families))throw Error('incorrect canonical upstream analysis');
const result=summarizeParentResponseHardness(source.families);
for(const [got,expected,description] of [
  [result.summary.independentParents,source.summary?.parentFamilies,'parent count'],
  [result.summary.edges,source.summary?.variants,'variant count'],
  [result.summary.responseVectorChanges,source.summary?.edgesWithSolveStateFlip,'solve-state flip count'],
]){
 if(Number.isInteger(expected)&&got!==expected)throw Error(`PG-I ${description} disagrees with canonical family analyzer: ${got} != ${expected}`);
}
result.source={analysisInput:input,analysisKind:source.kind};
mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
writeFileSync(path.resolve(output),JSON.stringify(result,null,2)+'\n');
console.log('PG-I PARENT RESPONSE VERDICT '+JSON.stringify(result));
