/* Fixed UTC+7 scheduling, independent of the visitor's device timezone. */
(() => {
  'use strict';
  const HOUR = 3600000;
  const DAY = 24 * HOUR;
  const dayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const fallbackEvents = [
    { id: 'training', schedule_kind: 'weekly', operation_type: 'TRAINING', title: 'SCP — Latihan internal divisi', status: 'Terjadwal', weekday: 5, start_time: '20:00', end_time: '22:00', end_open: false, details: 'Latihan internal divisi', notes: 'Koordinasi & evaluasi tim', published: true, sort_order: 1 },
    { id: 'saturday', schedule_kind: 'weekly', operation_type: 'SCRIM MATCH', title: 'SCP — Scrim Sabtu', status: 'Terjadwal', weekday: 6, start_time: '20:00', end_time: null, end_open: true, details: 'SERA ESPORT', notes: 'Terbuka untuk tantangan clan', published: true, sort_order: 2 },
    { id: 'sunday', schedule_kind: 'weekly', operation_type: 'SCRIM MATCH', title: 'SCP — Scrim Minggu', status: 'Mencari lawan', weekday: 0, start_time: '15:00', end_time: '18:00', end_open: false, details: 'Lawan belum ditentukan', notes: 'Terbuka untuk tantangan clan', published: true, sort_order: 3 }
  ];
  let events = fallbackEvents.map(normalizeEvent);

  function pad(value) { return String(value).padStart(2, '0'); }
  function parseTime(value, fallbackHour = 0) {
    const match = String(value || '').match(/^(\d{1,2})(?::(\d{2}))?/);
    return match ? [Number(match[1]), Number(match[2] || 0)] : [fallbackHour, 0];
  }
  function displayStatus(value) {
    const raw = String(value || 'Terjadwal');
    const key = raw.toLocaleLowerCase('id-ID').replace(/[\s-]+/g, '_');
    return ({ scheduled: 'Terjadwal', seeking_opponent: 'Mencari lawan', confirmed: 'Terkonfirmasi', completed: 'Selesai', cancelled: 'Dibatalkan' })[key] || raw;
  }
  function normalizeEvent(event, index = 0) {
    const legacyHour = Number(event.hour ?? 0);
    const legacyEnd = event.endHour === undefined ? null : `${pad(event.endHour)}:00`;
    return {
      ...event,
      id: event.id || `operation-${index + 1}`,
      schedule_kind: event.schedule_kind === 'event' ? 'event' : 'weekly',
      operation_type: event.operation_type || 'SCRIM MATCH',
      title: event.title || 'SCP — Operation',
      status: displayStatus(event.status),
      weekday: event.weekday === null || event.weekday === undefined ? Number(event.day ?? 0) : Number(event.weekday),
      start_time: event.start_time || `${pad(legacyHour)}:00`,
      end_time: event.end_time ?? legacyEnd,
      end_open: Boolean(event.end_open || (!event.end_time && event.endHour === undefined)),
      published: event.published !== false,
      sort_order: Number(event.sort_order ?? index + 1)
    };
  }
  function nextOccurrence(day, hour, now = new Date(), minute = 0) {
    const wib = new Date(now.getTime() + 7 * HOUR);
    const delta = (day - wib.getUTCDay() + 7) % 7;
    let result = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + delta, hour - 7, minute));
    if (result <= now) result = new Date(result.getTime() + 7 * DAY);
    return result;
  }
  function eventStart(event, now) {
    const [hour, minute] = parseTime(event.start_time);
    if (event.schedule_kind === 'event') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(event.event_date || ''))) return null;
      const value = new Date(`${event.event_date}T${pad(hour)}:${pad(minute)}:00+07:00`);
      return Number.isNaN(value.getTime()) ? null : value;
    }
    return nextOccurrence(Number(event.weekday), hour, now, minute);
  }
  function eventEnd(event, start) {
    if (!start || event.end_open || !event.end_time) return null;
    const [startHour, startMinute] = parseTime(event.start_time);
    const [endHour, endMinute] = parseTime(event.end_time);
    let duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (duration <= 0) duration += 24 * 60;
    return new Date(start.getTime() + duration * 60000);
  }
  function stamp(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function escapeText(value) { return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
  function calendarStatus(value) {
    const status = String(value || '').toLocaleLowerCase('id-ID').replace(/[\s-]+/g, '_');
    if (status === 'completed' || status === 'selesai' || status === 'confirmed' || status === 'terkonfirmasi') return 'CONFIRMED';
    if (status === 'cancelled' || status === 'canceled' || status === 'dibatalkan') return 'CANCELLED';
    return 'TENTATIVE';
  }
  function fold(line) {
    const encoder = new TextEncoder();
    const parts = []; let chunk = ''; let bytes = 0;
    for (const character of line) {
      const size = encoder.encode(character).length;
      if (bytes + size > 75) { parts.push(chunk); chunk = ' '; bytes = 1; }
      chunk += character; bytes += size;
    }
    parts.push(chunk); return parts.join('\r\n');
  }
  function calendar(now = new Date(), translate = (value, values = {}) => String(value || '').replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)) {
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SCP Alliance//Operations//ID','CALSCALE:GREGORIAN','X-WR-CALNAME:SCP Alliance — Operation Schedule','X-WR-TIMEZONE:Asia/Jakarta'];
    for (const event of events.filter(item => item.published !== false)) {
      const start = eventStart(event, now);
      if (!start) continue;
      const end = eventEnd(event, start);
      const description = [translate(event.details), event.opponent ? translate('Lawan: {opponent}', { opponent: event.opponent }) : '', translate(event.notes), translate('Status: {status}', { status: translate(event.status) })].filter(Boolean).join('\n');
      lines.push('BEGIN:VEVENT', `UID:scp-${escapeText(event.id)}@scp-alliance.invalid`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`);
      if (end) lines.push(`DTEND:${stamp(end)}`);
      if (event.schedule_kind === 'weekly') lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${dayCodes[Number(event.weekday)] || 'SU'}`);
      lines.push(`SUMMARY:${escapeText(translate(event.title))}`, `DESCRIPTION:${escapeText(description)}`, 'LOCATION:Discord SCP Alliance', 'URL:https://discord.gg/y8GR3HhK48', `STATUS:${calendarStatus(event.status)}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function setEvents(nextEvents) {
    if (!Array.isArray(nextEvents)) return events.slice();
    events = nextEvents.map(normalizeEvent).sort((a, b) => a.sort_order - b.sort_order);
    return events.slice();
  }
  globalThis.SCPSchedule = Object.freeze({
    nextOccurrence,
    calendar,
    setEvents,
    eventStart,
    get events() { return events.slice(); }
  });
})();
