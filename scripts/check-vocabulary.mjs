import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const seed=JSON.parse(fs.readFileSync('public/data/vocabulary-hi.json','utf8'));
const phrases=JSON.parse(fs.readFileSync('public/data/vocabulary-phrases.json','utf8'));
const lessonExamples=JSON.parse(fs.readFileSync('public/data/vocabulary-examples.json','utf8'));
const generatorJs=ts.transpileModule(fs.readFileSync('lib/example-generator.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const generatorURL='data:text/javascript;base64,'+Buffer.from(generatorJs).toString('base64');
const source=fs.readFileSync('lib/vocabulary-content.ts','utf8').replace('./example-generator',generatorURL).replace(/import seed[^;]+;/,`const seed=${JSON.stringify(seed)};`).replace(/import phrases[^;]+;/,`const phrases=${JSON.stringify(phrases)};`).replace(/import lessonExamples[^;]+;/,`const lessonExamples=${JSON.stringify(lessonExamples)};`).replace(/import \{ SUPABASE_URL[^;]+;/,'const SUPABASE_URL="https://mock.invalid"; const SUPABASE_ANON_KEY="test";');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const api=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const json=(x,status=200)=>new Response(JSON.stringify(x),{status});
test('missing examples are generated, translated and marked as AI-generated',async()=>{
 globalThis.fetch=async(url)=>String(url).includes('mock.invalid')?json([]):String(url).includes('api.groq.com')?json({choices:[{message:{content:'She keeps a tiny photo inside her locket.'}}]}):json([[['Она хранит маленькую фотографию в медальоне.']]]);
 const row=await api.vocabularyContent('locket','ru','test-key');
 assert.equal(row.generatedExample,true);assert.match(row.examples[0].english,/locket/);assert.ok(row.examples[0].translation);
});
test('generation validates word presence and caches successful sentences',async()=>{
 const gen=await import(generatorURL);
 assert.equal(gen.validExample('This sentence has no target word.','locket'),null);
 let calls=0;globalThis.fetch=async()=>{calls++;return json({choices:[{message:{content:'The seahorse swims slowly near the coral.'}}]})};
 const [a,b]=await Promise.all([gen.generateExample('seahorse','test-key'),gen.generateExample('seahorse','test-key')]);
 assert.equal(a,b);assert.equal(calls,1);await gen.generateExample('seahorse','test-key');assert.equal(calls,1);
});
test('Hindi missing and malformed translations are not shown as English',()=>{
 assert.equal(api.cleanTranslation('apple','hi'),null); assert.equal(api.cleanTranslation('  सेब  ','hi'),'सेब');
 assert.equal(api.normalizeContent({english_word:42},'apple','hi'),null);
 assert.equal(api.normalizeContent({...seed[0],language:'fr'},'apple','hi'),null);
});
test('shared content takes precedence over bundled samples',async()=>{
 globalThis.fetch=async()=>json([{...seed[0],translation:'परीक्षण',status:'reviewed'}]);
 assert.equal((await api.vocabularyContent('apple','hi')).status,'reviewed');
});
test('offline sample retains paired Hindi example',async()=>{
 globalThis.fetch=async()=>{throw Error('offline')};const row=await api.vocabularyContent('apple','hi');
 assert.equal(row.translation,'सेब');assert.equal(row.examples[0].translation,'वह हर दिन एक सेब खाती है।');assert.equal(row.status,'draft');
});
test('offline unknown vocabulary returns explicit missing content',async()=>{
 globalThis.fetch=async()=>{throw Error('offline')};const row=await api.vocabularyContent('unknownsample','hi');
 assert.equal(row.translation,null);assert.deepEqual(row.examples,[]);assert.equal(row.status,'missing');assert.equal(row.examplesUnavailable,true);
});
test('switching language reuses the English apple example without a dictionary request',async()=>{
 const seen=[];globalThis.fetch=async(url)=>{const u=new URL(url);seen.push(u.hostname);if(u.hostname==='mock.invalid')return json([]);assert.equal(u.hostname,'translate.googleapis.com');return json([[[u.searchParams.get('q')==='apple'?'jabłko':'Ona je jabłko każdego dnia.']]]);};
 const row=await api.vocabularyContent('apple','pl');assert.equal(row.translation,'jabłko');assert.equal(row.examples[0].english,'She eats an apple every day.');assert.equal(row.examples[0].translation,'Ona je jabłko każdego dnia.');assert.ok(!seen.includes('api.dictionaryapi.dev'));
});
test('English sample stays visible when the selected language translation fails',async()=>{
 globalThis.fetch=async()=>{throw Error('offline')};const row=await api.vocabularyContent('apple','pl');assert.equal(row.examples[0].english,'She eats an apple every day.');assert.equal(row.examples[0].translation,null);
});
test('an empty shared example list does not suppress the bundled English example',async()=>{
 globalThis.fetch=async(url)=>String(url).includes('mock.invalid')?json([{english_word:'apple',language:'pl',translation:'jabłko',examples:[],status:'reviewed'}]):json([[['Przykład.']]]);
 const row=await api.vocabularyContent('apple','pl');assert.equal(row.translation,'jabłko');assert.equal(row.examples[0].english,'She eats an apple every day.');
});
test('missing example translation preserves its English source',async()=>{
 globalThis.fetch=async(url)=>String(url).includes('mock.invalid')?json([]):String(url).includes('dictionaryapi')?json([{meanings:[{definitions:[{example:'An example.'}]}]}]):json([[['English fallback']]]);
 const row=await api.vocabularyContent('unknownsample','hi');assert.equal(row.examples[0].english,'An example.');assert.equal(row.examples[0].translation,null);
});
test('all bundled samples have paired Devanagari content',()=>{
 assert.equal(seed.length,8);for(const row of seed){assert.ok(api.cleanTranslation(row.translation,'hi'));assert.ok(row.examples.length);for(const e of row.examples){assert.ok(e.english);assert.ok(api.cleanTranslation(e.translation,'hi'));}}
});
test('pest control has a Russian example even when external services fail',async()=>{
 globalThis.fetch=async()=>{throw Error('offline')};
 const row=await api.vocabularyContent('pest control','ru');
 assert.equal(row.translation,'борьба с вредителями');
 assert.equal(row.examples[0].english,'Pest control helps protect the house from insects.');
 assert.equal(row.examples[0].translation,'Борьба с вредителями помогает защитить дом от насекомых.');
 assert.equal(row.examplesUnavailable,undefined);
});
test('pest control reuses its English example for other languages',async()=>{
 globalThis.fetch=async(url)=>{assert.ok(!String(url).includes('dictionaryapi'));return String(url).includes('mock.invalid')?json([]):json([[['अनुवाद']]]);};
 const row=await api.vocabularyContent('pest control','hi');
 assert.equal(row.examples[0].english,'Pest control helps protect the house from insects.');
 assert.equal(row.examples[0].translation,'अनुवाद');
});
test('sour has an offline Russian example',async()=>{
 globalThis.fetch=async()=>{throw Error('offline')};
 const row=await api.vocabularyContent('sour','ru');
 assert.equal(row.examples[0].english,'This lemon tastes sour.');
 assert.equal(row.examples[0].translation,'Этот лимон кислый на вкус.');
});
test('existing lesson examples survive a dictionary outage in any language',async()=>{
 globalThis.fetch=async()=>{throw Error('offline')};
 const row=await api.vocabularyContent('analyse','ru');
 assert.ok(row.examples[0].english.includes('analyse'));
 assert.equal(row.examples[0].translation,null);
 assert.equal(row.examplesUnavailable,undefined);
 assert.ok(!lessonExamples.sour?.some(sentence => /resource/i.test(sentence) && !/\bsour\b/i.test(sentence)));
});

test('Georgian fallback handles provider failure, deduplicates requests and caches success',async()=>{
 let calls=0;
 globalThis.fetch=async(url)=>{if(String(url).includes('googleapis'))return json({},429);calls++;return json({choices:[{message:{content:JSON.stringify({translation:'პურის საცხობი აპარატი'})}}]});};
 const values=await Promise.all([api.machineTranslation('bread machine','ka','key'),api.machineTranslation('bread machine','ka','key')]);
 assert.deepEqual(values,['პურის საცხობი აპარატი','პურის საცხობი აპარატი']);assert.equal(calls,1);
 assert.equal(await api.machineTranslation('bread machine','ka','key'),values[0]);assert.equal(calls,1);
});
test('failed or wrong-script fallback is not cached and can be retried',async()=>{
 globalThis.fetch=async(url)=>String(url).includes('googleapis')?json({},503):json({choices:[{message:{content:JSON.stringify({translation:'English instead'})}}]});
 assert.equal(await api.machineTranslation('translation-retry','ka','key'),null);
 globalThis.fetch=async(url)=>String(url).includes('googleapis')?json({},503):json({choices:[{message:{content:JSON.stringify({translation:'თარგმანი'})}}]});
 assert.equal(await api.machineTranslation('translation-retry','ka','key'),'თარგმანი');
});
test('incomplete shared examples are translated without losing their English text',async()=>{
 globalThis.fetch=async(url)=>String(url).includes('mock.invalid')?json([{english_word:'test phrase',language:'ka',translation:'სიტყვა',examples:[{english:'This is a test phrase.',translation:null}],status:'reviewed'}]):String(url).includes('googleapis')?json({},403):json({choices:[{message:{content:JSON.stringify({translation:'ეს საცდელი ფრაზაა.'})}}]});
 const row=await api.vocabularyContent('test phrase','ka','key');
 assert.equal(row.examples[0].english,'This is a test phrase.');assert.equal(row.examples[0].translation,'ეს საცდელი ფრაზაა.');
});

test('bread maker and its Georgian example remain available when all providers are offline',async()=>{
 globalThis.fetch=async()=>{throw Error('offline')};
 const row=await api.vocabularyContent('bread maker','ka');
 assert.equal(row.translation,'პურის საცხობი აპარატი');
 assert.equal(await api.machineTranslation('bread maker','ka'),row.translation);
 assert.equal(await api.machineTranslation(row.examples[0].english,'ka'),row.examples[0].translation);
 assert.ok(row.examples[0].translation);
});
