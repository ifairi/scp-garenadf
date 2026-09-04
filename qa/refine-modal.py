from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('  <link rel="stylesheet" href="style.css">','  <link rel="preload" href="assets/fonts/p-med.woff" as="font" type="font/woff" crossorigin>\n  <link rel="preload" href="assets/fonts/p-bold.woff" as="font" type="font/woff" crossorigin>\n  <link rel="stylesheet" href="style.css">')
a=s.index('  <dialog class="dossier"')
b=s.index('</dialog>',a)+len('</dialog>')
s=s[:a]+'''  <dialog class="dossier" id="scpDossier" aria-labelledby="dsName">
    <div class="dossier-signal" aria-hidden="true"></div>
    <div class="dossier-topbar"><span>PERSONNEL FILE <b id="dsFileId"></b></span><button class="dossier-close" id="dossierClose" aria-label="Tutup profil">✕</button></div>
    <div class="dossier-body">
      <div class="dossier-identity">
        <div class="dossier-portrait" id="dsPortrait"></div>
        <span class="eyebrow" id="dsClearance"></span>
        <h2 id="dsName"></h2>
        <p id="dsRole"></p>
        <p id="dsAlias"></p>
      </div>
      <div class="dossier-details">
        <section class="dossier-block dossier-stats" aria-labelledby="dsStatsTitle">
          <div class="stats-heading"><div><p class="eyebrow">COMBAT PERFORMANCE</p><h3 id="dsStatsTitle">Statistik player</h3></div><span aria-hidden="true">05 / METRICS</span></div>
          <div id="dsStats"></div>
          <p class="stats-note">Profil internal komunitas, bukan statistik resmi game.</p>
        </section>
        <div class="dossier-block"><h3>OPERATOR INTEL</h3><p id="dsUnique"></p></div>
        <div class="dossier-block"><h3>TRACK RECORD</h3><ul id="dsTrack"></ul></div>
        <div class="dossier-block"><h3>CORE STRENGTHS</h3><ul id="dsStrengths"></ul></div>
      </div>
    </div>
  </dialog>'''+s[b:]
p.write_text(s,encoding='utf-8')
