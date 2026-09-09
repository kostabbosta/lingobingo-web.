import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('lib/background-saves.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {BackgroundSaves}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('enqueue returns immediately while slow saves remain visible',async()=>{
 let finish,states;const queue=new BackgroundSaves(value=>states=value);
 queue.add('apple','apple',()=>new Promise(resolve=>finish=resolve));
 assert.equal(queue.size,1);assert.equal(states[0].label,'apple');
 assert.throws(()=>queue.add('apple','apple',async()=>{}),/unfinished save/);
 finish();await tick();assert.equal(queue.size,0);assert.deepEqual(states,[]);
});
test('failed saves stay visible and retry only when requested',async()=>{
 let states,calls=0;const queue=new BackgroundSaves(value=>states=value);
 queue.add('apple','apple',async()=>{if(++calls===1)throw Error('offline')});
 await tick();assert.equal(queue.size,1);assert.equal(states[0].error,'offline');assert.equal(calls,1);
 await queue.run('apple');assert.equal(calls,2);assert.equal(queue.size,0);
});
test('retry resumes after confirmed steps and cannot run concurrently',async()=>{
 let reviewed=false,reviews=0,removals=0;const queue=new BackgroundSaves(()=>{});
 queue.add('apple','apple',async()=>{if(!reviewed){reviews++;reviewed=true;}if(++removals===1)throw Error('repeat unavailable');});
 await tick();await Promise.all([queue.run('apple'),queue.run('apple')]);
 assert.equal(reviews,1);assert.equal(removals,2);assert.equal(queue.size,0);
});
test('independent words can save without waiting for an earlier slow word',async()=>{
 let finish;const queue=new BackgroundSaves(()=>{});
 queue.add('apple','apple',()=>new Promise(resolve=>finish=resolve));
 queue.add('sour','sour',async()=>{});await tick();assert.equal(queue.size,1);
 finish();await tick();assert.equal(queue.size,0);
});
