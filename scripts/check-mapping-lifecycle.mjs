import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const core = createRequire(import.meta.url)('../mapping/core.js');
const source = readFileSync(new URL('../mapping/editor.js', import.meta.url), 'utf8');
const entryPoint = /  initialize\(\)\.catch\([^\r\n]+/;
assert(entryPoint.test(source), 'Editor initialization must be located before running tests');
const instrumented = source.replace(entryPoint, `  globalThis.editor = {
    scene, pointers, setScene, saveDraft, commit, setTool, cancelGesture, resize,
    get gesture() { return gesture; },
    screen(x, y) { return { clientX: view.x + x * view.scale, clientY: view.y + y * view.scale }; }
  };`);
const copy = value => JSON.parse(JSON.stringify(value));
const strategy = () => ({ version: 1, title: 'Test strategy',
  map: { name: 'Test map', src: 'data:image/png;base64,AAAA', width: 1000, height: 1000 },
  objects: [{ id: 'route', type: 'line', color: '#62f4b5', width: 4, x: 100, y: 100, x2: 200, y2: 100 }]
});

function storage() {
  const state = { current: null, writes: 0, attempts: 0, failNext: false };
  state.db = { transaction() {
    const transaction = { objectStore: () => ({ put(value, key) {
      assert.equal(key, 'current');
      state.attempts++;
      const fail = state.failNext;
      state.failNext = false;
      queueMicrotask(() => {
        if (fail) { transaction.error = new Error('Storage full'); transaction.onerror(); }
        else { state.current = copy(value); state.writes++; transaction.oncomplete(); }
      });
    } }) };
    return transaction;
  } };
  return state;
}

function editor(shared = storage()) {
  const elements = new Map(), handlers = new Map(), captures = new Set();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', style: {}, dataset: {}, clientWidth: 1000, clientHeight: 800,
      classList: { toggle() {} }, setAttribute() {}, removeAttribute() {}, focus() {},
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      getContext: () => ({ measureText: text => ({ width: text.length * 10 }) }),
      setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id),
      releasePointerCapture: id => captures.delete(id),
      addEventListener: (type, callback) => handlers.set(id + ':' + type, callback)
    });
    return elements.get(id);
  }
  element('color').value = '#62f4b5';
  element('stroke-width').value = '4';
  element('font-size').value = '32';
  const context = vm.createContext({
    MappingCore: core, crypto: { randomUUID: () => 'new-route' },
    document: { baseURI: 'https://scp.example/mapping/index.html',
      getElementById: element, querySelectorAll: () => [],
      addEventListener: (type, callback) => handlers.set('document:' + type, callback) },
    indexedDB: { open() {
      const request = { result: shared.db };
      queueMicrotask(() => request.onsuccess());
      return request;
    } },
    addEventListener: (type, callback) => handlers.set('window:' + type, callback),
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: () => 1,
    ResizeObserver: class { observe() {} }, devicePixelRatio: 1
  });
  context.window = context;
  vm.runInContext(instrumented, context, { filename: 'mapping/editor.js' });
  const api = context.editor;
  api.resize();
  api.setScene(strategy(), {}, null, true);
  function pointer(type, id, pointerType, x, y) {
    handlers.get('canvas:' + type)({ ...api.screen(x, y), pointerId: id, pointerType,
      button: 0, preventDefault() {} });
  }
  return { api, pointer, captures, shared,
    hide: () => { context.document.hidden = true; handlers.get('document:visibilitychange')(); },
    close: () => handlers.get('window:pagehide')()
  };
}

const failures = [];
let passed = 0;
async function check(name, action) {
  try { await action(); passed++; }
  catch (error) { failures.push(`${name}: ${error.stack}`); }
}

await check('unchanged restored tabs never overwrite a newer draft when hidden or closed', async () => {
  const shared = storage(), oldTab = editor(shared), newTab = editor(shared);
  newTab.api.scene.title = 'Newer annotations';
  newTab.api.scene.objects.push({ ...copy(newTab.api.scene.objects[0]), id: 'second-route' });
  newTab.api.commit();
  await newTab.api.saveDraft();
  oldTab.hide(); oldTab.close();
  await oldTab.api.saveDraft();
  assert.equal(shared.writes, 1);
  assert.equal(shared.current.title, 'Newer annotations');
  assert.equal(shared.current.objects.length, 2);
});

await check('concurrent flushes write a revision only once', async () => {
  const { api, shared } = editor();
  api.scene.title = 'Changed'; api.commit();
  await Promise.all([api.saveDraft(), api.saveDraft(), api.saveDraft()]);
  assert.equal(shared.writes, 1);
});

await check('failed writes remain dirty and retry successfully', async () => {
  const { api, shared } = editor();
  api.scene.title = 'Retry me'; api.commit(); shared.failNext = true;
  await api.saveDraft();
  assert.equal(shared.writes, 0);
  await api.saveDraft();
  assert.equal(shared.attempts, 2);
  assert.equal(shared.current.title, 'Retry me');
});

await check('autosave excludes an unfinished move that is subsequently cancelled', async () => {
  const { api, pointer, shared } = editor();
  api.scene.title = 'Committed'; api.commit(); api.setTool('select');
  pointer('pointerdown', 1, 'touch', 150, 100);
  pointer('pointermove', 1, 'touch', 250, 200);
  assert.equal(api.scene.objects[0].x, 200, 'The real pointer handler must move the annotation');
  await api.saveDraft();
  assert.equal(shared.current.objects[0].x, 100);
  api.cancelGesture();
  assert.equal(api.scene.objects[0].x, 100);
});

await check('a pen arriving after palm contact draws and releases the touch capture', async () => {
  const { api, pointer, captures } = editor();
  pointer('pointerdown', 1, 'touch', 400, 400);
  pointer('pointerdown', 2, 'pen', 500, 500);
  assert.equal(api.gesture.kind, 'draw');
  assert.equal(api.gesture.id, 2);
  assert.equal(api.pointers.size, 1);
  assert.equal(captures.has(1), false);
  pointer('pointermove', 1, 'touch', 410, 410);
  pointer('pointermove', 2, 'pen', 550, 550);
  pointer('pointerup', 2, 'pen', 550, 550);
  assert.equal(api.scene.objects.length, 2);
  assert.equal(api.scene.objects[1].type, 'path');
  assert.equal(api.scene.objects[1].points.length, 2);
});

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exitCode = 1;
} else console.log(`Mapping lifecycle: ${passed} checks passed.`);
