import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../mapping/core.js');
const base = 'https://scp.example/mapping/index.html';
const image = 'data:image/png;base64,iVBORw0KGgo=';
const failures = [];
let passed = 0;
function check(name, action) {
  try { action(); passed++; }
  catch (error) { failures.push(`${name}: ${error.message}`); }
}
const annotation = (type, extra = {}) => ({ id: type, type, color: '#A4efC7', width: 4, ...extra });
const shapes = [
  annotation('path', { points: [[-65536, -65536], [-7.5, 0], [16384, 2048], [65536, 65536]] }),
  annotation('line', { x: -12, y: 20, x2: 0, y2: 10 }),
  annotation('arrow', { x: 4096, y: 2048, x2: -2.5, y2: -3.5 }),
  annotation('rect', { x: 110, y: 90, x2: -10, y2: -20 }),
  annotation('ellipse', { x: -30, y: 80, x2: -30, y2: -20 }),
  annotation('text', { x: 4096, y: 2048, text: '<img onerror=alert(1)> & flank →', size: 24 }),
  annotation('marker', { x: 0, y: 0, text: 'A-1', size: 32, kind: 'squad' })
];
const scene = (objects = []) => ({ version: 1, title: 'Operation north', map: { name: 'Test map', src: image, width: 4096, height: 2048 }, objects });
const valid = input => core.validateStrategy(input, base);
const rejected = input => assert.throws(() => valid(input));

check('limits are positive finite resource budgets', () => {
  for (const key of ['fileBytes', 'imageBytes', 'dimension', 'pixels', 'objects', 'points']) {
    assert(Number.isSafeInteger(core.LIMITS[key]) && core.LIMITS[key] > 0, key);
  }
  assert(core.LIMITS.fileBytes > core.LIMITS.imageBytes);
});

check('all shapes survive JSON export/import with negative and edge coordinates', () => {
  const source = scene(core.clone(shapes));
  const result = valid(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(result, source);
  assert.deepEqual(valid(JSON.parse(JSON.stringify(result))), result);
  const objective = annotation('marker', { x: -3, y: 2050, text: 'B', size: 12, kind: 'objective' });
  assert.deepEqual(valid(scene([objective])).objects[0], objective);
});

check('cloning and validation isolate nested geometry from the original', () => {
  const original = scene(core.clone(shapes));
  const cloned = core.clone(original);
  const validated = valid(original);
  cloned.objects[0].points[0][0] = 999;
  validated.objects[0].points[1][1] = 999;
  cloned.map.name = 'Changed';
  assert.equal(original.objects[0].points[0][0], -65536);
  assert.equal(original.objects[0].points[1][1], 0);
  assert.equal(original.map.name, 'Test map');
});

check('source images resolve relative paths and accept supported data types', () => {
  assert.equal(core.imageSource('../assets/map.webp', base), 'https://scp.example/assets/map.webp');
  assert.equal(core.imageSource('/assets/map.JPG?version=2', base), 'https://scp.example/assets/map.JPG?version=2');
  for (const mime of ['png', 'jpeg', 'webp']) assert.equal(core.imageSource(`data:image/${mime};base64,AAAA`, base), `data:image/${mime};base64,AAAA`);
});

check('image URL validation rejects executable and external sources', () => {
  for (const src of [
    'javascript:alert(1)', ' JAVASCRIPT:alert(1)', 'data:text/html;base64,AAAA',
    'data:image/svg+xml;base64,AAAA', 'data:image/gif;base64,AAAA', 'blob:https://scp.example/123',
    'file:///C:/map.png', 'https://evil.example/map.png', '//evil.example/map.webp',
    'http://scp.example/map.png', 'https://scp.example.evil.example/map.png',
    'https://scp.example@evil.example/map.png', 'https://user:password@scp.example/map.png',
    'https://scp.example:444/map.png', '/map.svg', '/map.html?file=map.png',
    'data:image/png;base64,AAAA<script>', 'data:image/png;base64,AAAA====', '', null, {}
  ]) assert.throws(() => core.imageSource(src, base), undefined, String(src));
});

check('embedded image budget applies to decoded data, including JSON imports', () => {
  const encodedLength = 4 * Math.ceil((core.LIMITS.imageBytes + 1) / 3);
  const tooLarge = 'data:image/png;base64,' + 'A'.repeat(encodedLength);
  assert.throws(() => core.imageSource(tooLarge, base));
  const source = scene();
  source.map.src = tooLarge;
  rejected(source);
});

check('map dimensions accept exact edges and reject invalid sizes', () => {
  core.dimensions(1, 1);
  core.dimensions(core.LIMITS.dimension, 1);
  core.dimensions(8192, 6144);
  for (const pair of [[0, 1], [-1, 1], [1, 0], [1.5, 2], ['12', 12], [NaN, 1], [Infinity, 1], [16385, 1], [8192, 6145], [16384, 16384]]) {
    assert.throws(() => core.dimensions(...pair), undefined, String(pair));
  }
});

check('malformed JSON data is rejected without accepting partial scenes', () => {
  for (const value of [null, false, 42, '', [], {}, { version: 2 }, { version: 1 }, { ...scene(), objects: {} }, { ...scene(), map: null }]) rejected(value);
  for (const item of [null, {}, { ...shapes[1], type: 'script' }, { ...shapes[1], color: 'red' }, { ...shapes[1], color: '#a4efc7;url(x)' }]) rejected(scene([item]));
  for (const width of [0, -1, 101, NaN, Infinity, '4']) rejected(scene([{ ...shapes[1], width }]));
  for (const x of [-65537, 65537, NaN, Infinity, null, '2']) rejected(scene([{ ...shapes[1], x }]));
  for (const points of [[], null, {}, [[1]], [[1, 2, 3]], [null], [[1, '2']]]) rejected(scene([{ ...shapes[0], points }]));
  for (const size of [11, 161, NaN, Infinity, '24']) rejected(scene([{ ...shapes[5], size }]));
  rejected(scene([{ ...shapes[6], kind: 'html' }]));
  rejected(scene([{ ...shapes[5], text: 'x'.repeat(161) }]));
  rejected(scene([{ ...shapes[6], text: 'x'.repeat(25) }]));
  rejected({ ...scene(), title: 'x'.repeat(101) });
  rejected({ ...scene(), map: { ...scene().map, name: 'x'.repeat(181) } });
});

check('import strips unrecognized keys and cannot pollute object prototypes', () => {
  const source = JSON.parse(JSON.stringify(scene([shapes[1]])));
  source.objects[0] = JSON.parse(JSON.stringify(source.objects[0]).slice(0, -1) + ',"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"onclick":"alert(1)"}');
  source.extra = '<script>alert(1)</script>';
  const result = valid(source);
  assert.deepEqual(result, scene([shapes[1]]));
  assert.equal({}.polluted, undefined);
  assert(!Object.hasOwn(result.objects[0], '__proto__'));
  const label = valid(scene([{ ...shapes[5], text: 'A\u0000B\u007f\nC' }])).objects[0].text;
  assert.equal(label, 'AB\nC');
});

check('replacement IDs remain unique when imported IDs occupy fallback names', () => {
  const source = scene(['import-2', 'dup', 'dup', '', 'import-4', 'dup'].map(id => ({ ...shapes[1], id })));
  const result = valid(source);
  assert.equal(new Set(result.objects.map(item => item.id)).size, result.objects.length);
  assert(result.objects.every(item => /^[a-zA-Z0-9_-]{1,80}$/.test(item.id)));
  assert.deepEqual(valid(JSON.parse(JSON.stringify(result))), result);
});

check('object and cumulative path point budgets prevent oversized scenes', () => {
  rejected(scene(Array.from({ length: core.LIMITS.objects + 1 }, () => ({ ...shapes[1] }))));
  const first = Array.from({ length: core.LIMITS.points }, () => [0, 0]);
  assert.equal(valid(scene([{ ...shapes[0], points: first }])).objects[0].points.length, core.LIMITS.points);
  rejected(scene([{ ...shapes[0], points: first }, { ...shapes[0], id: 'overflow', points: [[1, 1]] }]));
});

check('segment distance handles projections, endpoints and zero-length strokes', () => {
  assert.equal(core.segmentDistance({ x: 3, y: 4 }, [0, 0], [0, 0]), 5);
  assert.equal(core.segmentDistance({ x: 5, y: 3 }, [0, 0], [10, 0]), 3);
  assert.equal(core.segmentDistance({ x: -3, y: 4 }, [0, 0], [10, 0]), 5);
  assert.equal(core.segmentDistance({ x: 13, y: 4 }, [0, 0], [10, 0]), 5);
  assert.equal(core.segmentDistance({ x: 4, y: 4 }, [-4, -4], [10, 10]), 0);
  assert(Math.abs(core.segmentDistance({ x: 0, y: 2 }, [0, 0], [2, 2]) - Math.SQRT2) < 1e-12);
});

check('translation preserves all shape data and signed or reversed geometry', () => {
  for (const source of shapes) {
    const item = core.clone(source);
    core.translate(item, 12.5, -4.25);
    if (item.type === 'path') {
      item.points.forEach((point, i) => assert.deepEqual(point, [source.points[i][0] + 12.5, source.points[i][1] - 4.25]));
    } else {
      assert.equal(item.x, source.x + 12.5);
      assert.equal(item.y, source.y - 4.25);
      if ('x2' in source) { assert.equal(item.x2, source.x2 + 12.5); assert.equal(item.y2, source.y2 - 4.25); }
    }
    core.translate(item, -12.5, 4.25);
    assert.deepEqual(item, source);
    assert.deepEqual(valid(scene([item])).objects[0], source);
  }
});

if (failures.length) {
  for (const failure of failures) console.error('FAILED: ' + failure);
  console.error(`${passed} Mapping core checks passed; ${failures.length} failed.`);
  process.exitCode = 1;
} else console.log(`Passed: ${passed} Mapping core checks covering hostile imports, resource budgets, shape round trips and geometry.`);
