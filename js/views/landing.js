import { icon, lockup } from '../ui.js';
import { Globe, COLORS } from '../globe.js';
import { UNIVERSITIES, HOME } from '../data.js';
import { rankAll } from '../match.js';
import { LABEL_POS } from './explore.js';

export function landing(view) {
  view.innerHTML = `
  <header class="landing-nav">
    <a href="#/">${lockup(34)}</a>
    <nav class="links"><button data-scroll="how">How it works</button><button data-scroll="features">Partners</button><a href="#/login" class="muted">For the Erasmus Office</a><a class="btn sm" href="#/login">Sign in</a></nav>
    <a class="btn sm landing-mobile-signin" href="#/login">Sign in</a>
  </header>
  <section class="hero">
    <div>
      <div class="label accent">For UPT students going on Erasmus</div>
      <h1>Find the partner university where your courses <em>count.</em></h1>
      <p class="lead">PoliGo compares your UPT courses with each partner's catalogue, so you know what can be recognized before you apply.</p>
      <div class="cta"><a class="btn" href="#/login">${icon('mail', 19, 2)} Sign in with @student.upt.ro</a><button class="btn ghost" data-scroll="how">See how it works</button></div>
      <div class="facts"><span><i class="dot" style="background:var(--good)"></i>${UNIVERSITIES.length} partner universities</span><span><i class="dot" style="background:var(--accent)"></i>Pilot: Computers &amp; IT</span></div>
    </div>
    <div class="globe-box hero-globe" id="hero-globe"><div class="globe-hint">${icon('hand', 15)} Drag the globe</div></div>
  </section>
  <section class="features" id="features">
    ${feature('layers', 'Match your courses', 'See how many of your courses each partner covers, and why every match was made.')}
    ${feature('chart', 'Compare partners', 'Places, language, Erasmus+ cost group and missing courses, side by side.')}
    ${feature('calendar', 'Your Erasmus timeline', 'Accepted? Get deadlines built from your own dates and keep every document in one place.')}
  </section>
  <section class="how" id="how"><div>
    <div class="label">How it works</div>
    <div class="steps">
      ${step(1, 'Sign in with your UPT account', 'Only @student.upt.ro emails. No documents needed to explore.')}
      ${step(2, 'Pick the courses to recognize', 'Choose the semester you want to go and tick your courses.')}
      ${step(3, 'Explore and shortlist', 'Compare matches on the map and rank your top three.')}
    </div>
  </div></section>
  <footer class="footer"><div><span>PoliGo · AI Prototyping Bootcamp, UPT 2026 · Demo data</span><span>Not an official UPT service</span></div></footer>`;

  view.querySelectorAll('[data-scroll]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.scroll).scrollIntoView({ behavior: 'smooth' })));

  const box = view.querySelector('#hero-globe');
  const g = new Globe(box, { center: [10, 46], radius: (w, h) => Math.max(w, h) * 0.95, autoRotate: 0.025, touchAction: 'pan-y', minZoom: 0.4 });
  const ranked = rankAll({ program: 'cti', semester: 'fall' });
  g.setHighlights([{ iso3: HOME.iso3, color: COLORS.cyan }]);
  g.setPoints([
    ...ranked.map(r => ({ lon: r.uni.lon, lat: r.uni.lat, color: COLORS[r.tier], label: `${r.uni.city} · ${r.good}/${r.total}`, showLabel: r.tier !== 'weak', ...(LABEL_POS[r.uni.id] ?? {}) })),
    { lon: HOME.lon, lat: HOME.lat, color: COLORS.cyan, r: 4, pulse: true, label: HOME.name, showLabel: true, dy: 18, dx: 6 },
  ]);
  const hint = box.querySelector('.globe-hint');
  box.addEventListener('pointerdown', () => { hint.style.opacity = 0; }, { once: true });
}

const feature = (ic, t, d) => `<div class="card feature"><div class="fi">${icon(ic, 24)}</div><h3 style="font-size:19px;margin-bottom:8px">${t}</h3><p>${d}</p></div>`;
const step = (n, t, d) => `<div class="step"><b>${n}</b><div><h3 style="margin-bottom:4px">${t}</h3><p class="small">${d}</p></div></div>`;
