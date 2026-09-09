/* Public data bridge. Static markup remains the fallback when remote data is unavailable. */
(() => {
  'use strict';

  const REMOTE_TIMEOUT = 2200;
  const SCENE_FALLBACKS = [
    { src: 'assets/hero.webp', srcset: 'assets/hero-mobile.webp 800w, assets/hero.webp 1600w' },
    { src: 'assets/team.webp', srcset: 'assets/team-mobile.webp 800w, assets/team.webp 1600w' },
    { src: 'assets/schedule.webp', srcset: 'assets/schedule-mobile.webp 800w, assets/schedule.webp 1600w' },
    { src: 'assets/about.webp', srcset: 'assets/about-mobile.webp 800w, assets/about.webp 1600w' },
    { src: 'assets/objectives.webp', srcset: 'assets/objectives-mobile.webp 800w, assets/objectives.webp 1600w' }
  ];
  const DAYS = [
    ['Minggu', 'SUNDAY'],
    ['Senin', 'MONDAY'],
    ['Selasa', 'TUESDAY'],
    ['Rabu', 'WEDNESDAY'],
    ['Kamis', 'THURSDAY'],
    ['Jumat', 'FRIDAY'],
    ['Sabtu', 'SATURDAY']
  ];
  const ROLE_GROUPS = new Set(['vehicle', 'engineer', 'recon', 'assault', 'support', 'command', 'other']);

  function status(state, reason, extra = {}) {
    const value = Object.freeze({ state, reason, remote: state === 'remote', ...extra });
    window.SCP_REMOTE_STATUS = value;
    return value;
  }

  function text(value, fallback = '') {
    if (value === null || value === undefined) return fallback;
    return String(value).trim() || fallback;
  }

  function boundedText(value, fallback = '', limit = 5000) {
    return text(value, fallback).slice(0, limit);
  }

  function create(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function safeAsset(value) {
    const candidate = text(value);
    if (!candidate || candidate.length > 2048) return '';
    try {
      const url = new URL(candidate, document.baseURI);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch {
      return '';
    }
  }

  function safeDomId(value, fallback) {
    const safe = text(value).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
    return safe || fallback;
  }

  function normalizeRoleGroups(value, role) {
    const supplied = Array.isArray(value) ? value : text(value).split(/[\s,|/]+/);
    const groups = supplied
      .map(item => text(item).toLocaleLowerCase('en-US').replace(/[^a-z0-9_-]/g, ''))
      .filter(item => ROLE_GROUPS.has(item));
    if (groups.length) return [...new Set(groups)];

    const roleText = text(role).toLocaleLowerCase('en-US');
    if (/vehicle|tank|cavalry/.test(roleText)) groups.push('vehicle');
    if (/engineer/.test(roleText)) groups.push('engineer');
    if (/recon|scout/.test(roleText)) groups.push('recon');
    if (/assault|tactical|striker/.test(roleText)) groups.push('assault');
    if (/support/.test(roleText)) groups.push('support');
    if (/command|leader|overseer|igl/.test(roleText)) groups.push('command');
    return groups.length ? [...new Set(groups)] : ['other'];
  }

  function normalizeTrack(value) {
    return asArray(value).slice(0, 30).map(item => ({
      clan: boundedText(item?.clan, 'CLASSIFIED', 120),
      role: boundedText(item?.role, 'Operative', 120),
      year: boundedText(item?.year, '', 80)
    }));
  }

  function normalizeStrengths(value) {
    return asArray(value).slice(0, 30).map(item => boundedText(item, '', 300)).filter(Boolean);
  }

  function normalizeStats(value) {
    const source = Array.isArray(value)
      ? value
      : value && typeof value === 'object'
        ? Object.entries(value)
        : [];
    return source.slice(0, 30).map(item => {
      const label = Array.isArray(item) ? item[0] : item?.label ?? item?.name;
      const rawValue = Array.isArray(item) ? item[1] : item?.value;
      const amount = Math.max(0, Math.min(100, Number(rawValue) || 0));
      return [boundedText(label, 'STAT', 50), amount];
    });
  }

  function normalizeMember(row, index) {
    if (!row || typeof row !== 'object') return null;
    const code = boundedText(row.code, `SCP-${String(index + 1).padStart(3, '0')}`, 48).toUpperCase();
    const name = boundedText(row.name, '[ CLASSIFIED ]', 160);
    const role = boundedText(row.role, 'Operative', 120);
    const alias = boundedText(row.alias, 'CLASSIFIED', 180);
    const unique = boundedText(row.unique_text ?? row.unique, 'Data khusus masih diklasifikasikan.', 3000);
    const clearanceRaw = boundedText(row.clearance, 'LEVEL I', 100);
    const clearance = /^clearance\s*:/i.test(clearanceRaw) ? clearanceRaw : `CLEARANCE: ${clearanceRaw}`;
    const photoUrl = safeAsset(row.photo_url ?? row.photoUrl);
    const affiliation = window.SCPRoster.normalize(row);
    const rosterType = affiliation.roster_type;
    return {
      code,
      name,
      role,
      roleGroups: normalizeRoleGroups(row.role_groups ?? row.role_group, role),
      rosterType,
      clanOrigin: affiliation.clan_origin,
      commitmentScope: affiliation.commitment_scope,
      clearance,
      alias,
      unique,
      track: normalizeTrack(row.track),
      strengths: normalizeStrengths(row.strengths),
      stats: normalizeStats(row.stats),
      photoUrl,
      photoPath: boundedText(row.photo_path, '', 1024),
      sortOrder: Number(row.sort_order) || index
    };
  }

  function appendArrow(parent) {
    const holder = create('b');
    holder.setAttribute('aria-hidden', 'true');
    const arrow = create('i', 'ui-arrow ui-arrow-diagonal');
    holder.append(arrow);
    parent.append(holder);
  }

  function createMemberCard(member, index) {
    const article = create('article', 'member-card');
    article.id = `operative-${safeDomId(member.code, String(index + 1))}`;
    article.dataset.operative = member.code;
    article.dataset.roleGroups = member.roleGroups.join(' ');
    article.dataset.rosterType = member.rosterType;

    const scene = SCENE_FALLBACKS[index % SCENE_FALLBACKS.length];
    const visual = create('div', 'member-visual');
    visual.setAttribute('aria-hidden', 'true');
    const art = create('img', 'member-art');
    art.src = member.photoUrl || scene.src;
    if (!member.photoUrl) art.srcset = scene.srcset;
    art.sizes = '90vw';
    art.loading = 'lazy';
    art.decoding = 'async';
    art.alt = '';
    visual.append(art, create('div', 'member-gridlines'));
    const watermark = create('span', 'member-watermark', member.code.replace(/^SCP-/i, '') || member.code);
    visual.append(watermark);

    const top = create('div', 'member-card-top');
    top.append(
      create('span', 'member-id', member.code),
      create('span', '', `PERSONNEL FILE / ${String(index + 1).padStart(2, '0')}`),
      create('span', 'member-access', member.clearance)
    );

    const feature = create('div', 'member-feature');
    const displayAlias = member.alias.replace(/^(["“'])|(["”'])$/g, '');
    feature.append(
      create('span', 'member-category', member.role),
      create('h4', 'member-alias', displayAlias),
      create('p', 'member-excerpt', member.unique)
    );

    const bottom = create('div', 'member-card-bottom');
    const photoFrame = create('div', 'member-photo');
    const photo = create('img');
    photo.src = member.photoUrl || (member.code === 'SCP-022' ? 'assets/jess.webp' : 'assets/emblem.webp');
    photo.alt = '';
    photo.width = 40;
    photo.height = 40;
    photo.loading = 'lazy';
    photo.decoding = 'async';
    photoFrame.append(photo);
    const info = create('div', 'member-info');
    info.append(create('p', 'member-name', member.name), create('p', 'member-role', member.role));
    const button = create('button', 'member-open');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', `Buka profil ${member.name}, ${member.code}`);
    button.append(create('span', '', 'BUKA DOSSIER'));
    appendArrow(button);
    bottom.append(photoFrame, info, button);

    article.append(visual, top, feature, bottom);
    return article;
  }

  function timeParts(value) {
    const match = text(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return { hour, minute, label: `${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}` };
  }

  function eventDate(value) {
    const raw = text(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const date = new Date(`${raw}T00:00:00+07:00`);
    return Number.isNaN(date.getTime()) ? null : { raw, date };
  }

  function statusLabel(value) {
    const raw = boundedText(value, 'Terjadwal', 80);
    const key = raw.toLocaleLowerCase('en-US').replace(/[\s-]+/g, '_');
    const labels = {
      scheduled: 'Terjadwal', confirmed: 'Terkonfirmasi', open: 'Mencari lawan',
      seeking: 'Mencari lawan', seeking_opponent: 'Mencari lawan', completed: 'Selesai',
      cancelled: 'Dibatalkan', canceled: 'Dibatalkan', postponed: 'Ditunda'
    };
    return { label: labels[key] || raw, solid: ['scheduled', 'confirmed', 'terjadwal', 'terkonfirmasi', 'completed', 'selesai'].includes(key) };
  }

  function normalizeSchedule(row, index) {
    if (!row || typeof row !== 'object') return null;
    const kind = row.schedule_kind === 'event' ? 'event' : 'weekly';
    const weekdayNumber = Number(row.weekday);
    const weekday = Number.isInteger(weekdayNumber) && weekdayNumber >= 0 && weekdayNumber <= 6 ? weekdayNumber : null;
    const date = eventDate(row.event_date);
    const start = timeParts(row.start_time);
    const end = timeParts(row.end_time);
    if (!start || (kind === 'weekly' && weekday === null) || (kind === 'event' && !date)) return null;
    return {
      raw: row,
      kind,
      operationType: boundedText(row.operation_type, kind === 'event' ? 'SPECIAL OPERATION' : 'SCRIM MATCH', 100),
      title: boundedText(row.title, '', 200),
      opponent: boundedText(row.opponent, '', 200),
      status: statusLabel(row.status),
      weekday,
      date,
      start,
      end,
      endOpen: Boolean(row.end_open),
      details: boundedText(row.details, '', 800),
      notes: boundedText(row.notes, '', 800),
      sortOrder: Number(row.sort_order) || index
    };
  }

  function scheduleHeading(entry) {
    if (entry.kind === 'weekly') return DAYS[entry.weekday];
    const primary = entry.title || entry.operationType;
    const secondary = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric'
    }).format(entry.date.date).toLocaleUpperCase('id-ID');
    return [primary, secondary];
  }

  function createScheduleCard(entry, index) {
    const article = create('article', 'schedule-card');
    article.dataset.scheduleKind = entry.kind;
    if (entry.date) article.dataset.eventDate = entry.date.raw;

    const top = create('div', 'schedule-card-top');
    const badge = create('span', entry.status.solid ? 'badge' : 'badge badge-outline', entry.status.label);
    top.append(create('span', '', `${String(index + 1).padStart(2, '0')} / ${entry.operationType.toUpperCase()}`), badge);

    const headingText = scheduleHeading(entry);
    const heading = create('h3', '', headingText[0]);
    const headingDate = create('span', '', headingText[1]);
    if (entry.kind === 'event') headingDate.dataset.localeDate = entry.date.raw;
    heading.append(headingDate);

    const time = create('p', 'schedule-time');
    const endLabel = entry.end && !entry.endOpen ? ` — ${entry.end.label}` : '';
    time.append(document.createTextNode(entry.start.label + endLabel));
    time.append(create('span', '', entry.endOpen ? 'WIB — selesai' : 'WIB'));

    const detail = create('div', 'schedule-detail');
    const mainDetail = entry.opponent
      ? `VS ${entry.opponent}`
      : entry.kind === 'weekly'
        ? entry.title || entry.details || 'Lawan belum ditentukan'
        : entry.details || 'Lawan belum ditentukan';
    const secondaryDetail = [entry.details !== mainDetail ? entry.details : '', entry.notes].filter(Boolean).join(' • ');
    detail.append(create('span', '', mainDetail), create('small', '', secondaryDetail || 'Konfirmasi melalui Discord'));

    if (entry.kind === 'weekly') {
      const next = create('p', 'next-date', `Setiap ${DAYS[entry.weekday][0]}`);
      next.dataset.scheduleKind = 'weekly';
      next.dataset.weekday = String(entry.weekday);
      next.dataset.hour = String(entry.start.hour);
      next.dataset.minute = String(entry.start.minute);
      article.append(top, heading, time, detail, next);
    } else {
      const date = create('p', 'next-date', `TERJADWAL / ${headingText[1]}`);
      date.dataset.scheduleKind = 'event';
      date.dataset.date = entry.date.raw;
      date.dataset.time = `${String(entry.start.hour).padStart(2, '0')}:${String(entry.start.minute).padStart(2, '0')}`;
      article.append(top, heading, time, detail, date);
    }
    return article;
  }

  function list(value, label) {
    const rows = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : null;
    if (!rows) throw new TypeError(`${label} response is not an array`);
    return rows;
  }

  function withTimeout(promise, milliseconds) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('remote-timeout')), milliseconds);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  status('static', 'initializing');
  window.SCP_DATA_READY = (async () => {
    const api = window.SCPData;
    if (!api || api.configured !== true) return status('static', 'not-configured');
    if (typeof api.listMembers !== 'function' || typeof api.listSchedule !== 'function') {
      return status('static', 'client-unavailable');
    }

    status('loading', 'remote-request');
    try {
      const responses = await withTimeout(Promise.all([
        api.listMembers({ includeDrafts: false }),
        api.listSchedule({ includeDrafts: false })
      ]), REMOTE_TIMEOUT);
      const memberRows = list(responses[0], 'members');
      const scheduleRows = list(responses[1], 'schedule');
      const members = memberRows.map(normalizeMember).filter(Boolean);
      const entries = scheduleRows.map(normalizeSchedule).filter(Boolean);
      if (memberRows.length && !members.length) throw new TypeError('members response has no valid records');
      if (scheduleRows.length && !entries.length) throw new TypeError('schedule response has no valid records');

      const gallery = document.getElementById('operativeGallery');
      const scheduleGrid = document.querySelector('.schedule-grid');
      if (!gallery || !scheduleGrid) throw new Error('public-data-targets-missing');

      const galleryContent = document.createDocumentFragment();
      const scheduleContent = document.createDocumentFragment();
      const dossiers = {};
      members.forEach((member, index) => {
        galleryContent.append(createMemberCard(member, index));
        dossiers[member.code] = {
          name: member.name,
          role: member.role,
          roleGroups: member.roleGroups.slice(),
          roster_type: member.rosterType,
          clan_origin: member.clanOrigin,
          commitment_scope: member.commitmentScope,
          clearance: member.clearance,
          alias: member.alias,
          unique: member.unique,
          track: member.track,
          strengths: member.strengths,
          stats: member.stats,
          photo_path: member.photoPath,
          photo_url: member.photoUrl
        };
      });
      entries.forEach((entry, index) => scheduleContent.append(createScheduleCard(entry, index)));

      gallery.replaceChildren(galleryContent);
      scheduleGrid.replaceChildren(scheduleContent);
      window.SCP_DOSSIERS = dossiers;
      const memberCount = document.getElementById('memberCount');
      const heroMemberCount = document.getElementById('heroMemberCount');
      const teamMemberSummary = document.getElementById('teamMemberSummary');
      const operativeTotal = document.getElementById('operativeTotal');
      const searchStatus = document.getElementById('searchStatus');
      const scheduleDataDate = document.getElementById('scheduleDataDate');
      if (memberCount) memberCount.textContent = String(members.length);
      if (heroMemberCount) heroMemberCount.textContent = String(members.length).padStart(2, '0');
      if (teamMemberSummary) teamMemberSummary.textContent = `${members.length} operatives. 4 founders.`;
      if (operativeTotal) operativeTotal.textContent = String(members.length).padStart(2, '0');
      if (searchStatus) searchStatus.textContent = `${members.length} anggota terdaftar. Main Roster diisi setelah pemain lolos seleksi dan sepakat membela SCP.`;
      if (scheduleDataDate && scheduleRows.length) {
        const timestamps = scheduleRows.map(row => new Date(row.updated_at || row.created_at || '')).filter(date => !Number.isNaN(date.getTime()));
        const latest = timestamps.sort((a, b) => b - a)[0];
        if (latest) {
          scheduleDataDate.dateTime = latest.toISOString().slice(0, 10);
          scheduleDataDate.textContent = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }).format(latest);
        }
      }

      let scheduleSync = true;
      if (typeof window.SCPSchedule?.setEvents === 'function') {
        try {
          window.SCPSchedule.setEvents(scheduleRows);
        } catch {
          scheduleSync = false;
        }
      }
      return status('remote', scheduleSync ? 'loaded' : 'loaded-calendar-fallback', {
        members: members.length,
        schedule: entries.length
      });
    } catch (error) {
      const reason = error?.message === 'remote-timeout' ? 'timeout' : 'request-failed';
      return status('static', reason);
    }
  })();
})();
