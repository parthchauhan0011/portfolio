(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Nav, progress bar, active link ---------- */
  const nav = $('#nav'), bar = $('#progressBar'), toggle = $('#navToggle'), links = $('#navLinks');
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    bar.style.width = (p * 100) + '%';
    nav.classList.toggle('scrolled', h.scrollTop > 20);
    updateTimeline();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    links.classList.toggle('open', !open);
    nav.classList.toggle('menu-open', !open);
    document.body.style.overflow = open ? '' : 'hidden';
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
    nav.classList.remove('menu-open');
    document.body.style.overflow = '';
  }));

  const sections = $$('main section[id]');
  const navObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        $$('a', links).forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => navObs.observe(s));

  /* ---------- Cursor glow ---------- */
  const glow = $('#glow');
  if (finePointer && !reduced) {
    let gx = 0, gy = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    const loop = () => { gx += (tx - gx) * .12; gy += (ty - gy) * .12; glow.style.left = gx + 'px'; glow.style.top = gy + 'px'; requestAnimationFrame(loop); };
    loop();
  } else glow.remove();

  /* ---------- Reveal on scroll ---------- */
  const revObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revObs.unobserve(e.target); } });
  }, { threshold: .14 });
  $$('.reveal').forEach(el => revObs.observe(el));

  /* ---------- Count up ---------- */
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || '';
      countObs.unobserve(el);
      if (reduced) { el.textContent = end + suf; return; }
      const t0 = performance.now(), dur = 1400;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.textContent = v + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countObs.observe(el));

  /* ---------- Hero rotator ---------- */
  const rot = $('#rotator');
  const phrases = ['who builds the proof before the pitch', 'designing agentic AI agents', 'turning field insight into product', 'connecting CRMs, ERPs and APIs', 'making sales teams faster', 'architecting solutions end to end'];
  let ri = 0;
  if (!reduced) setInterval(() => {
    rot.classList.add('out');
    setTimeout(() => { ri = (ri + 1) % phrases.length; rot.textContent = phrases[ri]; rot.classList.remove('out'); }, 350);
  }, 3200);

  /* ---------- Theme toggle ---------- */
  const root = document.documentElement, tBtn = $('#themeToggle');
  const setTheme = t => {
    root.setAttribute('data-theme', t);
    tBtn.innerHTML = t === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    tBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    try { localStorage.setItem('theme', t); } catch (e) {}
  };
  setTheme(root.getAttribute('data-theme') || 'dark');
  tBtn.addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

  /* ---------- Interactive chat ---------- */
  const body = $('#chatBody'), replies = $('#chatReplies'), status = $('#chatStatus');
  const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
  const addMsg = (who, html) => {
    const m = document.createElement('div');
    m.className = 'msg ' + who; m.innerHTML = html;
    body.appendChild(m); body.scrollTop = body.scrollHeight;
  };
  const typeThen = async (html, ms = 900) => {
    status.textContent = 'typing…';
    const t = document.createElement('div'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(t); body.scrollTop = body.scrollHeight;
    await wait(ms); t.remove(); status.textContent = 'online';
    addMsg('me', html);
  };
  const answers = {
    'So what do you do?': ['I’m a Senior Solutions Engineer. When a deal needs technical proof, I’m the one on the call.', 'I map how your team works, design the solution across your systems, build a working version on your data and hand delivery a clean plan. That’s why most of my PoCs close.'],
    'Any product impact?': ['Yes! 4+ problems I picked up from customers have turned into platform features.', 'The latest two went live in Sep 2026. <a href="#shipped">Here’s how they happened</a>'],
    'What have you built?': ['AI agents for e-commerce, healthcare, travel and real estate, a voice AI sales agent, CRM and ERP integrations, and pricing tools the whole sales team uses.', '<a href="#build">Have a look</a>'],
    'Can I get your resume?': ['Sure, <a href="./assets/Parth_Chauhan_Resume_2026.pdf" target="_blank" rel="noopener">here’s the PDF</a>.', 'Or just email me at <a href="mailto:parth.chauhan0011@gmail.com">parth.chauhan0011@gmail.com</a>. I reply fast.']
  };
  let busy = false;
  const showReplies = () => {
    replies.innerHTML = '';
    Object.keys(answers).forEach((q, i) => {
      const b = document.createElement('button');
      b.className = 'reply'; b.type = 'button'; b.textContent = q; b.style.animationDelay = (i * 60) + 'ms';
      b.addEventListener('click', () => ask(q));
      replies.appendChild(b);
    });
  };
  const ask = async q => {
    if (busy) return; busy = true;
    addMsg('them', q);
    for (const a of answers[q]) await typeThen(a, 700 + Math.min(900, a.length * 6));
    busy = false;
  };
  (async () => {
    await wait(900);
    addMsg('them', 'Hey Parth, can this actually work with our CRM and ERP?');
    await typeThen('Yep, connecting systems is most of my week 😄', 900);
    await typeThen('Tell me how your team works today and I’ll build a working version you can try before our next call.', 1300);
    showReplies();
  })();

  /* ---------- Tools logo wall ---------- */
  // Brand icons from Simple Icons v16.33.0, inlined so they render everywhere (file://, GitHub Pages, any browser).
  const LOGOS = {"googleappsscript": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M12.363 2.54a3.136 3.136 0 0 0-.376.022 2.864 2.864 0 0 0-1.589.828c-.562.58-.82 1.115-.773 1.943-.01.264.193 1.023.272 1.274 1.115 3.546 2.09 6.75 3.26 10.279.08.246.168.486.267.72.02.047.035.046.048-.004.077-.297.174-.612.29-.945.894-2.576 1.772-5.14 2.633-7.696a.345.345 0 0 0 .004-.217 163.054 163.054 0 0 0-1.49-4.572 2.603 2.603 0 0 0-.704-.933c-.55-.46-1.166-.694-1.842-.7Zm9.078.117a2.734 2.734 0 0 0-2.878 1.828l-4.576 13.289a2.734 2.734 0 0 0 1.695 3.475l.12.04a2.734 2.734 0 0 0 3.475-1.694L23.85 6.307a2.734 2.734 0 0 0-1.695-3.476c-.233-.1-.506-.124-.716-.174ZM12.375 3.96a1.396 1.396 0 1 1 0 2.791 1.395 1.395 0 0 1 0-2.79zm8.809.07a1.402 1.402 0 1 1 0 2.803 1.402 1.402 0 0 1 0-2.803zM5.419 7.605a2.853 2.853 0 0 0-.468.052 2.683 2.683 0 0 0-1.337.627 2.62 2.62 0 0 0-.924 1.833 3.808 3.808 0 0 0 0 .648 2.52 2.52 0 0 0 .673 1.52c.221.238.465.454.732.648 3.043 2.21 6.08 4.43 9.108 6.664a.78.78 0 0 0 .158.089c.03-.043.032-.098.007-.167a17.409 17.409 0 0 0-.317-1.066 532.752 532.752 0 0 1-2.02-6.251 41.91 41.91 0 0 0-.497-1.477c-.967-.849-2.078-1.6-3.023-2.302A3.848 3.848 0 0 0 6.153 7.7a2.388 2.388 0 0 0-.734-.094Zm.02 1.424a1.398 1.398 0 1 1 0 2.796 1.398 1.398 0 0 1 0-2.796zm-2.458 6.792c-.733-.006-1.375.202-1.927.622a2.72 2.72 0 0 0-.95 1.45 2.78 2.78 0 0 0-.09 1.04 2.74 2.74 0 0 0 .695 1.583c.664.578 1.26.85 2 .945 1.42-.005 2.84-.012 4.262-.02h.418c2.277-.003 4.513-.002 6.706.003.148.005.28.003.392-.01.06-.005.091-.031.092-.077a10.656 10.656 0 0 0-.834-.653 488.746 488.746 0 0 1-6.57-4.815.236.236 0 0 0-.14-.047c-1.34-.003-2.691-.01-4.054-.02zm-.19 1.418a1.402 1.402 0 1 1 0 2.803 1.402 1.402 0 0 1 0-2.803zm13.874.002a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z\"/></svg>", "googlesheets": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6h6l-6-6zm1.363 10.636h-3.41v1.91h3.41v-1.91zm0 3.273h-3.41v1.91h3.41v-1.91zM20.727 6.5v15.864c0 .904-.732 1.636-1.636 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.318v6.5h6.5zm-3.273 2.773H6.545v7.909h10.91v-7.91zm-6.136 4.636H7.91v1.91h3.41v-1.91z\"/></svg>", "hubspot": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z\"/></svg>", "jira": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z\"/></svg>", "looker": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M11.9475 0c-1.1598.0021-2.0982.944-2.096 2.1038a2.1 2.1 0 00.356 1.166l.895-.8959a.884.884 0 11.565.564l-.895.895c.9593.6478 2.2621.3953 2.91-.564.6478-.9593.3953-2.262-.564-2.91A2.096 2.096 0 0011.9475 0zm-.835 6.1128a3.2629 3.2629 0 00-.653-1.965l-1.164 1.162a1.667 1.667 0 01-.318 2.012l.632 1.5449a3.2819 3.2819 0 001.503-2.754zm-3.2499 1.666h-.03c-.9217.0009-1.6697-.7455-1.6707-1.6673-.001-.9217.7454-1.6697 1.6672-1.6707a1.669 1.669 0 01.9195.275l1.152-1.152c-1.4069-1.141-3.4724-.9257-4.6135.4811s-.9257 3.4723.481 4.6135a3.2799 3.2799 0 002.7275.6652l-.633-1.5439v-.001zm4.1279 1.3359c-.728 0-1.452.106-2.15.315l.922 2.2519c2.6872-.6819 5.4184.9438 6.1002 3.631.6818 2.6873-.9439 5.4184-3.6311 6.1002s-5.4184-.9439-6.1002-3.631c-.5682-2.2394.4655-4.5774 2.5041-5.6643l-.91-2.2449c-3.6908 1.808-5.2173 6.2657-3.4093 9.9567l.0005.001c1.808 3.6909 6.2657 5.2173 9.9567 3.4093l.001-.0005c3.6913-1.8071 5.2187-6.2645 3.4116-9.9558a7.4417 7.4417 0 00-6.6865-4.1696h-.008l-.001.001z\"/></svg>", "make": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M13.38 3.498c-.27 0-.511.19-.566.465L9.85 18.986a.578.578 0 0 0 .453.678l4.095.826a.58.58 0 0 0 .682-.455l2.963-15.021a.578.578 0 0 0-.453-.678l-4.096-.826a.589.589 0 0 0-.113-.012zm-5.876.098a.576.576 0 0 0-.516.318L.062 17.697a.575.575 0 0 0 .256.774l3.733 1.877a.578.578 0 0 0 .775-.258l6.926-13.781a.577.577 0 0 0-.256-.776L7.762 3.658a.571.571 0 0 0-.258-.062zm11.74.115a.576.576 0 0 0-.576.576v15.426c0 .318.258.578.576.578h4.178a.58.58 0 0 0 .578-.578V4.287a.578.578 0 0 0-.578-.576Z\"/></svg>", "meta": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z\"/></svg>", "n8n": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223c.2804 1.0896 1.2696 1.8947 2.4467 1.8947 1.1772 0 2.1663-.8051 2.4468-1.8947h1.0008a1.263 1.263 0 0 1 1.2459 1.0555l.1038.623c.203 1.218 1.257 2.111 2.492 2.111h.3692c.2804 1.0895 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263c-1.1772 0-2.1664.805-2.4468 1.8947h-.3692a1.263 1.263 0 0 1-1.246-1.0555l-.1037-.623A2.52 2.52 0 0 0 13.9607 12a2.52 2.52 0 0 0 .821-1.4794l.1038-.623a1.263 1.263 0 0 1 1.2459-1.0555h2.8955c.2805 1.0896 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263m0 1.2632a1.263 1.263 0 0 1 1.2631 1.2631 1.263 1.263 0 0 1-1.2631 1.2632 1.263 1.263 0 0 1-1.2632-1.2632 1.263 1.263 0 0 1 1.2632-1.2631M2.5263 10.7368A1.263 1.263 0 0 1 3.7895 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 1.2632 12a1.263 1.263 0 0 1 1.2631-1.2632m6.3158 0A1.263 1.263 0 0 1 10.1053 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 7.579 12a1.263 1.263 0 0 1 1.2632-1.2632m10.1053 3.7895a1.263 1.263 0 0 1 1.2631 1.2632 1.263 1.263 0 0 1-1.2631 1.2631 1.263 1.263 0 0 1-1.2632-1.2631 1.263 1.263 0 0 1 1.2632-1.2632\"/></svg>", "razorpay": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z\"/></svg>", "shopify": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z\"/></svg>", "whatsapp": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z\"/></svg>", "zapier": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M4.157 0A4.151 4.151 0 0 0 0 4.161v15.678A4.151 4.151 0 0 0 4.157 24h15.682A4.152 4.152 0 0 0 24 19.839V4.161A4.152 4.152 0 0 0 19.839 0H4.157Zm10.61 8.761h.03a.577.577 0 0 1 .23.038.585.585 0 0 1 .201.124.63.63 0 0 1 .162.431.612.612 0 0 1-.162.435.58.58 0 0 1-.201.128.58.58 0 0 1-.23.042.529.529 0 0 1-.235-.042.585.585 0 0 1-.332-.328.559.559 0 0 1-.038-.235.613.613 0 0 1 .17-.431.59.59 0 0 1 .405-.162Zm2.853 1.572c.03.004.061.004.095.004.325-.011.646.064.937.219.238.144.431.355.552.609.128.279.189.582.185.888v.193a2 2 0 0 1 0 .219h-2.498c.003.227.075.45.204.642a.78.78 0 0 0 .646.265.714.714 0 0 0 .484-.136.642.642 0 0 0 .23-.318l.915.257a1.398 1.398 0 0 1-.28.537c-.14.159-.321.284-.521.355a2.234 2.234 0 0 1-.836.136 1.923 1.923 0 0 1-1.001-.245 1.618 1.618 0 0 1-.665-.703 2.221 2.221 0 0 1-.227-1.036 1.95 1.95 0 0 1 .48-1.398 1.9 1.9 0 0 1 1.3-.488Zm-9.607.023c.162.004.325.026.48.079.207.065.4.174.563.314.26.302.393.692.366 1.088v2.276H8.53l-.109-.711h-.065c-.064.163-.155.31-.272.439a1.122 1.122 0 0 1-.374.264 1.023 1.023 0 0 1-.453.083 1.334 1.334 0 0 1-.866-.264.965.965 0 0 1-.329-.801.993.993 0 0 1 .076-.431 1.02 1.02 0 0 1 .242-.363 1.478 1.478 0 0 1 1.043-.303h.952v-.181a.696.696 0 0 0-.136-.454.553.553 0 0 0-.438-.154.695.695 0 0 0-.378.086.48.48 0 0 0-.193.254l-.99-.144a1.26 1.26 0 0 1 .257-.563c.14-.174.321-.302.533-.378.261-.091.54-.136.82-.129.053-.003.106-.007.163-.007Zm4.384.007c.174 0 .347.038.506.114.182.083.34.211.458.374.257.423.377.911.351 1.406a2.53 2.53 0 0 1-.355 1.448 1.148 1.148 0 0 1-1.009.517c-.204 0-.401-.045-.582-.136a1.052 1.052 0 0 1-.48-.457 1.298 1.298 0 0 1-.114-.234h-.045l.004 1.784h-1.059v-4.713h.904l.117.805h.057c.068-.208.177-.401.328-.56a1.129 1.129 0 0 1 .843-.344h.076v-.004Zm7.559.084h.903l.113.805h.053a1.37 1.37 0 0 1 .235-.484.813.813 0 0 1 .313-.242.82.82 0 0 1 .39-.076h.234v1.051h-.401a.662.662 0 0 0-.313.008.623.623 0 0 0-.272.155.663.663 0 0 0-.174.26.683.683 0 0 0-.027.314v1.875h-1.054v-3.666Zm-17.515.003h3.262v.896L3.73 13.104l.034.113h1.973l.042.9H2.4v-.9l1.931-1.754-.045-.117H2.441v-.896Zm11.815 0h1.055v3.659h-1.055V10.45Zm3.443.684.019.016a.69.69 0 0 0-.351.045.756.756 0 0 0-.287.204c-.11.155-.174.336-.189.522h1.545c-.034-.526-.257-.787-.74-.787h.003Zm-5.718.163c-.026 0-.057 0-.083.004a.78.78 0 0 0-.31.053.746.746 0 0 0-.257.189 1.016 1.016 0 0 0-.204.695v.064c-.015.257.057.507.204.711a.634.634 0 0 0 .253.196.638.638 0 0 0 .314.061.644.644 0 0 0 .578-.265c.14-.223.204-.48.189-.74a1.216 1.216 0 0 0-.181-.711.677.677 0 0 0-.503-.257Zm-4.509 1.266a.464.464 0 0 0-.268.102.373.373 0 0 0-.114.276c0 .053.008.106.027.155a.375.375 0 0 0 .087.132.576.576 0 0 0 .397.11v.004a.863.863 0 0 0 .563-.182.573.573 0 0 0 .211-.457v-.14h-.903Z\"/></svg>", "zendesk": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M12.914 2.904V16.29L24 2.905H12.914zM0 2.906C0 5.966 2.483 8.45 5.543 8.45s5.542-2.484 5.543-5.544H0zm11.086 4.807L0 21.096h11.086V7.713zm7.37 7.84c-3.063 0-5.542 2.48-5.542 5.543H24c0-3.06-2.48-5.543-5.543-5.543z\"/></svg>", "zoho": "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M8.66 6.897a1.299 1.299 0 0 0-1.205.765l-.642 1.44-.062-.385A1.291 1.291 0 0 0 5.27 7.648l-4.185.678A1.291 1.291 0 0 0 .016 9.807l.678 4.18a1.293 1.293 0 0 0 1.27 1.087c.074 0 .143-.01.216-.017l4.18-.678c.436-.07.784-.351.96-.723l2.933 1.307a1.304 1.304 0 0 0 .988.026c.321-.12.575-.365.716-.678l.28-.629.038.276a1.297 1.297 0 0 0 1.455 1.103l3.712-.501a1.29 1.29 0 0 0 1.03.514h4.236c.713 0 1.29-.58 1.291-1.291V9.545c0-.712-.58-1.291-1.291-1.291h-4.236c-.079 0-.155.008-.23.022a1.309 1.309 0 0 0-.275-.288c-.275-.21-.614-.3-.958-.253l-4.197.571c-.155.021-.3.07-.432.14L9.159 7.01a1.27 1.27 0 0 0-.499-.113zm-.025.705c.077 0 .159.013.24.052l2.971 1.324c-.128.238-.18.508-.142.782l.357 2.596h.002l-.745 1.672a.59.59 0 0 1-.777.296l-3.107-1.385-.004-.041-.41-2.526L8.1 7.95a.589.589 0 0 1 .536-.348zm-3.159.733c.125 0 .245.039.343.112.13.09.21.227.237.382l.234 1.446-.56 1.259a1.27 1.27 0 0 0-.026.987c.12.322.364.575.678.717l.295.131a.585.585 0 0 1-.428.314l-4.185.678a.59.59 0 0 1-.674-.485l-.678-4.18a.588.588 0 0 1 .485-.674l4.185-.678c.03-.004.064-.01.094-.01zm11.705.09a.59.59 0 0 1 .415.173 1.287 1.287 0 0 0-.416.947v4.237c0 .033.003.065.005.097l-3.55.482a.586.586 0 0 1-.66-.502l-.191-1.403.899-2.017a1.29 1.29 0 0 0-.333-1.5l3.754-.51c.026-.004.051-.004.077-.004zm1.3.532h4.227c.326 0 .588.266.588.588v4.237a.589.589 0 0 1-.588.588h-4.237a.564.564 0 0 1-.12-.013c.47-.246.758-.765.684-1.318zm-5.988.309.254.113c.296.133.43.48.296.777l-.432.97-.207-1.465a.58.58 0 0 1 .09-.395zm5.39.538.453 3.325a.583.583 0 0 1-.453.65zM6.496 11.545l.17 1.052a.588.588 0 0 1-.293-.776zm3.985 4.344a.588.588 0 0 0-.612.603c0 .358.244.61.601.61a.582.582 0 0 0 .607-.608c0-.35-.242-.605-.596-.605zm5.545 0a.588.588 0 0 0-.612.603c0 .358.245.61.602.61a.582.582 0 0 0 .606-.608c0-.35-.24-.605-.596-.605zm-8.537.018a.047.047 0 0 0-.048.047v.085c0 .026.021.047.048.047h.52l-.623.9a.052.052 0 0 0-.009.027v.027c0 .026.021.047.048.047h.815a.047.047 0 0 0 .047-.047v-.085a.047.047 0 0 0-.047-.047h-.55l.606-.9a.05.05 0 0 0 .008-.026v-.028a.047.047 0 0 0-.047-.047zm5.303 0a.047.047 0 0 0-.047.047v1.086c0 .026.02.047.047.047h.135a.047.047 0 0 0 .047-.047v-.454h.545v.454c0 .026.02.047.047.047h.134a.047.047 0 0 0 .047-.047v-1.086a.047.047 0 0 0-.047-.047h-.134a.047.047 0 0 0-.047.047v.453h-.545v-.453a.047.047 0 0 0-.047-.047zm-2.324.164c.25 0 .372.194.372.425 0 .219-.109.425-.358.426-.242 0-.375-.197-.375-.419 0-.235.108-.432.36-.432zm5.545 0c.25 0 .372.194.372.425 0 .219-.108.425-.358.426-.242 0-.374-.197-.374-.419 0-.235.108-.432.36-.432z\"/></svg>"};
  const tools = [
    ['hubspot', 'HubSpot', 'CRM', 'FF7A59'], [null, 'Salesforce', 'CRM', '00A1E0', 'SF'], ['zoho', 'Zoho CRM', 'CRM', 'E42527'],
    [null, 'LeadSquared', 'CRM', '2E77D0', 'LS'], ['shopify', 'Shopify', 'E-commerce', '7AB55C'], ['razorpay', 'Razorpay', 'Payments', '3395FF'],
    [null, 'Chargebee', 'Billing', 'FF7846', 'CB'], ['zapier', 'Zapier', 'iPaaS', 'FF4F00'], [null, 'Pabbly', 'iPaaS', '1A9BFC', 'Pb'],
    ['n8n', 'n8n', 'Workflow automation', 'EA4B71'], ['make', 'Make', 'Workflow automation', '6D00CC'],
    ['googleappsscript', 'Apps Script', 'Automation', '4285F4'], ['googlesheets', 'Google Sheets', 'Data', '34A853'],
    ['jira', 'Jira', 'Project tracking', '0052CC'], ['looker', 'Looker', 'Analytics', '4285F4'], ['zendesk', 'Zendesk', 'Support', '17494D'],
    ['meta', 'Meta', 'Certified partner', '0467DF'], ['whatsapp', 'Business messaging', 'Channel APIs', '25D366']
  ];
  const wall = $('#logoWall');
  wall.innerHTML = tools.map(([slug, name, kind, hex, mono], i) => `
    <li class="logo" style="--brand:#${hex};--i:${i}">
      ${slug && slug.startsWith('fa:') ? `<span class="logo-mark" role="img" aria-label="${name} logo"><i class="fa-brands fa-${slug.slice(3)}"></i></span>`
        : slug && LOGOS[slug] ? `<span class="logo-mark" role="img" aria-label="${name} logo">${LOGOS[slug]}</span>`
        : `<span class="logo-mono" aria-hidden="true">${mono || name.slice(0, 2)}</span>`}
      <span>${name}<small>${kind}</small></span>
    </li>`).join('');

  /* ---------- Shipped features tabs ---------- */
  const features = [
    { heard: 'Chatbots asked for details in a fixed box. When customers replied in their own words, added extra text or made a typo, the flow broke.',
      proposed: 'Let an AI step hold a normal conversation, pull out the one detail needed, check it and save it to the contact.',
      shipped: 'The AI Assist node: collects an email, phone number or any custom value, with Success and Failure paths, on every channel. Credited to me at launch.',
      reach: '70%', reachLabel: 'of Pro and Business accounts have it live. Launched 28 Sep 2026.', tags: ['Conversational AI', 'Data capture', 'Omnichannel', 'No-code builder'] },
    { heard: 'Building and fixing automations meant clicking through every rule and flow by hand, and live rules went unreviewed for months.',
      proposed: 'Describe what you want in plain language and let AI build, review and fix it, with an agent that checks automations every week.',
      shipped: 'Wati AI Ask & Agents: builds rules and chatbot flows from a written brief, finds conflicts and dead ends, and suggests fixes that wait for approval.',
      reach: '~16.5K', reachLabel: 'accounts in the rollout across Growth, Pro and Business plans. Launched 28 Sep 2026.', tags: ['AI copilot', 'Workflow automation', 'Weekly health check'] },
    { heard: 'Customers wanted rich, form-like journeys inside the chat, but the platform’s own flow builder was limited compared with what Meta’s Flow Builder already allowed.',
      proposed: 'Instead of rebuilding Meta’s builder, sync Flows created in Meta straight into the platform so customers can plug them into their journeys.',
      shipped: 'Native Flows sync: interactive Flows built in Meta now sync directly into customer accounts, ready to use in campaigns, chatbots and automations. I took it to Product and worked it through with the team.',
      reach: 'Meta → Wati', reachLabel: 'Customers can now run full multi-step journeys, from lead forms to bookings, inside the conversation itself.', tags: ['Interactive Flows', 'Customer journeys', 'Platform integration'] }
  ];
  const feat = $('#feature');
  const renderFeature = i => {
    const f = features[i];
    $('[data-f="heard"]', feat).textContent = f.heard;
    $('[data-f="proposed"]', feat).textContent = f.proposed;
    $('[data-f="shipped"]', feat).textContent = f.shipped;
    $('[data-f="reach"]', feat).textContent = f.reach;
    $('[data-f="reachLabel"]', feat).textContent = f.reachLabel;
    $('[data-f="tags"]', feat).innerHTML = f.tags.map(t => `<li>${t}</li>`).join('');
  };
  renderFeature(0);
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    if (t.classList.contains('active')) return;
    $$('.tab').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
    t.classList.add('active'); t.setAttribute('aria-selected', 'true');
    feat.classList.add('swap');
    setTimeout(() => { renderFeature(+t.dataset.feature); feat.classList.remove('swap'); }, 280);
  }));

  /* ---------- Build filters ---------- */
  $$('.chip').forEach(c => c.addEventListener('click', () => {
    $$('.chip').forEach(x => x.classList.remove('active')); c.classList.add('active');
    const f = c.dataset.filter;
    $$('#buildGrid .card').forEach((card, i) => {
      const show = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('hide', !show);
      if (show) { card.classList.remove('enter'); void card.offsetWidth; card.style.animationDelay = (i * 40) + 'ms'; card.classList.add('enter'); }
    });
  }));

  /* ---------- Mini calculator animation ---------- */
  const regions = [['India', 30], ['UK', 52], ['Europe', 64], ['Middle East', 46], ['USD West', 78], ['ROW East', 40]];
  let mi = 0; const mR = $('#miniRegion'), mB = $('#miniBar');
  if (!reduced) setInterval(() => { mi = (mi + 1) % regions.length; mR.textContent = regions[mi][0]; mB.style.width = regions[mi][1] + '%'; }, 1800);

  /* ---------- Process steps ---------- */
  const steps = [
    { t: 'Discover what really matters', d: 'I capture the prospect, use case, deal size, feature gaps and timeline, then dig into how their team actually works today.', o: 'A requirements map the AE and I both sign off on.' },
    { t: 'Build the proof before the call', d: 'Chatbot, flow, integration design or a fully deployed AI agent, built on the prospect’s own process so value is obvious in the first minute.', o: 'A working PoC, plus QR access for leaders who can’t join.' },
    { t: 'Present and validate live', d: 'I run the technical side of the call with the AE, check feasibility in real time and suggest improvements to their workflow.', o: 'A clear yes or no on fit, and a recorded walkthrough.' },
    { t: 'Scope the implementation', d: 'For larger deals I write the scoping document and get an implementation quote, so pricing reflects the real effort.', o: 'A scoping document and a costed implementation plan.' },
    { t: 'Hand over without re-discovery', d: 'I introduce the customer success manager and write the technical handover, so delivery starts from what we already know.', o: 'A handover document the delivery team builds from.' }
  ];
  const panel = $('#stepPanel');
  const renderStep = i => { $('#stepTitle').textContent = steps[i].t; $('#stepText').textContent = steps[i].d; $('#stepOut').textContent = steps[i].o; };
  renderStep(0);
  $$('.step').forEach(s => s.addEventListener('click', () => {
    $$('.step').forEach(x => x.classList.remove('active')); s.classList.add('active');
    panel.classList.add('swap'); setTimeout(() => { renderStep(+s.dataset.step); panel.classList.remove('swap'); }, 250);
  }));

  /* ---------- Timeline progress ---------- */
  const tl = $('.timeline');
  function updateTimeline() {
    if (!tl) return;
    const r = tl.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * .6 - r.top) / r.height));
    tl.style.setProperty('--tl', (p * 100) + '%');
  }

  /* ---------- 3D tilt ---------- */
  if (finePointer && !reduced) {
    $$('.tilt').forEach(el => {
      const max = el.classList.contains('hero-chat') ? 6 : 8;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    /* magnetic buttons */
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Ticker duplicate for seamless loop ---------- */

  /* ---------- Rotating quotes ---------- */
  const quotes = ['If nothing changes, nothing changes.', 'I was born to make mistakes, not to fake perfection.', 'Every shot I take is an answer to those who questioned my dreams.'];
  let qi = 0; const qEl = $('#quote');
  if (!reduced) setInterval(() => {
    qEl.classList.add('out');
    setTimeout(() => { qi = (qi + 1) % quotes.length; qEl.textContent = quotes[qi]; qEl.classList.remove('out'); }, 450);
  }, 4200);

  /* ---------- Copy email ---------- */
  const copyBtn = $('#copyEmail');
  copyBtn.addEventListener('click', async () => {
    const label = $('span', copyBtn);
    try { await navigator.clipboard.writeText('parth.chauhan0011@gmail.com'); label.textContent = 'Email copied'; }
    catch { label.textContent = 'parth.chauhan0011@gmail.com'; }
    setTimeout(() => { label.textContent = 'Copy email'; }, 2200);
  });

  onScroll();
})();
