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
    document.body.style.overflow = open ? '' : 'hidden';
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
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
  const phrases = ['who builds the proof before the pitch', 'designing agentic AI agents', 'turning field insight into product', 'connecting CRMs, APIs and WhatsApp', 'making sales teams faster'];
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
    'So what do you do?': ['I’m a Senior Solutions Engineer at Wati. Basically, when a deal needs technical proof, I’m the one on the call.', 'I map how your team works, build a working version on your data and hand delivery a clean plan. That’s why most of my PoCs close.'],
    'Shipped anything?': ['A few things! 4+ ideas I picked up on sales calls have turned into product features.', 'The latest two went live in Sep 2026. <a href="#shipped">Here’s how they happened</a>'],
    'What have you built?': ['Pricing calculators the whole sales team uses, a voice AI agent that calls trial users, agent PoCs for e-commerce, healthcare and travel, and scripts running for customers.', '<a href="#build">Have a look</a>'],
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
    addMsg('them', 'Hey Parth, can WhatsApp talk to our CRM?');
    await typeThen('Yep, that’s most of my week 😄', 900);
    await typeThen('Tell me how your team works today and I’ll build a version you can try on your phone before our next call.', 1300);
    showReplies();
  })();

  /* ---------- Tools logo wall ---------- */
  const SI = './assets/logos/'; // brand icons from Simple Icons v16.33.0
  const tools = [
    ['whatsapp', 'WhatsApp Business API', 'Messaging', '25D366'], ['meta', 'Meta', 'Certified partner', '0467DF'],
    ['hubspot', 'HubSpot', 'CRM', 'FF7A59'], [null, 'Salesforce', 'CRM', '00A1E0', 'SF'], ['zoho', 'Zoho CRM', 'CRM', 'E42527'],
    [null, 'LeadSquared', 'CRM', '2E77D0', 'LS'], ['shopify', 'Shopify', 'E-commerce', '7AB55C'], ['razorpay', 'Razorpay', 'Payments', '3395FF'],
    [null, 'Chargebee', 'Billing', 'FF7846', 'CB'], ['zapier', 'Zapier', 'iPaaS', 'FF4F00'], [null, 'Pabbly', 'iPaaS', '1A9BFC', 'Pb'],
    ['n8n', 'n8n', 'Workflow automation', 'EA4B71'], ['make', 'Make', 'Workflow automation', '6D00CC'],
    ['googleappsscript', 'Apps Script', 'Automation', '4285F4'], ['googlesheets', 'Google Sheets', 'Data', '34A853'],
    ['jira', 'Jira', 'Project tracking', '0052CC'], ['looker', 'Looker', 'Analytics', '4285F4'], ['zendesk', 'Zendesk', 'Support', '17494D']
  ];
  const wall = $('#logoWall');
  wall.innerHTML = tools.map(([slug, name, kind, hex, mono], i) => `
    <li class="logo" style="--brand:#${hex};--i:${i}">
      ${slug ? `<span class="logo-mark" style="--src:url('${SI}${slug}.svg')" role="img" aria-label="${name} logo"></span>` : `<span class="logo-mono" aria-hidden="true">${mono}</span>`}
      <span>${name}<small>${kind}</small></span>
    </li>`).join('');

  /* ---------- Shipped features tabs ---------- */
  const features = [
    { heard: 'Chatbots asked for details in a fixed box. When customers replied in their own words, added extra text or made a typo, the flow broke.',
      proposed: 'Let an AI step hold a normal conversation, pull out the one detail needed, check it and save it to the contact.',
      shipped: 'The AI Assist node: collects an email, phone number or any custom value, with Success and Failure paths, on every channel. Credited to me at launch.',
      reach: '70%', reachLabel: 'of Pro and Business accounts have it live. Launched 28 Sep 2026.', tags: ['WhatsApp', 'Instagram', 'Messenger', 'Chatbot builder'] },
    { heard: 'Building and fixing automations meant clicking through every rule and flow by hand, and live rules went unreviewed for months.',
      proposed: 'Describe what you want in plain language and let AI build, review and fix it, with an agent that checks automations every week.',
      shipped: 'Wati AI Ask & Agents: builds rules and chatbot flows from a written brief, finds conflicts and dead ends, and suggests fixes that wait for approval.',
      reach: '~16.5K', reachLabel: 'accounts in the rollout across Growth, Pro and Business plans. Launched 28 Sep 2026.', tags: ['22 triggers', 'Chatbot flows', 'Weekly health check'] }
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
