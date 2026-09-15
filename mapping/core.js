/* Shared, dependency-free scene validation and geometry. */
(function (root) {
  'use strict';
  const LIMITS = Object.freeze({ fileBytes: 24 * 1024 * 1024, imageBytes: 16 * 1024 * 1024, dimension: 16384, pixels: 48 * 1024 * 1024, objects: 3000, points: 180000 });
  const types = new Set(['path', 'line', 'arrow', 'rect', 'ellipse', 'text', 'marker']);
  const clone = value => JSON.parse(JSON.stringify(value));
  function number(value, min, max, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Invalid ' + label + ' in strategy file.');
    return value;
  }
  function string(value, max, label) {
    if (typeof value !== 'string' || value.length > max) throw new Error('Invalid ' + label + ' in strategy file.');
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }
  function imageSource(value, baseURL) {
    if (typeof value !== 'string' || value.length > 23 * 1024 * 1024) throw new Error('Map image is too large.');
    if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      const payload = value.slice(value.indexOf(',') + 1);
      const bytes = payload.length * 3 / 4 - (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0);
      if (payload.length % 4 || bytes > LIMITS.imageBytes) throw new Error('Map uploads must be 16 MB or smaller.');
      return value;
    }
    if (/^(data|javascript|blob):/i.test(value)) throw new Error('Only PNG, JPEG and WebP maps are supported.');
    const base = new URL(baseURL);
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin || url.username || url.password || !/\.(png|jpe?g|webp)$/i.test(url.pathname)) throw new Error('Map images must be uploaded or hosted on this website.');
    return url.href;
  }
  function dimensions(width, height) {
    number(width, 1, LIMITS.dimension, 'map width'); number(height, 1, LIMITS.dimension, 'map height');
    if (!Number.isInteger(width) || !Number.isInteger(height) || width * height > LIMITS.pixels) throw new Error('Map must be at most 16,384 pixels per side and 48 megapixels.');
  }
  function validateStrategy(input, baseURL) {
    if (!input || input.version !== 1 || !input.map || !Array.isArray(input.objects) || input.objects.length > LIMITS.objects) throw new Error('This is not a supported SCP strategy file (version 1).');
    dimensions(input.map.width, input.map.height);
    const map = { name: string(input.map.name, 180, 'map name'), src: imageSource(input.map.src, baseURL), width: input.map.width, height: input.map.height };
    let pointCount = 0;
    const ids = new Set();
    const objects = input.objects.map((item, index) => {
      if (!item || !types.has(item.type) || !/^#[0-9a-f]{6}$/i.test(item.color)) throw new Error('Invalid annotation in strategy file.');
      let id = typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id) && !ids.has(item.id) ? item.id : 'import-' + index;
      let suffix = 0;
      while (ids.has(id)) id = 'import-' + index + '-' + (++suffix);
      ids.add(id);
      const out = { id, type: item.type, color: item.color, width: number(item.width, 1, 100, 'stroke width') };
      const coordinate = n => number(n, -65536, 65536, 'coordinate');
      if (item.type === 'path') {
        if (!Array.isArray(item.points) || !item.points.length || (pointCount += item.points.length) > LIMITS.points) throw new Error('Strategy contains too many drawing points.');
        out.points = item.points.map(p => { if (!p || !Array.isArray(p) || p.length !== 2) throw new Error('Invalid drawing point.'); return [coordinate(p[0]), coordinate(p[1])]; });
      } else {
        out.x = coordinate(item.x); out.y = coordinate(item.y);
        if (['line', 'arrow', 'rect', 'ellipse'].includes(item.type)) { out.x2 = coordinate(item.x2); out.y2 = coordinate(item.y2); }
        if (item.type === 'text' || item.type === 'marker') {
          out.text = string(item.text, item.type === 'marker' ? 24 : 160, 'annotation label');
          out.size = number(item.size, 12, 160, 'font size');
          if (item.type === 'marker') { if (!['squad', 'objective'].includes(item.kind)) throw new Error('Invalid marker type.'); out.kind = item.kind; }
        }
      }
      return out;
    });
    return { version: 1, title: string(input.title, 100, 'strategy name'), map, objects };
  }
  function segmentDistance(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = dx || dy ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
    return Math.hypot(p.x - a[0] - t * dx, p.y - a[1] - t * dy);
  }
  function translate(item, dx, dy) {
    if (item.type === 'path') item.points = item.points.map(p => [p[0] + dx, p[1] + dy]);
    else { item.x += dx; item.y += dy; if ('x2' in item) { item.x2 += dx; item.y2 += dy; } }
  }
  const api = { LIMITS, clone, imageSource, dimensions, validateStrategy, segmentDistance, translate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MappingCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
