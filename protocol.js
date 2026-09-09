/* SCP interface motion. Decorative only; routing never depends on animation events. */
(() => {
  'use strict';
  const root = document.documentElement;
  const wipe = document.getElementById('pageWipe');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let phase = 'idle', pending, afterReveal, coverTimer, revealTimer;
  const allowed = () => !root.classList.contains('motion-off') && !media.matches && !document.hidden;
  function clear() {
    clearTimeout(coverTimer); clearTimeout(revealTimer);
    wipe.classList.remove('is-covering', 'is-revealing');
    wipe.hidden = true;
    root.classList.remove('is-routing');
    document.getElementById('mainContent').inert = false;
    phase = 'idle';
  }
  function finish() {
    const commit = pending;
    pending = null;
    const done = commit ? commit() : afterReveal;
    afterReveal = null;
    clear();
    done?.();
  }
  function run(commit, label, number) {
    pending = commit;
    document.getElementById('wipeLabel').textContent = label;
    document.getElementById('wipeNumber').textContent = number;
    if (!allowed()) { finish(); return; }
    if (phase === 'covering') return; // Keep the newest intent while the screen closes.
    clear(); afterReveal = null;
    phase = 'covering';
    wipe.hidden = false;
    root.classList.add('is-routing');
    document.getElementById('mainContent').inert = true;
    void wipe.offsetWidth;
    wipe.classList.add('is-covering');
    coverTimer = setTimeout(() => {
      const latest = pending; pending = null;
      try { afterReveal = latest?.(); }
      finally {
        phase = 'revealing';
        wipe.classList.replace('is-covering', 'is-revealing');
        revealTimer = setTimeout(finish, 380);
      }
    }, 290);
  }
  window.SCPMotion = { run, finish, allowed };
  media.addEventListener('change', () => { if (media.matches) finish(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });

  // Strokes follow each surface's real size, keeping corner geometry and line weight crisp.
  const ns = 'http://www.w3.org/2000/svg';
  const header = document.querySelector('.header');
  const nav = document.querySelector('.nav');
  const brand = document.querySelector('.brand');
  const bevelSlope = .55;
  const drawings = [];
  function svgNode(tag, attributes = {}) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }
  document.querySelectorAll('.header, .panel, .nav, .header-community').forEach(surface => {
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'protocol-frame'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(path); surface.prepend(svg);
    let insetPath, navMask, navTiles;
    if (surface === nav) {
      const defs = svgNode('defs');
      const gradient = svgNode('linearGradient', { id: 'navEmerald', x2: '1', y2: '1' });
      gradient.append(svgNode('stop', { offset: '0', 'stop-color': '#326d50' }), svgNode('stop', { offset: '1', 'stop-color': '#205039' }));
      navMask = svgNode('mask', { id: 'navInset', maskUnits: 'userSpaceOnUse', x: '0', y: '0', 'mask-type': 'luminance' });
      // One contour supplies both the stroke and its exact 4px inner offset.
      insetPath = svgNode('path', { fill: 'white', stroke: 'black', 'stroke-width': '8' });
      navMask.append(insetPath); defs.append(gradient, navMask);
      const fills = svgNode('g', { mask: 'url(#navInset)', stroke: 'none' });
      navTiles = [...nav.querySelectorAll('.nav-link')].map(link => {
        const tile = svgNode('rect', { class: 'nav-fill', rx: '4', fill: 'url(#navEmerald)' });
        fills.append(tile);
        const sync = () => tile.classList.toggle('is-active', link.classList.contains('active'));
        sync();
        new MutationObserver(() => { sync(); queueFrames(); }).observe(link, { attributes: true, attributeFilter: ['class'] });
        link.addEventListener('pointerenter', () => tile.classList.add('is-hovered'));
        link.addEventListener('pointerleave', () => tile.classList.remove('is-hovered'));
        return { link, tile };
      });
      svg.prepend(defs, fills);
      nav.classList.add('has-contour-fill');
    }
    function draw() {
      const w = surface.clientWidth, h = surface.clientHeight;
      if (!w || !h) return;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const x = parseFloat(getComputedStyle(surface).getPropertyValue('--frame-inset')) || 18;
      let d;
      if (surface.classList.contains('nav')) {
        const endX = 5 + bevelSlope * (h - 26);
        d = `M 16 1 Q -2 1 5 13 L ${endX} ${h - 13} Q ${endX + bevelSlope * 12} ${h - 1} ${endX + 18} ${h - 1} H ${w - 23} Q ${w - 20} ${h - 1} ${w - 17} ${h - 4} L ${w - 3} ${h - 18} Q ${w - 1} ${h - 20} ${w - 1} ${h - 23} V 10 Q ${w - 1} 1 ${w - 10} 1 Z`;
        insetPath.setAttribute('d', d);
        navMask.setAttribute('width', w); navMask.setAttribute('height', h);
        const bounds = nav.getBoundingClientRect();
        navTiles.forEach(({ link, tile }, index) => {
          const rect = link.getBoundingClientRect();
          const left = index === 0 ? 0 : rect.left - bounds.left + 1;
          const right = index === navTiles.length - 1 ? w : rect.right - bounds.left - 1;
          tile.setAttribute('x', left); tile.setAttribute('y', 5);
          tile.setAttribute('width', Math.max(0, right - left)); tile.setAttribute('height', Math.max(0, h - 10));
        });
      } else if (surface.classList.contains('header')) {
        const bounds = header.getBoundingClientRect();
        const navBounds = nav.getBoundingClientRect();
        const desktopNav = matchMedia('(min-width: 901px)').matches && navBounds.width > 0;
        // Both bevels share the same slope. The outer stroke sits 16px left of the nav slope.
        const lineX = desktopNav
          ? y => navBounds.left - bounds.left + 5 + bevelSlope * (y - (navBounds.top - bounds.top + 13)) - 16
          : y => Math.min(brand.getBoundingClientRect().right - bounds.left + 44, w - 110) + bevelSlope * (y - 32);
        const startX = lineX(32), endX = lineX(h - 24);
        const right = w - x;
        d = `M ${x} ${h} V 34 Q ${x} 12 ${x + 22} 12 H ${startX - 31} Q ${startX - bevelSlope * 20} 12 ${startX} 32 L ${endX} ${h - 24} Q ${endX + bevelSlope * 12} ${h - 12} ${endX + 18} ${h - 12} H ${right - 22} Q ${right} ${h - 12} ${right} ${h - 34} V 0 M ${right} ${h - 34} V ${h}`;
      } else if (surface.classList.contains('header-community')) {
        const notch = w * .6;
        d = `M 9 7 H ${notch} Q ${notch + 3} 7 ${notch + 6} 4 L ${notch + 8} 2 Q ${notch + 10} 1 ${notch + 13} 1 H ${w - 9} Q ${w - 1} 1 ${w - 1} 9 V ${h - 9} Q ${w - 1} ${h - 1} ${w - 9} ${h - 1} H ${notch + 3} Q ${notch} ${h - 1} ${notch - 3} ${h - 4} L ${notch - 7} ${h - 8} H 38 Q 32 ${h - 8} 32 ${h - 4} Q 32 ${h - 1} 27 ${h - 1} H 24 Q 20 ${h - 1} 17 ${h - 4} L 4 ${h - 17} Q 1 ${h - 20} 1 ${h - 25} V 15 Q 1 7 9 7 Z`;
      } else {
        const corner = w < 680 ? 18 : 32, y = h - 16;
        const left = w * .37, right = w * .63;
        d = `M ${x} 0 H ${w - x} V ${y - corner} L ${w - x - corner} ${y} H ${right + 20} L ${right} ${y - 13} H ${left} L ${left - 20} ${y} H ${x + corner} Q ${x} ${y} ${x} ${y - corner} Z`;
      }
      path.setAttribute('d', d);
    }
    drawings.push(draw);
  });
  let geometryFrame = 0;
  function drawFrames() { geometryFrame = 0; drawings.forEach(draw => draw()); }
  function queueFrames() { if (!geometryFrame) geometryFrame = requestAnimationFrame(drawFrames); }
  drawFrames();
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(queueFrames);
    document.querySelectorAll('.header, .nav, .brand, .header-community, .panel').forEach(surface => observer.observe(surface));
  }
  window.addEventListener('resize', queueFrames);
  window.addEventListener('scp:language', queueFrames);
  document.fonts?.ready.then(queueFrames);
  document.fonts?.addEventListener('loadingdone', queueFrames);
})();
