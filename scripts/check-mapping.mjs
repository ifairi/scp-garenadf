import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const html = await readFile('mapping/index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Mapping HTML IDs must be unique');
assert(/<html\b[^>]*lang="en"/.test(html), 'The Mapping workspace must be in English');
for (const [, ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!/^(https?:|data:)/.test(ref)) await access(path.resolve('mapping', ref.split(/[?#]/)[0]));
}
for (const [, ref] of html.matchAll(/<script[^>]*src="([^"]+)"/g)) {
  execFileSync(process.execPath, ['--check', path.resolve('mapping', ref)], { stdio: 'inherit' });
}
const { maps } = JSON.parse(await readFile('mapping/maps.json', 'utf8'));
assert(Array.isArray(maps) && maps.length > 0, 'Mapping needs at least one available map');
assert.equal(new Set(maps.map(map => map.id)).size, maps.length, 'Map IDs must be unique');
for (const map of maps) {
  assert(map.name && map.platform === 'Mobile' && map.width > 0 && map.height > 0, 'Map metadata must identify a Mobile background');
  let sources = map.tiles || [{ src: map.src }];
  if (map.tileSet) {
    const tileFile = path.resolve('mapping', map.tileSet);
    assert(tileFile.startsWith(path.resolve('assets/maps') + path.sep), 'Map package must be bundled in assets/maps');
    sources = JSON.parse(await readFile(tileFile, 'utf8')).tiles;
    assert.equal(sources.length, (map.width / 256) * (map.height / 256), 'Map package must contain the complete tile grid');
    const coordinates = new Set();
    for (const tile of sources) {
      assert(tile.width === 256 && tile.height === 256 && tile.x >= 0 && tile.y >= 0 && tile.x % 256 === 0 && tile.y % 256 === 0 && tile.x + 256 <= map.width && tile.y + 256 <= map.height, 'Map tile coordinates must align to the original grid');
      coordinates.add(`${tile.x},${tile.y}`);
      assert(/^data:image\/jpeg;base64,/.test(tile.src), 'Map package must embed its original JPEG tiles');
    }
    assert.equal(coordinates.size, sources.length, 'Map tiles must not overlap');
  }
  assert(sources.length > 0, `Missing background: ${map.name}`);
  for (const tile of sources) {
    if (map.tileSet) continue;
    const file = path.resolve('mapping', tile.src || '');
    const relative = path.relative(path.resolve('assets/maps'), file);
    assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Map imagery must be bundled in assets/maps');
    await access(file);
  }
}
console.log(`Passed: Mapping scripts and ${maps.length} legacy offline map backgrounds.`);
execFileSync(process.execPath, ['scripts/check-mapping-official.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/check-mapping-core.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/check-mapping-lifecycle.mjs'], { stdio: 'inherit' });
