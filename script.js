/* ═══════════════════════════════════════════════════════════
   S.C.P — SPECIAL CLASSIFIED PROTOCOL
   Tab-Based Navigation Engine v5.0
   No scroll — panels switch with GSAP transitions
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─── DOM ─── */
    const preloader    = document.getElementById('preloader');
    const progressBar  = document.getElementById('preloaderProgress');
    const percentText  = document.getElementById('preloaderPercent');
    const navLinks     = document.querySelectorAll('.nav-link');
    const panels       = document.querySelectorAll('.panel');
    const hamburger    = document.getElementById('hamburger');
    const mainNav      = document.getElementById('mainNav');
    const logoLink     = document.getElementById('logoLink');

    let currentPanel   = 'hero';
    let isTransitioning = false;
    let gsapReady      = typeof gsap !== 'undefined';

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

        // Update nav immediately
        setActiveNav(targetId);

        if (gsapReady) {
            // GSAP transition — glitch style
            var tl = gsap.timeline({
                onComplete: function () {
                    oldPanel.classList.remove('panel--active');
                    oldPanel.style.cssText = '';
                    isTransitioning = false;
                    currentPanel = targetId;
                    // Glitch decode text in new panel
                    glitchPanelText(newPanel);
                }
            });

            // Glitch-out old panel
            tl.to(oldPanel, {
                opacity: 0,
                x: (Math.random() > 0.5 ? 1 : -1) * 30,
                filter: 'brightness(2) hue-rotate(10deg)',
                duration: 0.15,
                ease: 'power2.in'
            })
            .to(oldPanel, {
                opacity: 0,
                duration: 0.05,
            });

            // Prepare new panel
            tl.set(newPanel, {
                visibility: 'visible',
                opacity: 0,
                x: (Math.random() > 0.5 ? 1 : -1) * 20,
                filter: 'brightness(1.5) hue-rotate(-5deg)',
                zIndex: 2
            });

            // Show new panel with class
            tl.call(function () {
                newPanel.classList.add('panel--active');
            });

            // Glitch-in new panel
            tl.to(newPanel, {
                opacity: 1,
                x: 0,
                filter: 'brightness(1) hue-rotate(0deg)',
                duration: 0.3,
                ease: 'power2.out'
            });

            // Clean up
            tl.set(newPanel, { clearProps: 'filter,x,zIndex' });
            tl.set(oldPanel, { visibility: 'hidden', zIndex: '' });

        } else {
            // No GSAP fallback
            oldPanel.classList.remove('panel--active');
            newPanel.classList.add('panel--active');
            isTransitioning = false;
            currentPanel = targetId;
        }

        // Reset scroll for scrollable panels
        if (newPanel.classList.contains('panel--scrollable')) {
            newPanel.scrollTop = 0;
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

    // CTA button → switch to about
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.tactical-btn');
        if (btn) {
            e.preventDefault();
            var href = btn.getAttribute('href');
            if (href && href.startsWith('#')) {
                switchPanel(href.replace('#', ''));
            }
        }
    });

    /* ═══════════════════════════════════════════
       4. GLITCH TEXT DECODE
       ═══════════════════════════════════════════ */
    function glitchDecode(element, duration) {
        var chars = '!<>-_\\/[]{}—=+*^?#░▒▓';
        duration = duration || 350;
        var original = element.textContent;
        var start = performance.now();

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
            else element.textContent = original;
        }
        requestAnimationFrame(tick);
    }

    function glitchPanelText(panel) {
        var tags = panel.querySelectorAll('.section-tag');
        var titles = panel.querySelectorAll('.section-title');
        var descs = panel.querySelectorAll('.about-card p, .objective-card p, .founder-card .role, .match-versus, .member-role, .hero-desc');
        var headings = panel.querySelectorAll('.about-card h3, .objective-card h3, .founder-card h4, .match-day, .subsection-title');

        tags.forEach(function (el, i) { setTimeout(function () { glitchDecode(el, 300); }, 50 + i * 50); });
        titles.forEach(function (el, i) { setTimeout(function () { glitchDecode(el, 400); }, 150 + i * 50); });
        headings.forEach(function (el, i) { setTimeout(function () { glitchDecode(el, 250); }, 250 + i * 40); });
        descs.forEach(function (el, i) { setTimeout(function () { glitchDecode(el, 250); }, 350 + i * 30); });
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
            card.style.transform = 'translateX(' + ((Math.random() - 0.5) * 8) + 'px) skewX(' + ((Math.random() - 0.5) * 3) + 'deg)';
            card.style.filter = 'hue-rotate(' + (Math.random() * 15) + 'deg) brightness(' + (1 + Math.random() * 0.2) + ')';
            card.style.borderColor = 'rgba(0,240,255,0.4)';

            setTimeout(function () {
                card.style.transition = 'all 0.3s ease';
                card.style.transform = '';
                card.style.filter = '';
                card.style.borderColor = '';
            }, 60 + Math.random() * 80);

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
