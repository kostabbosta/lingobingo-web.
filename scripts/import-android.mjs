import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
if (!root) throw Error('Pass Android project source path');
const screens = path.join(
  root,
  'app/src/main/java/com/englishwords/study/ui/screens',
);
const schemas = {
  SentenceLevel: [
    'level',
    'title',
    'emoji',
    'color',
    'description',
    'sentences',
  ],
  SentenceEntry: ['english', 'context'],
  SlangCategory: ['name', 'emoji', 'color', 'entries'],
  SlangEntry: ['phrase', 'meaning', 'example', 'origin'],
  GrammarLesson: [
    'id',
    'title',
    'level',
    'summary',
    'rules',
    'examples',
    'exercises',
  ],
  GrammarExample: ['sentence', 'highlight', 'translation'],
  GrammarExercise: ['question', 'options', 'correctIndex', 'explanation'],
  ReadingArticle: [
    'id',
    'title',
    'category',
    'categoryEmoji',
    'level',
    'size',
    'body',
    'questions',
  ],
  ReadingQuestion: ['question', 'options', 'correctIndex'],
};
function extract(file, marker) {
  const src = fs.readFileSync(path.join(screens, file), 'utf8');
  let i = src.indexOf('listOf(', src.indexOf(marker));
  if (i < 0) throw Error(marker);
  function skip() {
    for (;;) {
      while (/\s/.test(src[i] || '') && i < src.length) i++;
      if (src.slice(i, i + 2) === '//') {
        i = src.indexOf('\n', i);
        continue;
      }
      if (src.slice(i, i + 2) === '/*') {
        i = src.indexOf('*/', i) + 2;
        continue;
      }
      break;
    }
  }
  function value() {
    skip();
    if (src.slice(i, i + 3) === '"""') {
      i += 3;
      const end = src.indexOf('"""', i);
      const out = src.slice(i, end).trim();
      i = end + 3;
      if (src.slice(i, i + 13) === '.trimIndent()') i += 13;
      return out;
    }
    if (src[i] === '"') {
      let start = i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i++] === '"') break;
      }
      return JSON.parse(src.slice(start, i).replace(/\\\$/g, '$'));
    }
    if (/[-0-9]/.test(src[i] || '')) {
      const m = src
        .slice(i)
        .match(/^-?(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?)[fFL]?/)[0];
      i += m.length;
      return Number(m.replace(/[fFL]$/, ''));
    }
    const m = src.slice(i).match(/^[A-Za-z_][\w.]*/);
    if (!m) throw Error('Cannot parse ' + src.slice(i, i + 70));
    let name = m[0];
    i += name.length;
    skip();
    if (src[i] !== '(') return name;
    i++;
    const args = [],
      fields = {};
    while (true) {
      skip();
      if (src[i] === ')') {
        i++;
        break;
      }
      let key = src.slice(i).match(/^(\w+)\s*=/);
      if (key) {
        i += key[0].length;
        fields[key[1]] = value();
      } else args.push(value());
      skip();
      if (src[i] === ',') {
        i++;
        continue;
      }
      if (src[i] !== ')')
        throw Error('Expected comma at ' + src.slice(i, i + 80));
    }
    if (name === 'listOf') return args;
    const keys = schemas[name] || [];
    args.forEach((v, n) => (fields[keys[n] || n] = v));
    return fields;
  }
  return value();
}
schemas.ExamWord = ['word', 'partOfSpeech', 'definition', 'example', 'tip'];
schemas.ExamPack = [
  'id',
  'name',
  'emoji',
  'tagline',
  'color',
  'isPro',
  'wordCount',
  'words',
];
schemas.TestQuestion = [
  'id',
  'level',
  'type',
  'question',
  'options',
  'correctAnswer',
  'explanation',
];
schemas.CwClue = [
  'number',
  'direction',
  'answer',
  'clueText',
  'clueType',
  'translationKa',
  'level',
  'topic',
  'exampleSentence',
  'pronunciation',
];
const content = {
  crosswords: [
    'DAILY',
    'FOOD',
    'SUPERMARKET',
    'EMOTIONS',
    'TRAVEL',
    'OFFICE',
    'HEALTH',
    'PHRASAL',
  ].map((name) => ({
    name,
    clues: extract('CrosswordScreen.kt', 'private val PUZZLE_' + name + ' ='),
  })),
  packs: extract('ExamPacksScreen.kt', 'val packs:'),
  tests: ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].flatMap((level) =>
    extract('LevelTestScreen.kt', 'private val ' + level + 'Questions'),
  ),
  sentences: extract('SentencesScreen.kt', 'val levels:'),
  slang: extract('SlangScreen.kt', 'val categories:'),
  grammar: extract('QuizFlashcardScreens.kt', 'val lessons:'),
  reading: extract('ReadingScreen.kt', 'private val READING_ARTICLES'),
};
fs.writeFileSync('public/data/content.json', JSON.stringify(content));
const seen = new Set(),
  words = [];
for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
  for (const line of fs
    .readFileSync('public/data/' + level.toLowerCase() + '_words.txt', 'utf8')
    .split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [english, category, pos] = line.split('|');
    if (!english || !category || seen.has(english.trim().toLowerCase()))
      continue;
    seen.add(english.trim().toLowerCase());
    words.push({
      id: words.length + 1,
      english: english.trim(),
      category,
      pos: pos || '',
      level,
    });
  }
}
fs.writeFileSync('public/data/words.json', JSON.stringify(words));
console.log({
  words: words.length,
  ...Object.fromEntries(Object.entries(content).map(([k, v]) => [k, v.length])),
});
