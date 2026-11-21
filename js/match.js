// Matching engine v0: compares the topics of a UPT course with the topics of each partner course.
// Later, an AI model can extract the topics from real study plans and catalogues; the scoring stays the same.
import { TOPICS, UNIVERSITIES, PROGRAMS } from './data.js';

export const GOOD = 75, PARTIAL = 60;

const ectsScore = (a, b) => { const d = Math.abs(a - b); return d <= 1 ? 100 : d <= 2 ? 70 : 40; };
const offered = (course, semester) => course.sem === 'both' || course.sem === semester;
const label = t => TOPICS[t] ?? t;
const list = ts => ts.map(label).join(', ');

export function scoreCourse(home, partner) {
  const covered = home.topics.filter(t => partner.topics.includes(t));
  const content = covered.length / home.topics.length;
  const score = Math.round(0.75 * content * 100 + 0.25 * ectsScore(home.ects, partner.ects));
  return { score, covered, missing: home.topics.filter(t => !covered.includes(t)) };
}

export function matchUniversity(uni, homeCourses, semester) {
  const candidates = uni.courses.filter(c => offered(c, semester));
  const rows = homeCourses.map(home => {
    let best = null;
    for (const p of candidates) {
      const s = scoreCourse(home, p);
      if (!best || s.score > best.score || (s.score === best.score && s.covered.length > best.covered.length)) best = { ...s, partner: p };
    }
    const kind = !best ? 'none' : best.score >= GOOD ? 'good' : best.score >= PARTIAL ? 'partial' : 'none';
    let why;
    if (!best || best.covered.length === 0) why = 'No course covers these topics this semester. Take it at UPT.';
    else if (kind === 'none') why = `Closest: ${best.partner.name} (${best.covered.length} of ${home.topics.length} topics). Take it at UPT.`;
    else why = `Both cover ${list(best.covered)}.` + (best.missing.length ? ` Missing: ${list(best.missing)}.` : '');
    return { home, partner: kind === 'none' ? null : best.partner, closest: best?.partner ?? null, score: best?.score ?? 0, kind, why, covered: best?.covered ?? [], missing: best?.missing ?? home.topics };
  });
  const order = { good: 0, partial: 1, none: 2 };
  rows.sort((a, b) => order[a.kind] - order[b.kind] || b.score - a.score);
  const good = rows.filter(r => r.kind === 'good');
  const partial = rows.filter(r => r.kind === 'partial');
  const ectsTotal = homeCourses.reduce((s, c) => s + c.ects, 0);
  const ectsCovered = good.reduce((s, r) => s + r.home.ects, 0);
  const ratio = homeCourses.length ? good.length / homeCourses.length : 0;
  const tier = ratio >= 0.6 ? 'good' : ratio >= 0.3 ? 'partial' : 'weak';
  return { uni, rows, good: good.length, partial: partial.length, total: homeCourses.length, ectsCovered, ectsTotal, tier, notCovered: rows.filter(r => r.kind === 'none').map(r => r.home) };
}

export function homeCoursesFor(user) {
  const all = PROGRAMS[user.program ?? 'cti'].courses[user.semester ?? 'fall'];
  const picked = user.courses?.[user.semester ?? 'fall'];
  return picked ? all.filter(c => picked.includes(c.id)) : all;
}

export function rankAll(user) {
  const home = homeCoursesFor(user);
  return UNIVERSITIES.map(u => matchUniversity(u, home, user.semester ?? 'fall'))
    .sort((a, b) => b.good - a.good || b.ectsCovered - a.ectsCovered || b.partial - a.partial);
}

export function searchCourses(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out = [];
  for (const u of UNIVERSITIES) for (const c of u.courses) {
    const hay = (c.name + ' ' + c.topics.map(label).join(' ')).toLowerCase();
    if (hay.includes(q)) out.push({ uni: u, course: c, topics: c.topics.map(label).filter(t => t.toLowerCase().includes(q)) });
  }
  return out;
}
