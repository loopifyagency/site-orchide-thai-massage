/* =====================================================================
   ORCHIDÉE THAI MASSAGE — comportements & animations
   GSAP + ScrollTrigger + Lenis (tout est auto-hébergé dans assets/vendor).
   Principe : le contenu est lisible sans JS ; les états de départ des
   animations ne sont posés que ici, et jamais si l'utilisateur préfère
   un mouvement réduit.
   ===================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var lenis = null;
  var menuOpen = false;

  /* ------------------------------------------------------------------
     Horaires & statut « ouvert maintenant » (heure de Paris)
     ------------------------------------------------------------------ */
  var SCHEDULE = { 0: [13, 19], 1: [10, 19], 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [10, 19] };
  var NBSP = ' ';

  function parisNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: map[o.weekday], h: parseInt(o.hour, 10) % 24, m: parseInt(o.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), h: d.getHours(), m: d.getMinutes() };
    }
  }

  function updateStatus() {
    var n = parisNow();
    var s = SCHEDULE[n.day];
    var t = n.h + n.m / 60;
    var open = false, text;
    if (t >= s[0] && t < s[1]) {
      open = true;
      text = 'Ouvert maintenant · jusqu’à ' + s[1] + NBSP + 'h';
    } else if (t < s[0]) {
      text = 'Fermé · ouvre à ' + s[0] + NBSP + 'h';
    } else {
      var nd = (n.day + 1) % 7;
      text = 'Fermé · réouvre demain à ' + SCHEDULE[nd][0] + NBSP + 'h';
    }
    $$('.status').forEach(function (el) { el.classList.toggle('is-closed', !open); });
    $$('[data-status]').forEach(function (el) { el.textContent = text; });
    $$('.hours tr').forEach(function (tr) { tr.classList.toggle('is-today', parseInt(tr.dataset.day, 10) === n.day); });
  }

  /* ------------------------------------------------------------------
     Découpage de texte
     ------------------------------------------------------------------ */
  function splitWords(el) {
    var spans = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          child.textContent.split(/( +)/).forEach(function (tok) {
            if (!tok) return;
            if (/^ +$/.test(tok)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span'); w.className = 'sw';
            var i = doc.createElement('span'); i.textContent = tok;
            w.appendChild(i); frag.appendChild(w); spans.push(i);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
    return spans;
  }

  function splitChars(el) {
    var text = el.textContent;
    el.textContent = '';
    var line = doc.createElement('span');
    line.className = 'line';
    var chars = [];
    for (var i = 0; i < text.length; i++) {
      var s = doc.createElement('span');
      s.className = 'ch';
      s.textContent = text[i] === ' ' ? NBSP : text[i];
      line.appendChild(s);
      chars.push(s);
    }
    el.appendChild(line);
    el.classList.add('chars');
    return chars;
  }

  /* ------------------------------------------------------------------
     Éléments qui n'ont pas besoin de GSAP
     ------------------------------------------------------------------ */
  function initMenu() {
    var burger = $('#burger'), menu = $('#menu');
    if (!burger || !menu) return;

    function setMenu(open) {
      menuOpen = open;
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) { menu.removeAttribute('inert'); } else { menu.setAttribute('inert', ''); }
      if (lenis) { open ? lenis.stop() : lenis.start(); }
      else { root.style.overflow = open ? 'hidden' : ''; }
      if (open) { $('#nav').classList.remove('is-hidden'); }
    }
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); }
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    window.addEventListener('resize', function () { if (menuOpen && window.innerWidth > 1100) setMenu(false); });
  }

  function initFaq() {
    $$('.faq__item').forEach(function (item) {
      var btn = $('.faq__q', item), panel = $('.faq__a', item);
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        $$('.faq__item.is-open').forEach(function (o) {
          if (o !== item) {
            o.classList.remove('is-open');
            $('.faq__q', o).setAttribute('aria-expanded', 'false');
            $('.faq__a', o).setAttribute('inert', '');
          }
        });
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) { panel.removeAttribute('inert'); } else { panel.setAttribute('inert', ''); }
        if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 650);
      });
    });
  }

  function initReviews() {
    var rv = $('#rv'), viewport = $('#rvViewport'), track = $('#rvTrack');
    if (!rv || !track) return;
    var cards = $$('.rv-card', track);
    var dotsWrap = $('#rvDots');
    var btnPrev = $('#rvPrev'), btnNext = $('#rvNext'), btnPlay = $('#rvPlay');
    var idx = 0, userPaused = reduce, hover = false, focusIn = false, visible = false, baseX = 0;
    var dots = [];

    if (reduce) { rv.classList.add('no-auto'); btnPlay.hidden = true; }

    cards.forEach(function (c, i) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'rv__dot';
      b.setAttribute('aria-label', 'Avis ' + (i + 1) + ' sur ' + cards.length);
      b.innerHTML = '<i></i>';
      b.addEventListener('click', function () { go(i); });
      dotsWrap.appendChild(b); dots.push(b);
    });

    function layout() {
      var c = cards[idx];
      baseX = viewport.clientWidth / 2 - (c.offsetLeft + c.offsetWidth / 2);
      track.style.transform = 'translate3d(' + baseX + 'px,0,0)';
    }
    function go(i) {
      idx = (i + cards.length) % cards.length;
      cards.forEach(function (c, k) { c.classList.toggle('is-active', k === idx); });
      dots.forEach(function (d, k) { if (k === idx) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      layout();
    }
    function updatePause() {
      rv.classList.toggle('is-paused', userPaused || hover || focusIn || !visible);
    }

    btnPrev.addEventListener('click', function () { go(idx - 1); });
    btnNext.addEventListener('click', function () { go(idx + 1); });
    btnPlay.addEventListener('click', function () {
      userPaused = !userPaused;
      btnPlay.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      btnPlay.setAttribute('aria-label', userPaused ? 'Reprendre le défilement automatique' : 'Mettre le défilement en pause');
      btnPlay.firstElementChild.firstElementChild.setAttribute('href', userPaused ? '#i-play' : '#i-pause');
      updatePause();
    });

    /* l'avis suivant arrive quand la jauge du point actif est pleine */
    dotsWrap.addEventListener('animationend', function (e) {
      if (e.animationName === 'rvfill') go(idx + 1);
    });

    rv.addEventListener('mouseenter', function () { hover = true; updatePause(); });
    rv.addEventListener('mouseleave', function () { hover = false; updatePause(); });
    rv.addEventListener('focusin', function () { focusIn = true; updatePause(); });
    rv.addEventListener('focusout', function () { focusIn = false; updatePause(); });
    rv.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; updatePause(); }, { threshold: 0.25 }).observe(rv);
    }

    /* glisser / balayer */
    var down = false, startX = 0, dx = 0, pid = null;
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; startX = e.clientX; dx = 0; pid = e.pointerId;
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== pid) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) {
        track.classList.add('is-drag');
        try { viewport.setPointerCapture(pid); } catch (err) { /* noop */ }
        track.style.transform = 'translate3d(' + (baseX + dx) + 'px,0,0)';
      }
    });
    function end(e) {
      if (!down || (e && e.pointerId !== pid)) return;
      down = false;
      track.classList.remove('is-drag');
      if (Math.abs(dx) > 60) { go(idx + (dx < 0 ? 1 : -1)); } else { layout(); }
      dx = 0;
    }
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);

    go(0);
    var rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(layout, 120); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
    window.addEventListener('load', layout);
  }

  function initButtonsFill() {
    $$('.btn').forEach(function (b) {
      function setPos(e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--x', (e.clientX - r.left) + 'px');
        b.style.setProperty('--y', (e.clientY - r.top) + 'px');
      }
      b.addEventListener('pointerenter', setPos);
      b.addEventListener('pointerleave', setPos);
    });
  }

  /* ------------------------------------------------------------------
     Navigation : ancres, masquage au scroll, barre de progression
     ------------------------------------------------------------------ */
  var nav = $('#nav'), fab = $('#fab'), topbar = null, sen = null;

  function scrollToTarget(target) {
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target === 0 ? 0 : target, { offset: 0, duration: 1.8, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    } else {
      var top = target === 0 ? 0 : target.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      a.addEventListener('click', function (e) {
        var t = id === '#top' ? 0 : $(id);
        if (t === null) return;
        e.preventDefault();
        scrollToTarget(t);
        if (history.replaceState) history.replaceState(null, '', id);
      });
    });
  }

  function buildSen() {
    sen = {
      svg: $('#sen'), track: $('#senTrack'), fill: $('#senFill'), bead: $('#senBead'), len: 1
    };
    topbar = doc.createElement('div');
    topbar.className = 'topbar'; topbar.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(topbar);
    if (!sen.svg) return;
    var H = sen.svg.clientHeight || 500;
    if (!H) return;
    sen.svg.setAttribute('viewBox', '0 0 24 ' + H);
    var d = [];
    for (var y = 0; y <= H; y += 5) {
      var x = 12 + Math.sin((y / H) * Math.PI * 9) * 6;
      d.push((y ? 'L' : 'M') + x.toFixed(1) + ' ' + y);
    }
    var dd = d.join(' ');
    sen.track.setAttribute('d', dd);
    sen.fill.setAttribute('d', dd);
    sen.len = sen.fill.getTotalLength() || 1;
    sen.fill.style.strokeDasharray = sen.len;
    sen.fill.style.strokeDashoffset = sen.len;
  }

  var lastY = 0;
  function updateChrome(y, p) {
    var down = y > lastY;
    if (Math.abs(y - lastY) > 2) {
      if (nav && !menuOpen) nav.classList.toggle('is-hidden', y > 260 && down);
      lastY = y;
    }
    if (fab) fab.classList.toggle('is-on', y > window.innerHeight * 0.7);
    if (topbar) topbar.style.transform = 'scaleX(' + p + ')';
    if (sen && sen.fill && sen.len > 1) {
      sen.fill.style.strokeDashoffset = sen.len * (1 - p);
      var pt = sen.fill.getPointAtLength(sen.len * p);
      sen.bead.setAttribute('cx', pt.x);
      sen.bead.setAttribute('cy', pt.y);
    }
  }

  /* ------------------------------------------------------------------
     Démarrage
     ------------------------------------------------------------------ */
  function boot() {
    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    updateStatus();
    setInterval(updateStatus, 60000);
    initMenu();
    initFaq();
    initReviews();
    initButtonsFill();
    buildSen();
    initAnchors();

    var hasGsap = !!(window.gsap && window.ScrollTrigger);

    if (reduce || !hasGsap) {
      /* version allégée : pas de loader, pas d'animation, mêmes contenus */
      var l = $('#loader'); if (l) l.remove();
      $$('.stat__viz--days span').forEach(function (d) { d.classList.add('on'); });
      root.classList.remove('is-loading');
      if (!hasGsap) { root.classList.remove('js'); }
      var tick = function () {
        var h = doc.documentElement.scrollHeight - window.innerHeight;
        var y = window.pageYOffset;
        updateChrome(y, h > 0 ? Math.min(1, y / h) : 0);
      };
      window.addEventListener('scroll', tick, { passive: true });
      tick();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* Lenis : défilement fluide, branché sur ScrollTrigger */
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 0.95 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }

    /* progression de lecture + menu qui se cache */
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) { updateChrome(self.scroll(), self.progress); }
    });

    prepareStates();
    runLoader();
  }

  /* états de départ (posés seulement ici, donc jamais sans JS) */
  var heroChars = [];
  function prepareStates() {
    $$('.hero [data-chars]').forEach(function (el) { heroChars.push(splitChars(el)); });
    gsap.set(heroChars[0] || [], { yPercent: 118, rotate: 7 });
    gsap.set(heroChars[1] || [], { yPercent: 118, rotate: 4 });
    gsap.set('[data-hero-in]', { autoAlpha: 0, y: 34 });
    gsap.set('#heroFrame', { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set('.hp__m', { autoAlpha: 0, scale: 0 });
    gsap.set('.badge', { scale: 0 });
  }

  /* ------------------------------------------------------------------
     Préchargeur : l'orchidée s'ouvre, puis le rideau monte
     ------------------------------------------------------------------ */
  function runLoader() {
    var loader = $('#loader');
    var num = $('#loaderNum');
    var obj = { v: 0 };
    var lp = $$('.lp');
    gsap.set(lp, { scale: 0, opacity: 0, rotation: -24 });

    var loadDone = new Promise(function (res) {
      if (doc.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true });
    });
    var fontsDone = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (res) { setTimeout(res, 4500); });
    var ready = Promise.race([Promise.all([loadDone, fontsDone]), timeout]);

    var tl = gsap.timeline();
    tl.to(lp, { scale: 1, opacity: 1, rotation: 0, duration: 1.05, ease: 'back.out(1.8)', stagger: 0.13 }, 0.1)
      .to(obj, { v: 100, duration: 1.8, ease: 'power2.inOut', onUpdate: function () { num.textContent = Math.round(obj.v); } }, 0)
      .to('.loader__name', { y: -4, duration: 0.6, ease: 'power2.out' }, 0.2);
    tl.eventCallback('onComplete', function () { ready.then(exit); });

    function exit() {
      var out = gsap.timeline({ onComplete: finish });
      out.to('.loader__inner', { y: -50, opacity: 0, duration: 0.55, ease: 'power3.in' })
         .to(loader, { yPercent: -118, duration: 1.15, ease: 'expo.inOut' }, '-=0.15')
         .add(playIntro, '-=0.8');
    }
    function finish() {
      if (loader) loader.remove();
      root.classList.remove('is-loading');
      if (lenis) lenis.start();
      initAnimations();
      ScrollTrigger.refresh();
    }
  }

  /* ------------------------------------------------------------------
     Intro du hero
     ------------------------------------------------------------------ */
  function playIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(heroChars[0] || [], { yPercent: 0, rotate: 0, duration: 1.6, stagger: 0.055 }, 0)
      .to(heroChars[1] || [], { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.035 }, 0.28)
      .to('[data-hero-in]', { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.11 }, 0.5)
      .to('#heroFrame', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.7, ease: 'expo.inOut' }, 0.1)
      .fromTo('#heroFrame img', { scale: 1.45 }, { scale: 1.04, duration: 2.8 }, 0.1)
      .to('.hp__m', { autoAlpha: 1, scale: 1, duration: 1.7, ease: 'back.out(1.5)', stagger: 0.12 }, 0.25)
      .to('.badge', { scale: 1, rotation: 0, duration: 1.3, ease: 'back.out(1.8)' }, 1.0);
    tl.eventCallback('onComplete', function () {
      gsap.to('#heroFrame img', { scale: 1.13, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
  }

  /* ------------------------------------------------------------------
     Toutes les animations pilotées par le scroll
     ------------------------------------------------------------------ */
  function initAnimations() {
    heroMotion();
    marquees();
    revealText();
    imageMotion();
    stats();
    footerGiant();
    microInteractions();

    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', function () {
      storyPinned();
      horizontalSoins();
    });
    mm.add('(max-width: 899px)', function () {
      storyStacked();
    });
  }

  /* --- hero : parallax multicouche + souris --- */
  function heroMotion() {
    var hero = $('.hero');
    $$('[data-parallax]', hero).forEach(function (el) {
      var speed = parseFloat(el.dataset.parallax);
      gsap.to(el, {
        y: function () { return speed * hero.offsetHeight; }, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
      });
    });
    gsap.to('.mandala', { rotation: 360, duration: 160, ease: 'none', repeat: -1 });
    gsap.to('.hp--1 .orchid', { rotation: 7, y: 16, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    $$('.hp .leaf').forEach(function (l, i) {
      gsap.to(l, { y: (i % 2 ? -1 : 1) * (14 + i * 4), rotation: (i % 2 ? -1 : 1) * 25, duration: 3.5 + i * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });

    if (fine) {
      var layers = $$('[data-depth]', hero).map(function (el) {
        return {
          d: parseFloat(el.dataset.depth),
          x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' })
        };
      });
      hero.addEventListener('pointermove', function (e) {
        var nx = (e.clientX / window.innerWidth - 0.5) * 2;
        var ny = (e.clientY / window.innerHeight - 0.5) * 2;
        layers.forEach(function (l) { l.x(-nx * l.d); l.y(-ny * l.d); });
      });
    }
  }

  /* --- bandeaux : vitesse & sens liés au scroll --- */
  function marquees() {
    var tweens = $$('[data-mq]').map(function (track) {
      var dir = parseFloat(track.dataset.mq);
      var tw = dir > 0
        ? gsap.to(track, { xPercent: -50, ease: 'none', duration: 34, repeat: -1 })
        : gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, ease: 'none', duration: 40, repeat: -1 });
      return tw;
    });
    var flip = 1, boost = 1, boostT = 1;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        flip = self.direction || 1;
        boostT = 1 + Math.min(Math.abs(self.getVelocity()) / 380, 5);
      }
    });
    var cur = 1;
    gsap.ticker.add(function () {
      boostT += (1 - boostT) * 0.05;
      boost += (boostT - boost) * 0.1;
      cur += (flip * boost - cur) * 0.08;
      tweens.forEach(function (tw) { tw.timeScale(cur); });
    });
    /* arrête le travail quand les bandeaux sont hors écran */
    ScrollTrigger.create({
      trigger: '.marquees', start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { tweens.forEach(function (tw) { self.isActive ? tw.resume() : tw.pause(); }); }
    });
  }

  /* --- titres mot par mot, éléments qui apparaissent --- */
  function revealText() {
    $$('[data-split="words"]').forEach(function (el) {
      var words = splitWords(el);
      gsap.set(words, { yPercent: 118, rotate: 3 });
      var inH = !!el.closest('.hscroll');
      ScrollTrigger.create({
        trigger: inH ? '.soins' : el, start: inH ? 'top 55%' : 'top 86%', once: true,
        onEnter: function () { gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 }); }
      });
    });

    var plain = $$('[data-fade]').filter(function (el) { return !el.closest('.hscroll'); });
    gsap.set(plain, { autoAlpha: 0, y: 40 });
    ScrollTrigger.batch(plain, {
      start: 'top 90%', once: true,
      onEnter: function (batch) { gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12 }); }
    });
    var inScroll = $$('.hscroll [data-fade]');
    if (inScroll.length) {
      gsap.set(inScroll, { autoAlpha: 0, y: 40 });
      ScrollTrigger.create({
        trigger: '.soins', start: 'top 50%', once: true,
        onEnter: function () { gsap.to(inScroll, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.25 }); }
      });
    }
  }

  /* --- images : parallax interne + révélations par masque --- */
  function imageMotion() {
    $$('.gallery .px').forEach(function (px) {
      gsap.fromTo(px, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: px.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    $$('[data-reveal]').forEach(function (el) {
      var frame = $('.frame', el);
      var px = $('.px', el);
      var kind = el.dataset.reveal;
      var from = kind === 'circle' ? 'circle(0% at 50% 55%)' : 'inset(100% 0% 0% 0%)';
      var to = kind === 'circle' ? 'circle(78% at 50% 55%)' : 'inset(0% 0% 0% 0%)';
      gsap.set(frame, { clipPath: from });
      if (px) gsap.set(px, { scale: 1.3 });
      ScrollTrigger.create({
        trigger: el, start: 'top 84%', once: true,
        onEnter: function () {
          gsap.to(frame, { clipPath: to, duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath' });
          if (px) gsap.to(px, { scale: 1, duration: 1.9, ease: 'expo.out' });
        }
      });
    });
  }

  /* --- chiffres clés --- */
  function stats() {
    var nums = $$('[data-count]');
    nums.forEach(function (n) { n.textContent = '0'; });
    var days = $$('.stat__viz--days span');
    var ring = $('.ring-fg');
    var petals = $$('.stat__viz--petals svg');
    var RL = 327, RT = RL * (1 - 60 / 168), rv = { v: RL };
    if (ring) { ring.style.strokeDasharray = RL; ring.style.strokeDashoffset = RL; }
    gsap.set(petals, { scale: 0, rotation: -70 });

    ScrollTrigger.create({
      trigger: '.stats__grid', start: 'top 80%', once: true,
      onEnter: function () {
        nums.forEach(function (n, i) {
          var to = parseFloat(n.dataset.to);
          var o = { v: 0 };
          gsap.to(o, { v: to, duration: 2.4, delay: i * 0.15, ease: 'power2.out', onUpdate: function () { n.textContent = Math.round(o.v); } });
        });
        days.forEach(function (d, i) { setTimeout(function () { d.classList.add('on'); }, 250 + i * 190); });
        if (ring) gsap.to(rv, { v: RT, duration: 2.4, delay: 0.15, ease: 'power3.out', onUpdate: function () { ring.style.strokeDashoffset = rv.v; } });
        gsap.to(petals, { scale: 1, rotation: 0, duration: 1, ease: 'back.out(2.2)', stagger: 0.14, delay: 0.3 });
      }
    });
  }

  /* --- footer --- */
  function footerGiant() {
    var el = $('#footerGiant');
    if (!el) return;
    var chars = splitChars(el);
    gsap.set(chars, { yPercent: 112 });
    ScrollTrigger.create({
      trigger: el, start: 'top 94%', once: true,
      onEnter: function () { gsap.to(chars, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: 0.06 }); }
    });
  }

  /* --- micro-interactions (pointeur fin uniquement) --- */
  function microInteractions() {
    if (!fine) return;

    /* boutons magnétiques */
    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease: 'elastic.out(1,0.5)' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease: 'elastic.out(1,0.5)' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.32);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.42);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });

    /* inclinaison 3D + reflet qui suit la souris */
    $$('[data-tilt]').forEach(function (el) {
      var target = $('.card__in', el) || el;
      var glare = $('.card__glare', el);
      var max = el.classList.contains('card') ? 11 : 5;
      gsap.set(target, { transformPerspective: 900 });
      var rx = gsap.quickTo(target, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      var ry = gsap.quickTo(target, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      var gx = glare ? gsap.quickTo(glare, 'x', { duration: 0.35, ease: 'power3.out' }) : null;
      var gy = glare ? gsap.quickTo(glare, 'y', { duration: 0.35, ease: 'power3.out' }) : null;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 2 * max);
        rx(-(py - 0.5) * 2 * max);
        if (glare) {
          gx(px * r.width); gy(py * r.height);
          gsap.to(glare, { opacity: 1, duration: 0.3, overwrite: 'auto' });
        }
      });
      el.addEventListener('pointerleave', function () {
        rx(0); ry(0);
        if (glare) gsap.to(glare, { opacity: 0, duration: 0.5, overwrite: 'auto' });
      });
    });

    /* curseur pétale */
    var c = $('#cursor');
    if (c) {
      var cx = gsap.quickTo(c, 'x', { duration: 0.45, ease: 'power3' });
      var cy = gsap.quickTo(c, 'y', { duration: 0.45, ease: 'power3' });
      var cr = gsap.quickTo(c, 'rotation', { duration: 0.7, ease: 'power3' });
      var lx = 0;
      window.addEventListener('pointermove', function (e) {
        c.classList.add('is-on');
        cx(e.clientX); cy(e.clientY);
        cr(Math.max(-60, Math.min(60, (e.clientX - lx) * 2)));
        lx = e.clientX;
      }, { passive: true });
      doc.addEventListener('pointerover', function (e) {
        c.classList.toggle('is-link', !!e.target.closest('a,button,[data-tilt]'));
      });
      doc.addEventListener('mouseleave', function () { c.classList.remove('is-on'); });
    }
  }

  /* ------------------------------------------------------------------
     Section pinnée « Le rituel » (≥ 900 px)
     ------------------------------------------------------------------ */
  function storyPinned() {
    var story = $('#story');
    if (!story) return;
    var steps = $$('.step', story);
    var imgs = $$('.story__img', story);
    var kbs = imgs.map(function (i) { return $('.kb', i); });
    var n = steps.length;
    var now = $('#storyNow');

    gsap.set(steps, { autoAlpha: 0, y: 60 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });
    imgs.forEach(function (im, i) { gsap.set(im, { clipPath: i === 0 ? 'circle(150% at 50% 62%)' : 'circle(0% at 50% 62%)' }); });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: story, start: 'top top', end: '+=' + (n * 85) + '%', pin: true, scrub: 0.7, anticipatePin: 1,
        onUpdate: function (self) {
          var k = Math.min(n, Math.floor(self.progress * n + 0.0001) + 1);
          var s = String(k); if (now) now.textContent = '0' + s;
        }
      }
    });
    tl.fromTo('.story__bar i', { scaleX: 0 }, { scaleX: 1, duration: n }, 0);
    kbs.forEach(function (kb, i) {
      tl.fromTo(kb, { scale: 1.22 }, { scale: 1.02, duration: 1.4 }, Math.max(0, i - 0.35));
    });
    for (var i = 1; i < n; i++) {
      tl.to(steps[i - 1], { autoAlpha: 0, y: -60, duration: 0.3, ease: 'power2.in' }, i - 0.3)
        .to(imgs[i], { clipPath: 'circle(150% at 50% 62%)', duration: 0.6, ease: 'power2.inOut' }, i - 0.35)
        .fromTo(steps[i], { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, i);
    }
    tl.to({}, { duration: 0.01 }, n);
    gsap.fromTo('.story__orchid', { rotation: 6 }, {
      rotation: 28, ease: 'none',
      scrollTrigger: { trigger: story, start: 'top top', end: '+=' + (n * 85) + '%', scrub: true }
    });
  }

  /* version mobile du rituel : étapes empilées qui apparaissent */
  function storyStacked() {
    $$('.step').forEach(function (s) {
      gsap.from(s.children, {
        y: 50, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: s, start: 'top 82%', once: true }
      });
    });
  }

  /* ------------------------------------------------------------------
     Défilement horizontal « Les soins » (≥ 900 px)
     ------------------------------------------------------------------ */
  function horizontalSoins() {
    var wrap = $('#hscroll'), track = $('#hsTrack');
    if (!wrap || !track) return;
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: wrap, start: 'top top', end: function () { return '+=' + dist(); },
        pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true
      }
    });
    $$('.card, .hs-end', track).forEach(function (card) {
      gsap.from(card, {
        y: 90, rotation: 3, autoAlpha: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 96%', toggleActions: 'play none none reverse' }
      });
    });
    $$('.card__ic', track).forEach(function (ic) {
      gsap.to(ic, {
        rotation: 10, y: -6, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1
      });
    });
  }


  /* ------------------------------------------------------------------ */
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
