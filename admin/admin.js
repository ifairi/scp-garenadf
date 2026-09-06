(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const api = window.SCPData;
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const statusNames = {
    open: 'Mencari lawan',
    seeking_opponent: 'Mencari lawan',
    scheduled: 'Terjadwal',
    confirmed: 'Terkonfirmasi',
    tentative: 'Menunggu konfirmasi',
    completed: 'Selesai',
    cancelled: 'Dibatalkan'
  };
  const typeNames = {
    scrim: 'Scrim',
    training: 'Latihan',
    tournament: 'Turnamen',
    briefing: 'Briefing',
    meeting: 'Rapat tim',
    other: 'Operasi'
  };

  const refs = {
    app: $('#adminApp'), authGate: $('#authGate'), controlRoom: $('#controlRoom'),
    warning: $('#configWarning'), loginForm: $('#loginForm'), loginMessage: $('#loginMessage'),
    password: $('#loginPassword'), connection: $('#connectionState'), refresh: $('#refreshButton'),
    signOut: $('#signOutButton'), time: $('#wibTime'), lastSync: $('#lastSync'),
    memberPanel: $('#membersPanel'), schedulePanel: $('#schedulePanel'),
    memberList: $('#memberList'), scheduleList: $('#scheduleList'),
    memberEmpty: $('#memberEmpty'), scheduleEmpty: $('#scheduleEmpty'),
    memberSearch: $('#memberSearch'), scheduleSearch: $('#scheduleSearch'),
    memberTotal: $('#memberTotal'), scheduleTotal: $('#scheduleTotal'),
    memberSummary: $('#memberSummary'), scheduleSummary: $('#scheduleSummary'),
    memberDialog: $('#memberDialog'), scheduleDialog: $('#scheduleDialog'),
    memberForm: $('#memberForm'), scheduleForm: $('#scheduleForm'),
    memberTitle: $('#memberDialogTitle'), scheduleTitle: $('#scheduleDialogTitle'),
    photo: $('#memberPhoto'), photoPreview: $('#photoPreview'), photoName: $('#photoName'),
    removePhoto: $('#removePhotoButton'), confirm: $('#confirmDialog'),
    confirmTitle: $('#confirmTitle'), confirmCopy: $('#confirmCopy'),
    confirmDelete: $('#confirmDelete'), cancelDelete: $('#cancelDelete'), toast: $('#adminToast')
  };

  const state = {
    members: [], schedule: [],
    memberQuery: '', scheduleQuery: '',
    photoObjectUrl: '', removeCurrentPhoto: false,
    deleteTarget: null, loading: false
  };

  function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function valueOf(result) {
    if (result && typeof result === 'object' && 'data' in result && result.data !== undefined) return result.data;
    return result;
  }

  function listOf(result, key) {
    const value = valueOf(result);
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value[key])) return value[key];
    return [];
  }

  function errorText(error, fallback = 'Operasi gagal. Silakan coba lagi.') {
    return error?.message || error?.error_description || error?.details || fallback;
  }

  function hasSession(result) {
    const value = valueOf(result);
    return Boolean(value === true || value?.user || value?.session?.user || value?.session || value?.access_token);
  }

  function isConfigured() {
    if (!api) return false;
    try { return typeof api.configured === 'function' ? Boolean(api.configured()) : Boolean(api.configured); }
    catch { return false; }
  }

  function setBusy(value) {
    state.loading = value;
    refs.controlRoom.classList.toggle('is-loading', value);
    refs.refresh.disabled = value;
    refs.app.setAttribute('aria-busy', String(value));
  }

  function setConnection(mode, label) {
    refs.connection.classList.toggle('is-online', mode === 'online');
    refs.connection.classList.toggle('is-offline', mode === 'offline');
    $('b', refs.connection).textContent = label || (mode === 'online' ? 'DATABASE ONLINE' : mode === 'offline' ? 'CONNECTION LOST' : 'CONNECTING');
  }

  let toastTimer = 0;
  function toast(message, isError = false) {
    clearTimeout(toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.toggle('is-error', isError);
    refs.toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => refs.toast.classList.remove('is-visible'), 3200);
  }

  function showAuth() {
    refs.authGate.hidden = false;
    refs.controlRoom.hidden = true;
    refs.app.setAttribute('aria-busy', 'false');
  }

  async function showControl() {
    refs.authGate.hidden = true;
    refs.controlRoom.hidden = false;
    await loadData();
  }

  async function requireAdmin(session) {
    if (!hasSession(session) || typeof api?.verifyAdmin !== 'function') return false;
    return api.verifyAdmin();
  }

  async function loadData({ quiet = false } = {}) {
    if (state.loading) return;
    setBusy(true);
    setConnection('pending', 'SYNCING');
    try {
      const [memberResult, scheduleResult] = await Promise.all([
        api.listMembers({ includeDrafts: true }),
        api.listSchedule({ includeDrafts: true })
      ]);
      state.members = listOf(memberResult, 'members');
      state.schedule = listOf(scheduleResult, 'schedule');
      renderMembers();
      renderSchedule();
      setConnection('online');
      refs.lastSync.textContent = `SINKRON TERAKHIR · ${formatWibTime(new Date(), true)}`;
      if (!quiet) toast('Data berhasil disinkronkan.');
    } catch (error) {
      setConnection('offline');
      toast(errorText(error, 'Database tidak dapat dijangkau.'), true);
      if (/auth|session|jwt|login|unauthorized/i.test(errorText(error))) {
        showAuth();
        refs.loginMessage.textContent = 'Sesi berakhir. Silakan masuk kembali.';
      }
    } finally { setBusy(false); }
  }

  function formatWibTime(date, withSeconds = false) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit',
      ...(withSeconds ? { second: '2-digit' } : {}), hour12: false
    }).format(date).replaceAll('.', ':');
  }

  function updateClock() { refs.time.textContent = formatWibTime(new Date()); }

  function sorted(records) {
    return [...records].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.code || a.title || '').localeCompare(String(b.code || b.title || ''), 'id'));
  }

  function updateSummary(element, records) {
    const live = records.filter(record => record.published !== false).length;
    const draft = records.length - live;
    const values = $$('b', element);
    values[0].textContent = live;
    values[1].textContent = draft;
  }

  function actionButton(kind, label, id) {
    const button = create('button', `icon-action${kind === 'delete' ? ' is-danger' : ''}`);
    button.type = 'button';
    button.dataset.action = kind;
    button.dataset.id = id;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(create('span', kind === 'delete' ? 'delete-icon' : 'edit-icon'));
    return button;
  }

  function renderMembers() {
    const query = state.memberQuery.trim().toLocaleLowerCase('id');
    const records = sorted(state.members).filter(record => !query || [record.code, record.name, record.role, record.alias, record.roster_type, ...(record.role_groups || [])].join(' ').toLocaleLowerCase('id').includes(query));
    refs.memberList.replaceChildren();
    records.forEach((record, index) => {
      const card = create('article', 'record-card');
      card.style.setProperty('--record-delay', `${Math.min(index * 35, 280)}ms`);
      const portrait = create('div', `record-portrait${record.photo_url ? '' : ' is-emblem'}`);
      const image = create('img');
      image.src = record.photo_url || '/assets/emblem.webp';
      image.alt = '';
      image.loading = 'lazy';
      portrait.append(image);

      const main = create('div', 'record-main');
      const identity = create('div', 'record-identity');
      identity.append(
        create('span', 'record-code', record.code || 'SCP-???'),
        create('span', `roster-badge is-${record.roster_type === 'pure' ? 'pure' : 'alliance'}`, record.roster_type === 'pure' ? 'PURE SCP' : 'ALLIANCE')
      );
      main.append(identity, create('h3', '', record.name || 'Tanpa nama'), create('p', '', record.role || 'Peran belum ditentukan'));

      const meta = create('div', 'record-meta');
      meta.append(create('b', '', 'ALIAS / CLEARANCE'), create('p', '', `${record.alias || 'Tanpa alias'} · ${record.clearance || 'No clearance'}`));

      const order = create('div', 'record-order');
      order.append(create('strong', '', String(Number(record.sort_order) || 0).padStart(2, '0')), document.createTextNode('URUTAN'));

      const status = create('span', `record-state${record.published === false ? ' is-draft' : ''}`, record.published === false ? 'DRAFT' : 'PUBLIK');
      const actions = create('div', 'record-actions');
      actions.append(actionButton('edit', `Edit ${record.name || record.code}`, String(record.id)), actionButton('delete', `Hapus ${record.name || record.code}`, String(record.id)));
      card.append(portrait, main, meta, order, status, actions);
      refs.memberList.append(card);
    });
    refs.memberEmpty.hidden = records.length > 0;
    refs.memberTotal.textContent = state.members.length;
    updateSummary(refs.memberSummary, state.members);
  }

  function displayDate(record) {
    const kind = record.schedule_kind || (record.event_date ? 'event' : 'weekly');
    if (kind === 'event' && record.event_date) {
      const date = new Date(`${record.event_date}T00:00:00`);
      if (!Number.isNaN(date.valueOf())) return { primary: String(date.getDate()).padStart(2, '0'), secondary: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase() };
    }
    return { primary: dayNames[Number(record.weekday) || 0].slice(0, 3).toUpperCase(), secondary: 'SETIAP MINGGU' };
  }

  function timeRange(record) {
    const start = String(record.start_time || '--:--').slice(0, 5).replace(':', '.');
    if (record.end_open) return `${start} — SELESAI`;
    const end = record.end_time ? String(record.end_time).slice(0, 5).replace(':', '.') : '—';
    return `${start} — ${end}`;
  }

  function renderSchedule() {
    const query = state.scheduleQuery.trim().toLocaleLowerCase('id');
    const records = sorted(state.schedule).filter(record => !query || [record.title, record.opponent, record.operation_type, record.status, record.details].join(' ').toLocaleLowerCase('id').includes(query));
    refs.scheduleList.replaceChildren();
    records.forEach((record, index) => {
      const card = create('article', 'record-card');
      card.style.setProperty('--record-delay', `${Math.min(index * 35, 280)}ms`);
      const dateValue = displayDate(record);
      const date = create('div', 'schedule-date');
      date.append(create('strong', '', dateValue.primary), create('small', '', dateValue.secondary));

      const main = create('div', 'record-main');
      main.append(create('span', 'record-code', `${typeNames[record.operation_type] || record.operation_type || 'OPERASI'} / ${timeRange(record)}`.toUpperCase()), create('h3', '', record.title || 'Jadwal tanpa judul'), create('p', '', record.opponent ? `VS ${record.opponent}` : 'Lawan belum ditentukan'));

      const meta = create('div', 'record-meta');
      meta.append(create('b', '', 'DETAIL OPERASI'), create('p', '', record.details || 'Tidak ada detail tambahan'));
      const scheduleStatus = create('div', 'schedule-status', 'STATUS');
      scheduleStatus.dataset.status = record.status || 'tentative';
      scheduleStatus.append(create('b', '', statusNames[record.status] || record.status || 'Belum ditentukan'));

      const order = create('div', 'record-order');
      order.append(create('strong', '', String(Number(record.sort_order) || 0).padStart(2, '0')), document.createTextNode(record.published === false ? 'DRAFT' : 'PUBLIK'));
      const actions = create('div', 'record-actions');
      actions.append(actionButton('edit', `Edit ${record.title || 'jadwal'}`, String(record.id)), actionButton('delete', `Hapus ${record.title || 'jadwal'}`, String(record.id)));
      card.append(date, main, meta, scheduleStatus, order, actions);
      refs.scheduleList.append(card);
    });
    refs.scheduleEmpty.hidden = records.length > 0;
    refs.scheduleTotal.textContent = state.schedule.length;
    updateSummary(refs.scheduleSummary, state.schedule);
  }

  function resetPhotoPreview() {
    if (state.photoObjectUrl) URL.revokeObjectURL(state.photoObjectUrl);
    state.photoObjectUrl = '';
    state.removeCurrentPhoto = false;
    refs.photo.value = '';
    refs.photoName.textContent = 'Belum ada foto baru dipilih.';
  }

  function showPhoto(url) {
    const image = $('img', refs.photoPreview);
    image.src = url || '/assets/emblem.webp';
    refs.photoPreview.classList.toggle('has-photo', Boolean(url));
  }

  function statsOf(record) {
    const result = { vehicle: 50, shooting: 50, survival: 50, coop: 50, objective: 50 };
    const stats = record?.stats;
    if (Array.isArray(stats)) {
      for (const entry of stats) {
        if (!Array.isArray(entry)) continue;
        const key = String(entry[0]).toLowerCase().replace(/[^a-z]/g, '');
        if (key === 'coop') result.coop = Number(entry[1]);
        else if (key in result) result[key] = Number(entry[1]);
      }
    } else if (stats && typeof stats === 'object') {
      for (const key of Object.keys(result)) {
        const source = key === 'coop' ? stats.coop ?? stats['co-op'] ?? stats.COOP : stats[key] ?? stats[key.toUpperCase()];
        if (source !== undefined) result[key] = Number(source);
      }
    }
    return result;
  }

  function setField(form, name, value) {
    const field = form.elements.namedItem(name);
    if (field && 'value' in field) field.value = value ?? '';
  }

  function openMember(record = null) {
    refs.memberForm.reset();
    resetPhotoPreview();
    refs.memberTitle.textContent = record ? 'Edit anggota' : 'Tambah anggota';
    const nextOrder = state.members.reduce((max, item) => Math.max(max, Number(item.sort_order) || 0), 0) + 1;
    setField(refs.memberForm, 'sort_order', record?.sort_order ?? nextOrder);
    setField(refs.memberForm, 'roster_type', record?.roster_type === 'pure' ? 'pure' : 'alliance');
    setField(refs.memberForm, 'published', '');
    refs.memberForm.elements.published.checked = record ? record.published !== false : true;
    if (record) {
      ['id', 'code', 'name', 'role', 'clearance', 'alias', 'unique_text', 'photo_url', 'photo_path'].forEach(name => setField(refs.memberForm, name, record[name] ?? (name === 'unique_text' ? record.unique : '')));
      setField(refs.memberForm, 'track', record.track?.length ? JSON.stringify(record.track, null, 2) : '');
      setField(refs.memberForm, 'strengths', Array.isArray(record.strengths) ? record.strengths.join('\n') : record.strengths || '');
      const groups = Array.isArray(record.role_groups) ? record.role_groups : record.role_group ? [record.role_group] : [];
      $$('input[name="role_groups"]', refs.memberForm).forEach(input => { input.checked = groups.includes(input.value); });
      const stats = statsOf(record);
      Object.entries(stats).forEach(([key, value]) => setField(refs.memberForm, `stat_${key}`, value));
      showPhoto(record.photo_url);
      refs.photoName.textContent = record.photo_url ? 'Foto saat ini akan tetap digunakan.' : 'Dossier ini belum memiliki foto.';
    } else {
      setField(refs.memberForm, 'stat_vehicle', 50);
      setField(refs.memberForm, 'stat_shooting', 50);
      setField(refs.memberForm, 'stat_survival', 50);
      setField(refs.memberForm, 'stat_coop', 50);
      setField(refs.memberForm, 'stat_objective', 50);
      showPhoto('');
    }
    $('[data-form-message]', refs.memberForm).textContent = '';
    refs.memberDialog.showModal();
  }

  function setScheduleMode(kind) {
    const event = kind === 'event';
    $('[data-weekly-field]', refs.scheduleForm).hidden = event;
    $('[data-dated-field]', refs.scheduleForm).hidden = !event;
    refs.scheduleForm.elements.weekday.required = !event;
    refs.scheduleForm.elements.event_date.required = event;
  }

  function openSchedule(record = null) {
    refs.scheduleForm.reset();
    refs.scheduleTitle.textContent = record ? 'Edit jadwal' : 'Tambah jadwal';
    const nextOrder = state.schedule.reduce((max, item) => Math.max(max, Number(item.sort_order) || 0), 0) + 1;
    setField(refs.scheduleForm, 'sort_order', record?.sort_order ?? nextOrder);
    refs.scheduleForm.elements.published.checked = record ? record.published !== false : true;
    if (record) {
      ['id', 'operation_type', 'title', 'opponent', 'status', 'weekday', 'event_date', 'start_time', 'end_time', 'details', 'notes'].forEach(name => setField(refs.scheduleForm, name, record[name]));
      refs.scheduleForm.elements.end_open.checked = Boolean(record.end_open);
      const kind = record.schedule_kind || (record.event_date ? 'event' : 'weekly');
      const radio = refs.scheduleForm.querySelector(`input[name="schedule_kind"][value="${kind}"]`);
      if (radio) radio.checked = true;
    } else {
      setField(refs.scheduleForm, 'start_time', '19:00');
    }
    setScheduleMode(refs.scheduleForm.elements.schedule_kind.value);
    toggleEndTime();
    $('[data-form-message]', refs.scheduleForm).textContent = '';
    refs.scheduleDialog.showModal();
  }

  function toggleEndTime() {
    const endField = refs.scheduleForm.elements.end_time;
    const open = refs.scheduleForm.elements.end_open.checked;
    endField.disabled = open;
    endField.required = !open;
    if (open) endField.value = '';
  }

  function clampStat(value) { return Math.min(100, Math.max(0, Number(value) || 0)); }

  async function submitMember(event) {
    event.preventDefault();
    if (!refs.memberForm.reportValidity()) return;
    const submit = $('button[type="submit"]', refs.memberForm);
    const message = $('[data-form-message]', refs.memberForm);
    let track = [];
    const rawTrack = refs.memberForm.elements.track.value.trim();
    if (rawTrack) {
      try {
        track = JSON.parse(rawTrack);
        if (!Array.isArray(track) || track.some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('invalid');
      } catch {
        message.textContent = 'Track record harus berupa daftar JSON yang valid.';
        refs.memberForm.elements.track.focus();
        return;
      }
    }
    const file = refs.photo.files[0];
    if (file && file.size > 8 * 1024 * 1024) {
      message.textContent = 'Ukuran foto melebihi batas 8 MB.';
      refs.photo.focus();
      return;
    }
    const field = name => refs.memberForm.elements.namedItem(name);
    const roleGroups = $$('input[name="role_groups"]:checked', refs.memberForm).map(input => input.value);
    if (!roleGroups.length) {
      message.textContent = 'Pilih setidaknya satu grup peran.';
      refs.memberForm.querySelector('input[name="role_groups"]').focus();
      return;
    }
    const record = {
      code: field('code').value.trim().toUpperCase(),
      name: field('name').value.trim(),
      role: field('role').value.trim(),
      role_groups: roleGroups,
      roster_type: field('roster_type').value === 'pure' ? 'pure' : 'alliance',
      clearance: field('clearance').value.trim(),
      alias: field('alias').value.trim(),
      unique_text: field('unique_text').value.trim(),
      track,
      strengths: field('strengths').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
      stats: [
        ['VEHICLE', clampStat(field('stat_vehicle').value)],
        ['SHOOTING', clampStat(field('stat_shooting').value)],
        ['SURVIVAL', clampStat(field('stat_survival').value)],
        ['CO-OP', clampStat(field('stat_coop').value)],
        ['OBJECTIVE', clampStat(field('stat_objective').value)]
      ],
      photo_path: state.removeCurrentPhoto ? null : field('photo_path').value || null,
      photo_url: state.removeCurrentPhoto ? null : field('photo_url').value || null,
      sort_order: Math.max(0, Number(field('sort_order').value) || 0),
      published: field('published').checked
    };
    const id = field('id').value;
    if (id) record.id = id;
    const previousPhotoPath = field('photo_path').value || '';
    let uploadedPhotoPath = '';
    submit.disabled = true;
    message.textContent = file ? 'Mengunggah foto dan menyimpan dossier…' : 'Menyimpan dossier…';
    try {
      if (file) {
        const uploadResult = valueOf(await api.uploadMemberPhoto(file, record.code));
        if (typeof uploadResult === 'string') record.photo_path = uploadResult;
        else if (uploadResult) {
          record.photo_path = uploadResult.photo_path || uploadResult.path || uploadResult.key || record.photo_path;
          record.photo_url = uploadResult.photo_url || uploadResult.publicUrl || uploadResult.url || record.photo_url;
        }
        uploadedPhotoPath = record.photo_path || '';
      }
      await api.saveMember(record);
      if (previousPhotoPath && previousPhotoPath !== record.photo_path) {
        api.removeMemberPhoto(previousPhotoPath).catch(() => {});
      }
      refs.memberDialog.close();
      resetPhotoPreview();
      toast(id ? 'Dossier berhasil diperbarui.' : 'Anggota baru berhasil ditambahkan.');
      await loadData({ quiet: true });
    } catch (error) {
      if (uploadedPhotoPath && uploadedPhotoPath !== previousPhotoPath && error?.status >= 400 && error.status < 500) {
        api.removeMemberPhoto(uploadedPhotoPath).catch(() => {});
      }
      message.textContent = errorText(error, 'Dossier gagal disimpan.');
    }
    finally { submit.disabled = false; }
  }

  async function submitSchedule(event) {
    event.preventDefault();
    if (!refs.scheduleForm.reportValidity()) return;
    const submit = $('button[type="submit"]', refs.scheduleForm);
    const message = $('[data-form-message]', refs.scheduleForm);
    const field = name => refs.scheduleForm.elements.namedItem(name);
    const kind = field('schedule_kind').value;
    if (!field('end_open').checked && field('end_time').value === field('start_time').value) {
      message.textContent = 'Jam selesai harus berbeda dari jam mulai.';
      field('end_time').focus();
      return;
    }
    const record = {
      schedule_kind: kind,
      operation_type: field('operation_type').value,
      title: field('title').value.trim(),
      opponent: field('opponent').value.trim() || null,
      status: field('status').value,
      weekday: kind === 'weekly' ? Number(field('weekday').value) : null,
      event_date: kind === 'event' ? field('event_date').value : null,
      start_time: field('start_time').value,
      end_time: field('end_open').checked ? null : field('end_time').value || null,
      end_open: field('end_open').checked,
      details: field('details').value.trim(),
      notes: field('notes').value.trim(),
      sort_order: Math.max(0, Number(field('sort_order').value) || 0),
      published: field('published').checked
    };
    const id = field('id').value;
    if (id) record.id = id;
    submit.disabled = true;
    message.textContent = 'Menyimpan jadwal…';
    try {
      await api.saveSchedule(record);
      refs.scheduleDialog.close();
      toast(id ? 'Jadwal berhasil diperbarui.' : 'Jadwal baru berhasil ditambahkan.');
      await loadData({ quiet: true });
    } catch (error) { message.textContent = errorText(error, 'Jadwal gagal disimpan.'); }
    finally { submit.disabled = false; }
  }

  function requestDelete(type, id) {
    const records = type === 'member' ? state.members : state.schedule;
    const record = records.find(item => String(item.id) === String(id));
    if (!record) return;
    state.deleteTarget = { type, id: record.id, photoPath: type === 'member' ? record.photo_path || '' : '' };
    const label = type === 'member' ? record.name || record.code : record.title;
    refs.confirmTitle.textContent = type === 'member' ? 'Hapus dossier anggota?' : 'Hapus jadwal operasi?';
    refs.confirmCopy.textContent = `“${label || 'Data ini'}” akan dihapus permanen dari database.`;
    refs.confirm.showModal();
  }

  async function confirmDelete() {
    if (!state.deleteTarget) return;
    refs.confirmDelete.disabled = true;
    try {
      if (state.deleteTarget.type === 'member') {
        await api.deleteMember(state.deleteTarget.id);
        if (state.deleteTarget.photoPath) api.removeMemberPhoto(state.deleteTarget.photoPath).catch(() => {});
      }
      else await api.deleteSchedule(state.deleteTarget.id);
      refs.confirm.close();
      toast(state.deleteTarget.type === 'member' ? 'Dossier berhasil dihapus.' : 'Jadwal berhasil dihapus.');
      state.deleteTarget = null;
      await loadData({ quiet: true });
    } catch (error) { toast(errorText(error, 'Data gagal dihapus.'), true); }
    finally { refs.confirmDelete.disabled = false; }
  }

  function bindEvents() {
    refs.loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      refs.loginMessage.textContent = '';
      const submit = $('button[type="submit"]', refs.loginForm);
      submit.disabled = true;
      try {
        const result = await api.signIn(refs.loginForm.elements.email.value.trim(), refs.loginForm.elements.password.value);
        if (!hasSession(result)) throw new Error('Email atau password tidak sesuai.');
        if (!(await requireAdmin(result))) {
          await api.signOut();
          throw new Error('Akun ini belum terdaftar sebagai administrator SCP.');
        }
        refs.loginForm.reset();
        await showControl();
      } catch (error) { refs.loginMessage.textContent = errorText(error, 'Tidak dapat masuk ke control terminal.'); }
      finally { submit.disabled = false; }
    });

    $('.reveal-password').addEventListener('click', event => {
      const reveal = refs.password.type === 'password';
      refs.password.type = reveal ? 'text' : 'password';
      event.currentTarget.textContent = reveal ? 'SEMBUNYIKAN' : 'LIHAT';
      event.currentTarget.setAttribute('aria-label', reveal ? 'Sembunyikan password' : 'Tampilkan password');
    });

    refs.signOut.addEventListener('click', async () => {
      refs.signOut.disabled = true;
      try { await api.signOut(); }
      catch (error) { toast(errorText(error, 'Tidak dapat keluar.'), true); }
      finally { refs.signOut.disabled = false; showAuth(); }
    });
    refs.refresh.addEventListener('click', () => loadData());

    $$('.admin-tab').forEach(tab => tab.addEventListener('click', () => {
      const members = tab.dataset.tab === 'members';
      $$('.admin-tab').forEach(item => { const active = item === tab; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', String(active)); });
      refs.memberPanel.hidden = !members;
      refs.schedulePanel.hidden = members;
    }));

    refs.memberSearch.addEventListener('input', () => { state.memberQuery = refs.memberSearch.value; renderMembers(); });
    refs.scheduleSearch.addEventListener('input', () => { state.scheduleQuery = refs.scheduleSearch.value; renderSchedule(); });
    $('#addMemberButton').addEventListener('click', () => openMember());
    $('#addScheduleButton').addEventListener('click', () => openSchedule());

    refs.memberList.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'edit') openMember(state.members.find(item => String(item.id) === button.dataset.id));
      else requestDelete('member', button.dataset.id);
    });
    refs.scheduleList.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'edit') openSchedule(state.schedule.find(item => String(item.id) === button.dataset.id));
      else requestDelete('schedule', button.dataset.id);
    });

    $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    [refs.memberDialog, refs.scheduleDialog].forEach(dialog => dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    }));
    refs.cancelDelete.addEventListener('click', () => { state.deleteTarget = null; refs.confirm.close(); });
    refs.confirmDelete.addEventListener('click', confirmDelete);

    refs.photo.addEventListener('change', event => {
      const file = refs.photo.files[0];
      if (state.photoObjectUrl) URL.revokeObjectURL(state.photoObjectUrl);
      state.photoObjectUrl = '';
      state.removeCurrentPhoto = false;
      if (!file) { showPhoto(refs.memberForm.elements.photo_url.value); return; }
      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
        $('[data-form-message]', refs.memberForm).textContent = 'Gunakan foto JPG, PNG, AVIF, atau WebP.';
        refs.photo.value = '';
        showPhoto(refs.memberForm.elements.photo_url.value);
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        $('[data-form-message]', refs.memberForm).textContent = 'Ukuran foto melebihi batas 8 MB.';
        refs.photo.value = '';
        showPhoto(refs.memberForm.elements.photo_url.value);
        return;
      }
      state.photoObjectUrl = URL.createObjectURL(file);
      showPhoto(state.photoObjectUrl);
      refs.photoName.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      $('[data-form-message]', refs.memberForm).textContent = '';
    });
    refs.removePhoto.addEventListener('click', () => {
      resetPhotoPreview();
      state.removeCurrentPhoto = true;
      showPhoto('');
      refs.photoName.textContent = 'Foto akan dilepas ketika dossier disimpan.';
    });
    refs.memberForm.addEventListener('submit', submitMember);
    refs.scheduleForm.addEventListener('submit', submitSchedule);
    $$('input[name="schedule_kind"]', refs.scheduleForm).forEach(input => input.addEventListener('change', () => setScheduleMode(input.value)));
    refs.scheduleForm.elements.end_open.addEventListener('change', toggleEndTime);

    window.addEventListener('online', () => { setConnection('online'); loadData({ quiet: true }); });
    window.addEventListener('offline', () => setConnection('offline'));
  }

  async function boot() {
    bindEvents();
    updateClock();
    window.setInterval(updateClock, 15000);
    const configured = isConfigured();
    refs.warning.hidden = configured;
    $$('input, button', refs.loginForm).forEach(control => { control.disabled = !configured; });
    if (!configured) { showAuth(); return; }
    try {
      const session = await api.restoreSession();
      if (await requireAdmin(session)) await showControl();
      else showAuth();
    } catch { showAuth(); }
  }

  boot();
})();
