// App state, saved in the browser (localStorage). In this prototype nothing is sent to a server.
import { DEMO_REQUESTS, PROGRAMS } from './data.js';

const KEY = 'poligo:v1';
const fresh = () => ({ session: null, pending: null, users: {}, requests: DEMO_REQUESTS.map(r => ({ ...r })) });

function load() {
  try { const s = localStorage.getItem(KEY); if (s) return { ...fresh(), ...JSON.parse(s) }; } catch { /* storage blocked */ }
  return fresh();
}

export const state = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked: keep in memory */ } }

export const STUDENT_DOMAIN = '@student.upt.ro';
export const STAFF_DOMAIN = '@upt.ro';

export function roleFor(email) {
  const e = email.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+$/.test(e)) return null;
  if (e.endsWith(STUDENT_DOMAIN)) return 'student';
  if (e.endsWith(STAFF_DOMAIN)) return 'staff';
  return null;
}

export function nameFromEmail(email) {
  return email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export function signIn(email) {
  const e = email.trim().toLowerCase(), role = roleFor(e);
  state.session = { email: e, role };
  if (role === 'student' && !state.users[e]) {
    state.users[e] = { name: nameFromEmail(e), program: 'cti', semester: 'fall', courses: {}, shortlist: [], compare: [], onboarded: false, done: {}, custom: [], seenIntro: false };
  }
  state.pending = null;
  save();
}
export function signOut() { state.session = null; save(); }

export const me = () => (state.session?.role === 'student' ? state.users[state.session.email] : null);
export function update(fn) { const u = me(); if (u) { fn(u); save(); } }

export const myRequest = () => {
  const e = state.session?.email;
  return state.requests.filter(r => r.email === e).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
};
export const inJourney = () => myRequest()?.status === 'confirmed';

export function submitRequest({ uniId, start, end, letter }) {
  const u = me();
  state.requests.push({
    id: 'r' + Date.now().toString(36), email: state.session.email, name: u.name,
    program: `${PROGRAMS[u.program].short} · Year ${PROGRAMS[u.program].year}`, uniId, start, end,
    letter, status: 'pending', createdAt: new Date().toISOString(),
  });
  u.seenIntro = false;
  save();
}

export function decide(id, status, reason = '') {
  const r = state.requests.find(x => x.id === id);
  if (!r) return;
  r.status = status; r.reason = reason; r.decidedAt = new Date().toISOString();
  r.letter = r.letter ? { ...r.letter, deleted: true } : null; // letters are deleted after a decision
  save();
}

export function deleteMyData() {
  const e = state.session?.email;
  if (!e) return;
  delete state.users[e];
  state.requests = state.requests.filter(r => r.email !== e);
  state.session = null;
  save();
}

export function resetDemo() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  Object.assign(state, fresh());
}
