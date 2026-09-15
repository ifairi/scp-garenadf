(function () {
  'use strict';
  const C = window.MappingCore;
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), stage = $('stage'), ctx = canvas.getContext('2d');
  const toolButtons = Array.from(document.querySelectorAll('[data-tool]'));
  const scene = { version: 1, title: 'Untitled strategy', map: null, objects: [] };
  const view = { x: 0, y: 0, scale: 1 };
  const pointers = new Map();
  let background = null, maps = [], selectedId = null, tool = 'pen', preview = null, gesture = null;
  let focusBounds = null;
  let cssWidth = 1, cssHeight = 1, dpr = 1, raf = 0, busy = false, spaceDown = false;
  let history = [], historyIndex = -1, historyBytes = 0, revision = 0, persistedRevision = 0;
  let autosaveTimer = 0, dbPromise = null, saveQueue = Promise.resolve(), deviceSaveFailed = false;
  let mapGeneration = 0, announcementTimer = 0;
  const MAX_HISTORY_BYTES = 12 * 1024 * 1024;
  const TOOL_HINTS = { select: 'Select an annotation to move, style, or delete it.', pen: 'Drag to draw. Two fingers or Space + drag to pan.', line: 'Drag to draw a line.', arrow: 'Drag from the starting point toward the destination.', rect: 'Drag to outline an area.', ellipse: 'Drag to circle an area.', text: 'Enter your text above, then click the map to place it.', marker: 'Choose a marker and label above, then click the map.', eraser: 'Drag over annotations to erase them. Undo restores them.', pan: 'Drag to pan. Pinch or use the mouse wheel to zoom.' };

  function announce(message, error = false, temporary = false) {
    clearTimeout(announcementTimer);
    $('status').textContent = message;
    $('status').dataset.error = String(error);
    if (temporary) announcementTimer = setTimeout(showToolHint, 5500);
  }
  function showToolHint() { announce(scene.map ? TOOL_HINTS[tool] : 'Choose a map to start.'); }
  function saveStatus(message, error = false) { $('save-status').textContent = message; $('save-status').dataset.error = String(error); }
  function selected() { return scene.objects.find(item => item.id === selectedId); }
  function uid() { return 'o-' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)); }
  function requestRender() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
  function controls() {
    const hasMap = !!scene.map && !busy;
    for (const id of ['save-strategy', 'export-png', 'fit', 'zoom-in', 'zoom-out']) $(id).disabled = !hasMap;
    $('undo').disabled = busy || historyIndex <= 0;
    $('redo').disabled = busy || historyIndex >= history.length - 1;
    $('clear').disabled = !hasMap || !scene.objects.length;
    $('delete-selected').disabled = !hasMap || !selected();
    $('map-select').disabled = busy;
    $('upload-map').disabled = busy;
    $('empty-upload').disabled = busy;
    $('open-strategy').disabled = busy;
    $('empty-state').hidden = !!scene.map;
    $('loading').hidden = !busy;
    $('zoom-value').textContent = Math.round(view.scale * 100) + '%';
  }
  function setBusy(value, label) { busy = value; if (label) $('loading').textContent = label; controls(); }
  function snapshot() { return JSON.stringify({ title: scene.title, objects: scene.objects }); }
  function resetHistory() { history = [snapshot()]; historyIndex = 0; historyBytes = history[0].length; controls(); }
  function commit() {
    const next = snapshot();
    if (history[historyIndex] === next) return;
    history = history.slice(0, historyIndex + 1);
    history.push(next); historyIndex = history.length - 1;
    historyBytes = history.reduce((sum, item) => sum + item.length, 0);
    while (history.length > 2 && (history.length > 60 || historyBytes > MAX_HISTORY_BYTES)) { historyBytes -= history.shift().length; historyIndex--; }
    revision++; queueAutosave(); controls(); requestRender();
  }
  function stepHistory(direction) {
    cancelGesture();
    const nextIndex = historyIndex + direction;
    if (busy || nextIndex < 0 || nextIndex >= history.length) return;
    historyIndex = nextIndex;
    const state = JSON.parse(history[historyIndex]);
    scene.objects = state.objects; scene.title = state.title; $('strategy-title').value = scene.title;
    if (!selected()) selectedId = null;
    revision++; queueAutosave(); updateProperties(); controls(); requestRender();
    announce(direction < 0 ? 'Change undone.' : 'Change restored.', false, true);
  }

  function openDB() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('Browser storage is unavailable.')); return; }
      const request = indexedDB.open('scp-mapping', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('drafts');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Browser storage is unavailable.'));
      request.onblocked = () => reject(new Error('Browser storage is busy in another tab.'));
    });
    return dbPromise;
  }
  async function readDraft() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readonly');
      const request = transaction.objectStore('drafts').get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function queueAutosave() {
    if (!scene.map) return;
    clearTimeout(autosaveTimer); saveStatus(deviceSaveFailed ? 'Download a strategy to keep a copy' : 'Saving draft…', deviceSaveFailed);
    autosaveTimer = setTimeout(saveDraft, 650);
  }
  function saveDraft() {
    clearTimeout(autosaveTimer);
    if (!scene.map || revision === persistedRevision) return saveQueue;
    // Persist committed edits only; a move or erase gesture may still be cancelled.
    const draft = { version: scene.version, map: { ...scene.map }, ...JSON.parse(history[historyIndex]) }, savedRevision = revision;
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      if (savedRevision === persistedRevision) return;
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('drafts', 'readwrite');
        transaction.objectStore('drafts').put(draft, 'current');
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      persistedRevision = savedRevision;
      deviceSaveFailed = false;
      if (savedRevision === revision) saveStatus('Draft saved on this device');
    }).catch(() => {
      deviceSaveFailed = true;
      saveStatus('Draft not saved · download a copy', true);
      announce('Browser storage is unavailable or full. Use Save strategy to keep your work.', true);
    });
    return saveQueue;
  }

  function imageFromSource(src) {
    const safeSource = C.imageSource(src, document.baseURI);
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => { image.src = ''; reject(new Error('The map took too long to load. Try again.')); }, 30000);
      image.onload = () => {
        clearTimeout(timeout);
        try { C.dimensions(image.naturalWidth, image.naturalHeight); resolve(image); } catch (error) { reject(error); }
      };
      image.onerror = () => { clearTimeout(timeout); reject(new Error('This map could not be loaded. Check the image and try again.')); };
      image.src = safeSource;
    });
  }
  function sourceLink(entry) {
    const link = $('map-source'); link.hidden = true; link.removeAttribute('href');
    if (!entry || !entry.sourceUrl) return;
    try { const url = new URL(entry.sourceUrl); if (url.protocol === 'https:') { link.href = url.href; link.hidden = false; } } catch (_) { /* Optional metadata. */ }
  }
  async function loadMapEntry(entry) {
    if (entry.tileSet) {
      const url = new URL(entry.tileSet, document.baseURI);
      if (url.origin !== location.origin || !url.pathname.endsWith('.tiles.json')) throw new Error('Map package must be hosted on this website.');
      const response = await fetch(url.href);
      if (!response.ok) throw new Error('The map package could not be loaded. Please try again.');
      const data = await response.json();
      entry = { ...entry, tiles: data.tiles };
    }
    if (entry.src) {
      const src = C.imageSource(entry.src, document.baseURI), image = await imageFromSource(src);
      if ((entry.width && image.naturalWidth !== entry.width) || (entry.height && image.naturalHeight !== entry.height)) throw new Error('Map dimensions do not match its image. The previous strategy is still open.');
      return { image, map: { name: String(entry.name || 'Uploaded map').slice(0, 180), src, width: image.naturalWidth, height: image.naturalHeight } };
    }
    C.dimensions(entry.width, entry.height);
    if (!Array.isArray(entry.tiles) || !entry.tiles.length || entry.tiles.length > 1024) throw new Error('This map has no usable image. Upload a map to continue.');
    const composite = document.createElement('canvas'); composite.width = entry.width; composite.height = entry.height;
    const tileContext = composite.getContext('2d');
    if (!tileContext) throw new Error('This device could not prepare the map. Try a smaller image.');
    let cursor = 0;
    const workers = Array.from({ length: Math.min(8, entry.tiles.length) }, async () => {
      while (cursor < entry.tiles.length) {
        const tile = entry.tiles[cursor++];
        if (!tile || ![tile.x, tile.y, tile.width, tile.height].every(Number.isFinite) || tile.x < 0 || tile.y < 0 || tile.width <= 0 || tile.height <= 0 || tile.x + tile.width > entry.width || tile.y + tile.height > entry.height) throw new Error('The map has an invalid tile layout.');
        const image = await imageFromSource(tile.src);
        tileContext.drawImage(image, tile.x, tile.y, tile.width, tile.height);
      }
    });
    await Promise.all(workers);
    const src = composite.toDataURL('image/png');
    C.imageSource(src, document.baseURI);
    return { image: composite, map: { name: String(entry.name).slice(0, 180), src, width: entry.width, height: entry.height } };
  }
  function mayReplace() {
    return !scene.map || !scene.objects.length || window.confirm('Replace this strategy? Download it with Save strategy first if you want to keep a separate copy.');
  }
  function setScene(next, image, entry, restored = false) {
    cancelGesture();
    scene.map = next.map; scene.title = next.title; scene.objects = next.objects; background = image;
    focusBounds = entry?.focus || null;
    selectedId = null; $('strategy-title').value = scene.title;
    $('map-select').value = entry ? entry.id : '';
    sourceLink(entry);
    fit();
    if (!scene.objects.length) {
      $('font-size').value = String(Math.max(24, Math.min(160, Math.round(16 / view.scale))));
      $('stroke-width').value = String(Math.max(2, Math.min(24, Math.round(2 / view.scale))));
      $('stroke-value').value = $('stroke-width').value;
    }
    resetHistory(); updateProperties(); controls(); requestRender(); revision++;
    if (restored) persistedRevision = revision;
    else queueAutosave();
  }
  async function chooseMap(entry) {
    if (!entry || busy) return;
    if (!mayReplace()) { syncMapSelect(); return; }
    const generation = ++mapGeneration;
    setBusy(true, 'Loading ' + entry.name + '…');
    try {
      const loaded = await loadMapEntry(entry);
      if (generation !== mapGeneration) return;
      setScene({ map: loaded.map, title: entry.name + ' strategy', objects: [] }, loaded.image, entry);
      announce(entry.name + ' is ready. Choose a tool to start planning.', false, true);
    } catch (error) { announce(error.message, true); syncMapSelect(); }
    finally { if (generation === mapGeneration) setBusy(false); }
  }
  function syncMapSelect() {
    const found = scene.map && maps.find(entry => entry.name === scene.map.name);
    $('map-select').value = found ? found.id : '';
  }
  function fileDataURL(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('The file could not be read.')); reader.readAsDataURL(file); });
  }
  async function uploadMap(file) {
    if (!file || busy) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !/\.(png|jpe?g|webp)$/i.test(file.name)) { announce('Choose a PNG, JPEG or WebP map image.', true); return; }
    if (file.size > C.LIMITS.imageBytes) { announce('Map uploads must be 16 MB or smaller.', true); return; }
    if (!mayReplace()) return;
    setBusy(true, 'Opening your map…');
    try {
      const src = await fileDataURL(file), image = await imageFromSource(src);
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 180);
      setScene({ map: { name, src, width: image.naturalWidth, height: image.naturalHeight }, title: name.slice(0, 91) + ' strategy', objects: [] }, image, null);
      announce('Your map is ready. Draw a route or place a marker.', false, true);
    } catch (error) { announce(error.message, true); }
    finally { setBusy(false); }
  }
  async function importStrategy(file) {
    if (!file || busy) return;
    if (file.size > C.LIMITS.fileBytes) { announce('Strategy files must be 24 MB or smaller.', true); return; }
    setBusy(true, 'Checking strategy…');
    try {
      let parsed;
      try { parsed = JSON.parse(await file.text()); } catch (_) { throw new Error('This file is not valid JSON. Choose an SCP strategy file.'); }
      const next = C.validateStrategy(parsed, document.baseURI), image = await imageFromSource(next.map.src);
      if (next.map.width !== image.naturalWidth || next.map.height !== image.naturalHeight) throw new Error('The saved map dimensions do not match its image.');
      if (!mayReplace()) return;
      const entry = maps.find(item => item.name === next.map.name);
      setScene(next, image, entry);
      announce('Strategy opened. All annotations are editable.', false, true);
    } catch (error) { announce(error.message, true); }
    finally { setBusy(false); }
  }
  function filename(extension) { return (scene.title.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '').slice(0, 80) || 'scp-strategy') + extension; }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function saveStrategy() {
    if (!scene.map || busy) return;
    finishGesture(); setBusy(true, 'Preparing editable strategy…');
    try {
      const output = C.clone(scene);
      if (!output.map.src.startsWith('data:')) {
        const response = await fetch(output.map.src, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('The map could not be included in this file. Please try again.');
        const blob = await response.blob();
        if (blob.size > C.LIMITS.imageBytes) throw new Error('The map is too large to include in a strategy file.');
        output.map.src = await fileDataURL(blob);
      }
      C.validateStrategy(output, document.baseURI);
      const blob = new Blob([JSON.stringify(output)], { type: 'application/json' });
      if (blob.size > C.LIMITS.fileBytes) throw new Error('This strategy exceeds the 24 MB file limit. Use a smaller map image.');
      download(blob, filename('.scp-strategy.json'));
      announce('Editable strategy downloaded with its map.', false, true);
    } catch (error) { announce(error.message, true); }
    finally { setBusy(false); }
  }
  async function exportPNG() {
    if (!scene.map || busy) return;
    finishGesture(); setBusy(true, 'Rendering full-resolution PNG…');
    try {
      if (document.fonts) await document.fonts.ready;
      const output = document.createElement('canvas'); output.width = scene.map.width; output.height = scene.map.height;
      const target = output.getContext('2d');
      if (!target) throw new Error('This device could not export this map. Try a smaller map.');
      drawScene(target);
      const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG export failed. Try a smaller map or another browser.');
      download(blob, filename('.png'));
      announce('PNG downloaded at ' + scene.map.width + ' × ' + scene.map.height + ' pixels.', false, true);
      output.width = output.height = 1;
    } catch (error) { announce(error.message, true); }
    finally { setBusy(false); }
  }

  function objectBounds(item) {
    if (item.type === 'path') {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of item.points) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    if (item.type === 'text') {
      ctx.font = item.size + 'px SCP, Arial, sans-serif';
      const lines = item.text.split('\n');
      return { x: item.x, y: item.y, width: Math.max(1, ...lines.map(line => ctx.measureText(line).width)), height: lines.length * item.size * 1.25 };
    }
    if (item.type === 'marker') {
      ctx.font = '700 ' + Math.max(12, item.size * .5) + 'px SCP, Arial, sans-serif';
      return { x: item.x - item.size * .65, y: item.y - item.size * .65, width: item.size * 1.55 + ctx.measureText(item.text).width + 16, height: item.size * 1.3 };
    }
    return { x: Math.min(item.x, item.x2), y: Math.min(item.y, item.y2), width: Math.abs(item.x2 - item.x), height: Math.abs(item.y2 - item.y) };
  }
  function drawObject(target, item) {
    target.save(); target.strokeStyle = item.color; target.fillStyle = item.color; target.lineWidth = item.width; target.lineCap = 'round'; target.lineJoin = 'round';
    if (item.type === 'path') {
      target.beginPath(); target.moveTo(item.points[0][0], item.points[0][1]);
      for (let i = 1; i < item.points.length; i++) target.lineTo(item.points[i][0], item.points[i][1]);
      if (item.points.length === 1) { target.arc(item.points[0][0], item.points[0][1], item.width / 2, 0, Math.PI * 2); target.fill(); } else target.stroke();
    } else if (item.type === 'line' || item.type === 'arrow') {
      target.beginPath(); target.moveTo(item.x, item.y); target.lineTo(item.x2, item.y2); target.stroke();
      if (item.type === 'arrow') {
        const angle = Math.atan2(item.y2 - item.y, item.x2 - item.x), head = Math.max(14, item.width * 3.4);
        target.beginPath(); target.moveTo(item.x2, item.y2); target.lineTo(item.x2 - head * Math.cos(angle - .48), item.y2 - head * Math.sin(angle - .48)); target.lineTo(item.x2 - head * Math.cos(angle + .48), item.y2 - head * Math.sin(angle + .48)); target.closePath(); target.fill();
      }
    } else if (item.type === 'rect') {
      target.strokeRect(item.x, item.y, item.x2 - item.x, item.y2 - item.y);
    } else if (item.type === 'ellipse') {
      target.beginPath(); target.ellipse((item.x + item.x2) / 2, (item.y + item.y2) / 2, Math.max(.1, Math.abs(item.x2 - item.x) / 2), Math.max(.1, Math.abs(item.y2 - item.y) / 2), 0, 0, 2 * Math.PI); target.stroke();
    } else if (item.type === 'text') {
      target.font = item.size + 'px SCP, Arial, sans-serif'; target.textBaseline = 'top'; target.shadowColor = '#000'; target.shadowBlur = 3;
      item.text.split('\n').forEach((line, index) => target.fillText(line, item.x, item.y + index * item.size * 1.25));
    } else if (item.type === 'marker') {
      const radius = item.size * .55, labelSize = Math.max(12, item.size * .5);
      target.font = '700 ' + labelSize + 'px SCP, Arial, sans-serif'; target.textBaseline = 'middle';
      const labelX = item.x + item.size * .8, labelWidth = target.measureText(item.text).width;
      target.fillStyle = '#071a19eb'; target.fillRect(labelX - 7, item.y - labelSize * .85, labelWidth + 14, labelSize * 1.7);
      target.fillStyle = item.color; target.lineWidth = Math.max(2, item.width * .5);
      target.beginPath();
      if (item.kind === 'objective') { target.moveTo(item.x, item.y - radius); target.lineTo(item.x + radius, item.y); target.lineTo(item.x, item.y + radius); target.lineTo(item.x - radius, item.y); target.closePath(); }
      else target.rect(item.x - radius, item.y - radius, radius * 2, radius * 2);
      target.fill(); target.strokeStyle = '#09291f'; target.stroke();
      target.strokeStyle = '#09291f'; target.lineWidth = Math.max(2, item.size * .06);
      if (item.kind === 'objective') { target.beginPath(); target.arc(item.x, item.y, radius * .35, 0, Math.PI * 2); target.stroke(); }
      else { target.beginPath(); target.moveTo(item.x - radius * .45, item.y + radius * .15); target.lineTo(item.x, item.y - radius * .3); target.lineTo(item.x + radius * .45, item.y + radius * .15); target.stroke(); }
      target.fillStyle = item.color; target.fillText(item.text, labelX, item.y);
    }
    target.restore();
  }
  function drawScene(target) {
    target.save();
    target.beginPath(); target.rect(0, 0, scene.map.width, scene.map.height); target.clip();
    target.drawImage(background, 0, 0, scene.map.width, scene.map.height);
    for (const item of scene.objects) drawObject(target, item);
    target.restore();
  }
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!scene.map || !background) return;
    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.x, dpr * view.y);
    ctx.save(); ctx.shadowColor = '#0009'; ctx.shadowBlur = 22 / view.scale; ctx.fillStyle = '#102021'; ctx.fillRect(0, 0, scene.map.width, scene.map.height); ctx.restore();
    drawScene(ctx);
    if (preview) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, scene.map.width, scene.map.height); ctx.clip(); drawObject(ctx, preview); ctx.restore(); }
    const item = selected();
    if (item && tool === 'select') {
      const box = objectBounds(item), pad = 6 / view.scale + item.width / 2;
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / view.scale; ctx.setLineDash([5 / view.scale, 4 / view.scale]); ctx.strokeRect(box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2); ctx.restore();
    }
  }
  function resize() {
    if (!stage.clientWidth || !stage.clientHeight) return;
    const oldWidth = cssWidth, oldHeight = cssHeight;
    cssWidth = Math.max(1, stage.clientWidth); cssHeight = Math.max(1, stage.clientHeight); dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssWidth * dpr); canvas.height = Math.round(cssHeight * dpr);
    if (scene.map) { view.x += (cssWidth - oldWidth) / 2; view.y += (cssHeight - oldHeight) / 2; }
    requestRender();
  }
  function fit() {
    if (!scene.map) return;
    const padding = Math.min(36, Math.min(cssWidth, cssHeight) * .08);
    const validFocus = focusBounds && [focusBounds.x, focusBounds.y, focusBounds.width, focusBounds.height].every(Number.isFinite)
      && focusBounds.x >= 0 && focusBounds.y >= 0 && focusBounds.width > 0 && focusBounds.height > 0
      && focusBounds.x + focusBounds.width <= scene.map.width && focusBounds.y + focusBounds.height <= scene.map.height;
    const bounds = validFocus ? focusBounds : { x: 0, y: 0, width: scene.map.width, height: scene.map.height };
    view.scale = Math.max(.01, Math.min((cssWidth - padding * 2) / bounds.width, (cssHeight - padding * 2) / bounds.height));
    view.x = (cssWidth - bounds.width * view.scale) / 2 - bounds.x * view.scale;
    view.y = (cssHeight - bounds.height * view.scale) / 2 - bounds.y * view.scale;
    controls(); requestRender();
  }
  function zoomAt(factor, point) {
    if (!scene.map || busy) return;
    const oldScale = view.scale, nextScale = clampScale(oldScale * factor);
    view.x = point.x - (point.x - view.x) * nextScale / oldScale; view.y = point.y - (point.y - view.y) * nextScale / oldScale; view.scale = nextScale;
    controls(); requestRender();
  }
  function clampScale(scale) { const fitScale = scene.map ? Math.min(cssWidth / scene.map.width, cssHeight / scene.map.height) : 1; return Math.min(12, Math.max(Math.min(.03, fitScale * .35), scale)); }
  function screenPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  function worldPoint(point, clamp = false) {
    let x = (point.x - view.x) / view.scale, y = (point.y - view.y) / view.scale;
    if (clamp && scene.map) { x = Math.max(0, Math.min(scene.map.width, x)); y = Math.max(0, Math.min(scene.map.height, y)); }
    return { x, y };
  }
  function insideMap(p) { return scene.map && p.x >= 0 && p.y >= 0 && p.x <= scene.map.width && p.y <= scene.map.height; }
  function hitTest(p, erasing = false) {
    const tolerance = (erasing ? 10 : 7) / view.scale;
    for (let i = scene.objects.length - 1; i >= 0; i--) {
      const item = scene.objects[i], edge = tolerance + item.width / 2;
      if (item.type === 'path') {
        if (item.points.length === 1 && Math.hypot(p.x - item.points[0][0], p.y - item.points[0][1]) <= edge) return item;
        for (let j = 1; j < item.points.length; j++) if (C.segmentDistance(p, item.points[j - 1], item.points[j]) <= edge) return item;
      } else if (item.type === 'line' || item.type === 'arrow') {
        if (C.segmentDistance(p, [item.x, item.y], [item.x2, item.y2]) <= edge || (item.type === 'arrow' && Math.hypot(p.x - item.x2, p.y - item.y2) < Math.max(14, item.width * 3.4))) return item;
      } else {
        const box = objectBounds(item);
        if (p.x < box.x - edge || p.y < box.y - edge || p.x > box.x + box.width + edge || p.y > box.y + box.height + edge) continue;
        if (erasing && item.type === 'rect') {
          if (Math.min(Math.abs(p.x - box.x), Math.abs(p.x - box.x - box.width), Math.abs(p.y - box.y), Math.abs(p.y - box.y - box.height)) > edge) continue;
        }
        if (item.type === 'ellipse') {
          const rx = Math.max(.1, box.width / 2), ry = Math.max(.1, box.height / 2), normalized = Math.hypot((p.x - box.x - rx) / rx, (p.y - box.y - ry) / ry);
          if (normalized > 1 + edge / Math.min(rx, ry) || (erasing && normalized < 1 - edge / Math.min(rx, ry))) continue;
        }
        return item;
      }
    }
    return null;
  }

  function setTool(next) {
    finishGesture(); tool = next;
    if (tool !== 'select') selectedId = null;
    for (const button of toolButtons) { const active = button.dataset.tool === tool; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }
    canvas.style.cursor = tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair';
    updateProperties(); controls(); showToolHint(); requestRender();
  }
  function updateProperties() {
    const item = selected(), activeType = item ? item.type : tool;
    $('text-options').hidden = activeType !== 'text';
    $('marker-options').hidden = activeType !== 'marker';
    $('font-options').hidden = !['text', 'marker'].includes(activeType);
    if (item) {
      $('color').value = item.color; $('stroke-width').value = Math.min(24, item.width); $('stroke-value').value = item.width;
      if (item.type === 'text') $('annotation-text').value = item.text;
      if (item.type === 'marker') { $('marker-label').value = item.text; $('marker-kind').value = item.kind; }
      if (item.size) $('font-size').value = item.size;
    }
  }
  function styleChanged(commitChange = true) {
    const item = selected(), size = Math.max(12, Math.min(160, Number($('font-size').value) || 32));
    $('stroke-value').value = $('stroke-width').value;
    if (item) {
      item.color = $('color').value; item.width = Number($('stroke-width').value);
      if (item.type === 'text') { item.text = $('annotation-text').value; item.size = size; }
      if (item.type === 'marker') { item.text = $('marker-label').value; item.size = size; item.kind = $('marker-kind').value; }
      if (commitChange) commit();
      requestRender();
    }
  }
  function makeObject(type, p) {
    const item = { id: uid(), type: type === 'pen' ? 'path' : type, color: $('color').value, width: Number($('stroke-width').value) };
    if (type === 'pen') item.points = [[p.x, p.y]];
    else { item.x = p.x; item.y = p.y; if (['line', 'arrow', 'rect', 'ellipse'].includes(type)) { item.x2 = p.x; item.y2 = p.y; } }
    if (type === 'text' || type === 'marker') {
      item.size = Math.max(12, Math.min(160, Number($('font-size').value) || 32));
      item.text = (type === 'text' ? $('annotation-text').value : $('marker-label').value).trim();
      if (type === 'marker') item.kind = $('marker-kind').value;
    }
    return item;
  }
  function hasCapacity() {
    if (scene.objects.length >= C.LIMITS.objects) { announce('This strategy has reached 3,000 annotations. Remove some before adding more.', true); return false; }
    return true;
  }
  function eraseAt(p) { const item = hitTest(p, true); if (item) { scene.objects = scene.objects.filter(entry => entry.id !== item.id); if (selectedId === item.id) selectedId = null; requestRender(); } }
  function cancelGesture() {
    if (gesture && gesture.before) { const state = JSON.parse(gesture.before); scene.objects = state.objects; }
    gesture = null; preview = null; requestRender(); controls();
  }
  function finishGesture() {
    if (!gesture) return;
    if (gesture.kind === 'draw' && preview) {
      if (preview.type === 'path' || !('x2' in preview) || Math.hypot(preview.x2 - preview.x, preview.y2 - preview.y) * view.scale >= 2) scene.objects.push(preview);
    }
    if (['draw', 'move', 'erase'].includes(gesture.kind)) commit();
    gesture = null; preview = null; controls(); requestRender();
  }
  function startPinch() {
    cancelGesture();
    const list = Array.from(pointers.values()).slice(0, 2), midpoint = { x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 };
    gesture = { kind: 'pinch', distance: Math.max(1, Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y)), scale: view.scale, anchor: worldPoint(midpoint) };
  }
  canvas.addEventListener('pointerdown', event => {
    if (busy || !scene.map || (event.button !== 0 && event.button !== 1 && event.button !== 2)) return;
    if (event.pointerType === 'touch' && Array.from(pointers.values()).some(p => p.type === 'pen')) return;
    if (event.pointerType === 'pen' && Array.from(pointers.values()).some(p => p.type === 'touch')) {
      cancelGesture();
      for (const [id, point] of pointers) {
        if (point.type !== 'touch') continue;
        pointers.delete(id);
        if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      }
    }
    event.preventDefault(); canvas.focus({ preventScroll: true });
    const screen = screenPoint(event); pointers.set(event.pointerId, { ...screen, type: event.pointerType });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size > 1) { startPinch(); return; }
    if (tool === 'pan' || spaceDown || event.button === 1 || event.button === 2) { gesture = { kind: 'pan', id: event.pointerId, screen }; canvas.style.cursor = 'grabbing'; return; }
    const p = worldPoint(screen);
    if (!insideMap(p)) { selectedId = null; controls(); requestRender(); return; }
    if (tool === 'select') {
      const item = hitTest(p); selectedId = item ? item.id : null;
      if (item) gesture = { kind: 'move', id: event.pointerId, start: p, original: C.clone(item), before: snapshot() };
      updateProperties(); controls(); requestRender(); return;
    }
    if (tool === 'eraser') { gesture = { kind: 'erase', id: event.pointerId, before: snapshot() }; eraseAt(p); return; }
    if (!hasCapacity()) return;
    if (tool === 'pen' && scene.objects.reduce((sum, item) => sum + (item.points ? item.points.length : 0), 0) >= C.LIMITS.points) { announce('Drawing point limit reached. Remove a few strokes to continue.', true); return; }
    preview = makeObject(tool, p);
    if ((tool === 'text' || tool === 'marker') && !preview.text) { preview = null; announce('Enter a label in the toolbar before placing it.', true); return; }
    gesture = { kind: 'draw', id: event.pointerId, existingPoints: scene.objects.reduce((sum, item) => sum + (item.points ? item.points.length : 0), 0) };
    requestRender();
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const screen = screenPoint(event); pointers.set(event.pointerId, { ...screen, type: event.pointerType });
    if (!gesture) return;
    event.preventDefault();
    if (gesture.kind === 'pinch') {
      if (pointers.size < 2) return;
      const list = Array.from(pointers.values()).slice(0, 2), midpoint = { x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 };
      const distance = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
      view.scale = clampScale(gesture.scale * distance / gesture.distance); view.x = midpoint.x - gesture.anchor.x * view.scale; view.y = midpoint.y - gesture.anchor.y * view.scale; controls(); requestRender(); return;
    }
    if (gesture.id !== event.pointerId) return;
    if (gesture.kind === 'pan') { view.x += screen.x - gesture.screen.x; view.y += screen.y - gesture.screen.y; gesture.screen = screen; requestRender(); return; }
    const p = worldPoint(screen, true);
    if (gesture.kind === 'move') {
      const item = selected(); if (!item) return;
      const moved = C.clone(gesture.original), bounds = objectBounds(gesture.original);
      const dx = Math.max(-bounds.x, Math.min(scene.map.width - bounds.x - bounds.width, p.x - gesture.start.x));
      const dy = Math.max(-bounds.y, Math.min(scene.map.height - bounds.y - bounds.height, p.y - gesture.start.y));
      C.translate(moved, dx, dy); Object.assign(item, moved); requestRender();
    } else if (gesture.kind === 'erase') eraseAt(p);
    else if (gesture.kind === 'draw' && preview) {
      if (preview.type === 'path') {
        const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
        for (const sample of events.length ? events : [event]) {
          const point = worldPoint(screenPoint(sample), true), last = preview.points[preview.points.length - 1];
          if (Math.hypot(point.x - last[0], point.y - last[1]) * view.scale >= 1.2 && preview.points.length + gesture.existingPoints < C.LIMITS.points) preview.points.push([point.x, point.y]);
        }
      } else if ('x2' in preview) { preview.x2 = p.x; preview.y2 = p.y; }
      else { preview.x = p.x; preview.y = p.y; }
      requestRender();
    }
  });
  function pointerEnd(event, cancelled) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (gesture && gesture.kind === 'pinch') {
      if (pointers.size === 1) { const [id, point] = pointers.entries().next().value; gesture = { kind: 'pan', id, screen: point }; }
      else if (!pointers.size) gesture = null;
    } else if (gesture && gesture.id === event.pointerId) { if (cancelled) cancelGesture(); else finishGesture(); }
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!pointers.size) canvas.style.cursor = tool === 'pan' || spaceDown ? 'grab' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair';
  }
  canvas.addEventListener('pointerup', event => pointerEnd(event, false));
  canvas.addEventListener('pointercancel', event => pointerEnd(event, true));
  canvas.addEventListener('lostpointercapture', event => pointerEnd(event, true));
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('wheel', event => { if (!scene.map || busy) return; event.preventDefault(); zoomAt(Math.exp(-Math.max(-200, Math.min(200, event.deltaY)) * .002), screenPoint(event)); }, { passive: false });

  toolButtons.forEach(button => button.addEventListener('click', () => setTool(button.dataset.tool)));
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => { $('color').value = button.dataset.color; styleChanged(); }));
  for (const id of ['color', 'stroke-width', 'font-size', 'annotation-text', 'marker-label', 'marker-kind']) {
    $(id).addEventListener('input', () => styleChanged(false));
    $(id).addEventListener('change', () => styleChanged(true));
  }
  $('strategy-title').addEventListener('input', () => { scene.title = $('strategy-title').value; if (scene.map) commit(); });
  $('undo').addEventListener('click', () => stepHistory(-1)); $('redo').addEventListener('click', () => stepHistory(1));
  function deleteSelected() { if (!selected() || busy) return; scene.objects = scene.objects.filter(item => item.id !== selectedId); selectedId = null; commit(); updateProperties(); }
  $('delete-selected').addEventListener('click', deleteSelected);
  $('clear').addEventListener('click', () => { if (scene.objects.length && window.confirm('Clear all annotations from this map? You can undo this action.')) { scene.objects = []; selectedId = null; commit(); updateProperties(); announce('Annotations cleared. Undo will restore them.', false, true); } });
  $('fit').addEventListener('click', fit);
  $('zoom-in').addEventListener('click', () => zoomAt(1.25, { x: cssWidth / 2, y: cssHeight / 2 }));
  $('zoom-out').addEventListener('click', () => zoomAt(.8, { x: cssWidth / 2, y: cssHeight / 2 }));
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('editor').requestFullscreen) await $('editor').requestFullscreen(); else throw new Error('Fullscreen is unavailable in this browser.'); }
    catch (_) { announce('Fullscreen is unavailable here. You can open the editor in a separate browser tab.', true, true); }
  });
  $('map-select').addEventListener('change', () => { const entry = maps.find(item => item.id === $('map-select').value); if (entry) chooseMap(entry); });
  $('upload-map').addEventListener('click', () => $('map-file').click()); $('empty-upload').addEventListener('click', () => $('map-file').click());
  $('map-file').addEventListener('change', event => { const file = event.target.files[0]; event.target.value = ''; uploadMap(file); });
  $('open-strategy').addEventListener('click', () => $('strategy-file').click());
  $('strategy-file').addEventListener('change', event => { const file = event.target.files[0]; event.target.value = ''; importStrategy(file); });
  $('save-strategy').addEventListener('click', saveStrategy); $('export-png').addEventListener('click', exportPNG);
  $('help').addEventListener('click', () => $('help-dialog').showModal()); $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
  document.addEventListener('keydown', event => {
    if (event.target.closest('input,select,textarea') || $('help-dialog').open) return;
    if (event.code === 'Space') { event.preventDefault(); spaceDown = true; canvas.style.cursor = 'grab'; return; }
    if (busy) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); stepHistory(event.shiftKey ? 1 : -1); return; }
    if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); stepHistory(1); return; }
    if ((event.ctrlKey || event.metaKey) && key === 's') { event.preventDefault(); saveStrategy(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (key === 'escape') { cancelGesture(); selectedId = null; updateProperties(); controls(); requestRender(); return; }
    if (key === 'delete' || key === 'backspace') { if (selected()) { event.preventDefault(); deleteSelected(); } return; }
    if (key === 'f') { fit(); return; }
    const shortcuts = { v: 'select', p: 'pen', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', t: 'text', m: 'marker', e: 'eraser', h: 'pan' };
    if (shortcuts[key]) setTool(shortcuts[key]);
  });
  document.addEventListener('keyup', event => { if (event.code === 'Space') { spaceDown = false; canvas.style.cursor = tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair'; } });
  window.addEventListener('blur', () => { spaceDown = false; cancelGesture(); pointers.clear(); });
  window.addEventListener('pagehide', () => { finishGesture(); saveDraft(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { finishGesture(); saveDraft(); } });
  window.addEventListener('beforeunload', event => { if (deviceSaveFailed && scene.map) { event.preventDefault(); event.returnValue = ''; } });
  new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);
  if (document.fonts) document.fonts.ready.then(requestRender);

  async function initialize() {
    resize(); controls(); setBusy(true, 'Opening mapping editor…');
    const results = await Promise.allSettled([
      fetch('./maps.json', { cache: 'no-cache' }).then(response => { if (!response.ok) throw new Error('Map library is unavailable.'); return response.json(); }),
      readDraft()
    ]);
    if (results[0].status === 'fulfilled') {
      const data = results[0].value;
      maps = data && Array.isArray(data.maps) ? data.maps.filter(entry => entry && typeof entry.id === 'string' && typeof entry.name === 'string' && (entry.src || entry.tiles || entry.tileSet)).slice(0, 100) : [];
      for (const entry of maps) { const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.name + (entry.mode ? ' · ' + entry.mode : ''); $('map-select').appendChild(option); }
    }
    let restored = false;
    if (results[1].status === 'fulfilled' && results[1].value) {
      try {
        const next = C.validateStrategy(results[1].value, document.baseURI), image = await imageFromSource(next.map.src);
        if (image.naturalWidth !== next.map.width || image.naturalHeight !== next.map.height) throw new Error('Saved map dimensions no longer match.');
        setScene(next, image, maps.find(entry => entry.name === next.map.name), true); restored = true;
        saveStatus('Draft restored from this device'); announce('Your last strategy is ready to continue.', false, true);
      } catch (_) { announce('Your saved draft could not be opened. It has been kept in browser storage. Open a downloaded strategy or choose a map.', true); saveStatus('Previous draft could not be opened', true); }
    } else if (results[1].status === 'rejected') { deviceSaveFailed = true; saveStatus('Device storage unavailable · save a copy', true); }
    setBusy(false);
    if (!restored && !results[1].value) {
      if (maps.length) announce('Choose a battlefield above or upload your own map.');
      else announce('Upload a map image to start. The map library is currently unavailable.');
    }
  }
  initialize().catch(error => { setBusy(false); announce('The editor could not finish loading: ' + error.message, true); });
})();
