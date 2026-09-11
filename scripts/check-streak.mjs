import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function moduleURL(source) { return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'); }
const { streakDays } = await import(moduleURL(fs.readFileSync('lib/daily-stats.ts','utf8')));

const day = 86400000;
const noon = new Date(2026, 8, 11, 12, 0, 0).getTime();
const reviewed = (...offsets) => offsets.map(days => ({ last_reviewed_at: noon - days * day }));

test('a run of consecutive days counts every day in the run', () => {
  assert.equal(streakDays(reviewed(0, 1, 2, 3), noon), 4);
});
test('several reviews on one day still count as one day', () => {
  const rows = [{ last_reviewed_at: noon }, { last_reviewed_at: noon - 3600000 }, { last_reviewed_at: noon - 7200000 }];
  assert.equal(streakDays(rows, noon), 1);
});
test('a gap ends the run', () => {
  assert.equal(streakDays(reviewed(0, 1, 3, 4), noon), 2);
});
test('a morning before practice keeps yesterday-anchored run alive', () => {
  const morning = new Date(2026, 8, 11, 7, 0, 0).getTime();
  assert.equal(streakDays(reviewed(1, 2, 3), morning), 3);
});
test('a run that ended before yesterday is over', () => {
  assert.equal(streakDays(reviewed(2, 3, 4), noon), 0);
});
test('no practice at all is not a streak', () => {
  assert.equal(streakDays([], noon), 0);
  assert.equal(streakDays([{ last_reviewed_at: 0 }], noon), 0);
});
test('day boundaries follow the local calendar, not fixed 24 hour blocks', () => {
  const justAfterMidnight = new Date(2026, 8, 11, 0, 5, 0).getTime();
  const lateYesterday = new Date(2026, 8, 10, 23, 55, 0).getTime();
  assert.equal(streakDays([{ last_reviewed_at: lateYesterday }, { last_reviewed_at: justAfterMidnight }], justAfterMidnight), 2);
});
