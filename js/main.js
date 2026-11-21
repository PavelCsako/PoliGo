// PoliGo: router and app shell.
import { state, me, inJourney, signOut } from './state.js';
import { icon, lockup, esc } from './ui.js';
import { landing } from './views/landing.js';
import { login, check } from './views/auth.js';
import { courses, map, uni, compare, search, shortlist } from './views/explore.js';
import { profile } from './views/profile.js';
import { intro, today, timeline } from './views/journey.js';
import { admin } from './views/admin.js';

const ROUTES = {
  '': { fn: home }, login: { fn: login, bare: true, guest: true }, check: { fn: check, bare: true, guest: true },
  courses: { fn: courses, student: true, tabs: false }, map: { fn: map, student: true }, uni: { fn: uni, student: true },
  compare: { fn: compare, student: true }, search: { fn: search, student: true }, shortlist: { fn: shortlist, student: true },
  profile: { fn: profile, student: true }, welcome: { fn: intro, student: true, journey: true, bare: true },
  today: { fn: today, student: true, journey: true }, timeline: { fn: timeline, student: true, journey: true },
  admin: { fn: admin, staff: true, tabs: false },
};

export const go = path => { if (location.hash === '#/' + path) render(); else location.hash = '#/' + path; };
export const back = fallback => { if (sessionStorage.getItem('poligo:nav') === '1' && history.length > 1) history.back(); else go(fallback); };

function homePath() {
  const s = state.session;
  if (!s) return null;
  if (s.role === 'staff') return 'admin';
  if (!me()?.onboarded) return 'courses';
  if (inJourney()) return me().seenIntro ? 'today' : 'welcome';
  return 'map';
}
function home(view) { landing(view); }

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const [name, ...rest] = path.split('/');
  return { name: name ?? '', param: rest.join('/') || null, query: new URLSearchParams(qs ?? '') };
}

export function render() {
  const { name, param, query } = parse();
  let route = ROUTES[name];
  const s = state.session;
  if (!route) return go('');
  if (name === '' && s) return go(homePath());
  if (route.guest && s && name !== 'check') return go(homePath());
  if (route.student && s?.role !== 'student') return go('login');
  if (route.staff && s?.role !== 'staff') return go('login');
  if (route.student && !me()?.onboarded && name !== 'courses') return go('courses');
  if (route.journey && !inJourney()) return go('profile');

  document.body.classList.toggle('journey', s?.role === 'student' && inJourney());
  shell(name, route);
  const view = document.getElementById('view');
  view.innerHTML = '';
  window.scrollTo(0, 0);
  route.fn(view, param, query);
}

function tabsFor() {
  return inJourney()
    ? [['today', 'sun', 'Today'], ['timeline', 'calendar', 'Timeline'], ['map', 'globe', 'Map'], ['profile', 'user', 'Profile']]
    : [['map', 'globe', 'Map'], ['search', 'search', 'Search'], ['shortlist', 'bookmark', 'Shortlist'], ['profile', 'user', 'Profile']];
}

function shell(name, route) {
  const top = document.getElementById('topbar'), tab = document.getElementById('tabbar');
  const bare = route.bare || name === '';
  top.classList.toggle('hidden', bare);
  const student = state.session?.role === 'student' && route.student;
  const showTabs = student && route.tabs !== false && !bare;
  tab.classList.toggle('hidden', !showTabs);
  document.body.classList.toggle('has-tabbar', showTabs);
  if (bare) return;
  const active = name === 'uni' || name === 'compare' ? (inJourney() ? 'map' : name === 'compare' ? 'shortlist' : 'map') : name;
  const items = student && route.tabs !== false ? tabsFor() : [];
  const links = items.map(([p, ic, l]) => `<a href="#/${p}" class="${p === active ? 'on' : ''}">${icon(ic, 22)}<span>${l}</span></a>`).join('');
  const u = me();
  const initials = u ? u.name.split(' ').map(w => w[0]).slice(0, 2).join('') : '';
  const right = state.session?.role === 'staff'
    ? `<div class="row gap12"><span class="quiet small">Erasmus Office</span><button class="btn ghost sm" id="signout">${icon('logout', 16)}Sign out</button></div>`
    : u ? `<a href="#/profile" class="avatar" aria-label="Profile">${esc(initials)}</a>` : '';
  top.innerHTML = `<a href="#/" aria-label="PoliGo home">${lockup(28)}</a><nav class="topnav">${links}</nav>${right}`;
  tab.innerHTML = links;
  top.querySelector('#signout')?.addEventListener('click', () => { signOut(); go(''); });
}

window.addEventListener('hashchange', () => { sessionStorage.setItem('poligo:nav', '1'); render(); });
render();
