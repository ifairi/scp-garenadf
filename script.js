/* ═══════════════════════════════════════════════════════════
   S.C.P — SPECIAL CLASSIFIED PROTOCOL
   Tab-Based Navigation Engine v5.0
   No scroll — panels switch with GSAP transitions
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─── DOM ─── */
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('preloaderProgress');
    const percentText = document.getElementById('preloaderPercent');
    const navLinks = document.querySelectorAll('.nav-link');
    const panels = document.querySelectorAll('.panel');
    const hamburger = document.getElementById('hamburger');
    const mainNav = document.getElementById('mainNav');
    const logoLink = document.getElementById('logoLink');

    let currentPanel = 'hero';
    let isTransitioning = false;
    let gsapReady = typeof gsap !== 'undefined';
    const panelOrder = ['hero', 'about', 'founders', 'objectives', 'scrim'];

    /* ═══════════════════════════════════════════
       1. PRELOADER — Simple setInterval counter
       ═══════════════════════════════════════════ */
    function runPreloader() {
        let pct = 0;
        const interval = setInterval(function () {
            pct += 2;
            if (pct > 100) pct = 100;
            if (progressBar) progressBar.style.width = pct + '%';
            if (percentText) percentText.textContent = pct + '%';

            if (pct >= 100) {
                clearInterval(interval);
                // Show "READY" then exit
                var preText = document.querySelector('.preloader-text');
                if (preText) preText.textContent = 'PROTOCOL READY';

                setTimeout(function () {
                    exitPreloader();
                }, 500);
            }
        }, 30); // 30ms * 50 steps = ~1.5s total
    }

    function exitPreloader() {
        if (gsapReady) {
            gsap.to(preloader, {
                yPercent: -100,
                duration: 0.7,
                ease: 'power3.inOut',
                onComplete: onReady
            });
        } else {
            preloader.style.transition = 'transform 0.7s ease';
            preloader.style.transform = 'translateY(-100%)';
            setTimeout(onReady, 700);
        }
    }

    function onReady() {
        window.__scpReady = true;
        preloader.style.display = 'none';
        initSite();
    }

    /* ═══════════════════════════════════════════
       2. SITE INIT — after preloader done
       ═══════════════════════════════════════════ */
    function initSite() {
        animateHeroEntrance();
        initGridCanvas();
        initVHSGlitch();
        initHUDStatus();
        initHUDCorners();
        initCardGlitch();
        initCardHover();
        animateCounters();
        initNavControls();
        initDossier();
    }

    /* ═══════════════════════════════════════════════
       OPERATIVE DOSSIER — click a member to open file
       ═══════════════════════════════════════════════ */
    var DOSSIER = {
        'SCP-013': {
            name: '[ TXD | WMORI ]', role: 'Assault Squad', clearance: 'CLEARANCE: LEVEL Ω',
            alias: '"The Phantom Strike"',
            unique: 'Selalu mengeksekusi entry pertama tanpa menunggu info caller — gaya "silent breach" yang membuat lawan kehilangan tempo sejak ronde pertama.',
            track: [
                { clan: 'JAC', role: 'Vehicle', year: '2025 – 2025' },
                { clan: 'TREX', role: 'Vehicle', year: '2025 – 2025' },
                { clan: 'NOTS', role: 'Vehicle (Commander)', year: '2025 – 2026' },
                { clan: 'TXDNR', role: 'Vehicle (Commander)', year: '2025 – Now' },
            ],
            strengths: ['Refleks tembak presisi tinggi', 'Penguasaan peta agresif', 'Konsistensi clutch 1vX', 'Spray control elite'],
            stats: [['VEHICLE', 100], ['SHOOTING', 75], ['SURVIVAL', 80], ['CO-OP', 78], ['OBJECTIVE', 65]]
        },
        'SCP-048': {
            name: '[ NOTS 丶Alpin鋼 ]', role: 'Tankerch Sankai', clearance: 'CLEARANCE: LEVEL VII',
            alias: '"Iron Dome Vanguard"',
            unique: 'Mampu menahan berbagai hantaman Rudal Balistik musuh',
            track: [
                { clan: 'NOTS', role: 'Loyality III', year: '2025 – Now' },
                { clan: 'NOTS REBORN DFNC S2', role: 'IGL Squad', year: '2026 – 2026' },
                // { clan: 'S.C.P Alliance', role: 'Tankerch Sankai', year: '2024 – Aktif' }
            ],
            strengths: ['Mampu memaksimalkan kemampuan kendaraan tempur', 'Dapat memprediksi pergerakan kendaraan musuh', 'Siap menjadi badan utama infantry', 'Pelindung sektor vital fraksi'],
            stats: [['VEHICLE', 100], ['SHOOTING', 73], ['SURVIVAL', 70], ['CO-OP', 73], ['OBJECTIVE', 51]]
        },
        'SCP-051': {
            name: '[ RenSCP ]', role: 'The Squadron', clearance: 'CLEARANCE: LEVEL VI',
            alias: '"RRQEVOSNOTSAE"',
            unique: 'Membaca pola rotasi musuh lebih cepat dari siapa pun dan menyusun ulang strategi squad secara real-time.',
            track: [
                { clan: 'WG', role: 'Casual', year: '2025 – 2025' },
                { clan: 'PDR', role: 'Destroyer', year: '2025 – 2025' },
                { clan: 'NOTS', role: 'Flanker', year: '2025 – Now' }
            ],
            strengths: ['Adaptasi peran fleksibel', 'Pembacaan rotasi musuh', 'Eksekusi taktik cepat', 'Komunikasi jernih'],
            stats: [['VEHICLE', 100], ['SHOOTING', 62], ['SURVIVAL', 71], ['CO-OP', 67], ['OBJECTIVE', 60]]
        },
        'SCP-054': {
            name: '[ NOTS 丶NaaSCP54 ]', role: 'Steel Keeper', clearance: 'CLEARANCE: LEVEL VII',
            alias: '"The Bulwark"',
            unique: 'Spesialis hold site — pernah mempertahankan bomb-site sendirian melawan serangan penuh tanpa kehilangan posisi.',
            track: [
                { clan: 'NOTS Squad', role: 'Anchor', year: '2020 – 2023' },
                { clan: 'S.C.P Alliance', role: 'Steel Keeper', year: '2023 – Aktif' }
            ],
            strengths: ['Anchor site tak tergoyahkan', 'Manajemen utility hebat', 'Tembakan defensif akurat', 'Tenang di bawah tekanan'],
            stats: [['VEHICLE', 70], ['SHOOTING', 82], ['SURVIVAL', 95], ['CO-OP', 85], ['OBJECTIVE', 92]]
        },
        'SCP-044': {
            name: '[ NOTS 丶KoazyNXS ]', role: 'Tactical Tanker', clearance: 'CLEARANCE: LEVEL VI',
            alias: '"Breach Hammer"',
            unique: 'Membuka jalan masuk dengan timing utility yang sempurna — gerbang pembuka setiap eksekusi tim.',
            track: [
                { clan: 'NXS Gaming', role: 'Initiator', year: '2021 – 2023' },
                { clan: 'S.C.P Alliance', role: 'Tactical Tanker', year: '2023 – Aktif' }
            ],
            strengths: ['Timing utility presisi', 'Initiator agresif', 'Map control kuat', 'Koordinasi push'],
            stats: [['VEHICLE', 85], ['SHOOTING', 80], ['SURVIVAL', 84], ['CO-OP', 88], ['OBJECTIVE', 90]]
        },
        'SCP-012': {
            name: '[ NOTS 丶Ndan3NXS ]', role: 'The Squadron', clearance: 'CLEARANCE: LEVEL VI',
            alias: '"Twin Blade"',
            unique: 'Bermain berpasangan dengan sinkronisasi nyaris telepatik — dua orang, satu gerakan.',
            track: [
                { clan: 'NXS Gaming', role: 'Duo Support', year: '2021 – 2023' },
                { clan: 'S.C.P Alliance', role: 'The Squadron', year: '2023 – Aktif' }
            ],
            strengths: ['Sinergi duo elite', 'Trade-kill cepat', 'Crossfire disiplin', 'Posisi suportif'],
            stats: [['VEHICLE', 76], ['SHOOTING', 83], ['SURVIVAL', 80], ['CO-OP', 96], ['OBJECTIVE', 84]]
        },
        'SCP-022': {
            name: '[ NOTSJessSCP22 ]', role: 'Engineer', clearance: 'CLEARANCE: LEVEL V',
            alias: '"The Vulcan"',
            unique: 'Bisa mengontrol Loitering di celah yang sempit.',
            track: [
                { clan: 'NOTS', role: 'Suave V', year: '2025 – Now' },
                { clan: 'NOTS', role: 'Engineer Flanker', year: '2025 – Now' }
            ],
            strengths: ['Saat medan perang hancur, aku membangun', 'Saat mesin berhenti, aku menghidupkan', 'Saat harapan padam, aku menempa jalan'],
            stats: [['VEHICLE', 90], ['SHOOTING', 70], ['SURVIVAL', 68], ['CO-OP', 90], ['OBJECTIVE', 60]]
        },
        'SCP-018': {
            name: '[ NOTS 丶FinzNXS ]', role: 'Engineer Support', clearance: 'CLEARANCE: LEVEL V',
            alias: '"Lifeline"',
            unique: 'Selalu hadir di momen kritis untuk menyokong rekan — penopang yang menjaga tim tetap hidup.',
            track: [
                { clan: 'NXS Gaming', role: 'Support', year: '2022 – 2024' },
                { clan: 'S.C.P Alliance', role: 'Engineer Support', year: '2024 – Aktif' }
            ],
            strengths: ['Support timing sempurna', 'Resource management', 'Backup posisi solid', 'Disiplin tim'],
            stats: [['VEHICLE', 82], ['SHOOTING', 73], ['SURVIVAL', 84], ['CO-OP', 93], ['OBJECTIVE', 80]]
        },
        'SCP-017': {
            name: '[ NOTS 丶RimuNXS ]', role: 'Engineer Recon', clearance: 'CLEARANCE: LEVEL V',
            alias: '"The Eye"',
            unique: 'Membaca pergerakan musuh dari jejak sekecil apa pun — radar hidup yang jarang salah.',
            track: [
                { clan: 'NXS Gaming', role: 'Recon', year: '2022 – 2024' },
                { clan: 'S.C.P Alliance', role: 'Engineer Recon', year: '2024 – Aktif' }
            ],
            strengths: ['Intel-gathering tajam', 'Pembacaan minimap', 'Info call akurat', 'Positioning cerdas'],
            stats: [['VEHICLE', 84], ['SHOOTING', 78], ['SURVIVAL', 80], ['CO-OP', 88], ['OBJECTIVE', 90]]
        },
        'SCP-027': {
            name: '[ ICE丨UrYuuVG ]', role: 'Anomaly Recon', clearance: 'CLEARANCE: LEVEL VI',
            alias: '"Cold Specter"',
            unique: 'Bergerak senyap di flank dan muncul dari sudut tak terduga — anomali yang sulit dilacak musuh.',
            track: [
                { clan: 'ICE Esports', role: 'Lurker', year: '2021 – 2023' },
                { clan: 'S.C.P Alliance', role: 'Anomaly Recon', year: '2023 – Aktif' }
            ],
            strengths: ['Flank tak terdeteksi', 'Timing serangan brilian', 'Info denial musuh', 'Clutch lurker'],
            stats: [['VEHICLE', 80], ['SHOOTING', 86], ['SURVIVAL', 88], ['CO-OP', 72], ['OBJECTIVE', 84]]
        },
        'SCP-119': {
            name: '[ SCP°119 ]', role: 'Tactical Mind', clearance: 'CLEARANCE: LEVEL VIII',
            alias: '"The Strategist"',
            unique: 'Otak taktik tim — merancang draft, mid-round call, dan adaptasi anti-strat yang menentukan kemenangan.',
            track: [
                { clan: 'Vanguard Tactics', role: 'In-Game Leader', year: '2019 – 2022' },
                { clan: 'S.C.P Alliance', role: 'Tactical Mind', year: '2022 – Aktif' }
            ],
            strengths: ['Kepemimpinan in-game', 'Strategi & draft jitu', 'Mid-round adaptation', 'Manajemen mental tim'],
            stats: [['VEHICLE', 78], ['SHOOTING', 82], ['SURVIVAL', 85], ['CO-OP', 92], ['OBJECTIVE', 96]]
        },
        'SCP-099': {
            name: '[ SEALxKeenan舎 ]', role: 'Recon Striker', clearance: 'CLEARANCE: LEVEL VI',
            alias: '"Silent Tide"',
            unique: 'Spesialis infiltrasi senyap — masuk lebih dulu, membuka informasi, dan menutup celah sebelum musuh sadar.',
            track: [
                { clan: 'SEAL Division', role: 'Recon', year: '2022 – 2024' },
                { clan: 'S.C.P Alliance', role: 'Recon Striker', year: '2024 – Aktif' }
            ],
            strengths: ['Infiltrasi senyap', 'Pembacaan posisi musuh', 'Eksekusi flank presisi', 'Disiplin info call'],
            stats: [['VEHICLE', 80], ['SHOOTING', 85], ['SURVIVAL', 84], ['CO-OP', 86], ['OBJECTIVE', 88]]
        }
    };

    function buildDossier(d) {
        var track = (d.track || []).map(function (t) {
            return '<li><b>' + t.clan + '</b> — ' + t.role + ' <span>(' + t.year + ')</span></li>';
        }).join('');
        var strengths = (d.strengths || []).map(function (s) { return '<li>' + s + '</li>'; }).join('');
        var stats = (d.stats || []).map(function (st) {
            return '<div class="hud-stat">' +
                '<div class="hud-stat-top"><span>' + st[0] + '</span><b>' + st[1] + '</b></div>' +
                '<div class="hud-stat-bar"><span class="hud-stat-fill" data-val="' + st[1] + '"></span></div>' +
                '</div>';
        }).join('');
        return { track: track, strengths: strengths, stats: stats };
    }

    function initDossier() {
        var modal = document.getElementById('scpDossier');
        if (!modal) return;
        var lastFocus = null;

        function openDossier(id) {
            var d = DOSSIER[id];
            if (!d) return;
            var parts = buildDossier(d);

            document.getElementById('dsFileId').textContent = id;
            var idTagEl = document.getElementById('dsIdTag');
            var nameEl = document.getElementById('dsName');
            idTagEl.textContent = id;
            delete idTagEl.dataset.decodeText;
            delete nameEl.dataset.decodeText;
            document.getElementById('dsClearance').textContent = d.clearance || 'CLEARANCE: LEVEL V';
            document.getElementById('dsName').textContent = d.name;
            document.getElementById('dsRole').textContent = d.role;
            document.getElementById('dsAlias').textContent = d.alias;
            document.getElementById('dsUnique').textContent = d.unique;
            document.getElementById('dsTrack').innerHTML = parts.track;
            document.getElementById('dsStrength').innerHTML = parts.strengths;
            document.getElementById('dsStats').innerHTML = parts.stats;

            // portrait : use d.img if provided, else placeholder
            var portrait = document.getElementById('dsPortrait');
            var existingImg = portrait.querySelector('img');
            if (existingImg) existingImg.remove();
            var ph = portrait.querySelector('.portrait-placeholder');
            if (d.img) {
                if (ph) ph.style.display = 'none';
                var im = document.createElement('img');
                im.src = d.img; im.alt = id;
                portrait.appendChild(im);
            } else if (ph) {
                ph.style.display = '';
            }

            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';

            // animate stat bars after open
            setTimeout(function () {
                modal.querySelectorAll('.hud-stat-fill').forEach(function (f) {
                    f.style.right = (100 - parseInt(f.getAttribute('data-val'), 10)) + '%';
                });
            }, 250);

            // glitch decode key text if available
            if (typeof glitchDecode === 'function') {
                setTimeout(function () { glitchDecode(document.getElementById('dsName'), 350); }, 120);
                setTimeout(function () { glitchDecode(document.getElementById('dsIdTag'), 300); }, 60);
            }
        }

        function closeDossier() {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            modal.querySelectorAll('.hud-stat-fill').forEach(function (f) { f.style.right = '100%'; });
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        // bind member cards
        document.querySelectorAll('.member-card').forEach(function (card) {
            var idEl = card.querySelector('.member-id');
            var id = idEl ? idEl.textContent.trim() : '';
            if (!DOSSIER[id]) return;
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.addEventListener('click', function () { lastFocus = card; openDossier(id); });
            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lastFocus = card; openDossier(id); }
            });
        });

        // close handlers
        modal.querySelectorAll('[data-dossier-close]').forEach(function (el) {
            el.addEventListener('click', closeDossier);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) closeDossier();
        });
    }

    /* ═══════════════════════════════════════════
       3. NAV — Tab Switching (click only)
       ═══════════════════════════════════════════ */
    function setActiveNav(sectionId) {
        navLinks.forEach(function (link) {
            link.classList.remove('active');
        });
        var match = document.querySelector('.nav-link[data-section="' + sectionId + '"]');
        if (match) match.classList.add('active');
    }

    function switchPanel(targetId) {
        if (targetId === currentPanel || isTransitioning) return;
        isTransitioning = true;

        var oldPanel = document.getElementById(currentPanel);
        var newPanel = document.getElementById(targetId);
        if (!oldPanel || !newPanel) { isTransitioning = false; return; }

        setActiveNav(targetId);
        if (newPanel.classList.contains('panel--scrollable')) newPanel.scrollTop = 0;

        if (gsapReady) {
            var dir = (Math.random() > 0.5 ? 1 : -1);

            // Reveal the NEW panel UNDERNEATH the old one, already fully opaque.
            // A complete background is always painted, so there is NO dark void
            // between panels (this removes the "blink"). The new panel never
            // fades opacity and gets no filter, so every card's backdrop-filter
            // blur is live the instant it appears.
            gsap.set(newPanel, { clearProps: 'filter,transform,opacity' });
            newPanel.style.visibility = 'visible';
            newPanel.style.zIndex = '1';
            newPanel.classList.add('panel--active');
            oldPanel.style.zIndex = '2';

            var tl = gsap.timeline({
                onComplete: function () {
                    oldPanel.classList.remove('panel--active');
                    oldPanel.style.cssText = '';
                    newPanel.style.zIndex = '';
                    isTransitioning = false;
                    currentPanel = targetId;
                    updateNavButtons();
                    glitchPanelText(newPanel);
                }
            });

            // Glitch-OUT the old panel on top: harsh RGB / brightness flicker,
            // then a quick slide + fade. Only the OUTGOING panel is filtered.
            tl.to(oldPanel, { filter: 'brightness(1.9) contrast(1.3) hue-rotate(8deg)', x: dir * -7, duration: 0.05, ease: 'none' }, 0)
                .to(oldPanel, { filter: 'brightness(0.45) contrast(1.6) hue-rotate(-12deg)', x: dir * 10, duration: 0.05, ease: 'none' })
                .to(oldPanel, { filter: 'brightness(1.5) contrast(1.2)', x: dir * -4, duration: 0.05, ease: 'none' })
                .to(oldPanel, { opacity: 0, x: dir * 38, filter: 'brightness(2.2) blur(1px)', duration: 0.20, ease: 'power2.in' });

        } else {
            oldPanel.classList.remove('panel--active');
            newPanel.classList.add('panel--active');
            isTransitioning = false;
            currentPanel = targetId;
            updateNavButtons();
        }
    }

    // Attach nav click handlers
    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            var sectionId = link.getAttribute('data-section');
            if (sectionId) switchPanel(sectionId);

            // Close mobile menu
            if (mainNav && mainNav.classList.contains('open')) {
                hamburger.classList.remove('active');
                mainNav.classList.remove('open');
            }
        });
    });

    // Logo click → Beranda
    if (logoLink) {
        logoLink.addEventListener('click', function (e) {
            e.preventDefault();
            switchPanel('hero');
        });
    }

    // CTA / tactical buttons — internal tabs use #hash, external links open normally
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.tactical-btn');
        if (btn) {
            var href = btn.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                switchPanel(href.replace('#', ''));
            }
            // external links (http...) fall through to default navigation
        }
    });

    /* ═══════════════════════════════════════════
       3.5 NAV CONTROLS (Next/Prev)
       ═══════════════════════════════════════════ */
    function updateNavButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (!prevBtn || !nextBtn) return;

        const currentIndex = panelOrder.indexOf(currentPanel);
        prevBtn.disabled = currentIndex <= 0;
        nextBtn.disabled = currentIndex >= panelOrder.length - 1;
    }

    function initNavControls() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (!prevBtn || !nextBtn) return;

        prevBtn.addEventListener('click', function () {
            const currentIndex = panelOrder.indexOf(currentPanel);
            if (currentIndex > 0) {
                switchPanel(panelOrder[currentIndex - 1]);
            }
        });

        nextBtn.addEventListener('click', function () {
            const currentIndex = panelOrder.indexOf(currentPanel);
            if (currentIndex < panelOrder.length - 1) {
                switchPanel(panelOrder[currentIndex + 1]);
            }
        });

        // Set initial state
        updateNavButtons();
    }

    /* ═══════════════════════════════════════════
       4. GLITCH TEXT DECODE
       ═══════════════════════════════════════════ */
    function glitchDecode(element, duration) {
        if (!element) return;
        var chars = '!<>-_\\/[]{}\u2014=+*^?#01\u2591\u2592\u2593\u00a7\u00b1\u00d7\u00f7';
        duration = duration || 350;
        var original = element.dataset.decodeText || element.textContent;
        element.dataset.decodeText = original;
        var start = performance.now();
        element.classList.add('is-glitching');

        function tick(now) {
            var elapsed = now - start;
            var p = Math.min(elapsed / duration, 1);
            var eased = 1 - (1 - p) * (1 - p); // easeOutQuad

            element.textContent = original.split('').map(function (c, i) {
                if (c === ' ' || c === '\n') return c;
                if (eased > (i / original.length) + 0.1) return original[i];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');

            if (p < 1) requestAnimationFrame(tick);
            else { element.textContent = original; element.classList.remove('is-glitching'); }
        }
        requestAnimationFrame(tick);
    }

    /* Digital tear/slice boot-in for shapes (cards) \u2014 keeps backdrop blur intact */
    function glitchShape(card) {
        if (!card) return;
        card.classList.remove('is-shape-glitch');
        // force reflow so the animation re-triggers every visit
        void card.offsetWidth;
        card.classList.add('is-shape-glitch');
        setTimeout(function () { card.classList.remove('is-shape-glitch'); }, 520);
    }

    function glitchPanelText(panel) {
        if (!panel) return;
        var tags = panel.querySelectorAll('.section-tag');
        var titles = panel.querySelectorAll('.section-title');
        var descs = panel.querySelectorAll('.about-card p, .objective-card p, .founder-card .role, .match-versus, .member-role, .member-name, .member-id, .hero-desc, .match-time');
        var headings = panel.querySelectorAll('.about-card h3, .objective-card h3, .founder-card h4, .match-day, .subsection-title');
        var shapes = panel.querySelectorAll('.glass-card');

        tags.forEach(function (el, i) { setTimeout(function () { glitchDecode(el, 320); }, 40 + i * 50); });
        titles.forEach(function (el, i) { setTimeout(function () { glitchDecode(el, 420); }, 130 + i * 50); });
        headings.forEach(function (el, i) { setTimeout(function () { glitchDecode(el, 260); }, 230 + i * 40); });
        descs.forEach(function (el, i) { setTimeout(function () { glitchDecode(el, 240); }, 320 + i * 28); });

        // shapes tear in, staggered (capped so big lists stay snappy)
        shapes.forEach(function (card, i) {
            if (i > 13) return;
            setTimeout(function () { glitchShape(card); }, 60 + i * 55);
        });
    }

    /* ═══════════════════════════════════════════
           5. HERO ENTRANCE
           ═══════════════════════════════════════════ */
    function animateHeroEntrance() {
        if (!gsapReady) return;

        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('#heroTag', { y: 20, opacity: 0, duration: 0.6 })
            .from('.hero-title .title-line', { y: 80, opacity: 0, duration: 1, stagger: 0.2, ease: 'power4.out' }, '-=0.3')
            .from('#heroDesc', { y: 25, opacity: 0, duration: 0.7 }, '-=0.5')
            .from('#heroCta', { y: 25, opacity: 0, duration: 0.6 }, '-=0.4');

        setTimeout(function () {
            var tag = document.getElementById('heroTag');
            if (tag) glitchDecode(tag, 500);
        }, 400);
        setTimeout(function () {
            var desc = document.getElementById('heroDesc');
            if (desc) glitchDecode(desc, 600);
        }, 800);
    }

    /* ═══════════════════════════════════════════
       6. GRID CANVAS
       ═══════════════════════════════════════════ */
    function initGridCanvas() {
        var canvas = document.getElementById('gridCanvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var dots = [];
        var spacing = 40;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            dots = [];
            for (var x = 0; x < canvas.width; x += spacing) {
                for (var y = 0; y < canvas.height; y += spacing) {
                    dots.push({
                        x: x, y: y,
                        a: 0.012 + Math.random() * 0.02,
                        sp: 0.3 + Math.random() * 1.5,
                        off: Math.random() * Math.PI * 2,
                        pulse: Math.random() > 0.88,
                        cross: Math.random() > 0.97
                    });
                }
            }
        }

        function draw(t) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (var i = 0; i < dots.length; i++) {
                var d = dots[i];
                var a = d.a;
                if (d.pulse) a += Math.sin(t * 0.001 * d.sp + d.off) * 0.03;
                if (a <= 0) continue;
                if (d.cross) {
                    ctx.strokeStyle = 'rgba(0,240,255,' + (a * 1.2) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(d.x - 3, d.y); ctx.lineTo(d.x + 3, d.y);
                    ctx.moveTo(d.x, d.y - 3); ctx.lineTo(d.x, d.y + 3);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = 'rgba(200,16,46,' + a + ')';
                    ctx.fillRect(d.x, d.y, 1, 1);
                }
            }
            requestAnimationFrame(draw);
        }

        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(draw);
    }

    /* ═══════════════════════════════════════════
       7. VHS GLITCH
       ═══════════════════════════════════════════ */
    function initVHSGlitch() {
        function trigger() {
            var d = Math.random() > 0.5 ? 1 : -1;
            document.body.style.transform = 'translateX(' + (Math.random() * 3 * d) + 'px)';
            document.body.style.filter = 'hue-rotate(' + (Math.random() * 4) + 'deg)';
            setTimeout(function () {
                document.body.style.transform = '';
                document.body.style.filter = '';
            }, 40 + Math.random() * 60);
            setTimeout(trigger, 4000 + Math.random() * 8000);
        }
        setTimeout(trigger, 5000);
    }

    /* ═══════════════════════════════════════════
       8. CARD VHS GLITCH
       ═══════════════════════════════════════════ */
    function initCardGlitch() {
        var cards = document.querySelectorAll('.glass-card');
        if (!cards.length) return;

        function glitchCard() {
            // Pick a random card from the ACTIVE panel
            var active = document.querySelector('.panel--active');
            if (!active) { setTimeout(glitchCard, 3000); return; }
            var visibleCards = active.querySelectorAll('.glass-card');
            if (!visibleCards.length) { setTimeout(glitchCard, 3000); return; }

            var card = visibleCards[Math.floor(Math.random() * visibleCards.length)];
            card.style.transition = 'none';
            card.style.transform = 'translate(' + ((Math.random() - 0.5) * 6) + 'px,' + ((Math.random() - 0.5) * 3) + 'px) skewX(' + ((Math.random() - 0.5) * 2.5) + 'deg)';
            // RGB-split ghost via dual box-shadow (red / white) — no filter, blur stays intact
            card.style.boxShadow = '-3px 0 0 rgba(255,45,85,0.55), 3px 0 0 rgba(233,236,242,0.45), 0 0 18px rgba(255,45,85,0.15)';
            card.style.borderColor = 'rgba(255,45,85,0.45)';

            setTimeout(function () {
                card.style.transition = 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease';
                card.style.transform = '';
                card.style.boxShadow = '';
                card.style.borderColor = '';
            }, 70 + Math.random() * 90);

            setTimeout(glitchCard, 2000 + Math.random() * 5000);
        }

        setTimeout(glitchCard, 6000);
    }

    /* ═══════════════════════════════════════════
       9. CARD HOVER 3D TILT
       ═══════════════════════════════════════════ */
    function initCardHover() {
        if (!gsapReady) return;
        document.querySelectorAll('.glass-card').forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                var x = e.clientX - rect.left, y = e.clientY - rect.top;
                var cx = rect.width / 2, cy = rect.height / 2;
                gsap.to(card, {
                    rotationX: ((y - cy) / cy) * -4,
                    rotationY: ((x - cx) / cx) * 4,
                    duration: 0.4, ease: 'power2.out',
                    transformPerspective: 800, transformOrigin: 'center center'
                });
            });
            card.addEventListener('mouseleave', function () {
                gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' });
            });
        });
    }

    /* ═══════════════════════════════════════════
       10. HUD STATUS TEXT
       ═══════════════════════════════════════════ */
    function initHUDStatus() {
        var el = document.getElementById('hudStatus');
        if (!el) return;
        var msgs = [
            'SYS: ONLINE // SIGNAL: ACTIVE // PROTOCOL: S.C.P',
            'UPLINK: STABLE // ENCRYPTION: AES-256 // STATUS: ARMED',
            'THREAT LVL: OMEGA // CONTAINMENT: ACTIVE // TEAM: READY',
            'FREQ: 147.3 MHz // LAT: [REDACTED] // LON: [REDACTED]'
        ];
        var idx = 0;
        var chars = '!<>-_\\/[]{}—=+*^?#█▓▒░';
        setInterval(function () {
            idx = (idx + 1) % msgs.length;
            var target = msgs[idx];
            var iter = 0;
            var iv = setInterval(function () {
                el.textContent = target.split('').map(function (c, i) {
                    return i < iter ? c : chars[Math.floor(Math.random() * chars.length)];
                }).join('');
                iter += 2;
                if (iter > target.length) { clearInterval(iv); el.textContent = target; }
            }, 25);
        }, 6000);
    }

    /* ═══════════════════════════════════════════
       11. HUD CORNERS
       ═══════════════════════════════════════════ */
    function initHUDCorners() {
        if (!gsapReady) return;
        document.querySelectorAll('.hud-corner').forEach(function (c, i) {
            gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.1 * i, ease: 'power2.out' });
            gsap.to(c, { opacity: 0.4, duration: 2 + Math.random(), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: Math.random() * 2 });
        });
    }

    /* ═══════════════════════════════════════════
       12. COUNTERS
       ═══════════════════════════════════════════ */
    function animateCounters() {
        document.querySelectorAll('.stat-number').forEach(function (el) {
            var target = parseInt(el.getAttribute('data-target'), 10);
            if (!target) return;
            var current = 0;
            var step = Math.ceil(target / 30);
            var iv = setInterval(function () {
                current += step;
                if (current >= target) { current = target; clearInterval(iv); }
                el.textContent = current;
            }, 50);
        });
    }

    /* ═══════════════════════════════════════════
       13. MOBILE MENU
       ═══════════════════════════════════════════ */
    if (hamburger && mainNav) {
        hamburger.addEventListener('click', function () {
            hamburger.classList.toggle('active');
            mainNav.classList.toggle('open');
        });
    }

    /* ═══════════════════════════════════════════
       START — Run preloader immediately
       ═══════════════════════════════════════════ */
    runPreloader();

})();
