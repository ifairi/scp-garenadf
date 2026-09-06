(async () => {
  'use strict';
  try { await (window.SCP_DATA_READY || Promise.resolve()); }
  catch { /* Static content remains the fallback if remote data is unavailable. */ }
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

  /* Safari can retain :focus-visible after a touch-driven dialog closes.
     Track the actual input method so touch restores focus without painting a ring. */
  const setPointerNavigation = () => root.classList.remove('keyboard-navigation');
  document.addEventListener('keydown', () => root.classList.add('keyboard-navigation'), true);
  document.addEventListener('pointerdown', setPointerNavigation, { capture: true, passive: true });
  document.addEventListener('touchstart', setPointerNavigation, { capture: true, passive: true });

  const heroPanel = $('hero');
  let heroAnimations = [];
  let heroEntranceTimer;
  function clearHeroEntrance() {
    clearTimeout(heroEntranceTimer);
    heroAnimations.forEach(animation => animation.cancel());
    heroAnimations = [];
  }
  function prepareHeroEntrance() {
    clearHeroEntrance();
    if (!effects || motionMedia.matches || document.hidden || !heroPanel.animate) return;
    const sequence = [
      ['.hero-scene', 0, 1050, true],
      ['.hero-topline', 40], ['.hero-copy > .eyebrow', 90],
      ['.hero-first-line', 140, 760], ['.glitch-title', 220, 760],
      ['.hero-manifesto', 290], ['.hero-description', 340],
      ['.hero-actions > :first-child', 390], ['.hero-actions > :last-child', 450],
      ['.hero-footnote', 490], ['.field-label', 330], ['.hero-bottom', 440]
    ];
    try {
      sequence.forEach(([selector, delay, duration = 650, scene = false]) => {
        const element = heroPanel.querySelector(selector);
        if (!element) return;
        const animation = element.animate([
          { opacity: 0, transform: scene ? 'scale(1.045)' : 'translateY(22px)', filter: scene ? 'none' : 'blur(3px)' },
          { opacity: 1, transform: scene ? 'scale(1)' : 'translateY(0)', filter: 'none' }
        ], { duration, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
        animation.pause();
        heroAnimations.push(animation);
      });
    } catch { clearHeroEntrance(); }
  }
  function playHeroEntrance() {
    if (current !== 'hero' || desired !== 'hero' || $('bootLoader')?.open || root.classList.contains('is-routing')) return;
    if (!effects || motionMedia.matches || document.hidden) { clearHeroEntrance(); return; }
    heroAnimations.forEach(animation => animation.play());
    clearTimeout(heroEntranceTimer);
    heroEntranceTimer = setTimeout(clearHeroEntrance, 1250);
  }
  // Native close covers normal completion, Escape and the intro watchdog.
  $('bootLoader')?.addEventListener('close', playHeroEntrance);

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
    if (id === 'founders') queueRailRender();
    if (id === 'hero') prepareHeroEntrance(); else clearHeroEntrance();
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
        if (id === 'hero') playHeroEntrance();
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
      clearHeroEntrance();
      window.SCPMotion.finish();
      if (dossierClosing) closeDossier({ immediate: true });
      else {
        dossierExpansion?.cancel();
        clearTimeout(dossierEffectTimer);
        dossier.classList.remove('is-decoding');
      }
      resetRosterMotion();
    } else if (current === 'founders') {
      queueRailRender();
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
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('motion-paused', document.hidden);
    if (document.hidden) clearHeroEntrance();
    else if (current === 'founders') ensureRosterMotion();
  });
  function toast(message) {
    clearTimeout(toastTimeout);
    $('toast').textContent = message;
    $('toast').classList.add('is-visible');
    toastTimeout = setTimeout(() => $('toast').classList.remove('is-visible'), 4000);
  }

  const dossiers = window.SCP_DOSSIERS || {};
  const memberCards = [...document.querySelectorAll('.member-card')];
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('id').trim();
  const fallbackCategories = { 'SCP-013': ['assault'], 'SCP-048': ['vehicle'], 'SCP-051': ['vehicle'], 'SCP-054': ['vehicle'], 'SCP-044': ['vehicle'], 'SCP-012': ['vehicle'], 'SCP-022': ['engineer'], 'SCP-018': ['engineer'], 'SCP-017': ['engineer', 'recon'], 'SCP-027': ['recon'], 'SCP-119': ['assault'], 'SCP-099': ['recon'] };
  const category = (id, card) => {
    const remote = (card?.dataset.roleGroups || '').split(' ').filter(Boolean);
    return remote.length ? remote : (fallbackCategories[id] || []);
  };
  const pureRosterFallback = new Set(['SCP-051', 'SCP-022', 'SCP-119']);
  memberCards.forEach(card => {
    if (!['pure', 'alliance'].includes(card.dataset.rosterType)) {
      card.dataset.rosterType = pureRosterFallback.has(card.dataset.operative) ? 'pure' : 'alliance';
    }
  });

  const gallery = $('operativeGallery');
  gallery.classList.add('roster-rails');
  gallery.setAttribute('aria-label', 'Pure Roster dan The Alliance');
  const railDefinitions = [
    {
      key: 'pure',
      index: '01 / CORE UNIT',
      title: 'Pure Roster',
      note: 'PRIMARY SIGNAL / DRAG + SWIPE',
      direction: 'rtl',
      directionLabel: 'RIGHT TO LEFT'
    },
    {
      key: 'alliance',
      index: '02 / AFFILIATED UNIT',
      title: 'The ALLIANCE',
      note: 'EXTERNAL IDENTITY / DRAG + SWIPE',
      direction: 'ltr',
      directionLabel: 'LEFT TO RIGHT'
    }
  ];
  const railViews = {};
  const rosterMotionStates = new Set();
  let rosterMotionFrame = 0;
  let rosterMotionTimestamp = 0;

  function makeArrow(direction) {
    const arrow = document.createElement('i');
    arrow.className = `ui-arrow${direction === 'rtl' ? ' ui-arrow-left' : ''}`;
    arrow.setAttribute('aria-hidden', 'true');
    return arrow;
  }

  function createRosterLane(definition) {
    const section = document.createElement('section');
    section.className = `roster-lane roster-lane--${definition.key}`;
    section.dataset.direction = definition.direction;
    section.setAttribute('aria-labelledby', `roster-${definition.key}-title`);

    const heading = document.createElement('header');
    heading.className = 'roster-lane-heading';
    const identity = document.createElement('div');
    const index = document.createElement('p');
    index.className = 'roster-lane-index';
    index.textContent = definition.index;
    const title = document.createElement('h4');
    title.id = `roster-${definition.key}-title`;
    title.textContent = definition.title;
    const note = document.createElement('span');
    note.className = 'roster-lane-note';
    note.textContent = definition.note;
    identity.append(index, title, note);

    const telemetry = document.createElement('div');
    telemetry.className = 'roster-lane-telemetry';
    const count = document.createElement('b');
    count.textContent = '00';
    const direction = document.createElement('span');
    direction.append(document.createTextNode(definition.directionLabel), makeArrow(definition.direction));
    telemetry.append(count, direction);
    heading.append(identity, telemetry);

    const viewport = document.createElement('div');
    viewport.className = 'roster-marquee';
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-label', `${definition.title}. Seret dengan mouse atau usap ke kiri dan kanan, atau gunakan tombol panah. Bergerak otomatis ${definition.directionLabel.toLocaleLowerCase('id')}.`);
    viewport.title = 'Klik atau tap untuk membuka dossier. Tahan lalu geser atau usap untuk melihat roster.';
    const track = document.createElement('div');
    track.className = 'roster-marquee-track';
    viewport.append(track);
    const motion = {
      viewport,
      track,
      direction: definition.direction === 'rtl' ? -1 : 1,
      cycleWidth: 0,
      offset: 0,
      velocity: 0,
      baseVelocity: 0,
      initialized: false,
      disabled: false,
      candidate: false,
      dragging: false,
      keyboardFocused: false,
      pointerHovered: false,
      pointerId: null,
      inputKind: null,
      pointerCaptured: false,
      settleUntil: 0,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastTime: 0,
      lastMoveTime: 0,
      distance: 0,
      suppressClick: false,
      measureRevision: 0
    };
    bindRosterDrag(motion);
    rosterMotionStates.add(motion);
    section.append(heading, viewport);
    gallery.append(section);
    railViews[definition.key] = { definition, section, track, count, motion };
  }

  gallery.replaceChildren();
  railDefinitions.forEach(createRosterLane);

  function decorativeClone(source) {
    const clone = source.cloneNode(true);
    clone.classList.add('is-marquee-clone');
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach(node => {
      node.tabIndex = -1;
      node.removeAttribute('aria-haspopup');
    });
    return clone;
  }

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  function normalizeRosterOffset(state) {
    if (!state.cycleWidth) return;
    state.offset %= state.cycleWidth;
    if (state.offset > 0) state.offset -= state.cycleWidth;
  }

  function paintRosterOffset(state) {
    if (!state.cycleWidth) return;
    normalizeRosterOffset(state);
    state.track.style.transform = `translate3d(${state.offset.toFixed(3)}px, 0, 0)`;
  }

  function bindRosterDrag(state) {
    const { viewport } = state;
    const hasTouchEvents = 'ontouchstart' in window;

    const beginGesture = (id, x, y, inputKind) => {
      if (state.candidate || state.dragging) return false;
      state.keyboardFocused = false;
      state.candidate = true;
      state.dragging = false;
      state.pointerId = id;
      state.inputKind = inputKind;
      state.pointerCaptured = false;
      state.startX = state.lastX = x;
      state.startY = y;
      state.lastTime = state.lastMoveTime = performance.now();
      state.distance = 0;
      state.velocity = 0;
      state.settleUntil = 0;
      viewport.classList.add('is-user-paused');
      ensureRosterMotion();
      return true;
    };

    const finishGesture = (id, cancelled = false) => {
      if (!state.candidate && !state.dragging) return;
      if (id !== undefined && state.pointerId !== id) return;
      const pointerId = state.pointerId;
      const pointerCaptured = state.pointerCaptured;
      const wasDragging = state.dragging;
      const inputKind = state.inputKind;
      const recentMove = performance.now() - state.lastMoveTime <= 80;
      state.candidate = false;
      state.dragging = false;
      state.pointerId = null;
      state.inputKind = null;
      state.pointerCaptured = false;
      viewport.classList.remove('is-user-paused', 'is-dragging');
      if (pointerCaptured && pointerId !== null && viewport.hasPointerCapture?.(pointerId)) {
        try { viewport.releasePointerCapture(pointerId); } catch { /* Capture may already be released. */ }
      }
      if (cancelled || !wasDragging || !recentMove || !window.SCPMotion.allowed()) state.velocity = 0;
      else state.velocity = clamp(state.velocity, -1600, 1600);
      if (!cancelled && !wasDragging && inputKind === 'touch') {
        // Keep the tapped card still until Safari dispatches its synthesized click.
        state.settleUntil = performance.now() + 220;
      }
      if (wasDragging && !cancelled && state.distance >= (inputKind === 'touch' ? 12 : 6)) {
        state.suppressClick = true;
        setTimeout(() => { state.suppressClick = false; }, inputKind === 'touch' ? 260 : 100);
      }
      ensureRosterMotion();
    };

    const moveGesture = (id, x, y, inputKind, event) => {
      if (!state.candidate || state.pointerId !== id) return;
      const totalX = x - state.startX;
      const totalY = y - state.startY;
      const horizontal = Math.abs(totalX);
      const vertical = Math.abs(totalY);
      if (!state.dragging) {
        const activationDistance = inputKind === 'touch' ? 12 : 6;
        if (inputKind === 'touch' && vertical >= activationDistance && vertical > horizontal * 1.25) {
          finishGesture(id, true);
          return;
        }
        if (horizontal < activationDistance) return;
        if (inputKind === 'touch' ? horizontal < vertical * .75 : horizontal < vertical) return;
        state.dragging = true;
        viewport.classList.add('is-dragging');
        if (inputKind !== 'touch') {
          try {
            viewport.setPointerCapture(id);
            state.pointerCaptured = true;
          } catch { /* Continue without capture if unavailable. */ }
        }
      }

      event.preventDefault();
      const now = performance.now();
      const deltaX = x - state.lastX;
      const deltaTime = clamp(now - state.lastTime, 4, 64);
      state.distance = Math.max(state.distance, Math.hypot(totalX, totalY));
      if (window.SCPMotion.allowed()) {
        state.offset += deltaX;
        paintRosterOffset(state);
        const instantVelocity = clamp(deltaX / deltaTime * 1000, -1600, 1600);
        state.velocity = state.velocity * .28 + instantVelocity * .72;
      } else {
        viewport.scrollLeft -= deltaX;
        state.velocity = 0;
      }
      state.lastX = x;
      state.lastTime = state.lastMoveTime = now;
    };

    state.cancelPointer = () => finishGesture(undefined, true);
    viewport.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' && hasTouchEvents) return;
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      beginGesture(event.pointerId, event.clientX, event.clientY, event.pointerType || 'mouse');
    }, { passive: true });

    viewport.addEventListener('pointermove', event => {
      moveGesture(event.pointerId, event.clientX, event.clientY, event.pointerType || state.inputKind, event);
    }, { passive: false });

    viewport.addEventListener('pointerup', event => finishGesture(event.pointerId));
    viewport.addEventListener('pointercancel', event => finishGesture(event.pointerId, true));
    viewport.addEventListener('lostpointercapture', event => finishGesture(event.pointerId, true));

    viewport.addEventListener('touchstart', event => {
      if (event.touches.length !== 1 || state.candidate || state.dragging) return;
      const touch = event.touches[0];
      beginGesture(`touch-${touch.identifier}`, touch.clientX, touch.clientY, 'touch');
    }, { passive: true });
    viewport.addEventListener('touchmove', event => {
      if (state.inputKind !== 'touch') return;
      if (event.touches.length !== 1) {
        finishGesture(state.pointerId, true);
        return;
      }
      const touch = Array.from(event.touches).find(item => `touch-${item.identifier}` === state.pointerId);
      if (!touch) return;
      moveGesture(state.pointerId, touch.clientX, touch.clientY, 'touch', event);
    }, { passive: false });
    const finishTouch = (event, cancelled = false) => {
      if (state.inputKind !== 'touch') return;
      const ended = Array.from(event.changedTouches).some(item => `touch-${item.identifier}` === state.pointerId);
      if (ended || cancelled) finishGesture(state.pointerId, cancelled);
    };
    viewport.addEventListener('touchend', event => finishTouch(event));
    viewport.addEventListener('touchcancel', event => finishTouch(event, true));
    viewport.addEventListener('dragstart', event => event.preventDefault());
    viewport.addEventListener('selectstart', event => { if (state.dragging) event.preventDefault(); });
    viewport.addEventListener('pointerenter', event => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      state.pointerHovered = true;
      state.velocity = 0;
    });
    viewport.addEventListener('pointerleave', event => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      state.pointerHovered = false;
      ensureRosterMotion();
    });
    viewport.addEventListener('click', event => {
      if (!state.suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      state.suppressClick = false;
    }, true);
    viewport.addEventListener('focusin', () => {
      if (!root.classList.contains('keyboard-navigation')) return;
      state.keyboardFocused = true;
      state.velocity = 0;
    });
    viewport.addEventListener('focusout', event => {
      if (viewport.contains(event.relatedTarget)) return;
      state.keyboardFocused = false;
      ensureRosterMotion();
    });
    viewport.addEventListener('keydown', event => {
      if (event.target !== viewport || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      if (!window.SCPMotion.allowed()) {
        viewport.scrollLeft += event.key === 'ArrowLeft' ? -72 : 72;
        return;
      }
      state.keyboardFocused = true;
      state.velocity = 0;
      state.offset += event.key === 'ArrowLeft' ? 72 : -72;
      paintRosterOffset(state);
    });
    window.addEventListener('blur', () => finishGesture(undefined, true));
  }

  function configureRosterMotion(view, revision = view.motion.measureRevision) {
    const state = view.motion;
    if (revision !== state.measureRevision) return false;
    const primary = state.track.querySelector('.roster-marquee-group');
    const width = primary?.getBoundingClientRect().width || 0;
    if (width < 1) return false;
    const oldWidth = state.cycleWidth;
    const phase = state.initialized && oldWidth
      ? ((-state.offset / oldWidth) % 1 + 1) % 1
      : (state.direction < 0 ? .12 : .62);
    state.cycleWidth = width;
    state.offset = -phase * width;
    const duration = view.motion.duration || 36;
    state.baseVelocity = state.direction * clamp(width / duration, 30, 58);
    if (!state.initialized || state.disabled) state.velocity = state.baseVelocity;
    else state.velocity = clamp(state.velocity, -1600, 1600);
    state.initialized = true;
    state.disabled = false;
    paintRosterOffset(state);
    return true;
  }

  function resetRosterMotion() {
    cancelAnimationFrame(rosterMotionFrame);
    rosterMotionFrame = 0;
    rosterMotionTimestamp = 0;
    rosterMotionStates.forEach(state => {
      state.cancelPointer?.();
      state.disabled = true;
      state.velocity = 0;
      state.track.style.removeProperty('transform');
      state.viewport.scrollLeft = 0;
      state.viewport.classList.remove('is-user-paused', 'is-dragging');
    });
  }

  function ensureRosterMotion() {
    if (rosterMotionFrame || current !== 'founders' || !window.SCPMotion.allowed()) return;
    rosterMotionTimestamp = performance.now();
    rosterMotionFrame = requestAnimationFrame(runRosterMotion);
  }

  function runRosterMotion(timestamp) {
    rosterMotionFrame = 0;
    if (current !== 'founders' || $('founders').hidden || document.hidden || !window.SCPMotion.allowed()) return;
    const delta = Math.min(Math.max((timestamp - rosterMotionTimestamp) / 1000, 0), .032);
    rosterMotionTimestamp = timestamp;
    const visuallyPaused = document.body.classList.contains('modal-open') || root.classList.contains('is-routing');
    if (!visuallyPaused) {
      rosterMotionStates.forEach(state => {
        if (!state.cycleWidth || state.disabled) return;
        if (!state.candidate && !state.keyboardFocused && !state.pointerHovered && timestamp >= state.settleUntil) {
          const blend = 1 - Math.exp(-delta / .5);
          state.velocity += (state.baseVelocity - state.velocity) * blend;
          state.offset += state.velocity * delta;
          paintRosterOffset(state);
        }
      });
    }
    rosterMotionFrame = requestAnimationFrame(runRosterMotion);
  }

  let visibleMembers = memberCards;
  let railResizeFrame = 0;
  function renderRosterRails() {
    const galleryWidth = gallery.clientWidth || Math.min(innerWidth, 1920);
    const estimatedCardWidth = innerWidth <= 680 ? 246 : 320;
    const minimumCycle = Math.max(6, Math.ceil(galleryWidth / estimatedCardWidth) + 2);

    railDefinitions.forEach(definition => {
      const view = railViews[definition.key];
      const cards = visibleMembers.filter(card => card.dataset.rosterType === definition.key);
      view.motion.cancelPointer?.();
      view.section.hidden = cards.length === 0;
      view.count.textContent = String(cards.length).padStart(2, '0');
      if (!cards.length) {
        view.motion.cycleWidth = 0;
        view.motion.track.style.removeProperty('transform');
        view.track.replaceChildren();
        return;
      }

      const cycleCount = Math.max(cards.length, minimumCycle);
      const primary = document.createElement('div');
      primary.className = 'roster-marquee-group';
      for (let index = 0; index < cycleCount; index++) {
        const card = cards[index % cards.length];
        primary.append(index < cards.length ? card : decorativeClone(card));
      }
      const replica = document.createElement('div');
      replica.className = 'roster-marquee-group';
      replica.setAttribute('aria-hidden', 'true');
      [...primary.children].forEach(card => replica.append(decorativeClone(card)));
      view.track.replaceChildren(primary, replica);
      const duration = Math.max(27, cycleCount * 4.5);
      view.motion.duration = duration;
      view.track.style.setProperty('--rail-duration', `${duration}s`);
      const revision = ++view.motion.measureRevision;
      if (!configureRosterMotion(view, revision)) {
        requestAnimationFrame(() => {
          if (configureRosterMotion(view, revision)) ensureRosterMotion();
        });
      }
    });
    ensureRosterMotion();
  }

  function queueRailRender() {
    cancelAnimationFrame(railResizeFrame);
    railResizeFrame = requestAnimationFrame(renderRosterRails);
  }
  window.addEventListener('resize', queueRailRender, { passive: true });
  root.classList.add('roster-drag-ready');

  function filterMembers() {
    const query = normalize($('memberSearch').value);
    const role = $('roleFilter').value;
    let count = 0;
    memberCards.forEach(card => {
      const id = card.querySelector('.member-id').textContent.trim();
      const searchable = normalize(card.textContent + ' ' + (dossiers[id]?.alias || ''));
      const matches = searchable.includes(query) && (role === 'all' || category(id, card).includes(role));
      card.hidden = !matches;
      if (matches) count++;
    });
    $('memberCount').textContent = count;
    $('emptyState').hidden = count > 0;
    visibleMembers = memberCards.filter(card => !card.hidden);
    renderRosterRails();
    const pureCount = visibleMembers.filter(card => card.dataset.rosterType === 'pure').length;
    const allianceCount = count - pureCount;
    const activeRails = Number(pureCount > 0) + Number(allianceCount > 0);
    $('operativeToolbar').hidden = count === 0;
    $('operativeCurrent').textContent = String(activeRails).padStart(2, '0');
    $('operativeTotal').textContent = String(count).padStart(2, '0');
    $('operativeCurrentId').textContent = `${String(pureCount).padStart(2, '0')} PURE / ${String(allianceCount).padStart(2, '0')} ALLIANCE`;
    $('searchStatus').textContent = `${count} dari ${memberCards.length} dossier ditampilkan: ${pureCount} Pure SCP dan ${allianceCount} Alliance. Pilih anggota untuk membuka profil.`;
  }
  $('memberSearch').addEventListener('input', filterMembers);
  $('roleFilter').addEventListener('change', filterMembers);
  $('resetSearch').addEventListener('click', () => { $('memberSearch').value = ''; $('roleFilter').value = 'all'; filterMembers(); $('memberSearch').focus(); });
  filterMembers();

  const dossier = $('scpDossier');
  let dossierTrigger = null;
  let dossierEffectTimer;
  let dossierExpansion;
  let dossierClosing = false;
  let dossierCloseTimer;
  let dossierGeneration = 0;
  let dossierReturnTimer;
  let dossierReturnCard;
  let dossierDirection = 1;
  function closeDossier({ immediate = false, restoreFocus = true } = {}) {
    if (!restoreFocus) dossierTrigger = null;
    if (!dossier.open) return;
    if (dossierClosing && !immediate) return;
    const generation = ++dossierGeneration;
    const finalize = () => {
      if (generation !== dossierGeneration) return;
      clearTimeout(dossierCloseTimer);
      clearTimeout(dossierEffectTimer);
      dossierExpansion?.cancel();
      dossierClosing = false;
      dossier.classList.remove('is-closing', 'is-decoding');
      if (dossier.open) dossier.close();
    };
    if (immediate || !window.SCPMotion.allowed() || !dossier.animate) { finalize(); return; }
    dossierClosing = true;
    clearTimeout(dossierEffectTimer);
    const computed = getComputedStyle(dossier);
    const from = { transform: computed.transform, opacity: computed.opacity };
    dossierExpansion?.cancel();
    dossier.classList.add('is-closing');
    dossierCloseTimer = setTimeout(finalize, 240);
    try {
      dossierExpansion = dossier.animate([from, { transform: `translate(${dossierDirection * 10}px, 6px)`, opacity: 0 }], { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
      dossierExpansion.finished.then(finalize, () => {});
    } catch { finalize(); }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dossierClosing) closeDossier({ immediate: true });
    else if (document.hidden && dossier.open) {
      dossierExpansion?.cancel();
      clearTimeout(dossierEffectTimer);
      dossier.classList.remove('is-decoding');
    }
  });
  function appendText(parent, tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }
  function openDossier(id, trigger, focusTarget = trigger) {
    const data = dossiers[id];
    if (!data) { toast('Dossier belum tersedia.'); return; }
    ++dossierGeneration;
    clearTimeout(dossierCloseTimer);
    dossierClosing = false;
    dossier.classList.remove('is-closing');
    dossierTrigger = focusTarget;
    const sourceCard = trigger.closest('.member-card');
    const sourceRect = sourceCard.getBoundingClientRect();
    dossierDirection = sourceRect.left + sourceRect.width / 2 < innerWidth / 2 ? -1 : 1;
    const art = sourceCard.querySelector('.member-art');
    dossier.style.setProperty('--dossier-art', `url("${art.currentSrc || art.getAttribute('src')}")`);
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
    const remotePhoto = data.photo_url || '';
    photo.src = remotePhoto || (id === 'SCP-022' ? 'assets/jess.webp' : 'assets/emblem.webp');
    photo.alt = remotePhoto ? `Foto ${data.name}` : (id === 'SCP-022' ? 'Emblem Jess SCP' : '');
    portrait.classList.toggle('has-photo', Boolean(remotePhoto) || id === 'SCP-022');
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
    const stats = Array.isArray(data.stats) ? data.stats : Object.entries(data.stats || {});
    for (const [name, value] of stats) {
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
    if (window.SCPMotion.allowed() && dossier.animate) {
      // Keep the panel at its final size: only composited position and opacity move.
      dossier.classList.add('is-decoding');
      try {
        dossierExpansion = dossier.animate([
          { transform: `translate(${dossierDirection * 18}px, 8px)`, opacity: 0 },
          { transform: 'translate(0, 0)', opacity: 1 }
        ], { duration: 240, easing: 'cubic-bezier(.2,.8,.25,1)' });
        dossierEffectTimer = setTimeout(() => dossier.classList.remove('is-decoding'), 360);
      } catch { dossier.classList.remove('is-decoding'); }
    }
  }
  gallery.addEventListener('click', event => {
    const sourceCard = event.target.closest('.member-card');
    if (!sourceCard || !gallery.contains(sourceCard)) return;
    const id = sourceCard.dataset.operative || sourceCard.querySelector('.member-id')?.textContent.trim();
    const sourceButton = sourceCard.querySelector('.member-open');
    const originalCard = memberCards.find(card => card.dataset.operative === id);
    const focusTarget = originalCard?.querySelector('.member-open') || sourceButton;
    if (id && sourceButton) openDossier(id, sourceButton, focusTarget);
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
      const next = node.dataset.date
        ? new Date(`${node.dataset.date}T${(node.dataset.time || '00:00').slice(0, 5)}:00+07:00`)
        : SCPSchedule.nextOccurrence(Number(node.dataset.weekday), Number(node.dataset.hour), new Date(), Number(node.dataset.minute || 0));
      node.textContent = `${node.dataset.date ? 'TANGGAL' : 'BERIKUTNYA'} / ${dateFormatter.format(next)}`;
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
  if (current === 'hero') playHeroEntrance();
  queueRailRender();
  window.dispatchEvent(new Event('scp:ready'));
})();
