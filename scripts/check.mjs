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
const adminHtml = await readFile('admin/index.html', 'utf8');
const adminIds = [...adminHtml.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(adminIds.length, new Set(adminIds).size, 'Admin HTML IDs must be unique');
for (const match of adminHtml.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const target = match[1];
  if (!/^(https?:|data:|\/$)/.test(target)) await access(target.startsWith('/') ? `.${target}` : `admin/${target}`);
}
for (const match of adminHtml.matchAll(/<script[^>]*src="([^"]+)"/g)) {
  const target = match[1].startsWith('/') ? `.${match[1]}` : `admin/${match[1]}`;
  execFileSync(process.execPath, ['--check', target]);
}
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
context.SCPSchedule.setEvents([{
  id: 'event-check', schedule_kind: 'event', operation_type: 'tournament', title: 'Operation Check',
  status: 'cancelled', event_date: '2026-09-09', start_time: '23:30', end_time: '01:00',
  end_open: false, published: true, sort_order: 1
}]);
const eventIcs = context.SCPSchedule.calendar(new Date('2026-09-01T00:00:00Z'));
assert(eventIcs.includes('DTSTART:20260909T163000Z'));
assert(eventIcs.includes('DTEND:20260909T180000Z'), 'Overnight event must end on the following day');
assert(eventIcs.includes('STATUS:CANCELLED'));
assert(!eventIcs.includes('RRULE:'), 'One-time event must not repeat');

const fakeCalls = [];
const fakeStore = new Map();
const fakeFetch = async (requestUrl, options = {}) => {
  fakeCalls.push({ url: String(requestUrl), options });
  let payload = null;
  if (String(requestUrl).includes('/auth/v1/token')) payload = { access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 3600, user: { id: 'admin-id' } };
  else if (String(requestUrl).includes('/rpc/is_scp_admin')) payload = true;
  else if (String(requestUrl).includes('/rest/v1/members') && (options.method || 'GET') === 'GET') payload = [{ id: 'member-id', code: 'SCP-001', photo_path: 'members/SCP-001/profile.webp' }];
  else if (String(requestUrl).includes('/rest/v1/schedule_entries')) payload = [];
  else if (String(requestUrl).includes('/rest/v1/members') && options.method === 'POST') payload = [{ id: 'member-id', ...JSON.parse(options.body) }];
  return new Response(payload === null ? '' : JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const dataContext = vm.createContext({
  window: { SCP_SUPABASE: { url: 'http://127.0.0.1:54321', publishableKey: 'sb_publishable_123456789012345678901234' } },
  localStorage: { getItem: key => fakeStore.get(key) || null, setItem: (key, value) => fakeStore.set(key, value), removeItem: key => fakeStore.delete(key) },
  fetch: fakeFetch, Response, Blob, URL, URLSearchParams, TextEncoder,
  crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
  Date, Math, JSON, Object, String, Number, Boolean, Array, Error, TypeError, Promise, setTimeout, clearTimeout
});
vm.runInContext(await readFile('supabase-client.js', 'utf8'), dataContext);
const dataApi = dataContext.window.SCPData;
assert.equal(dataApi.configured, true);
assert.equal((await dataApi.signIn('admin@example.com', 'password')).user.id, 'admin-id');
assert.equal(await dataApi.verifyAdmin(), true);
assert.equal((await dataApi.listMembers())[0].photo_url, 'http://127.0.0.1:54321/storage/v1/object/public/member-photos/members/SCP-001/profile.webp');
const publicCall = fakeCalls.find(call => call.url.includes('/rest/v1/members'));
assert.equal(publicCall.options.headers.apikey.startsWith('sb_publishable_'), true);
assert.equal('Authorization' in publicCall.options.headers, false, 'Publishable keys must not be sent as bearer JWTs');
const upload = await dataApi.uploadMemberPhoto(new Blob(['photo'], { type: 'image/webp' }), 'SCP-001');
assert.equal(upload.path, 'members/SCP-001/11111111-1111-4111-8111-111111111111.webp');
assert(fakeCalls.some(call => call.url.includes('/storage/v1/object/member-photos/members/SCP-001/')));
const uploadCall = fakeCalls.find(call => call.url.includes('/storage/v1/object/member-photos/'));
assert.equal(uploadCall.options.headers.Authorization, 'Bearer access-token');

const schema = await readFile('supabase/schema.sql', 'utf8');
const seed = await readFile('supabase/seed.sql', 'utf8');
assert(schema.includes('alter table public.members enable row level security'));
assert(schema.includes("(storage.foldername(name))[1] = 'members'"));
assert.equal((seed.match(/'SCP-[0-9]{3,6}'/g) || []).length, 12, 'Seed must contain 12 member codes');
assert.equal((seed.match(/'20000000-0000-4000-8000-[0-9]{12}'/g) || []).length, 3, 'Seed must contain 3 schedule IDs');
const configSource = await readFile('site-config.js', 'utf8');
assert(configSource.includes("url: ''") && configSource.includes("publishableKey: ''"), 'Source config must not contain deployed credentials');

console.log('Passed: public/admin assets, syntax, 12 dossiers, Supabase client contract, photo path, RLS schema, WIB weekly/event calendar and UTF-8 folding.');
