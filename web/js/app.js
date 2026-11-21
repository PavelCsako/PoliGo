/* app.js - screen router and UI.
 *
 * PoliGo is two entries in the student menu of the UPT mobility platform
 * (next to Profil · Abilități lingvistice · Aplicații pentru mobilități):
 *
 *   Choose a destination  (#destinatie, before applying)
 *     overview   the round, your language levels, your applications
 *     map        the faculty's real agreements on the globe / in a list / favourites
 *     uni        course matching, your language vs. the agreement's, places,
 *                "Apply to this agreement" (opens the platform form), LA draft PDF
 *     subjects   your UPT subjects
 *
 *   Mobility guide        (#ghid, once the platform lists you as Titular/Aprobat)
 *     today      what to do now, countdown
 *     plan       the platform's official deadlines + the steps it does not track
 *     docs       the platform documents explained in plain words + your scans
 *     scanJ      scanner for papers received abroad (Claude vision)
 *     recognition  return check: Learning Agreement vs. Transcript of Records
 *
 * The student, profile, languages, agreements, status and documents all come
 * from the platform session (js/store.js). All visible text goes through T().
 */
const App = (() => {
  const NAVS = {
    destination: [
      ['home', 'Overview'],
      ['map', 'Agreements'],
      ['subjects', 'My subjects'],
    ],
    guide: [
      ['today', 'Today'],
      ['plan', 'Plan'],
      ['docs', 'Documents'],
      ['scanJ', 'Scan'],
      ['recognition', 'Recognition'],
    ],
  };
  const NAV_ICONS = {
    home: 'globe', map: 'landmark', subjects: 'check',
    today: 'sun', plan: 'calendar-days', docs: 'file-text', scanJ: 'scan-line', recognition: 'shield-check',
  };
  const GUIDE_SCREENS = new Set(['today', 'plan', 'docs', 'scanJ', 'recognition']);
  const NO_NAV = new Set(['nosession', 'pitch']);
  const KNOWN = new Set(['nosession', 'pitch', 'home', 'map', 'uni', 'subjects', 'today', 'plan', 'docs', 'scanJ', 'recognition']);
  // menu links from the platform and old screen names -> where they live now
  const ALIAS = {
    destinatie: 'home', destination: 'home', ghid: 'today', guide: 'today',
    landing: 'pitch', shortlist: 'map', universities: 'map', calendar: 'plan', timeline: 'plan',
  };
  const ALIAS_TAB = { shortlist: 'favorite', universities: 'list' };
  const STAGES = ['before', 'arrival', 'during', 'before-return', 'after-return'];
  const STAGE_LABELS = {
    before: 'Before departure', arrival: 'Arrival (first 2 weeks)', during: 'During',
    'before-return': 'Before return', 'after-return': 'After return',
  };
  const DOC_STAGE = { before: 'before', arrival: 'arrival', during: 'during', after: 'after-return' };
  const DOC_STATUS = {
    validated: ['good', 'check', 'Validated'],
    uploaded: ['partial', 'clock', 'Uploaded, waiting for validation'],
    missing: ['none', 'triangle-alert', 'Missing'],
    not_yet: ['soon', 'clock', 'Not yet'],
  };
  const docDone = d => d.status === 'validated' || d.status === 'uploaded';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const history = [];
  const timers = [];
  let hashLock = false;
  let tlOpen = null;                 // plan: which stages are expanded

  const $app = document.getElementById('app');
  const $top = document.getElementById('topBar');

  /* ------------------------------------------------------------------ helpers */

  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const T = (key, vars) => Store.t(key, vars);
  const isRo = () => Store.state.language !== 'en';
  const isLight = () => Store.state.theme === 'light';
  const pad2 = n => String(n).padStart(2, '0');
  const st = () => Store.state;
  const guide = () => Store.state.guide;
  const hasGuide = () => !!(Store.state.guide && Store.state.guide.mobility);

  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
      t = h('<div id="toast" role="status"></div>');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // Server errors come as { code, message } in English; show the translation of the code when we have one.
  function errText(e) {
    if (!e) return T('Something went wrong. Is the server online?');
    const key = 'err:' + (e.code || '');
    const tr = T(key);
    if (tr !== key) return tr;
    return e.message || T('Something went wrong. Is the server online?');
  }

  function setAccent() {
    const c = GUIDE_SCREENS.has(Store.state.screen) ? 'var(--accent-j)' : 'var(--accent)';
    document.documentElement.style.setProperty('--accent-live', c);
  }

  function flagImg(code, cls) {
    if (!code) return '';
    return '<img class="flag ' + (cls || '') + '" src="/icons/flags/' + String(code).toLowerCase() + '.svg" alt="" loading="lazy"/>';
  }

  function startTimer(fn, ms) { timers.push(setInterval(fn, ms)); }
  function clearTimers() { while (timers.length) clearInterval(timers.pop()); }

  const card = (inner, cls) => '<div class="card' + (cls ? ' ' + cls : '') + '">' + inner + '</div>';
  const hint = (text, style) => '<p class="hint"' + (style ? ' style="' + style + '"' : '') + '>' + esc(text) + '</p>';
  const label = text => '<p class="section-label">' + esc(text) + '</p>';
  const ext = (href, text, cls) => '<a class="' + (cls || 'ghost') + '" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' +
    icon('external-link', 'inline-ico') + ' ' + esc(text) + '</a>';

  /* -------------------------------------------------------------------- logo */

  let logoSeq = 0;
  function logoIcon(size) {
    const id = 'lg' + (++logoSeq);
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 64 64" aria-hidden="true" style="display:block;flex:none">' +
      '<defs><linearGradient id="' + id + '" x1="18" y1="46" x2="54" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#38BDF8"/><stop offset="1" stop-color="#FBBF24"/></linearGradient></defs>' +
      '<circle cx="29" cy="35" r="20" fill="none" stroke="#38BDF8" stroke-width="3.2"/>' +
      '<ellipse cx="29" cy="35" rx="8.5" ry="20" fill="none" stroke="#38BDF8" stroke-width="2" stroke-opacity=".5"/>' +
      '<path d="M9.5 35h39" stroke="#38BDF8" stroke-width="2" stroke-opacity=".5"/>' +
      '<path d="M19 45 C 22 24, 37 12, 52 13" fill="none" stroke="url(#' + id + ')" stroke-width="3.6" stroke-linecap="round"/>' +
      '<circle cx="19" cy="45" r="3.6" fill="#38BDF8"/><circle cx="52.5" cy="13" r="5" fill="#FBBF24"/></svg>';
  }

  const lockup = size => '<span class="lockup">' + logoIcon(size) +
    '<span class="wordmark" style="font-size:' + Math.round(size * 0.72) + 'px">Poli<span>Go</span></span></span>';

  /* ------------------------------------------------------------------- dates */

  function ymd(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseYmd(s) {
    const p = String(s).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  // 2026-11-21 -> 21.11.2026 (day.month.year everywhere in the UI)
  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '.' + m[2] + '.' + m[1] : '';
  }

  function daysWord(n) {
    if (isRo()) return n === 1 ? 'zi' : ((n % 100 === 0 || n % 100 >= 20) ? 'de zile' : 'zile');
    return n === 1 ? 'day' : 'days';
  }

  const nDays = n => n + ' ' + daysWord(n);

  function daysUntil(iso) {
    const t0 = new Date();
    return Math.round((parseYmd(iso) - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) / 86400000);
  }

  function dueChip(due) {
    if (!due) return '<span class="due soon">' + esc(T('No date')) + '</span>';
    const days = daysUntil(due);
    const when = ' (' + fmtDate(due) + ')';
    if (days < 0) return '<span class="due overdue">' + esc(T('Overdue by {days}', { days: nDays(-days) }) + when) + '</span>';
    if (days === 0) return '<span class="due today">' + esc(T('Due today')) + '</span>';
    if (days === 1) return '<span class="due soon">' + esc(T('Tomorrow')) + '</span>';
    return '<span class="due soon">' + esc(T('In {days}', { days: nDays(days) }) + when) + '</span>';
  }

  /* ---------------------------------------------------------------- countdown */

  function mobility() { return (guide() && guide().mobility) || (st().me && st().me.mobility) || null; }

  function journeyClock() {
    const mob = mobility();
    if (!mob || !mob.start_date) return null;
    const now = new Date();
    const arrival = parseYmd(mob.arrival_date || mob.start_date);
    const end = addDays(parseYmd(mob.end_date), 1);
    if (now < arrival) return { kind: 'departure', ms: arrival - now };
    if (now < end) return { kind: 'return', ms: end - now };
    return { kind: 'done', ms: 0 };
  }

  function clockParts(ms) {
    const mins = Math.max(0, Math.floor(ms / 60000));
    return { d: Math.floor(mins / 1440), h: Math.floor((mins % 1440) / 60), m: mins % 60 };
  }

  function countdownHtml() {
    return '<div class="cd-wrap">' +
      '<p class="cd-label" data-cd-label></p>' +
      '<div class="cd" data-cd role="timer">' +
      '<div><b data-u="d">0</b><span>' + esc(T('days')) + '</span></div>' +
      '<div><b data-u="h">00</b><span>' + esc(T('hours')) + '</span></div>' +
      '<div><b data-u="m">00</b><span>' + esc(T('minutes')) + '</span></div>' +
      '</div></div>';
  }

  function tickCountdown(scope) {
    const clock = journeyClock();
    if (!clock) return;
    const lbl = { departure: 'Until departure', return: 'Until you come back', done: 'Welcome back!' }[clock.kind];
    const p = clockParts(clock.ms);
    scope.querySelectorAll('[data-cd-label]').forEach(el => { el.textContent = T(lbl); });
    scope.querySelectorAll('[data-cd]').forEach(el => {
      el.hidden = clock.kind === 'done';
      const set = (u, v) => { const b = el.querySelector('[data-u="' + u + '"]'); if (b && b.textContent !== v) b.textContent = v; };
      set('d', String(p.d)); set('h', pad2(p.h)); set('m', pad2(p.m));
    });
  }

  function startCountdown(scope) {
    tickCountdown(scope);
    startTimer(() => tickCountdown(scope), 10000);
  }


  /* --------------------------------------------------------- history / hashes */

  function syncHash(screen) {
    if (('#' + screen) === location.hash) return;
    hashLock = true;
    location.hash = screen;
    setTimeout(() => { hashLock = false; }, 0);
  }

  function resolve(screen) {
    if (ALIAS_TAB[screen]) Store.state.mapTab = ALIAS_TAB[screen];
    screen = ALIAS[screen] || screen;
    if (!KNOWN.has(screen)) screen = 'home';
    // without a platform session there is nothing to show but the way back to it
    if (st().noSession && screen !== 'pitch') screen = 'nosession';
    return screen;
  }

  function go(screen, opts) {
    opts = opts || {};
    screen = resolve(screen);
    const cur = Store.state.screen;
    if (screen === cur && !opts.force) { syncHash(screen); render(); return; }
    if (opts.replace) history.length = 0;
    else if (cur && cur !== 'nosession') history.push(cur);
    Store.state.screen = screen;
    Store.saveLocal();
    syncHash(screen);
    render();
  }

  function goBack() {
    const prev = history.pop() || 'home';
    Store.state.screen = resolve(prev);
    syncHash(Store.state.screen);
    render();
  }

  window.addEventListener('hashchange', () => {
    if (hashLock) return;
    const raw = (location.hash || '').replace(/^#/, '') || 'home';
    const s = resolve(raw);
    if (s === Store.state.screen) return;
    Store.state.screen = s;
    render();
  });

  /* -------------------------------------------------------- chrome (bars, nav) */

  function syncChrome() {
    document.body.dataset.screen = Store.state.screen || '';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isLight() ? '#F4F6FB' : '#070B14';
  }

  function renderTopbar() {
    const s = Store.state.screen;
    $top.hidden = false;
    const withNav = !NO_NAV.has(s);
    document.body.classList.toggle('with-nav', withNav);
    const inGuide = GUIDE_SCREENS.has(s);
    $top.innerHTML =
      '<div class="top-left">' +
      (history.length > 0 && withNav
        ? '<button class="back-btn" id="tb-back" aria-label="' + esc(T('Back')) + '">' + icon('arrow-left', 'sm-ico') + '<span>' + esc(T('Back')) + '</span></button>'
        : '') +
      '<a class="top-brand" id="tb-brand" href="#destinatie" aria-label="PoliGo - ' + esc(T('Choose a destination')) + '">' + lockup(28) + '</a>' +
      '</div>' +
      (withNav
        ? '<div class="mode-switch" role="group" aria-label="PoliGo">' +
          '<button class="' + (inGuide ? '' : 'on') + '" id="tb-dest" aria-pressed="' + !inGuide + '" title="' + esc(T('Choose a destination')) + '" aria-label="' + esc(T('Choose a destination')) + '">' + icon('globe', 'sm-ico') + '<span>' + esc(T('Choose a destination')) + '</span></button>' +
          '<button class="' + (inGuide ? 'on' : '') + (hasGuide() ? '' : ' locked') + '" id="tb-guide" aria-pressed="' + inGuide + '" title="' + esc(T('Mobility guide')) + '" aria-label="' + esc(T('Mobility guide')) + '">' + icon('map', 'sm-ico') + '<span>' + esc(T('Mobility guide')) + '</span></button>' +
          '</div>'
        : '<span></span>') +
      '<div class="top-actions">' +
      '<button class="icon-btn top-btn top-lang" id="tb-lang" aria-label="' + esc(T('Language')) + '">' + (isRo() ? 'EN' : 'RO') + '</button>' +
      '<button class="icon-btn top-btn" id="tb-theme" aria-label="' + esc(T(isLight() ? 'Switch to dark theme' : 'Switch to light theme')) + '">' + icon(isLight() ? 'moon' : 'sun') + '</button>' +
      '</div>' +
      (withNav ? '<nav class="top-nav" id="topNav" aria-label="' + esc(T('Menu')) + '"></nav>' : '');
    const on = (id, fn) => { const el = $top.querySelector(id); if (el) el.onclick = fn; };
    on('#tb-back', () => goBack());
    on('#tb-brand', ev => { ev.preventDefault(); go('home', { replace: true }); });
    on('#tb-dest', () => go('home', { replace: true }));
    on('#tb-guide', () => go('today', { replace: true }));
    on('#tb-theme', () => { Store.setTheme(isLight() ? 'dark' : 'light'); render(); });
    on('#tb-lang', async () => { await Store.setLanguage(isRo() ? 'en' : 'ro'); render(); });
  }

  function hasOverdue() {
    const g = guide();
    if (!g) return false;
    return planItems().some(i => !i.done && i.due && daysUntil(i.due) < 0);
  }

  function renderNav() {
    const { screen } = Store.state;
    const $nav = document.getElementById('topNav');
    if (!$nav) return;
    const group = GUIDE_SCREENS.has(screen) ? 'guide' : 'destination';
    const tab = mapTabNow();
    const isActive = id => id === 'map' ? (screen === 'map' || screen === 'uni') : screen === id;
    for (const [id, text] of NAVS[group]) {
      const dot = id === 'plan' && hasOverdue() ? '<span class="nav-dot"></span>' : '';
      const b = h('<button class="' + (isActive(id) ? 'active' : '') + '"' + (isActive(id) ? ' aria-current="page"' : '') + '><span class="ico">' + icon(NAV_ICONS[id]) + dot + '</span><span>' + esc(T(text)) + '</span></button>');
      b.onclick = () => {
        if (id === 'map' && tab === 'favorite' && screen === 'map') Store.state.mapTab = Store.state.mapView || 'list';
        go(id, { force: true });
      };
      $nav.appendChild(b);
    }
  }

  // The background planet follows the mobility / the university you opened.
  function syncStage() {
    const mob = GUIDE_SCREENS.has(st().screen) ? mobility() : null;
    const id = mob ? mob.university_id : st().activeUniId;
    Stage.setDestination(id ? Store.uniById(id) : null);
  }

  function render() {
    clearTimers();
    setAccent();
    syncChrome();
    renderTopbar();
    renderNav();
    try { syncStage(); } catch (err) { console.warn('[stage]', err); }
    try {
      const { screen } = Store.state;
      const views = {
        nosession: viewNoSession, pitch: viewPitch,
        home: viewHome, subjects: viewSubjects, map: viewMap, uni: viewUniversity,
        today: viewToday, plan: viewPlan, docs: viewDocs, scanJ: viewScan, recognition: viewRecognition,
      };
      $app.innerHTML = '';
      if (GUIDE_SCREENS.has(screen) && !hasGuide()) viewGuideLocked($app);
      else (views[screen] || viewHome)($app);
      window.scrollTo(0, 0);
    } catch (err) {
      showFatal(err);
    }
  }

  function showFatal(err) {
    clearTimers();
    $app.innerHTML = '';
    const wrap = h('<div class="screen panel">' +
      '<div class="card fatal">' +
      label(T('Error')) +
      '<h2>' + esc(T('This screen failed to load')) + '</h2>' +
      '<pre>' + esc(err && err.stack ? err.stack : String(err || 'unknown error')) + '</pre>' +
      '<button class="ghost" id="fat-reload">' + esc(T('Reload')) + '</button>' +
      '<button class="link" id="fat-home">' + esc(T('Back to the start')) + '</button>' +
      '</div></div>');
    wrap.querySelector('#fat-reload').onclick = () => window.location.reload();
    wrap.querySelector('#fat-home').onclick = () => go('home', { replace: true, force: true });
    $app.appendChild(wrap);
  }

  window.addEventListener('error', e => showFatal(e.error || e.message));
  window.addEventListener('unhandledrejection', e => showFatal(e.reason));

  /* ------------------------------------------------ no platform session / pitch */

  function viewNoSession(root) {
    const p = st().platform || {};
    const demos = p.demo_students || [];
    const wrap = h('<div class="screen panel">' +
      card(label(T('PoliGo')) +
        '<h2>' + esc(T('Open PoliGo from the mobility platform')) + '</h2>' +
        hint(T('PoliGo uses your platform session, so you do not need a second account. Sign in to the platform and pick "Choose a destination" or "Mobility guide" in the student menu.')) +
        (p.platform_url ? ext(p.platform_url, T('Go to the mobility platform'), 'primary') : '')) +
      (demos.length
        ? card(label(T('Demo session (presentation only)')) +
          hint(T('Stands in for the platform login. The students are fictional.'), 'margin-top:0') +
          demos.map(d => '<button class="ghost demo-btn" data-demo="' + esc(d.id) + '">' + icon('user', 'inline-ico') + ' ' +
            esc(d.name) + ' - ' + esc(T(d.label)) + '</button>').join(''))
        : '') +
      '<button class="link" id="ns-pitch">' + esc(T('About PoliGo')) + '</button>' +
      '</div>');
    wrap.querySelectorAll('[data-demo]').forEach(b => {
      b.onclick = async () => {
        try {
          await Store.demoLogin(b.dataset.demo);
          await Store.loadStrings(st().language);
          history.length = 0;
          go(hasGuide() ? 'today' : 'home', { replace: true, force: true });
          maybeIntro();
        } catch (e) { toast(errText(e)); }
      };
    });
    wrap.querySelector('#ns-pitch').onclick = () => go('pitch');
    root.appendChild(wrap);
  }

  // Presentation page - only for the pitch, never the way into the app.
  function viewPitch(root) {
    const wrap = h('<div class="landing">' +
      '<div class="hero">' +
      '<h1>' + esc(T('Leave on Erasmus.')) + '<br/><em>' + esc(T('Return with every credit.')) + '</em></h1>' +
      '<p class="slogan">' + esc(T('PoliGo lives inside the UPT mobility platform: it compares the courses of every agreement with yours, explains the documents and their deadlines, reads the papers you get abroad and checks your credits when you return.')) + '</p>' +
      '</div>' +
      '<div class="login-core">' +
      '<button class="primary login-cta" id="pitch-open">' + icon('arrow-right', 'inline-ico') + ' ' + esc(T('Open PoliGo')) + '</button>' +
      '</div>' +
      '<div class="features">' +
      '<div class="feat feat-1"><span><span class="f-title">' + esc(T('Choose a destination')) + '</span><span class="f-sub">' + esc(T('Your faculty\'s agreements on a globe, ranked by how many of your courses they cover, with your language level checked.')) + '</span></span></div>' +
      '<div class="feat feat-2"><span><span class="f-title">' + esc(T('Mobility guide')) + '</span><span class="f-sub">' + esc(T('The platform\'s documents explained, with their real deadlines, plus the steps nobody tracks.')) + '</span></span></div>' +
      '<div class="feat feat-3"><span><span class="f-title">' + esc(T('Every credit back')) + '</span><span class="f-sub">' + esc(T('A Learning Agreement draft from your matches, then a check of the transcript against it when you return.')) + '</span></span></div>' +
      '</div>' +
      '<div class="updates">' +
      '<span class="f-title">' + esc(T('Get notified at launch')) + '</span>' +
      '<div class="updates-row">' +
      '<input id="u-email" type="email" placeholder="name@student.upt.ro" aria-label="' + esc(T('Email')) + '" />' +
      '<button class="icon-btn" id="u-send" aria-label="' + esc(T('Notify me')) + '">' + icon('arrow-right') + '</button>' +
      '</div></div>' +
      '</div>');
    wrap.querySelector('#pitch-open').onclick = () => go('home', { replace: true });
    wrap.querySelector('#u-send').onclick = async () => {
      const inp = wrap.querySelector('#u-email');
      if (!inp.value.trim()) { toast(T('Enter your email first')); return; }
      try { await Store.notify(inp.value.trim()); toast(T('You are on the list')); inp.value = ''; }
      catch (e) { toast(T('Could not save it - try again later')); }
    };
    root.appendChild(wrap);
  }

  /* ------------------------------------------------- choose a destination */

  function fitNotice(fit) {
    if (!fit) return '';
    const lang = T(fit.language);
    if (fit.ok) {
      return '<div class="notice good">' + icon('check', 'sm-ico') + '<span>' +
        esc(T('You have {have} in {lang} - that works.', { have: fit.have, lang })) + '</span></div>';
    }
    const msg = fit.have
      ? T('You need {need} in {lang} (you have {have}).', { need: fit.need, lang, have: fit.have })
      : T('You need {need} in {lang}. Your platform profile has no level for it.', { need: fit.need, lang });
    const links = (st().me && st().me.links) || {};
    return '<div class="notice bad">' + icon('triangle-alert', 'sm-ico') + '<span>' + esc(msg) +
      (links.languages ? ' <a href="' + esc(links.languages) + '" target="_blank" rel="noopener noreferrer">' + esc(T('Update Language skills')) + '</a>' : '') +
      '</span></div>';
  }

  const fitPill = fit => fit
    ? '<span class="pill ' + (fit.ok ? 'good' : 'none') + '">' + icon(fit.ok ? 'check' : 'x', 'sm-ico') + ' ' + esc(T(fit.language)) + ' ' + esc(fit.need) + '</span>'
    : '';

  const placesText = a => a.places > 0 ? T('Places left in this round: {n}', { n: a.places }) : T('No places left in this round');

  function applyButton(u, cls) {
    const a = u.agreement;
    if (!a) return '';
    if (a.places <= 0) return '<button class="' + (cls || 'primary') + '" disabled>' + esc(T('No places left in this round')) + '</button>';
    return ext(a.apply_url, T('Apply to this agreement'), cls || 'primary');
  }

  function roundCard() {
    const r = st().me && st().me.round;
    if (!r) return '';
    const left = daysUntil(r.applications_close);
    const open = daysUntil(r.applications_open) <= 0 && left >= 0;
    return card(label(T('Application round')) +
      '<h2 style="font-size:17px">' + esc(T(r.name)) + '</h2>' +
      '<p class="hint" style="margin:6px 0 0">' +
      esc(T('Applications: {from} - {to}', { from: fmtDate(r.applications_open), to: fmtDate(r.applications_close) })) + '<br/>' +
      esc(T('Results: {date}', { date: fmtDate(r.results) })) + ' · ' +
      esc(T('Mobility: {from} - {to}', { from: fmtDate(r.mobility_start), to: fmtDate(r.mobility_end) })) + '</p>' +
      (open ? '<p class="pending-pill"><span class="pill soon">' + icon('clock', 'sm-ico') + ' ' +
        esc(left === 0 ? T('Applications close today') : T('{days} left to apply', { days: nDays(left) })) + '</span></p>' : ''));
  }

  function viewHome(root) {
    const me = st().me;
    if (!me) { viewNoSession(root); return; }
    const s = me.student;
    const uni = st().activeUniId ? Store.uniById(st().activeUniId) : null;
    const apps = me.applications || [];
    const statusPill = a => '<span class="pill ' + (a.guide ? 'good' : 'partial') + '">' + esc(T(a.status)) + '</span>';
    const appsHtml = apps.length
      ? card(label(T('Your applications (from the platform)')) +
        apps.map(a => {
          const u = Store.uniById(a.university_id);
          return '<div class="task-card"><span style="flex:1;min-width:0"><span class="t-title">' + esc(u ? u.name : a.university_id) + '</span>' +
            '<span class="t-meta">' + statusPill(a) + ' ' + esc(T(a.round ? a.round.name : '')) + '</span></span></div>';
        }).join('') +
        (hasGuide() ? '<button class="primary" id="h-guide">' + icon('map', 'inline-ico') + ' ' + esc(T('Open the mobility guide')) + '</button>' : ''))
      : '';
    const langs = (s.languages || []).map(l => '<span class="pill kw">' + esc(T(l.language)) + ' ' + esc(l.level) + '</span>').join(' ');
    const isDemo = st().platform && st().platform.mode === 'demo';

    const wrap = h('<div class="screen panel home">' +
      '<div class="home-globe globe-box" id="home-globe"></div>' +
      '<div class="home-side">' +
      card(label(T('Choose a destination')) +
        '<h2>' + esc(T('Hi, {name}', { name: s.name.split(' ')[0] })) + '</h2>' +
        hint(s.faculty_name + ' · ' + T(s.program) + ' · ' + T('year {n}', { n: s.year }), 'margin:6px 0 18px') +
        '<p class="hint" style="margin:0 0 10px">' + esc(T('Your languages (Language skills):')) + '</p>' +
        '<p style="margin:0 0 24px; display:flex; flex-wrap:wrap; gap:8px">' + (langs || esc(T('none registered'))) + '</p>' +
        (uni
          ? '<div class="home-actions"><button class="primary" id="h-open">' + flagImg(uni.country_code, 'inline-ico') + ' ' + esc(T('Open {city}', { city: uni.city })) + '</button>' +
            '<button class="ghost" id="h-map">' + esc(T('All agreements')) + '</button></div>'
          : '<button class="primary" id="h-map">' + icon('map', 'inline-ico') + ' ' + esc(T('See your faculty\'s agreements')) + '</button>'), 'home-info') +
      roundCard() +
      appsHtml +
      (isDemo ? '<button class="link" id="h-demo-out">' + esc(T('Switch demo student')) + '</button>' : '') +
      '</div></div>');

    const bind = (id, fn) => { const el = wrap.querySelector(id); if (el) el.onclick = fn; };
    bind('#h-map', () => go('map'));
    bind('#h-open', () => go('uni'));
    bind('#h-guide', () => go('today'));
    bind('#h-demo-out', async () => { await Store.demoLogout(); history.length = 0; go('nosession', { replace: true, force: true }); });
    Stage.homeGlobe(wrap.querySelector('#home-globe'), uni, id => { st().activeUniId = id; go('uni'); });
    root.appendChild(wrap);
  }

  function viewSubjects(root) {
    const courses = st().homeCourses;
    const selected = new Set(courses.map(c => c.id));
    const me = st().me;
    const list = h('<div class="screen panel">' +
      '<div class="card">' +
      label(T('My subjects') + ' - ' + T((me && me.student.program) || 'Computer Science')) +
      hint(T('Your semester at UPT, from the faculty curriculum. These are the courses PoliGo looks for at each partner.'), 'margin-top:0') +
      '<div id="course-list"></div>' +
      '<p class="hint" id="ects-line"></p>' +
      '<button class="primary" id="find-matches">' + esc(T('Find my matches')) + '</button>' +
      '</div></div>');
    const listEl = list.querySelector('#course-list');
    const ects = () => {
      const sum = courses.filter(c => selected.has(c.id)).reduce((s, c) => s + c.ects, 0);
      list.querySelector('#ects-line').textContent = T('{n} ECTS selected', { n: sum });
    };
    for (const c of courses) {
      const row = h('<label class="task-card">' +
        '<input type="checkbox" checked data-id="' + c.id + '" />' +
        '<span><span class="t-title">' + esc(T(c.name)) + '</span>' +
        '<span class="t-meta">' + c.ects + ' ECTS - ' + esc((c.topics || []).slice(0, 3).map(T).join(', ')) + '</span></span>' +
        '</label>');
      row.querySelector('input').onchange = e => {
        e.target.checked ? selected.add(c.id) : selected.delete(c.id);
        ects();
      };
      listEl.appendChild(row);
    }
    ects();
    list.querySelector('#find-matches').onclick = () => go('map');
    root.appendChild(list);
  }

  const siteHost = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

  function siteLink(u, cls) {
    if (!u || !u.website) return '';
    return '<a class="uni-link ' + (cls || '') + '" href="' + esc(u.website) + '" target="_blank" rel="noopener noreferrer">' +
      icon('external-link', 'sm-ico') + '<span>' + esc(siteHost(u.website)) + '</span></a>';
  }

  const metaLine = u => esc(u.city) + ', ' + esc(T(u.country)) +
    (u.agreement ? ' - ' + esc(placesText(u.agreement)) : '');

  function uniCard(u) {
    const c = h('<div class="card uni-card" role="link" tabindex="0">' +
      flagImg(u.country_code) +
      '<span><span class="name">' + esc(u.name) + '</span><br/>' +
      '<span class="meta">' + metaLine(u) + '</span><br/>' + fitPill(u.agreement && u.agreement.language_fit) + ' ' + siteLink(u) + '</span>' +
      '<span class="badge"><span class="num">' + u.summary.matched + '/' + u.summary.total + '</span><br/><span class="lbl">' + esc(T('match')) + '</span></span>' +
      '</div>');
    const open = () => { st().activeUniId = u.id; go('uni'); };
    c.onclick = ev => { if (!ev.target.closest('a')) open(); };
    c.onkeydown = ev => { if (ev.key === 'Enter' && ev.target === c) open(); };
    return c;
  }

  // Two dropdowns: the agreement's language of instruction and the country.
  function buildFilters(el, onChange) {
    const langs = [...new Set(st().universities.map(u => u.agreement && u.agreement.language).filter(Boolean))].sort();
    const countries = [...new Set(st().universities.map(u => u.country))].sort();
    const f = st().filters;
    f.region = null; f.quality = null;
    const selectOf = (kind, allLabel, options) =>
      '<div class="select-wrap"><select data-filter="' + kind + '">' +
      '<option value="">' + esc(allLabel) + '</option>' +
      options.map(([value, text]) => '<option value="' + esc(value) + '" ' + (f[kind] === value ? 'selected' : '') + '>' + esc(text) + '</option>').join('') +
      '</select>' + icon('chevron-down', 'sel-ico') + '</div>';
    el.innerHTML = '<div class="filter-grid">' +
      selectOf('lang', T('All languages'), langs.map(l => [l, T(l)])) +
      selectOf('country', T('All countries'), countries.map(c => [c, T(c)])) +
      '</div>';
    el.querySelectorAll('select[data-filter]').forEach(sel => {
      sel.onchange = () => { f[sel.dataset.filter] = sel.value || null; onChange(); };
    });
  }

  function mapTabNow() {
    const t = st().mapTab;
    return t === 'map' || t === 'favorite' ? t : 'list';
  }

  // Agreements: one screen, three views (list / map / favourites).
  function viewMap(root) {
    const tab = mapTabNow();
    // #filters / #uni-list / #sl-list stay DIRECT children of .card - app.css keys off that.
    const bodyHtml = tab === 'favorite'
      ? hint(T('Keep the agreements you like here, then apply to them in the platform.')) +
        '<p class="hint" id="fav-empty" hidden>' + esc(T('Nothing here yet. Open a university and tap "Favorite".')) + '</p>' +
        '<div id="sl-list"></div>'
      : '<div id="filters"></div><p class="hint" id="uni-count"></p><div id="uni-list"></div>';
    const favN = Store.shortlist().length;
    const cls = id => tab === id ? 'active' : (id === 'list' && tab === 'map' ? 'active-wide' : '');
    const tabBtn = (id, inner) => '<button class="' + cls(id) + '" data-maptab="' + id + '" role="tab" aria-selected="' + (tab === id) + '">' + inner + '</button>';
    const wrap = h('<div class="screen panel">' +
      '<div class="card uni-screen view-' + tab + '">' +
      label(T('Your faculty\'s agreements')) +
      '<div class="tab-row" role="tablist">' +
      tabBtn('list', '<span class="tab-narrow">' + esc(T('List')) + '</span><span class="tab-wide">' + esc(T('All agreements')) + '</span>') +
      tabBtn('map', icon('map', 'sm-ico') + ' ' + esc(T('Map'))) +
      tabBtn('favorite', icon('bookmark', 'sm-ico') + ' ' + esc(T('Favorite')) + (favN ? ' <span class="tab-count">' + favN + '</span>' : '')) +
      '</div>' +
      bodyHtml +
      '</div></div>');
    const c = wrap.querySelector('.card');
    wrap.querySelectorAll('[data-maptab]').forEach(b => {
      b.onclick = () => {
        const t = b.dataset.maptab;
        st().mapTab = t;
        if (t !== 'favorite') st().mapView = t;
        Store.saveLocal();
        render();
      };
    });

    if (tab === 'favorite') {
      favoritesInto(c);
    } else {
      let globeBox = null;
      try {
        globeBox = Stage.mapGlobe(c.querySelector('#uni-count'), id => { st().activeUniId = id; go('uni'); });
      } catch (err) { console.warn('[map globe]', err); }

      const fillList = () => {
        const el = c.querySelector('#uni-list');
        const { lang, country } = st().filters;
        let unis = Store.sortedUnis();
        if (lang) unis = unis.filter(u => u.agreement && u.agreement.language === lang);
        if (country) unis = unis.filter(u => u.country === country);
        el.innerHTML = '';
        if (!unis.length) el.innerHTML = hint(T('No agreements match the filters.'));
        for (const u of unis) el.appendChild(uniCard(u));
        c.querySelector('#uni-count').textContent = T('{n} agreements, best match first', { n: unis.length });
        Stage.syncMap(globeBox);
      };
      buildFilters(c.querySelector('#filters'), fillList);
      fillList();
    }
    root.appendChild(wrap);
  }

  async function viewUniversity(root) {
    const u = await Store.getUniversityDetail(st().activeUniId);
    if (!u || !u.summary || !u.matches) { go('map', { replace: true }); return; }
    const s = u.summary;
    const a = u.agreement || {};
    const pct = s.total ? s.matched / s.total : 0;
    const circ = 2 * Math.PI * 42;
    const fav = Store.isFavorite(u.id);
    const wrap = h('<div class="screen panel">' +
      '<div class="card">' +
      '<div class="uni-head">' +
      '<div class="match-ring">' +
      '<svg width="96" height="96">' +
      '<circle cx="48" cy="48" r="42" fill="none" stroke="var(--surface-2)" stroke-width="6"/>' +
      '<circle cx="48" cy="48" r="42" fill="none" stroke="var(--good)" stroke-width="6" stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ * (1 - pct) + '"/>' +
      '</svg>' +
      '<div class="inside"><span class="num">' + s.matched + '/' + s.total + '</span><span class="lbl">' + esc(T('subjects match')) + '</span></div>' +
      '</div>' +
      '<div style="min-width:0">' +
      '<h2 style="font-size:18px">' + flagImg(u.country_code, 'inline-ico') + ' ' + esc(u.name) + '</h2>' +
      '<p class="hint" style="margin:4px 0 0">' + esc(u.city) + ', ' + esc(T(u.country)) + '</p>' +
      siteLink(u, 'uni-link-lg') +
      '</div></div>' +
      '<div class="agr-facts">' +
      '<span><b>' + esc(T('Agreement')) + '</b>' + esc(a.code || '') + '</span>' +
      '<span><b>' + esc(T('Field')) + '</b>' + esc(a.isced_name || '') + '</span>' +
      '<span><b>' + esc(T('Language of instruction')) + '</b>' + esc(T(a.language || '')) + ' ' + esc(a.level || '') + '</span>' +
      '<span><b>' + esc(T('Places')) + '</b>' + esc(placesText(a)) + '</span>' +
      '</div>' +
      fitNotice(a.language_fit) +
      label(T('ECTS covered: {n} of 30', { n: s.ects_covered })) +
      '<div class="ects-bar"><div style="width:' + Math.min(100, s.ects_covered / 30 * 100) + '%"></div></div>' +
      '<div id="rows" style="margin-top:12px"></div>' +
      '<div class="two-btns">' +
      '<button class="ghost" id="add-sl">' + icon(fav ? 'check' : 'plus', 'inline-ico') + ' ' + esc(T(fav ? 'In favorites' : 'Favorite')) + '</button>' +
      '<button class="ghost" id="la-draft">' + icon('file-text', 'inline-ico') + ' ' + esc(T('Learning Agreement draft (PDF)')) + '</button>' +
      '</div>' +
      applyButton(u) +
      hint(T('The application itself is made in the platform. PoliGo opens its form for this agreement.')) +
      '</div></div>');
    const rows = wrap.querySelector('#rows');
    const icons = { good: 'check', partial: 'arrow-right', none: 'x' };
    const labels = { good: 'Good match', partial: 'Partial match', none: 'No match' };
    for (const m of u.matches) {
      const row = h('<div class="match-row" tabindex="0">' +
        '<div class="line1"><span>' + esc(T(m.home_name)) + '</span><span class="arrow">' + icon('arrow-right', 'sm-ico') + '</span>' +
        '<span>' + esc(m.partner_name ? T(m.partner_name) : T('No partner course')) + '</span></div>' +
        '<div class="line2"><span class="pill ' + m.label + '">' + icon(icons[m.label], 'sm-ico') + ' ' + esc(T(labels[m.label] || m.label)) + '</span>' +
        '<span>' + (m.partner_ects ? m.partner_ects + ' ECTS' : '') + (m.partner_language ? ' · ' + esc(T(m.partner_language)) : '') + '</span></div>' +
        '<div class="explain" hidden>' + esc(T(m.explanation || '')) +
        (m.missing_topics && m.missing_topics.length ? '<br/>' + esc(T('Missing:')) + ' ' + esc(m.missing_topics.map(T).join(', ')) : '') + '</div>' +
        '</div>');
      const toggle = () => { const ex = row.querySelector('.explain'); ex.hidden = !ex.hidden; };
      row.onclick = toggle;
      row.onkeydown = ev => { if (ev.key === 'Enter') toggle(); };
      rows.appendChild(row);
    }
    wrap.querySelector('#add-sl').onclick = async () => {
      try {
        if (Store.isFavorite(u.id)) { await Store.removeFromShortlist(u.id); toast(T('Removed from favorites')); }
        else { await Store.addToShortlist(u.id); toast(T('Added to favorites')); }
        render();
      } catch (e) { toast(errText(e)); }
    };
    wrap.querySelector('#la-draft').onclick = () => openLaSheet(u);
    root.appendChild(wrap);
  }

  function favoritesInto(mapCard) {
    const ids = Store.shortlist();
    const emptyEl = mapCard.querySelector('#fav-empty');
    if (emptyEl) emptyEl.hidden = ids.length !== 0;
    const list = mapCard.querySelector('#sl-list');
    list.innerHTML = '';
    ids.forEach((id, idx) => {
      const u = Store.uniById(id);
      if (!u) return;
      const row = h('<div class="card uni-card">' +
        '<span class="badge"><span class="num">' + (idx + 1) + '</span></span>' +
        '<span style="min-width:0"><span class="name">' + esc(u.name) + '</span><br/>' +
        '<span class="meta">' + esc(u.city) + ' - ' + u.summary.matched + '/' + u.summary.total + ' ' + esc(T('match')) + ' - ' + esc(placesText(u.agreement)) + '</span><br/>' +
        fitPill(u.agreement.language_fit) + '</span>' +
        '<span class="fav-actions">' +
        applyButton(u, 'ghost') +
        '<button class="icon-btn" data-remove aria-label="' + esc(T('Remove')) + '">' + icon('trash-2') + '</button>' +
        '</span></div>');
      row.querySelector('[data-remove]').onclick = async () => {
        try { await Store.removeFromShortlist(id); render(); } catch (e) { toast(errText(e)); }
      };
      row.querySelector('.name').onclick = () => { st().activeUniId = id; go('uni'); };
      list.appendChild(row);
    });
  }

  /* ------------------------------------------------ Learning Agreement draft */

  async function openLaSheet(u) {
    let data;
    try { data = await Store.getLa(u.id); } catch (e) { toast(errText(e)); return; }
    const picked = new Set(data.rows.map(r => r.home_course_id));
    const labels = { good: 'Good match', partial: 'Partial match' };
    const sheet = h('<div class="sheet" role="dialog" aria-modal="true">' +
      '<div class="sheet-grab"></div>' +
      '<h2>' + esc(T('Learning Agreement draft')) + '</h2>' +
      hint(T('Pick the courses for Table A. Each one is paired with the UPT course it replaces (Table B).'), 'margin-top:0') +
      '<div id="la-opts">' + data.options.map(m =>
        '<label class="task-card"><input type="checkbox" data-hc="' + esc(m.home_course_id) + '" ' + (picked.has(m.home_course_id) ? 'checked' : '') + ' />' +
        '<span><span class="t-title">' + esc(m.partner_name) + ' (' + m.partner_ects + ' ECTS)</span>' +
        '<span class="t-meta">' + esc(T('replaces {course}', { course: T(m.home_name) })) + ' · ' + esc(T(labels[m.label] || m.label)) + '</span></span></label>'
      ).join('') + '</div>' +
      '<p class="hint" id="la-total"></p>' +
      '<div class="notice" id="la-warn" hidden></div>' +
      '<button class="primary" id="la-go">' + icon('file-text', 'inline-ico') + ' ' + esc(T('Save and download the PDF')) + '</button>' +
      '<button class="link" id="la-cancel">' + esc(T('Close')) + '</button>' +
      '</div>');
    const total = () => {
      const ids = [...sheet.querySelectorAll('[data-hc]:checked')].map(x => x.dataset.hc);
      const rows = data.options.filter(m => ids.indexOf(m.home_course_id) !== -1);
      const a = rows.reduce((s, r) => s + (r.partner_ects || 0), 0);
      const b = rows.reduce((s, r) => s + (r.home_ects || 0), 0);
      sheet.querySelector('#la-total').textContent = T('Table A: {a} ECTS abroad · Table B: {b} ECTS recognised at UPT', { a, b });
      const warn = sheet.querySelector('#la-warn');
      warn.hidden = a >= 30;
      warn.innerHTML = icon('triangle-alert', 'sm-ico') + '<span>' + esc(T('A semester abroad is usually 30 ECTS. Ask your coordinator how to cover the rest.')) + '</span>';
      return ids;
    };
    sheet.querySelectorAll('[data-hc]').forEach(cb => { cb.onchange = total; });
    total();
    sheet.querySelector('#la-cancel').onclick = () => sheet.remove();
    sheet.querySelector('#la-go').onclick = async () => {
      const win = window.open('', '_blank');   // opened synchronously so popup blockers allow it
      try {
        const out = await Store.saveLa(u.id, total());
        printLa(win, u, out.rows);
        sheet.remove();
      } catch (e) {
        if (win) win.close();
        toast(errText(e));
      }
    };
    document.body.appendChild(sheet);
  }

  // A printable draft; the browser's "Save as PDF" turns it into the PDF file.
  function printLa(win, u, rows) {
    if (!win) { toast(T('Allow pop-ups for PoliGo to download the PDF.')); return; }
    const me = st().me;
    const s = me.student;
    const r = (mobility() && mobility().university_id === u.id ? mobility().round : null) || me.round;
    const a = u.agreement || {};
    const sumA = rows.reduce((x, y) => x + (y.partner_ects || 0), 0);
    const sumB = rows.reduce((x, y) => x + (y.home_ects || 0), 0);
    const td = v => '<td>' + esc(v) + '</td>';
    const doc = '<!doctype html><html lang="' + (isRo() ? 'ro' : 'en') + '"><head><meta charset="utf-8"/>' +
      '<title>' + esc(T('Learning Agreement draft') + ' - ' + s.name + ' - ' + u.name) + '</title>' +
      '<style>' +
      'body{font:12px/1.45 Inter,Arial,sans-serif;color:#111;margin:28px}' +
      'h1{font-size:18px;margin:0 0 2px}h2{font-size:13px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.04em}' +
      '.draft{color:#b45309;font-weight:700;font-size:11px;letter-spacing:.08em}' +
      'table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}' +
      'th{background:#eee}.meta td{border:0;padding:2px 10px 2px 0}.num{text-align:right}' +
      '.sign{display:flex;gap:16px;margin-top:34px}.sign div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:11px}' +
      '.foot{margin-top:26px;font-size:10px;color:#555}' +
      '@page{margin:16mm}' +
      '</style></head><body>' +
      '<p class="draft">' + esc(T('DRAFT - NOT AN OFFICIAL DOCUMENT')) + '</p>' +
      '<h1>' + esc(T('Learning Agreement for Studies - before the mobility')) + '</h1>' +
      '<table class="meta">' +
      '<tr><td><b>' + esc(T('Student')) + '</b></td>' + td(s.name) + '<td><b>' + esc(T('Sending institution')) + '</b></td>' + td('Universitatea Politehnica Timișoara - ' + s.faculty_name) + '</tr>' +
      '<tr><td><b>' + esc(T('Programme')) + '</b></td>' + td(T(s.program) + ', ' + T('year {n}', { n: s.year })) + '<td><b>' + esc(T('Receiving institution')) + '</b></td>' + td(u.name + ', ' + u.city + ' (' + T(u.country) + ')') + '</tr>' +
      '<tr><td><b>' + esc(T('Agreement')) + '</b></td>' + td(a.code || '') + '<td><b>' + esc(T('Field')) + '</b></td>' + td(a.isced_name || '') + '</tr>' +
      '<tr><td><b>' + esc(T('Period')) + '</b></td>' + td(r ? fmtDate(r.mobility_start) + ' - ' + fmtDate(r.mobility_end) : '') + '<td><b>' + esc(T('Language of instruction')) + '</b></td>' + td(T(a.language || '') + ' ' + (a.level || '')) + '</tr>' +
      '</table>' +
      '<h2>' + esc(T('Table A - study programme at the receiving institution')) + '</h2>' +
      '<table><tr><th>#</th><th>' + esc(T('Course title (as in the course catalogue)')) + '</th><th>' + esc(T('Language')) + '</th><th class="num">ECTS</th></tr>' +
      rows.map((x, i) => '<tr>' + td(i + 1) + td(x.partner_name) + td(T(x.partner_language || '')) + '<td class="num">' + esc(x.partner_ects) + '</td></tr>').join('') +
      '<tr><th colspan="3">' + esc(T('Total')) + '</th><th class="num">' + sumA + '</th></tr></table>' +
      '<h2>' + esc(T('Table B - recognition at the sending institution')) + '</h2>' +
      '<table><tr><th>#</th><th>' + esc(T('UPT course replaced')) + '</th><th>' + esc(T('Replaced by')) + '</th><th class="num">ECTS</th></tr>' +
      rows.map((x, i) => '<tr>' + td(i + 1) + td(T(x.home_name)) + td(x.partner_name) + '<td class="num">' + esc(x.home_ects) + '</td></tr>').join('') +
      '<tr><th colspan="3">' + esc(T('Total')) + '</th><th class="num">' + sumB + '</th></tr></table>' +
      '<div class="sign"><div>' + esc(T('Student')) + '</div><div>' + esc(T('UPT faculty coordinator')) + '</div><div>' + esc(T('Host coordinator')) + '</div></div>' +
      '<p class="foot">' + esc(T('Prepared with PoliGo from the course matches on {date}. Copy it into the official Learning Agreement and upload the signed version in the mobility platform.', { date: fmtDate(ymd(new Date())) })) + '</p>' +
      '<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>' +
      '</body></html>';
    win.document.open();
    win.document.write(doc);
    win.document.close();
  }

  /* ----------------------------------------------------------- mobility guide */

  function viewGuideLocked(root) {
    const me = st().me;
    const apps = (me && me.applications) || [];
    const wrap = h('<div class="screen panel">' +
      card(label(T('Mobility guide')) +
        '<h2>' + esc(T('The guide opens once you are Titular')) + '</h2>' +
        hint(T('The selection committee decides in the platform. As soon as your application shows "Titular" or "Aprobat" there, the guide opens here with your real documents and deadlines.')) +
        (apps.length ? hint(T('Status in the platform now: {status}', { status: apps.map(a => T(a.status)).join(', ') })) : '') +
        '<button class="primary" id="gl-dest">' + icon('globe', 'inline-ico') + ' ' + esc(T('Choose a destination')) + '</button>') +
      '</div>');
    wrap.querySelector('#gl-dest').onclick = () => go('home', { replace: true });
    root.appendChild(wrap);
  }

  const stageLabel = s => T(STAGE_LABELS[s] || s);

  // Platform documents and PoliGo steps in one list.
  function planItems() {
    const g = guide();
    if (!g) return [];
    const docs = (g.documents || []).map(d => ({
      kind: 'doc', id: d.id, title: d.title, stage: DOC_STAGE[d.phase] || 'during', due: d.deadline,
      done: docDone(d), doc: d,
    }));
    const tasks = (g.tasks || []).map(t => ({
      kind: 'task', id: t.id, title: t.title, stage: t.stage, due: t.due_date, done: !!t.done, task: t,
    }));
    return docs.concat(tasks).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  }

  const docPill = d => {
    const [cls, ico, text] = DOC_STATUS[d.status] || DOC_STATUS.not_yet;
    return '<span class="pill ' + cls + '">' + icon(ico, 'sm-ico') + ' ' + esc(T(text)) + '</span>';
  };

  const srcTag = text => '<span class="src-tag">' + esc(T(text)) + '</span>';

  function itemHtml(i) {
    if (i.kind === 'doc') {
      return '<div class="task-card plat ' + (i.done ? 'done' : '') + '">' +
        '<span class="plat-ico">' + icon('landmark', 'sm-ico') + '</span>' +
        '<span style="flex:1;min-width:0"><span class="t-title">' + esc(T(i.title)) + '</span>' +
        '<span class="t-meta">' + dueChip(i.due) + ' ' + docPill(i.doc) + ' ' + srcTag('Platform deadline') + '</span></span></div>';
    }
    const src = { poligo: 'Not tracked by the platform', user: 'Added by you', scan: 'From scan' }[i.task.source] || '';
    return '<label class="task-card ' + (i.done ? 'done' : '') + '">' +
      '<input type="checkbox" data-id="' + i.id + '" ' + (i.done ? 'checked' : '') + ' />' +
      '<span><span class="t-title">' + esc(T(i.title)) + '</span>' +
      '<span class="t-meta">' + dueChip(i.due) + ' ' + (src ? srcTag(src) : '') + '</span></span></label>';
  }

  function wireTaskBoxes(scope, after) {
    scope.querySelectorAll('input[type=checkbox][data-id]').forEach(cb => {
      cb.onchange = async () => {
        cb.closest('.task-card').classList.toggle('done', cb.checked);
        try { await Store.toggleTask(parseInt(cb.dataset.id, 10), cb.checked); } catch (e) { toast(errText(e)); }
        if (after) after();
      };
    });
  }

  function viewToday(root) {
    const g = guide();
    const mob = g.mobility;
    const uni = Store.uniById(mob.university_id);
    const now = new Date();
    const start = parseYmd(mob.start_date), end = parseYmd(mob.end_date), arrival = parseYmd(mob.arrival_date || mob.start_date);
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    let countNum, countText;
    if (now < arrival) { countNum = clockParts(arrival - now).d; countText = T('days to departure'); }
    else if (now <= end) { countNum = Math.max(1, Math.ceil((now - arrival) / 86400000)); countText = T('day of') + ' ' + totalDays; }
    else { countNum = '✓'; countText = T('Welcome back!'); }
    const items = planItems();
    const open = items.filter(i => !i.done);
    const overdue = open.filter(i => i.due && daysUntil(i.due) < 0);
    const next = open.slice(0, 4);
    const circ = 2 * Math.PI * 52;
    const frac = Math.min(1, Math.max(0, (now - arrival) / ((end - arrival) || 1)));
    const wrap = h('<div class="screen panel">' +
      '<div class="card today-head">' +
      '<div class="ring">' +
      '<svg width="120" height="120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-2)" stroke-width="6"/>' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent-live)" stroke-width="6" stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ * (1 - frac) + '"/></svg>' +
      '<div class="inside"><span class="big-num">' + esc(countNum) + '</span><span class="unit">' + esc(countText) + '</span></div>' +
      '</div>' +
      '<div style="min-width:0">' +
      label(uni ? uni.name : T('Your mobility')) +
      '<p class="hint" style="margin:4px 0 0">' + esc(fmtDate(mob.start_date)) + ' → ' + esc(fmtDate(mob.end_date)) + '<br/>' + esc(uni ? uni.city + ', ' + T(uni.country) : '') + '</p>' +
      '<p style="margin:8px 0 0"><span class="pill good">' + icon('check', 'sm-ico') + ' ' + esc(T(mob.status)) + '</span></p>' +
      '</div></div>' +
      (overdue.length ? '<div class="notice bad">' + icon('triangle-alert', 'sm-ico') + '<span>' + esc(T('{n} item(s) are past their deadline', { n: overdue.length })) + '</span></div>' : '') +
      '<div class="card" id="next">' + label(T('What to do now')) +
      (next.map(itemHtml).join('') || hint(T('All clear.'), 'margin:0')) +
      '<button class="link" id="to-plan">' + esc(T('See the whole plan')) + '</button></div>' +
      '<button class="primary" id="scan-btn">' + icon('scan-line', 'inline-ico') + ' ' + esc(T('Scan a document')) + '</button>' +
      '</div>');
    wireTaskBoxes(wrap.querySelector('#next'));
    wrap.querySelector('#to-plan').onclick = () => go('plan');
    wrap.querySelector('#scan-btn').onclick = () => go('scanJ');
    startCountdown(wrap);
    root.appendChild(wrap);
  }

  function viewPlan(root) {
    const g = guide();
    const items = planItems();
    if (!tlOpen) tlOpen = new Set(STAGES.filter(s => items.some(i => i.stage === s && !i.done)).slice(0, 2));
    const panel = h('<div class="screen panel">' +
      '<div class="card" id="tl"></div>' +
      card(label(T('Add your own task')) +
        '<div class="form-field"><input id="new-task" placeholder="' + esc(T('e.g. Pick up keys from landlord')) + '" aria-label="' + esc(T('Add your own task')) + '" /></div>' +
        '<button class="ghost" id="add-task">' + esc(T('Add task')) + '</button>') +
      card(label(T('Calendar')) +
        hint(T('Download the official deadlines and your steps as a calendar file (Google Calendar, Outlook, Apple Calendar).'), 'margin-top:0') +
        '<a class="ghost" href="/api/calendar.ics" download="poligo.ics">' + icon('calendar-days', 'inline-ico') + ' ' + esc(T('Download .ics')) + '</a>' +
        ext(g.platform_documents_url, T('Open my documents in the platform'))) +
      '</div>');
    const tl = panel.querySelector('#tl');
    const draw = () => {
      const list = planItems();
      tl.innerHTML = label(T('Your plan')) +
        hint(T('Official documents and deadlines come from the platform; the other steps are the ones it does not track.'), 'margin-top:0') +
        STAGES.map(s => {
          const part = list.filter(i => i.stage === s);
          if (!part.length) return '';
          const open = tlOpen.has(s);
          return '<section class="stage">' +
            '<button class="stage-h' + (open ? ' open' : '') + '" data-toggle="' + s + '" aria-expanded="' + open + '">' +
            '<span class="sh-l">' + icon('chevron-down', 'sm-ico') + esc(stageLabel(s)) + '</span>' +
            '<span class="sh-n">' + part.filter(i => i.done).length + ' / ' + part.length + '</span></button>' +
            (open ? part.map(itemHtml).join('') : '') + '</section>';
        }).join('');
      tl.querySelectorAll('[data-toggle]').forEach(b => {
        b.onclick = () => { const s = b.dataset.toggle; tlOpen.has(s) ? tlOpen.delete(s) : tlOpen.add(s); draw(); };
      });
      wireTaskBoxes(tl, draw);
    };
    draw();
    panel.querySelector('#add-task').onclick = async () => {
      const inp = panel.querySelector('#new-task');
      if (!inp.value.trim()) return;
      try {
        await Store.addTask(inp.value.trim(), 'during', null);
        tlOpen.add('during');
        inp.value = '';
        draw();
      } catch (e) { toast(errText(e)); }
    };
    root.appendChild(panel);
  }

  async function viewDocs(root) {
    const g = guide();
    const scans = await Store.getScans();
    const uni = Store.uniById(g.mobility.university_id);
    const phases = [['before', 'Before departure'], ['arrival', 'On arrival'], ['after', 'After return']];
    const docCard = d => '<details class="doc-explain">' +
      '<summary><span class="t-title">' + esc(T(d.title)) + '</span>' +
      '<span class="t-meta">' + dueChip(d.deadline) + ' ' + docPill(d) + '</span></summary>' +
      '<dl>' +
      '<dt>' + esc(T('What it is')) + '</dt><dd>' + esc(T(d.what)) + '</dd>' +
      '<dt>' + esc(T('Who signs')) + '</dt><dd>' + esc(T(d.who)) + '</dd>' +
      '<dt>' + esc(T('Where')) + '</dt><dd>' + esc(T(d.where)) + '</dd>' +
      '</dl>' +
      (d.id === 'la-before' && uni ? '<button class="ghost" data-la>' + icon('file-text', 'inline-ico') + ' ' + esc(T('Make the draft from your matches')) + '</button>' : '') +
      (d.id === 'tor' ? '<button class="ghost" data-rec>' + icon('shield-check', 'inline-ico') + ' ' + esc(T('Check it against your Learning Agreement')) + '</button>' : '') +
      '</details>';
    const wrap = h('<div class="screen panel">' +
      card(label(T('Platform documents, in plain words')) +
        hint(T('What the platform asks for, why, who signs it and by when. The status is read from the platform.'), 'margin-top:0') +
        phases.map(([ph, text]) => {
          const ds = (g.documents || []).filter(d => d.phase === ph);
          return ds.length ? '<p class="section-label" style="margin-top:14px">' + esc(T(text)) + '</p>' + ds.map(docCard).join('') : '';
        }).join('') +
        ext(g.platform_documents_url, T('Upload documents in the platform'))) +
      card(label(T('Papers you scanned abroad')) +
        (scans.length
          ? scans.map(s => '<div class="task-card"><span><span class="t-title">' + esc(s.document_type) + '</span><span class="t-meta">' + esc(s.summary || '') + '</span></span></div>').join('')
          : hint(T('Got a paper in another language? Scan it and get plain answers.'), 'margin-top:0')) +
        '<button class="ghost" id="go-scan">' + icon('scan-line', 'inline-ico') + ' ' + esc(T('Scan a document')) + '</button>') +
      '</div>');
    const la = wrap.querySelector('[data-la]');
    if (la) la.onclick = async () => openLaSheet(await Store.getUniversityDetail(uni.id) || uni);
    const rec = wrap.querySelector('[data-rec]');
    if (rec) rec.onclick = () => go('recognition');
    wrap.querySelector('#go-scan').onclick = () => go('scanJ');
    root.appendChild(wrap);
  }

  /* ------------------------------------------------------------------ scanner */

  function parseScan(doc) {
    let r = typeof doc.result_json === 'string' ? JSON.parse(doc.result_json) : doc.result_json;
    if (r && r.result && !r.what) r = r.result;
    r = r || {};
    const kw = (r.keywords || []).map(k => Array.isArray(k) ? { term: k[0], meaning: k[1] } : k);
    return {
      what: r.what || '', steps: r.steps || [], deadlines: r.deadlines || [], bring: r.bring || [],
      watch_out: r.watch_out || '', keywords: kw, sample: !!(r.sample || doc.sample),
    };
  }

  function viewScan(root) {
    const sampleMode = st().platform && st().platform.scanner === 'sample';
    const wrap = h('<div class="screen panel">' +
      '<div class="card">' +
      label(T('Scan a document')) +
      hint(T('Photograph or upload a paper you received abroad: a rental contract, a registration form, a bill. You get what it is, what to do and by when.')) +
      '<div class="form-field"><input id="scan-file" type="file" accept="image/*,application/pdf" capture="environment" aria-label="' + esc(T('Choose a photo')) + '" /></div>' +
      '<button class="primary" id="do-scan">' + icon('scan-line', 'inline-ico') + ' ' + esc(T('Scan document')) + '</button>' +
      '<p class="disclaimer">' + esc(T('AI explanation, not legal advice. Check anything important with the office that issued the paper. The photo is not stored; only the explanation is.')) + '</p>' +
      (sampleMode ? '<p class="disclaimer">' + esc(T('The scanner has no API key on this server, so it answers with a sample document.')) + '</p>' : '') +
      '</div>' +
      '<div class="scan-cards" id="scan-result"></div>' +
      '</div>');
    wrap.querySelector('#do-scan').onclick = async () => {
      const res = wrap.querySelector('#scan-result');
      const file = wrap.querySelector('#scan-file').files[0];
      if (!file) { toast(T('Choose a photo or PDF first')); return; }
      res.innerHTML = card(hint(T('Reading your document...'), 'margin:0'));
      try {
        const doc = await Store.scan(file);
        const r = parseScan(doc);
        res.innerHTML = scanResultHtml(r);
        wireDeadlines(res, r);
      } catch (e) {
        res.innerHTML = card(label(T('Error')) + '<p style="margin:4px 0 0">' + esc(T('The scanner could not read the document.')) + ' ' + esc(errText(e)) + '</p>');
      }
    };
    root.appendChild(wrap);

    function scanResultHtml(r) {
      return (r.sample ? '<div class="notice">' + icon('info', 'sm-ico') + '<span>' + esc(T('Sample result - no API key is configured on this server.')) + '</span></div>' : '') +
        card(label(T('What this is')) + '<p style="margin:4px 0 0">' + esc(r.sample ? T(r.what) : r.what) + '</p>') +
        (r.steps.length ? card(label(T('What you need to do')) + '<ol>' + r.steps.map(s => '<li>' + esc(r.sample ? T(s) : s) + '</li>').join('') + '</ol>') : '') +
        (r.deadlines.length ? card(label(T('Deadlines')) + r.deadlines.map((dl, i) =>
          '<div class="task-card"><span class="t-title">' + esc(r.sample ? T(dl.text) : dl.text) + (dl.date ? ' (' + esc(fmtDate(dl.date)) + ')' : '') + '</span>' +
          '<button class="ghost" data-dl="' + i + '">' + esc(T('Add to plan')) + '</button></div>').join('')) : '') +
        (r.bring.length ? card(label(T('Bring with you')) + '<ul>' + r.bring.map(b => '<li>' + esc(r.sample ? T(b) : b) + '</li>').join('') + '</ul>') : '') +
        (r.watch_out ? card(label(T('Watch out')) + '<p style="margin:4px 0 0;display:flex;gap:6px;align-items:flex-start">' + icon('triangle-alert', 'sm-ico warn') + '<span>' + esc(r.sample ? T(r.watch_out) : r.watch_out) + '</span></p>') : '') +
        (r.keywords.length ? card(label(T('Key words')) + '<p style="margin:4px 0 0">' + r.keywords.map(k => '<span class="pill kw">' + esc(k.term) + ' → ' + esc(r.sample ? T(k.meaning) : k.meaning) + '</span>').join(' ') + '</p>') : '');
    }

    function wireDeadlines(res, r) {
      res.querySelectorAll('[data-dl]').forEach(b => {
        b.onclick = async () => {
          const dl = r.deadlines[parseInt(b.dataset.dl, 10)];
          const due = dl.date && /^\d{4}-\d{2}-\d{2}$/.test(dl.date) ? dl.date : ymd(addDays(new Date(), dl.offset_days || 7));
          try {
            await Store.addTask(r.sample ? T(dl.title || dl.text) : (dl.title || dl.text), 'during', due, 'scan');
            b.textContent = T('Added');
            b.disabled = true;
            toast(T('Added to your plan'));
          } catch (e) { toast(errText(e)); }
        };
      });
    }
  }

  /* -------------------------------------- return check: LA vs. Transcript */

  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  function findOnTranscript(name, transcript) {
    const n = norm(name);
    if (!n) return null;
    return transcript.find(t => norm(t.name) === n) ||
      transcript.find(t => { const m = norm(t.name); return m && (m.indexOf(n) !== -1 || n.indexOf(m) !== -1); }) || null;
  }

  // ok: passed with the planned credits; short: passed with fewer credits;
  // failed: on the transcript but not passed; missing: not on the transcript.
  function compare(la, transcript) {
    return la.map(r => {
      const t = findOnTranscript(r.partner_name, transcript);
      let status = 'missing';
      if (t && !t.passed) status = 'failed';
      else if (t && Number(t.ects) < Number(r.partner_ects)) status = 'short';
      else if (t) status = 'ok';
      return Object.assign({}, r, { tor: t, status });
    });
  }

  async function viewRecognition(root) {
    const wrap = h('<div class="screen panel"><div class="card">' + hint(T('Loading...'), 'margin:0') + '</div></div>');
    root.appendChild(wrap);
    let data;
    try { data = await Store.getRecognition(); } catch (e) { wrap.innerHTML = card(esc(errText(e))); return; }
    let rows = (data.transcript || []).map(x => Object.assign({}, x));
    const STATUS = {
      ok: ['good', 'check', 'Recognised'],
      short: ['partial', 'triangle-alert', 'Fewer credits than planned'],
      failed: ['none', 'x', 'Not passed'],
      missing: ['none', 'x', 'Not on the transcript'],
    };

    wrap.innerHTML = '';
    const result = h('<div class="card"></div>');
    const editor = h('<div class="card"></div>');
    wrap.appendChild(result);
    wrap.appendChild(editor);

    function drawResult() {
      const cmp = compare(data.la, rows);
      const recognised = cmp.filter(c => c.status === 'ok');
      const ectsOk = recognised.reduce((s, c) => s + (c.home_ects || 0), 0);
      const totalHome = data.home_courses.reduce((s, c) => s + c.ects, 0);
      const inLa = new Set(data.la.map(r => r.home_course_id));
      const okIds = new Set(recognised.map(r => r.home_course_id));
      const todo = data.home_courses.filter(c => !okIds.has(c.id));
      result.innerHTML = label(T('Credit recognition')) +
        (rows.length
          ? '<h2>' + esc(T('{a} of {b} UPT credits recognised', { a: ectsOk, b: totalHome })) + '</h2>' +
            '<div class="ects-bar"><div style="width:' + Math.min(100, ectsOk / Math.max(1, totalHome) * 100) + '%"></div></div>'
          : hint(T('After your exams abroad, enter or scan the host Transcript of Records. PoliGo compares it with your Learning Agreement.'), 'margin-top:0')) +
        '<div style="margin-top:12px">' + cmp.map(c => {
          const [cls, ico, text] = STATUS[c.status];
          return '<div class="match-row"><div class="line1"><span>' + esc(c.partner_name) + '</span><span class="arrow">' + icon('arrow-right', 'sm-ico') + '</span><span>' + esc(T(c.home_name)) + '</span></div>' +
            '<div class="line2">' + (rows.length ? '<span class="pill ' + cls + '">' + icon(ico, 'sm-ico') + ' ' + esc(T(text)) + '</span>' : '<span></span>') +
            '<span>' + esc(T('planned {n} ECTS', { n: c.partner_ects })) + (c.tor ? ' · ' + esc(T('got {n} ECTS, grade {g}', { n: c.tor.ects, g: c.tor.grade || '-' })) : '') + '</span></div></div>';
        }).join('') + '</div>' +
        (rows.length && todo.length
          ? '<p class="section-label" style="margin-top:16px">' + esc(T('Still to cover at UPT')) + '</p>' +
            todo.map(c => '<div class="task-card"><span><span class="t-title">' + esc(T(c.name)) + '</span><span class="t-meta">' + c.ects + ' ECTS · ' +
              esc(T(inLa.has(c.id) ? 'in the Learning Agreement, not recognised yet' : 'not in the Learning Agreement')) + '</span></span></div>').join('') +
            hint(T('Talk to your faculty coordinator about these before the recognition deadline.'))
          : '');
    }

    function drawEditor() {
      editor.innerHTML = label(T('Transcript of Records (host)')) +
        '<div id="tor-rows">' + rows.map((r, i) =>
          '<div class="tor-row" data-i="' + i + '">' +
          '<input data-k="name" value="' + esc(r.name) + '" placeholder="' + esc(T('Course name')) + '" aria-label="' + esc(T('Course name')) + '" />' +
          '<input data-k="ects" class="num" inputmode="decimal" value="' + esc(r.ects) + '" aria-label="ECTS" />' +
          '<input data-k="grade" value="' + esc(r.grade) + '" placeholder="' + esc(T('Grade')) + '" aria-label="' + esc(T('Grade')) + '" />' +
          '<label class="tor-pass"><input type="checkbox" data-k="passed" ' + (r.passed ? 'checked' : '') + ' /> ' + esc(T('passed')) + '</label>' +
          '<button class="icon-btn" data-del aria-label="' + esc(T('Remove')) + '">' + icon('trash-2') + '</button>' +
          '</div>').join('') + '</div>' +
        '<div class="two-btns">' +
        '<button class="ghost" id="tor-add">' + icon('plus', 'inline-ico') + ' ' + esc(T('Add a course')) + '</button>' +
        '<button class="ghost" id="tor-from-la">' + esc(T('Start from my Learning Agreement')) + '</button>' +
        '</div>' +
        '<div class="form-field" style="margin-top:12px"><label>' + esc(T('Or scan the transcript')) + '</label>' +
        '<input id="tor-file" type="file" accept="image/*,application/pdf" /></div>' +
        '<button class="ghost" id="tor-scan">' + icon('scan-line', 'inline-ico') + ' ' + esc(T('Read the transcript')) + '</button>' +
        '<button class="primary" id="tor-save">' + esc(T('Save and check')) + '</button>';
      editor.querySelectorAll('.tor-row').forEach(rowEl => {
        const i = +rowEl.dataset.i;
        rowEl.querySelectorAll('[data-k]').forEach(inp => {
          const k = inp.dataset.k;
          const upd = () => {
            rows[i][k] = k === 'passed' ? inp.checked : k === 'ects' ? (parseFloat(String(inp.value).replace(',', '.')) || 0) : inp.value;
            drawResult();
          };
          inp.oninput = upd; inp.onchange = upd;
        });
        rowEl.querySelector('[data-del]').onclick = () => { rows.splice(i, 1); drawEditor(); drawResult(); };
      });
      editor.querySelector('#tor-add').onclick = () => { rows.push({ name: '', ects: 0, grade: '', passed: true }); drawEditor(); };
      editor.querySelector('#tor-from-la').onclick = () => {
        const have = new Set(rows.map(r => norm(r.name)));
        data.la.forEach(r => { if (!have.has(norm(r.partner_name))) rows.push({ name: r.partner_name, ects: r.partner_ects, grade: '', passed: true }); });
        drawEditor(); drawResult();
      };
      editor.querySelector('#tor-scan').onclick = async () => {
        const file = editor.querySelector('#tor-file').files[0];
        if (!file) { toast(T('Choose a photo or PDF first')); return; }
        toast(T('Reading your document...'));
        try {
          const out = await Store.scanTranscript(file);
          rows = (out.courses || []).map(c => ({ name: c.name, ects: c.ects, grade: c.grade, passed: !!c.passed }));
          drawEditor(); drawResult();
          toast(out.sample ? T('Sample result - no API key is configured on this server.') : T('Check the rows, then save.'));
        } catch (e) { toast(errText(e)); }
      };
      editor.querySelector('#tor-save').onclick = async () => {
        try {
          await Store.saveTranscript(rows.filter(r => String(r.name).trim()));
          toast(T('Saved'));
        } catch (e) { toast(errText(e)); }
      };
    }

    drawResult();
    drawEditor();
  }

  /* -------------------------------------------------------------------- intro */

  // The start window once you are Titular: the globe flies from Timisoara to the
  // partner city, then the countdown. Shown once per mobility on this device.
  function showIntro() {
    const mob = mobility();
    const uni = mob && Store.uniById(mob.university_id);
    if (!uni || document.getElementById('intro')) return Promise.resolve();
    return new Promise(resolveIntro => {
      const ov = h('<div id="intro" data-theme="dark" role="dialog" aria-modal="true" aria-label="' + esc(T('Your Erasmus journey')) + '">' +
        '<div class="intro-globe" id="intro-globe"></div>' +
        '<div class="intro-copy">' +
        '<p class="intro-cap" id="in-cap"></p>' +
        '<div class="intro-final">' +
        '<h1 class="intro-greet">' + esc(uni.greeting || '') + '</h1>' +
        '<p class="intro-line">' + esc(T('Congratulations! You are going to {city}, {country}.', { city: uni.city, country: T(uni.country) })) + '</p>' +
        countdownHtml() +
        '<button class="primary" id="in-go">' + esc(T('Open the mobility guide')) + '</button>' +
        '</div>' +
        '<button class="link intro-skip" id="in-skip">' + esc(T('Skip')) + '</button>' +
        '</div></div>');
      document.body.appendChild(ov);
      document.body.classList.add('no-scroll');
      const cap = ov.querySelector('#in-cap');
      tickCountdown(ov);
      const tick = setInterval(() => tickCountdown(ov), 10000);
      let scene = null;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(tick);
        document.removeEventListener('keydown', onKey);
        document.body.classList.remove('no-scroll');
        ov.classList.add('leaving');
        setTimeout(() => ov.remove(), 260);
        resolveIntro();
      };
      const onKey = ev => { if (ev.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      const showFinal = () => {
        cap.textContent = '';
        ov.classList.add('done');
        const goBtn = ov.querySelector('#in-go');
        if (goBtn) goBtn.focus({ preventScroll: true });
      };
      ov.querySelector('#in-go').onclick = close;
      ov.querySelector('#in-skip').onclick = () => (ov.classList.contains('done') ? close() : (scene && scene.finish(), showFinal()));
      try { scene = Stage.introGlobe(ov.querySelector('#intro-globe'), uni); } catch (err) { console.warn('[intro]', err); }
      if (!scene) { showFinal(); return; }
      scene.play(step => {
        if (closed || ov.classList.contains('done')) return;
        if (step === 1) cap.textContent = T('You are here: Timișoara');
        else if (step === 2) cap.textContent = T('Your destination: {city}, {country}', { city: uni.city, country: T(uni.country) });
        else showFinal();
      }).catch(() => showFinal());
    });
  }

  function maybeIntro() {
    const mob = mobility();
    if (!mob) return Promise.resolve();
    const key = 'poligo-intro-' + mob.id;
    try { if (localStorage.getItem(key)) return Promise.resolve(); localStorage.setItem(key, '1'); } catch (e) { /* no storage */ }
    return showIntro();
  }

  /* -------------------------------------------------------------------- start */

  async function start() {
    await Store.boot();
    Stage.init();
    const raw = (location.hash || '').replace(/^#/, '');
    const first = raw || (hasGuide() ? 'today' : 'home');
    go(first, { replace: true, force: true });
    if (!st().noSession && GUIDE_SCREENS.has(st().screen)) maybeIntro();
  }

  return { start, go, goBack, render, toast, showFatal, showIntro };
})();

App.start();
