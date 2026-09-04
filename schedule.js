/* Fixed UTC+7 scheduling, independent of the visitor's device timezone. */
(() => {
  'use strict';
  const HOUR = 3600000;
  const events = [
    { id: 'training', title: 'SCP — Latihan internal divisi', day: 5, hour: 20, endHour: 22, byDay: 'FR' },
    { id: 'saturday', title: 'SCP — Scrim Sabtu (perlu konfirmasi)', day: 6, hour: 19, byDay: 'SA' },
    { id: 'sunday', title: 'SCP — Scrim Minggu (perlu konfirmasi)', day: 0, hour: 15, endHour: 18, byDay: 'SU' }
  ];
  function nextOccurrence(day, hour, now = new Date()) {
    const wib = new Date(now.getTime() + 7 * HOUR);
    const delta = (day - wib.getUTCDay() + 7) % 7;
    let result = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + delta, hour - 7));
    if (result <= now) result = new Date(result.getTime() + 7 * 24 * HOUR);
    return result;
  }
  function stamp(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function escapeText(value) { return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
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
  function calendar(now = new Date()) {
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SCP Alliance//Weekly Operations//ID','CALSCALE:GREGORIAN','X-WR-CALNAME:SCP Alliance — Jadwal Rutin','X-WR-TIMEZONE:Asia/Jakarta'];
    for (const event of events) {
      const start = nextOccurrence(event.day, event.hour, now);
      lines.push('BEGIN:VEVENT', `UID:scp-${event.id}@scp-alliance.invalid`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`);
      if (event.endHour) lines.push(`DTEND:${stamp(new Date(start.getTime() + (event.endHour - event.hour) * HOUR))}`);
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${event.byDay}`, `SUMMARY:${escapeText(event.title)}`, `DESCRIPTION:${escapeText('Jadwal rutin SCP Alliance dalam WIB. Data terakhir 17 Juli 2026. Wajib konfirmasi melalui Discord. Lawan scrim belum ditentukan. Scrim Sabtu mulai 19.00 WIB sampai selesai; waktu selesai belum ditentukan.')}`, 'LOCATION:Discord SCP Alliance', 'URL:https://discord.gg/R2Ek7V5DS', 'STATUS:TENTATIVE','END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  globalThis.SCPSchedule = Object.freeze({ nextOccurrence, calendar, events });
})();
