import { mkdir, copyFile, cp, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
execFileSync(process.execPath, ['scripts/check.mjs'], { stdio: 'inherit' });
const output = path.resolve('dist');
await mkdir(output, { recursive: true });
const publicFiles = ['index.html', 'style.css', 'membership.css', 'script.js', 'protocol.js', 'roster-policy.js', 'boot.js', 'team-data.js', 'schedule.js', 'site-config.js', 'supabase-client.js', 'data-runtime.js', 'delta_force_logo.png'];
for (const file of publicFiles) await copyFile(file, path.join(output, file));
await cp('assets', path.join(output, 'assets'), { recursive: true });
await cp('admin', path.join(output, 'admin'), { recursive: true });
try { await stat('og.png'); await copyFile('og.png', path.join(output, 'og.png')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const supabaseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY together.');
if (supabaseUrl && !/^https:\/\/[^/]+/i.test(supabaseUrl)) throw new Error('SUPABASE_URL must be an https:// URL.');
await writeFile(path.join(output, 'site-config.js'), `window.SCP_SUPABASE = Object.freeze(${JSON.stringify({ url: supabaseUrl, publishableKey: supabaseKey })});\n`, 'utf8');
const css = (await Promise.all(['style.css', 'membership.css'].map(file => readFile(file, 'utf8')))).join('');
console.log(`Static build ready: dist/index.html + dist/admin/. Supabase ${supabaseUrl ? 'configured' : 'fallback active'}. No framework runtime or external font/script requests. CSS ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB.`);
