/* A bounded introduction. It never gates the site's initialization. */
(() => {
  'use strict';
  const loader = document.getElementById('bootLoader');
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let effectsOff = false;
  try { effectsOff = localStorage.getItem('scp-effects') === 'off'; } catch { /* Optional preference. */ }
  if (!loader || typeof loader.showModal !== 'function' || reducedMotion.matches || effectsOff) return;

  const started = performance.now();
  const percentage = document.getElementById('bootPercent');
  const progressbar = document.getElementById('bootProgress');
  if (!percentage || !progressbar) return;
  let finished = false;
  let progressFrame;
  let target = 0;
  let progress = 0;
  let lastFrame = started;
  let displayed = -1;
  let exitTimer;
  let readyTimer;
  let watchdog;
  let signalReady;
  const ready = new Promise(resolve => { signalReady = resolve; });
  const onReady = () => signalReady();

  function cleanUp() {
    finished = true;
    clearTimeout(watchdog);
    clearTimeout(exitTimer);
    clearTimeout(readyTimer);
    cancelAnimationFrame(progressFrame);
    root.classList.remove('is-booting');
    loader.classList.remove('is-leaving');
    window.removeEventListener('scp:ready', onReady);
    reducedMotion.removeEventListener('change', onMotionChange);
    signalReady();
  }
  function closeNow() {
    cleanUp();
    if (loader.open) loader.close();
  }
  function onMotionChange() { if (reducedMotion.matches) closeNow(); }
  function reveal() {
    if (finished) return;
    finished = true;
    loader.classList.add('is-leaving');
    exitTimer = setTimeout(closeNow, 180);
  }

  // Register escape hatches before showing the modal, independently of script.js.
  loader.addEventListener('cancel', event => { event.preventDefault(); closeNow(); });
  loader.addEventListener('close', cleanUp);
  window.addEventListener('scp:ready', onReady, { once: true });
  reducedMotion.addEventListener('change', onMotionChange);
  watchdog = setTimeout(closeNow, 3200);
  try {
    loader.showModal();
    root.classList.add('is-booting');
  } catch { closeNow(); return; }

  // Progress represents initialization milestones, including usable fallbacks.
  // Animate toward completed work; 100 is only reachable once every step settles.
  function milestone(work, weight) {
    Promise.resolve().then(work).catch(() => {}).then(() => {
      if (!finished) target = Math.min(100, target + weight);
    });
  }
  const hero = document.querySelector('#hero .scene img');
  milestone(() => ready, 34);
  milestone(() => hero?.decode?.(), 33);
  milestone(() => document.fonts ? Promise.allSettled([
    document.fonts.load('500 16px "SCP UI"'),
    document.fonts.load('700 16px "SCP UI"')
  ]) : undefined, 33);

  function paint(now) {
    if (finished) return;
    progress = Math.min(target, progress + Math.max(0, now - lastFrame) * .095);
    lastFrame = now;
    const value = Math.floor(progress);
    if (value !== displayed) {
      displayed = value;
      percentage.textContent = String(value).padStart(2, '0');
      progressbar.setAttribute('aria-valuenow', String(value));
    }
    progressbar.style.setProperty('--boot-progress', String(progress / 100));
    if (progress === 100) {
      readyTimer = setTimeout(reveal, Math.max(180, 1100 - (now - started)));
    } else {
      progressFrame = requestAnimationFrame(paint);
    }
  }
  progressFrame = requestAnimationFrame(paint);
})();
