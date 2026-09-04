import { mkdir, copyFile, cp, readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
execFileSync(process.execPath, ['scripts/check.mjs'], { stdio: 'inherit' });
const output = path.resolve('dist');
await mkdir(output, { recursive: true });
const publicFiles = ['index.html', 'style.css', 'script.js', 'protocol.js', 'boot.js', 'team-data.js', 'schedule.js', 'delta_force_logo.png'];
for (const file of publicFiles) await copyFile(file, path.join(output, file));
await cp('assets', path.join(output, 'assets'), { recursive: true });
try { await stat('og.png'); await copyFile('og.png', path.join(output, 'og.png')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const css = await readFile('style.css', 'utf8');
console.log(`Static build ready: dist/index.html. No framework runtime, installation, or external font/script requests. CSS ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB.`);
