import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const html = await readFile('index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'HTML IDs must be unique');
for (const id of ['hero', 'about', 'founders', 'objectives', 'scrim']) assert(ids.includes(id));
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!/^(https?:|data:)/.test(match[1])) await access(match[1]);
}
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(match[1]), `Missing target ${match[1]}`);
for (const match of html.matchAll(/<script[^>]*src="([^"]+)"/g)) execFileSync(process.execPath, ['--check', match[1]]);
const context = vm.createContext({ window: {}, Date, TextEncoder });
vm.runInContext(await readFile('team-data.js', 'utf8'), context);
assert.equal(Object.keys(context.window.SCP_DOSSIERS).length, 12);
for (const [id, member] of Object.entries(context.window.SCP_DOSSIERS)) {
  assert(html.includes(id), `Missing member ${id}`);
  assert(member.name && member.track.length && member.strengths.length && member.stats.length);
  for (const [, score] of member.stats) assert(score >= 0 && score <= 100);
}
assert.equal((html.match(/class="founder-card /g) || []).length, 4);
assert(html.includes('2026-07-17'), 'Preserve actual schedule update date');
vm.runInContext(await readFile('schedule.js', 'utf8'), context);
const { nextOccurrence, calendar } = context.SCPSchedule;
const cases = [
  [5, 20, '2026-09-04T12:59:59Z', '2026-09-04T13:00:00.000Z'],
  [5, 20, '2026-09-04T13:00:00Z', '2026-09-11T13:00:00.000Z'],
  [5, 20, '2026-09-04T23:00:00Z', '2026-09-11T13:00:00.000Z'],
  [6, 19, '2026-09-04T23:00:00Z', '2026-09-05T12:00:00.000Z'],
  [0, 15, '2026-09-05T23:00:00Z', '2026-09-06T08:00:00.000Z'],
  [0, 15, '2026-09-06T08:00:00Z', '2026-09-13T08:00:00.000Z'],
  [5, 20, '2026-12-31T18:00:00Z', '2027-01-01T13:00:00.000Z']
];
for (const [day, hour, now, expected] of cases) assert.equal(nextOccurrence(day, hour, new Date(now)).toISOString(), expected);
const ics = calendar(new Date('2026-09-04T10:00:00Z'));
assert(ics.endsWith('END:VCALENDAR\r\n'));
assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
assert.equal((ics.match(/RRULE:FREQ=WEEKLY/g) || []).length, 3);
assert.equal((ics.match(/DTEND:/g) || []).length, 2, 'Saturday finish must remain unspecified');
assert(ics.includes('DTSTART:20260904T130000Z'));
assert(ics.includes('DTEND:20260904T150000Z'));
assert(ics.includes('DTSTART:20260905T120000Z'));
assert(ics.includes('DTSTART:20260906T080000Z'));
for (const line of ics.split('\r\n')) assert(Buffer.byteLength(line, 'utf8') <= 75, 'Calendar line folding');
console.log('Passed: local links/assets, JavaScript syntax, 12 complete dossiers, 4 founders, 7 WIB boundaries, weekly calendar and UTF-8 folding.');
