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
  const status = document.getElementById('bootStatus');
  let finished = false;
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
  document.getElementById('bootSkip').addEventListener('click', closeNow);
  loader.addEventListener('cancel', event => { event.preventDefault(); closeNow(); });
  loader.addEventListener('close', cleanUp);
  window.addEventListener('scp:ready', onReady, { once: true });
  reducedMotion.addEventListener('change', onMotionChange);
  watchdog = setTimeout(closeNow, 3200);
  try {
    loader.showModal();
    root.classList.add('is-booting');
  } catch { closeNow(); return; }

  const hero = document.querySelector('#hero .scene img');
  const visual = hero?.decode ? hero.decode().catch(() => {}) : Promise.resolve();
  const fonts = document.fonts ? Promise.allSettled([
    document.fonts.load('500 16px "SCP UI"'),
    document.fonts.load('700 16px "SCP UI"')
  ]) : Promise.resolve();
  Promise.allSettled([ready, visual, fonts]).then(() => {
    if (finished) return;
    status.textContent = 'PROTOCOL READY';
    loader.classList.add('is-ready');
    readyTimer = setTimeout(reveal, Math.max(250, 1100 - (performance.now() - started)));
  });
})();
