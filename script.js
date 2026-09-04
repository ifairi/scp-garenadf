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
  let desired = current;
  let routeRevision = 0;
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
  function syncPageButtons(id) {
    const index = order.indexOf(id);
    $('prevBtn').disabled = index === 0;
    $('nextBtn').disabled = index === order.length - 1;
    $('prevBtn').setAttribute('aria-label', index ? `Menu sebelumnya: ${labels[index - 1]}` : 'Menu sebelumnya');
    $('nextBtn').setAttribute('aria-label', index < 4 ? `Menu berikutnya: ${labels[index + 1]}` : 'Menu berikutnya');
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
    syncPageButtons(id);
    document.title = `${labels[index]} — S.C.P Alliance`;
    if (id === 'scrim') updateDates();
    closeMenu();
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    if (focus) {
      const heading = panel.querySelector('h1, h2');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    if (contact && current === 'scrim') {
      $('scrimContact').scrollIntoView({ block: 'center', behavior: 'instant' });
      $('scrimContactLink').focus({ preventScroll: true });
    }
  }
  function navigate(id, options = {}, fromHistory = false) {
    if (!order.includes(id)) return;
    desired = id;
    syncPageButtons(id);
    const revision = ++routeRevision;
    closeMenu();
    closeDossier({ immediate: true, restoreFocus: false });
    if ($('copyDialog').open) $('copyDialog').close();
    const commit = () => {
      if (!fromHistory && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
      render(id, { scroll: true });
      return () => {
        if (revision !== routeRevision || current !== id) return;
        if (options.contact && id === 'scrim') {
          $('scrimContact').scrollIntoView({ block: 'center', behavior: 'instant' });
          $('scrimContactLink').focus({ preventScroll: true });
        } else {
          const heading = $(id).querySelector('h1, h2');
          heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true });
        }
      };
    };
    if (id === current && !root.classList.contains('is-routing')) commit()();
    else window.SCPMotion.run(commit, labels[order.indexOf(id)].toUpperCase(), String(order.indexOf(id) + 1).padStart(2, '0'));
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
    if (order.includes(id) || !id) navigate(id || 'hero', {}, true);
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
  $('prevBtn').addEventListener('click', () => navigate(order[order.indexOf(desired) - 1]));
  $('nextBtn').addEventListener('click', () => navigate(order[order.indexOf(desired) + 1]));

  function syncMotion() {
    const active = effects && !motionMedia.matches;
    root.classList.toggle('motion-off', !active);
    if (!active) {
      window.SCPMotion.finish();
      if (dossierClosing) closeDossier({ immediate: true });
      else dossierExpansion?.cancel();
    }
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
  let visibleMembers = memberCards;
  let activeMember = memberCards[0];
  let lastGalleryColumns = 0;
  const galleryColumns = () => matchMedia('(min-width: 801px)').matches ? 2 : 1;
  function syncGallery() {
    const index = Math.max(0, visibleMembers.indexOf(activeMember));
    const columns = galleryColumns();
    lastGalleryColumns = columns;
    const start = Math.floor(index / columns) * columns;
    const end = Math.min(start + columns, visibleMembers.length);
    const first = String(start + 1).padStart(2, '0');
    $('operativeToolbar').hidden = visibleMembers.length === 0;
    $('operativeCurrent').textContent = end > start + 1 ? `${first}–${String(end).padStart(2, '0')}` : first;
    $('operativeTotal').textContent = String(visibleMembers.length).padStart(2, '0');
    $('operativeCurrentId').textContent = visibleMembers.slice(start, end).map(card => card.dataset.operative).join(' / ');
    $('operativePrev').disabled = start === 0;
    $('operativeNext').disabled = end >= visibleMembers.length;
    $('operativePrev').setAttribute('aria-label', columns === 2 ? 'Baris anggota sebelumnya' : 'Anggota sebelumnya');
    $('operativeNext').setAttribute('aria-label', columns === 2 ? 'Baris anggota berikutnya' : 'Anggota berikutnya');
    visibleMembers.forEach((card, i) => card.style.setProperty('--reveal-delay', `${i % columns * 100}ms`));
  }
  function stepMember(direction) {
    const columns = galleryColumns();
    const index = Math.floor(visibleMembers.indexOf(activeMember) / columns) * columns;
    const next = visibleMembers[index + direction * columns];
    if (!next) return;
    activeMember = next; syncGallery();
    next.scrollIntoView({ block: 'start', behavior: window.SCPMotion.allowed() ? 'smooth' : 'instant' });
  }
  $('operativePrev').addEventListener('click', () => stepMember(-1));
  $('operativeNext').addEventListener('click', () => stepMember(1));
  if ('IntersectionObserver' in window) {
    const entrance = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.intersectionRatio >= .08) entry.target.classList.add('is-in-view');
      else if (!entry.isIntersecting) entry.target.classList.remove('is-in-view');
    }), { threshold: .08 });
    memberCards.forEach(card => { card.classList.add('will-reveal'); entrance.observe(card); });
  }
  let galleryFrame = 0;
  function updateActiveRow() {
    galleryFrame = 0;
    if ($('founders').hidden || !visibleMembers.length || dossier?.open) return;
    const columns = galleryColumns();
    const target = innerHeight * .48;
    let nearest = visibleMembers[0], distance = Infinity;
    for (let i = 0; i < visibleMembers.length; i += columns) {
      const rect = visibleMembers[i].getBoundingClientRect();
      const delta = Math.abs(rect.top + rect.height / 2 - target);
      if (delta < distance) { nearest = visibleMembers[i]; distance = delta; }
    }
    if (activeMember !== nearest || lastGalleryColumns !== columns) { activeMember = nearest; syncGallery(); }
  }
  function queueActiveRow() { if (!galleryFrame) galleryFrame = requestAnimationFrame(updateActiveRow); }
  window.addEventListener('scroll', queueActiveRow, { passive: true });
  window.addEventListener('resize', queueActiveRow);
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
    visibleMembers = memberCards.filter(card => !card.hidden);
    activeMember = visibleMembers[0]; syncGallery();
    $('searchStatus').textContent = `${count} dari ${memberCards.length} dossier ditampilkan. Pilih anggota untuk membuka profil.`;
  }
  $('memberSearch').addEventListener('input', filterMembers);
  $('roleFilter').addEventListener('change', filterMembers);
  $('resetSearch').addEventListener('click', () => { $('memberSearch').value = ''; $('roleFilter').value = 'all'; filterMembers(); $('memberSearch').focus(); });

  const dossier = $('scpDossier');
  let dossierTrigger = null;
  let dossierEffectTimer;
  let dossierExpansion;
  let dossierClosing = false;
  let dossierCloseTimer;
  let dossierGeneration = 0;
  let dossierReturnTimer;
  let dossierReturnCard;
  function closeDossier({ immediate = false, restoreFocus = true } = {}) {
    if (!restoreFocus) dossierTrigger = null;
    if (!dossier.open) return;
    if (dossierClosing && !immediate) return;
    const generation = ++dossierGeneration;
    const finalize = () => {
      if (generation !== dossierGeneration) return;
      clearTimeout(dossierCloseTimer);
      dossierExpansion?.cancel();
      dossierClosing = false;
      dossier.classList.remove('is-closing', 'is-decoding');
      if (dossier.open) dossier.close();
    };
    if (immediate || !window.SCPMotion.allowed() || !dossier.animate) { finalize(); return; }
    dossierClosing = true;
    clearTimeout(dossierEffectTimer);
    const computed = getComputedStyle(dossier);
    const from = { transform: computed.transform, opacity: computed.opacity, clipPath: computed.clipPath };
    dossierExpansion?.cancel();
    dossier.classList.remove('is-decoding');
    dossier.classList.add('is-closing');
    const bounds = dossier.getBoundingClientRect();
    const card = dossierTrigger?.closest('.member-card');
    const target = card && !card.closest('[hidden]') ? card.getBoundingClientRect() : null;
    let transform = 'translateY(16px) scale(.96)';
    if (target?.width && target?.height) {
      const dx = target.left + target.width / 2 - bounds.left - bounds.width / 2;
      const dy = Math.max(-innerHeight, Math.min(innerHeight, target.top + target.height / 2 - bounds.top - bounds.height / 2));
      transform = `translate(${dx}px, ${dy}px) scale(${Math.min(1, target.width / bounds.width)}, ${Math.min(.82, target.height / bounds.height)})`;
    }
    dossierExpansion = dossier.animate([from, { transform, opacity: 0, clipPath: 'inset(4% 0 round 20px)' }], { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    dossierExpansion.finished.then(finalize, () => {});
    dossierCloseTimer = setTimeout(finalize, 500);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dossierClosing) closeDossier({ immediate: true });
  });
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
    ++dossierGeneration;
    clearTimeout(dossierCloseTimer);
    dossierClosing = false;
    dossier.classList.remove('is-closing');
    dossierTrigger = trigger;
    const sourceRect = trigger.closest('.member-card').getBoundingClientRect();
    dossier.style.setProperty('--dossier-art', `url("${trigger.closest('.member-card').querySelector('.member-art').getAttribute('src')}")`);
    dossierExpansion?.cancel();
    clearTimeout(dossierEffectTimer);
    dossier.classList.remove('is-decoding');
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
      const progress = document.createElement('progress'); progress.max = 100; progress.value = value; progress.setAttribute('aria-label', name); progress.className = 'sr-only'; stat.append(progress);
      const meter = document.createElement('div'); meter.className = 'stat-meter'; meter.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span'); fill.className = 'stat-meter-fill'; fill.style.width = `${value}%`; meter.append(fill); stat.append(meter);
      $('dsStats').append(stat);
    }
    dossier.showModal();
    document.body.classList.add('modal-open');
    dossier.scrollTop = 0;
    $('dossierClose').focus();
    if (effects && !motionMedia.matches) {
      // Restart decorative effects without ever scrambling the member's data.
      void dossier.offsetWidth;
      dossier.classList.add('is-decoding');
      const targetRect = dossier.getBoundingClientRect();
      const dx = sourceRect.left + sourceRect.width / 2 - targetRect.left - targetRect.width / 2;
      const dy = Math.max(-innerHeight, Math.min(innerHeight, sourceRect.top + sourceRect.height / 2 - targetRect.top - targetRect.height / 2));
      if (dossier.animate) dossierExpansion = dossier.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${Math.min(1.15, sourceRect.width / targetRect.width)}, .65)`, opacity: .15, clipPath: 'inset(12% 0 12% 0 round 24px)' },
        { transform: 'translate(0, 0) scale(1)', opacity: 1, clipPath: 'inset(0 round 8px)' }
      ], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' });
      dossierEffectTimer = setTimeout(() => dossier.classList.remove('is-decoding'), 1000);
    }
  }
  memberCards.forEach(card => {
    const id = card.querySelector('.member-id').textContent.trim();
    const button = card.querySelector('.member-open');
    button.addEventListener('click', () => openDossier(id, button));
  });
  $('dossierClose').addEventListener('click', () => closeDossier());
  dossier.addEventListener('cancel', event => { event.preventDefault(); closeDossier(); });
  dossier.addEventListener('close', () => {
    if (dossier.open) return;
    ++dossierGeneration;
    clearTimeout(dossierCloseTimer);
    clearTimeout(dossierEffectTimer);
    dossierExpansion?.cancel();
    dossierClosing = false;
    dossier.classList.remove('is-decoding', 'is-closing');
    document.body.classList.remove('modal-open');
    if (dossierTrigger?.isConnected && !dossierTrigger.closest('[hidden]')) {
      dossierTrigger.focus({ preventScroll: true });
      const card = dossierTrigger.closest('.member-card');
      dossierReturnCard?.classList.remove('just-returned');
      dossierReturnCard = card;
      card.classList.add('just-returned');
      clearTimeout(dossierReturnTimer);
      dossierReturnTimer = setTimeout(() => card.classList.remove('just-returned'), 550);
    }
  });
  [dossier, $('copyDialog')].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        if (dialog === dossier) closeDossier(); else dialog.close();
      }
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
  $('copyDialog').addEventListener('close', () => { document.body.classList.remove('modal-open'); if (current === 'scrim' && !root.classList.contains('is-routing')) $('copyTemplate').focus({ preventScroll: true }); });
  syncMotion();
  updateDates();
  render(location.hash.slice(1));
  desired = current;
  syncGallery();
  window.dispatchEvent(new Event('scp:ready'));
})();
