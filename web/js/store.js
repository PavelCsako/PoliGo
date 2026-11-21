/* store.js - device state + thin API client.
 *
 * PoliGo runs inside the UPT mobility platform: the student comes from the
 * platform session cookie (no PoliGo login), and so do the profile, language
 * levels, agreements, application status and official documents. The server
 * keeps only PoliGo's own data. The last known state mirrors to localStorage
 * so the app still opens offline. */
const Store = (() => {
  const LS_KEY = 'poligo-state';
  const state = {
    theme: 'dark',
    language: 'ro',          // the platform is Romanian by default
    strings: {},
    platform: null,          // { mode, platform_url, demo_students, scanner }
    me: null,                // /api/me: student, round, applications, mobility, shortlist, links
    noSession: false,
    universities: [],        // the faculty's agreements, with match summaries
    homeCourses: [],
    guide: null,             // /api/guide: mobility, documents, tasks
    screen: 'home',
    activeUniId: null,
    filters: { lang: null, country: null, region: null, quality: null },
    mapTab: 'list',
    mapView: 'list',
  };

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        for (const k of ['theme', 'language', 'activeUniId', 'mapTab', 'mapView', 'me', 'universities', 'homeCourses', 'guide']) {
          if (s[k] !== undefined) state[k] = s[k];
        }
      }
    } catch (e) { /* fresh device */ }
    try {
      const s = localStorage.getItem(LS_KEY + '-i18n');
      if (s) state.strings = JSON.parse(s) || {};
    } catch (e) { state.strings = {}; }
    applyTheme();
  }

  function saveLocal() {
    const { theme, language, activeUniId, mapTab, mapView, me, universities, homeCourses, guide } = state;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ theme, language, activeUniId, mapTab, mapView, me, universities, homeCourses, guide }));
      if (Object.keys(state.strings).length) localStorage.setItem(LS_KEY + '-i18n', JSON.stringify(state.strings));
    } catch (e) { /* storage full or blocked */ }
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme === 'light' ? 'light' : 'dark';
    document.documentElement.lang = state.language === 'en' ? 'en' : 'ro';
  }

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' }, opts));
    if (!res.ok) {
      let detail = {};
      try { detail = await res.json(); } catch (e) { /* non-JSON error body */ }
      const err = new Error(detail.message || res.statusText);
      err.code = detail.error || ('ERR_HTTP_' + res.status);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  /* ---------- boot: platform session first ---------- */

  async function loadMe() {
    const me = await api('/api/me');
    state.me = me;
    state.noSession = false;
    if (me.prefs) {
      if (me.prefs.theme) state.theme = me.prefs.theme;
      if (me.prefs.language) state.language = me.prefs.language;
    }
    applyTheme();
    const [ag, courses] = await Promise.all([api('/api/agreements'), api('/api/home-courses')]);
    state.universities = ag.universities;
    state.homeCourses = courses.courses;
    state.guide = null;
    if (me.mobility) {
      try { state.guide = await api('/api/guide'); } catch (e) { /* guide stays closed */ }
    }
    saveLocal();
    return me;
  }

  async function boot() {
    loadLocal();
    try { state.platform = await api('/api/platform/info'); } catch (e) { state.platform = null; }
    try {
      await loadMe();
    } catch (e) {
      if (e.status === 401) { state.noSession = true; state.me = null; state.guide = null; }
      /* offline: keep the last known state */
    }
    await loadStrings(state.language);   // also clears cached strings when the saved preference is English
    return state;
  }

  async function demoLogin(studentId) {
    await api('/api/platform/demo-session', { method: 'POST', body: JSON.stringify({ student_id: studentId }) });
    await loadMe();
  }

  async function demoLogout() {
    await api('/api/platform/demo-logout', { method: 'POST', body: '{}' });
    state.me = null; state.guide = null; state.universities = []; state.noSession = true;
    saveLocal();
  }

  /* ---------- i18n ---------- */

  async function loadStrings(lang) {
    if (!lang || lang === 'en') { state.strings = {}; state.language = 'en'; saveLocal(); return state.strings; }
    try {
      const out = await api('/api/i18n/' + encodeURIComponent(lang));
      state.strings = out.strings || {};
      state.language = lang;
      saveLocal();
    } catch (e) { /* keep old strings when offline */ }
    return state.strings;
  }

  function t(key, vars) {
    let s = (state.strings && state.strings[key]) || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }

  function savePrefs(fields) {
    if (!state.me) return;
    api('/api/me/prefs', { method: 'PATCH', body: JSON.stringify(fields) }).catch(() => {});
  }

  function setTheme(theme) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    applyTheme();
    saveLocal();
    savePrefs({ theme: state.theme });
  }

  async function setLanguage(lang) {
    state.language = lang === 'en' ? 'en' : 'ro';
    await loadStrings(state.language);
    applyTheme();
    saveLocal();
    savePrefs({ language: state.language });
  }

  /* ---------- choose a destination ---------- */

  const uniById = id => state.universities.find(u => u.id === id);
  const score = u => (u.summary ? u.summary.matched / Math.max(1, u.summary.total) : 0);
  const sortedUnis = () => state.universities.slice().sort((a, b) => score(b) - score(a));
  const shortlist = () => (state.me && state.me.shortlist) || [];
  const isFavorite = id => shortlist().indexOf(id) !== -1;

  async function addToShortlist(id) {
    await api('/api/shortlist', { method: 'POST', body: JSON.stringify({ university_id: id }) });
    if (state.me && !isFavorite(id)) state.me.shortlist.push(id);
    saveLocal();
  }

  async function removeFromShortlist(id) {
    await api('/api/shortlist/' + encodeURIComponent(id), { method: 'DELETE' });
    if (state.me) state.me.shortlist = shortlist().filter(x => x !== id);
    saveLocal();
  }

  async function getUniversityDetail(id) {
    try { return await api('/api/agreements/' + encodeURIComponent(id)); }
    catch (e) { return e.status === 404 ? null : uniById(id); }
  }

  const getLa = id => api('/api/la/' + encodeURIComponent(id));
  const saveLa = (id, homeCourseIds) =>
    api('/api/la/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ home_course_ids: homeCourseIds }) });

  /* ---------- mobility guide ---------- */

  async function refreshGuide() {
    state.guide = await api('/api/guide');
    saveLocal();
    return state.guide;
  }

  async function toggleTask(taskId, done) {
    const task = state.guide && state.guide.tasks.find(x => x.id === taskId);
    if (task) task.done = done ? 1 : 0;
    saveLocal();
    await api('/api/tasks/' + taskId + '?done=' + (done ? 'true' : 'false'), { method: 'PATCH', body: 'null' });
  }

  async function addTask(title, stage, dueDate, source) {
    const task = await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title, stage, due_date: dueDate, source: source || 'user' }) });
    if (state.guide) state.guide.tasks.push(task);
    saveLocal();
    return task;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
      r.onerror = () => reject(r.error || new Error('read failed'));
      r.readAsDataURL(file);
    });
  }

  async function scan(file) {
    const data = await fileToBase64(file);
    return api('/api/scan', { method: 'POST', body: JSON.stringify({ data, media_type: file.type, language: state.language }) });
  }

  async function getScans() {
    try { return (await api('/api/scans')).scans; } catch (e) { return []; }
  }

  const getRecognition = () => api('/api/recognition');
  const saveTranscript = courses => api('/api/recognition', { method: 'PUT', body: JSON.stringify({ courses }) });

  async function scanTranscript(file) {
    const data = await fileToBase64(file);
    return api('/api/recognition/scan', { method: 'POST', body: JSON.stringify({ data, media_type: file.type }) });
  }

  async function notify(email) {
    await api('/api/signups', { method: 'POST', body: JSON.stringify({ email }) });
  }

  return {
    state, boot, loadMe, saveLocal, demoLogin, demoLogout,
    loadStrings, t, setTheme, setLanguage,
    uniById, score, sortedUnis, shortlist, isFavorite, addToShortlist, removeFromShortlist, getUniversityDetail, getLa, saveLa,
    refreshGuide, toggleTask, addTask, scan, getScans, getRecognition, saveTranscript, scanTranscript, notify,
  };
})();
