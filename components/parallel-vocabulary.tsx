'use client';
import { useEffect, useState } from 'react';
import { LANGUAGES } from '../lib/learning';
import type { VocabularyContent } from '../lib/vocabulary-content';
import { useLearning } from './learning-provider';
export function ParallelVocabulary({ word }: { word: string }) {
  const { lang: nativeLanguage } = useLearning();
  const [choice,setChoice] = useState<{native: string; language: string} | null>(null), [show,setShow] = useState(true),
    [content,setContent] = useState<VocabularyContent | null>(null), [error,setError] = useState(''), [retry,setRetry] = useState(0);
  const language = choice?.native === nativeLanguage ? choice.language : nativeLanguage;
  const name = LANGUAGES.find(([code]) => code === language)?.[1] ?? nativeLanguage;
  useEffect(() => { try { setShow(localStorage.getItem('lingobingo:parallel-visible') !== 'false'); } catch {} },[]);
  useEffect(() => { setChoice(null); }, [nativeLanguage]);
  useEffect(() => {
    const ac = new AbortController(); setContent(null); setError('');
    fetch('/api/vocabulary?'+new URLSearchParams({word,lang:language}),{signal:ac.signal,cache:retry ? 'no-store' : 'default'})
      .then(async r => { if (!r.ok) throw Error('Examples and translations are temporarily unavailable.'); return r.json() as Promise<VocabularyContent>; })
      .then(value => { if (!ac.signal.aborted) setContent(value); })
      .catch(e => { if (!ac.signal.aborted) setError(e.message); });
    return () => ac.abort();
  },[word,language,retry]);
  function changeLanguage(value:string) { setChoice({native: nativeLanguage, language: value}); }
  const pair = (english:string,translated:string|null|undefined) => <div className={'parallel-pair '+(!show?'english-only':'')}>
    <p lang="en">{english}</p>
    {show && <p lang={translated ? language : 'en'} dir={language==='ar'?'rtl':'auto'}>{translated || (content || error ? 'Translation unavailable' : 'Loading translation…')}</p>}
  </div>;
  return <section className="parallel-vocabulary" aria-label="Word and example translations">
    <div className="parallel-controls">
      <label>Translation language <select value={language} onChange={e=>changeLanguage(e.target.value)}>{LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
      <label><input type="checkbox" checked={show} onChange={e=>{setShow(e.target.checked);try{localStorage.setItem('lingobingo:parallel-visible',String(e.target.checked));}catch{}}}/> Show {name} translations</label>
    </div>
    {pair(word,content?.translation)}
    <h3>Example sentences</h3>
    {content?.examples.map(example=><div key={example.english}>{pair(example.english,example.translation)}</div>)}
    {content && !content.examples.length && <p>{content.examplesUnavailable ? 'The example service is temporarily unavailable. Please try again.' : 'No example sentence is available for this word yet.'} <button type="button" className="text-button" aria-label="Refresh example sentences" onClick={()=>setRetry(n=>n+1)}>Refresh</button></p>}
    {!content && !error && <p role="status">Loading examples…</p>}
    {content?.status==='machine' && show && <p className="small-note">Machine translation. Meaning can vary with context.</p>}
    {content?.generatedExample && <p className="small-note">AI-generated practice example.</p>}
    {content?.status==='draft' && show && <p className="small-note">{name} learning sample · awaiting language review.</p>}
    {(error || content && (!content.translation || content.examples.some(e=>!e.translation))) && <p role="status">{error || 'Some translations are unavailable.'} <button className="text-button" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}
  </section>;
}
