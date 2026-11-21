// Explore mode: courses, map, university page, compare, search, shortlist.
import { icon, esc, score, kindPill, cc, ring, toast } from '../ui.js';
import { state, me, update, inJourney, myRequest } from '../state.js';
import { PROGRAMS, SEMESTERS, UNIVERSITIES, HOME, TOPICS } from '../data.js';
import { rankAll, matchUniversity, homeCoursesFor, searchCourses } from '../match.js';
import { Globe, COLORS } from '../globe.js';
import { go, back } from '../main.js';

// Label offsets so labels on the globe don't overlap.
export const LABEL_POS = {
  'fh-stpolten': { anchor: 'end', dx: -10, dy: 18 },
  ucll: { anchor: 'end', dx: -10 },
  'hs-fulda': { anchor: 'end', dx: -10, dy: 16 },
  saxion: { dy: -8 },
  mate: { dy: -8 },
};
const uniById = id => UNIVERSITIES.find(u => u.id === id);
const MAX_SHORTLIST = 3;

export function toggleShortlist(id) {
  const u = me();
  if (u.shortlist.includes(id)) { update(x => { x.shortlist = x.shortlist.filter(s => s !== id); }); toast('Removed from your shortlist'); return false; }
  if (u.shortlist.length >= MAX_SHORTLIST) { toast(`Your shortlist holds ${MAX_SHORTLIST}. Remove one first.`); return false; }
  update(x => { x.shortlist.push(id); }); toast('Added to your shortlist'); return true;
}

// ---------- Courses (onboarding + edit) ----------
export function courses(view) {
  const u = me();
  let sem = u.semester ?? 'fall';
  const prog = PROGRAMS[u.program ?? 'cti'];
  const picked = { fall: u.courses.fall ?? prog.courses.fall.map(c => c.id), spring: u.courses.spring ?? prog.courses.spring.map(c => c.id) };
  const draw = () => {
    const list = prog.courses[sem], sel = picked[sem];
    const ects = list.filter(c => sel.includes(c.id)).reduce((s, c) => s + c.ects, 0);
    view.innerHTML = `
    <div class="page">
      <div class="head">${u.onboarded ? `<button class="iconbtn" id="back" aria-label="Back">${icon('back', 24)}</button>` : '<span></span>'}<span class="label">${u.onboarded ? 'Edit courses' : 'Step 1 of 1'}</span><span style="width:40px"></span></div>
      <h2 style="margin-bottom:8px">Which courses do you want recognized?</h2>
      <p class="small" style="margin-bottom:20px">We'll match them with every partner's catalogue.</p>
      <label class="field"><span class="label">Study program</span>
        <select class="input" id="prog"><option value="cti">${esc(prog.name)} · Year ${prog.year}</option><option disabled>More programs coming soon</option></select></label>
      <div class="field"><span class="label">Semester abroad</span>
        <div class="seg">${Object.entries(SEMESTERS).map(([k, l]) => `<button data-sem="${k}" class="${k === sem ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="row between" style="margin-top:4px"><span class="label">Your courses · ${sel.length}</span><span class="accent" style="font:600 13px var(--sans)">${ects} ECTS</span></div>
      <div>${list.map(c => `<button class="row between divider" data-c="${c.id}" style="width:100%;padding:13px 0;text-align:left"><span class="row gap12"><span class="check ${sel.includes(c.id) ? 'on' : ''}">${sel.includes(c.id) ? icon('check', 15, 3) : ''}</span><span style="font-weight:500">${esc(c.name)}</span></span><span class="quiet small">${c.ects} ECTS</span></button>`).join('')}</div>
      <p class="small quiet" style="margin-top:12px">Course list for the demo. The real app reads your faculty's study plan.</p>
      <button class="btn block" id="go" style="margin-top:22px" ${sel.length ? '' : 'disabled'}>${u.onboarded ? 'Save courses' : 'Find my matches'} ${icon('arrow', 18, 2.2)}</button>
    </div>`;
    view.querySelector('#back')?.addEventListener('click', () => back('profile'));
    view.querySelectorAll('[data-sem]').forEach(b => b.addEventListener('click', () => { sem = b.dataset.sem; draw(); }));
    view.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.c, s = picked[sem];
      picked[sem] = s.includes(id) ? s.filter(x => x !== id) : [...s, id]; draw();
    }));
    view.querySelector('#go').addEventListener('click', () => {
      update(x => { x.semester = sem; x.courses = { ...picked }; x.onboarded = true; });
      go('map');
    });
  };
  draw();
}

// ---------- Map ----------
export function map(view) {
  const u = me();
  const sem = u.semester;
  let country = 'all';
  const ranked = rankAll(u);
  view.innerHTML = `
  <div class="map-wrap">
    <div class="globe-box" id="globe">
      <div class="legend"><span><i style="background:var(--good)"></i>Good</span><span><i style="background:var(--partial)"></i>Partial</span><span><i style="background:${COLORS.weak}"></i>Weak</span></div>
      <div class="globe-hint">${icon('hand', 15)} Drag to rotate · ${matchMedia('(pointer:coarse)').matches ? 'pinch' : 'scroll'} to zoom</div>
      <div class="tooltip" hidden></div>
    </div>
    <aside class="sheet">
      <div class="handle"></div>
      <div class="row between" style="margin-bottom:10px"><h3 id="count"></h3><span class="quiet small">by match</span></div>
      <div class="chips" style="margin-bottom:10px">
        <button class="chip on" id="sem">${SEMESTERS[sem]} ${icon('down', 14)}</button>
        <span class="chip">English</span>
        <select class="chip" id="country" style="appearance:none;padding-right:12px"><option value="all">All countries</option>${[...new Set(UNIVERSITIES.map(x => x.country))].sort().map(c => `<option>${esc(c)}</option>`).join('')}</select>
      </div>
      <div class="small quiet" style="margin-bottom:12px">Matching your ${homeCoursesFor(u).length} courses · <a href="#/courses">edit</a> · <span class="demo">Demo data</span></div>
      <div id="list"></div>
    </aside>
  </div>`;

  const box = view.querySelector('#globe'), tip = box.querySelector('.tooltip'), hint = box.querySelector('.globe-hint');
  const g = new Globe(box, {
    center: [12, 49], radius: (w, h) => Math.max(w, h) * 1.0,
    onClick: p => go('uni/' + p.id),
    onHover: p => {
      view.querySelectorAll('.uni-card').forEach(c => c.classList.toggle('hl', p && c.dataset.id === p.id));
      if (!p) { tip.hidden = true; return; }
      const r = ranked.find(x => x.uni.id === p.id);
      const [x, y] = g.proj([p.lon, p.lat]);
      tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.hidden = false;
      tip.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${esc(r.uni.short)}</div><div class="muted">${esc(r.uni.city)}, ${esc(r.uni.country)}</div><div style="margin-top:6px">${score(r.good, r.total, r.tier)} <span class="quiet">courses · ${r.ectsCovered} of ${r.ectsTotal} ECTS</span></div>`;
    },
  });
  g.setHighlights([{ iso3: HOME.iso3, color: COLORS.cyan }]);
  if (inJourney()) {
    const dest = uniById(myRequest().uniId);
    g.setHighlights([{ iso3: HOME.iso3, color: COLORS.cyan, alpha: 0.3 }, { iso3: dest.iso3, color: COLORS.gold, alpha: 0.4 }]);
    g.setArc({ from: [HOME.lon, HOME.lat], to: [dest.lon, dest.lat] });
  }
  box.addEventListener('pointerdown', () => { hint.style.opacity = 0; }, { once: true });

  const draw = () => {
    const shown = ranked.filter(r => country === 'all' || r.uni.country === country);
    view.querySelector('#count').textContent = `${shown.length} partner ${shown.length === 1 ? 'university' : 'universities'}`;
    g.setPoints([
      ...shown.map((r, i) => ({ id: r.uni.id, lon: r.uni.lon, lat: r.uni.lat, color: COLORS[r.tier], label: `${r.uni.city} · ${r.good}/${r.total}`, showLabel: i < 3, clickable: true, ...(LABEL_POS[r.uni.id] ?? {}) })),
      { lon: HOME.lon, lat: HOME.lat, color: COLORS.cyan, r: 4, pulse: true, label: HOME.name, showLabel: true, dy: 18, dx: 6 },
    ]);
    view.querySelector('#list').innerHTML = shown.map(r => `
      <a class="card uni-card" href="#/uni/${r.uni.id}" data-id="${r.uni.id}">
        <div style="min-width:0"><div class="t">${esc(r.uni.name)}</div><div class="row gap8 small muted">${cc(r.uni.cc)}${esc(r.uni.city)}, ${esc(r.uni.country)}</div><div class="m">${r.ectsCovered} of ${r.ectsTotal} ECTS · ${r.uni.places} places</div></div>
        <div class="s">${score(r.good, r.total, r.tier)}<small>courses</small></div>
      </a>`).join('') || '<p class="small">No partner in this country.</p>';
    view.querySelectorAll('.uni-card').forEach(c => {
      c.addEventListener('mouseenter', () => { const p = g.points.find(x => x.id === c.dataset.id); g.hover = p; });
      c.addEventListener('mouseleave', () => { g.hover = null; });
    });
  };
  draw();
  view.querySelector('#country').addEventListener('change', e => {
    country = e.target.value; draw();
    const r = ranked.find(x => x.uni.country === country);
    if (r) g.flyTo([r.uni.lon, r.uni.lat], 1.3, 1000); else g.flyTo([12, 49], 1, 1000);
  });
  view.querySelector('#sem').addEventListener('click', () => { update(x => { x.semester = x.semester === 'fall' ? 'spring' : 'fall'; }); view.replaceChildren(); map(view); });
}

// ---------- University ----------
export function uni(view, id) {
  const u = me(), x = uniById(id);
  if (!x) return go('map');
  const m = matchUniversity(x, homeCoursesFor(u), u.semester);
  const inList = () => me().shortlist.includes(id);
  const offered = x.courses.filter(c => c.sem === 'both' || c.sem === u.semester);
  view.innerHTML = `
  <div class="page">
    <div class="head"><button class="iconbtn" id="back" aria-label="Back">${icon('back', 24)}</button><span class="demo">Demo data</span><button class="iconbtn ${inList() ? 'on' : ''}" id="mark" aria-label="Shortlist">${icon('bookmark', 22)}</button></div>
    <div class="row gap8" style="margin-bottom:8px">${cc(x.cc)}<span class="label" style="letter-spacing:.06em">${esc(x.city)}, ${esc(x.country)}</span></div>
    <h2 style="margin-bottom:16px">${esc(x.name)}</h2>
    <div class="card row gap16 pad" style="margin-bottom:14px">${ring(m.good, m.total, m.tier === 'good' ? 'var(--good)' : m.tier === 'partial' ? 'var(--partial)' : 'var(--text2)')}
      <div style="flex:1"><div style="font-weight:600;margin-bottom:3px">${m.good} of ${m.total} courses match</div><div class="small muted" style="margin-bottom:10px">${m.ectsCovered} of ${m.ectsTotal} ECTS covered${m.partial ? ` · ${m.partial} partial` : ''}</div><div class="bar"><i style="width:${m.ectsTotal ? (100 * m.ectsCovered / m.ectsTotal).toFixed(0) : 0}%"></i></div></div></div>
    <div class="chips"><span class="chip">${x.places} places</span><span class="chip">${esc(x.language)}</span><span class="chip">Erasmus+ cost group ${x.costGroup}</span><span class="chip">${SEMESTERS[u.semester]}</span></div>
    <div class="label" style="margin-top:20px">Course matches</div>
    ${m.rows.map(r => `<div class="mrow"><div class="row between gap8"><span style="font:600 14.5px var(--sans)">${esc(r.home.name)}</span>${kindPill(r.kind)}</div>
      <div class="to" style="color:${r.partner ? 'var(--text)' : 'var(--text3)'}">${icon('arrow', 15, 2)}${r.partner ? `${esc(r.partner.name)} <span class="quiet">· ${r.partner.ects} ECTS</span>` : 'No matching course this semester'}</div>
      <div class="why">${esc(r.why)}</div></div>`).join('')}
    <details style="margin-top:18px"><summary class="label" style="cursor:pointer">All ${offered.length} courses at ${esc(x.short)} in ${SEMESTERS[u.semester]}</summary>
      ${offered.map(c => `<div class="divider" style="padding:10px 0"><div style="font-weight:500">${esc(c.name)} <span class="quiet small">· ${c.ects} ECTS</span></div><div class="small quiet">${c.topics.map(t => esc(TOPICS[t] ?? t)).join(' · ')}</div></div>`).join('')}
    </details>
    <div class="sticky-actions"><button class="btn" style="flex:1" id="add"></button><button class="btn ghost" id="cmp" style="width:130px">${icon('chart', 18)} Compare</button></div>
  </div>`;
  const add = view.querySelector('#add'), mark = view.querySelector('#mark');
  const paint = () => { add.innerHTML = inList() ? `${icon('check', 18, 2.4)} In your shortlist` : `${icon('bookmark', 18, 2)} Add to shortlist`; add.classList.toggle('ghost', inList()); mark.classList.toggle('on', inList()); };
  paint();
  add.addEventListener('click', () => { toggleShortlist(id); paint(); });
  mark.addEventListener('click', () => { toggleShortlist(id); paint(); });
  view.querySelector('#back').addEventListener('click', () => back('map'));
  view.querySelector('#cmp').addEventListener('click', () => {
    update(y => { y.compare = [id, ...y.compare.filter(c => c !== id)].slice(0, 3); });
    go('compare');
  });
}

// ---------- Compare ----------
export function compare(view, _p, query) {
  const u = me();
  let ids = u.compare.filter(uniById);
  let picking = ids.length < 2 || query.get('pick') === '1';
  const draw = () => {
    window.scrollTo(0, 0);
    if (picking) {
      const ranked = rankAll(u);
      view.innerHTML = `<div class="page">
        <div class="head"><button class="iconbtn" id="back">${icon('back', 24)}</button><span style="font:600 16px var(--sans)">Compare</span><span style="width:40px"></span></div>
        <h2 style="margin-bottom:6px">Pick 2 or 3 universities</h2><p class="small" style="margin-bottom:16px">${ids.length} selected</p>
        ${ranked.map(r => `<button class="card uni-card" data-id="${r.uni.id}"><span class="row gap12"><span class="check ${ids.includes(r.uni.id) ? 'on' : ''}">${ids.includes(r.uni.id) ? icon('check', 15, 3) : ''}</span><span><span class="t" style="display:block">${esc(r.uni.short)}</span><span class="small muted">${esc(r.uni.city)}, ${esc(r.uni.country)}</span></span></span><span class="s">${score(r.good, r.total, r.tier)}</span></button>`).join('')}
        <button class="btn block" id="done" style="margin-top:10px" ${ids.length >= 2 ? '' : 'disabled'}>Compare ${ids.length || ''}</button></div>`;
      view.querySelector('#back').addEventListener('click', () => back('shortlist'));
      view.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.id;
        ids = ids.includes(id) ? ids.filter(x => x !== id) : ids.length >= 3 ? (toast('You can compare up to 3.'), ids) : [...ids, id];
        draw();
      }));
      view.querySelector('#done').addEventListener('click', () => { update(y => { y.compare = ids; }); picking = false; draw(); });
      return;
    }
    const ms = ids.map(id => matchUniversity(uniById(id), homeCoursesFor(u), u.semester));
    const best = [...ms].sort((a, b) => b.ectsCovered - a.ectsCovered)[0];
    const row = (label, f) => `<tr><td>${label}</td>${ms.map(m => `<td>${f(m)}</td>`).join('')}</tr>`;
    view.innerHTML = `<div class="page">
      <div class="head"><button class="iconbtn" id="back">${icon('back', 24)}</button><span style="font:600 16px var(--sans)">Compare</span><span class="demo">Demo</span></div>
      <div style="overflow-x:auto"><table class="cmp">
        <tr><td></td>${ms.map(m => `<th><a href="#/uni/${m.uni.id}" style="color:var(--text)">${cc(m.uni.cc)}<div style="margin-top:6px">${esc(m.uni.short)}</div></a></th>`).join('')}</tr>
        ${row('Match', m => score(m.good, m.total, m.tier))}
        ${row('ECTS covered', m => `${m.ectsCovered} / ${m.ectsTotal}`)}
        ${row('Partial', m => m.partial)}
        ${row('Language', m => esc(m.uni.language))}
        ${row('Places', m => m.uni.places)}
        ${row('Erasmus+ cost group', m => m.uni.costGroup)}
        ${row('Not covered', m => m.notCovered.length ? `<span style="color:var(--none)">${m.notCovered.map(c => esc(c.name)).join(', ')}</span>` : '<span style="color:var(--good)">Nothing</span>')}
      </table></div>
      <div class="card pad row gap12" style="margin-top:18px;align-items:flex-start"><span class="accent">${icon('layers', 20)}</span><p class="small">${esc(best.uni.short)} covers the most ECTS (${best.ectsCovered} of ${best.ectsTotal}).</p></div>
      <button class="btn ghost block" id="change" style="margin-top:14px">Change selection</button>
    </div>`;
    view.querySelector('#back').addEventListener('click', () => back('shortlist'));
    view.querySelector('#change').addEventListener('click', () => { picking = true; draw(); });
  };
  draw();
}

// ---------- Search ----------
export function search(view, _p, query) {
  const ideas = ['Machine learning', 'Android', 'Databases', 'Graphics', 'Security', 'Cloud'];
  view.innerHTML = `<div class="page">
    <div class="label" style="margin:8px 0">Search</div>
    <h2 style="margin-bottom:14px">Where can I take a course on…</h2>
    <input class="input" id="q" type="search" placeholder="e.g. machine learning, Android, SQL" autocomplete="off" value="${esc(query.get('q') ?? '')}">
    <div class="chips" style="margin:12px 0 18px">${ideas.map(i => `<button class="chip" data-q="${i}">${i}</button>`).join('')}</div>
    <div id="res"></div></div>`;
  const q = view.querySelector('#q'), res = view.querySelector('#res');
  const run = () => {
    const hits = searchCourses(q.value);
    if (q.value.trim().length < 2) { res.innerHTML = '<p class="small">Search every partner catalogue by course name or topic.</p>'; return; }
    if (!hits.length) { res.innerHTML = '<p class="small">No course found. Try another word.</p>'; return; }
    res.innerHTML = `<div class="label" style="margin-bottom:6px">${hits.length} courses</div>` + hits.map(h => `
      <a class="card uni-card" href="#/uni/${h.uni.id}"><div style="min-width:0"><div class="t">${esc(h.course.name)}</div>
      <div class="row gap8 small muted">${cc(h.uni.cc)}${esc(h.uni.short)} · ${h.course.ects} ECTS · ${h.course.sem === 'both' ? 'Fall & Spring' : h.course.sem === 'fall' ? 'Fall' : 'Spring'}</div>
      ${h.topics.length ? `<div class="m">${h.topics.map(esc).join(' · ')}</div>` : ''}</div><span class="quiet">${icon('arrow', 18)}</span></a>`).join('');
  };
  q.addEventListener('input', run);
  view.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { q.value = b.dataset.q; run(); }));
  run();
  if (!matchMedia('(pointer:coarse)').matches) q.focus();
}

// ---------- Shortlist ----------
export function shortlist(view) {
  const draw = () => {
    const u = me(), ids = u.shortlist.filter(uniById);
    const items = ids.map(id => matchUniversity(uniById(id), homeCoursesFor(u), u.semester));
    view.innerHTML = `<div class="page">
      <div class="label" style="margin:8px 0">Shortlist</div>
      <h2 style="margin-bottom:8px">Your preferences</h2>
      <p class="small" style="margin-bottom:20px">Put them in the order you'll list them on your Erasmus application. Up to ${MAX_SHORTLIST}.</p>
      ${items.length ? items.map((m, i) => `
        <div class="card row gap12" style="padding:14px;margin-bottom:12px">
          <span style="width:34px;height:34px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;font:700 17px var(--display);background:${i === 0 ? 'rgba(var(--accent-rgb),.14)' : 'var(--surface2)'};color:${i === 0 ? 'var(--accent)' : 'var(--text2)'}">${i + 1}</span>
          <a href="#/uni/${m.uni.id}" style="flex:1;min-width:0;color:var(--text)"><div style="font-weight:600;margin-bottom:4px">${esc(m.uni.short)}</div><div class="row gap8 small muted">${cc(m.uni.cc)}${esc(m.uni.city)}, ${esc(m.uni.country)}</div></a>
          ${score(m.good, m.total, m.tier)}
          <span style="display:flex;flex-direction:column">
            <button class="iconbtn" style="height:24px;${i === 0 ? 'opacity:.3' : ''}" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${icon('up', 20, 2)}</button>
            <button class="iconbtn" style="height:24px;${i === items.length - 1 ? 'opacity:.3' : ''}" data-down="${i}" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Move down">${icon('down', 20, 2)}</button>
          </span>
          <button class="iconbtn" data-rm="${m.uni.id}" aria-label="Remove">${icon('x', 18, 2)}</button>
        </div>`).join('')
        : `<div class="card pad" style="text-align:center;padding:28px 20px"><div class="accent" style="display:flex;justify-content:center;margin-bottom:10px">${icon('bookmark', 28)}</div><p class="small" style="margin-bottom:16px">Tap the bookmark on a university to add it here.</p><a class="btn" href="#/map">${icon('globe', 18, 2)} Explore the map</a></div>`}
      ${items.length >= 2 ? `<button class="btn ghost block" id="cmp" style="margin-top:6px">${icon('chart', 18)} Compare these ${items.length}</button>` : ''}
      <div class="card pad" style="margin-top:22px;border-style:dashed;background:transparent"><div style="font-weight:600;margin-bottom:6px">Next step</div><p class="small">Apply through the UPT Erasmus Office. When you're accepted, come back and tap “I got accepted” in your profile.</p></div>
    </div>`;
    const move = (i, d) => update(x => { const a = x.shortlist; [a[i], a[i + d]] = [a[i + d], a[i]]; });
    view.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => { move(+b.dataset.up, -1); draw(); }));
    view.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => { move(+b.dataset.down, 1); draw(); }));
    view.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { toggleShortlist(b.dataset.rm); draw(); }));
    view.querySelector('#cmp')?.addEventListener('click', () => { update(x => { x.compare = [...x.shortlist]; }); go('compare'); });
  };
  draw();
}
