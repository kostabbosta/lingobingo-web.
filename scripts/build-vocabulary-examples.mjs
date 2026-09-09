import fs from 'node:fs';

// Reuse authored lesson content; never fabricate placeholder example sentences.
const content = JSON.parse(fs.readFileSync('public/data/content.json', 'utf8'));
const words = JSON.parse(fs.readFileSync('public/data/words.json', 'utf8'));
const candidates = [...new Set([
  ...content.packs.flatMap(pack => pack.words.map(word => word.example)),
  ...content.sentences.flatMap(group => group.sentences.map(sentence => sentence.english)),
  ...content.slang.flatMap(group => group.entries.map(entry => entry.example)),
  ...content.grammar.flatMap(topic => topic.examples.map(example => example.sentence)),
].filter(sentence => typeof sentence === 'string' && sentence.trim() && !/___|…|\.\.\./.test(sentence)))];
const index = {};
for (const {english} of words) {
  const key = english.trim().toLowerCase();
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|[^a-z0-9'])${escaped}($|[^a-z0-9'])`, 'i');
  const examples = candidates.filter(sentence => match.test(sentence)).slice(0, 2);
  if (examples.length) index[key] = examples;
}
fs.writeFileSync('public/data/vocabulary-examples.json', JSON.stringify(index, null, 2) + '\n');
console.log(`Bundled lesson examples for ${Object.keys(index).length} vocabulary entries.`);
