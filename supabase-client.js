(() => {
  'use strict';

  const rawConfig = window.SCP_SUPABASE || {};
  const url = String(rawConfig.url || '').trim().replace(/\/+$/, '');
  const publishableKey = String(rawConfig.publishableKey || '').trim();
  const secureProject = /^https:\/\/[^/]+/i.test(url);
  const localProject = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(url);
  const configured = (secureProject || localProject) && publishableKey.length > 20;
  const legacyJwtKey = /^eyJ[A-Za-z0-9_-]+\./.test(publishableKey);
  const sessionKey = 'scp-admin-session-v1';
  const bucket = 'member-photos';
  let memorySession = null;

  class SCPDataError extends Error {
    constructor(message, status = 0, detail = null) {
      super(message);
      this.name = 'SCPDataError';
      this.status = status;
      this.detail = detail;
    }
  }

  const storage = {
    read() {
      try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); }
      catch { return memorySession; }
    },
    write(value) {
      memorySession = value;
      try {
        if (value) localStorage.setItem(sessionKey, JSON.stringify(value));
        else localStorage.removeItem(sessionKey);
      } catch { /* Private browsing may make localStorage unavailable. */ }
    }
  };

  function messageFor(payload, response) {
    return payload?.msg || payload?.message || payload?.error_description || payload?.error ||
      `Permintaan database gagal (${response.status}).`;
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); }
    catch { return text; }
  }

  async function authEndpoint(path, body, token = '') {
    if (!configured) throw new SCPDataError('Supabase belum dikonfigurasi.');
    const response = await fetch(`${url}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await parseResponse(response);
    if (!response.ok) throw new SCPDataError(messageFor(payload, response), response.status, payload);
    return payload;
  }

  function normalizeSession(payload) {
    if (!payload?.access_token) return null;
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      token_type: payload.token_type || 'bearer',
      expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
      user: payload.user || null
    };
  }

  async function refreshSession(session = storage.read()) {
    if (!session?.refresh_token) { storage.write(null); return null; }
    try {
      const payload = await authEndpoint('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
      const next = normalizeSession(payload);
      storage.write(next);
      return next;
    } catch (error) {
      storage.write(null);
      throw error;
    }
  }

  async function restoreSession() {
    const session = storage.read();
    if (!configured || !session?.access_token) return null;
    if (Number(session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 60) return refreshSession(session);
    memorySession = session;
    return session;
  }

  async function accessToken() {
    const session = await restoreSession();
    if (!session?.access_token) throw new SCPDataError('Sesi admin telah berakhir. Silakan masuk kembali.', 401);
    return session.access_token;
  }

  async function signIn(email, password) {
    const payload = await authEndpoint('token?grant_type=password', { email: String(email).trim(), password });
    const session = normalizeSession(payload);
    storage.write(session);
    return session;
  }

  async function signOut() {
    const session = storage.read();
    storage.write(null);
    if (!configured || !session?.access_token) return;
    try { await authEndpoint('logout', undefined, session.access_token); }
    catch { /* The local session is already cleared. */ }
  }

  async function verifyAdmin() {
    const allowed = await request('rest/v1/rpc/is_scp_admin', {
      method: 'POST', body: {}, admin: true
    });
    return allowed === true;
  }

  async function request(path, { method = 'GET', body, admin = false, headers = {}, retry = true } = {}) {
    if (!configured) throw new SCPDataError('Supabase belum dikonfigurasi.');
    const bearer = admin ? await accessToken() : legacyJwtKey ? publishableKey : '';
    const response = await fetch(`${url}/${path}`, {
      method,
      headers: {
        apikey: publishableKey,
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(body instanceof Blob ? {} : body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers
      },
      body: body instanceof Blob ? body : body === undefined ? undefined : JSON.stringify(body)
    });
    if (response.status === 401 && admin && retry) {
      await refreshSession();
      return request(path, { method, body, admin, headers, retry: false });
    }
    const payload = await parseResponse(response);
    if (!response.ok) throw new SCPDataError(messageFor(payload, response), response.status, payload);
    return payload;
  }

  const encodePath = value => String(value || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  function publicPhotoUrl(path) {
    return path ? `${url}/storage/v1/object/public/${bucket}/${encodePath(path)}` : '';
  }
  function decorateMember(record) {
    return { ...record, ...window.SCPRoster.normalize(record), photo_url: record.photo_url || publicPhotoUrl(record.photo_path) };
  }

  async function listMembers({ includeDrafts = false } = {}) {
    const query = new URLSearchParams({ select: '*', order: 'sort_order.asc,created_at.asc' });
    if (!includeDrafts) query.set('published', 'eq.true');
    const rows = await request(`rest/v1/members?${query}`, { admin: includeDrafts });
    return Array.isArray(rows) ? rows.map(decorateMember) : [];
  }

  async function listSchedule({ includeDrafts = false } = {}) {
    const query = new URLSearchParams({ select: '*', order: 'sort_order.asc,created_at.asc' });
    if (!includeDrafts) query.set('published', 'eq.true');
    const rows = await request(`rest/v1/schedule_entries?${query}`, { admin: includeDrafts });
    return Array.isArray(rows) ? rows : [];
  }

  const memberFields = ['code','name','role','role_groups','roster_type','clan_origin','commitment_scope','clearance','alias','unique_text','track','strengths','stats','photo_path','sort_order','published'];
  const scheduleFields = ['schedule_kind','operation_type','title','opponent','status','weekday','event_date','start_time','end_time','end_open','details','notes','sort_order','published'];
  const pick = (record, fields) => Object.fromEntries(fields.filter(field => record[field] !== undefined).map(field => [field, record[field]]));

  async function save(table, record, fields) {
    if (table === 'members') {
      const error = window.SCPRoster.validate(record);
      if (error) throw new SCPDataError(error, 400);
    }
    const payload = pick(record, fields);
    const editing = Boolean(record.id);
    const path = editing
      ? `rest/v1/${table}?id=eq.${encodeURIComponent(record.id)}&select=*`
      : `rest/v1/${table}?select=*`;
    const rows = await request(path, {
      method: editing ? 'PATCH' : 'POST',
      body: payload,
      admin: true,
      headers: { Prefer: 'return=representation' }
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function remove(table, id) {
    if (!id) throw new SCPDataError('ID data tidak ditemukan.');
    return request(`rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE', admin: true, headers: { Prefer: 'return=minimal' }
    });
  }

  async function removeMemberPhoto(path) {
    if (!path) return;
    await request(`storage/v1/object/${bucket}`, { method: 'DELETE', body: { prefixes: [path] }, admin: true });
  }

  async function uploadMemberPhoto(file, code) {
    if (!(file instanceof Blob) || !String(file.type).startsWith('image/')) throw new SCPDataError('Pilih file gambar yang valid.');
    if (file.size > 8 * 1024 * 1024) throw new SCPDataError('Ukuran foto maksimal 8 MB.');
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' })[file.type] || 'webp';
    const folder = String(code || 'operative').toUpperCase().replace(/[^A-Z0-9-]/g, '-');
    const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `members/${folder}/${unique}.${extension}`;
    await request(`storage/v1/object/${bucket}/${encodePath(path)}`, {
      method: 'POST', body: file, admin: true,
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false', 'Cache-Control': 'max-age=31536000' }
    });
    return { path, url: publicPhotoUrl(path) };
  }

  window.SCPData = Object.freeze({
    configured,
    projectUrl: url,
    SCPDataError,
    signIn,
    signOut,
    restoreSession,
    verifyAdmin,
    listMembers,
    saveMember: record => save('members', record, memberFields).then(decorateMember),
    deleteMember: id => remove('members', id),
    uploadMemberPhoto,
    removeMemberPhoto,
    listSchedule,
    saveSchedule: record => save('schedule_entries', record, scheduleFields),
    deleteSchedule: id => remove('schedule_entries', id)
  });
})();
