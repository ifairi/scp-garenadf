import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
let html = await readFile('index.html', 'utf8');
html = html.replace('<script src="script.js" defer></script>', '<script src="protocol.js" defer></script>\n  <script src="script.js" defer></script>');
// Match either defer-attribute ordering used by the existing document.
if (!html.includes('src="protocol.js"')) html = html.replace('<script defer src="script.js"></script>', '<script defer src="protocol.js"></script>\n  <script defer src="script.js"></script>');
html = html.replace('  <main', '  <div class="page-wipe" id="pageWipe" aria-hidden="true" hidden><div class="wipe-bands"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="wipe-readout"><span>S.C.P / CHANNEL <b id="wipeNumber">01</b></span><strong id="wipeLabel">BERANDA</strong><span>ESTABLISHING CONNECTION <i>↗</i></span></div><div class="wipe-interference"></div></div>\n  <main');
const ctx = { window: {} }; vm.runInNewContext(await readFile('team-data.js', 'utf8'), ctx);
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const art = ['hero', 'team', 'schedule', 'team', 'hero', 'schedule', 'about', 'about', 'objectives', 'hero', 'schedule', 'objectives'];
const cards = Object.entries(ctx.window.SCP_DOSSIERS).map(([id, data], i) => `
          <article class="member-card" id="operative-${id}" data-operative="${id}">
            <div class="member-visual" aria-hidden="true"><img class="member-art" src="assets/${art[i]}.webp" srcset="assets/${art[i]}-mobile.webp 800w, assets/${art[i]}.webp 1600w" sizes="90vw" loading="lazy" decoding="async" alt=""><div class="member-gridlines"></div><span class="member-watermark">${id.slice(4)}</span></div>
            <div class="member-card-top"><span class="member-id">${id}</span><span>PERSONNEL FILE / ${String(i + 1).padStart(2, '0')}</span><span class="member-access">${esc(data.clearance)}</span></div>
            <div class="member-feature"><span class="member-category">${esc(data.role)}</span><h4 class="member-alias">${esc(data.alias)}</h4><p class="member-excerpt">${esc(data.unique)}</p></div>
            <div class="member-card-bottom"><div class="member-photo"><img src="assets/${id === 'SCP-022' ? 'jess' : 'emblem'}.webp" alt="" width="40" height="40" loading="lazy"></div><div class="member-info"><p class="member-name">${esc(data.name)}</p><p class="member-role">${esc(data.role)}</p></div><button class="member-open" type="button" aria-haspopup="dialog" aria-label="Buka profil ${esc(data.name)}, ${id}"><span>BUKA DOSSIER</span><b aria-hidden="true">↗</b></button></div>
          </article>`).join('');
const start = html.indexOf('        <div class="member-grid">');
const end = html.indexOf('<div class="empty-state"', start);
if (start < 0 || end < 0) throw Error('Gallery boundaries missing');
html = html.slice(0, start) + `        <div class="operative-toolbar" id="operativeToolbar"><div><span class="status-dot"></span><span>SCROLL TO EXPLORE</span></div><p><b id="operativeCurrent">01</b><span> / </span><span id="operativeTotal">12</span><span class="operative-current-id" id="operativeCurrentId">SCP-013</span></p><div class="operative-arrows"><button id="operativePrev" aria-label="Anggota sebelumnya" disabled>↑</button><button id="operativeNext" aria-label="Anggota berikutnya">↓</button></div></div>
        <div class="member-grid" id="operativeGallery" aria-label="Galeri anggota SCP">${cards}\n        </div>` + html.slice(end);
html = html.replace('Member directory<span', 'Meet the anomalies<span');
html = html.replace('12 dossier tersedia. Pilih anggota untuk membuka profil.', 'Scroll untuk menjelajahi 12 operative. Pilih Buka dossier untuk melihat profil dan statistik.');
await writeFile('index.html', html);
