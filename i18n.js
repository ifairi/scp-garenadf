/* Local translations: text nodes stay in place, preserving focus and event handlers. */
(() => {
  'use strict';
  const languages = ['id', 'en', 'zh-CN'];
  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const phrases = new Map((window.SCP_TRANSLATIONS || []).map(row => [normalize(row[0]), row]));
  const reverse = new Map();
  phrases.forEach(row => row.slice(1).forEach(value => {
    if (value && !reverse.has(normalize(value))) reverse.set(normalize(value), row[0]);
  }));
  const records = new WeakMap();
  const canonical = value => ({ zh: 'zh-CN', 'zh-Hans': 'zh-CN' })[value] || value;
  const valid = value => languages.includes(canonical(value));
  const fromURL = () => new URL(location.href).searchParams.get('lang');
  let saved;
  try { saved = localStorage.getItem('scp-language'); } catch { /* Preference is optional. */ }
  const requested = fromURL() || saved;
  let language = valid(requested) ? canonical(requested) : 'id';
  const skip = 'script,style,svg,[translate="no"],.member-name,.member-alias,.member-id,.member-clan,#dsName,#dsAlias,#dsFileId,#dsClan,#dsCommitment,#dsTrack strong';
  const attributeNames = ['aria-label', 'title', 'placeholder', 'alt'];

  function t(source, values = {}) {
    if (source === undefined || source === null) return '';
    const key = normalize(source);
    const row = phrases.get(key);
    let result = row?.[languages.indexOf(language)] ?? source;
    if (!row && language !== 'id') {
      const numbered = key.match(/^(\d+) \/ (.+)$/);
      if (numbered && phrases.has(numbered[2])) result = `${numbered[1]} / ${t(numbered[2])}`;
      if (key.includes(' • ')) result = key.split(' • ').map(part => t(part)).join(' • ');
      const prefixes = [
        [/^Buka profil (.+)$/, 'Open profile {value}', '查看 {value} 的档案'],
        [/^Foto (.+)$/, 'Photo of {value}', '{value} 的照片'],
        [/^PERSONNEL FILE \/ (\d+)$/, 'PERSONNEL FILE / {value}', '成员档案 / {value}'],
        [/^CLEARANCE: LEVEL (.+)$/, 'CLEARANCE: LEVEL {value}', '权限等级：{value}'],
        [/^(\d{4}) – (?:Now|Aktif)$/, '{value} – Present', '{value} 至今'],
        [/^ — (.+)$/, ' — {value}', ' — {value}']
      ];
      for (const [pattern, en, zh] of prefixes) {
        const match = String(source).match(pattern);
        if (match) { result = (language === 'en' ? en : zh).replace('{value}', match[1]); break; }
      }
    }
    return String(result).replace(/\{(\w+)\}/g, (match, key) => values[key] === undefined ? match : String(values[key]));
  }

  function translateValue(node, field, read, write) {
    const value = read();
    if (!value || !normalize(value)) return;
    let state = records.get(node);
    if (!state) { state = new Map(); records.set(node, state); }
    let record = state.get(field);
    if (!record || record.last !== value) {
      const key = normalize(value);
      const source = phrases.has(key) ? key : reverse.get(key) || key;
      record = { source, last: value, leading: value.match(/^\s*/)[0], trailing: value.match(/\s*$/)[0] };
      state.set(field, record);
    }
    const translated = record.leading + t(record.source) + record.trailing;
    if (translated !== value) write(translated);
    record.last = translated;
  }

  function apply(container = document.body) {
    if (!container) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement?.closest(skip)) translateValue(node, 'text', () => node.data, value => { node.data = value; });
    }
    const elements = [...(container.matches ? [container] : []), ...container.querySelectorAll('[aria-label],[title],[placeholder],[alt]')];
    elements.forEach(element => {
      if (element.closest(skip)) return;
      attributeNames.forEach(name => translateValue(element, name, () => element.getAttribute(name), value => element.setAttribute(name, value)));
    });
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : language === 'en' ? 'en-GB' : 'zh-CN', {
      timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric'
    }).format(value);
  }
  function sync() {
    document.documentElement.lang = language;
    apply(document.body);
    const select = document.getElementById('languageSelect');
    if (select) select.value = language;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      const content = t('Aliansi independen Delta Force Mobile yang berbasis di Indonesia. Lintas clan, satu protokol.');
      description.content = content;
      document.querySelectorAll('meta[property="og:description"],meta[name="twitter:description"]').forEach(meta => { meta.content = content; });
    }
    const date = document.getElementById('scheduleDataDate');
    if (date?.dateTime) date.textContent = formatDate(new Date(date.dateTime + 'T12:00:00+07:00'));
    document.querySelectorAll('[data-locale-date]').forEach(node => {
      node.textContent = formatDate(new Date(node.dataset.localeDate + 'T12:00:00+07:00'));
    });
  }
  function setLanguage(next, { persist = true, updateURL = true } = {}) {
    if (!valid(next)) return false;
    language = canonical(next);
    if (persist) { try { localStorage.setItem('scp-language', language); } catch { /* Keep in memory. */ } }
    if (updateURL) {
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      history.replaceState(history.state, '', url);
    }
    sync();
    window.dispatchEvent(new CustomEvent('scp:language', { detail: { language } }));
    return true;
  }
  window.SCPI18n = Object.freeze({ t, apply, formatDate, setLanguage, get language() { return language; } });
  const select = document.getElementById('languageSelect');
  select?.addEventListener('change', () => setLanguage(select.value));
  document.getElementById('languageControl')?.removeAttribute('hidden');
  window.addEventListener('scp:ready', sync);
  window.addEventListener('popstate', () => {
    const value = fromURL();
    if (valid(value) && canonical(value) !== language) setLanguage(value, { updateURL: false });
  });
  sync();
})();
