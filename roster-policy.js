/* Shared membership rules for the public site and its admin panel. */
(() => {
  'use strict';
  const clean = (value, length) => String(value ?? '').trim().slice(0, length);
  function normalize(record = {}) {
    const requested = clean(record.roster_type, 24).toLowerCase();
    const scope = clean(record.commitment_scope, 240);
    return {
      // Legacy "pure" describes affiliation, never verified competitive selection.
      roster_type: requested === 'main' && scope ? 'main' : 'alliance',
      clan_origin: clean(record.clan_origin, 120),
      commitment_scope: scope
    };
  }
  function validate(record = {}) {
    if (!['main', 'alliance'].includes(record.roster_type)) return 'Pilih SCP Main Roster atau The Alliance.';
    if (record.roster_type === 'main' && !clean(record.commitment_scope, 240)) {
      return 'Isi periode atau event yang sudah disepakati sebelum menetapkan Main Roster.';
    }
    return '';
  }
  window.SCPRoster = Object.freeze({ normalize, validate });
})();
