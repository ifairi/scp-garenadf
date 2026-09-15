/* Community adapter. The DF map engine and its configuration remain in vendor/. */
window.PTTSendClick = function () {};
window.warMapInfo = undefined;
if (!new URLSearchParams(location.search).has('map')) {
  const url = new URL(location.href);
  url.searchParams.set('map', 'dzcwljd');
  history.replaceState(null, '', url);
}
// Preserve the official rem-based layout at a readable, responsive scale.
function scpMapSizing() {
  document.documentElement.style.fontSize = (innerWidth < 600 ? 74 : innerWidth < 1100 ? 80 : 90) + 'px';
}
scpMapSizing();
addEventListener('resize', scpMapSizing);
