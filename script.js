/* =========================================================
   MEEM landing page: interactions
   ========================================================= */
(() => {
  'use strict';

  /* ---------- SETTINGS (edit these) ---------- */
  const DONATION_RATE = 0.02;   // illustrative donation share (0.02 = 2%)

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const root = document.documentElement;

  /* ---------- 1. LOADER + REVEAL START ---------- */
  document.body.classList.add('lock');
  let started = false;
  function start() {
    if (started) return;
    started = true;
    $('.loader')?.classList.add('out');
    root.classList.add('ready');
    document.body.classList.remove('lock');
    initReveal();
    setTimeout(() => $('.loader')?.remove(), 1400);
    setTimeout(() => { layoutTimeline(); onScroll(); }, 100);
  }
  addEventListener('load', () => setTimeout(start, reduce ? 0 : 2300));
  setTimeout(start, 4500); // safety net

  /* ---------- 2. SCROLL REVEAL (staggered) ---------- */
  function initReveal() {
    $$('[data-stagger]').forEach(group => {
      [...group.children].forEach((c, i) => {
        c.setAttribute('data-reveal', '');
        c.style.setProperty('--d', (i * 0.09) + 's');
      });
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));

    // counters
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(el => cio.observe(el));
  }

  function countUp(el) {
    const to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const fmt = n => pre + Math.round(n).toLocaleString('en-US') + suf;
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 2200;
    (function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- 3. MOBILE MENU ---------- */
  const menu = $('#menu'), burger = $('#burger');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('lock', open);
    if (open) $('#menuClose').focus(); else if (started) burger.blur();
  }
  burger.addEventListener('click', () => setMenu(true));
  $('#menuClose').addEventListener('click', () => setMenu(false));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

   /* ---------- 4. HERO PARALLAX ---------- */
  const stage = $('.stage');
  if (stage && fine && !reduce) {
    const lays = $$('.lay', stage);
    const area = $('.hero');
    area.addEventListener('mousemove', e => {
      const x = e.clientX / innerWidth - 0.5;
      const y = e.clientY / innerHeight - 0.5;
      lays.forEach(l => {
        const d = +l.dataset.depth || 1;
        l.style.setProperty('--px', (x * -40 * d) + 'px');
        l.style.setProperty('--py', (y * -40 * d) + 'px');
      });
    });
    area.addEventListener('mouseleave', () =>
      lays.forEach(l => { l.style.removeProperty('--px'); l.style.removeProperty('--py'); }));
  }

  /* ---------- 5. CURSOR DOT + MAGNETIC BUTTONS ---------- */
  const cur = $('.cursor');
  if (cur && fine && !reduce) {
    let x = 0, y = 0, tx = 0, ty = 0;
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('show'); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('show'));
    (function loop() {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      cur.style.transform = `translate3d(${x}px,${y}px,0)`;
      requestAnimationFrame(loop);
    })();
    $$('a,button,input,.panel').forEach(el => {
      el.addEventListener('mouseenter', () => cur.classList.add('big'));
      el.addEventListener('mouseleave', () => cur.classList.remove('big'));
    });
    $$('.btn').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- 6. CATEGORY PANELS ---------- */
  const panels = $$('.panel');
  panels.forEach(p => {
    const on = () => panels.forEach(x => x.classList.toggle('active', x === p));
    p.addEventListener('mouseenter', on);
    p.addEventListener('focus', on);
    p.addEventListener('click', on);
  });

    /* ---------- 6b. ARCADE: draggable 3D category carousel ---------- */
  const rig = $('#rig');
  if (rig) {
    const cyl = $('#cyl'), wins = $$('.win', cyl), n = wins.length, step = 360 / n;
    const cap = $('#cap'), capName = $('#capName'), capText = $('#capText'), dotsEl = $('#adots');
    let R = 300, angle = 0, target = 0, active = -1, dragging = false;
    let startX = 0, startA = 0, lastX = 0, lastT = 0, vel = 0, downWin = null;
    let hover = false, visible = false, lastTouch = 0, raf = 0;
    const mod = (a, m) => ((a % m) + m) % m;
    const k = () => step / (wins[0].offsetWidth * 0.9);   // degrees per dragged pixel

    // dots
    const dots = wins.map((w, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show ' + $('h3', w).textContent);
      b.addEventListener('click', () => { lastTouch = Date.now(); goTo(i); });
      dotsEl.appendChild(b);
      return b;
    });

    // place every window around the ring
    function layout() {
      const w = wins[0].offsetWidth;
      R = (w / 2) / Math.tan(Math.PI / n) + Math.max(18, w * 0.08);
      wins.forEach((el, i) => { el.style.transform = `rotateY(${i * step}deg) translateZ(${R}px)`; });
      kick();
    }
    function setActive(i) {
      if (i === active) return;
      const first = active === -1;
      active = i;
      wins.forEach((w, j) => w.classList.toggle('front', j === i));
      dots.forEach((d, j) => d.classList.toggle('on', j === i));
      capName.textContent = $('h3', wins[i]).textContent;
      capText.textContent = $('p', wins[i]).textContent;
      if (!first) { cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap'); }
    }
    function frame() {
      if (!dragging) angle += (target - angle) * (reduce ? 1 : 0.085);
      cyl.style.transform = `translateZ(${-R}px) rotateY(${-angle}deg)`;
      setActive(mod(Math.round(angle / step), n));
      raf = (dragging || Math.abs(target - angle) > 0.02) ? requestAnimationFrame(frame) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    function go(d) { target = (Math.round(target / step) + d) * step; kick(); }
    function goTo(i) {                                       // shortest way round
      const cur = Math.round(target / step);
      const diff = mod(i - cur + n / 2, n) - n / 2;
      target = (cur + diff) * step; kick();
    }

    // drag / swipe
    rig.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; lastTouch = Date.now();
      startX = lastX = e.clientX; startA = angle; vel = 0; lastT = performance.now();
      downWin = e.target.closest('.win');
      rig.classList.add('drag');
      rig.setPointerCapture?.(e.pointerId);
      kick();
    });
    rig.addEventListener('pointermove', e => {
      if (!dragging) return;
      const now = performance.now(), dt = Math.max(now - lastT, 1);
      angle = startA - (e.clientX - startX) * k();
      vel = 0.8 * vel + 0.2 * (-(e.clientX - lastX) * k() / dt);
      lastX = e.clientX; lastT = now;
    });
    const release = e => {
      if (!dragging) return;
      dragging = false; rig.classList.remove('drag');
      if (Math.abs(e.clientX - startX) < 6 && downWin) {
        goTo(wins.indexOf(downWin));                          // tap a window to bring it forward
      } else {
        const fling = Math.max(-step * 1.5, Math.min(step * 1.5, vel * 260));
        target = Math.round((angle + fling) / step) * step;   // inertia, then snap
      }
      downWin = null; kick();
    };
    rig.addEventListener('pointerup', release);
    rig.addEventListener('pointercancel', release);

    // keyboard + buttons
    rig.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); lastTouch = Date.now(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); lastTouch = Date.now(); go(1); }
    });
    $('#aPrev').addEventListener('click', () => { lastTouch = Date.now(); go(-1); });
    $('#aNext').addEventListener('click', () => { lastTouch = Date.now(); go(1); });

    // mouse parallax + hover pause (desktop)
    if (fine && !reduce) {
      rig.addEventListener('mouseenter', () => { hover = true; });
      rig.addEventListener('mouseleave', () => { hover = false; rig.style.removeProperty('--ox'); });
      rig.addEventListener('mousemove', e => {
        const r = rig.getBoundingClientRect();
        rig.style.setProperty('--ox', ((e.clientX - r.left) / r.width - 0.5) * -120 + 'px');
      });
    }

    // gentle autoplay while visible and untouched
    if (!reduce) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.3 }).observe(rig);
      setInterval(() => {
        if (visible && !dragging && !hover && Date.now() - lastTouch > 5000 && !rig.matches(':focus-visible')) go(1);
      }, 3400);
    }

    addEventListener('resize', layout);
    document.fonts?.ready.then(layout);
    layout();
  }
  /* ---------- 7. HOW IT WORKS TIMELINE ---------- */
  const steps = $('.steps');
  const stepEls = $$('.step');
  const path = $('.wave .prog');
  const desktop = matchMedia('(min-width:960px)');
  let L = 0, ys = [];

  function lenAtY(y) {               // path length where the curve reaches y (viewBox units)
    let lo = 0, hi = L;
    for (let i = 0; i < 22; i++) {
      const m = (lo + hi) / 2;
      path.getPointAtLength(m).y < y ? lo = m : hi = m;
    }
    return lo;
  }
  function layoutTimeline() {
    if (!steps) return;
    if (!desktop.matches) {
      stepEls.forEach(s => { const d = $('.dot', s); d.style.left = ''; d.style.top = ''; });
      return;
    }
    L = path.getTotalLength();
    const W = steps.offsetWidth, H = steps.offsetHeight;
    ys = stepEls.map(s => {
      const cy = (s.offsetTop + s.offsetHeight / 2) / H * 1000;
      const pt = path.getPointAtLength(lenAtY(cy));
      const d = $('.dot', s);
      d.style.left = (pt.x / 1000 * W - s.offsetLeft - 9) + 'px';
      d.style.top = (s.offsetHeight / 2 - 9) + 'px';
      return cy;
    });
  }
  function updateTimeline() {
    if (!steps) return;
    const r = steps.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
    steps.style.setProperty('--p', p);
    if (desktop.matches && L) {
      path.style.strokeDashoffset = 1 - lenAtY(p * 1000) / L;
      stepEls.forEach((s, i) => s.classList.toggle('on', p * 1000 >= ys[i] - 10));
    } else {
      stepEls.forEach(s => s.classList.toggle('on', s.getBoundingClientRect().top < vh * 0.65));
    }
  }

  /* ---------- 8. DONATION SLIDER ---------- */
  const range = $('#amount');
  if (range) {
    const fill = $('#jarFill');
    const upd = () => {
      const v = +range.value;
      $('#amt').textContent = v;
      $('#don').textContent = (v * DONATION_RATE).toFixed(2);
      $('#rate').textContent = (DONATION_RATE * 100) + '%';
      fill.style.transform = `scaleY(${Math.max(0.06, v / +range.max)})`;
      range.style.setProperty('--fill', ((v - range.min) / (range.max - range.min) * 100) + '%');
    };
    range.addEventListener('input', upd);
    upd();
  }

  /* ---------- 9. FAQ ACCORDION ---------- */
  const items = $$('.faq-item');
  items.forEach(it => {
    const b = $('.q', it);
    b.addEventListener('click', () => {
      const open = !it.classList.contains('open');
      items.forEach(o => { o.classList.remove('open'); $('.q', o).setAttribute('aria-expanded', 'false'); });
      it.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- 10. WAITLIST FORM (simulated) ---------- */
  const form = $('#waitlist');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#email'), err = $('#err');
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    if (!valid) {
      err.textContent = 'Please enter a valid email address.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    err.textContent = '';
    input.removeAttribute('aria-invalid');
    $('.cta').classList.add('done');   // TODO: send input.value to your backend or email tool here
  });

  /* ---------- 11. SCROLL HANDLER (progress, nav, parallax) ---------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, h = root.scrollHeight - innerHeight;
      $('.nav').classList.toggle('scrolled', y > 30);
      $('.progress').style.transform = `scaleX(${h > 0 ? y / h : 0})`;
      if (!reduce) {
        if (stage && y < innerHeight * 1.2) stage.style.setProperty('--sy', (y * 0.07) + 'px');
        const imp = $('.impact');
        if (imp) imp.style.setProperty('--py2', (imp.getBoundingClientRect().top * -0.08) + 'px');
      }
      updateTimeline();
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { layoutTimeline(); onScroll(); });
  desktop.addEventListener?.('change', () => { layoutTimeline(); onScroll(); });
  document.fonts?.ready.then(() => { layoutTimeline(); onScroll(); });

  /* ---------- 12. MISC ---------- */
  $('#year').textContent = new Date().getFullYear();
  if (reduce) $$('svg').forEach(s => s.pauseAnimations && s.pauseAnimations());
  onScroll();
})();