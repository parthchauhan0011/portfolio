(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  /* Theme: light by default, remembered per browser */
  const tBtn = $('#themeToggle');
  const setTheme = (t, save) => {
    root.setAttribute('data-theme', t);
    if (tBtn) {
      tBtn.querySelector('use').setAttribute('href', t === 'dark' ? '#i-sun' : '#i-moon');
      tBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    if (save) { try { localStorage.setItem('theme', t); } catch (e) {} }
  };
  if (tBtn) {
    setTheme(root.getAttribute('data-theme') || 'light', false);
    tBtn.addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));
  }

  /* Full height mobile menu; links arrive one after another, 60ms apart, capped at 400ms */
  const menuBtn = $('#menuBtn'), sheet = $('#sheet');
  if (menuBtn && sheet) {
    const links = $$('nav a', sheet);
    links.forEach((a, i) => { a.style.transitionDelay = Math.min(i * 60, 400) + 'ms'; });
    const setOpen = open => {
      sheet.classList.toggle('open', open);
      sheet.inert = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) links[0] && links[0].focus({ preventScroll: true });
    };
    menuBtn.addEventListener('click', () => setOpen(!sheet.classList.contains('open')));
    $$('a', sheet).forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && sheet.classList.contains('open')) { setOpen(false); menuBtn.focus(); }
    });
    matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
  }

  /* The wordmark's ticks turn "read" once the page has loaded */
  const mt = $('#markTicks');
  if (mt) window.addEventListener('load', () => mt.classList.add('read'));

  /* Scroll reveals: rise and fade in once */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* Current section in the navigation (one page only) */
  const secLinks = $$('[data-sec]').filter(a => a.getAttribute('href').startsWith('#'));
  if (secLinks.length && 'IntersectionObserver' in window) {
    const secs = $$('main section[id]');
    const mark = id => secLinks.forEach(a => a.dataset.sec === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    const sio = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) mark(e.target.dataset.nav || e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => sio.observe(s));
  }

  /* Tagline: words go from muted to full, one at a time, as the section scrolls past a trigger line */
  const tag = $('#tagline');
  if (tag) {
    $$('.ln', tag).forEach(ln => {
      ln.innerHTML = ln.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
    });
    const words = $$('.w', tag);
    const section = tag.closest('.tagline');
    if (!still.matches) {
      section.classList.add('armed');
      let ticking = false;
      const paint = () => {
        ticking = false;
        const r = section.getBoundingClientRect();
        const trigger = innerHeight * 0.6;
        const start = r.top + r.height * 0.2, end = r.bottom - r.height * 0.2;
        const p = Math.min(1, Math.max(0, (trigger - start) / (end - start)));
        const lit = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle('on', i < lit));
      };
      const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll);
      paint();
    }
  }
})();

/* Selected work: on large screens vertical scroll moves the track sideways.
   On phones, short windows or with reduced motion it is a swipeable row. */
(() => {
  const hs = document.querySelector('.hs');
  if (!hs) return;
  const sticky = hs.querySelector('.hs-sticky');
  const track = hs.querySelector('.hs-track');
  const panels = [...track.querySelectorAll('.panel')];
  const bar = hs.querySelector('.hs-progress');
  const count = hs.querySelector('.hs-count');
  const prev = hs.querySelector('.hs-prev');
  const next = hs.querySelector('.hs-next');
  const n = panels.length;
  const pinMq = matchMedia('(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const RATIO = 0.6;
  let pinned = false, maxShift = 0, active = -1, ticking = false;

  const pad = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const runway = () => hs.offsetHeight - sticky.offsetHeight;
  const stickyTop = () => parseFloat(getComputedStyle(sticky).top) || 0;

  function layout() {
    pinned = pinMq.matches;
    hs.classList.toggle('pinned', pinned);
    track.style.transform = '';
    hs.style.height = '';
    if (pinned) {
      const last = panels[n - 1];
      maxShift = Math.max(0, last.offsetLeft + last.offsetWidth - (track.clientWidth - pad()));
      hs.style.height = (sticky.offsetHeight + maxShift * RATIO) + 'px';
    }
    update();
  }
  function progress() {
    if (pinned) {
      const r = runway();
      return r > 0 ? clamp((stickyTop() - hs.getBoundingClientRect().top) / r, 0, 1) : 0;
    }
    const m = track.scrollWidth - track.clientWidth;
    return m > 0 ? clamp(track.scrollLeft / m, 0, 1) : 0;
  }
  function update() {
    ticking = false;
    const p = progress();
    if (pinned) track.style.transform = `translate3d(${-p * maxShift}px,0,0)`;
    const f = p * (n - 1);
    panels.forEach((el, i) => {
      const d = Math.min(1, Math.abs(i - f));
      el.style.setProperty('--o', (1 - d * 0.7).toFixed(3));
      el.style.setProperty('--sc', still.matches ? 1 : (1 - d * 0.03).toFixed(4));
    });
    bar.style.setProperty('--p', ((f + 1) / n).toFixed(4));
    const a = Math.round(f);
    if (a !== active) {
      active = a;
      count.textContent = `${a + 1} of ${n}`;
      prev.disabled = a === 0;
      next.disabled = a === n - 1;
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  function goTo(i, behavior = 'smooth') {
    i = clamp(i, 0, n - 1);
    if (still.matches) behavior = 'auto';
    if (pinned) {
      const top = scrollY + hs.getBoundingClientRect().top - stickyTop();
      scrollTo({ top: top + (i / (n - 1)) * runway() + 1, behavior });
    } else {
      track.scrollTo({ left: panels[i].offsetLeft - pad(), behavior });
    }
  }
  prev.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  hs.addEventListener('keydown', e => {
    if (!e.target.closest('.hs-track,.hs-controls')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
  });
  track.addEventListener('focusin', e => {
    const i = panels.findIndex(p => p.contains(e.target));
    sticky.scrollLeft = 0;
    if (i >= 0 && i !== active) goTo(i, 'auto');
  });
  addEventListener('scroll', onScroll, { passive: true });
  track.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', layout);
  pinMq.addEventListener('change', layout);
  addEventListener('load', layout);
  layout();
})();
