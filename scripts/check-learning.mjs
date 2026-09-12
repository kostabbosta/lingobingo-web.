import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function moduleURL(source) { return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'); }
const progressURL=moduleURL(fs.readFileSync('lib/progress.ts','utf8'));
const progress=await import(progressURL);
const accountCache=await import(moduleURL(fs.readFileSync('lib/account-cache.ts','utf8')));
test('account cache isolates verified accounts and expires stale snapshots',()=>{
 const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const account={user:{email:'learner@example.com',name:'Learner'},settings:{lang_code:'ru'},progress:[],repeat:[]};
 accountCache.writeAccountCache(storage,account,1000);
 assert.deepEqual(accountCache.readAccountCache(storage,account.user.email,2000),account);
 assert.equal(accountCache.readAccountCache(storage,'other@example.com',2000),null);
 assert.equal(accountCache.readAccountCache(storage,account.user.email,86402000),null);
 accountCache.clearAccountCache(storage,account.user.email);assert.equal(map.size,0);
});
test('broken or unavailable account cache never prevents fresh synchronization',()=>{
 const storage={getItem:()=>'{invalid',setItem:()=>{throw Error('quota')},removeItem:()=>{throw Error('blocked')}};
 assert.equal(accountCache.readAccountCache(storage,'test'),null);
 assert.doesNotThrow(()=>accountCache.writeAccountCache(storage,{user:{email:'test',name:'Test'},settings:{},progress:[],repeat:[]}));
 assert.doesNotThrow(()=>accountCache.clearAccountCache(storage,'test'));
});
const {reconcilePreferences}=await import(moduleURL(fs.readFileSync('lib/settings-sync.ts','utf8')));
test('older database settings cannot overwrite a confirmed save, but newer settings can',()=>{
 const local={email:'learner@example.com',settings:{lang_code:'ru',level_code:'B1',updated_at:200}};
 assert.equal(reconcilePreferences({lang_code:'ka',updated_at:100},local,local.email).lang_code,'ru');
 assert.equal(reconcilePreferences({lang_code:'hi',updated_at:300},local,local.email).lang_code,'hi');
 assert.equal(reconcilePreferences({lang_code:'ka',updated_at:100},local,'other@example.com').lang_code,'ka');
});
const configURL=moduleURL('export const SUPABASE_URL="https://mock.invalid";export const SUPABASE_ANON_KEY="test-anon";');
const listsURL=moduleURL(fs.readFileSync('lib/word-lists.ts','utf8'));
const routeSource=fs.readFileSync('app/api/app/route.ts','utf8').replace(/import \{ getCatalog \}[^;]+;/, 'const getCatalog=async()=>'+JSON.stringify(JSON.parse(fs.readFileSync('public/data/words.json','utf8')))+';').replace('../../../lib/word-lists',listsURL).replace('../../../lib/progress',progressURL).replace('../../../lib/supabase-config',configURL);
const route=await import(moduleURL(routeSource));
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const request=(body,origin='http://localhost:3000',cookie='lb_access=test-access; lb_refresh=test-refresh')=>new Request('http://localhost:3000/api/app',{method:body?'POST':'GET',headers:{...(origin?{Origin:origin}:{}),'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
const user={id:'synthetic-user',email:'Learner@Example.com',user_metadata:{username:'Learner'}};
const auth=()=>json(user);
test('preference saves use the verified account and never rename it',async()=>{
 let saved;
 globalThis.fetch=async(url,options)=>{if(new URL(url).pathname==='/auth/v1/user')return auth();assert.match(String(url),/user_settings\?on_conflict=user_id/);saved=JSON.parse(options.body);return json(null);};
 const r=await route.POST(request({action:'settings',user_id:'someone-else',level:'A1',lang:'ru',name:'Deltageo',levelTitle:'Starter',langName:'Russian'}));
 assert.equal(r.status,200);assert.equal(saved.user_id,'learner@example.com');assert.equal(saved.lang_code,'ru');
 // The username is assigned at registration and identifies the account on both
 // clients, so a submitted name must not reach the stored row.
 assert.equal('username' in saved,false);
 const result=await r.json();assert.equal(result.email,saved.user_id);assert.equal(result.settings.updated_at,saved.updated_at);assert.equal(result.settings.lang_code,'ru');
});

test('Android SM-2 intervals, errors, mastery, and reset precedence',()=>{
 let row={};for(const days of [1,3,7]){row=progress.nextProgress(row,true,4000,1000);assert.equal(row.interval_days,days)}
 assert.equal(row.proficiency,100);row=progress.nextProgress(row,false,6000,2000);assert.equal(row.repetition_number,0);assert.equal(row.interval_days,1);assert.equal(row.proficiency,75);assert.equal(row.times_viewed,4);
 const common={word_id:1,user_id:'test',english_word:'apple',updated_at:100};
 const rows=progress.latestByWord([{...common,proficiency:100},{...common,proficiency:0},{...common,english_word:null}]);assert.equal(rows.length,1);assert.equal(rows[0].proficiency,0);
 assert.equal(progress.latestByWord([{...common,proficiency:100},{...common,english_word:' APPLE ',updated_at:101,proficiency:0}])[0].updated_at,101);
});
test('pagination continues on short pages and rejects a failed later page',async()=>{
 const queries=[];const rows=await progress.readAllProgress(async q=>{queries.push(q);return queries.length===1?[{word_id:1}]:queries.length===2?[{word_id:3}]:[]},'learner@example.com');assert.equal(rows.length,2);assert.equal(queries[2].get('word_id'),'gt.3');
 let calls=0;await assert.rejects(progress.readAllProgress(async()=>{if(calls++)throw Error('offline');return [{word_id:1}]},'test'),/offline/);
 await assert.rejects(progress.readAllProgress(async()=>[{word_id:1}],'test'),/Invalid progress page/);
});
test('unauthenticated requests and cross-site writes never reach the backend',async()=>{
 globalThis.fetch=()=>{throw Error('Unexpected network access')};
 assert.equal((await route.GET(request(undefined,undefined,''))).status,401);
 assert.equal((await route.POST(request({action:'progress'},'https://untrusted.invalid'))).status,403);
 assert.equal((await route.POST(request({action:'login',email:'not-an-email',password:'secret'}))).status,400);
});
test('sign-in returns HttpOnly session cookies, never tokens in JSON',async()=>{
 globalThis.fetch=async(url,options)=>{assert.match(url,/grant_type=password/);assert.equal(JSON.parse(options.body).email,'learner@example.com');return json({access_token:'synthetic-access',refresh_token:'synthetic-refresh',user})};
 const r=await route.POST(request({action:'login',email:'Learner@Example.com',password:'synthetic-password'}));const body=await r.json();assert.equal(body.signedIn,true);assert.equal(JSON.stringify(body).includes('synthetic-access'),false);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Lax/);
});
test('shared account reads use verified lowercase email and collapse legacy duplicates',async()=>{
 globalThis.fetch=async(url,options)=>{const u=new URL(url);if(u.pathname==='/auth/v1/user')return auth();assert.equal(options.headers.Authorization,'Bearer test-access');assert.equal(u.searchParams.get('user_id'),'eq.learner@example.com');
 if(u.pathname.endsWith('user_progress'))return u.searchParams.has('word_id')?json([]):json([{word_id:1,english_word:'apple',updated_at:1,proficiency:100},{word_id:2,english_word:'apple',updated_at:2,proficiency:0},{word_id:3,english_word:null,updated_at:1}]);
 if(u.pathname.endsWith('user_settings'))return json([{username:'Learner',level_code:'B1',lang_code:'ka'}]);return json([{english_word:null},{word_id:5,english_word:'apple'}]);};
 const r=await route.GET(request());assert.equal(r.status,200);const data=await r.json();assert.equal(data.progress.length,1);assert.equal(data.progress[0].proficiency,0);assert.equal(data.repeat.length,1);assert.equal(data.settings.level_code,'B1');
});
test('review retries compare-and-set conflicts and cannot write a supplied foreign account',async()=>{
 let reads=0,writes=0;globalThis.fetch=async(url,options)=>{const u=new URL(url);if(u.pathname==='/auth/v1/user')return auth();assert.equal(u.searchParams.get('user_id'),'eq.learner@example.com');if(options.method==='GET'){reads++;return json([{word_id:77,user_id:'learner@example.com',english_word:'apple',updated_at:reads,times_viewed:reads,times_correct:0,times_incorrect:reads,proficiency:0}])}writes++;const row=JSON.parse(options.body);assert.equal(row.user_id,'learner@example.com');assert.equal(row.word_id,77);assert.equal(u.searchParams.get('updated_at'),'eq.'+reads);return json(writes===1?[]:[row])};
 const r=await route.POST(request({action:'progress',user_id:'other@example.com',word:'apple',wordId:1,correct:true,responseTime:2000}));assert.equal(r.status,200);assert.equal(writes,2);assert.equal((await r.json()).progress.times_viewed,3);
});
test('new reviews avoid numeric IDs already occupied on Android',async()=>{
 globalThis.fetch=async(url,options)=>{const u=new URL(url);if(u.pathname==='/auth/v1/user')return auth();if(options.method==='GET')return json(u.searchParams.get('order')==='word_id.desc'?[{word_id:100}]:[]);const row=JSON.parse(options.body);assert.equal(row.word_id,101);assert.equal(row.english_word,'apple');assert.equal(options.headers.Prefer,'resolution=ignore-duplicates,return=representation');return json([row])};
 const r=await route.POST(request({action:'progress',word:'apple',wordId:1,correct:true,responseTime:2000}));assert.equal(r.status,200);
});
test('failed cloud read does not write or report empty-account success',async()=>{
 let writes=0;globalThis.fetch=async(url,options)=>{if(options.method!=='GET')writes++;if(url.endsWith('/auth/v1/user'))return auth();return json({message:'offline'},503)};const r=await route.GET(request());assert.notEqual(r.status,200);assert.equal(writes,0);assert.ok((await r.json()).error);
});
test('expired sessions refresh with the existing Android identity',async()=>{
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/auth/v1/user'))return json({message:'expired'},401);if(url.includes('grant_type=refresh_token')){assert.equal(JSON.parse(options.body).refresh_token,'test-refresh');return json({access_token:'new-access',refresh_token:'new-refresh',user})}assert.equal(options.headers.Authorization,'Bearer new-access');return json([])};const r=await route.GET(request());assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/lb_refresh=new-refresh/);
});
test('imported Android learning content is complete and references valid answers',()=>{
 const words=JSON.parse(fs.readFileSync('public/data/words.json','utf8')),content=JSON.parse(fs.readFileSync('public/data/content.json','utf8'));
 assert.equal(words.length,17078);assert.equal(new Set(words.map(w=>w.english.toLowerCase())).size,words.length);assert.equal(content.grammar.length,30);assert.equal(content.tests.length,150);assert.equal(content.crosswords.length,8);
 for(const q of [...content.grammar.flatMap(g=>g.exercises),...content.reading.flatMap(r=>r.questions)])assert.ok(q.options[q.correctIndex]);for(const q of content.tests)assert.ok(q.options[q.correctAnswer]);for(const p of content.crosswords)for(const clue of p.clues)assert.match(clue.answer,/^[A-Z]+$/);
});

test('missing access cookie refreshes directly without validating the public app key',async()=>{
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push(url);
  assert.equal(url.endsWith('/auth/v1/user'),false);
  if(url.includes('grant_type=refresh_token')){
   assert.equal(JSON.parse(options.body).refresh_token,'retained-refresh');
   return json({access_token:'renewed-access',refresh_token:'renewed-refresh',user});
  }
  assert.equal(options.headers.Authorization,'Bearer renewed-access');
  return json([]);
 };
 const r=await route.GET(request(undefined,undefined,'lb_refresh=retained-refresh'));
 assert.equal(r.status,200);
 assert.match(calls[0],/grant_type=refresh_token/);
 assert.match(r.headers.get('set-cookie'),/lb_access=renewed-access/);
});

test('database ownership rejection reports permission failure without exposing upstream details',async()=>{
 globalThis.fetch=async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return auth();
  if(options.method==='GET')return json([]);
  return json({code:'42501',message:'private database detail'},403);
 };
 const r=await route.POST(request({action:'progress',word:'apple',wordId:1,correct:true,responseTime:2000}));
 assert.equal(r.status,403);
 const body=await r.json();
 assert.match(body.error,/database access rules/);
 assert.equal(JSON.stringify(body).includes('private database detail'),false);
});

test('identity check returns before loading progress and never returns credentials',async()=>{
 globalThis.fetch=async(url)=>{assert.equal(url.endsWith('/auth/v1/user'),true);return auth();};
 const req=new Request('http://localhost:3000/api/app?identity=1',{headers:{Cookie:'lb_access=test-access'}});
 const r=await route.GET(req);
 assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{email:'learner@example.com'});
 assert.equal(r.headers.get('Cache-Control'),'no-store');
});

test('mastered count cache isolates accounts and tolerates corrupt or unavailable storage',async()=>{
 const cache=await import(moduleURL(fs.readFileSync('lib/stat-cache.ts','utf8')));
 const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 cache.writeMastered(storage,'a@example.com',12);
 assert.equal(cache.readMastered(storage,'a@example.com'),12);
 assert.equal(cache.readMastered(storage,'b@example.com'),null);
 cache.writeMastered(storage,'a@example.com',13);
 assert.equal(cache.readMastered(storage,'a@example.com'),13);
 assert.equal(cache.readMastered({getItem:()=>'{broken'},'a'),null);
 assert.equal(cache.readMastered({getItem:()=>'{"count":-1}'},'a'),null);
 assert.equal(cache.readMastered({getItem:()=>{throw Error('blocked')}},'a'),null);
 assert.doesNotThrow(()=>cache.writeMastered({setItem:()=>{throw Error('full')}},'a',1));
});

test('word actions wait for loading progress instead of treating it as signed out',async()=>{
 const {requireLoadedAccount}=await import(moduleURL(fs.readFileSync('lib/account-readiness.ts','utf8')));
 let account=null;let finish;
 const loading=new Promise(resolve=>{finish=()=>{account={email:'learner@example.com'};resolve();};});
 let completed=false;
 const result=requireLoadedAccount(()=>account,()=>loading,()=>false).then(value=>{completed=true;return value;});
 await Promise.resolve();assert.equal(completed,false);
 finish();assert.deepEqual(await result,{email:'learner@example.com'});
 await assert.rejects(requireLoadedAccount(()=>null,async()=>{},()=>false),error=>error.status===503);
 await assert.rejects(requireLoadedAccount(()=>null,async()=>{},()=>true),error=>error.status===401);
 let loads=0;
 assert.deepEqual(await requireLoadedAccount(()=>account,async()=>{loads++;},()=>false),account);
 assert.equal(loads,0);
});

test('learning a repeat word can remove only that word from the verified account',async()=>{
 let deletes=0;
 globalThis.fetch=async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return auth();
  const u=new URL(url);
  assert.equal(u.pathname,'/rest/v1/user_repeat_words');
  assert.equal(options.method,'DELETE');
  assert.equal(u.searchParams.get('user_id'),'eq.learner@example.com');
  assert.equal(u.searchParams.get('english_word'),'eq.apple');
  deletes++;return new Response(null,{status:204});
 };
 const r=await route.POST(request({action:'repeat',word:'apple',wordId:1,saved:false,user_id:'other@example.com'}));
 assert.equal(r.status,200);assert.equal(deletes,1);
 assert.deepEqual(await r.json(),{ok:true});
});

test('statistic lists select mastered, practiced, due and repeat words across levels',async()=>{
 const {wordsForStatistic}=await import(moduleURL(fs.readFileSync('lib/word-lists.ts','utf8')));
 const words=[{id:1,english:'apple',level:'A1'},{id:2,english:'abstract',level:'C1'}];
 const rows=[{word_id:12,english_word:' APPLE ',proficiency:80,next_review_at:200},{word_id:13,english_word:'abstract',proficiency:50,next_review_at:50},{word_id:14,english_word:'legacy phrase',proficiency:100,next_review_at:0}];
 assert.deepEqual(wordsForStatistic(words,rows,[],'mastered',100).map(w=>w.english),['apple','legacy phrase']);
 assert.deepEqual(wordsForStatistic(words,rows,[],'due',100).map(w=>w.english),['abstract','legacy phrase']);
 assert.equal(wordsForStatistic(words,rows,[],'practiced',100).length,3);
 assert.equal(wordsForStatistic(words,rows,[],'mastered',100).filter(w=>w.level==='A1').length,1);
 assert.equal(wordsForStatistic(words,rows,[],'mastered',100)[1].level,'Other');
 assert.deepEqual(wordsForStatistic(words,rows,[{word_id:9,english_word:'ABSTRACT'}],'repeat',100),[words[1]]);
 assert.deepEqual(wordsForStatistic(words,rows,[],'all',100),words);
});

test('logout clears expired sessions and late refresh cookies cannot sign back in', async () => {
 globalThis.fetch=async()=>json({message:'expired'},401);
 const response=await route.POST(new Request('http://localhost:3000/api/app',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json',cookie:'lb_access=expired; lb_refresh=old'},body:JSON.stringify({action:'logout'})}));
 assert.equal(response.status,200);
 assert.match(response.headers.get('set-cookie'),/lb_signed_out=1/);
 assert.match(response.headers.get('set-cookie'),/lb_access=;.*Max-Age=0/);
 globalThis.fetch=()=>{throw Error('Must not restore a signed-out session');};
 const stale=await route.GET(new Request('http://localhost:3000/api/app',{headers:{cookie:'lb_access=late; lb_refresh=late; lb_signed_out=1'}}));
 assert.equal(stale.status,401);
});
test('logout purges every learning cache without deleting unrelated storage',()=>{
 const map=new Map([['lingobingo:account:v1:a','private'],['lingobingo:mastered:v1:a','20'],['lingobingo:parallel-visible','true'],['unrelated','keep']]);
 accountCache.clearLearningStorage({get length(){return map.size},key:i=>[...map.keys()][i],removeItem:k=>map.delete(k)});
 assert.deepEqual([...map],[['unrelated','keep']]);
});
const {dailyStats}=await import(moduleURL(fs.readFileSync('lib/daily-stats.ts','utf8')));
test('daily statistics use local calendar boundaries and count words, not lifetime reviews',()=>{
 const now=new Date(2026,8,9,12).getTime(),today=new Date(2026,8,9).getTime();
 assert.deepEqual(dailyStats([{last_reviewed_at:today,created_at:today-1,next_review_at:now+1,times_viewed:30},{last_reviewed_at:today-1,created_at:today-86400000,next_review_at:now},{last_reviewed_at:now,created_at:today,next_review_at:now+1}],now),{practiced:2,newWords:1,due:1});
 assert.deepEqual(dailyStats([],now),{practiced:0,newWords:0,due:0});
});

test('Android statistics exclude orphaned progress and retain legacy repeat entries',async()=>{
 const {catalogProgress,resolveRepeats}=await import(listsURL);
 const rows=[{word_id:17,english_word:'apple',proficiency:100},{word_id:18,english_word:'Word #18',proficiency:100}];
 assert.equal(catalogProgress([{english:'apple'}],rows).length,1);
 assert.deepEqual(resolveRepeats([{word_id:17,english_word:null},{word_id:19,english_word:''},{word_id:20,english_word:'APPLE'}],rows),[{word_id:20,english_word:'APPLE'},{word_id:19,english_word:''}]);
});
const catalogSource=fs.readFileSync('lib/catalog.ts','utf8').replace(/import base[^;]+;/,"const base=[];").replace(/import snapshot[^;]+;/,"const snapshot={additions:[],deletions:[]};");
const {mergeCatalog}=await import(moduleURL(catalogSource));
test('catalog applies Android deletions then additions and preserves existing word IDs',()=>{
 const rows=mergeCatalog([{id:1,english:'apple',level:'A1'},{id:2,english:'old',level:'A1'}],[{english:'apple',difficulty:5},{english:'new',difficulty:3}],['old']);
 assert.deepEqual(rows.map(w=>[w.id,w.english,w.level]),[[1,'apple','A1'],[3,'new','B1']]);
});
