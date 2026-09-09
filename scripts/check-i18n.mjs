import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const dictionary = await readFile('i18n-data.js', 'utf8');
const engine = await readFile('i18n.js', 'utf8');

// A narrow DOM fixture tests text replacement without a browser or external services.
function fixture(url = 'https://scp.example/?preview=test#rules', saved = '') {
  const calls = [], attributes = new Map([['aria-label', 'Buka menu']]);
  const parent = { closest: () => null };
  const texts = [' Beranda ', 'Jago, kompak, bisa diandalkan', 'Satu event, satu tim', '12', '[ Player Name ]'].map(data => ({ data, parentElement: parent }));
  const protectedText = { data: 'Tim', parentElement: { closest: () => ({}) } };
  texts.push(protectedText);
  const element = { closest: () => null, getAttribute: name => attributes.get(name), setAttribute: (name, value) => attributes.set(name, value) };
  const body = { querySelectorAll: () => [element] };
  const select = { value: '', addEventListener: () => {} };
  const root = { lang: 'id' };
  const location = { href: url };
  const store = new Map([['scp-language', saved]]);
  const document = {
    body, documentElement: root, querySelector: () => null, querySelectorAll: () => [],
    getElementById: id => id === 'languageSelect' ? select : null,
    createTreeWalker: () => { let index = 0; return { nextNode: () => texts[index++] || null }; }
  };
  const context = vm.createContext({
    window: { addEventListener: () => {}, dispatchEvent: event => calls.push(event) }, document,
    location, history: { state: { retained: true }, replaceState: (state, title, url) => { location.href = String(url); } },
    localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) },
    NodeFilter: { SHOW_TEXT: 4 }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    URL, Intl, Date, TextEncoder
  });
  vm.runInContext(dictionary, context);
  vm.runInContext(engine, context);
  return { api: context.window.SCPI18n, context, texts, root, select, location, store, attributes, calls };
}

const f = fixture();
assert.equal(f.api.language, 'id');
f.api.setLanguage('en');
assert.equal(f.root.lang, 'en');
assert.equal(f.texts[0].data, ' Home ');
assert.equal(f.attributes.get('aria-label'), 'Open menu');
assert.equal(new URL(f.location.href).hash, '#rules');
assert.equal(new URL(f.location.href).searchParams.get('preview'), 'test');
assert.equal(f.store.get('scp-language'), 'en');
assert.equal(f.api.t('Buka profil [ A ], SCP-013'), 'Open profile [ A ], SCP-013');
assert.equal(f.api.t('{main} MAIN / {alliance} ALLIANCE', { main: 0, alliance: 12 }), '0 MAIN / 12 ALLIANCE');
assert.equal(f.api.t(undefined), '');
assert.equal(f.api.t('Foto Tim'), 'Photo of Tim', 'Do not translate a player name that resembles a UI label');
assert.equal(f.api.t('Untranslated member-authored text'), 'Untranslated member-authored text');
f.api.setLanguage('zh-CN');
assert.equal(f.texts[0].data, ' 首页 ');
assert.equal(f.texts[2].data, '一项赛事，只代表一队');
assert.equal(f.attributes.get('aria-label'), '打开菜单');
assert.equal(f.texts[3].data, '12');
assert.equal(f.texts[4].data, '[ Player Name ]');
assert.equal(f.texts[5].data, 'Tim', 'Protected identities are never translated');
assert.match(f.api.t('Buka profil [ A ], SCP-013'), /\[ A \].*SCP-013/);
assert.match(f.api.formatDate(new Date('2026-09-07T18:00:00Z')), /2026.*9.*8/, 'Date must stay in Jakarta timezone');
assert.equal(f.api.t('04 / TRAINING'), '04 / 训练');
f.api.setLanguage('id');
assert.equal(f.texts[0].data, ' Beranda ');
assert.equal(f.texts[1].data, 'Jago, kompak, bisa diandalkan');
assert.equal(f.attributes.get('aria-label'), 'Buka menu');
assert.equal(f.api.setLanguage('unsupported'), false);
assert.equal(f.api.language, 'id');
assert.equal(fixture('https://scp.example/#hero', 'zh-CN').api.language, 'zh-CN');
assert.equal(fixture('https://scp.example/?lang=en#hero', 'zh-CN').api.language, 'en');
assert.equal(fixture('https://scp.example/?lang=bad#hero').api.language, 'id');

const rows = f.context.window.SCP_TRANSLATIONS;
assert.equal(new Set(rows.map(row => row[0])).size, rows.length);
for (const row of rows) assert(row.length === 3 && row.every(value => typeof value === 'string' && value.trim()), 'All phrases need English and Chinese');
vm.runInContext(await readFile('team-data.js', 'utf8'), f.context);
const translatedSources = new Set(rows.map(row => row[0]));
for (const member of Object.values(f.context.window.SCP_DOSSIERS)) {
  for (const content of [member.unique, ...member.strengths]) assert(translatedSources.has(content), `Missing member translation: ${content}`);
}

vm.runInContext(await readFile('schedule.js', 'utf8'), f.context);
const now = new Date('2026-09-04T10:00:00Z');
const base = f.context.SCPSchedule.calendar(now);
for (const locale of ['en', 'zh-CN']) {
  f.api.setLanguage(locale);
  const calendar = f.context.SCPSchedule.calendar(now, f.api.t);
  assert.equal(calendar.match(/DTSTART:[^\r]+/g).join(), base.match(/DTSTART:[^\r]+/g).join(), 'Language never changes event times');
  assert(!calendar.includes('Latihan internal divisi'));
  for (const line of calendar.split('\r\n')) assert(Buffer.byteLength(line, 'utf8') <= 75);
}
console.log('Passed: ID/EN/Chinese switching, round trips, URL/storage preference, identity preservation, 12 translated profiles and fixed-WIB calendar export.');
