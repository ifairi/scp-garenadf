(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const order = ['hero', 'about', 'founders', 'objectives', 'scrim'];
  const labels = ['Beranda', 'Tentang', 'Tim', 'Tujuan', 'Jadwal'];
  const panels = [...document.querySelectorAll('.panel')];
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const menu = $('mainNav');
  const menuToggle = $('menuToggle');
  const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 'hero';
  let effects = true;
  let toastTimeout;
  try { effects = localStorage.getItem('scp-effects') !== 'off'; } catch { /* Device preferences are optional. */ }
  root.classList.add('js');

  function closeMenu(returnFocus = false) {
    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Buka menu');
    if (returnFocus) menuToggle.focus();
  }
  function render(id, { focus = false, scroll = false, contact = false } = {}) {
    if (!order.includes(id)) id = 'hero';
    current = id;
    panels.forEach(panel => { panel.hidden = panel.id !== id; panel.classList.remove('is-entering'); });
    const panel = $(id);
    panel.classList.add('is-entering');
    navLinks.forEach(link => {
      const active = link.hash === '#' + id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    const index = order.indexOf(id);
    $('pageNumber').textContent = String(index + 1).padStart(2, '0');
    $('prevBtn').disabled = index === 0;
    $('nextBtn').disabled = index === order.length - 1;
    $('prevBtn').setAttribute('aria-label', index ? `Menu sebelumnya: ${labels[index - 1]}` : 'Menu sebelumnya');
    $('nextBtn').setAttribute('aria-label', index < 4 ? `Menu berikutnya: ${labels[index + 1]}` : 'Menu berikutnya');
    document.title = `${labels[index]} — S.C.P Alliance`;
    if (id === 'scrim') updateDates();
    closeMenu();
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    if (focus) {
      const heading = panel.querySelector('h1, h2');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    if (contact) requestAnimationFrame(() => {
      $('scrimContact').scrollIntoView({ block: 'center', behavior: 'instant' });
      $('scrimContactLink').focus({ preventScroll: true });
    });
  }
  function navigate(id, options = {}) {
    if (!order.includes(id)) return;
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    render(id, { focus: true, scroll: true, ...options });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      const id = link.getAttribute('href').slice(1);
      if (order.includes(id)) { event.preventDefault(); navigate(id, { contact: link.hasAttribute('data-contact-link') }); }
    }
    if (!menu.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (order.includes(id) || !id) render(id || 'hero', { focus: true, scroll: true });
  });
  menuToggle.addEventListener('click', event => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menu.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    if (open && event.detail === 0) navLinks[0].focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('focusin', event => {
    if (menuToggle.getAttribute('aria-expanded') === 'true' && !menu.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });
  window.matchMedia('(max-width: 680px)').addEventListener('change', () => closeMenu());
  $('prevBtn').addEventListener('click', () => navigate(order[order.indexOf(current) - 1]));
  $('nextBtn').addEventListener('click', () => navigate(order[order.indexOf(current) + 1]));

  function syncMotion() {
    const active = effects && !motionMedia.matches;
    root.classList.toggle('motion-off', !active);
    const button = $('motionToggle');
    button.textContent = active ? '◈ EFEK: AKTIF' : '◇ EFEK: NONAKTIF';
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', 'Efek glitch');
    button.title = motionMedia.matches ? 'Efek dimatikan mengikuti preferensi gerakan perangkat.' : 'Aktifkan atau matikan efek glitch';
  }
  $('motionToggle').addEventListener('click', () => {
    if (motionMedia.matches) { toast('Efek mengikuti pengaturan kurangi gerakan pada perangkat.'); return; }
    effects = !effects;
    try { localStorage.setItem('scp-effects', effects ? 'on' : 'off'); } catch { /* Keep the in-memory setting when storage is unavailable. */ }
    syncMotion();
  });
  motionMedia.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => root.classList.toggle('motion-paused', document.hidden));
  function toast(message) {
    clearTimeout(toastTimeout);
    $('toast').textContent = message;
    $('toast').classList.add('is-visible');
    toastTimeout = setTimeout(() => $('toast').classList.remove('is-visible'), 4000);
  }

  const dossiers = window.SCP_DOSSIERS || {};
  const memberCards = [...document.querySelectorAll('.member-card')];
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('id').trim();
  const category = id => ({ 'SCP-013': ['assault'], 'SCP-048': ['vehicle'], 'SCP-051': ['vehicle'], 'SCP-054': ['vehicle'], 'SCP-044': ['vehicle'], 'SCP-012': ['vehicle'], 'SCP-022': ['engineer'], 'SCP-018': ['engineer'], 'SCP-017': ['engineer', 'recon'], 'SCP-027': ['recon'], 'SCP-119': ['assault'], 'SCP-099': ['recon'] }[id] || []);
  function filterMembers() {
    const query = normalize($('memberSearch').value);
    const role = $('roleFilter').value;
    let count = 0;
    memberCards.forEach(card => {
      const id = card.querySelector('.member-id').textContent.trim();
      const searchable = normalize(card.textContent + ' ' + (dossiers[id]?.alias || ''));
      const matches = searchable.includes(query) && (role === 'all' || category(id).includes(role));
      card.hidden = !matches;
      if (matches) count++;
    });
    $('memberCount').textContent = count;
    $('emptyState').hidden = count > 0;
    $('searchStatus').textContent = `${count} dari ${memberCards.length} dossier ditampilkan. Pilih anggota untuk membuka profil.`;
  }
  $('memberSearch').addEventListener('input', filterMembers);
  $('roleFilter').addEventListener('change', filterMembers);
  $('resetSearch').addEventListener('click', () => { $('memberSearch').value = ''; $('roleFilter').value = 'all'; filterMembers(); $('memberSearch').focus(); });

  const dossier = $('scpDossier');
  let dossierTrigger = null;
  function appendText(parent, tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }
  function openDossier(id, trigger) {
    const data = dossiers[id];
    if (!data) { toast('Dossier belum tersedia.'); return; }
    dossierTrigger = trigger;
    $('dsFileId').textContent = id;
    $('dsClearance').textContent = data.clearance;
    $('dsName').textContent = data.name;
    $('dsRole').textContent = data.role;
    $('dsAlias').textContent = data.alias;
    $('dsUnique').textContent = data.unique;
    const portrait = $('dsPortrait');
    portrait.replaceChildren();
    const photo = document.createElement('img');
    photo.src = id === 'SCP-022' ? 'assets/jess.webp' : 'assets/emblem.webp';
    photo.alt = id === 'SCP-022' ? 'Emblem Jess SCP' : '';
    portrait.classList.toggle('has-photo', id === 'SCP-022');
    portrait.append(photo);
    appendText(portrait, 'span', id === 'SCP-022' ? 'OPERATIVE / SCP-022' : 'VISUAL CLASSIFIED', 'portrait-caption');
    $('dsTrack').replaceChildren();
    for (const track of data.track || []) {
      const item = document.createElement('li');
      appendText(item, 'strong', track.clan);
      item.append(document.createTextNode(' — ' + track.role));
      appendText(item, 'small', track.year);
      $('dsTrack').append(item);
    }
    $('dsStrengths').replaceChildren();
    for (const strength of data.strengths || []) appendText($('dsStrengths'), 'li', strength);
    $('dsStats').replaceChildren();
    for (const [name, value] of data.stats || []) {
      const stat = document.createElement('div'); stat.className = 'skill-stat';
      const label = document.createElement('div'); label.className = 'skill-stat-label';
      appendText(label, 'span', name); appendText(label, 'b', `${value} / 100`); stat.append(label);
      const progress = document.createElement('progress'); progress.max = 100; progress.value = value; progress.setAttribute('aria-label', name); stat.append(progress);
      $('dsStats').append(stat);
    }
    dossier.showModal();
    document.body.classList.add('modal-open');
    dossier.scrollTop = 0;
    $('dossierClose').focus();
  }
  memberCards.forEach(card => {
    const id = card.querySelector('.member-id').textContent.trim();
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `Buka profil ${card.querySelector('.member-name').textContent}, ${id}`);
    card.addEventListener('click', () => openDossier(id, card));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDossier(id, card); }
    });
  });
  $('dossierClose').addEventListener('click', () => dossier.close());
  dossier.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (dossierTrigger && !dossierTrigger.closest('[hidden]')) dossierTrigger.focus({ preventScroll: true });
  });
  [dossier, $('copyDialog')].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });

  const dateFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });
  function updateDates() {
    document.querySelectorAll('.next-date').forEach(node => {
      const next = SCPSchedule.nextOccurrence(Number(node.dataset.weekday), Number(node.dataset.hour));
      node.textContent = `BERIKUTNYA / ${dateFormatter.format(next)}`;
    });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDates(); });
  window.addEventListener('hashchange', updateDates);
  $('calendarDownload').addEventListener('click', () => {
    const file = new Blob([SCPSchedule.calendar()], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = 'scp-jadwal-rutin.ics';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Kalender diunduh. Konfirmasi jadwal melalui Discord.');
  });
  const template = 'PENGAJUAN SCRIM — SCP ALLIANCE\n\nNama clan:\nMode permainan:\nTanggal:\nWaktu (WIB):\nFormat pertandingan:\nKontak PIC:\nCatatan tambahan:';
  $('copyTemplate').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(template);
      toast('Format pengajuan disalin. Lengkapi lalu kirim di Discord.');
    } catch {
      $('copyText').value = template;
      $('copyDialog').showModal();
      document.body.classList.add('modal-open');
      $('copyText').focus(); $('copyText').select();
    }
  });
  $('copyClose').addEventListener('click', () => $('copyDialog').close());
  $('copyDialog').addEventListener('close', () => { document.body.classList.remove('modal-open'); $('copyTemplate').focus({ preventScroll: true }); });
  syncMotion();
  updateDates();
  render(location.hash.slice(1));
})();
